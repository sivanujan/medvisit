<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Services\Pdf\ChromiumPdfService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class GeneratePdfJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Timeout in seconds.
     */
    public int $timeout = 60;

    /**
     * Execution metrics after generation.
     *
     * @var array<string, mixed>
     */
    public array $metrics = [];

    /**
     * Generated PDF binary.
     */
    public ?string $generatedPdf = null;

    /**
     * Create a new PDF generation job instance.
     *
     * @param  string  $pdfType  prescription|receipt_a4|invoice|credit_note|payout_slip|grn|daily_report|label
     * @param  mixed  $targetModelOrData  Model instance or array data needed for generation
     * @param  array<string, mixed>  $options  Additional options (e.g. lang)
     */
    public function __construct(
        public string $pdfType,
        public mixed $targetModelOrData,
        public array $options = []
    ) {
        $isDemo = ! empty($this->options['is_demo'])
            || (is_object($this->targetModelOrData) && (
                (($this->targetModelOrData->tenant_id ?? null) === config('demo.tenant_id', 'demo'))
                || ($this->targetModelOrData->is_demo ?? false)
                || ($this->targetModelOrData->tenant?->is_demo ?? false)
            ));

        $this->onQueue($isDemo ? 'low' : 'pdfs');
    }

    /**
     * Execute the job.
     */
    public function handle(ChromiumPdfService $pdfService): void
    {
        $startTime = microtime(true);
        $startMem = memory_get_peak_usage(true);

        $this->generatedPdf = match ($this->pdfType) {
            'prescription' => $pdfService->generatePrescriptionPdf($this->targetModelOrData, $this->options['lang'] ?? 'en'),
            'receipt_a4' => $pdfService->generateReceiptA4Pdf($this->targetModelOrData),
            'invoice' => $pdfService->generateSubscriptionInvoicePdf($this->targetModelOrData),
            'credit_note' => $pdfService->generateCreditNotePdf($this->targetModelOrData),
            'payout_slip' => $pdfService->generatePayoutSlipPdf($this->targetModelOrData),
            'grn' => $pdfService->generateGrnPdf($this->targetModelOrData),
            'daily_report' => $pdfService->generateDailyReportPdf($this->targetModelOrData, $this->options['tenant_id'] ?? null),
            'label' => $pdfService->generateLabelPdf($this->targetModelOrData),
            default => throw new \InvalidArgumentException("Unsupported PDF type: {$this->pdfType}"),
        };

        $elapsed = microtime(true) - $startTime;
        $peakMem = memory_get_peak_usage(true) - $startMem;

        $this->metrics = [
            'type' => $this->pdfType,
            'duration_seconds' => round($elapsed, 3),
            'peak_memory_bytes' => $peakMem,
            'peak_memory_mb' => round($peakMem / 1024 / 1024, 2),
            'pdf_bytes' => strlen($this->generatedPdf ?? ''),
        ];

        Log::info("Queued PDF Job finished [{$this->pdfType}]", $this->metrics);
    }
}
