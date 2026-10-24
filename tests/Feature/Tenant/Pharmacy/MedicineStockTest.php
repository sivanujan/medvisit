<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant\Pharmacy;

use App\Models\AuditEvent;
use App\Models\ClinicMedicine;
use App\Models\Medicine;
use App\Models\MedicineBarcode;
use App\Models\MedicineBrand;
use App\Models\MedicineVariant;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Pharmacy\MedicineDuplicateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class MedicineStockTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Tenant $otherTenant;

    protected User $user;

    protected string $baseDomain;

    protected MedicineDuplicateService $duplicateService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $this->duplicateService = app(MedicineDuplicateService::class);

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'clinic-med-test',
            'name' => 'Medicine Test Clinic',
            'subdomain' => 'medtest',
            'status' => 'active',
            'pharmacy_enabled' => true,
        ]);

        $this->otherTenant = Tenant::factory()->active()->create([
            'id' => 'clinic-other-test',
            'name' => 'Other Clinic',
            'subdomain' => 'othertest',
            'status' => 'active',
            'pharmacy_enabled' => true,
        ]);

        $this->user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Lead Pharmacist',
            'email' => 'pharmacy@medtest.com',
        ]);

        $permissions = [
            'pharmacy.view',
            'pharmacy.manage_medicines',
            'pharmacy.receive_stock',
            'pharmacy.adjust_stock',
        ];

        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        $this->user->givePermissionTo($permissions);
    }

    protected function createVariant(string $genericName = 'Amoxicillin', string $strength = '500 mg', string $form = 'Capsule'): MedicineVariant
    {
        $med = Medicine::firstOrCreate(
            ['generic_name' => $genericName],
            [
                'normalized_name' => strtolower($genericName),
                'route' => 'Oral',
                'status' => 'approved',
            ]
        );

        return MedicineVariant::firstOrCreate(
            [
                'medicine_id' => $med->id,
                'strength_text' => $strength,
                'dosage_form' => $form,
            ],
            [
                'status' => 'approved',
            ]
        );
    }

    /**
     * Test 1: Duplicate detection and the merge moves all references.
     */
    public function test_duplicate_detection_and_merge_moves_all_references(): void
    {
        $variant = $this->createVariant('Amoxicillin', '500 mg', 'Capsule');

        $brand = MedicineBrand::create([
            'medicine_variant_id' => $variant->id,
            'brand_name' => 'Moxilen',
            'status' => 'approved',
        ]);

        // Medicine A (Kept)
        $medA = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variant->id,
            'medicine_brand_id' => $brand->id,
            'display_name' => 'Amoxicillin 500mg Capsule (Moxilen)',
            'base_unit' => 'capsule',
            'selling_price_cents' => 2000,
            'reorder_level' => 15,
            'is_active' => true,
        ]);

        // Medicine B (Merged duplicate)
        $medB = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variant->id,
            'medicine_brand_id' => null,
            'display_name' => 'Amoxicillin 500 mg',
            'base_unit' => 'capsule',
            'selling_price_cents' => 1800,
            'reorder_level' => 10,
            'is_active' => true,
        ]);

        // Create batches, movements, and references on Medicine B
        $batchB = StockBatch::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $medB->id,
            'batch_number' => 'BATCH-MOX-01',
            'expiry_date' => now()->addMonths(6)->toDateString(),
            'quantity_received' => 100,
            'quantity_remaining' => 60,
            'cost_price_cents' => 1200,
        ]);

        $movementB = StockMovement::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $medB->id,
            'stock_batch_id' => $batchB->id,
            'user_id' => $this->user->id,
            'type' => StockMovement::TYPE_RECEIPT,
            'quantity' => 100,
            'balance_after' => 100,
        ]);

        // Duplicate detection test
        $duplicates = $this->duplicateService->detectDuplicates($this->tenant->id);
        $this->assertNotEmpty($duplicates);

        // Perform merge via POST endpoint
        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines/merge";
        $response = $this->actingAs($this->user)->post($url, [
            'kept_id' => $medA->id,
            'merged_id' => $medB->id,
            'reason' => 'Duplicate generic & branded pair merged into Moxilen',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        // Verify references moved
        $batchB->refresh();
        $movementB->refresh();
        $medB->refresh();

        $this->assertSame($medA->id, $batchB->clinic_medicine_id);
        $this->assertSame($medA->id, $movementB->clinic_medicine_id);

        // Merged medicine archived
        $this->assertFalse($medB->is_active);
        $this->assertStringContainsString('[Merged into #'.$medA->id.']', $medB->display_name);

        // Verify audit log
        $audit = AuditEvent::where('action', 'stock.medicine_merged')
            ->where('resource_id', (string) $medA->id)
            ->first();

        $this->assertNotNull($audit);
        $this->assertSame((int) $medB->id, (int) $audit->metadata['merged_medicine_id']);
    }

    /**
     * Test 2: Display name without repeated brand name.
     */
    public function test_display_name_normalisation_removes_repeated_brand(): void
    {
        $variant = $this->createVariant('Samahan Herbal', '4 g', 'Powder');

        $brand = MedicineBrand::create([
            'medicine_variant_id' => $variant->id,
            'brand_name' => 'Samahan',
            'status' => 'approved',
        ]);

        $med = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variant->id,
            'medicine_brand_id' => $brand->id,
            'display_name' => 'Samahan Samahan Herbal 4 g',
            'base_unit' => 'sachet',
            'selling_price_cents' => 5000,
            'is_active' => true,
        ]);

        $norm = $this->duplicateService->normalizeDisplayName($med);

        $this->assertSame('Samahan Herbal 4 g Powder', $norm['normalized_name']);
        $this->assertDoesNotMatchRegularExpression('/Samahan.*Samahan/i', $norm['normalized_name']);
    }

    /**
     * Test 3: Low stock rule using the reorder level per medicine with clinic default fallback.
     */
    public function test_low_stock_rule_evaluates_against_medicine_reorder_level_and_fallback(): void
    {
        $variant1 = $this->createVariant('Cefuroxime', '250 mg', 'Tablet');
        $variant2 = $this->createVariant('Cetirizine', '10 mg', 'Tablet');

        // Cefuroxime: reorder_level = 30, quantity = 8 -> LOW STOCK (8 <= 30)
        $cefuroxime = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variant1->id,
            'display_name' => 'Cefuroxime 250mg Tablet',
            'base_unit' => 'tablet',
            'selling_price_cents' => 4500,
            'reorder_level' => 30,
            'is_active' => true,
        ]);

        StockBatch::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $cefuroxime->id,
            'batch_number' => 'CEF-001',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity_received' => 50,
            'quantity_remaining' => 8,
            'cost_price_cents' => 3000,
        ]);

        // Cetirizine: reorder_level = null (clinic default is 10), quantity = 10 -> LOW STOCK (10 <= 10)
        $cetirizine = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variant2->id,
            'display_name' => 'Cetirizine 10mg Tablet',
            'base_unit' => 'tablet',
            'selling_price_cents' => 1500,
            'reorder_level' => null,
            'is_active' => true,
        ]);

        StockBatch::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $cetirizine->id,
            'batch_number' => 'CET-001',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity_received' => 50,
            'quantity_remaining' => 10,
            'cost_price_cents' => 800,
        ]);

        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines?tab=low_stock";
        $response = $this->actingAs($this->user)->get($url);

        $response->assertOk();
        $response->assertInertia(function ($page) use ($cefuroxime, $cetirizine) {
            $data = collect($page->toArray()['props']['medicines']['data']);
            $ids = $data->pluck('id')->all();

            $this->assertContains($cefuroxime->id, $ids);
            $this->assertContains($cetirizine->id, $ids);
        });
    }

    /**
     * Test 4: Delete blocked with history; allowed only with zero history.
     */
    public function test_hard_delete_is_blocked_when_history_exists_and_allowed_when_clean(): void
    {
        $variantClean = $this->createVariant('Omeprazole Clean', '20 mg', 'Capsule');
        $variantHist = $this->createVariant('Omeprazole Hist', '20 mg', 'Capsule');

        // Clean medicine (no batches, no movements, no prescriptions)
        $cleanMed = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variantClean->id,
            'display_name' => 'Omeprazole Clean',
            'base_unit' => 'capsule',
            'is_active' => true,
        ]);

        // Medicine with batch history
        $historyMed = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variantHist->id,
            'display_name' => 'Omeprazole With History',
            'base_unit' => 'capsule',
            'is_active' => true,
        ]);

        StockBatch::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $historyMed->id,
            'batch_number' => 'OME-HIST',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity_received' => 20,
            'quantity_remaining' => 0,
            'cost_price_cents' => 500,
        ]);

        // Delete with history: must be blocked with 422
        $urlHistory = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$historyMed->id}";
        $responseHistory = $this->actingAs($this->user)->deleteJson($urlHistory);
        $responseHistory->assertStatus(422);
        $this->assertDatabaseHas('clinic_medicines', ['id' => $historyMed->id]);

        // Clean medicine: hard delete succeeds
        $urlClean = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$cleanMed->id}";
        $responseClean = $this->actingAs($this->user)->delete($urlClean);
        $responseClean->assertRedirect();
        $this->assertDatabaseMissing('clinic_medicines', ['id' => $cleanMed->id]);
    }

    /**
     * Test 5: Search by barcode and batch number.
     */
    public function test_search_by_barcode_and_batch_number(): void
    {
        $variant = $this->createVariant('Metformin', '500 mg', 'Tablet');

        $brand = MedicineBrand::create([
            'medicine_variant_id' => $variant->id,
            'brand_name' => 'Glucophage',
            'status' => 'approved',
        ]);

        MedicineBarcode::create([
            'medicine_brand_id' => $brand->id,
            'barcode' => '8901234567890',
            'pack_size' => 100,
            'status' => 'approved',
        ]);

        $med = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variant->id,
            'medicine_brand_id' => $brand->id,
            'display_name' => 'Metformin 500mg Tablet (Glucophage)',
            'base_unit' => 'tablet',
            'is_active' => true,
        ]);

        StockBatch::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $med->id,
            'batch_number' => 'MET-SPECIAL-99',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity_received' => 100,
            'quantity_remaining' => 50,
            'cost_price_cents' => 400,
        ]);

        // Search by Barcode
        $urlBarcode = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines?search=8901234567890";
        $responseBarcode = $this->actingAs($this->user)->get($urlBarcode);
        $responseBarcode->assertOk();
        $responseBarcode->assertInertia(fn ($page) => $page->where('medicines.data.0.id', $med->id));

        // Search by Batch Number
        $urlBatch = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines?search=MET-SPECIAL-99";
        $responseBatch = $this->actingAs($this->user)->get($urlBatch);
        $responseBatch->assertOk();
        $responseBatch->assertInertia(fn ($page) => $page->where('medicines.data.0.id', $med->id));
    }

    /**
     * Test 6: Stock value totals (cost vs selling price totals).
     */
    public function test_stock_value_totals_computation(): void
    {
        $variant = $this->createVariant('Atorvastatin', '20 mg', 'Tablet');

        $med = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Atorvastatin 20mg Tablet',
            'base_unit' => 'tablet',
            'selling_price_cents' => 5000, // Rs. 50.00
            'is_active' => true,
        ]);

        StockBatch::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $med->id,
            'batch_number' => 'ATOR-01',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity_received' => 200,
            'quantity_remaining' => 100,
            'cost_price_cents' => 3000, // Rs. 30.00
        ]);

        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines";
        $response = $this->actingAs($this->user)->get($url);

        $response->assertOk();
        $response->assertInertia(function ($page) {
            $stats = $page->toArray()['props']['stats'];

            // Cost = 100 * 3000 = 300,000 cents
            $this->assertSame(300000, $stats['stock_value_cost_cents']);

            // Selling = 100 * 5000 = 500,000 cents
            $this->assertSame(500000, $stats['stock_value_selling_cents']);
        });
    }

    /**
     * Test 7: Tenant isolation across medicines, batches and movements.
     */
    public function test_tenant_isolation_is_strictly_enforced(): void
    {
        $variant = $this->createVariant('Ciprofloxacin', '500 mg', 'Tablet');

        // Other tenant's medicine
        $otherMed = ClinicMedicine::create([
            'tenant_id' => $this->otherTenant->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Other Clinic Cipro',
            'base_unit' => 'tablet',
            'is_active' => true,
        ]);

        StockBatch::create([
            'tenant_id' => $this->otherTenant->id,
            'clinic_medicine_id' => $otherMed->id,
            'batch_number' => 'OTHER-CIPRO',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity_received' => 100,
            'quantity_remaining' => 100,
            'cost_price_cents' => 1000,
        ]);

        // Current tenant requests list
        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines";
        $response = $this->actingAs($this->user)->get($url);

        $response->assertOk();
        $response->assertInertia(function ($page) use ($otherMed) {
            $data = collect($page->toArray()['props']['medicines']['data']);
            $this->assertFalse($data->contains('id', $otherMed->id));
        });

        // Current tenant attempts to view other tenant's medicine detail
        $urlDetail = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$otherMed->id}";
        $responseDetail = $this->actingAs($this->user)->get($urlDetail);
        $responseDetail->assertNotFound();
    }

    /**
     * Test 8: Margin calculation matches the formula and label (margin = profit / selling price * 100).
     */
    public function test_margin_calculation_matches_formula_and_label(): void
    {
        $variant = $this->createVariant('Amlodipine', '5 mg', 'Tablet');

        $med = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Amlodipine 5 mg',
            'base_unit' => 'tablet',
            'selling_price_cents' => 800, // Rs. 8.00
            'is_active' => true,
        ]);

        StockBatch::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $med->id,
            'batch_number' => 'AMLO-01',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity_received' => 150,
            'quantity_remaining' => 150,
            'cost_price_cents' => 450, // Rs. 4.50
        ]);

        // Profit = 800 - 450 = 350 cents (Rs. 3.50)
        // Margin = (350 / 800) * 100 = 43.75% -> 44%
        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$med->id}";
        $response = $this->actingAs($this->user)->getJson($url);

        $response->assertOk();
        $data = $response->json('medicine');

        $this->assertSame(450, $data['cost_price_cents']);
        $this->assertSame(800, $data['selling_price_cents']);
        $this->assertSame(350, $data['profit_cents']);
        $this->assertSame(44, $data['margin_percent']);
    }

    /**
     * Test 9: Reorder default toggle saves null vs a custom number correctly.
     */
    public function test_reorder_default_toggle_saves_null_vs_custom_number_correctly(): void
    {
        $variant = $this->createVariant('Metformin', '500 mg', 'Tablet');

        $med = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Metformin 500 mg',
            'base_unit' => 'tablet',
            'selling_price_cents' => 1500,
            'reorder_level' => 50,
            'is_active' => true,
        ]);

        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$med->id}";

        // Step 1: Switch toggle to clinic default (sends null)
        $resDefault = $this->actingAs($this->user)->put($url, [
            'selling_price' => 15.00,
            'reorder_level' => null,
            'shelf_location' => 'Shelf A-1',
        ]);
        $resDefault->assertRedirect();
        $med->refresh();
        $this->assertNull($med->reorder_level, 'Reorder level should be null when clinic default is selected.');

        // Step 2: Switch toggle to custom number (sends 25)
        $resCustom = $this->actingAs($this->user)->put($url, [
            'selling_price' => 15.00,
            'reorder_level' => 25,
            'shelf_location' => 'Shelf A-1',
        ]);
        $resCustom->assertRedirect();
        $med->refresh();
        $this->assertSame(25, $med->reorder_level, 'Reorder level should be 25 when custom level is saved.');
    }

    /**
     * Test 10: Barcode uniqueness within tenant is strictly enforced.
     */
    public function test_barcode_uniqueness_validation_within_tenant(): void
    {
        $variantA = $this->createVariant('Paracetamol', '500 mg', 'Tablet');
        $variantB = $this->createVariant('Ibuprofen', '400 mg', 'Tablet');

        $brandA = MedicineBrand::create([
            'medicine_variant_id' => $variantA->id,
            'brand_name' => 'Panadol',
            'status' => MedicineBrand::STATUS_APPROVED,
            'created_by_tenant_id' => $this->tenant->id,
        ]);

        $brandB = MedicineBrand::create([
            'medicine_variant_id' => $variantB->id,
            'brand_name' => 'Brufen',
            'status' => MedicineBrand::STATUS_APPROVED,
            'created_by_tenant_id' => $this->tenant->id,
        ]);

        MedicineBarcode::create([
            'medicine_brand_id' => $brandA->id,
            'barcode' => '8901234567890',
            'pack_size' => 1,
            'status' => MedicineBarcode::STATUS_APPROVED,
            'created_by_tenant_id' => $this->tenant->id,
        ]);

        $medB = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variantB->id,
            'medicine_brand_id' => $brandB->id,
            'display_name' => 'Brufen 400 mg',
            'base_unit' => 'tablet',
            'selling_price_cents' => 2000,
            'is_active' => true,
        ]);

        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$medB->id}";

        // Attempt to assign brandA's barcode to medB
        $response = $this->actingAs($this->user)->put($url, [
            'selling_price' => 20.00,
            'new_barcode' => '8901234567890',
        ]);

        $response->assertSessionHasErrors(['new_barcode']);
    }

    /**
     * Test 11: Deactivate confirm updates active status while preserving history.
     */
    public function test_deactivate_confirm_and_toggle_active_status(): void
    {
        $variant = $this->createVariant('Omeprazole', '20 mg', 'Capsule');

        $med = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Omeprazole 20 mg',
            'base_unit' => 'capsule',
            'selling_price_cents' => 3000,
            'is_active' => true,
        ]);

        StockBatch::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $med->id,
            'batch_number' => 'OMEP-01',
            'expiry_date' => now()->addYear()->toDateString(),
            'quantity_received' => 100,
            'quantity_remaining' => 100,
            'cost_price_cents' => 1500,
        ]);

        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$med->id}";

        // Deactivate via PUT with is_active = false
        $response = $this->actingAs($this->user)->put($url, [
            'is_active' => false,
        ]);

        $response->assertRedirect();
        $med->refresh();
        $this->assertFalse($med->is_active, 'Medicine should be deactivated.');

        // History still intact
        $this->assertSame(1, $med->batches()->count());
        $this->assertSame(100, $med->batches()->first()->quantity_remaining);
    }

    /**
     * Test 12: Duplicate check blocks silent duplicate on store.
     */
    public function test_duplicate_check_blocks_silent_duplicate_on_store(): void
    {
        $variant = $this->createVariant('Amoxicillin', '500 mg', 'Capsule');
        $brand = MedicineBrand::create([
            'medicine_variant_id' => $variant->id,
            'brand_name' => 'Moxilin',
            'status' => MedicineBrand::STATUS_APPROVED,
            'created_by_tenant_id' => $this->tenant->id,
        ]);

        ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variant->id,
            'medicine_brand_id' => $brand->id,
            'display_name' => 'Moxilin 500 mg Capsule',
            'base_unit' => 'capsule',
            'selling_price_cents' => 3500,
            'is_active' => true,
        ]);

        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines";

        // Attempt to store the exact same variant and brand
        $response = $this->actingAs($this->user)->post($url, [
            'variant_id' => $variant->id,
            'brand_id' => $brand->id,
            'selling_price' => 35.00,
            'base_unit' => 'capsule',
        ]);

        $response->assertSessionHasErrors(['variant_id']);
        $this->assertSame(1, ClinicMedicine::where('tenant_id', $this->tenant->id)->count());
    }

    /**
     * Test 13: Barcode uniqueness validation when adding a new medicine.
     */
    public function test_store_barcode_uniqueness_validation(): void
    {
        $variantA = $this->createVariant('Paracetamol', '500 mg', 'Tablet');
        $brandA = MedicineBrand::create([
            'medicine_variant_id' => $variantA->id,
            'brand_name' => 'Panadol Extra',
            'status' => MedicineBrand::STATUS_APPROVED,
            'created_by_tenant_id' => $this->tenant->id,
        ]);

        MedicineBarcode::create([
            'medicine_brand_id' => $brandA->id,
            'barcode' => '778899001122',
            'pack_size' => 10,
            'status' => MedicineBarcode::STATUS_APPROVED,
            'created_by_tenant_id' => $this->tenant->id,
        ]);

        $variantB = $this->createVariant('Aspirin', '100 mg', 'Tablet');
        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines";

        // Try to add variant B with brandA's existing barcode
        $response = $this->actingAs($this->user)->post($url, [
            'variant_id' => $variantB->id,
            'selling_price' => 12.00,
            'base_unit' => 'tablet',
            'barcode' => '778899001122',
        ]);

        $response->assertSessionHasErrors(['barcode']);
    }

    /**
     * Test 14: Opening batches expiry date must be strictly in the future.
     */
    public function test_opening_batches_expiry_must_be_in_the_future(): void
    {
        $variant = $this->createVariant('Ciprofloxacin', '500 mg', 'Tablet');
        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines";

        // Attempt with past expiry date
        $response = $this->actingAs($this->user)->post($url, [
            'variant_id' => $variant->id,
            'selling_price' => 50.00,
            'base_unit' => 'tablet',
            'opening_batches' => [
                [
                    'batch_number' => 'CIPRO-EXP',
                    'expiry_date' => now()->subDay()->toDateString(),
                    'quantity' => 100,
                    'cost_price' => 30.00,
                ],
            ],
        ]);

        $response->assertSessionHasErrors(['opening_batches.0.expiry_date']);
    }

    /**
     * Test 15: Opening batches create stock movements of type 'opening_stock' and FEFO order.
     */
    public function test_opening_batches_create_stock_movements_and_fefo_order(): void
    {
        $variant = $this->createVariant('Azithromycin', '500 mg', 'Tablet');
        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines";

        $response = $this->actingAs($this->user)->post($url, [
            'variant_id' => $variant->id,
            'selling_price' => 120.00,
            'base_unit' => 'tablet',
            'opening_batches' => [
                [
                    'batch_number' => 'AZI-LATER',
                    'expiry_date' => now()->addDays(200)->toDateString(),
                    'quantity' => 60,
                    'cost_price' => 80.00,
                ],
                [
                    'batch_number' => 'AZI-SOON',
                    'expiry_date' => now()->addDays(90)->toDateString(),
                    'quantity' => 40,
                    'cost_price' => 75.00,
                ],
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $med = ClinicMedicine::where('tenant_id', $this->tenant->id)
            ->where('medicine_variant_id', $variant->id)
            ->firstOrFail();

        $this->assertSame(100, $med->total_quantity);

        // Verify stock movements
        $movements = StockMovement::where('clinic_medicine_id', $med->id)->get();
        $this->assertCount(2, $movements);
        $this->assertTrue($movements->every(fn ($m) => $m->type === StockMovement::TYPE_OPENING_STOCK));

        // Verify FEFO order (soonest expiring batch first)
        $fefoBatches = $med->batches()->orderByRaw('expiry_date ASC NULLS LAST')->get();
        $this->assertSame('AZI-SOON', $fefoBatches[0]->batch_number);
        $this->assertSame('AZI-LATER', $fefoBatches[1]->batch_number);
    }

    /**
     * Test 16: Custom medicine creation sets SOURCE_CLINIC flag and STATUS_PENDING.
     */
    public function test_custom_medicine_is_created_with_custom_flag(): void
    {
        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines";

        $response = $this->actingAs($this->user)->post($url, [
            'generic_name' => 'Custom Herb Formulation',
            'strength' => '250 mg',
            'dosage_form' => 'Capsule',
            'brand_name' => 'AyurHerb',
            'selling_price' => 40.00,
            'base_unit' => 'capsule',
        ]);

        $response->assertRedirect();

        $medicine = Medicine::where('normalized_name', 'custom herb formulation')->firstOrFail();
        $this->assertSame(Medicine::SOURCE_CLINIC, $medicine->source);
        $this->assertSame(Medicine::STATUS_PENDING, $medicine->status);
        $this->assertSame($this->tenant->id, $medicine->created_by_tenant_id);

        $variant = MedicineVariant::where('medicine_id', $medicine->id)->firstOrFail();
        $this->assertSame('250 mg', $variant->strength_text);
        $this->assertSame('Capsule', $variant->dosage_form);
    }

    /**
     * Test 17: Tenant isolation is preserved when storing new medicines.
     */
    public function test_store_tenant_isolation_is_strictly_enforced(): void
    {
        $variant = $this->createVariant('Metformin', '850 mg', 'Tablet');
        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines";

        $this->actingAs($this->user)->post($url, [
            'variant_id' => $variant->id,
            'selling_price' => 15.00,
            'base_unit' => 'tablet',
        ]);

        // Target tenant has 1 item
        $this->assertSame(1, ClinicMedicine::where('tenant_id', $this->tenant->id)->count());

        // Other tenant has 0 items
        $this->assertSame(0, ClinicMedicine::where('tenant_id', $this->otherTenant->id)->count());
    }
}
