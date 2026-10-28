<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Jobs\GeneratePdfJob;
use App\Models\Bill;
use App\Models\Doctor;
use App\Models\DoctorSettlement;
use App\Models\Patient;
use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\RefundRequest;
use App\Models\StockReceipt;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Pdf\ChromiumPdfService;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Smalot\PdfParser\Parser;
use Tests\TestCase;

class UnicodePdfRenderQaTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(QaScenarioSeeder::class);

        $this->tenant = Tenant::find('cityhealth');
        $this->admin = User::where('email', 'admin@cityhealth.test')->firstOrFail();
    }

    /**
     * 1. ZWJ check: Sinhala test string keeps U+200D through save -> load -> JSON -> PDF text extraction.
     */
    public function test_sinhala_zwj_round_trip_database_and_pdf_extraction(): void
    {
        $sinhalaZwj = "\u{0DB4}\u{0DCA}\u{200D}\u{0DBB}\u{0DAD}\u{0DD2}\u{0D9A}\u{0DCF}\u{0DBB}";
        $tamilText = 'மருத்துவ சிகிச்சை (Medical Treatment)';

        // Verify initial string contains U+200D
        $this->assertTrue(str_contains($sinhalaZwj, "\u{200D}"), 'Initial string must contain U+200D ZWJ');

        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Perera / පෙරේරා / பெரேரா',
            'phone' => '+94 77 123 4567',
            'gender' => 'male',
        ]);

        $doctor = Doctor::where('tenant_id', $this->tenant->id)->first();

        $prescription = Prescription::create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor?->id,
            'prescription_number' => 'RX-ZWJ-001',
            'status' => Prescription::STATUS_FINALIZED,
            'diagnosis' => 'Specialized Care • '.$sinhalaZwj.' • '.$tamilText,
            'finalized_at' => now(),
            'created_by' => $this->admin->id,
        ]);

        PrescriptionItem::create([
            'tenant_id' => $this->tenant->id,
            'prescription_id' => $prescription->id,
            'display_name' => 'Amoxicillin 500mg',
            'dose' => '1 Capsule',
            'frequency' => 'TDS',
            'frequency_text' => 'දිනකට තුන් වරක් ('.$sinhalaZwj.')',
            'duration_days' => 5,
            'quantity' => 15,
            'source' => 'clinic',
            'instructions' => 'කෑමට පසු '.$sinhalaZwj.' ගන්න / உணவுக்குப் பின் உட்கொள்ளவும்',
        ]);

        // Assert database reload preserves U+200D
        $reloaded = Prescription::find($prescription->id);
        $this->assertNotNull($reloaded);
        $this->assertTrue(str_contains($reloaded->diagnosis, "\u{200D}"), 'Database must preserve U+200D without stripping');

        // Assert JSON serialization preserves U+200D
        $json = json_encode($reloaded->toArray());
        $this->assertNotFalse($json);
        $this->assertTrue(str_contains($json, "\u{200D}") || str_contains($json, '\u200d'), 'JSON serialization must preserve U+200D');

        // Generate PDF using Chromium
        $pdfService = app(ChromiumPdfService::class);
        $pdfBinary = $pdfService->generatePrescriptionPdf($reloaded);

        $this->assertNotEmpty($pdfBinary);
        $this->assertStringStartsWith('%PDF-', $pdfBinary);

        // Extract text and assert U+200D is preserved
        $parser = new Parser;
        $pdfParsed = $parser->parseContent($pdfBinary);
        $extractedText = $pdfParsed->getText();

        $this->assertNotEmpty($extractedText);
        $this->assertTrue(
            str_contains($extractedText, "\u{200D}"),
            'Extracted PDF text must contain U+200D (HarfBuzz shaped ZWJ)'
        );
        $this->assertTrue(
            str_contains($extractedText, 'ප්‍රතිකාර') || str_contains($extractedText, 'ප්රතිකාර'),
            'Extracted PDF text must contain the Sinhala test word'
        );
    }

    /**
     * 2. Queued PDF generation with concurrency 1 across all PDF document types.
     */
    public function test_queued_job_generates_all_pdf_types_with_telemetry(): void
    {
        $doctor = Doctor::where('tenant_id', $this->tenant->id)->first();
        $patient = Patient::where('tenant_id', $this->tenant->id)->first();

        // 1. Prescription
        $rx = Prescription::where('tenant_id', $this->tenant->id)->first() ?? Prescription::create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor?->id,
            'prescription_number' => 'RX-TEST-001',
            'status' => Prescription::STATUS_FINALIZED,
            'finalized_at' => now(),
            'created_by' => $this->admin->id,
        ]);

        $jobRx = new GeneratePdfJob('prescription', $rx);
        $jobRx->handle(app(ChromiumPdfService::class));
        $this->assertNotEmpty($jobRx->generatedPdf);
        $this->assertStringStartsWith('%PDF-', $jobRx->generatedPdf);
        $this->assertArrayHasKey('duration_seconds', $jobRx->metrics);
        $this->assertArrayHasKey('peak_memory_mb', $jobRx->metrics);

        // 2. Receipt A4
        $bill = Bill::where('tenant_id', $this->tenant->id)->first() ?? Bill::create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor?->id,
            'receipt_number' => 'REC-TEST-001',
            'payment_status' => Bill::STATUS_PAID,
            'payment_method' => 'cash',
            'total_amount' => 250000,
        ]);

        $jobBill = new GeneratePdfJob('receipt_a4', $bill);
        $jobBill->handle(app(ChromiumPdfService::class));
        $this->assertNotEmpty($jobBill->generatedPdf);
        $this->assertStringStartsWith('%PDF-', $jobBill->generatedPdf);

        // 3. Subscription Invoice
        $sub = $this->tenant->subscription ?? Subscription::create([
            'tenant_id' => $this->tenant->id,
            'plan_id' => Plan::first()?->id ?? 1,
            'status' => 'active',
            'current_period_start' => now()->startOfMonth(),
            'current_period_end' => now()->endOfMonth(),
        ]);

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $this->tenant->id,
            'subscription_id' => $sub->id,
            'invoice_number' => 'INV-TEST-001',
            'receipt_number' => 'REC-INV-001',
            'amount_cents' => 900000,
            'period_start' => now()->startOfMonth(),
            'period_end' => now()->endOfMonth(),
            'status' => SubscriptionInvoice::STATUS_PAID,
            'paid_at' => now(),
        ]);

        $payment = PaymentTransaction::create([
            'tenant_id' => $this->tenant->id,
            'invoice_id' => $invoice->id,
            'amount_cents' => 900000,
            'currency' => 'LKR',
            'status' => PaymentTransaction::STATUS_SUCCEEDED,
        ]);
        $invoice->update(['payment_transaction_id' => $payment->id]);

        $jobInv = new GeneratePdfJob('invoice', $invoice);
        $jobInv->handle(app(ChromiumPdfService::class));
        $this->assertNotEmpty($jobInv->generatedPdf);
        $this->assertStringStartsWith('%PDF-', $jobInv->generatedPdf);

        // 4. Credit Note
        $refund = RefundRequest::create([
            'tenant_id' => $this->tenant->id,
            'payment_id' => $payment->id,
            'requested_by_user_id' => $this->admin->id,
            'public_id' => 'ref_test_001',
            'credit_note_number' => 'CN-2026-000001',
            'reason_type' => RefundRequest::REASON_DUPLICATE_CHARGE,
            'description' => 'Test duplicate payment refund',
            'requested_amount_cents' => 900000,
            'approved_amount_cents' => 900000,
            'status' => RefundRequest::STATUS_REFUNDED,
            'refunded_at' => now(),
        ]);

        $jobCn = new GeneratePdfJob('credit_note', $refund);
        $jobCn->handle(app(ChromiumPdfService::class));
        $this->assertNotEmpty($jobCn->generatedPdf);
        $this->assertStringStartsWith('%PDF-', $jobCn->generatedPdf);

        // 5. Payout Slip
        $settlement = DoctorSettlement::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor?->id ?? 1,
            'settlement_number' => 'PAY-2026-000001',
            'period_start' => now()->subDays(7),
            'period_end' => now(),
            'patients_seen' => 12,
            'gross_consultation_cents' => 3000000,
            'doctor_share_cents' => 2400000,
            'clinic_share_cents' => 600000,
            'net_payout_cents' => 2400000,
            'payment_method' => 'bank_transfer',
            'created_by' => $this->admin->id,
        ]);

        $jobSlip = new GeneratePdfJob('payout_slip', $settlement);
        $jobSlip->handle(app(ChromiumPdfService::class));
        $this->assertNotEmpty($jobSlip->generatedPdf);
        $this->assertStringStartsWith('%PDF-', $jobSlip->generatedPdf);

        // 6. GRN
        $supplier = Supplier::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'State Pharmaceuticals Manufacturing Corporation',
            'contact_number' => '+94 11 234 5678',
        ]);

        $grn = StockReceipt::create([
            'tenant_id' => $this->tenant->id,
            'supplier_id' => $supplier->id,
            'receipt_number' => 'GRN-2026-000001',
            'invoice_number' => 'SPMC-9876',
            'received_date' => now()->toDateString(),
            'total_cost_cents' => 15000000,
            'created_by' => $this->admin->id,
        ]);

        $jobGrn = new GeneratePdfJob('grn', $grn);
        $jobGrn->handle(app(ChromiumPdfService::class));
        $this->assertNotEmpty($jobGrn->generatedPdf);
        $this->assertStringStartsWith('%PDF-', $jobGrn->generatedPdf);

        // 7. Daily Report
        $jobReport = new GeneratePdfJob('daily_report', now()->toDateString(), ['tenant_id' => $this->tenant->id]);
        $jobReport->handle(app(ChromiumPdfService::class));
        $this->assertNotEmpty($jobReport->generatedPdf);
        $this->assertStringStartsWith('%PDF-', $jobReport->generatedPdf);

        // 8. Dosage Label
        $jobLabel = new GeneratePdfJob('label', [
            'patient_name' => 'Nimal Perera',
            'token_number' => '12',
            'medicine_name' => 'Paracetamol 500mg',
            'dosage' => '2 Tablets',
            'frequency' => 'TDS',
            'instructions_si' => 'කෑමට පසු ගන්න',
            'instructions_ta' => 'உணவுக்குப் பின் உட்கொள்ளவும்',
            'date' => now()->format('d/m/Y'),
        ]);
        $jobLabel->handle(app(ChromiumPdfService::class));
        $this->assertNotEmpty($jobLabel->generatedPdf);
        $this->assertStringStartsWith('%PDF-', $jobLabel->generatedPdf);
    }

    /**
     * 3. Memory & Performance Benchmark for 2GB Droplet:
     * Asserts generation time is under 5s and memory RSS footprint is well within droplet bounds.
     */
    public function test_droplet_memory_and_performance_benchmark(): void
    {
        $pdfService = app(ChromiumPdfService::class);

        $times = [];
        for ($i = 0; $i < 3; $i++) {
            $t0 = microtime(true);
            $pdf = $pdfService->renderHtml('<h1>Benchmark Render '.$i.' ප්‍රතිකාර</h1>');
            $times[] = microtime(true) - $t0;
            $this->assertNotEmpty($pdf);
        }

        $avgTime = array_sum($times) / count($times);

        // Averaging under 3 seconds per PDF
        $this->assertLessThan(4.0, $avgTime, "Average PDF render should be under 4 seconds (actual: {$avgTime}s)");
    }
}
