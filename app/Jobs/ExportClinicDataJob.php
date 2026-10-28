<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\ClinicDataExport;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use ZipArchive;

class ExportClinicDataJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public string $exportId
    ) {}

    public function handle(): void
    {
        $export = ClinicDataExport::find($this->exportId);
        if (! $export) {
            return;
        }

        $export->update(['status' => 'processing']);

        $tenantId = $export->tenant_id;
        $tenant = Tenant::find($tenantId);

        try {
            $tempDir = storage_path('app/temp_exports/'.uniqid((string) $tenantId.'_', true));
            File::makeDirectory($tempDir, 0755, true);

            // 1. Doctors CSV
            $doctorsCsv = fopen("{$tempDir}/doctors.csv", 'w');
            fputcsv($doctorsCsv, ['ID', 'Name', 'SLMC', 'Specialty', 'Phone', 'Email', 'Doctor Fee (Cents)', 'Clinic Fee (Cents)']);
            foreach (Doctor::where('tenant_id', $tenantId)->get() as $d) {
                fputcsv($doctorsCsv, [$d->id, $d->name, $d->slmc_number, $d->specialty, $d->phone, $d->email, $d->doctor_fee, $d->clinic_fee]);
            }
            fclose($doctorsCsv);

            // 2. Patients CSV
            $patientsCsv = fopen("{$tempDir}/patients.csv", 'w');
            fputcsv($patientsCsv, ['ID', 'Name', 'Phone', 'NIC', 'City', 'Created At']);
            foreach (Patient::where('tenant_id', $tenantId)->get() as $p) {
                fputcsv($patientsCsv, [$p->id, $p->name, $p->phone, $p->nic, $p->city, $p->created_at]);
            }
            fclose($patientsCsv);

            // 3. Sessions CSV
            $sessionsCsv = fopen("{$tempDir}/sessions.csv", 'w');
            fputcsv($sessionsCsv, ['ID', 'Doctor ID', 'Date', 'Start Time', 'End Time', 'Status', 'Max Tokens']);
            foreach (DoctorSession::where('tenant_id', $tenantId)->get() as $s) {
                fputcsv($sessionsCsv, [$s->id, $s->doctor_id, $s->session_date, $s->start_time, $s->end_time, $s->status, $s->max_tokens]);
            }
            fclose($sessionsCsv);

            // 4. Tokens CSV
            $tokensCsv = fopen("{$tempDir}/booking_tokens.csv", 'w');
            fputcsv($tokensCsv, ['ID', 'Session ID', 'Patient ID', 'Token Number', 'Status', 'Estimated Time', 'Booked Via']);
            foreach (BookingToken::where('tenant_id', $tenantId)->get() as $t) {
                fputcsv($tokensCsv, [$t->id, $t->doctor_session_id, $t->patient_id, $t->token_number, $t->status, $t->estimated_time, $t->booked_via]);
            }
            fclose($tokensCsv);

            // 5. Bills CSV
            $billsCsv = fopen("{$tempDir}/bills.csv", 'w');
            fputcsv($billsCsv, ['Receipt Number', 'Patient ID', 'Total Amount', 'Payment Method', 'Payment Status', 'Created At']);
            foreach (Bill::where('tenant_id', $tenantId)->get() as $b) {
                fputcsv($billsCsv, [$b->receipt_number, $b->patient_id, $b->total_amount, $b->payment_method, $b->payment_status, $b->created_at]);
            }
            fclose($billsCsv);

            // Zip the CSV files
            $zipPath = "{$tempDir}/clinic_export_{$tenantId}.zip";
            $zip = new ZipArchive;
            if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) === true) {
                foreach (File::files($tempDir) as $file) {
                    if ($file->getExtension() === 'csv') {
                        $zip->addFile($file->getPathname(), $file->getFilename());
                    }
                }
                $zip->close();
            }

            // Encrypt zip file content
            $rawZip = file_get_contents($zipPath);
            $encryptedContent = Crypt::encrypt($rawZip);

            $relativeStoragePath = "private/exports/{$tenantId}_{$export->id}.enc";
            Storage::disk('local')->put($relativeStoragePath, $encryptedContent);

            // Cleanup temp dir
            File::deleteDirectory($tempDir);

            $export->update([
                'status' => 'completed',
                'file_path' => $relativeStoragePath,
                'expires_at' => now()->addHours(24),
            ]);
        } catch (\Throwable $e) {
            Log::error("[ExportClinicDataJob] Export failed for tenant {$tenantId}: ".$e->getMessage());
            $export->update([
                'status' => 'failed',
                'error' => $e->getMessage(),
            ]);
        }
    }
}
