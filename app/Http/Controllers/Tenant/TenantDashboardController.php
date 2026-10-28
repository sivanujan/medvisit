<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Subscription;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TenantDashboardController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $tenantId = tenant('id');

        $today = Carbon::today('Asia/Colombo')->toDateString();

        // 1. Determine user role
        $isDoctor = $user->hasRole('doctor');
        $isReceptionist = $user->hasRole('receptionist');
        $isClinicAdmin = $user->hasRole('clinic_admin') || (! $isDoctor && ! $isReceptionist);

        // Find linked doctor profile if role is doctor
        $linkedDoctor = $isDoctor ? Doctor::where('user_id', $user->id)->first() : null;

        // 2. Query today's sessions (filtered if doctor)
        $todaySessionsQuery = DoctorSession::with(['doctor', 'tokens.patient'])
            ->where('session_date', $today);

        if ($isDoctor && $linkedDoctor) {
            $todaySessionsQuery->where('doctor_id', $linkedDoctor->id);
        }

        $todaySessions = $todaySessionsQuery->orderBy('start_time')->get();

        // Active session: one that is 'in_progress', or the next 'scheduled' today
        $activeSession = $todaySessions->firstWhere('status', 'in_progress')
            ?? $todaySessions->firstWhere('status', 'scheduled')
            ?? $todaySessions->first();

        // 3. Active queue metrics for active session
        $nowServingToken = null;
        $nextInLine = [];
        $waitingCount = 0;
        $queueTokens = [];

        if ($activeSession) {
            $allTokens = $activeSession->tokens;

            // Now serving
            $nowServing = $allTokens->firstWhere('token_number', $activeSession->current_token_number)
                ?? $allTokens->firstWhere('status', BookingToken::STATUS_IN_CONSULTATION)
                ?? $allTokens->firstWhere('status', BookingToken::STATUS_CALLED);

            if ($nowServing) {
                $nowServingToken = [
                    'id' => $nowServing->id,
                    'token_number' => $nowServing->token_number,
                    'patient_name' => $nowServing->patient?->name ?? 'Patient',
                    'patient_phone' => $nowServing->patient?->phone ?? '',
                    'status' => $nowServing->status,
                    'estimated_time' => $nowServing->estimated_time?->format('H:i') ?? '',
                ];
            }

            // Next in line (tokens checked in or booked that haven't been completed/cancelled)
            $nextInLineTokens = $allTokens->filter(function ($t) use ($activeSession) {
                return $t->token_number > $activeSession->current_token_number
                    && in_array($t->status, [BookingToken::STATUS_CALLED, BookingToken::STATUS_CHECKED_IN, BookingToken::STATUS_BOOKED]);
            })->take(3);

            foreach ($nextInLineTokens as $nt) {
                $nextInLine[] = [
                    'id' => $nt->id,
                    'token_number' => $nt->token_number,
                    'patient_name' => $nt->patient?->name ?? 'Patient',
                    'status' => $nt->status,
                    'estimated_time' => $nt->estimated_time?->format('H:i') ?? '',
                ];
            }

            $waitingCount = $allTokens->filter(fn ($t) => in_array($t->status, [BookingToken::STATUS_BOOKED, BookingToken::STATUS_CHECKED_IN]))->count();

            $queueTokens = $allTokens->map(fn ($t) => [
                'id' => $t->id,
                'token_number' => $t->token_number,
                'patient_name' => $t->patient?->name ?? 'Patient',
                'patient_phone' => $t->patient?->phone ?? '',
                'status' => $t->status,
                'booked_via' => $t->booked_via,
                'estimated_time' => $t->estimated_time?->format('h:i A') ?? '',
            ]);
        }

        // 4. Overall KPIs with 7-day sparklines and yesterday comparison
        $sevenDaysAgo = Carbon::today('Asia/Colombo')->subDays(6)->toDateString();
        $yesterday = Carbon::yesterday('Asia/Colombo')->toDateString();

        $todayPatientsCount = BookingToken::whereHas('session', fn ($q) => $q->where('session_date', $today))
            ->whereNotIn('status', [BookingToken::STATUS_CANCELLED])
            ->distinct('patient_id')
            ->count('patient_id');

        $yesterdayPatientsCount = BookingToken::whereHas('session', fn ($q) => $q->where('session_date', $yesterday))
            ->whereNotIn('status', [BookingToken::STATUS_CANCELLED])
            ->distinct('patient_id')
            ->count('patient_id');

        $dailyPatients = BookingToken::whereHas('session', fn ($q) => $q->whereBetween('session_date', [$sevenDaysAgo, $today]))
            ->whereNotIn('booking_tokens.status', [BookingToken::STATUS_CANCELLED])
            ->selectRaw('session_date, count(distinct patient_id) as count')
            ->join('doctor_sessions', 'booking_tokens.doctor_session_id', '=', 'doctor_sessions.id')
            ->groupBy('session_date')
            ->pluck('count', 'session_date')
            ->toArray();

        $todayBills = Bill::whereDate('created_at', $today)->where('payment_status', Bill::STATUS_PAID)->get();
        $todayCollectionsCents = (int) $todayBills->sum('total_amount');
        $todayDoctorFeesCents = (int) $todayBills->sum('doctor_fee');
        $todayClinicFeesCents = (int) $todayBills->sum('clinic_fee');

        $yesterdayCollectionsCents = (int) Bill::whereDate('created_at', $yesterday)
            ->where('payment_status', Bill::STATUS_PAID)
            ->sum('total_amount');

        $dailyCollections = Bill::whereDate('created_at', '>=', $sevenDaysAgo)
            ->where('payment_status', Bill::STATUS_PAID)
            ->selectRaw('DATE(created_at) as date, sum(total_amount) as total')
            ->groupBy('date')
            ->pluck('total', 'date')
            ->toArray();

        $yesterdaySessionsCount = DoctorSession::where('session_date', $yesterday)->count();

        $dailySessions = DoctorSession::whereBetween('session_date', [$sevenDaysAgo, $today])
            ->selectRaw('session_date, count(*) as count')
            ->groupBy('session_date')
            ->pluck('count', 'session_date')
            ->toArray();

        // Build 7-day sparkline arrays
        $patientsSparkline = [];
        $collectionsSparkline = [];
        $sessionsSparkline = [];
        for ($i = 6; $i >= 0; $i--) {
            $dateKey = Carbon::today('Asia/Colombo')->subDays($i)->toDateString();
            $patientsSparkline[] = (int) ($dailyPatients[$dateKey] ?? 0);
            $collectionsSparkline[] = round(((int) ($dailyCollections[$dateKey] ?? 0)) / 100, 2);
            $sessionsSparkline[] = (int) ($dailySessions[$dateKey] ?? 0);
        }

        $calcTrend = function (int $todayVal, int $yesterdayVal): int {
            if ($yesterdayVal === 0) {
                return $todayVal > 0 ? 100 : 0;
            }

            return (int) round((($todayVal - $yesterdayVal) / $yesterdayVal) * 100);
        };

        $patientsTrend = $calcTrend($todayPatientsCount, $yesterdayPatientsCount);
        $collectionsTrend = $calcTrend($todayCollectionsCents, $yesterdayCollectionsCents);
        $sessionsTrend = $calcTrend($todaySessions->count(), $yesterdaySessionsCount);

        // 5. Timeline sessions (for horizontal day timeline)
        $timelineSessions = $todaySessions->map(function ($s) {
            $start = Carbon::parse($s->start_time);
            $end = Carbon::parse($s->end_time);

            return [
                'id' => $s->id,
                'doctor_id' => $s->doctor_id,
                'doctor_name' => $s->doctor?->name ?? 'Specialist',
                'specialty' => $s->doctor?->specialty ?? 'General Practitioner',
                'room_number' => $s->room_number ?? 'Suite 1',
                'start_time' => $start->format('h:i A'),
                'end_time' => $end->format('h:i A'),
                'start_minutes' => $start->hour * 60 + $start->minute,
                'end_minutes' => $end->hour * 60 + $end->minute,
                'status' => $s->status,
                'current_token_number' => $s->current_token_number,
                'booked_tokens_count' => $s->booked_tokens_count,
                'max_tokens' => $s->max_tokens,
            ];
        });

        // 6. Live running sessions (mini TV cards)
        $runningSessions = $todaySessions->filter(fn ($s) => $s->status === 'in_progress' || $s->status === 'scheduled')
            ->values()
            ->map(function ($s) {
                $allTokens = $s->tokens;
                $serving = $allTokens->firstWhere('token_number', $s->current_token_number)
                    ?? $allTokens->firstWhere('status', BookingToken::STATUS_IN_CONSULTATION)
                    ?? $allTokens->firstWhere('status', BookingToken::STATUS_CALLED);

                $next3 = $allTokens->filter(fn ($t) => $t->token_number > $s->current_token_number && in_array($t->status, [BookingToken::STATUS_CALLED, BookingToken::STATUS_CHECKED_IN, BookingToken::STATUS_BOOKED]))
                    ->take(3)
                    ->map(fn ($t) => [
                        'token_number' => $t->token_number,
                        'patient_name' => $t->patient?->name ?? 'Patient',
                        'estimated_time' => $t->estimated_time?->format('h:i A') ?? '',
                    ]);

                $waiting = $allTokens->filter(fn ($t) => in_array($t->status, [BookingToken::STATUS_BOOKED, BookingToken::STATUS_CHECKED_IN]))->count();

                return [
                    'id' => $s->id,
                    'doctor_name' => $s->doctor?->name ?? 'Specialist',
                    'specialty' => $s->doctor?->specialty ?? 'General',
                    'room_number' => $s->room_number ?? 'Suite 1',
                    'status' => $s->status,
                    'current_token_number' => $s->current_token_number,
                    'nowServing' => $serving ? [
                        'token_number' => $serving->token_number,
                        'patient_name' => $serving->patient?->name ?? 'Patient',
                        'status' => $serving->status,
                    ] : null,
                    'nextInLine' => $next3->values()->all(),
                    'waitingCount' => $waiting,
                    'estimatedWaitMinutes' => $waiting * 10,
                ];
            });

        // 7. Upcoming Sessions (next 7 days)
        $upcomingSessions = DoctorSession::with('doctor')
            ->where('session_date', '>=', $today)
            ->where('session_date', '<=', Carbon::parse($today)->addDays(7)->toDateString())
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->limit(6)
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'doctor_name' => $s->doctor?->name ?? 'Specialist',
                'specialty' => $s->doctor?->specialty ?? 'General',
                'date' => $s->session_date->format('M d, D'),
                'raw_date' => $s->session_date->format('Y-m-d'),
                'start_time' => Carbon::parse($s->start_time)->format('h:i A'),
                'end_time' => Carbon::parse($s->end_time)->format('h:i A'),
                'room_number' => $s->room_number ?? 'Consultation Suite',
                'status' => $s->status,
                'booked_tokens_count' => $s->booked_tokens_count,
                'max_tokens' => $s->max_tokens,
                'fee_formatted' => 'Rs. '.number_format(($s->doctor_fee + $s->clinic_fee) / 100, 2),
            ]);

        // 8. Dynamic Operational Alerts
        $alerts = [];
        $nowColombo = Carbon::now('Asia/Colombo');
        foreach ($todaySessions as $s) {
            if ($s->status === 'scheduled') {
                $sessionStart = Carbon::parse($today.' '.$s->start_time, 'Asia/Colombo');
                $diff = $nowColombo->diffInMinutes($sessionStart, false);
                if ($diff > 0 && $diff <= 45 && $s->booked_tokens_count === 0) {
                    $alerts[] = [
                        'id' => "alert-session-{$s->id}",
                        'type' => 'warning',
                        'title' => "Dr. {$s->doctor?->name} session starts in {$diff} min with 0 bookings",
                        'message' => "Room {$s->room_number} is scheduled for ".Carbon::parse($s->start_time)->format('h:i A').' but no tokens are booked yet.',
                        'action_label' => 'Open Calendar',
                        'action_href' => '/calendar',
                    ];
                }
            }
        }

        $tenantModel = tenant();
        $subscription = $tenantModel ? Subscription::where('tenant_id', $tenantModel->id)->first() : null;
        if ($subscription && $subscription->current_period_end) {
            $daysLeft = (int) $nowColombo->diffInDays($subscription->current_period_end, false);
            if ($daysLeft >= 0 && $daysLeft <= 5) {
                $alerts[] = [
                    'id' => 'alert-sub-renewal',
                    'type' => 'info',
                    'title' => "Subscription renews in {$daysLeft} ".($daysLeft === 1 ? 'day' : 'days'),
                    'message' => "Your clinic's plan renews automatically on ".$subscription->current_period_end->format('d M Y').'.',
                    'action_label' => 'Billing Center',
                    'action_href' => '/settings/billing',
                ];
            }
        }

        if (! ($tenantModel->website_published ?? false)) {
            $alerts[] = [
                'id' => 'alert-website-offline',
                'type' => 'notice',
                'title' => 'Online patient booking is offline',
                'message' => 'Your clinic public booking website is currently unpublished. Patients cannot discover or book appointments online.',
                'action_label' => 'Publish Website',
                'action_href' => '/website',
            ];
        }

        // 9. Onboarding Checklist
        $doctorsCount = Doctor::count();
        $sessionsCount = DoctorSession::count();
        $staffCount = User::where('tenant_id', $tenantId)->count();
        $tokensCount = BookingToken::count();
        $websitePublished = (bool) ($tenantModel->website_published ?? false);

        $checklist = [
            'add_doctor' => $doctorsCount > 0,
            'create_schedule' => $sessionsCount > 0,
            'invite_staff' => $staffCount > 1,
            'publish_website' => $websitePublished,
            'take_first_booking' => $tokensCount > 0,
        ];

        $completedSteps = count(array_filter($checklist));
        $checklistPercentage = (int) round(($completedSteps / 5) * 100);

        $publicDomain = config('medvisit.public_domain', 'medvisit.lk');
        $publicClinicUrl = "https://{$tenantModel->subdomain}.{$publicDomain}";

        return Inertia::render('Dashboard', [
            'tenant' => [
                'id' => tenant('id'),
                'name' => ucwords((string) (tenant('name') ?? 'Clinic Workspace')),
                'subdomain' => tenant('subdomain') ?? 'clinic',
                'logo_url' => tenant('logo_url') ?? null,
                'plan' => $tenantModel->currentPlanDisplayName(),
                'status' => $tenantModel->status,
                'subscription_days_left' => rescue(function () use ($tenantModel) {
                    $sub = $tenantModel->subscription;

                    return ($sub && $sub->current_period_end) ? (int) now()->diffInDays($sub->current_period_end, false) : null;
                }, null, false),
                'pharmacy_enabled' => (bool) ($tenantModel->pharmacy_enabled ?? false),
                'currency' => config('medvisit.currency', 'LKR'),
                'currency_symbol' => config('medvisit.currency_symbol', 'Rs.'),
                'base_domain' => config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost')),
                'public_domain' => $publicDomain,
                'public_clinic_url' => $publicClinicUrl,
            ],
            'userRole' => $isClinicAdmin ? 'clinic_admin' : ($isDoctor ? 'doctor' : 'receptionist'),
            'canViewMoney' => $isClinicAdmin || $isReceptionist,
            'stats' => [
                'todayPatientsCount' => $todayPatientsCount,
                'patientsTrend' => $patientsTrend,
                'patientsSparkline' => $patientsSparkline,
                'waitingCount' => $waitingCount,
                'activeSessionsCount' => $todaySessions->count(),
                'sessionsTrend' => $sessionsTrend,
                'sessionsSparkline' => $sessionsSparkline,
                'todayCollections' => 'Rs. '.number_format($todayCollectionsCents / 100, 2),
                'collectionsTrend' => $collectionsTrend,
                'collectionsSparkline' => $collectionsSparkline,
                'todayDoctorFees' => 'Rs. '.number_format($todayDoctorFeesCents / 100, 2),
                'todayClinicFees' => 'Rs. '.number_format($todayClinicFeesCents / 100, 2),
            ],
            'timelineSessions' => $timelineSessions,
            'runningSessions' => $runningSessions,
            'activeSession' => $activeSession ? [
                'id' => $activeSession->id,
                'doctor_name' => $activeSession->doctor?->name ?? 'Specialist',
                'specialty' => $activeSession->doctor?->specialty ?? 'General',
                'room_number' => $activeSession->room_number ?? 'Suite 1',
                'time_range' => Carbon::parse($activeSession->start_time)->format('h:i A').' - '.Carbon::parse($activeSession->end_time)->format('h:i A'),
                'current_token_number' => $activeSession->current_token_number,
                'booked_tokens_count' => $activeSession->booked_tokens_count,
                'max_tokens' => $activeSession->max_tokens,
                'status' => $activeSession->status,
            ] : null,
            'queue' => [
                'nowServing' => $nowServingToken,
                'nextInLine' => $nextInLine,
                'tokens' => $queueTokens,
            ],
            'upcomingSessions' => $upcomingSessions,
            'alerts' => $alerts,
            'checklist' => [
                'items' => $checklist,
                'completedCount' => $completedSteps,
                'totalCount' => 5,
                'percentage' => $checklistPercentage,
                'publicClinicUrl' => $publicClinicUrl,
            ],
        ]);
    }
}
