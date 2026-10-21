<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\SchedulerHeartbeat;
use App\Models\WebhookEvent;
use App\Services\AuditLogger;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class SystemHealthController extends Controller
{
    /**
     * Display the System Health & Queue status dashboard.
     */
    public function index(): Response
    {
        // 1. Queue Status
        $pendingJobs = DB::table('jobs')
            ->select('queue', DB::raw('count(*) as count'))
            ->groupBy('queue')
            ->get();

        $totalPending = DB::table('jobs')->count();

        $failedJobsRaw = DB::table('failed_jobs')
            ->latest('failed_at')
            ->limit(50)
            ->get();

        $failedJobs = $failedJobsRaw->map(function ($job) {
            $payload = json_decode($job->payload ?? '{}', true) ?: [];
            $displayName = $payload['displayName'] ?? ($payload['data']['commandName'] ?? 'Unknown Job');

            // Extract clinic/tenant from payload if present
            $clinic = null;
            if (isset($payload['data']['command'])) {
                if (preg_match('/tenant_id";s:\d+:"([^"]+)"/', (string) $payload['data']['command'], $m)) {
                    $clinic = $m[1];
                }
            }

            // Extract first line of exception
            $firstLineError = 'Unknown error';
            if (! empty($job->exception)) {
                $lines = explode("\n", (string) $job->exception);
                $firstLineError = trim($lines[0] ?? 'Job failed');
            }

            return [
                'id' => $job->id,
                'uuid' => $job->uuid,
                'connection' => $job->connection,
                'queue' => $job->queue,
                'name' => class_basename($displayName),
                'full_name' => $displayName,
                'clinic' => $clinic,
                'error' => $firstLineError,
                'failed_at' => $job->failed_at,
            ];
        });

        // 2. Scheduler Heartbeats
        $heartbeats = SchedulerHeartbeat::all()->map(function ($hb) {
            $isOverdue = false;
            $overdueThreshold = 26; // hours for daily
            if (str_contains($hb->command, 'check-expirations')) {
                $overdueThreshold = 2; // hours for hourly
            } elseif (str_contains($hb->command, 'heartbeat') || str_contains($hb->command, 'process-scheduled')) {
                $overdueThreshold = 0.17; // 10 minutes
            }

            if ($hb->last_finished_at) {
                $hoursSince = Carbon::parse($hb->last_finished_at)->diffInMinutes(now()) / 60;
                if ($hoursSince > $overdueThreshold) {
                    $isOverdue = true;
                }
            } else {
                $isOverdue = true;
            }

            return [
                'command' => $hb->command,
                'last_started_at' => $hb->last_started_at?->toIso8601String(),
                'last_finished_at' => $hb->last_finished_at?->toIso8601String(),
                'duration_ms' => $hb->duration_ms,
                'status' => $hb->status,
                'is_overdue' => $isOverdue,
            ];
        });

        // Check if scheduler is running overall (heartbeat within 10 min)
        $masterHeartbeat = SchedulerHeartbeat::where('command', 'schedule:heartbeat')->first();
        $schedulerRunning = false;
        if ($masterHeartbeat && $masterHeartbeat->last_finished_at) {
            $diffMinutes = Carbon::parse($masterHeartbeat->last_finished_at)->diffInMinutes(now());
            $schedulerRunning = $diffMinutes <= 10;
        }

        // 3. Webhooks telemetry
        $webhooks = [
            'payments_lk' => $this->getWebhookStats('payments_lk'),
            'whatsapp' => $this->getWebhookStats('whatsapp'),
        ];

        // 4. Environment Telemetry
        $envInfo = $this->getEnvironmentInfo();

        return Inertia::render('SuperAdmin/SystemHealth/Index', [
            'queue' => [
                'pending_total' => $totalPending,
                'pending_by_queue' => $pendingJobs,
                'failed_jobs' => $failedJobs,
            ],
            'scheduler' => [
                'is_running' => $schedulerRunning,
                'heartbeats' => $heartbeats,
                'last_ping' => $masterHeartbeat?->last_finished_at?->toIso8601String(),
            ],
            'webhooks' => $webhooks,
            'environment' => $envInfo,
        ]);
    }

    /**
     * Retry a single failed job.
     */
    public function retryJob(Request $request): RedirectResponse
    {
        $id = (string) $request->route('id');
        Artisan::call('queue:retry', ['id' => [$id]]);

        AuditLogger::log('queue.job_retried', [
            'metadata' => ['job_id' => $id],
        ]);

        return back()->with('success', "Job #{$id} was queued for retry.");
    }

    /**
     * Delete a single failed job.
     */
    public function deleteJob(Request $request): RedirectResponse
    {
        $id = (string) $request->route('id');
        Artisan::call('queue:forget', ['id' => $id]);

        AuditLogger::log('queue.job_deleted', [
            'metadata' => ['job_id' => $id],
        ]);

        return back()->with('success', "Failed job #{$id} was deleted.");
    }

    /**
     * Retry all failed jobs.
     */
    public function retryAll(): RedirectResponse
    {
        Artisan::call('queue:retry', ['id' => ['all']]);

        AuditLogger::log('queue.all_retried');

        return back()->with('success', 'All failed jobs have been queued for retry.');
    }

    /**
     * Flush / Delete all failed jobs.
     */
    public function flushAll(): RedirectResponse
    {
        Artisan::call('queue:flush');

        AuditLogger::log('queue.all_flushed');

        return back()->with('success', 'Failed jobs queue cleared.');
    }

    /**
     * Trigger safe console command manually with audit log.
     */
    public function runCommand(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'command' => ['required', 'in:subscriptions:check-expirations,subscriptions:send-reminders,announcements:process-scheduled'],
        ]);

        $cmd = $validated['command'];

        try {
            $exitCode = Artisan::call($cmd);
            $output = Artisan::output();

            AuditLogger::log('system_health.command_run', [
                'metadata' => [
                    'command' => $cmd,
                    'exit_code' => $exitCode,
                ],
            ]);

            return response()->json([
                'success' => $exitCode === 0,
                'output' => $output ?: 'Command completed successfully.',
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'success' => false,
                'output' => 'Error executing command: '.$e->getMessage(),
            ], 500);
        }
    }

    /**
     * Webhook statistics for a gateway.
     *
     * @return array{last_received: ?string, last_success: ?string, failures_24h: int, total_24h: int}
     */
    private function getWebhookStats(string $gateway): array
    {
        $lastEvent = WebhookEvent::where('gateway', $gateway)->latest()->first();
        $lastSuccess = WebhookEvent::where('gateway', $gateway)->whereNotNull('processed_at')->latest()->first();

        $yesterday = Carbon::now()->subDay();
        $total24h = WebhookEvent::where('gateway', $gateway)->where('created_at', '>=', $yesterday)->count();
        $failures24h = WebhookEvent::where('gateway', $gateway)
            ->where('created_at', '>=', $yesterday)
            ->whereNull('processed_at')
            ->count();

        return [
            'last_received' => $lastEvent?->created_at?->toIso8601String(),
            'last_success' => $lastSuccess?->processed_at?->toIso8601String(),
            'failures_24h' => $failures24h,
            'total_24h' => $total24h,
        ];
    }

    /**
     * Gather system environment telemetry.
     *
     * @return array<string, mixed>
     */
    private function getEnvironmentInfo(): array
    {
        $gitCommit = 'N/A';
        try {
            $gitCommit = trim((string) @shell_exec('git rev-parse --short HEAD'));
            if (empty($gitCommit)) {
                $gitCommit = 'v1.0.0';
            }
        } catch (Throwable) {
            $gitCommit = 'v1.0.0';
        }

        // Database size calculation (Postgres vs MySQL vs SQLite)
        $dbSize = 'Unknown';
        try {
            $connection = config('database.default');
            if ($connection === 'pgsql') {
                $result = DB::select('SELECT pg_size_pretty(pg_database_size(current_database())) as size');
                if (! empty($result) && isset($result[0]->size)) {
                    $dbSize = (string) $result[0]->size;
                }
            } elseif ($connection === 'sqlite') {
                $path = config('database.connections.sqlite.database');
                if (file_exists($path)) {
                    $bytes = filesize($path);
                    $dbSize = round($bytes / (1024 * 1024), 2).' MB';
                }
            } elseif ($connection === 'mysql' || $connection === 'mariadb') {
                $dbName = config("database.connections.{$connection}.database");
                $result = DB::select('SELECT SUM(data_length + index_length) as size FROM information_schema.TABLES WHERE table_schema = ?', [$dbName]);
                if (! empty($result) && isset($result[0]->size)) {
                    $dbSize = round($result[0]->size / (1024 * 1024), 2).' MB';
                }
            } else {
                $dbSize = '< 50 MB';
            }
        } catch (Throwable) {
            $dbSize = '< 50 MB';
        }

        return [
            'app_env' => config('app.env'),
            'app_debug' => (bool) config('app.debug'),
            'php_version' => PHP_VERSION,
            'laravel_version' => app()->version(),
            'git_commit' => $gitCommit,
            'db_connection' => config('database.default'),
            'db_size' => $dbSize,
            'cache_driver' => config('cache.default'),
            'queue_driver' => config('queue.default'),
            'mail_driver' => config('mail.default'),
            'storage_disks' => [
                'local' => 'Online',
                'public' => 'Online',
            ],
        ];
    }
}
