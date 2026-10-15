<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
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

        // 4. Overall KPIs
        $todayPatientsCount = BookingToken::whereHas('session', fn ($q) => $q->where('session_date', $today))
            ->whereNotIn('status', [BookingToken::STATUS_CANCELLED])
            ->distinct('patient_id')
            ->count('patient_id');

        $todayBills = Bill::whereDate('created_at', $today)->where('payment_status', Bill::STATUS_PAID)->get();
        $todayCollectionsCents = (int) $todayBills->sum('total_amount');
        $todayDoctorFeesCents = (int) $todayBills->sum('doctor_fee');
        $todayClinicFeesCents = (int) $todayBills->sum('clinic_fee');

        // 5. Upcoming Sessions (next 7 days)
        $upcomingSessions = DoctorSession::with('doctor')
            ->where('session_date', '>=', $today)
            ->where('session_date', '<=', Carbon::parse($today)->addDays(7)->toDateString())
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->limit(5)
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'doctor_name' => $s->doctor?->name ?? 'Specialist',
                'specialty' => $s->doctor?->specialty ?? 'General',
                'date' => $s->session_date->format('M d, D'),
                'start_time' => Carbon::parse($s->start_time)->format('h:i A'),
                'end_time' => Carbon::parse($s->end_time)->format('h:i A'),
                'room_number' => $s->room_number ?? 'Consultation Suite',
                'status' => $s->status,
                'booked_tokens_count' => $s->booked_tokens_count,
                'max_tokens' => $s->max_tokens,
                'fee_formatted' => 'Rs. '.number_format(($s->doctor_fee + $s->clinic_fee) / 100, 2),
            ]);

        // 6. Recent bookings
        $recentBookings = BookingToken::with(['session.doctor', 'patient'])
            ->latest('created_at')
            ->limit(5)
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'token_number' => $b->token_number,
                'patient_name' => $b->patient?->name ?? 'Patient',
                'doctor_name' => $b->session?->doctor?->name ?? 'Doctor',
                'session_date' => $b->session?->session_date?->format('M d') ?? '',
                'estimated_time' => $b->estimated_time?->format('h:i A') ?? '',
                'status' => $b->status,
                'booked_via' => $b->booked_via,
                'created_at_human' => $b->created_at->diffForHumans(),
            ]);

        // 7. Onboarding Checklist
        $doctorsCount = Doctor::count();
        $sessionsCount = DoctorSession::count();
        $staffCount = User::where('tenant_id', $tenantId)->count();
        $tokensCount = BookingToken::count();
        $websitePublished = (bool) (tenant('website_published') ?? false);

        $checklist = [
            'add_doctor' => $doctorsCount > 0,
            'create_schedule' => $sessionsCount > 0,
            'invite_staff' => $staffCount > 1,
            'publish_website' => $websitePublished,
            'take_first_booking' => $tokensCount > 0,
        ];

        $completedSteps = count(array_filter($checklist));
        $checklistPercentage = (int) round(($completedSteps / 5) * 100);

        return Inertia::render('Dashboard', [
            'tenant' => [
                'id' => tenant('id'),
                'name' => ucwords((string) (tenant('name') ?? 'Clinic Workspace')),
                'subdomain' => tenant('subdomain') ?? 'clinic',
                'logo_url' => tenant('logo_url') ?? null,
                'currency' => config('medvisit.currency', 'LKR'),
                'currency_symbol' => config('medvisit.currency_symbol', 'Rs.'),
                'base_domain' => config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost')),
            ],
            'userRole' => $isClinicAdmin ? 'clinic_admin' : ($isDoctor ? 'doctor' : 'receptionist'),
            'stats' => [
                'todayPatientsCount' => $todayPatientsCount,
                'waitingCount' => $waitingCount,
                'activeSessionsCount' => $todaySessions->count(),
                'todayCollections' => 'Rs. '.number_format($todayCollectionsCents / 100, 2),
                'todayDoctorFees' => 'Rs. '.number_format($todayDoctorFeesCents / 100, 2),
                'todayClinicFees' => 'Rs. '.number_format($todayClinicFeesCents / 100, 2),
            ],
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
            'recentBookings' => $recentBookings,
            'checklist' => [
                'items' => $checklist,
                'completedCount' => $completedSteps,
                'totalCount' => 5,
                'percentage' => $checklistPercentage,
            ],
        ]);
    }
}
