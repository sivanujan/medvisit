<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant\Pharmacy;

use App\Models\AuditEvent;
use App\Models\ClinicMedicine;
use App\Models\Medicine;
use App\Models\MedicineBrand;
use App\Models\MedicineVariant;
use App\Models\StockMovement;
use App\Models\StockReceipt;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Pharmacy\StockService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use InvalidArgumentException;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class StockReceiptsListAndVoidTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;

    protected Tenant $tenantB;

    protected User $userA;

    protected User $userB;

    protected string $baseDomain;

    protected ClinicMedicine $medicine;

    protected Supplier $supplier;

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

        foreach (['pharmacy.view', 'pharmacy.receive_stock', 'pharmacy.adjust_stock', 'pharmacy.manage_medicines'] as $perm) {
            Permission::findOrCreate($perm, 'web');
        }

        $this->userA->givePermissionTo(['pharmacy.view', 'pharmacy.receive_stock', 'pharmacy.adjust_stock']);
        $this->userB->givePermissionTo(['pharmacy.view', 'pharmacy.receive_stock', 'pharmacy.adjust_stock']);

        $med = Medicine::create([
            'generic_name' => 'Paracetamol',
            'therapeutic_class' => 'Analgesic',
            'schedule' => 'OTC',
            'is_common' => true,
        ]);

        $var = MedicineVariant::create([
            'medicine_id' => $med->id,
            'strength_text' => '500mg',
            'dosage_form' => 'tablet',
            'route' => 'oral',
            'display_name' => '500mg tablet',
        ]);

        $brand = MedicineBrand::create([
            'medicine_variant_id' => $var->id,
            'brand_name' => 'Panadol',
            'manufacturer' => 'GSK',
            'status' => MedicineBrand::STATUS_APPROVED,
        ]);

        $this->medicine = ClinicMedicine::create([
            'tenant_id' => $this->tenantA->id,
            'medicine_variant_id' => $var->id,
            'medicine_brand_id' => $brand->id,
            'display_name' => 'Panadol 500mg Tablet',
            'base_unit' => 'tablet',
            'selling_price_cents' => 1500,
            'is_active' => true,
        ]);

        $this->supplier = Supplier::create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'State Pharmaceuticals',
            'phone' => '+94112345678',
            'is_active' => true,
        ]);
    }

    protected function tenantUrl(Tenant $tenant, string $path): string
    {
        return "http://{$tenant->subdomain}.{$this->baseDomain}{$path}";
    }

    public function test_search_by_batch_number_and_invoice_number(): void
    {
        $stockService = app(StockService::class);

        $receipt1 = $stockService->receiveStock([
            'supplier_id' => $this->supplier->id,
            'invoice_number' => 'INV-OCT-9901',
            'received_date' => now()->toDateString(),
            'notes' => 'Batch search test',
            'items' => [
                [
                    'clinic_medicine_id' => $this->medicine->id,
                    'batch_number' => 'BATCH-ALPHA-777',
                    'expiry_date' => now()->addYear()->toDateString(),
                    'quantity' => 100,
                    'cost_price_cents' => 800,
                ],
            ],
        ], $this->userA, $this->tenantA->id);

        $receipt2 = $stockService->receiveStock([
            'supplier_id' => $this->supplier->id,
            'invoice_number' => 'INV-OCT-9902',
            'received_date' => now()->toDateString(),
            'notes' => 'Second test',
            'items' => [
                [
                    'clinic_medicine_id' => $this->medicine->id,
                    'batch_number' => 'BATCH-BETA-888',
                    'expiry_date' => now()->addYear()->toDateString(),
                    'quantity' => 50,
                    'cost_price_cents' => 900,
                ],
            ],
        ], $this->userA, $this->tenantA->id);

        // Search by batch number
        $response = $this->actingAs($this->userA)
            ->get($this->tenantUrl($this->tenantA, '/pharmacy/receipts?search=ALPHA-777'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Tenant/Pharmacy/Receipts/Index')
            ->has('receipts.data', 1)
            ->where('receipts.data.0.receipt_number', $receipt1->receipt_number)
        );

        // Search by invoice number
        $response = $this->actingAs($this->userA)
            ->get($this->tenantUrl($this->tenantA, '/pharmacy/receipts?search=INV-OCT-9902'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Tenant/Pharmacy/Receipts/Index')
            ->has('receipts.data', 1)
            ->where('receipts.data.0.receipt_number', $receipt2->receipt_number)
        );
    }

    public function test_totals_and_summary_stats_match_receipt_rows(): void
    {
        $stockService = app(StockService::class);

        $stockService->receiveStock([
            'supplier_id' => $this->supplier->id,
            'invoice_number' => 'INV-TOT-01',
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'clinic_medicine_id' => $this->medicine->id,
                    'batch_number' => 'BATCH-T1',
                    'expiry_date' => now()->addYear()->toDateString(),
                    'quantity' => 100,
                    'free_quantity' => 10,
                    'cost_price_cents' => 500, // 100 * 500 = 50,000 cents
                ],
            ],
        ], $this->userA, $this->tenantA->id);

        $stockService->receiveStock([
            'supplier_id' => $this->supplier->id,
            'invoice_number' => 'INV-TOT-02',
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'clinic_medicine_id' => $this->medicine->id,
                    'batch_number' => 'BATCH-T2',
                    'expiry_date' => now()->addYear()->toDateString(),
                    'quantity' => 50,
                    'cost_price_cents' => 1000, // 50 * 1000 = 50,000 cents
                ],
            ],
        ], $this->userA, $this->tenantA->id);

        $response = $this->actingAs($this->userA)
            ->get($this->tenantUrl($this->tenantA, '/pharmacy/receipts'));

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Tenant/Pharmacy/Receipts/Index')
            ->where('stats.grns_count', 2)
            ->where('stats.total_cost_cents', 100000)
            ->where('stats.units_received', 160) // 110 + 50
            ->where('stats.suppliers_count', 1)
            ->where('tabCounts.all', 2)
            ->where('tabCounts.received', 2)
            ->where('tabCounts.voided', 0)
        );
    }

    public function test_void_blocked_when_units_were_consumed_or_dispensed(): void
    {
        $stockService = app(StockService::class);

        $receipt = $stockService->receiveStock([
            'supplier_id' => $this->supplier->id,
            'invoice_number' => 'INV-DISP-01',
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'clinic_medicine_id' => $this->medicine->id,
                    'batch_number' => 'BATCH-DISP-01',
                    'expiry_date' => now()->addYear()->toDateString(),
                    'quantity' => 100,
                    'cost_price_cents' => 500,
                ],
            ],
        ], $this->userA, $this->tenantA->id);

        $batch = $receipt->batches()->first();

        // Dispense 20 units from this batch
        $batch->decrement('quantity_remaining', 20);
        StockMovement::create([
            'tenant_id' => $this->tenantA->id,
            'clinic_medicine_id' => $this->medicine->id,
            'stock_batch_id' => $batch->id,
            'type' => StockMovement::TYPE_DISPENSE,
            'quantity' => -20,
            'reason' => 'Dispensed to patient',
            'user_id' => $this->userA->id,
            'created_at' => now(),
        ]);

        // Details drawer endpoint show should report can_void = false
        $showResponse = $this->actingAs($this->userA)
            ->getJson($this->tenantUrl($this->tenantA, "/pharmacy/receipts/{$receipt->id}"));

        $showResponse->assertOk()
            ->assertJson([
                'receipt' => [
                    'can_void' => false,
                    'has_dispense' => true,
                    'total_consumed_units' => 20,
                ],
            ]);

        // Attempting to void should throw InvalidArgumentException and redirect back with error
        $voidResponse = $this->actingAs($this->userA)
            ->from($this->tenantUrl($this->tenantA, '/pharmacy/receipts'))
            ->post($this->tenantUrl($this->tenantA, "/pharmacy/receipts/{$receipt->id}/void"), [
                'reason' => 'Defective packaging',
            ]);

        $voidResponse->assertRedirect($this->tenantUrl($this->tenantA, '/pharmacy/receipts'));
        $voidResponse->assertSessionHasErrors(['reason']);

        $receipt->refresh();
        $this->assertEquals(StockReceipt::STATUS_RECEIVED, $receipt->status);
    }

    public function test_void_reverses_stock_movements_atomically_when_unconsumed(): void
    {
        $stockService = app(StockService::class);

        $receipt = $stockService->receiveStock([
            'supplier_id' => $this->supplier->id,
            'invoice_number' => 'INV-VOID-01',
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'clinic_medicine_id' => $this->medicine->id,
                    'batch_number' => 'BATCH-VOID-01',
                    'expiry_date' => now()->addYear()->toDateString(),
                    'quantity' => 150,
                    'cost_price_cents' => 500,
                ],
            ],
        ], $this->userA, $this->tenantA->id);

        $batch = $receipt->batches()->first();
        $this->assertEquals(150, $batch->quantity_remaining);

        // Check show allows voiding
        $showResponse = $this->actingAs($this->userA)
            ->getJson($this->tenantUrl($this->tenantA, "/pharmacy/receipts/{$receipt->id}"));

        $showResponse->assertOk()
            ->assertJson([
                'receipt' => [
                    'can_void' => true,
                    'total_consumed_units' => 0,
                ],
            ]);

        // Void the receipt
        $voidResponse = $this->actingAs($this->userA)
            ->from($this->tenantUrl($this->tenantA, '/pharmacy/receipts'))
            ->post($this->tenantUrl($this->tenantA, "/pharmacy/receipts/{$receipt->id}/void"), [
                'reason' => 'Supplier recalled batch',
            ]);

        $voidResponse->assertRedirect($this->tenantUrl($this->tenantA, '/pharmacy/receipts'));
        $voidResponse->assertSessionHas('success');

        $receipt->refresh();
        $batch->refresh();

        $this->assertEquals(StockReceipt::STATUS_VOIDED, $receipt->status);
        $this->assertNotNull($receipt->voided_at);
        $this->assertEquals($this->userA->id, $receipt->voided_by);
        $this->assertEquals('Supplier recalled batch', $receipt->void_reason);
        $this->assertEquals(0, $batch->quantity_remaining);

        // Reversal stock movement created
        $movement = StockMovement::where('stock_batch_id', $batch->id)
            ->where('type', StockMovement::TYPE_VOID)
            ->first();

        $this->assertNotNull($movement);
        $this->assertEquals(-150, $movement->quantity);
    }

    public function test_export_csv_with_permission_and_audit_logging(): void
    {
        $stockService = app(StockService::class);

        $stockService->receiveStock([
            'supplier_id' => $this->supplier->id,
            'invoice_number' => 'INV-EXP-01',
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'clinic_medicine_id' => $this->medicine->id,
                    'batch_number' => 'BATCH-EXP-01',
                    'expiry_date' => now()->addYear()->toDateString(),
                    'quantity' => 100,
                    'cost_price_cents' => 500,
                ],
            ],
        ], $this->userA, $this->tenantA->id);

        $response = $this->actingAs($this->userA)
            ->get($this->tenantUrl($this->tenantA, '/pharmacy/receipts-export'));

        $response->assertOk();
        $this->assertEquals('text/csv; charset=UTF-8', $response->headers->get('content-type'));

        // Verify audit log created
        $log = AuditEvent::where('tenant_id', $this->tenantA->id)
            ->where('action', 'stock.receipts_exported')
            ->first();

        $this->assertNotNull($log);
        $this->assertEquals($this->userA->id, $log->user_id);
    }

    public function test_tenant_isolation_prevents_viewing_or_voiding_other_clinic_receipts(): void
    {
        $stockService = app(StockService::class);

        $receiptA = $stockService->receiveStock([
            'supplier_id' => $this->supplier->id,
            'invoice_number' => 'INV-ALPHA-ISO',
            'received_date' => now()->toDateString(),
            'items' => [
                [
                    'clinic_medicine_id' => $this->medicine->id,
                    'batch_number' => 'BATCH-ALPHA-ISO',
                    'expiry_date' => now()->addYear()->toDateString(),
                    'quantity' => 100,
                    'cost_price_cents' => 500,
                ],
            ],
        ], $this->userA, $this->tenantA->id);

        // User B from Tenant B cannot view receipt A in receipts index
        $indexResponse = $this->actingAs($this->userB)
            ->get($this->tenantUrl($this->tenantB, '/pharmacy/receipts'));

        $indexResponse->assertOk();
        $indexResponse->assertInertia(fn ($page) => $page
            ->component('Tenant/Pharmacy/Receipts/Index')
            ->has('receipts.data', 0)
        );

        // User B cannot view details of receipt A
        $showResponse = $this->actingAs($this->userB)
            ->getJson($this->tenantUrl($this->tenantB, "/pharmacy/receipts/{$receiptA->id}"));

        $showResponse->assertNotFound();

        // User B cannot void receipt A
        $voidResponse = $this->actingAs($this->userB)
            ->post($this->tenantUrl($this->tenantB, "/pharmacy/receipts/{$receiptA->id}/void"), [
                'reason' => 'Malicious void attempt',
            ]);

        $voidResponse->assertNotFound();
    }
}
