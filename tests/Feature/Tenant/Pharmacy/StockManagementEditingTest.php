<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant\Pharmacy;

use App\Models\AuditEvent;
use App\Models\ClinicMedicine;
use App\Models\Medicine;
use App\Models\MedicineVariant;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\StockReceipt;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Pharmacy\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class StockManagementEditingTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $user;

    protected string $baseDomain;

    protected StockService $stockService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $this->stockService = app(StockService::class);

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'clinic-stock-test',
            'name' => 'Stock Test Clinic',
            'subdomain' => 'stocktest',
            'status' => 'active',
            'pharmacy_enabled' => true,
        ]);

        $this->user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Stock Manager',
            'email' => 'stock@test.com',
        ]);

        $permissions = [
            'pharmacy.view',
            'pharmacy.manage_medicines',
            'pharmacy.receive_stock',
            'pharmacy.adjust_stock',
            'pharmacy.manage_suppliers',
        ];

        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        $this->user->givePermissionTo($permissions);
    }

    protected function createVariant(string $genericName = 'Paracetamol', string $strength = '500mg', string $form = 'Tablet'): MedicineVariant
    {
        $med = Medicine::create([
            'generic_name' => $genericName,
            'normalized_name' => strtolower($genericName),
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        return MedicineVariant::create([
            'medicine_id' => $med->id,
            'strength_text' => $strength,
            'dosage_form' => $form,
            'status' => 'approved',
        ]);
    }

    /**
     * 1. Edit clinic medicine price and settings writes audit log.
     */
    public function test_edit_medicine_price_and_settings_writes_audit_log(): void
    {
        $variant = $this->createVariant();

        $clinicMed = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Paracetamol 500mg Tablet',
            'base_unit' => 'tablet',
            'selling_price_cents' => 0,
            'reorder_level' => 10,
            'shelf_location' => 'Shelf A1',
            'is_active' => true,
        ]);

        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$clinicMed->id}";

        $response = $this->actingAs($this->user)
            ->put($url, [
                'selling_price' => 15.50, // 15.50 rupees -> 1550 cents
                'reorder_level' => 25,
                'shelf_location' => 'Cabinet B2',
                'base_unit' => 'tablet',
                'is_active' => true,
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $clinicMed->refresh();
        $this->assertSame(1550, $clinicMed->selling_price_cents);
        $this->assertSame(25, $clinicMed->reorder_level);
        $this->assertSame('Cabinet B2', $clinicMed->shelf_location);

        // Check audit event
        $audit = AuditEvent::where('action', 'stock.medicine_updated')
            ->where('resource_id', (string) $clinicMed->id)
            ->first();

        $this->assertNotNull($audit);
        $this->assertSame(0, $audit->metadata['old']['selling_price_cents']);
        $this->assertSame(1550, $audit->metadata['new']['selling_price_cents']);
        $this->assertSame(10, $audit->metadata['old']['reorder_level']);
        $this->assertSame(25, $audit->metadata['new']['reorder_level']);
    }

    /**
     * Base unit cannot be changed once stock movements or batches exist.
     */
    public function test_cannot_change_base_unit_when_movements_exist(): void
    {
        $variant = $this->createVariant('Amoxicillin', '250mg', 'Capsule');

        $this->stockService->receiveStock([
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'medicine_variant_id' => $variant->id,
                    'display_name' => 'Amoxicillin 250mg Capsule',
                    'base_unit' => 'capsule',
                    'batch_number' => 'AMX-001',
                    'quantity' => 100,
                    'cost_price_cents' => 500,
                ],
            ],
        ], $this->user, $this->tenant->id);

        $clinicMed = ClinicMedicine::where('tenant_id', $this->tenant->id)->firstOrFail();

        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$clinicMed->id}";

        $response = $this->actingAs($this->user)
            ->put($url, [
                'selling_price' => 10.00,
                'base_unit' => 'bottle', // Attempt to change base unit
            ]);

        $response->assertSessionHasErrors(['base_unit']);

        $clinicMed->refresh();
        $this->assertSame('capsule', $clinicMed->base_unit);
    }

    /**
     * 2. Edit batch expiry writes audit log and doesn't change quantity.
     */
    public function test_edit_batch_expiry_writes_audit_log_and_does_not_change_quantity(): void
    {
        $variant = $this->createVariant('Ciprofloxacin', '500mg', 'Tablet');

        $receipt = $this->stockService->receiveStock([
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'medicine_variant_id' => $variant->id,
                    'display_name' => 'Ciprofloxacin 500mg Tablet',
                    'base_unit' => 'tablet',
                    'batch_number' => 'CIP-001',
                    'expiry_date' => now()->addMonths(6)->toDateString(),
                    'quantity' => 60,
                    'cost_price_cents' => 800,
                ],
            ],
        ], $this->user, $this->tenant->id);

        $batch = StockBatch::where('tenant_id', $this->tenant->id)->firstOrFail();
        $initialQty = $batch->quantity_remaining;
        $this->assertSame(60, $initialQty);

        $newExpiry = now()->addYears(2)->toDateString();
        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/batches/{$batch->id}";

        $response = $this->actingAs($this->user)
            ->put($url, [
                'batch_number' => 'CIP-001-EDITED',
                'expiry_date' => $newExpiry,
                'cost_price' => 9.50, // 950 cents
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $batch->refresh();
        $this->assertSame('CIP-001-EDITED', $batch->batch_number);
        $this->assertSame($newExpiry, $batch->expiry_date->toDateString());
        $this->assertSame(950, $batch->cost_price_cents);

        // Crucial requirement: Quantity must remain untouched
        $this->assertSame(60, $batch->quantity_remaining);
        $this->assertSame(60, $batch->quantity_received);

        // Audit log written
        $audit = AuditEvent::where('action', 'stock.batch_updated')
            ->where('resource_id', (string) $batch->id)
            ->first();

        $this->assertNotNull($audit);
        $this->assertSame('CIP-001', $audit->metadata['old']['batch_number']);
        $this->assertSame('CIP-001-EDITED', $audit->metadata['new']['batch_number']);
    }

    /**
     * 3. Void batch creates reversal movement and remaining becomes 0.
     */
    public function test_void_batch_creates_reversal_movement_and_remaining_becomes_zero(): void
    {
        $variant = $this->createVariant('Omeprazole', '20mg', 'Capsule');

        $this->stockService->receiveStock([
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'medicine_variant_id' => $variant->id,
                    'display_name' => 'Omeprazole 20mg Capsule',
                    'base_unit' => 'capsule',
                    'batch_number' => 'OME-WRONG',
                    'expiry_date' => now()->addYear()->toDateString(),
                    'quantity' => 75,
                    'cost_price_cents' => 300,
                ],
            ],
        ], $this->user, $this->tenant->id);

        $batch = StockBatch::where('tenant_id', $this->tenant->id)->firstOrFail();
        $this->assertSame(75, $batch->quantity_remaining);

        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/batches/{$batch->id}/void";

        $response = $this->actingAs($this->user)
            ->post($url, [
                'reason' => 'Accidentally keyed into wrong clinic account',
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $batch->refresh();
        $this->assertSame(0, $batch->quantity_remaining);
        $this->assertNotNull($batch->voided_at);
        $this->assertSame($this->user->id, $batch->voided_by);
        $this->assertSame('Accidentally keyed into wrong clinic account', $batch->void_reason);

        // Check reversal movement
        $voidMovement = StockMovement::where('stock_batch_id', $batch->id)
            ->where('type', StockMovement::TYPE_VOID)
            ->first();

        $this->assertNotNull($voidMovement);
        $this->assertSame(-75, $voidMovement->quantity);
        $this->assertSame('Accidentally keyed into wrong clinic account', $voidMovement->reason);

        // Check audit event
        $audit = AuditEvent::where('action', 'stock.batch_voided')
            ->where('resource_id', (string) $batch->id)
            ->first();

        $this->assertNotNull($audit);
    }

    /**
     * 4. Void batch is blocked when dispense movement exists.
     */
    public function test_void_batch_blocked_when_dispense_movement_exists(): void
    {
        $variant = $this->createVariant('Metformin', '500mg', 'Tablet');

        $this->stockService->receiveStock([
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'medicine_variant_id' => $variant->id,
                    'display_name' => 'Metformin 500mg Tablet',
                    'base_unit' => 'tablet',
                    'batch_number' => 'MET-DISPENSED',
                    'expiry_date' => now()->addYear()->toDateString(),
                    'quantity' => 100,
                    'cost_price_cents' => 200,
                ],
            ],
        ], $this->user, $this->tenant->id);

        $batch = StockBatch::where('tenant_id', $this->tenant->id)->firstOrFail();

        // Simulate a dispense movement of 10 units
        StockMovement::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $batch->clinic_medicine_id,
            'stock_batch_id' => $batch->id,
            'type' => StockMovement::TYPE_DISPENSE,
            'quantity' => -10,
            'user_id' => $this->user->id,
            'reason' => 'Dispensed to patient RX-001',
        ]);
        $batch->decrement('quantity_remaining', 10);
        $this->assertSame(90, $batch->fresh()->quantity_remaining);

        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/batches/{$batch->id}/void";

        $response = $this->actingAs($this->user)
            ->post($url, [
                'reason' => 'Want to void despite dispensing',
            ]);

        $response->assertSessionHasErrors(['reason']);

        $batch->refresh();
        $this->assertNull($batch->voided_at);
        $this->assertSame(90, $batch->quantity_remaining);
    }

    /**
     * 5. Void GRN reverses all batches.
     */
    public function test_void_grn_reverses_all_batches(): void
    {
        $v1 = $this->createVariant('Cetirizine', '10mg', 'Tablet');
        $v2 = $this->createVariant('Loratadine', '10mg', 'Tablet');

        $supplier = Supplier::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Main Pharma Ltd',
            'is_active' => true,
        ]);

        $receipt = $this->stockService->receiveStock([
            'supplier_id' => $supplier->id,
            'invoice_number' => 'INV-GRN-999',
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'medicine_variant_id' => $v1->id,
                    'display_name' => 'Cetirizine 10mg Tablet',
                    'base_unit' => 'tablet',
                    'batch_number' => 'CET-B1',
                    'expiry_date' => now()->addYear()->toDateString(),
                    'quantity' => 50,
                    'cost_price_cents' => 150,
                ],
                [
                    'medicine_variant_id' => $v2->id,
                    'display_name' => 'Loratadine 10mg Tablet',
                    'base_unit' => 'tablet',
                    'batch_number' => 'LOR-B1',
                    'expiry_date' => now()->addYears(2)->toDateString(),
                    'quantity' => 30,
                    'cost_price_cents' => 200,
                ],
            ],
        ], $this->user, $this->tenant->id);

        $this->assertSame(StockReceipt::STATUS_RECEIVED, $receipt->status);

        $batches = StockBatch::where('stock_receipt_id', $receipt->id)->get();
        $this->assertCount(2, $batches);

        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/receipts/{$receipt->id}/void";

        $response = $this->actingAs($this->user)
            ->post($url, [
                'reason' => 'Vendor sent incorrect shipment completely',
            ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $receipt->refresh();
        $this->assertSame(StockReceipt::STATUS_VOIDED, $receipt->status);
        $this->assertNotNull($receipt->voided_at);
        $this->assertSame($this->user->id, $receipt->voided_by);
        $this->assertSame('Vendor sent incorrect shipment completely', $receipt->void_reason);

        // Assert all batches are reversed
        foreach ($batches as $b) {
            $b->refresh();
            $this->assertSame(0, $b->quantity_remaining);
            $this->assertNotNull($b->voided_at);
            $this->assertStringContainsString('Vendor sent incorrect shipment completely', $b->void_reason);

            $reversal = StockMovement::where('stock_batch_id', $b->id)
                ->where('type', StockMovement::TYPE_VOID)
                ->first();
            $this->assertNotNull($reversal);
            $this->assertSame(-$b->quantity_received, $reversal->quantity);
        }

        // Audit log written
        $audit = AuditEvent::where('action', 'stock.receipt_voided')
            ->where('resource_id', (string) $receipt->id)
            ->first();

        $this->assertNotNull($audit);
    }

    /**
     * Void GRN blocked when any batch has dispense movements.
     */
    public function test_void_grn_blocked_when_any_batch_has_dispense_movement(): void
    {
        $v1 = $this->createVariant('Ibuprofen', '400mg', 'Tablet');

        $receipt = $this->stockService->receiveStock([
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'medicine_variant_id' => $v1->id,
                    'display_name' => 'Ibuprofen 400mg Tablet',
                    'base_unit' => 'tablet',
                    'batch_number' => 'IBU-B1',
                    'expiry_date' => now()->addYear()->toDateString(),
                    'quantity' => 100,
                    'cost_price_cents' => 300,
                ],
            ],
        ], $this->user, $this->tenant->id);

        $batch = StockBatch::where('stock_receipt_id', $receipt->id)->firstOrFail();

        // Dispense from this batch
        StockMovement::create([
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $batch->clinic_medicine_id,
            'stock_batch_id' => $batch->id,
            'type' => StockMovement::TYPE_DISPENSE,
            'quantity' => -5,
            'user_id' => $this->user->id,
            'reason' => 'Dispense test',
        ]);
        $batch->decrement('quantity_remaining', 5);

        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/receipts/{$receipt->id}/void";

        $response = $this->actingAs($this->user)
            ->post($url, [
                'reason' => 'Attempt to void',
            ]);

        $response->assertSessionHasErrors(['reason']);

        $receipt->refresh();
        $this->assertSame(StockReceipt::STATUS_RECEIVED, $receipt->status);
        $this->assertNull($receipt->voided_at);
    }

    /**
     * 6. Remove clinic medicine blocked when movements exist, and allowed when no movements exist.
     */
    public function test_remove_clinic_medicine_blocked_when_movements_exist_and_allowed_when_no_movements(): void
    {
        $v1 = $this->createVariant('Azithromycin', '500mg', 'Tablet');
        $v2 = $this->createVariant('Folic Acid', '5mg', 'Tablet');

        // Med 1: With stock receipts / movements
        $this->stockService->receiveStock([
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'medicine_variant_id' => $v1->id,
                    'display_name' => 'Azithromycin 500mg Tablet',
                    'base_unit' => 'tablet',
                    'batch_number' => 'AZI-001',
                    'expiry_date' => now()->addYear()->toDateString(),
                    'quantity' => 20,
                    'cost_price_cents' => 1500,
                ],
            ],
        ], $this->user, $this->tenant->id);

        $medWithStock = ClinicMedicine::where('tenant_id', $this->tenant->id)
            ->where('medicine_variant_id', $v1->id)
            ->firstOrFail();

        // Med 2: Added by mistake, no movements or batches
        $cleanMed = ClinicMedicine::create([
            'tenant_id' => $this->tenant->id,
            'medicine_variant_id' => $v2->id,
            'display_name' => 'Folic Acid 5mg Tablet',
            'base_unit' => 'tablet',
            'selling_price_cents' => 100,
            'is_active' => true,
        ]);

        // Attempt to delete Med 1 (must be blocked)
        $url1 = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$medWithStock->id}";
        $response1 = $this->actingAs($this->user)->delete($url1);

        $response1->assertSessionHasErrors(['error']);
        $this->assertDatabaseHas('clinic_medicines', ['id' => $medWithStock->id]);

        // Attempt to delete Med 2 (must succeed)
        $url2 = "http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/medicines/{$cleanMed->id}";
        $response2 = $this->actingAs($this->user)->delete($url2);

        $response2->assertSessionHasNoErrors();
        $response2->assertRedirect(route('tenant.pharmacy.medicines'));

        $this->assertDatabaseMissing('clinic_medicines', ['id' => $cleanMed->id]);

        // Audit log written
        $audit = AuditEvent::where('action', 'stock.medicine_deleted')
            ->where('metadata->medicine_id', $cleanMed->id)
            ->first();

        $this->assertNotNull($audit);
    }
}
