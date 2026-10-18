<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant\Pharmacy;

use App\Models\ClinicMedicine;
use App\Models\Medicine;
use App\Models\MedicineVariant;
use App\Models\StockBatch;
use App\Models\StockReceipt;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PharmacyTenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;

    protected Tenant $tenantB;

    protected User $userA;

    protected User $userB;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $this->tenantA = Tenant::factory()->active()->create([
            'id' => 'clinic-alpha',
            'name' => 'Clinic Alpha',
            'subdomain' => 'alpha',
            'pharmacy_enabled' => true,
        ]);

        $this->tenantB = Tenant::factory()->active()->create([
            'id' => 'clinic-beta',
            'name' => 'Clinic Beta',
            'subdomain' => 'beta',
            'pharmacy_enabled' => true,
        ]);

        $this->userA = User::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Alpha Pharmacist',
            'email' => 'pharmacist@alpha.test',
        ]);

        $this->userB = User::factory()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Beta Pharmacist',
            'email' => 'pharmacist@beta.test',
        ]);

        $permissions = [
            'pharmacy.view',
            'pharmacy.manage_medicines',
            'pharmacy.receive_stock',
            'pharmacy.manage_suppliers',
        ];

        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        $this->userA->givePermissionTo($permissions);
        $this->userB->givePermissionTo($permissions);
    }

    public function test_clinic_a_records_are_strictly_isolated_from_clinic_b_at_http_level(): void
    {
        // 1. Approved Global Medicine + Variant
        $approvedMed = Medicine::create([
            'generic_name' => 'Paracetamol',
            'normalized_name' => 'paracetamol',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $approvedMed->id,
            'strength_text' => '500mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        // 2. Clinic A's own pending catalog medicine
        $pendingMedA = Medicine::create([
            'generic_name' => 'Alpha Exclusive Drug',
            'normalized_name' => 'alpha exclusive drug',
            'route' => 'Oral',
            'status' => 'pending',
            'created_by_tenant_id' => $this->tenantA->id,
        ]);

        MedicineVariant::create([
            'medicine_id' => $pendingMedA->id,
            'strength_text' => '100mg',
            'dosage_form' => 'Tablet',
            'status' => 'pending',
            'created_by_tenant_id' => $this->tenantA->id,
        ]);

        // 3. Clinic A's Supplier
        $supplierA = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Alpha Exclusives Supplier Ltd',
            'is_active' => true,
        ]);

        // 4. Clinic A's Stock Medicine, Batch, and GRN Receipt
        $clinicMedA = ClinicMedicine::create([
            'tenant_id' => $this->tenantA->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Alpha Paracetamol 500mg',
            'base_unit' => 'tablet',
            'selling_price_cents' => 600,
            'is_active' => true,
        ]);

        $receiptA = StockReceipt::create([
            'tenant_id' => $this->tenantA->id,
            'receipt_number' => 'GRN-000001',
            'supplier_id' => $supplierA->id,
            'received_date' => now()->toDateString(),
            'total_cost_cents' => 5000,
            'created_by' => $this->userA->id,
        ]);

        $batchA = StockBatch::create([
            'tenant_id' => $this->tenantA->id,
            'clinic_medicine_id' => $clinicMedA->id,
            'stock_receipt_id' => $receiptA->id,
            'batch_number' => 'BATCH-ALPHA-01',
            'quantity_received' => 100,
            'quantity_remaining' => 100,
            'cost_price_cents' => 50,
        ]);

        // --- HTTP TESTS FOR CLINIC B ---

        // Test A: Stock List on Clinic B does NOT include Clinic A's clinic medicine
        $responseStock = $this->actingAs($this->userB)
            ->get("http://{$this->tenantB->subdomain}.{$this->baseDomain}/pharmacy/medicines");

        $responseStock->assertStatus(200);
        $responseStock->assertInertia(fn ($page) => $page
            ->component('Tenant/Pharmacy/Medicines/Index')
            ->where('medicines.total', 0)
        );

        // Test B: Detail Drawer data endpoint for Clinic A's medicine from Clinic B returns 404
        $responseDetail = $this->actingAs($this->userB)
            ->get("http://{$this->tenantB->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$clinicMedA->id}");

        $responseDetail->assertStatus(404);

        // Test C: Suppliers page on Clinic B does NOT show Clinic A's supplier
        $responseSuppliers = $this->actingAs($this->userB)
            ->get("http://{$this->tenantB->subdomain}.{$this->baseDomain}/pharmacy/suppliers");

        $responseSuppliers->assertStatus(200);
        $responseSuppliers->assertInertia(fn ($page) => $page
            ->component('Tenant/Pharmacy/Suppliers/Index')
            ->where('suppliers.total', 0)
        );

        // Test D: Catalog search from Clinic B cannot find Clinic A's pending catalog medicine
        $responseSearch = $this->actingAs($this->userB)
            ->get("http://{$this->tenantB->subdomain}.{$this->baseDomain}/pharmacy/catalog/search?q=Alpha");

        $responseSearch->assertStatus(200);
        $results = $responseSearch->json('results');
        $this->assertEmpty($results);
    }
}
