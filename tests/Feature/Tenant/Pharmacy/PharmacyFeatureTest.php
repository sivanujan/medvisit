<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant\Pharmacy;

use App\Models\ClinicMedicine;
use App\Models\Medicine;
use App\Models\MedicineBrand;
use App\Models\MedicineVariant;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Medicines\CatalogReviewService;
use App\Services\Pharmacy\BarcodeService;
use App\Services\Pharmacy\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use LogicException;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class PharmacyFeatureTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;

    protected Tenant $tenantB;

    protected User $userA;

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
            'pharmacy_enabled' => false,
        ]);

        $this->userA = User::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Alpha Pharmacist',
            'email' => 'pharmacist@alpha.test',
        ]);

        // Seed pharmacy permissions for test
        $permissions = [
            'pharmacy.view',
            'pharmacy.manage_medicines',
            'pharmacy.receive_stock',
            'pharmacy.adjust_stock',
            'pharmacy.manage_suppliers',
            'pharmacy.import',
        ];

        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        $this->userA->givePermissionTo($permissions);
    }

    /**
     * Requirement 1: Visibility scope: a tenant must see approved rows + its OWN pending AND rejected rows.
     */
    public function test_visibility_scope_shows_approved_plus_own_pending_and_rejected(): void
    {
        // 1. Approved global medicine
        $approvedMed = Medicine::create([
            'generic_name' => 'Paracetamol',
            'normalized_name' => 'paracetamol',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        // 2. Tenant A's own pending medicine
        $pendingMedA = Medicine::create([
            'generic_name' => 'Pending Alpha Drug',
            'normalized_name' => 'pending alpha drug',
            'route' => 'Oral',
            'status' => 'pending',
            'created_by_tenant_id' => $this->tenantA->id,
        ]);

        // 3. Tenant A's own rejected medicine (must still be visible so the clinic can continue working)
        $rejectedMedA = Medicine::create([
            'generic_name' => 'Rejected Alpha Drug',
            'normalized_name' => 'rejected alpha drug',
            'route' => 'Oral',
            'status' => 'rejected',
            'rejection_reason' => 'Duplicate entry',
            'created_by_tenant_id' => $this->tenantA->id,
        ]);

        // 4. Tenant B's pending medicine
        $pendingMedB = Medicine::create([
            'generic_name' => 'Pending Beta Drug',
            'normalized_name' => 'pending beta drug',
            'route' => 'Oral',
            'status' => 'pending',
            'created_by_tenant_id' => $this->tenantB->id,
        ]);

        // When queried for Tenant A:
        $visibleToA = Medicine::visibleToTenant($this->tenantA->id)->pluck('id');
        $this->assertTrue($visibleToA->contains($approvedMed->id));
        $this->assertTrue($visibleToA->contains($pendingMedA->id));
        $this->assertTrue($visibleToA->contains($rejectedMedA->id));
        $this->assertFalse($visibleToA->contains($pendingMedB->id));

        // When queried for Tenant B:
        $visibleToB = Medicine::visibleToTenant($this->tenantB->id)->pluck('id');
        $this->assertTrue($visibleToB->contains($approvedMed->id));
        $this->assertFalse($visibleToB->contains($pendingMedA->id));
        $this->assertFalse($visibleToB->contains($rejectedMedA->id));
        $this->assertTrue($visibleToB->contains($pendingMedB->id));
    }

    /**
     * Requirement 4: GRN receipt_number: unique on (tenant_id, receipt_number),
     * generated inside transaction with a lock so concurrent saves never duplicate.
     */
    public function test_grn_receipt_number_generation_and_uniqueness(): void
    {
        $stockService = app(StockService::class);

        $med = Medicine::create([
            'generic_name' => 'Amoxicillin',
            'normalized_name' => 'amoxicillin',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $med->id,
            'strength_text' => '500mg',
            'dosage_form' => 'Capsule',
            'status' => 'approved',
        ]);

        $receipt1 = $stockService->receiveStock([
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'medicine_variant_id' => $variant->id,
                    'display_name' => 'Amoxicillin 500mg Capsule',
                    'base_unit' => 'capsule',
                    'batch_number' => 'AMX-01',
                    'expiry_date' => now()->addMonths(12)->toDateString(),
                    'quantity' => 100,
                    'cost_price_cents' => 1250,
                    'selling_price_cents' => 1800,
                ],
            ],
        ], $this->userA, $this->tenantA->id);

        $this->assertEquals('GRN-000001', $receipt1->receipt_number);
        $this->assertEquals($this->tenantA->id, $receipt1->tenant_id);

        $receipt2 = $stockService->receiveStock([
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'medicine_variant_id' => $variant->id,
                    'display_name' => 'Amoxicillin 500mg Capsule',
                    'base_unit' => 'capsule',
                    'batch_number' => 'AMX-02',
                    'expiry_date' => now()->addMonths(18)->toDateString(),
                    'quantity' => 200,
                    'cost_price_cents' => 1200,
                    'selling_price_cents' => 1800,
                ],
            ],
        ], $this->userA, $this->tenantA->id);

        $this->assertEquals('GRN-000002', $receipt2->receipt_number);

        // Receipts for Tenant B start at GRN-000001 independently
        $receiptB = $stockService->receiveStock([
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'medicine_variant_id' => $variant->id,
                    'display_name' => 'Amoxicillin 500mg Capsule',
                    'base_unit' => 'capsule',
                    'batch_number' => 'AMX-B1',
                    'quantity' => 50,
                    'cost_price_cents' => 1200,
                ],
            ],
        ], $this->userA, $this->tenantB->id);

        $this->assertEquals('GRN-000001', $receiptB->receipt_number);
        $this->assertEquals($this->tenantB->id, $receiptB->tenant_id);
    }

    public function test_stock_adjustments_and_cannot_reduce_below_zero(): void
    {
        $stockService = app(StockService::class);

        $med = Medicine::create([
            'generic_name' => 'Amoxicillin',
            'normalized_name' => 'amoxicillin',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $med->id,
            'strength_text' => '500mg',
            'dosage_form' => 'Capsule',
            'status' => 'approved',
        ]);

        $stockService->receiveStock([
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'medicine_variant_id' => $variant->id,
                    'display_name' => 'Amoxicillin 500mg Capsule',
                    'base_unit' => 'capsule',
                    'batch_number' => 'AMX-TEST',
                    'quantity' => 100,
                    'cost_price_cents' => 1000,
                ],
            ],
        ], $this->userA, $this->tenantA->id);

        $batch = StockBatch::where('tenant_id', $this->tenantA->id)->firstOrFail();
        $this->assertEquals(100, $batch->quantity_remaining);

        // Valid adjustment out (e.g. damaged 10)
        $stockService->adjustStock(
            $batch->id,
            'damaged',
            10,
            'Water damage to packaging',
            $this->userA,
            $this->tenantA->id
        );

        $batch->refresh();
        $this->assertEquals(90, $batch->quantity_remaining);

        // Attempting to adjust out more than available (e.g. 95 when 90 remaining)
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Insufficient stock');
        $stockService->adjustStock(
            $batch->id,
            'adjustment_out',
            95,
            'Excessive deduction test',
            $this->userA,
            $this->tenantA->id
        );
    }

    /**
     * Requirement 6: stock_movements is append-only: no updated_at, model throws on update/delete.
     */
    public function test_stock_movement_is_append_only_and_throws_on_update_or_delete(): void
    {
        $med = Medicine::create([
            'generic_name' => 'Paracetamol',
            'normalized_name' => 'paracetamol',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $med->id,
            'strength_text' => '500mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        $clinicMed = ClinicMedicine::create([
            'tenant_id' => $this->tenantA->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Paracetamol 500mg',
            'base_unit' => 'tablet',
            'selling_price_cents' => 500,
        ]);

        $movement = StockMovement::create([
            'tenant_id' => $this->tenantA->id,
            'clinic_medicine_id' => $clinicMed->id,
            'user_id' => $this->userA->id,
            'type' => 'receipt',
            'quantity' => 50,
            'created_at' => now(),
        ]);

        $this->assertNotNull($movement->id);

        // Attempt to update must throw LogicException
        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('Stock movements are append-only and cannot be updated.');
        $movement->update(['quantity' => 999]);
    }

    public function test_stock_movement_throws_on_delete(): void
    {
        $med = Medicine::create([
            'generic_name' => 'Paracetamol',
            'normalized_name' => 'paracetamol',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $med->id,
            'strength_text' => '500mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        $clinicMed = ClinicMedicine::create([
            'tenant_id' => $this->tenantA->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Paracetamol 500mg',
            'base_unit' => 'tablet',
            'selling_price_cents' => 500,
        ]);

        $movement = StockMovement::create([
            'tenant_id' => $this->tenantA->id,
            'clinic_medicine_id' => $clinicMed->id,
            'user_id' => $this->userA->id,
            'type' => 'adjustment_in',
            'quantity' => 10,
            'created_at' => now(),
        ]);

        $this->expectException(LogicException::class);
        $this->expectExceptionMessage('Stock movements are append-only and cannot be deleted.');
        $movement->delete();
    }

    /**
     * Requirement 3: Merge in review queue: if a tenant already has a clinic_medicine for the target,
     * merge the two clinic_medicines (move batches, movements, references to the surviving row, then delete the duplicate)
     * inside one transaction.
     */
    public function test_catalog_review_merge_combines_duplicate_clinic_medicines(): void
    {
        $reviewService = app(CatalogReviewService::class);

        $medTarget = Medicine::create([
            'generic_name' => 'Metformin',
            'normalized_name' => 'metformin',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $targetVariant = MedicineVariant::create([
            'medicine_id' => $medTarget->id,
            'strength_text' => '500mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        // Duplicate variant pending review
        $medDuplicate = Medicine::create([
            'generic_name' => 'Metformin HCl',
            'normalized_name' => 'metformin hcl',
            'route' => 'Oral',
            'status' => 'pending',
            'created_by_tenant_id' => $this->tenantA->id,
        ]);

        $duplicateVariant = MedicineVariant::create([
            'medicine_id' => $medDuplicate->id,
            'strength_text' => '500mg',
            'dosage_form' => 'Tablet',
            'status' => 'pending',
            'created_by_tenant_id' => $this->tenantA->id,
        ]);

        // Clinic A already has clinic_medicine for the target AND duplicate
        $survivingClinicMed = ClinicMedicine::create([
            'tenant_id' => $this->tenantA->id,
            'medicine_variant_id' => $targetVariant->id,
            'display_name' => 'Metformin 500mg',
            'base_unit' => 'tablet',
            'selling_price_cents' => 1500,
            'is_active' => true,
        ]);

        $duplicateClinicMed = ClinicMedicine::create([
            'tenant_id' => $this->tenantA->id,
            'medicine_variant_id' => $duplicateVariant->id,
            'display_name' => 'Metformin HCl 500mg',
            'base_unit' => 'tablet',
            'selling_price_cents' => 1400,
            'is_active' => true,
        ]);

        // Attach a batch and movement to the duplicate clinic medicine
        $batch = StockBatch::create([
            'tenant_id' => $this->tenantA->id,
            'clinic_medicine_id' => $duplicateClinicMed->id,
            'batch_number' => 'MET-DUP-01',
            'quantity_remaining' => 250,
            'cost_price_cents' => 800,
        ]);

        $movement = StockMovement::create([
            'tenant_id' => $this->tenantA->id,
            'clinic_medicine_id' => $duplicateClinicMed->id,
            'stock_batch_id' => $batch->id,
            'type' => 'receipt',
            'quantity' => 250,
            'created_at' => now(),
        ]);

        // Perform merge of duplicate medicine into target medicine
        $reviewService->mergeMedicine($medDuplicate, $medTarget);

        // Verify duplicate clinic medicine was deleted and batch was moved to surviving row
        $this->assertDatabaseMissing('clinic_medicines', ['id' => $duplicateClinicMed->id]);
        $this->assertDatabaseHas('clinic_medicines', ['id' => $survivingClinicMed->id]);

        $batch->refresh();
        $this->assertEquals($survivingClinicMed->id, $batch->clinic_medicine_id);

        $this->assertDatabaseHas('stock_movements', [
            'id' => $movement->id,
            'clinic_medicine_id' => $survivingClinicMed->id,
        ]);
    }

    /**
     * Barcode lookup & auto-approve rule: 2+ distinct clinics linking same barcode to same brand auto-approves it.
     */
    public function test_barcode_auto_approves_when_two_clinics_link_same_barcode(): void
    {
        $barcodeService = app(BarcodeService::class);

        $med = Medicine::create([
            'generic_name' => 'Cetirizine',
            'normalized_name' => 'cetirizine',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $med->id,
            'strength_text' => '10mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        $brand = MedicineBrand::create([
            'medicine_variant_id' => $variant->id,
            'brand_name' => 'Alerid',
            'status' => 'approved',
        ]);

        // Clinic A links barcode 8901234567890
        $barcode1 = $barcodeService->linkBarcode('8901234567890', $brand->id, 10, $this->tenantA->id);
        $this->assertEquals('pending', $barcode1->status);

        // Clinic B links the exact same barcode to the same brand
        $barcode2 = $barcodeService->linkBarcode('8901234567890', $brand->id, 10, $this->tenantB->id);
        $this->assertEquals('approved', $barcode2->status);

        // Global barcode is now approved and visible to any clinic
        $lookup = $barcodeService->lookup('8901234567890', $this->tenantA->id);
        $this->assertNotNull($lookup);
        $this->assertEquals('approved', $lookup->status);
    }

    /**
     * EnsurePharmacyEnabled middleware: rejects access with 403 when pharmacy_enabled is false.
     */
    public function test_middleware_blocks_access_when_pharmacy_disabled(): void
    {
        // Clinic Beta has pharmacy_enabled = false
        $userB = User::factory()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Beta User',
            'email' => 'user@beta.test',
        ]);
        $userB->givePermissionTo('pharmacy.view');

        // HTML request redirects to dashboard with lock panel / warning
        $response = $this->actingAs($userB)
            ->get("http://{$this->tenantB->subdomain}.{$this->baseDomain}/pharmacy/medicines");

        $response->assertRedirect();

        // JSON / API request returns 403 forbidden
        $responseJson = $this->actingAs($userB)
            ->getJson("http://{$this->tenantB->subdomain}.{$this->baseDomain}/pharmacy/medicines");

        $responseJson->assertStatus(403);

        // Clinic Alpha has pharmacy_enabled = true
        $responseAlpha = $this->actingAs($this->userA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/medicines");

        $responseAlpha->assertStatus(200);
    }

    /**
     * Zero-batch clinic medicines appear in All Stock with quantity 0 and status out_of_stock, and in out_of_stock tab.
     */
    public function test_zero_batch_clinic_medicines_appear_in_all_stock_and_out_of_stock_tab(): void
    {
        $medicine = Medicine::create([
            'generic_name' => 'Zero Batch Drug',
            'normalized_name' => 'zero batch drug',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $medicine->id,
            'strength_text' => '100 mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        $clinicMedicine = ClinicMedicine::create([
            'tenant_id' => $this->tenantA->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Zero Batch Drug 100 mg Tablet',
            'base_unit' => 'tablet',
            'selling_price_cents' => 5000,
            'is_active' => true,
        ]);

        // 1. Appears in "All Stock" tab
        $responseAll = $this->actingAs($this->userA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/medicines");

        $responseAll->assertStatus(200);
        $responseAll->assertInertia(fn ($page) => $page
            ->component('Tenant/Pharmacy/Medicines/Index')
            ->has('medicines.data', 1)
            ->where('medicines.data.0.id', $clinicMedicine->id)
            ->where('medicines.data.0.total_quantity', 0)
            ->where('medicines.data.0.status', 'out_of_stock')
        );

        // 2. Appears in "Out of Stock" tab
        $responseOut = $this->actingAs($this->userA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/medicines?filter=out_of_stock");

        $responseOut->assertStatus(200);
        $responseOut->assertInertia(fn ($page) => $page
            ->component('Tenant/Pharmacy/Medicines/Index')
            ->has('medicines.data', 1)
            ->where('medicines.data.0.id', $clinicMedicine->id)
        );

        // 3. Does not appear in "Low Stock" tab (since qty is 0, not > 0)
        $responseLow = $this->actingAs($this->userA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/medicines?filter=low_stock");

        $responseLow->assertStatus(200);
        $responseLow->assertInertia(fn ($page) => $page
            ->component('Tenant/Pharmacy/Medicines/Index')
            ->has('medicines.data', 0)
        );
    }

    /**
     * Attempting to add an already in-stock variant to clinic stock returns an error.
     */
    public function test_adding_already_in_stock_medicine_rejects_with_error(): void
    {
        $medicine = Medicine::create([
            'generic_name' => 'Existing Drug',
            'normalized_name' => 'existing drug',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $medicine->id,
            'strength_text' => '500 mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        // Already in stock
        ClinicMedicine::create([
            'tenant_id' => $this->tenantA->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Existing Drug 500 mg Tablet',
            'base_unit' => 'tablet',
            'selling_price_cents' => 2000,
            'is_active' => true,
        ]);

        // Try adding the exact same variant again
        $response = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/medicines", [
                'variant_id' => $variant->id,
                'base_unit' => 'tablet',
                'selling_price' => '20.00',
            ]);

        $response->assertSessionHasErrors('variant_id');
        $this->assertEquals(1, ClinicMedicine::where('tenant_id', $this->tenantA->id)->where('medicine_variant_id', $variant->id)->count());
    }

    /**
     * Catalog search endpoint flags items that are already in stock for this clinic.
     */
    public function test_catalog_search_flags_already_in_stock_items(): void
    {
        $medicine = Medicine::create([
            'generic_name' => 'Searchable Drug',
            'normalized_name' => 'searchable drug',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variantInStock = MedicineVariant::create([
            'medicine_id' => $medicine->id,
            'strength_text' => '10 mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        $variantNotInStock = MedicineVariant::create([
            'medicine_id' => $medicine->id,
            'strength_text' => '20 mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        ClinicMedicine::create([
            'tenant_id' => $this->tenantA->id,
            'medicine_variant_id' => $variantInStock->id,
            'display_name' => 'Searchable Drug 10 mg Tablet',
            'base_unit' => 'tablet',
            'selling_price_cents' => 1500,
            'is_active' => true,
        ]);

        $response = $this->actingAs($this->userA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/catalog/search?q=Searchable");

        $response->assertStatus(200);
        $results = $response->json('results');

        $inStockResult = collect($results)->firstWhere('variant_id', $variantInStock->id);
        $this->assertNotNull($inStockResult);
        $this->assertTrue($inStockResult['in_stock']);

        $notInStockResult = collect($results)->firstWhere('variant_id', $variantNotInStock->id);
        $this->assertNotNull($notInStockResult);
        $this->assertFalse($notInStockResult['in_stock']);
    }

    /**
     * Feature test: unknown barcode -> link -> lookup returns brand for the same tenant;
     * another tenant cannot see the pending barcode;
     * second tenant linking the same barcode to the same brand auto-approves it.
     */
    public function test_barcode_linking_flow_tenant_visibility_and_auto_approval(): void
    {
        $medicine = Medicine::create([
            'generic_name' => 'Barcode Test Drug',
            'normalized_name' => 'barcode test drug',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $medicine->id,
            'strength_text' => '500 mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        $brand = MedicineBrand::create([
            'medicine_variant_id' => $variant->id,
            'brand_name' => 'TestBrand',
            'manufacturer' => 'TestPharma',
            'status' => 'approved',
        ]);

        $barcode = '4790000000013';

        // 1. Initial lookup by Tenant A returns found = false
        $lookupBefore = $this->actingAs($this->userA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/barcodes/{$barcode}");
        $lookupBefore->assertStatus(200);
        $this->assertFalse($lookupBefore->json('found'));

        // 2. Tenant A links unknown barcode to brand
        $linkResponseA = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/barcodes/link", [
                'barcode' => $barcode,
                'medicine_brand_id' => $brand->id,
                'pack_size' => 100,
            ]);
        $linkResponseA->assertStatus(200);
        $linkResponseA->assertJson([
            'success' => true,
            'barcode' => $barcode,
            'status' => 'pending',
            'pack_size' => 100,
            'brand_id' => $brand->id,
            'brand_name' => 'TestBrand',
        ]);

        // Ensures clinic_medicine exists for Tenant A
        $this->assertDatabaseHas('clinic_medicines', [
            'tenant_id' => $this->tenantA->id,
            'medicine_variant_id' => $variant->id,
            'medicine_brand_id' => $brand->id,
        ]);

        // 3. Lookup by Tenant A now returns the brand
        $lookupAfterA = $this->actingAs($this->userA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/barcodes/{$barcode}");
        $lookupAfterA->assertStatus(200);
        $this->assertTrue($lookupAfterA->json('found'));
        $this->assertEquals('TestBrand', $lookupAfterA->json('brand_name'));
        $this->assertEquals(100, $lookupAfterA->json('pack_size'));

        // 4. Another tenant (Tenant B) cannot see the pending barcode
        // Enable pharmacy for Tenant B so it can call pharmacy routes
        $this->tenantB->pharmacy_enabled = true;
        $this->tenantB->save();
        $userB = User::factory()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'User B',
            'email' => 'user_b@medvisit.test',
        ]);
        $userB->givePermissionTo(['pharmacy.view', 'pharmacy.manage_medicines', 'pharmacy.receive_stock']);

        tenancy()->end();

        $lookupTenantB = $this->actingAs($userB)
            ->get("http://{$this->tenantB->subdomain}.{$this->baseDomain}/pharmacy/barcodes/{$barcode}");
        $lookupTenantB->assertStatus(200);
        $this->assertFalse($lookupTenantB->json('found'));

        // 5. Tenant B linking the same barcode to the same brand auto-approves it
        $linkResponseB = $this->actingAs($userB)
            ->post("http://{$this->tenantB->subdomain}.{$this->baseDomain}/pharmacy/barcodes/link", [
                'barcode' => $barcode,
                'medicine_brand_id' => $brand->id,
                'pack_size' => 100,
            ]);
        $linkResponseB->assertStatus(200);
        $linkResponseB->assertJson([
            'success' => true,
            'status' => 'approved',
            'message' => 'Barcode auto-approved!',
        ]);

        // Also ensures clinic_medicine exists for Tenant B
        $this->assertDatabaseHas('clinic_medicines', [
            'tenant_id' => $this->tenantB->id,
            'medicine_variant_id' => $variant->id,
            'medicine_brand_id' => $brand->id,
        ]);

        // 6. Barcode is now approved globally; Tenant B lookup returns it as approved
        $lookupAfterB = $this->actingAs($userB)
            ->get("http://{$this->tenantB->subdomain}.{$this->baseDomain}/pharmacy/barcodes/{$barcode}");
        $lookupAfterB->assertStatus(200);
        $this->assertTrue($lookupAfterB->json('found'));
        $this->assertEquals('TestBrand', $lookupAfterB->json('brand_name'));
    }

    /**
     * Test linking barcode with new brand creation.
     */
    public function test_barcode_linking_with_new_brand_creation(): void
    {
        $medicine = Medicine::create([
            'generic_name' => 'New Brand Test Drug',
            'normalized_name' => 'new brand test drug',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $medicine->id,
            'strength_text' => '250 mg',
            'dosage_form' => 'Capsule',
            'status' => 'approved',
        ]);

        $barcode = '4790000000099';

        $response = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/barcodes/link", [
                'barcode' => $barcode,
                'medicine_variant_id' => $variant->id,
                'brand_name' => 'BrandX',
                'manufacturer' => 'CompanyX',
                'pack_size' => 50,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'success' => true,
            'brand_name' => 'BrandX',
            'pack_size' => 50,
        ]);

        $this->assertDatabaseHas('medicine_brands', [
            'medicine_variant_id' => $variant->id,
            'brand_name' => 'BrandX',
            'manufacturer' => 'CompanyX',
        ]);

        $this->assertDatabaseHas('clinic_medicines', [
            'tenant_id' => $this->tenantA->id,
            'medicine_variant_id' => $variant->id,
        ]);
    }

    /**
     * Requirement 1 & 2: GRN allows the same medicine on multiple lines with different batches.
     * Duplicate batch number + expiry adds to existing batch.
     * Stock list computes total_quantity and nearest_expiry across active batches.
     */
    public function test_grn_with_multiple_batches_of_same_medicine(): void
    {
        $medicine = Medicine::create([
            'generic_name' => 'Metformin Hydrochloride',
            'normalized_name' => 'metformin hydrochloride',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $medicine->id,
            'strength_text' => '850 mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        // Submit GRN with 2 lines for the same medicine variant
        $response = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/receipts", [
                'received_date' => now()->toDateString(),
                'items' => [
                    [
                        'medicine_variant_id' => $variant->id,
                        'batch_number' => 'B001',
                        'expiry_date' => '2026-12-25',
                        'quantity' => 30,
                        'cost_price' => 15.00,
                        'selling_price' => 25.00,
                    ],
                    [
                        'medicine_variant_id' => $variant->id,
                        'batch_number' => 'B002',
                        'expiry_date' => '2027-06-30',
                        'quantity' => 20,
                        'cost_price' => 16.50,
                        'selling_price' => 25.00,
                    ],
                ],
            ]);

        $response->assertRedirect(route('tenant.pharmacy.medicines'));

        // Check 2 distinct batches in database
        $this->assertDatabaseHas('stock_batches', [
            'tenant_id' => $this->tenantA->id,
            'batch_number' => 'B001',
            'quantity_remaining' => 30,
        ]);
        $this->assertDatabaseHas('stock_batches', [
            'tenant_id' => $this->tenantA->id,
            'batch_number' => 'B002',
            'quantity_remaining' => 20,
        ]);

        // Stock list index: total quantity = 50, nearest expiry = 2026-12-25, batch count = 2
        $listResponse = $this->actingAs($this->userA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/medicines");
        $listResponse->assertStatus(200);

        $medicines = $listResponse->original->getData()['page']['props']['medicines'];
        $items = $medicines['data'] ?? $medicines;
        $this->assertCount(1, $items);
        $item = $items[0];
        $this->assertEquals('Metformin Hydrochloride', $item['generic_name']);
        $this->assertEquals(50, $item['total_quantity']);
        $this->assertEquals('2026-12-25', $item['nearest_expiry']);
        $this->assertEquals(2, $item['batch_count']);

        // Show detail drawer endpoint lists both batches ordered by expiry ASC
        $clinicMed = ClinicMedicine::where('tenant_id', $this->tenantA->id)->firstOrFail();
        $detailResponse = $this->actingAs($this->userA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$clinicMed->id}");
        $detailResponse->assertStatus(200);

        $batches = $detailResponse->json('batches');
        $this->assertCount(2, $batches);
        $this->assertEquals('B001', $batches[0]['batch_number']);
        $this->assertEquals('2026-12-25', $batches[0]['expiry_date']);
        $this->assertEquals('B002', $batches[1]['batch_number']);
        $this->assertEquals('2027-06-30', $batches[1]['expiry_date']);

        // Receiving the SAME batch with the same expiry merges into existing batch instead of duplicating
        $secondGrn = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/receipts", [
                'received_date' => now()->toDateString(),
                'items' => [
                    [
                        'clinic_medicine_id' => $clinicMed->id,
                        'batch_number' => 'B001',
                        'expiry_date' => '2026-12-25',
                        'quantity' => 15,
                        'cost_price' => 15.00,
                    ],
                ],
            ]);
        $secondGrn->assertRedirect();

        $this->assertEquals(2, StockBatch::where('clinic_medicine_id', $clinicMed->id)->count());
        $this->assertDatabaseHas('stock_batches', [
            'id' => $batches[0]['id'],
            'batch_number' => 'B001',
            'quantity_remaining' => 45,
            'quantity_received' => 45,
        ]);
    }

    /**
     * Requirement 6: Add Medicine modal with opening stock batches.
     */
    public function test_add_medicine_with_opening_batches(): void
    {
        $medicine = Medicine::create([
            'generic_name' => 'Atorvastatin',
            'normalized_name' => 'atorvastatin',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $medicine->id,
            'strength_text' => '20 mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        $futureDate1 = now()->addMonths(6)->toDateString();
        $futureDate2 = now()->addMonths(12)->toDateString();

        $response = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/medicines", [
                'variant_id' => $variant->id,
                'base_unit' => 'tablet',
                'selling_price' => 30.00,
                'reorder_level' => 10,
                'opening_batches' => [
                    [
                        'batch_number' => 'AT-001',
                        'expiry_date' => $futureDate1,
                        'quantity' => 30,
                        'cost_price' => 18.00,
                    ],
                    [
                        'batch_number' => 'AT-002',
                        'expiry_date' => $futureDate2,
                        'quantity' => 20,
                        'cost_price' => 18.50,
                    ],
                ],
            ]);

        $response->assertRedirect();
        $clinicMed = ClinicMedicine::where('tenant_id', $this->tenantA->id)
            ->where('medicine_variant_id', $variant->id)
            ->firstOrFail();

        $this->assertDatabaseHas('stock_batches', [
            'clinic_medicine_id' => $clinicMed->id,
            'batch_number' => 'AT-001',
            'quantity_remaining' => 30,
        ]);
        $this->assertDatabaseHas('stock_batches', [
            'clinic_medicine_id' => $clinicMed->id,
            'batch_number' => 'AT-002',
            'quantity_remaining' => 20,
        ]);

        // Assert 2 stock movements with type = 'opening_stock' and reason = 'Opening stock'
        $movements = StockMovement::where('clinic_medicine_id', $clinicMed->id)->get();
        $this->assertCount(2, $movements);
        foreach ($movements as $m) {
            $this->assertEquals(StockMovement::TYPE_OPENING_STOCK, $m->type);
            $this->assertEquals('Opening stock', $m->reason);
        }
    }

    /**
     * Requirement 7: Existing medicine quick add stock batches.
     */
    public function test_quick_add_stock_to_existing_medicine(): void
    {
        $medicine = Medicine::create([
            'generic_name' => 'Amlodipine',
            'normalized_name' => 'amlodipine',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $medicine->id,
            'strength_text' => '5 mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        $clinicMed = ClinicMedicine::create([
            'tenant_id' => $this->tenantA->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Amlodipine 5 mg Tablet',
            'base_unit' => 'tablet',
            'selling_price_cents' => 1500,
            'is_active' => true,
        ]);

        $futureDate = now()->addMonths(8)->toDateString();

        // 1. First add stock batch when no prior stock exists -> records opening_stock
        $res1 = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$clinicMed->id}/batches", [
                'batches' => [
                    [
                        'batch_number' => 'AM-001',
                        'expiry_date' => $futureDate,
                        'quantity' => 50,
                        'cost_price' => 8.00,
                    ],
                ],
            ]);

        $res1->assertRedirect();
        $this->assertDatabaseHas('stock_batches', [
            'clinic_medicine_id' => $clinicMed->id,
            'batch_number' => 'AM-001',
            'quantity_remaining' => 50,
        ]);

        $movement1 = StockMovement::where('clinic_medicine_id', $clinicMed->id)->firstOrFail();
        $this->assertEquals(StockMovement::TYPE_OPENING_STOCK, $movement1->type);

        // 2. Second add stock batch when prior stock exists -> records adjustment_in with 'Manual stock add'
        $futureDate2 = now()->addMonths(14)->toDateString();
        $res2 = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$clinicMed->id}/batches", [
                'batches' => [
                    [
                        'batch_number' => 'AM-002',
                        'expiry_date' => $futureDate2,
                        'quantity' => 25,
                        'cost_price' => 8.50,
                    ],
                ],
            ]);

        $res2->assertRedirect();
        $movement2 = StockMovement::where('clinic_medicine_id', $clinicMed->id)
            ->where('stock_batch_id', '!=', $movement1->stock_batch_id)
            ->firstOrFail();
        $this->assertEquals(StockMovement::TYPE_ADJUSTMENT_IN, $movement2->type);
        $this->assertEquals('Manual stock add', $movement2->reason);

        // 3. Adding to existing batch AM-001 with same expiry increments batch
        $res3 = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$clinicMed->id}/batches", [
                'batches' => [
                    [
                        'batch_number' => 'AM-001',
                        'expiry_date' => $futureDate,
                        'quantity' => 10,
                        'cost_price' => 8.00,
                    ],
                ],
            ]);

        $res3->assertRedirect();
        $this->assertEquals(2, StockBatch::where('clinic_medicine_id', $clinicMed->id)->count());
        $this->assertDatabaseHas('stock_batches', [
            'batch_number' => 'AM-001',
            'quantity_remaining' => 60,
        ]);
    }

    /**
     * Requirement 2: Validation rejects past / already-expired stock across GRN, Add Medicine, and Quick Add.
     */
    public function test_past_expiry_rejected_in_grn_and_opening_stock(): void
    {
        $medicine = Medicine::create([
            'generic_name' => 'Expired Test Drug',
            'normalized_name' => 'expired test drug',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $medicine->id,
            'strength_text' => '10 mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        // 1. GRN with expiry on or before received date should fail validation
        $grnResponse = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/receipts", [
                'received_date' => '2026-10-18',
                'items' => [
                    [
                        'medicine_variant_id' => $variant->id,
                        'batch_number' => 'EXP-001',
                        'expiry_date' => '2026-10-17', // in the past relative to received_date
                        'quantity' => 10,
                        'cost_price' => 5.00,
                    ],
                ],
            ]);

        $grnResponse->assertSessionHasErrors(['items.0.expiry_date']);

        // 2. Add Medicine with opening batch expiring in the past should fail validation
        $openResponse = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/medicines", [
                'variant_id' => $variant->id,
                'base_unit' => 'tablet',
                'selling_price' => 10.00,
                'opening_batches' => [
                    [
                        'batch_number' => 'EXP-002',
                        'expiry_date' => '2020-01-01',
                        'quantity' => 10,
                    ],
                ],
            ]);

        $openResponse->assertSessionHasErrors(['opening_batches.0.expiry_date']);

        // 3. Quick Add Stock with batch expiring in the past should fail validation
        $clinicMed = ClinicMedicine::create([
            'tenant_id' => $this->tenantA->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Expired Test Drug 10 mg Tablet',
            'base_unit' => 'tablet',
            'selling_price_cents' => 1000,
            'is_active' => true,
        ]);

        $quickResponse = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$clinicMed->id}/batches", [
                'batches' => [
                    [
                        'batch_number' => 'EXP-003',
                        'expiry_date' => '2021-05-01',
                        'quantity' => 10,
                    ],
                ],
            ]);

        $quickResponse->assertSessionHasErrors(['batches.0.expiry_date']);
    }
}
