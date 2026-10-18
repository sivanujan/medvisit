<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant\Pharmacy;

use App\Models\ClinicMedicine;
use App\Models\Medicine;
use App\Models\MedicineVariant;
use App\Models\StockBatch;
use App\Models\StockMovement;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class StockImportTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $user;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Clinic',
            'subdomain' => 'suwasetha',
            'pharmacy_enabled' => true,
        ]);

        $this->user = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'pharmacist@suwasetha.lk',
        ]);

        Permission::firstOrCreate(['name' => 'pharmacy.import', 'guard_name' => 'web']);
        $this->user->givePermissionTo('pharmacy.import');
    }

    public function test_csv_import_preview_matching_and_confirm_creates_grn_and_batches(): void
    {
        // 1. Seed approved catalog medicine
        $med = Medicine::create([
            'generic_name' => 'Paracetamol',
            'normalized_name' => 'paracetamol',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        MedicineVariant::create([
            'medicine_id' => $med->id,
            'strength_text' => '500mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        // 2. Prepare sample CSV with 3 rows: matched, new_medicine, and error
        $csvContent = implode("\n", [
            'generic_name,strength,dosage_form,brand_name,quantity,cost_price,selling_price,batch_number,expiry_date,supplier_name',
            'Paracetamol,500mg,Tablet,Panadol,100,2.50,3.50,BATCH-P01,2027-12-31,Astron',
            'NovelAntibiotic,250mg,Capsule,Novacillin,50,15.00,20.00,BATCH-N01,2027-06-30,Hemas',
            ',,,, -10, -5.00,,,', // invalid error row
        ]);

        $file = UploadedFile::fake()->createWithContent('stock.csv', $csvContent);

        // Test Preview endpoint
        $previewResponse = $this->actingAs($this->user)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/import/preview", [
                'file' => $file,
            ]);

        $previewResponse->assertStatus(200);
        $previewResponse->assertJson([
            'success' => true,
            'total_rows' => 3,
            'valid_count' => 2,
            'error_count' => 1,
        ]);

        $previewRows = $previewResponse->json('preview');
        $this->assertCount(3, $previewRows);
        $this->assertEquals('matched', $previewRows[0]['status']);
        $this->assertEquals('new_medicine', $previewRows[1]['status']);
        $this->assertEquals('error', $previewRows[2]['status']);

        // Test Confirm endpoint with the 2 valid rows
        $validRows = array_filter($previewRows, fn ($r) => $r['status'] !== 'error');

        $confirmResponse = $this->actingAs($this->user)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/import/confirm", [
                'rows' => array_values($validRows),
            ]);

        $confirmResponse->assertRedirect(route('tenant.pharmacy.medicines'));

        // Assert GRN receipt, clinic medicines, and batches were created in database
        $this->assertDatabaseHas('stock_receipts', [
            'tenant_id' => $this->tenant->id,
            'receipt_number' => 'GRN-000001',
        ]);

        $this->assertDatabaseHas('stock_batches', [
            'tenant_id' => $this->tenant->id,
            'batch_number' => 'BATCH-P01',
            'quantity_remaining' => 100,
        ]);

        $this->assertDatabaseHas('stock_batches', [
            'tenant_id' => $this->tenant->id,
            'batch_number' => 'BATCH-N01',
            'quantity_remaining' => 50,
        ]);
    }

    public function test_csv_import_with_multiple_batches_of_same_medicine(): void
    {
        $med = Medicine::create([
            'generic_name' => 'Metformin Hydrochloride',
            'normalized_name' => 'metformin hydrochloride',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        MedicineVariant::create([
            'medicine_id' => $med->id,
            'strength_text' => '850mg',
            'dosage_form' => 'Tablet',
            'status' => 'approved',
        ]);

        $csvContent = implode("\n", [
            'generic_name,strength,dosage_form,brand_name,quantity,cost_price,selling_price,batch_number,expiry_date,supplier_name,invoice_number',
            'Metformin Hydrochloride,850mg,Tablet,,30,12.00,18.00,B001,2027-12-25,Astron,INV-001',
            'Metformin Hydrochloride,850mg,Tablet,,20,12.00,18.00,B002,2028-06-30,Astron,INV-001',
        ]);

        $file = UploadedFile::fake()->createWithContent('metformin_batches.csv', $csvContent);

        $previewResponse = $this->actingAs($this->user)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/import/preview", [
                'file' => $file,
            ]);

        $previewResponse->assertStatus(200);
        $previewResponse->assertJson([
            'success' => true,
            'total_rows' => 2,
            'valid_count' => 2,
            'error_count' => 0,
        ]);

        $previewRows = $previewResponse->json('preview');

        $confirmResponse = $this->actingAs($this->user)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/import/confirm", [
                'rows' => $previewRows,
            ]);

        $confirmResponse->assertRedirect(route('tenant.pharmacy.medicines'));

        // Assert 1 clinic_medicine exists for Metformin
        $clinicMeds = ClinicMedicine::where('tenant_id', $this->tenant->id)->get();
        $this->assertCount(1, $clinicMeds);

        // Assert both batches exist under the same clinic_medicine
        $this->assertDatabaseHas('stock_batches', [
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $clinicMeds[0]->id,
            'batch_number' => 'B001',
            'quantity_remaining' => 30,
        ]);
        $this->assertDatabaseHas('stock_batches', [
            'tenant_id' => $this->tenant->id,
            'clinic_medicine_id' => $clinicMeds[0]->id,
            'batch_number' => 'B002',
            'quantity_remaining' => 20,
        ]);
    }

    public function test_csv_import_splits_grn_and_opening_stock(): void
    {
        $csvContent = implode("\n", [
            'generic_name,strength,dosage_form,brand_name,quantity,cost_price,selling_price,batch_number,expiry_date,supplier_name,invoice_number',
            'Amoxicillin,500mg,Capsule,,50,10.00,15.00,AMX-01,2027-10-31,PharmaDist,INV-888',
            'Ciprofloxacin,500mg,Tablet,,40,8.00,12.00,CIP-01,2027-08-31,,,',
        ]);

        $file = UploadedFile::fake()->createWithContent('split_import.csv', $csvContent);

        $previewResponse = $this->actingAs($this->user)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/import/preview", [
                'file' => $file,
            ]);

        $previewResponse->assertStatus(200);
        $previewRows = $previewResponse->json('preview');

        $confirmResponse = $this->actingAs($this->user)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/import/confirm", [
                'rows' => $previewRows,
            ]);

        $confirmResponse->assertRedirect(route('tenant.pharmacy.medicines'));

        // Row 1 created a GRN receipt
        $this->assertDatabaseHas('stock_receipts', [
            'tenant_id' => $this->tenant->id,
            'invoice_number' => 'INV-888',
        ]);
        $amxBatch = StockBatch::where('batch_number', 'AMX-01')->firstOrFail();
        $this->assertNotNull($amxBatch->stock_receipt_id);

        // Row 2 created opening stock batch without a GRN receipt
        $cipBatch = StockBatch::where('batch_number', 'CIP-01')->firstOrFail();
        $this->assertNull($cipBatch->stock_receipt_id);

        // Assert movement for CIP-01 is opening_stock
        $this->assertDatabaseHas('stock_movements', [
            'stock_batch_id' => $cipBatch->id,
            'type' => StockMovement::TYPE_OPENING_STOCK,
            'reason' => 'Opening stock',
        ]);
    }

    public function test_csv_import_rejects_past_expiry(): void
    {
        $csvContent = implode("\n", [
            'generic_name,strength,dosage_form,brand_name,quantity,cost_price,selling_price,batch_number,expiry_date,supplier_name,invoice_number',
            'Paracetamol,500mg,Tablet,,50,2.00,3.00,BATCH-OLD,2020-01-01,Astron,INV-001',
        ]);

        $file = UploadedFile::fake()->createWithContent('expired.csv', $csvContent);

        $previewResponse = $this->actingAs($this->user)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/pharmacy/import/preview", [
                'file' => $file,
            ]);

        $previewResponse->assertStatus(200);
        $previewResponse->assertJson([
            'success' => true,
            'total_rows' => 1,
            'valid_count' => 0,
            'error_count' => 1,
        ]);

        $previewRows = $previewResponse->json('preview');
        $this->assertEquals('error', $previewRows[0]['status']);
        $this->assertTrue(
            collect($previewRows[0]['errors'])->contains(fn ($err) => str_contains($err, 'past') || str_contains($err, 'Expired') || str_contains($err, 'future'))
        );
    }
}
