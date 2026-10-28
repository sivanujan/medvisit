<?php

declare(strict_types=1);

namespace App\Services\Pdf;

use App\Models\Bill;
use App\Models\DoctorSettlement;
use App\Models\Prescription;
use App\Models\RefundRequest;
use App\Models\StockReceipt;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Services\Billing\CreditNotePdfService;
use App\Services\Billing\SubscriptionReceiptPdfService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\View;
use Spatie\Browsershot\Browsershot;

class ChromiumPdfService
{
    /**
     * In-memory cache for base64 encoded font files.
     *
     * @var array<string, string>
     */
    protected static array $fontCache = [];

    /**
     * Get base64 string for a bundled font file.
     */
    public static function getFontBase64(string $filename): string
    {
        if (isset(self::$fontCache[$filename])) {
            return self::$fontCache[$filename];
        }

        $paths = [
            resource_path('fonts/'.$filename),
            public_path('fonts/'.$filename),
        ];

        foreach ($paths as $path) {
            if (file_exists($path)) {
                $content = file_get_contents($path);
                if ($content !== false) {
                    return self::$fontCache[$filename] = base64_encode($content);
                }
            }
        }

        return '';
    }

    /**
     * Detect or resolve the Chrome / Chromium binary path.
     */
    public static function detectChromeBinary(): ?string
    {
        $explicit = config('laravel-pdf.browsershot.chrome_path')
            ?: env('LARAVEL_PDF_CHROME_PATH')
            ?: env('CHROME_PATH');

        if ($explicit && file_exists($explicit)) {
            return $explicit;
        }

        // Standard Windows Playwright / Chrome locations
        $windowsCandidates = [
            'C:\\Users\\Sivanujan_PC\\AppData\\Local\\ms-playwright\\chromium-1248\\chrome-win64\\chrome.exe',
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        ];

        $localAppData = getenv('LOCALAPPDATA');
        if ($localAppData) {
            $glob = glob($localAppData.'\\ms-playwright\\chromium-*\\chrome-win64\\chrome.exe');
            if (! empty($glob)) {
                $windowsCandidates[] = end($glob);
            }
        }

        foreach ($windowsCandidates as $candidate) {
            if (file_exists($candidate)) {
                return $candidate;
            }
        }

        // Standard Linux server locations (Ubuntu / Debian / DigitalOcean Droplets)
        $linuxCandidates = [
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable',
            '/snap/bin/chromium',
        ];

        foreach ($linuxCandidates as $candidate) {
            if (file_exists($candidate)) {
                return $candidate;
            }
        }

        return null;
    }

    /**
     * Create a pre-configured Browsershot instance for HarfBuzz Chromium rendering.
     */
    public function newBrowsershot(?string $html = null): Browsershot
    {
        $bs = $html ? Browsershot::html($html) : new Browsershot;

        $chromePath = self::detectChromeBinary();
        if ($chromePath) {
            $bs->setChromePath($chromePath);
        }

        $nodeBinary = config('laravel-pdf.browsershot.node_binary') ?: env('NODE_BINARY');
        if ($nodeBinary) {
            $bs->setNodeBinary($nodeBinary);
        }

        $npmBinary = config('laravel-pdf.browsershot.npm_binary') ?: env('NPM_BINARY');
        if ($npmBinary) {
            $bs->setNpmBinary($npmBinary);
        }

        $nodeModulesPath = base_path('node_modules');
        if (is_dir($nodeModulesPath)) {
            $bs->setNodeModulePath($nodeModulesPath);
        }

        $bs->noSandbox()
            ->showBackground()
            ->addChromiumArguments([
                'disable-gpu',
                'disable-dev-shm-usage',
                'font-render-hinting=none',
                'hide-scrollbars',
                'disable-software-rasterizer',
                'no-first-run',
            ]);

        return $bs;
    }

    /**
     * Render raw HTML string to PDF binary with HarfBuzz complex Indic text shaping.
     *
     * @param  array<string, mixed>  $options
     */
    public function renderHtml(string $html, array $options = []): string
    {
        $startTime = microtime(true);
        $startMem = memory_get_peak_usage(true);

        $bs = $this->newBrowsershot($html);

        $format = $options['format'] ?? 'A4';
        $orientation = $options['orientation'] ?? 'portrait';

        if (strtolower($format) === 'a4') {
            $bs->format('A4');
        } elseif (isset($options['width'], $options['height'])) {
            $bs->paperSize($options['width'], $options['height']);
        }

        if (strtolower($orientation) === 'landscape') {
            $bs->landscape();
        }

        if (isset($options['margins'])) {
            $m = $options['margins'];
            $bs->margins($m['top'] ?? 10, $m['right'] ?? 10, $m['bottom'] ?? 10, $m['left'] ?? 10);
        } else {
            $bs->margins(8, 8, 8, 8);
        }

        $pdfBinary = $bs->pdf();

        $elapsed = microtime(true) - $startTime;
        $peakMem = memory_get_peak_usage(true) - $startMem;

        Log::info('Chromium HarfBuzz PDF generated', [
            'duration_sec' => round($elapsed, 3),
            'peak_mem_mb' => round($peakMem / 1024 / 1024, 2),
            'bytes' => strlen($pdfBinary),
        ]);

        return $pdfBinary;
    }

    /**
     * Render a Blade view with data to PDF.
     *
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $options
     */
    public function renderView(string $view, array $data = [], array $options = []): string
    {
        $html = View::make($view, $data)->render();

        return $this->renderHtml($html, $options);
    }

    /**
     * 1. Trilingual Prescription PDF.
     */
    public function generatePrescriptionPdf(Prescription $prescription, string $lang = 'en'): string
    {
        $prescription->load(['patient', 'doctor', 'token.doctorSession.doctor', 'items.clinicMedicine', 'diagnosisTags']);
        $tenant = $prescription->tenant ?? tenant();

        return $this->renderView('pdf.prescription', [
            'prescription' => $prescription,
            'tenant' => $tenant,
            'lang' => $lang,
        ], ['format' => 'A4', 'orientation' => 'portrait']);
    }

    /**
     * 2. Receipt A4 PDF (Consultation & Pharmacy).
     */
    public function generateReceiptA4Pdf(Bill $bill): string
    {
        $bill->load(['patient', 'doctor', 'token.session.doctor', 'items', 'visitType']);
        $tenant = $bill->tenant ?? tenant();

        return $this->renderView('pdf.receipt_a4', [
            'bill' => $bill,
            'tenant' => $tenant,
        ], ['format' => 'A4', 'orientation' => 'portrait']);
    }

    /**
     * 3. Subscription Invoice & Receipt PDF.
     */
    public function generateSubscriptionInvoicePdf(SubscriptionInvoice $invoice): string
    {
        $service = app(SubscriptionReceiptPdfService::class);
        $data = $service->buildViewData($invoice);

        return $this->renderView('pdf.subscription_receipt', $data, ['format' => 'A4', 'orientation' => 'portrait']);
    }

    /**
     * 4. Credit Note PDF.
     */
    public function generateCreditNotePdf(RefundRequest $refundRequest): string
    {
        $service = app(CreditNotePdfService::class);
        $data = $service->buildViewData($refundRequest);

        return $this->renderView('pdf.credit_note', $data, ['format' => 'A4', 'orientation' => 'portrait']);
    }

    /**
     * 5. Doctor Settlement Payout Slip PDF.
     */
    public function generatePayoutSlipPdf(DoctorSettlement $settlement): string
    {
        $settlement->load(['doctor', 'items.bill.patient', 'adjustments', 'creator', 'voidedByUser']);
        $tenant = $settlement->tenant ?? tenant();

        return $this->renderView('pdf.payout_slip', [
            'settlement' => $settlement,
            'tenant' => $tenant,
        ], ['format' => 'A4', 'orientation' => 'portrait']);
    }

    /**
     * 6. Stock Receipt / Goods Received Note (GRN) PDF.
     */
    public function generateGrnPdf(StockReceipt $receipt): string
    {
        $receipt->load(['supplier', 'batches.clinicMedicine', 'creator']);
        $tenant = $receipt->tenant ?? tenant();

        return $this->renderView('pdf.grn', [
            'receipt' => $receipt,
            'tenant' => $tenant,
        ], ['format' => 'A4', 'orientation' => 'portrait']);
    }

    /**
     * 7. Daily Summary & Collections Report PDF.
     */
    public function generateDailyReportPdf(Carbon|string $date, ?string $tenantId = null): string
    {
        $tenantId = $tenantId ?? (function_exists('tenant') && tenant() ? tenant('id') : null);
        $parsedDate = $date instanceof Carbon ? $date : Carbon::parse($date);
        $tz = 'Asia/Colombo';
        $start = $parsedDate->copy()->timezone($tz)->startOfDay();
        $end = $parsedDate->copy()->timezone($tz)->endOfDay();

        $bills = Bill::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$start, $end])
            ->whereIn('payment_status', [Bill::STATUS_PAID, Bill::STATUS_REFUNDED])
            ->with(['patient', 'doctor', 'token'])
            ->get();

        $settlements = DoctorSettlement::where('tenant_id', $tenantId)
            ->whereBetween('created_at', [$start, $end])
            ->with(['doctor'])
            ->get();

        $tenant = Tenant::find($tenantId) ?? (function_exists('tenant') ? tenant() : null);

        return $this->renderView('pdf.daily_report', [
            'date' => $parsedDate,
            'bills' => $bills,
            'settlements' => $settlements,
            'tenant' => $tenant,
        ], ['format' => 'A4', 'orientation' => 'portrait']);
    }

    /**
     * 8. Medicine Dispensing / Dosage Label PDF.
     */
    public function generateLabelPdf(array $labelData): string
    {
        return $this->renderView('pdf.label', [
            'label' => $labelData,
            'tenant' => function_exists('tenant') ? tenant() : null,
        ], [
            'width' => '80mm',
            'height' => '50mm',
            'margins' => ['top' => 2, 'right' => 2, 'bottom' => 2, 'left' => 2],
        ]);
    }
}
