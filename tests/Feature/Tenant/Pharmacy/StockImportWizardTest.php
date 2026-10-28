<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant\Pharmacy;

use App\Models\ClinicMedicine;
use App\Models\Medicine;
use App\Models\MedicineVariant;
use App\Models\StockBatch;
use App\Models\StockReceipt;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Pharmacy\StockImportService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class StockImportWizardTest extends TestCase
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
            'id' => 'suwasetha',
            'name' => 'Suwasetha Clinic',
            'subdomain' => 'suwasetha',
            'pharmacy_enabled' => true,
        ]);

        $this->tenantB = Tenant::factory()->active()->create([
            'id' => 'healthex',
            'name' => 'HealthEx Clinic',
            'subdomain' => 'healthex',
            'pharmacy_enabled' => true,
        ]);

        $this->userA = User::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'email' => 'pharmacistA@suwasetha.lk',
        ]);

        $this->userB = User::factory()->create([
            'tenant_id' => $this->tenantB->id,
            'email' => 'pharmacistB@healthex.lk',
        ]);

        Permission::firstOrCreate(['name' => 'pharmacy.import', 'guard_name' => 'web']);
        $this->userA->givePermissionTo('pharmacy.import');
        $this->userB->givePermissionTo('pharmacy.import');
    }

    public function test_date_parsing_strictly_prioritizes_dd_mm_and_handles_all_formats(): void
    {
        // 1. "05/06/2027" must be 5 June 2027, NEVER US 6 May
        $parsed1 = StockImportService::parseSriLankanDate('05/06/2027');
        $this->assertEquals('2027-06-05', $parsed1);

        // 2. "2026-12-25" (ISO)
        $parsed2 = StockImportService::parseSriLankanDate('2026-12-25');
        $this->assertEquals('2026-12-25', $parsed2);

        // 3. "25/12/2026" (Slash DD/MM/YYYY)
        $parsed3 = StockImportService::parseSriLankanDate('25/12/2026');
        $this->assertEquals('2026-12-25', $parsed3);

        // 4. "25.12.2026" (Dot DD.MM.YYYY)
        $parsed4 = StockImportService::parseSriLankanDate('25.12.2026');
        $this->assertEquals('2026-12-25', $parsed4);

        // 5. Excel serial integer (e.g. 46543 = 2027-06-05)
        $excelSerial = (int) Carbon::create(1899, 12, 30)->diffInDays(Carbon::parse('2027-06-05'));
        $parsed5 = StockImportService::parseSriLankanDate((string) $excelSerial);
        $this->assertEquals('2027-06-05', $parsed5);
    }

    public function test_header_synonyms_are_auto_detected(): void
    {
        $headers = ['Drug Name', 'Dose', 'Form', 'Batch No', 'Exp Date', 'Qty', 'Unit Cost', 'Sell Price'];
        $service = app(StockImportService::class);
        $mapping = $service->autoMapHeaders($headers);

        $this->assertEquals('Drug Name', $mapping['generic_name']);
        $this->assertEquals('Dose', $mapping['strength']);
        $this->assertEquals('Form', $mapping['dosage_form']);
        $this->assertEquals('Batch No', $mapping['batch_number']);
        $this->assertEquals('Exp Date', $mapping['expiry_date']);
        $this->assertEquals('Qty', $mapping['quantity']);
        $this->assertEquals('Unit Cost', $mapping['cost_price']);
        $this->assertEquals('Sell Price', $mapping['selling_price']);
    }

    public function test_matching_existing_medicine_adds_batches_without_duplicating_medicine(): void
    {
        // 1. Create an existing clinic medicine
        $med = Medicine::create([
            'generic_name' => 'Amoxicillin',
            'normalized_name' => 'amoxicillin',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $variant = MedicineVariant::create([
            'medicine_id' => $med->id,
            'strength_text' => '500 mg',
            'dosage_form' => 'Capsule',
            'status' => 'approved',
        ]);

        $existingClinicMed = ClinicMedicine::create([
            'tenant_id' => $this->tenantA->id,
            'medicine_variant_id' => $variant->id,
            'display_name' => 'Amoxicillin 500 mg Capsule',
            'base_unit' => 'capsule',
            'selling_price_cents' => 3000,
            'is_active' => true,
        ]);

        // 2. Upload CSV with 2 rows matching this exact medicine with different batches
        $csvContent = implode("\n", [
            'generic_name,strength,dosage_form,quantity,batch_number,expiry_date,cost_price,selling_price,supplier_name,invoice_number',
            'Amoxicillin,500 mg,Capsule,50,AMX-001,2027-08-15,15.00,30.00,SPMC,INV-AMX-1',
            'Amoxicillin,500 mg,Capsule,75,AMX-002,2027-11-20,15.00,30.00,SPMC,INV-AMX-1',
        ]);

        $file = UploadedFile::fake()->createWithContent('amox_import.csv', $csvContent);

        $previewResponse = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/import/preview", [
                'file' => $file,
            ]);

        $previewResponse->assertOk();
        $previewData = $previewResponse->json();
        $this->assertEquals(2, $previewData['valid_count']);
        $this->assertEquals(2, $previewData['existing_medicines_count']);
        $this->assertEquals(0, $previewData['new_medicines_count']);

        // 3. Confirm import
        $confirmResponse = $this->actingAs($this->userA)
            ->postJson("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/import/confirm", [
                'rows' => $previewData['preview'],
            ]);

        $confirmResponse->assertOk();
        $result = $confirmResponse->json();
        $this->assertTrue($result['success']);
        $this->assertEquals(0, $result['created_medicines']); // No new medicines created!
        $this->assertEquals(2, $result['created_batches']); // 2 batches added!

        // Confirm DB has exactly 1 ClinicMedicine and 2 StockBatches
        $this->assertEquals(1, ClinicMedicine::where('tenant_id', $this->tenantA->id)->count());
        $this->assertEquals(2, StockBatch::where('tenant_id', $this->tenantA->id)->where('clinic_medicine_id', $existingClinicMed->id)->count());
    }

    public function test_past_expiry_date_is_rejected(): void
    {
        $csvContent = implode("\n", [
            'generic_name,strength,quantity,batch_number,expiry_date',
            'Ciprofloxacin,500 mg,100,B999,2020-01-01',
        ]);

        $file = UploadedFile::fake()->createWithContent('expired.csv', $csvContent);

        $previewResponse = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/import/preview", [
                'file' => $file,
            ]);

        $previewResponse->assertOk();
        $previewData = $previewResponse->json();
        $this->assertEquals(1, $previewData['error_count']);
        $this->assertEquals('error', $previewData['preview'][0]['status']);
        $this->assertStringContainsString('Expiry date must be in the future', $previewData['preview'][0]['errors'][0]);
    }

    public function test_duplicate_file_and_duplicate_invoice_warnings(): void
    {
        // 1. Create an existing StockReceipt with invoice 'INV-DUP-100'
        StockReceipt::create([
            'tenant_id' => $this->tenantA->id,
            'receipt_number' => 'GRN-2026-000001',
            'status' => 'received',
            'invoice_number' => 'INV-DUP-100',
            'received_date' => '2026-10-01',
            'total_cost_cents' => 10000,
            'created_by' => $this->userA->id,
        ]);

        $csvContent = implode("\n", [
            'generic_name,strength,quantity,batch_number,expiry_date,supplier_name,invoice_number',
            'Ibuprofen,400 mg,50,IBU-1,2027-10-10,GSK,INV-DUP-100',
        ]);

        $file = UploadedFile::fake()->createWithContent('dup_test.csv', $csvContent);

        $previewResponse = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/import/preview", [
                'file' => $file,
            ]);

        $previewResponse->assertOk();
        $previewData = $previewResponse->json();

        // Must warn about existing invoice
        $this->assertContains('INV-DUP-100', $previewData['duplicate_invoices']);
        $this->assertNotEmpty($previewData['preview'][0]['warnings']);
        $this->assertStringContainsString('Invoice #INV-DUP-100 was already imported', $previewData['preview'][0]['warnings'][0]);

        // First import creates an AuditEvent
        $confirmResponse = $this->actingAs($this->userA)
            ->postJson("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/import/confirm", [
                'rows' => $previewData['preview'],
                'file_hash' => $previewData['file_hash'],
                'file_name' => 'dup_test.csv',
            ]);
        $confirmResponse->assertOk();

        // 2. Re-preview the exact same file -> must detect duplicate file hash
        $file2 = UploadedFile::fake()->createWithContent('dup_test.csv', $csvContent);
        $preview2 = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/import/preview", [
                'file' => $file2,
            ]);
        $preview2->assertOk();
        $this->assertTrue($preview2->json('is_duplicate_file'));
        $this->assertNotNull($preview2->json('duplicate_file_info'));
    }

    public function test_partial_import_skips_errors_and_imports_valid_rows(): void
    {
        $csvContent = implode("\n", [
            'generic_name,strength,quantity,batch_number,expiry_date',
            'Cetirizine,10 mg,100,CET-01,2027-12-31',
            'BadDrug,,0,B02,invalid_date', // row with errors
        ]);

        $file = UploadedFile::fake()->createWithContent('partial.csv', $csvContent);

        $previewResponse = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/import/preview", [
                'file' => $file,
            ]);

        $previewResponse->assertOk();
        $previewData = $previewResponse->json();
        $this->assertEquals(1, $previewData['valid_count']);
        $this->assertEquals(1, $previewData['error_count']);

        // User chooses to skip rows with errors and imports only valid rows
        $validOnly = array_values(array_filter($previewData['preview'], fn ($r) => $r['status'] !== 'error'));
        $confirmResponse = $this->actingAs($this->userA)
            ->postJson("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/import/confirm", [
                'rows' => $validOnly,
            ]);

        $confirmResponse->assertOk();
        $this->assertEquals(1, StockBatch::where('tenant_id', $this->tenantA->id)->count());
    }

    public function test_transaction_rolls_back_atomically_on_failure(): void
    {
        $rows = [
            [
                'status' => 'new_medicine',
                'data' => [
                    'generic_name' => 'Salbutamol',
                    'strength' => '2 mg',
                    'dosage_form' => 'Tablet',
                    'batch_number' => 'SAL-01',
                    'expiry_date' => '2027-12-31',
                    'quantity' => 100,
                    'base_unit' => 'tablet',
                    'cost_price_cents' => 500,
                    'selling_price_cents' => 800,
                    'supplier_name' => 'Test Supplier',
                    'invoice_number' => 'INV-FAIL-1',
                ],
            ],
            [
                'status' => 'new_medicine',
                'data' => [
                    'generic_name' => 'Salbutamol',
                    'strength' => '2 mg',
                    'dosage_form' => 'Tablet',
                    'batch_number' => 'SAL-02',
                    'expiry_date' => 'invalid_unparseable_date_xyz', // triggers exception inside transaction
                    'quantity' => 100,
                    'base_unit' => 'tablet',
                    'cost_price_cents' => 500,
                    'selling_price_cents' => 800,
                    'supplier_name' => 'Test Supplier',
                    'invoice_number' => 'INV-FAIL-1',
                ],
            ],
        ];

        $initialBatches = StockBatch::where('tenant_id', $this->tenantA->id)->count();

        $response = $this->actingAs($this->userA)
            ->postJson("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/import/confirm", [
                'rows' => $rows,
            ]);

        $response->assertStatus(422);

        // Entire transaction must have rolled back: 0 stock batches created!
        $this->assertEquals($initialBatches, StockBatch::where('tenant_id', $this->tenantA->id)->count());
    }

    public function test_two_thousand_row_limit_is_enforced(): void
    {
        $lines = ['generic_name,strength,quantity,batch_number,expiry_date'];
        for ($i = 1; $i <= 2005; $i++) {
            $lines[] = "Drug{$i},10 mg,10,B{$i},2027-12-31";
        }
        $csvContent = implode("\n", $lines);

        $file = UploadedFile::fake()->createWithContent('big_file.csv', $csvContent);

        $previewResponse = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/import/preview", [
                'file' => $file,
            ]);

        $previewResponse->assertOk();
        $this->assertLessThanOrEqual(2000, $previewResponse->json('total_rows'));
    }

    public function test_tenant_isolation_is_strictly_enforced(): void
    {
        // Tenant A imports stock
        $csvContent = implode("\n", [
            'generic_name,strength,quantity,batch_number,expiry_date,supplier_name,invoice_number',
            'Omeprazole,20 mg,100,OME-01,2027-12-31,Supplier A,INV-ISO-1',
        ]);

        $file = UploadedFile::fake()->createWithContent('tenantA.csv', $csvContent);

        $previewResponse = $this->actingAs($this->userA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/import/preview", [
                'file' => $file,
            ]);

        $this->actingAs($this->userA)
            ->postJson("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/import/confirm", [
                'rows' => $previewResponse->json('preview'),
            ]);

        // Tenant A has 1 batch, Tenant B has 0
        $this->assertEquals(1, StockBatch::where('tenant_id', $this->tenantA->id)->count());
        $this->assertEquals(0, StockBatch::where('tenant_id', $this->tenantB->id)->count());

        // Tenant B's history endpoint returns 0 records
        $historyB = $this->actingAs($this->userB)
            ->getJson("http://{$this->tenantB->subdomain}.{$this->baseDomain}/pharmacy/import/history");

        $historyB->assertOk();
        $this->assertCount(0, $historyB->json('history'));

        // Tenant A's history endpoint returns 1 record
        $historyA = $this->actingAs($this->userA)
            ->getJson("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/import/history");

        $historyA->assertOk();
        $this->assertCount(1, $historyA->json('history'));
    }
}
