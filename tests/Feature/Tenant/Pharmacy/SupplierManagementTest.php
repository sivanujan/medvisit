<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant\Pharmacy;

use App\Models\StockReceipt;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class SupplierManagementTest extends TestCase
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
            'status' => 'active',
            'pharmacy_enabled' => true,
        ]);

        $this->tenantB = Tenant::factory()->active()->create([
            'id' => 'clinic-beta',
            'name' => 'Clinic Beta',
            'subdomain' => 'beta',
            'status' => 'active',
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

        foreach (['pharmacy.view', 'pharmacy.manage_suppliers', 'pharmacy.receive_stock'] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $this->userA->givePermissionTo(['pharmacy.view', 'pharmacy.manage_suppliers', 'pharmacy.receive_stock']);
        $this->userB->givePermissionTo(['pharmacy.view', 'pharmacy.manage_suppliers', 'pharmacy.receive_stock']);
    }

    protected function tenantUrl(Tenant $tenant, string $path): string
    {
        return "http://{$tenant->subdomain}.{$this->baseDomain}{$path}";
    }

    public function test_phone_normalization_and_flexible_search_formats(): void
    {
        // 1. Create a supplier with standard local format "077 123 4567"
        $response = $this->actingAs($this->userA)
            ->post($this->tenantUrl($this->tenantA, '/pharmacy/suppliers'), [
                'name' => 'Astron Pharmaceuticals',
                'contact_person' => 'Rohan Perera',
                'phone' => '077 123 4567',
                'email' => 'rohan@astron.lk',
                'city' => 'Ratmalana',
            ]);

        $response->assertSessionHas('success');

        $supplier = Supplier::where('tenant_id', $this->tenantA->id)
            ->where('name', 'Astron Pharmaceuticals')
            ->firstOrFail();

        // Must be normalized to E.164 +94
        $this->assertEquals('+94771234567', $supplier->phone);
        $this->assertEquals('Rohan Perera', $supplier->contact_person);
        $this->assertEquals('Ratmalana', $supplier->city);

        // 2. Search using different phone formats
        // Search by raw 077...
        $searchRes1 = $this->actingAs($this->userA)
            ->get($this->tenantUrl($this->tenantA, '/pharmacy/suppliers?search=0771234567'));
        $searchRes1->assertOk();
        $this->assertCount(1, $searchRes1->inertiaProps('suppliers.data'));

        // Search by +94...
        $searchRes2 = $this->actingAs($this->userA)
            ->get($this->tenantUrl($this->tenantA, '/pharmacy/suppliers?search=+94771234567'));
        $searchRes2->assertOk();
        $this->assertCount(1, $searchRes2->inertiaProps('suppliers.data'));

        // Search by trailing digits
        $searchRes3 = $this->actingAs($this->userA)
            ->get($this->tenantUrl($this->tenantA, '/pharmacy/suppliers?search=1234567'));
        $searchRes3->assertOk();
        $this->assertCount(1, $searchRes3->inertiaProps('suppliers.data'));

        // Search by contact person
        $searchRes4 = $this->actingAs($this->userA)
            ->get($this->tenantUrl($this->tenantA, '/pharmacy/suppliers?search=Rohan'));
        $searchRes4->assertOk();
        $this->assertCount(1, $searchRes4->inertiaProps('suppliers.data'));
    }

    public function test_duplicate_supplier_check_by_name_and_normalized_phone(): void
    {
        Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Hemas Pharmaceuticals',
            'phone' => '+94712223344',
            'city' => 'Colombo',
            'is_active' => true,
        ]);

        // 1. Check duplicate by exact name case-insensitive
        $resName = $this->actingAs($this->userA)
            ->postJson($this->tenantUrl($this->tenantA, '/pharmacy/suppliers/check-duplicate'), [
                'name' => 'hemas pharmaceuticals',
            ]);

        $resName->assertOk()
            ->assertJson([
                'is_duplicate' => true,
                'existing_supplier' => [
                    'name' => 'Hemas Pharmaceuticals',
                ],
            ]);

        // 2. Check duplicate by different phone representation (e.g. 071 222 3344)
        $resPhone = $this->actingAs($this->userA)
            ->postJson($this->tenantUrl($this->tenantA, '/pharmacy/suppliers/check-duplicate'), [
                'name' => 'Different Distributor Name',
                'phone' => '071 222 3344',
            ]);

        $resPhone->assertOk()
            ->assertJson([
                'is_duplicate' => true,
                'existing_supplier' => [
                    'name' => 'Hemas Pharmaceuticals',
                ],
            ]);

        // 3. Exclude self when editing
        $existing = Supplier::where('name', 'Hemas Pharmaceuticals')->first();
        $resExclude = $this->actingAs($this->userA)
            ->postJson($this->tenantUrl($this->tenantA, '/pharmacy/suppliers/check-duplicate'), [
                'name' => 'Hemas Pharmaceuticals',
                'phone' => '+94712223344',
                'exclude_id' => $existing->id,
            ]);

        $resExclude->assertOk()
            ->assertJson([
                'is_duplicate' => false,
            ]);
    }

    public function test_delete_is_blocked_when_grns_or_batches_exist(): void
    {
        $supplier = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'State Pharmaceuticals Corp',
            'phone' => '+94112345678',
            'is_active' => true,
        ]);

        // Create a GRN under this supplier
        StockReceipt::create([
            'tenant_id' => $this->tenantA->id,
            'supplier_id' => $supplier->id,
            'receipt_number' => 'GRN-000099',
            'received_date' => now()->toDateString(),
            'total_cost_cents' => 500000,
            'status' => 'received',
            'created_by' => $this->userA->id,
        ]);

        // Attempting to delete must be blocked with flash error
        $deleteRes = $this->actingAs($this->userA)
            ->delete($this->tenantUrl($this->tenantA, "/pharmacy/suppliers/{$supplier->id}"));

        $deleteRes->assertSessionHas('error');
        $this->assertDatabaseHas('suppliers', ['id' => $supplier->id]);

        // Now test zero-GRN supplier deletion
        $emptySupplier = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Zero Deliveries Supplier',
            'is_active' => true,
        ]);

        $deleteEmptyRes = $this->actingAs($this->userA)
            ->delete($this->tenantUrl($this->tenantA, "/pharmacy/suppliers/{$emptySupplier->id}"));

        $deleteEmptyRes->assertSessionHas('success');
        $this->assertDatabaseMissing('suppliers', ['id' => $emptySupplier->id]);
    }

    public function test_deactivated_suppliers_are_hidden_from_grn_create_select(): void
    {
        $activeSupplier = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Active Supplier A',
            'is_active' => true,
        ]);

        $inactiveSupplier = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Inactive Supplier B',
            'is_active' => false,
        ]);

        $res = $this->actingAs($this->userA)
            ->get($this->tenantUrl($this->tenantA, '/pharmacy/receipts/create'));

        $res->assertOk();
        $selectSuppliers = collect($res->inertiaProps('suppliers'));

        $this->assertTrue($selectSuppliers->contains('id', $activeSupplier->id));
        $this->assertFalse($selectSuppliers->contains('id', $inactiveSupplier->id));
    }

    public function test_purchase_totals_match_non_voided_grns(): void
    {
        $supplier = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Mega Pharma',
            'is_active' => true,
        ]);

        // Receipt 1: Active 15,000 LKR (1,500,000 cents)
        StockReceipt::create([
            'tenant_id' => $this->tenantA->id,
            'supplier_id' => $supplier->id,
            'receipt_number' => 'GRN-000101',
            'received_date' => now()->toDateString(),
            'total_cost_cents' => 1500000,
            'status' => 'received',
            'created_by' => $this->userA->id,
        ]);

        // Receipt 2: Active 25,000 LKR (2,500,000 cents)
        StockReceipt::create([
            'tenant_id' => $this->tenantA->id,
            'supplier_id' => $supplier->id,
            'receipt_number' => 'GRN-000102',
            'received_date' => now()->toDateString(),
            'total_cost_cents' => 2500000,
            'status' => 'received',
            'created_by' => $this->userA->id,
        ]);

        // Receipt 3: VOIDED 50,000 LKR (must NOT be counted in purchases)
        StockReceipt::create([
            'tenant_id' => $this->tenantA->id,
            'supplier_id' => $supplier->id,
            'receipt_number' => 'GRN-000103',
            'received_date' => now()->toDateString(),
            'total_cost_cents' => 5000000,
            'status' => 'voided',
            'created_by' => $this->userA->id,
        ]);

        $res = $this->actingAs($this->userA)
            ->get($this->tenantUrl($this->tenantA, '/pharmacy/suppliers'));

        $res->assertOk();
        $supplierData = collect($res->inertiaProps('suppliers.data'))->firstWhere('id', $supplier->id);

        $this->assertNotNull($supplierData);
        // Total purchased must be 1,500,000 + 2,500,000 = 4,000,000 cents
        $this->assertEquals(4000000, $supplierData['total_purchased_cents']);
        $this->assertEquals(now()->toDateString(), $supplierData['last_delivery_date']);
    }

    public function test_tenant_isolation_prevents_viewing_or_modifying_other_clinic_suppliers(): void
    {
        $alphaSupplier = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Confidential Alpha Supplier',
            'is_active' => true,
        ]);

        // User B attempts to access Alpha's supplier
        $showRes = $this->actingAs($this->userB)
            ->getJson($this->tenantUrl($this->tenantB, "/pharmacy/suppliers/{$alphaSupplier->id}"));
        $showRes->assertNotFound();

        // User B attempts to update Alpha's supplier
        $updateRes = $this->actingAs($this->userB)
            ->put($this->tenantUrl($this->tenantB, "/pharmacy/suppliers/{$alphaSupplier->id}"), [
                'name' => 'Hacked Supplier Name',
            ]);
        $updateRes->assertNotFound();

        // User B attempts to toggle Alpha's supplier
        $toggleRes = $this->actingAs($this->userB)
            ->patch($this->tenantUrl($this->tenantB, "/pharmacy/suppliers/{$alphaSupplier->id}/toggle"));
        $toggleRes->assertNotFound();

        // User B attempts to delete Alpha's supplier
        $deleteRes = $this->actingAs($this->userB)
            ->delete($this->tenantUrl($this->tenantB, "/pharmacy/suppliers/{$alphaSupplier->id}"));
        $deleteRes->assertNotFound();

        // Alpha's index does not show Beta's data
        Supplier::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Beta Exclusive Distributor',
            'is_active' => true,
        ]);

        $alphaList = $this->actingAs($this->userA)
            ->get($this->tenantUrl($this->tenantA, '/pharmacy/suppliers'));

        $alphaNames = collect($alphaList->inertiaProps('suppliers.data'))->pluck('name');
        $this->assertContains('Confidential Alpha Supplier', $alphaNames);
        $this->assertNotContains('Beta Exclusive Distributor', $alphaNames);
    }
}
