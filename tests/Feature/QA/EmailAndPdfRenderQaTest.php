<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Billing\SubscriptionReceiptPdfService;
use App\Services\SampleMailFactory;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EmailAndPdfRenderQaTest extends TestCase
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
     * 1. Render all sample mailables, asserting successful HTML compilation and absolute logo URLs.
     */
    public function test_all_sample_mailables_render_with_absolute_assets(): void
    {
        $templates = SampleMailFactory::allTemplates();
        $this->assertNotEmpty($templates);

        $renderedCount = 0;
        foreach (array_keys($templates) as $templateKey) {
            $mailable = SampleMailFactory::create($templateKey);
            $this->assertNotNull($mailable, "Failed to instantiate sample mailable for key: {$templateKey}");

            $html = $mailable->render();
            $this->assertNotEmpty($html, "Mailable {$templateKey} rendered empty HTML");

            // Assert that images/logos use absolute URLs (http:// or https://)
            if (preg_match_all('/<img[^>]+src=["\']([^"\']+)["\']/i', $html, $matches)) {
                foreach ($matches[1] as $src) {
                    if (str_starts_with($src, 'data:image')) {
                        continue;
                    }
                    $this->assertMatchesRegularExpression(
                        '/^https?:\/\//',
                        $src,
                        "Image source '{$src}' in mailable '{$templateKey}' must be an absolute URL"
                    );
                }
            }

            $renderedCount++;
        }

        $this->assertGreaterThanOrEqual(20, $renderedCount, 'Must render at least 20 cataloged mailables');
    }

    /**
     * 2. Generate subscription receipt PDF and test font handling.
     */
    public function test_subscription_receipt_pdf_generation(): void
    {
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
            'invoice_number' => 'INV-2026-00001',
            'receipt_number' => 'REC-2026-00001',
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

        $pdfService = app(SubscriptionReceiptPdfService::class);
        $pdf = $pdfService->generatePdf($invoice);

        $this->assertNotEmpty($pdf);
        $this->assertStringStartsWith('%PDF-', $pdf);
    }

    /**
     * 3. Sinhala / Tamil font rendering in PDFs:
     * When tenant details contain Sinhala / Tamil characters, check whether standard DomPDF renders them without exceptions.
     */
    public function test_sinhala_and_tamil_unicode_in_pdf(): void
    {
        // Update tenant with Sinhala and Tamil name
        $this->tenant->update([
            'name' => 'සුව සෙවණ සායනය / நலவாழ்வு கிளினிக்',
        ]);

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
            'invoice_number' => 'INV-UNI-001',
            'receipt_number' => 'REC-UNI-001',
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

        $pdfService = app(SubscriptionReceiptPdfService::class);
        $pdf = $pdfService->generatePdf($invoice);

        $this->assertNotEmpty($pdf);
        $this->assertStringStartsWith('%PDF-', $pdf);
    }
}
