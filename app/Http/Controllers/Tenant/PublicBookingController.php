<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Mail\BookingConfirmationMail;
use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\PhoneVerification;
use App\Models\Tenant;
use App\Models\VisitType;
use App\Services\FeeResolutionService;
use App\Services\PhoneVerification\PhoneVerificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PublicBookingController extends Controller
{
    public function __construct(
        protected FeeResolutionService $feeService,
        protected PhoneVerificationService $verificationService
    ) {}

    /**
     * Step 1: Choose Doctor (GET /book)
     */
    public function index(Request $request): Response
    {
        $tenant = tenant();
        $today = Carbon::today('Asia/Colombo')->toDateString();

        $doctors = Doctor::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(function (Doctor $doc) use ($tenant, $today) {
                // Find next available open session
                $nextSession = DoctorSession::where('tenant_id', $tenant->id)
                    ->where('doctor_id', $doc->id)
                    ->where('session_date', '>=', $today)
                    ->whereNotIn('status', ['cancelled'])
                    ->orderBy('session_date')
                    ->orderBy('start_time')
                    ->get()
                    ->first(function (DoctorSession $s) use ($tenant) {
                        $reserve = (int) ($tenant->walk_in_reserved_tokens ?? 0);
                        $booked = $s->tokens()->whereNotIn('status', ['cancelled'])->count();

                        return ($s->max_tokens - $reserve - $booked) > 0;
                    });

                $nextAvailableFormatted = null;
                if ($nextSession) {
                    $sDate = $nextSession->session_date instanceof Carbon ? $nextSession->session_date : Carbon::parse($nextSession->session_date);
                    $now = Carbon::today('Asia/Colombo');
                    $timeFormatted = Carbon::parse($nextSession->start_time)->format('h:i A');

                    if ($sDate->isToday()) {
                        $nextAvailableFormatted = "Today, {$timeFormatted}";
                    } elseif ($sDate->isTomorrow()) {
                        $nextAvailableFormatted = "Tomorrow, {$timeFormatted}";
                    } else {
                        $nextAvailableFormatted = $sDate->format('D, M d').", {$timeFormatted}";
                    }
                }

                $minFee = ($doc->doctor_fee + $doc->clinic_fee);
                $minFeeFormatted = 'from Rs. '.number_format($minFee / 100, 0);

                return [
                    'id' => $doc->id,
                    'name' => $doc->name,
                    'title' => $doc->title ?? 'Dr.',
                    'full_title' => trim(($doc->title ?? 'Dr.').' '.$doc->name),
                    'specialty' => $doc->specialty,
                    'slmc_number' => $doc->slmc_number,
                    'slug' => $doc->slug,
                    'photo_url' => $doc->photo_url,
                    'bio' => $doc->bio,
                    'min_fee_formatted' => $minFeeFormatted,
                    'next_available' => $nextAvailableFormatted,
                    'avg_consultation_minutes' => $doc->avg_consultation_minutes ?: 10,
                    'direct_url' => "/book/{$doc->slug}",
                ];
            });

        $specialties = $doctors->pluck('specialty')->unique()->values()->all();
        $allowAnyDoctor = (bool) ($tenant->allow_any_doctor ?? false);

        return Inertia::render('Public/Booking/DoctorSelect', [
            'clinic' => $this->getClinicPayload($tenant),
            'headerConfig' => $tenant->website_header,
            'footerConfig' => $tenant->website_footer,
            'theme' => $tenant->website_theme ?? 'medvisit-teal',
            'doctors' => $doctors,
            'specialties' => $specialties,
            'allowAnyDoctor' => $allowAnyDoctor,
        ]);
    }

    /**
     * Step 2: Pick Date & Session (GET /book/{doctor-slug})
     */
    public function showDoctor(Request $request, string $slug): Response
    {
        $tenant = tenant();
        $isAny = $slug === 'any';

        $doctor = null;
        if (! $isAny) {
            $doctor = Doctor::where('tenant_id', $tenant->id)
                ->where('slug', $slug)
                ->where('is_active', true)
                ->firstOrFail();
        }

        $now = Carbon::now('Asia/Colombo');
        $initialYear = (int) $request->input('year', $now->year);
        $initialMonth = (int) $request->input('month', $now->month);

        $availability = $this->buildMonthAvailability($tenant, $doctor, $initialYear, $initialMonth);

        // Find the first date with open sessions
        $firstAvailableDate = null;
        foreach ($availability as $dateKey => $dayData) {
            if ($dayData['has_sessions'] && ! $dayData['is_full']) {
                $firstAvailableDate = $dateKey;
                break;
            }
        }

        $doctorPayload = $doctor ? [
            'id' => $doctor->id,
            'name' => $doctor->name,
            'title' => $doctor->title ?? 'Dr.',
            'full_title' => trim(($doctor->title ?? 'Dr.').' '.$doctor->name),
            'specialty' => $doctor->specialty,
            'slmc_number' => $doctor->slmc_number,
            'slug' => $doctor->slug,
            'photo_url' => $doctor->photo_url,
            'bio' => $doctor->bio,
            'room' => $doctor->sessions()->whereNotNull('room_number')->value('room_number') ?? 'Consulting Room',
            'fee_formatted' => $doctor->formatted_fee,
            'avg_consultation_minutes' => $doctor->avg_consultation_minutes ?: 10,
        ] : [
            'id' => 0,
            'name' => 'Any Available Doctor',
            'title' => '',
            'full_title' => 'Any Available Doctor',
            'specialty' => 'General Consultation',
            'slmc_number' => 'SLMC Verified',
            'slug' => 'any',
            'photo_url' => null,
            'bio' => 'Book with the next available medical practitioner on duty.',
            'room' => 'Outpatient Department',
            'fee_formatted' => 'Standard Clinic Consultation',
            'avg_consultation_minutes' => 10,
        ];

        return Inertia::render('Public/Booking/CalendarSessionPicker', [
            'clinic' => $this->getClinicPayload($tenant),
            'headerConfig' => $tenant->website_header,
            'footerConfig' => $tenant->website_footer,
            'theme' => $tenant->website_theme ?? 'medvisit-teal',
            'doctor' => $doctorPayload,
            'initialYear' => $initialYear,
            'initialMonth' => $initialMonth,
            'initialAvailability' => $availability,
            'firstAvailableDate' => $firstAvailableDate,
        ]);
    }

    /**
     * Step 3: Your Details & Confirm (GET /book/{doctor-slug}/{session-id})
     */
    public function showSession(Request $request, string $slug, int $sessionId): Response|RedirectResponse
    {
        $tenant = tenant();
        $isAny = $slug === 'any';

        $session = DoctorSession::with('doctor')
            ->where('tenant_id', $tenant->id)
            ->where('id', $sessionId)
            ->whereNotIn('status', ['cancelled'])
            ->firstOrFail();

        $doctor = $session->doctor;
        if (! $isAny && $doctor->slug !== $slug) {
            return redirect("/book/{$doctor->slug}/{$sessionId}");
        }

        // Active tokens and check full
        $bookedCount = $session->tokens()->whereNotIn('status', ['cancelled'])->count();
        $reserve = (int) ($tenant->walk_in_reserved_tokens ?? 0);
        $availableTokens = max(0, $session->max_tokens - $reserve - $bookedCount);

        if ($availableTokens <= 0) {
            return redirect("/book/{$doctor->slug}")->with('error', 'This channeling session is currently full. Please pick another session.');
        }

        $nextTokenNumber = $bookedCount + 1;
        $approxTime = $session->calculateEstimatedTime($nextTokenNumber)->format('h:i A');

        // Resolve online fee breakdown
        $resolvedFee = $this->feeService->resolve(
            tenant: $tenant,
            doctor: $doctor,
            session: $session,
            channel: 'online'
        );

        $onlineVisitTypes = VisitType::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->where('allow_online', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'code', 'pricing_type', 'percentage_value', 'fixed_fee_cents', 'is_default']);

        $sDate = $session->session_date instanceof Carbon ? $session->session_date : Carbon::parse($session->session_date);

        $requireVerification = (bool) $tenant->require_phone_verification;
        $allowedChannels = $requireVerification ? $this->verificationService->getAvailableChannels($tenant) : [];
        $verifiedCookie = $request->cookie('medvisit_verified_phone');
        $initialVerifiedPhone = $this->verificationService->verifyCookiePayload($verifiedCookie);

        return Inertia::render('Public/Booking/PatientDetails', [
            'clinic' => $this->getClinicPayload($tenant),
            'headerConfig' => $tenant->website_header,
            'footerConfig' => $tenant->website_footer,
            'theme' => $tenant->website_theme ?? 'medvisit-teal',
            'requirePhoneVerification' => $requireVerification,
            'verificationChannels' => $allowedChannels,
            'initialVerifiedPhone' => $initialVerifiedPhone,
            'doctor' => [
                'id' => $doctor->id,
                'name' => $doctor->name,
                'title' => $doctor->title ?? 'Dr.',
                'full_title' => trim(($doctor->title ?? 'Dr.').' '.$doctor->name),
                'specialty' => $doctor->specialty,
                'slug' => $doctor->slug,
                'photo_url' => $doctor->photo_url,
                'avg_consultation_minutes' => $doctor->avg_consultation_minutes ?: 10,
            ],
            'session' => [
                'id' => $session->id,
                'session_date_raw' => $sDate->toDateString(),
                'session_date_formatted' => $sDate->format('l, F j, Y'),
                'start_time' => Carbon::parse($session->start_time)->format('h:i A'),
                'end_time' => Carbon::parse($session->end_time)->format('h:i A'),
                'room_number' => $session->room_number ?? 'Consultation Suite',
                'max_tokens' => $session->max_tokens,
                'available_tokens' => $availableTokens,
                'next_token_number' => $nextTokenNumber,
                'approx_time' => $approxTime,
            ],
            'feeBreakdown' => [
                'doctor_fee_formatted' => 'Rs. '.number_format(($resolvedFee['doctor_fee_portion'] ?? 0) / 100, 2),
                'clinic_fee_formatted' => 'Rs. '.number_format(($resolvedFee['clinic_portion'] ?? 0) / 100, 2),
                'online_fee_formatted' => ! empty($resolvedFee['online_fee']) ? 'Rs. '.number_format($resolvedFee['online_fee'] / 100, 2) : null,
                'total_formatted' => $resolvedFee['patient_total_formatted'],
                'total_cents' => $resolvedFee['patient_total'],
            ],
            'visitTypes' => $onlineVisitTypes,
            'arrivalNote' => $tenant->arrival_note ?? 'Please arrive 15 minutes prior to your approximate consultation time with previous medical prescriptions and reports.',
        ]);
    }

    /**
     * API: Get Month Availability JSON (GET /book/api/availability/{slug})
     */
    public function doctorMonthAvailability(Request $request, string $slug): array
    {
        $tenant = tenant();
        $isAny = $slug === 'any';

        $doctor = null;
        if (! $isAny) {
            $doctor = Doctor::where('tenant_id', $tenant->id)
                ->where('slug', $slug)
                ->where('is_active', true)
                ->firstOrFail();
        }

        $year = (int) $request->input('year', Carbon::now('Asia/Colombo')->year);
        $month = (int) $request->input('month', Carbon::now('Asia/Colombo')->month);

        $cacheKey = "tenant_{$tenant->id}_avail_".($doctor ? $doctor->id : 'any')."_{$year}_{$month}";

        try {
            return Cache::remember($cacheKey, 60, function () use ($tenant, $doctor, $year, $month) {
                return [
                    'year' => $year,
                    'month' => $month,
                    'days' => $this->buildMonthAvailability($tenant, $doctor, $year, $month),
                ];
            });
        } catch (\Throwable) {
            return [
                'year' => $year,
                'month' => $month,
                'days' => $this->buildMonthAvailability($tenant, $doctor, $year, $month),
            ];
        }
    }

    /**
     * Start phone verification for public booking.
     */
    public function startPhoneVerification(Request $request): JsonResponse
    {
        if (! empty($request->input('website_hp'))) {
            return response()->json(['message' => 'Spam verification failed.'], 422);
        }

        $validated = $request->validate([
            'phone' => ['required', 'string', 'max:30'],
            'channel' => ['required', 'string', 'in:whatsapp,textlk,log'],
            'session_id' => ['required', 'string', 'max:100'],
        ]);

        $tenant = tenant();
        $normalized = $this->verificationService->normalizePhone($validated['phone']);

        $cookieToken = $request->cookie('medvisit_verified_phone');
        if ($this->verificationService->isPhoneVerified($normalized, $tenant, $cookieToken)) {
            return response()->json([
                'success' => true,
                'already_verified' => true,
                'phone' => $normalized,
                'message' => 'Number is already verified.',
            ]);
        }

        $result = $this->verificationService->startVerification(
            rawPhone: $validated['phone'],
            channel: $validated['channel'],
            sessionId: $validated['session_id'],
            tenant: $tenant
        );

        if (! $result['success']) {
            return response()->json([
                'success' => false,
                'error' => $result['error'] ?? 'Could not start verification.',
            ], 422);
        }

        return response()->json($result);
    }

    /**
     * Check verification status (polled every 2s during WhatsApp reverse verification).
     */
    public function checkPhoneVerificationStatus(Request $request): JsonResponse
    {
        $verificationId = $request->input('verification_id');
        $sessionId = $request->input('session_id');

        if (empty($verificationId)) {
            return response()->json(['found' => false, 'is_verified' => false], 400);
        }

        $status = $this->verificationService->checkStatus($verificationId, $sessionId);

        $response = response()->json($status);

        if (! empty($status['is_verified']) && ! empty($status['phone'])) {
            $cookiePayload = $this->verificationService->createCookiePayload($status['phone']);
            $response->withCookie(cookie(
                name: 'medvisit_verified_phone',
                value: $cookiePayload,
                minutes: 60 * 24 * 180,
                path: '/',
                domain: null,
                secure: false,
                httpOnly: false
            ));
        }

        return $response;
    }

    /**
     * Submit and verify 6-digit SMS code.
     */
    public function verifyPhoneCode(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'verification_id' => ['required', 'integer'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $tenant = tenant();
        $result = $this->verificationService->verifyCode(
            verificationId: $validated['verification_id'],
            code: $validated['code'],
            tenant: $tenant
        );

        if (! $result['success']) {
            return response()->json($result, 422);
        }

        $response = response()->json($result);

        if (! empty($result['cookie'])) {
            $response->withCookie(cookie(
                name: 'medvisit_verified_phone',
                value: $result['cookie'],
                minutes: 60 * 24 * 180,
                path: '/',
                domain: null,
                secure: false,
                httpOnly: false
            ));
        }

        return $response;
    }

    /**
     * Check if a phone is remembered/verified (e.g. from 180-day retention or signed cookie).
     */
    public function checkRememberedPhone(Request $request): JsonResponse
    {
        $phone = (string) $request->input('phone', '');
        $tenant = tenant();
        $normalized = $this->verificationService->normalizePhone($phone);
        $cookieToken = $request->cookie('medvisit_verified_phone');

        $isVerified = $this->verificationService->isPhoneVerified($normalized, $tenant, $cookieToken);

        return response()->json([
            'is_verified' => $isVerified,
            'phone' => $normalized,
        ]);
    }

    /**
     * Step 4 Submit: Atomic Booking Submission (POST /book)
     */
    public function store(Request $request): RedirectResponse|JsonResponse
    {
        // 1. Honeypot check
        if (! empty($request->input('website_hp'))) {
            if ($request->wantsJson()) {
                return response()->json(['message' => 'Spam verification failed.'], 422);
            }

            return redirect()->back()->withErrors([
                'phone' => 'Spam verification failed. Please try again.',
            ]);
        }

        $validated = $request->validate([
            'doctor_session_id' => ['required', 'exists:doctor_sessions,id'],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'nic' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'visit_type_id' => ['nullable', 'exists:visit_types,id'],
            'notes' => ['nullable', 'string', 'max:500'],
            'is_booking_for_other' => ['nullable', 'boolean'],
            'other_patient_name' => ['nullable', 'string', 'max:255'],
            'consent' => ['sometimes', 'accepted'],
        ]);

        $tenant = tenant();
        $tenantId = $tenant?->id ?? tenant('id');
        $cleanPhone = preg_replace('/[^0-9+]/', '', $validated['phone']);
        $normalizedPhone = $this->verificationService->normalizePhone($cleanPhone);

        // Phone Verification Enforcement for Public Online Booking
        $requireVerification = $tenant ? (bool) ($tenant->require_phone_verification ?? false) : false;
        if ($requireVerification) {
            $cookieToken = $request->cookie('medvisit_verified_phone');
            $isVerified = $this->verificationService->isPhoneVerified($normalizedPhone, $tenant, $cookieToken);

            if (! $isVerified) {
                $bookingSessionId = $request->input('verification_session_id');
                $sessionVerified = PhoneVerification::where('phone', $normalizedPhone)
                    ->where('session_id', $bookingSessionId)
                    ->where('status', PhoneVerification::STATUS_VERIFIED)
                    ->exists();

                if (! $sessionVerified) {
                    throw ValidationException::withMessages([
                        'phone' => 'Please verify your mobile phone number before confirming your booking.',
                    ]);
                }
            }
        }
        $patientDisplayName = (! empty($validated['is_booking_for_other']) && ! empty($validated['other_patient_name']))
            ? $validated['other_patient_name']
            : $validated['name'];

        // 2. Patient Resolution & Anti-abuse Limits
        $patient = Patient::where('tenant_id', $tenantId)
            ->where(function ($q) use ($cleanPhone, $validated) {
                $q->where('phone', $cleanPhone);
                if (! empty($validated['nic'])) {
                    $q->orWhere('nic', $validated['nic']);
                }
            })->first();

        if ($patient) {
            // Anti-abuse Check: 1 active token per phone per session
            $alreadyBooked = BookingToken::where('doctor_session_id', $validated['doctor_session_id'])
                ->where('patient_id', $patient->id)
                ->whereNotIn('status', ['cancelled'])
                ->exists();

            if ($alreadyBooked) {
                return redirect()->back()->withErrors([
                    'phone' => 'An active channeling token for this session has already been booked using this phone number.',
                ]);
            }

            // Anti-abuse Check: Max active tokens across clinic (default 3)
            $maxLimit = (int) (tenant('max_active_tokens_per_phone') ?? 3);
            $activeCount = BookingToken::where('patient_id', $patient->id)
                ->whereIn('status', ['booked', 'checked_in'])
                ->count();

            if ($activeCount >= $maxLimit) {
                return redirect()->back()->withErrors([
                    'phone' => "Maximum limit of {$maxLimit} active channeling tokens reached for this phone number.",
                ]);
            }
        } else {
            $patient = Patient::create([
                'tenant_id' => $tenantId,
                'name' => $patientDisplayName,
                'phone' => $cleanPhone,
                'nic' => $validated['nic'] ?? null,
                'email' => $validated['email'] ?? null,
                'city' => $validated['city'] ?? null,
            ]);
        }

        // Determine if booked via directory
        $source = null;
        if ($request->hasSession() && $request->session()->get('booking_source') === 'directory') {
            $source = 'directory';
        } elseif ($request->input('source') === 'directory') {
            $source = 'directory';
        }

        // 3. Concurrency-safe atomic token assignment
        try {
            $token = DB::transaction(function () use ($validated, $patient, $tenantId, $source) {
                $session = DoctorSession::with('doctor')
                    ->where('id', $validated['doctor_session_id'])
                    ->lockForUpdate()
                    ->firstOrFail();

                $reserve = (int) (tenant('walk_in_reserved_tokens') ?? 0);
                $bookedCount = BookingToken::where('doctor_session_id', $session->id)
                    ->whereNotIn('status', ['cancelled'])
                    ->count();

                if (($bookedCount + $reserve) >= $session->max_tokens) {
                    throw new \DomainException("Session is full ({$session->max_tokens} maximum tokens allocated).");
                }

                $lastTokenNumber = (int) (BookingToken::where('doctor_session_id', $session->id)
                    ->max('token_number') ?? 0);

                $tokenNumber = $lastTokenNumber + 1;
                $estimatedTime = $session->calculateEstimatedTime($tokenNumber);

                // Fee resolution snapshot
                $snapshot = $this->feeService->resolve(
                    tenant: tenant(),
                    doctor: $session->doctor,
                    session: $session,
                    visitType: $validated['visit_type_id'] ?? null,
                    channel: 'online'
                );

                $signedCode = Str::random(40);

                $newToken = BookingToken::create([
                    'tenant_id' => $tenantId,
                    'doctor_session_id' => $session->id,
                    'patient_id' => $patient->id,
                    'token_number' => $tokenNumber,
                    'visit_type_id' => $snapshot['visit_type']['id'] ?? null,
                    'estimated_time' => $estimatedTime,
                    'status' => BookingToken::STATUS_BOOKED,
                    'booked_via' => 'online',
                    'source' => $source,
                    'signed_cancel_token' => $signedCode,
                    'fee_snapshot' => $snapshot,
                    'payout_status' => 'pending',
                    'notes' => (! empty($validated['is_booking_for_other']) ? "[Booked by: {$validated['name']}] " : '').($validated['notes'] ?? ''),
                ]);

                // Create initial bill record
                $receiptNumber = 'REC-ONL-'.strtoupper(Str::random(5)).'-'.date('dmy');
                Bill::create([
                    'tenant_id' => $tenantId,
                    'booking_token_id' => $newToken->id,
                    'patient_id' => $patient->id,
                    'doctor_id' => $session->doctor_id,
                    'visit_type_id' => $snapshot['visit_type']['id'] ?? null,
                    'receipt_number' => $receiptNumber,
                    'doctor_fee' => $snapshot['doctor_fee_portion'],
                    'clinic_fee' => $snapshot['clinic_portion'],
                    'other_fee' => $snapshot['third_party_portion'],
                    'discount' => 0,
                    'total_amount' => $snapshot['patient_total'],
                    'fee_snapshot' => $snapshot,
                    'doctor_payout_amount' => $snapshot['doctor_payout_amount'],
                    'clinic_net_amount' => $snapshot['clinic_net_amount'],
                    'third_party_amount' => $snapshot['third_party_portion'],
                    'payment_method' => 'cash',
                    'payment_status' => 'pending',
                ]);

                return $newToken;
            });
        } catch (\DomainException $e) {
            return redirect()->back()->withErrors([
                'doctor_session_id' => 'This session was just filled by another booking. Please select the next available session.',
            ]);
        }

        // Invalidate availability cache
        try {
            $session = $token->doctorSession;
            if ($session) {
                $sDate = $session->session_date instanceof Carbon ? $session->session_date : Carbon::parse($session->session_date);
                Cache::forget("tenant_{$tenantId}_avail_{$session->doctor_id}_{$sDate->year}_{$sDate->month}");
                Cache::forget("tenant_{$tenantId}_avail_any_{$sDate->year}_{$sDate->month}");
            }
        } catch (\Throwable) {
            // Ignore cache store driver limitations
        }

        // Send email confirmation if email provided
        if (! empty($validated['email'])) {
            try {
                Mail::to($validated['email'])->send(new BookingConfirmationMail(
                    token: $token,
                    clinicName: tenant('name') ?? 'MedVisit Clinic'
                ));
            } catch (\Throwable $e) {
                Log::warning("Could not send booking confirmation email to {$validated['email']}: {$e->getMessage()}");
            }
        }

        $cookiePayload = $this->verificationService->createCookiePayload($normalizedPhone);
        $cookie = cookie(
            name: 'medvisit_verified_phone',
            value: $cookiePayload,
            minutes: 60 * 24 * 180,
            path: '/',
            domain: null,
            secure: false,
            httpOnly: false
        );

        if ($request->hasSession()) {
            $request->session()->forget('booking_source');
        }

        if ($request->wantsJson()) {
            return response()->json([
                'status' => 'success',
                'token' => $token,
                'redirect' => "/book/confirmed/{$token->signed_cancel_token}",
            ], 201)->withCookie($cookie);
        }

        return redirect("/book/confirmed/{$token->signed_cancel_token}")->withCookie($cookie);
    }

    /**
     * Confirmation Page (GET /book/confirmed/{signedToken})
     */
    public function confirmed(string $signedToken): Response|RedirectResponse
    {
        $tenant = tenant();
        $token = BookingToken::with(['doctorSession.doctor', 'patient'])
            ->where('tenant_id', $tenant->id)
            ->where('signed_cancel_token', $signedToken)
            ->firstOrFail();

        $session = $token->doctorSession;
        $doctor = $session->doctor;
        $sDate = $session->session_date instanceof Carbon ? $session->session_date : Carbon::parse($session->session_date);

        $approxTime = $token->estimated_time
            ? Carbon::parse($token->estimated_time)->format('h:i A')
            : Carbon::parse($session->start_time)->format('h:i A');

        $sessionStart = Carbon::parse($session->start_time)->format('h:i A');
        $sessionEnd = Carbon::parse($session->end_time)->format('h:i A');

        // Google Calendar Add Link
        $startIso = Carbon::parse($sDate->toDateString().' '.$session->start_time, 'Asia/Colombo')->format('Ymd\THis');
        $endIso = Carbon::parse($sDate->toDateString().' '.$session->end_time, 'Asia/Colombo')->format('Ymd\THis');
        $clinicTitle = urlencode("Doctor Channeling Token #{$token->token_number} - Dr. {$doctor->name}");
        $clinicLocation = urlencode(($tenant->name ?? 'Clinic').', '.($tenant->address ?? 'Sri Lanka'));
        $clinicDetails = urlencode("Channeling Token: #{$token->token_number}\nDoctor: Dr. {$doctor->name} ({$doctor->specialty})\nApprox Time: {$approxTime}\nClinic Phone: ".($tenant->phone ?? ''));
        $googleCalendarUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE&text={$clinicTitle}&dates={$startIso}/{$endIso}&details={$clinicDetails}&location={$clinicLocation}";

        return Inertia::render('Public/Booking/BookingConfirmed', [
            'clinic' => $this->getClinicPayload($tenant),
            'headerConfig' => $tenant->website_header,
            'footerConfig' => $tenant->website_footer,
            'theme' => $tenant->website_theme ?? 'medvisit-teal',
            'token' => [
                'id' => $token->id,
                'token_number' => $token->token_number,
                'status' => $token->status,
                'approx_time' => $approxTime,
                'signed_code' => $token->signed_cancel_token,
                'created_at_formatted' => $token->created_at->format('M d, Y h:i A'),
                'fee_formatted' => 'Rs. '.number_format(($token->fee_snapshot['patient_total'] ?? 0) / 100, 2),
            ],
            'doctor' => [
                'name' => $doctor->name,
                'title' => $doctor->title ?? 'Dr.',
                'full_title' => trim(($doctor->title ?? 'Dr.').' '.$doctor->name),
                'specialty' => $doctor->specialty,
                'photo_url' => $doctor->photo_url,
            ],
            'session' => [
                'session_date_formatted' => $sDate->format('l, F j, Y'),
                'time_range' => "{$sessionStart} – {$sessionEnd}",
                'room_number' => $session->room_number ?? 'Consultation Room',
            ],
            'patient' => [
                'name' => $token->patient->name,
                'phone' => $token->patient->phone,
                'email' => $token->patient->email,
            ],
            'googleCalendarUrl' => $googleCalendarUrl,
            'icsUrl' => "/book/ics/{$token->signed_cancel_token}",
            'queueUrl' => "/tokens/{$token->signed_cancel_token}/status",
            'cancelUrl' => "/book/cancel/{$token->signed_cancel_token}",
        ]);
    }

    /**
     * Download .ics Calendar Invite (GET /book/ics/{signedToken})
     */
    public function downloadIcs(string $signedToken): HttpResponse
    {
        $tenant = tenant();
        $token = BookingToken::with(['doctorSession.doctor', 'patient'])
            ->where('tenant_id', $tenant->id)
            ->where('signed_cancel_token', $signedToken)
            ->firstOrFail();

        $session = $token->doctorSession;
        $doctor = $session->doctor;
        $sDate = $session->session_date instanceof Carbon ? $session->session_date : Carbon::parse($session->session_date);

        $startIso = Carbon::parse($sDate->toDateString().' '.$session->start_time, 'Asia/Colombo')->format('Ymd\THis');
        $endIso = Carbon::parse($sDate->toDateString().' '.$session->end_time, 'Asia/Colombo')->format('Ymd\THis');
        $nowIso = Carbon::now('Asia/Colombo')->format('Ymd\THis\Z');

        $approxTime = $token->estimated_time
            ? Carbon::parse($token->estimated_time)->format('h:i A')
            : Carbon::parse($session->start_time)->format('h:i A');

        $ics = "BEGIN:VCALENDAR\r\n";
        $ics .= "VERSION:2.0\r\n";
        $ics .= "PRODID:-//MedVisit//Doctor Channeling System//EN\r\n";
        $ics .= "CALSCALE:GREGORIAN\r\n";
        $ics .= "METHOD:REQUEST\r\n";
        $ics .= "BEGIN:VEVENT\r\n";
        $ics .= "UID:medvisit-token-{$token->id}@{$tenant->subdomain}\r\n";
        $ics .= "DTSTAMP:{$nowIso}\r\n";
        $ics .= "DTSTART;TZID=Asia/Colombo:{$startIso}\r\n";
        $ics .= "DTEND;TZID=Asia/Colombo:{$endIso}\r\n";
        $ics .= "SUMMARY:Doctor Channeling: Token #{$token->token_number} - Dr. {$doctor->name}\r\n";
        $ics .= "DESCRIPTION:Channeling Appointment\\nToken Number: #{$token->token_number}\\nDoctor: Dr. {$doctor->name} ({$doctor->specialty})\\nApprox Time: {$approxTime}\\nPatient: {$token->patient->name}\\nClinic Hotline: {$tenant->phone}\\r\n";
        $ics .= "LOCATION:{$tenant->name}, {$tenant->address}\r\n";
        $ics .= "STATUS:CONFIRMED\r\n";
        $ics .= "END:VEVENT\r\n";
        $ics .= "END:VCALENDAR\r\n";

        return response($ics, 200, [
            'Content-Type' => 'text/calendar; charset=utf-8',
            'Content-Disposition' => "attachment; filename=\"medvisit-token-{$token->token_number}.ics\"",
        ]);
    }

    /**
     * Cancel Booking via Signed Link (POST /book/cancel/{signedToken})
     */
    public function cancel(Request $request, string $signedToken): RedirectResponse
    {
        $tenant = tenant();
        $token = BookingToken::with(['doctorSession.doctor'])
            ->where('tenant_id', $tenant->id)
            ->where('signed_cancel_token', $signedToken)
            ->firstOrFail();

        if ($token->status === 'cancelled') {
            return redirect()->back()->with('error', 'This appointment has already been cancelled.');
        }

        $token->update([
            'status' => 'cancelled',
        ]);

        // Invalidate availability cache
        try {
            $session = $token->doctorSession;
            if ($session) {
                $sDate = $session->session_date instanceof Carbon ? $session->session_date : Carbon::parse($session->session_date);
                Cache::forget("tenant_{$tenant->id}_avail_{$session->doctor_id}_{$sDate->year}_{$sDate->month}");
                Cache::forget("tenant_{$tenant->id}_avail_any_{$sDate->year}_{$sDate->month}");
            }
        } catch (\Throwable) {
            // Ignore cache store driver limitations
        }

        return redirect()->back()->with('success', "Your channeling token #{$token->token_number} with Dr. {$session->doctor?->name} has been cancelled successfully.");
    }

    /**
     * Helper: Build month availability dictionary for a given doctor (or all doctors).
     *
     * @return array<string, array{has_sessions: bool, is_full: bool, open_sessions_count: int, total_sessions_count: int, sessions: array}>
     */
    protected function buildMonthAvailability(Tenant $tenant, ?Doctor $doctor, int $year, int $month): array
    {
        $startOfMonth = Carbon::createFromDate($year, $month, 1, 'Asia/Colombo')->startOfMonth();
        $endOfMonth = (clone $startOfMonth)->endOfMonth();
        $today = Carbon::today('Asia/Colombo');
        $reserve = (int) ($tenant->walk_in_reserved_tokens ?? 0);

        $sessionsQuery = DoctorSession::with(['doctor', 'tokens'])
            ->where('tenant_id', $tenant->id)
            ->whereBetween('session_date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('start_time');

        if ($doctor) {
            $sessionsQuery->where('doctor_id', $doctor->id);
        }

        $sessions = $sessionsQuery->get();
        $sessionsByDate = $sessions->groupBy(fn ($s) => $s->session_date->format('Y-m-d'));

        $days = [];
        $cursor = clone $startOfMonth;
        while ($cursor->lte($endOfMonth)) {
            $dateStr = $cursor->toDateString();
            $isPast = $cursor->lt($today);

            if ($isPast || ! $sessionsByDate->has($dateStr)) {
                $days[$dateStr] = [
                    'has_sessions' => false,
                    'is_full' => false,
                    'is_past' => $isPast,
                    'open_sessions_count' => 0,
                    'total_sessions_count' => 0,
                    'sessions' => [],
                ];
                $cursor->addDay();

                continue;
            }

            $dateSessions = $sessionsByDate->get($dateStr);
            $mappedSessions = [];
            $openCount = 0;

            foreach ($dateSessions as $s) {
                $bookedCount = $s->tokens->where('status', '!=', 'cancelled')->count();
                $availableCount = max(0, $s->max_tokens - $reserve - $bookedCount);
                $isFull = $availableCount <= 0;

                if (! $isFull) {
                    $openCount++;
                }

                $startTimeFormatted = Carbon::parse($s->start_time)->format('h:i A');
                $endTimeFormatted = Carbon::parse($s->end_time)->format('h:i A');
                $nextToken = $bookedCount + 1;
                $approxTime = $s->calculateEstimatedTime($nextToken)->format('h:i A');
                $progress = $s->max_tokens > 0 ? (int) round(($bookedCount / $s->max_tokens) * 100) : 0;

                $mappedSessions[] = [
                    'id' => $s->id,
                    'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? '')),
                    'specialty' => $s->doctor?->specialty ?? '',
                    'start_time' => $startTimeFormatted,
                    'end_time' => $endTimeFormatted,
                    'time_range' => "{$startTimeFormatted} – {$endTimeFormatted}",
                    'room_number' => $s->room_number ?? 'Consulting Room',
                    'max_tokens' => $s->max_tokens,
                    'booked_tokens' => $bookedCount,
                    'available_tokens' => $availableCount,
                    'is_full' => $isFull,
                    'progress_percentage' => min(100, $progress),
                    'approx_time' => "~{$approxTime}",
                    'fee_formatted' => $s->doctor ? $s->doctor->formatted_fee : '',
                ];
            }

            $days[$dateStr] = [
                'has_sessions' => true,
                'is_full' => $openCount === 0,
                'is_past' => false,
                'open_sessions_count' => $openCount,
                'total_sessions_count' => count($mappedSessions),
                'sessions' => $mappedSessions,
            ];

            $cursor->addDay();
        }

        return $days;
    }

    /**
     * Helper: Common clinic payload for public views.
     */
    protected function getClinicPayload(Tenant $tenant): array
    {
        return [
            'name' => ucwords((string) ($tenant->name ?? 'Clinic')),
            'subdomain' => $tenant->subdomain,
            'phone' => $tenant->phone ?? '+94 11 234 5678',
            'address' => $tenant->address ?? 'Colombo, Sri Lanka',
            'logo_url' => $tenant->logo_url,
            'whatsapp_number' => $tenant->whatsapp_number,
            'opening_hours' => $tenant->opening_hours,
            'allow_any_doctor' => (bool) ($tenant->allow_any_doctor ?? false),
        ];
    }
}
