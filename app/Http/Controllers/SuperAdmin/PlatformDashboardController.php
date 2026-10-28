<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\BookingToken;
use App\Models\Lead;
use App\Models\Medicine;
use App\Models\PaymentTransaction;
use App\Models\Subscription;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PlatformDashboardController extends Controller
{
    /**
     * Display the Platform Owner Morning Dashboard.
     */
    public function index(Request $request): Response
    {
        $now = Carbon::now('Asia/Colombo');
        $startOfMonth = $now->copy()->startOfMonth();
        $todayDate = $now->toDateString();

        // 1. Core KPIs
        // A. MRR: Active paid subscriptions only (exclude comp, trials, past due beyond grace, and cancelled; exclude demo tenant)
        $activePaidSubs = Subscription::with('plan')
            ->where('status', 'active')
            ->whereHas('tenant', fn ($q) => $q->where('is_demo', false))
            ->whereHas('plan', fn ($q) => $q->where('price_cents', '>', 0)->where('slug', '!=', 'comp'))
            ->get();

        $mrrCents = $activePaidSubs->sum(function ($sub) {
            $price = $sub->plan?->price_cents ?? 0;
            if ($sub->plan?->billing_interval === 'year') {
                return (int) round($price / 12);
            }

            return $price;
        });
        $mrrLkr = round($mrrCents / 100, 2);

        // B. Active Paying Clinics (excluding demo)
        $activePayingClinicsCount = $activePaidSubs->pluck('tenant_id')->unique()->count();

        // C. Active Trials (excluding demo)
        $activeTrialsCount = Tenant::where('is_demo', false)
            ->where(function ($q) use ($now) {
                $q->where('status', 'trial')
                    ->orWhere('status', 'trialing')
                    ->orWhere(function ($sq) use ($now) {
                        $sq->whereNotNull('trial_ends_at')->where('trial_ends_at', '>', $now);
                    });
            })
            ->where('status', '!=', 'suspended')
            ->count();

        // D. Past Due / Payment Due (excluding demo)
        $pastDueCount = Subscription::whereHas('tenant', fn ($q) => $q->where('is_demo', false))
            ->where(function ($q) {
                $q->whereIn('status', ['past_due', 'unpaid'])
                    ->orWhereHas('invoices', fn ($iq) => $iq->where('is_test', false)->where('status', 'past_due'));
            })
            ->pluck('tenant_id')
            ->unique()
            ->count();

        // E. New Clinics This Month (excluding demo)
        $newClinicsThisMonth = Tenant::where('is_demo', false)->where('created_at', '>=', $startOfMonth)->count();

        // F. Churned This Month (excluding demo)
        $churnedThisMonth = Subscription::whereHas('tenant', fn ($q) => $q->where('is_demo', false))
            ->where('status', 'cancelled')
            ->where('cancelled_at', '>=', $startOfMonth)
            ->count();

        // G. Tokens Issued Today Across Real Clinics (excluding demo)
        $tokensIssuedToday = BookingToken::whereHas('tenant', fn ($q) => $q->where('is_demo', false))
            ->where(function ($q) use ($todayDate) {
                $q->whereDate('created_at', $todayDate)
                    ->orWhereHas('doctorSession', fn ($sq) => $sq->where('session_date', $todayDate));
            })
            ->count();

        // H. Failed Payments in last 7 days (excluding test/demo)
        $failedPayments7d = PaymentTransaction::where('status', 'failed')
            ->where('created_at', '>=', $now->copy()->subDays(7))
            ->whereHas('tenant', fn ($q) => $q->where('is_demo', false))
            ->count();

        // 2. Trend Charts
        // A. 12 Months MRR Trend (excluding demo)
        $mrrTrend = [];
        for ($i = 11; $i >= 0; $i--) {
            $monthDate = $now->copy()->subMonths($i);
            $monthKey = $monthDate->format('M Y');
            $monthEnd = $monthDate->copy()->endOfMonth();

            $subsAtMonth = Subscription::with('plan')
                ->whereHas('tenant', fn ($q) => $q->where('is_demo', false))
                ->where('created_at', '<=', $monthEnd)
                ->where(function ($q) use ($monthEnd) {
                    $q->whereNull('cancelled_at')->orWhere('cancelled_at', '>', $monthEnd);
                })
                ->whereHas('plan', fn ($q) => $q->where('price_cents', '>', 0)->where('slug', '!=', 'comp'))
                ->get();

            $monthMrrCents = $subsAtMonth->sum(fn ($s) => $s->plan?->price_cents ?? 0);
            $mrrTrend[] = [
                'month' => $monthKey,
                'mrr' => round($monthMrrCents / 100, 2),
            ];
        }

        // B. New vs Churned Clinics per Month (Last 6 Months, excluding demo)
        $clinicGrowthTrend = [];
        for ($i = 5; $i >= 0; $i--) {
            $mStart = $now->copy()->subMonths($i)->startOfMonth();
            $mEnd = $now->copy()->subMonths($i)->endOfMonth();
            $mLabel = $mStart->format('M');

            $newCount = Tenant::where('is_demo', false)->whereBetween('created_at', [$mStart, $mEnd])->count();
            $churnCount = Subscription::whereHas('tenant', fn ($q) => $q->where('is_demo', false))->whereBetween('cancelled_at', [$mStart, $mEnd])->count();

            $clinicGrowthTrend[] = [
                'month' => $mLabel,
                'new' => $newCount,
                'churned' => $churnCount,
            ];
        }

        // C. Tokens Per Day (Last 30 Days, excluding demo)
        $tokensPerDay = [];
        for ($i = 29; $i >= 0; $i--) {
            $d = $now->copy()->subDays($i)->toDateString();
            $dayLabel = Carbon::parse($d)->format('d M');
            $count = BookingToken::whereHas('tenant', fn ($q) => $q->where('is_demo', false))
                ->whereDate('created_at', $d)
                ->count();

            $tokensPerDay[] = [
                'date' => $dayLabel,
                'tokens' => $count,
            ];
        }

        // 3. Needs Attention Radar
        $needsAttention = [];

        // Failed Payments
        $failedTx = PaymentTransaction::with(['tenant', 'invoice'])
            ->where('status', 'failed')
            ->where('created_at', '>=', $now->copy()->subDays(7))
            ->latest('id')
            ->limit(5)
            ->get();
        foreach ($failedTx as $tx) {
            $needsAttention[] = [
                'id' => 'tx-'.$tx->id,
                'type' => 'failed_payment',
                'severity' => 'critical',
                'title' => 'Payment Failed: '.($tx->tenant?->name ?? 'Clinic'),
                'description' => "Invoice #{$tx->invoice?->invoice_number} failed via {$tx->gateway} ({$tx->formatted_amount})",
                'action_label' => 'View Invoices',
                'action_url' => '/super-admin/subscriptions',
                'timestamp' => $tx->created_at?->diffForHumans(),
            ];
        }

        // Expiring Subscriptions in 7 days (excluding demo)
        $expiringSubs = Subscription::with(['tenant', 'plan'])
            ->where('status', 'active')
            ->whereHas('tenant', fn ($q) => $q->where('is_demo', false))
            ->whereBetween('current_period_end', [$now, $now->copy()->addDays(7)])
            ->get();
        foreach ($expiringSubs as $sub) {
            $needsAttention[] = [
                'id' => 'sub-'.$sub->id,
                'type' => 'expiring_subscription',
                'severity' => 'warning',
                'title' => 'Renewal Due Soon: '.($sub->tenant?->name ?? 'Clinic'),
                'description' => "Period ends {$sub->current_period_end?->format('M d, Y')} ({$sub->plan?->name})",
                'action_label' => 'Manage',
                'action_url' => "/super-admin/clinics/{$sub->tenant_id}",
                'timestamp' => $sub->current_period_end?->diffForHumans(),
            ];
        }

        // Trials Ending in 3 days (excluding demo)
        $expiringTrials = Tenant::where('is_demo', false)
            ->where(function ($q) use ($now) {
                $q->whereBetween('trial_ends_at', [$now, $now->copy()->addDays(3)]);
            })
            ->where('status', '!=', 'suspended')
            ->limit(5)
            ->get();
        foreach ($expiringTrials as $t) {
            $needsAttention[] = [
                'id' => 'trial-'.$t->id,
                'type' => 'trial_ending',
                'severity' => 'warning',
                'title' => 'Trial Expiring: '.$t->name,
                'description' => "Trial ends in {$now->diffInDays($t->trial_ends_at)} days ({$t->phone})",
                'action_label' => 'Extend Trial',
                'action_url' => "/super-admin/clinics/{$t->id}",
                'timestamp' => $t->trial_ends_at?->diffForHumans(),
            ];
        }

        // Pending Medicine Catalog Reviews
        $pendingReviewsCount = Medicine::where('status', 'pending')->count();
        if ($pendingReviewsCount > 0) {
            $needsAttention[] = [
                'id' => 'medicine-reviews',
                'type' => 'medicine_review',
                'severity' => 'info',
                'title' => "{$pendingReviewsCount} Medicine Catalog Submissions",
                'description' => 'Clinic-submitted medicines waiting for super admin review and approval.',
                'action_label' => 'Review Queue',
                'action_url' => '/super-admin/medicines?status=pending',
                'timestamp' => 'Action required',
            ];
        }

        // Failed Queue Jobs
        $failedJobsCount = DB::table('failed_jobs')->count();
        if ($failedJobsCount > 0) {
            $needsAttention[] = [
                'id' => 'failed-jobs',
                'type' => 'queue_jobs',
                'severity' => 'critical',
                'title' => "{$failedJobsCount} Failed Background Jobs",
                'description' => 'Background queues contain unhandled job failures needing review or retry.',
                'action_label' => 'System Health',
                'action_url' => '/super-admin/system-health',
                'timestamp' => 'Action required',
            ];
        }

        // Leads Follow-ups Due Today or Overdue
        $dueLeadsCount = Lead::dueFollowUp()->count();
        if ($dueLeadsCount > 0) {
            $needsAttention[] = [
                'id' => 'lead-follow-ups',
                'type' => 'lead_follow_up',
                'severity' => 'warning',
                'title' => "{$dueLeadsCount} Lead Follow-ups Due",
                'description' => 'Prospective clinic leads have follow-up calls or demos scheduled for today.',
                'action_label' => 'View Leads CRM',
                'action_url' => '/super-admin/leads?follow_up=due_today',
                'timestamp' => 'Scheduled today',
            ];
        }

        // 4. Recent Platform Activity Feed
        $recentActivity = AuditEvent::with('user')
            ->latest('id')
            ->limit(10)
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'event' => $e->event_name,
                'actor' => $e->user?->name ?? 'System',
                'tenant_id' => $e->tenant_id,
                'metadata' => $e->metadata,
                'created_at_human' => $e->created_at?->diffForHumans(),
            ]);

        return Inertia::render('SuperAdmin/Dashboard', [
            'kpis' => [
                'mrr_lkr' => $mrrLkr,
                'mrr_formatted' => 'Rs. '.number_format($mrrLkr, 2),
                'active_paying_clinics' => $activePayingClinicsCount,
                'active_trials' => $activeTrialsCount,
                'past_due' => $pastDueCount,
                'new_clinics_this_month' => $newClinicsThisMonth,
                'churned_this_month' => $churnedThisMonth,
                'tokens_issued_today' => $tokensIssuedToday,
                'failed_payments_7d' => $failedPayments7d,
            ],
            'charts' => [
                'mrr_trend' => $mrrTrend,
                'clinic_growth' => $clinicGrowthTrend,
                'tokens_per_day' => $tokensPerDay,
            ],
            'needsAttention' => $needsAttention,
            'recentActivity' => $recentActivity,
            'pendingMedicineReviewsCount' => $pendingReviewsCount,
        ]);
    }
}
