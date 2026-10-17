<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\OtpLog;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class OtpAnalyticsController extends Controller
{
    /**
     * Display OTP usage analytics per clinic per month by channel.
     */
    public function index(Request $request): Response
    {
        $selectedMonth = $request->input('month', Carbon::now()->format('Y-m'));

        $startOfMonth = Carbon::parse($selectedMonth.'-01')->startOfMonth();
        $endOfMonth = Carbon::parse($selectedMonth.'-01')->endOfMonth();

        // 1. Clinic monthly statistics
        $tenants = Tenant::all()->keyBy('id');

        $clinicStats = OtpLog::whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->select([
                'tenant_id',
                'channel',
                DB::raw('count(*) as total_count'),
                DB::raw("count(case when status = 'verified' then 1 end) as verified_count"),
                DB::raw("count(case when status in ('failed', 'expired') then 1 end) as failed_count"),
            ])
            ->groupBy(['tenant_id', 'channel'])
            ->get()
            ->groupBy('tenant_id')
            ->map(function ($rows, $tenantId) use ($tenants) {
                $tenant = $tenants->get($tenantId);
                $clinicName = $tenant ? ($tenant->clinic_name ?? $tenant->id) : 'Direct / Central';

                $byChannel = [];
                $totalAttempts = 0;
                $totalVerified = 0;

                foreach ($rows as $row) {
                    $totalAttempts += (int) $row->total_count;
                    $totalVerified += (int) $row->verified_count;

                    $byChannel[$row->channel] = [
                        'channel' => $row->channel,
                        'total' => (int) $row->total_count,
                        'verified' => (int) $row->verified_count,
                        'failed' => (int) $row->failed_count,
                        'success_rate' => $row->total_count > 0
                            ? round(($row->verified_count / $row->total_count) * 100, 1)
                            : 0,
                    ];
                }

                return [
                    'tenant_id' => $tenantId,
                    'clinic_name' => $clinicName,
                    'subdomain' => $tenant?->id,
                    'total_attempts' => $totalAttempts,
                    'total_verified' => $totalVerified,
                    'overall_success_rate' => $totalAttempts > 0
                        ? round(($totalVerified / $totalAttempts) * 100, 1)
                        : 0,
                    'by_channel' => $byChannel,
                ];
            })
            ->values();

        // 2. Global summary for the month
        $totalMonthly = OtpLog::whereBetween('created_at', [$startOfMonth, $endOfMonth])->count();
        $verifiedMonthly = OtpLog::whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->where('status', 'verified')
            ->count();
        $globalSuccessRate = $totalMonthly > 0 ? round(($verifiedMonthly / $totalMonthly) * 100, 1) : 0;

        $whatsappTotal = OtpLog::whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->where('channel', 'whatsapp')
            ->count();
        $textlkTotal = OtpLog::whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->where('channel', 'textlk')
            ->count();

        // 3. Recent Failures
        $recentFailures = OtpLog::whereIn('status', ['failed', 'expired'])
            ->orderBy('id', 'desc')
            ->limit(25)
            ->get()
            ->map(function (OtpLog $log) use ($tenants) {
                $tenant = $tenants->get($log->tenant_id);

                return [
                    'id' => $log->id,
                    'clinic_name' => $tenant ? ($tenant->clinic_name ?? $tenant->id) : 'Direct / Central',
                    'channel' => $log->channel,
                    'phone_masked' => $log->phone_masked,
                    'status' => $log->status,
                    'error' => $log->error ?? 'Delivery or code verification failed',
                    'created_at' => $log->created_at?->diffForHumans() ?? 'Just now',
                    'timestamp' => $log->created_at?->toIso8601String(),
                ];
            });

        return Inertia::render('SuperAdmin/OtpUsage', [
            'selectedMonth' => $selectedMonth,
            'summary' => [
                'total' => $totalMonthly,
                'verified' => $verifiedMonthly,
                'success_rate' => $globalSuccessRate,
                'whatsapp_count' => $whatsappTotal,
                'textlk_count' => $textlkTotal,
            ],
            'clinicStats' => $clinicStats,
            'recentFailures' => $recentFailures,
        ]);
    }
}
