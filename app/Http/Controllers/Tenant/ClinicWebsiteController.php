<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ClinicWebsiteController extends Controller
{
    /**
     * Default sections configuration.
     */
    protected array $defaultSections = [
        [
            'id' => 'hero',
            'name' => 'Hero Banner',
            'enabled' => true,
            'title' => 'Compassionate Care, Specialist Excellence',
            'subtitle' => 'Book specialist channeling appointments with Sri Lanka’s leading medical practitioners. Zero waiting lounge delays with real-time digital queue updates.',
            'cta_text' => 'Book Appointment Online',
            'cta_link' => '/book',
            'badge' => 'Open Daily • Specialist Channeling',
        ],
        [
            'id' => 'about',
            'name' => 'About Clinic',
            'enabled' => true,
            'title' => 'Your Family’s Trusted Medical Center',
            'description' => 'Providing premier outpatient healthcare, specialist channeling, and diagnostic medical services with international safety protocols and Sri Lankan warmth.',
            'stat_1_number' => '15+',
            'stat_1_label' => 'Medical Specialists',
            'stat_2_number' => '25,000+',
            'stat_2_label' => 'Satisfied Patients',
            'stat_3_number' => '100%',
            'stat_3_label' => 'Digital Queue Tracking',
        ],
        [
            'id' => 'doctors',
            'name' => 'Doctors Roster (Auto)',
            'enabled' => true,
            'title' => 'Meet Our Medical Specialists',
            'subtitle' => 'SLMC verified consultants, surgeons, and physicians practicing at our modern medical center.',
        ],
        [
            'id' => 'sessions',
            'name' => 'This Week Channeling (Auto)',
            'enabled' => true,
            'title' => 'Channeling Sessions This Week',
            'subtitle' => 'Live upcoming schedules with real-time token capacity and consultation suites.',
        ],
        [
            'id' => 'services',
            'name' => 'Clinical Services',
            'enabled' => true,
            'title' => 'Comprehensive Medical Services',
            'subtitle' => 'From preventive healthcare to specialist consultation and diagnostic labs.',
            'items' => [
                ['name' => 'Specialist Doctor Channeling', 'desc' => 'Cardiology, Paediatrics, ENT, Dermatology, and General Medicine.'],
                ['name' => 'Clinical Laboratory & Pathology', 'desc' => 'Automated blood testing, lipid profiles, and diagnostic screening.'],
                ['name' => 'Digital ECG & Vitals Lounge', 'desc' => 'Rapid heart health monitoring and cardiac diagnostics.'],
                ['name' => 'Pharmacy & Prescription Dispensing', 'desc' => 'Certified pharmaceutical supplies and patient medication guidance.'],
            ],
        ],
        [
            'id' => 'hours',
            'name' => 'Operating Hours',
            'enabled' => true,
            'title' => 'Clinical Hours & Availability',
            'weekdays' => '07:30 AM – 10:00 PM',
            'saturday' => '07:30 AM – 10:00 PM',
            'sunday' => '08:00 AM – 08:00 PM',
            'emergency_note' => 'Channeling appointments operate according to individual doctor schedule suites.',
        ],
        [
            'id' => 'contact',
            'name' => 'Contact & Location',
            'enabled' => true,
            'title' => 'Visit Our Medical Center',
            'subtitle' => 'Centrally located with dedicated parking and accessible wheelchair facilities.',
            'map_link' => 'https://maps.google.com',
        ],
        [
            'id' => 'footer',
            'name' => 'Website Footer',
            'enabled' => true,
            'notice' => 'All doctor channeling schedules are subject to practitioner availability. Token appointment times are approximate.',
        ],
    ];

    /**
     * Admin: Visual Section Builder & Website Settings.
     */
    public function index(Request $request): Response
    {
        $tenant = tenant();

        $sections = $tenant->website_sections ?? $this->defaultSections;
        $theme = $tenant->website_theme ?? 'medvisit-teal';
        $isPublished = (bool) ($tenant->website_published ?? false);
        $seo = [
            'title' => $tenant->seo_title ?? ($tenant->name.' - Specialist Doctor Channeling'),
            'description' => $tenant->seo_description ?? ('Book doctor channeling sessions online at '.$tenant->name.'. Live queue monitoring and SLMC verified specialists.'),
        ];

        // Public preview data
        $doctors = Doctor::where('is_active', true)->orderBy('name')->get();
        $upcomingSessions = DoctorSession::with('doctor')
            ->where('session_date', '>=', Carbon::today('Asia/Colombo')->toDateString())
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->limit(10)
            ->get();

        return Inertia::render('Website/Index', [
            'sections' => $sections,
            'theme' => $theme,
            'isPublished' => $isPublished,
            'seo' => $seo,
            'clinic' => [
                'name' => ucwords((string) ($tenant->name ?? 'Demo Clinic')),
                'subdomain' => $tenant->subdomain,
                'phone' => $tenant->phone ?? '+94 11 234 5678',
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
            ],
            'doctors' => $doctors,
            'upcomingSessions' => $upcomingSessions,
        ]);
    }

    /**
     * Admin: Update sections content and ordering.
     */
    public function updateSections(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'sections' => ['required', 'array'],
        ]);

        $tenant = tenant();
        $tenant->website_sections = $validated['sections'];
        $tenant->save();

        return redirect()->back()->with('success', 'Website sections layout and content saved successfully.');
    }

    /**
     * Admin: Toggle Publish status.
     */
    public function publish(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'published' => ['required', 'boolean'],
        ]);

        $tenant = tenant();
        $tenant->website_published = $validated['published'];
        $tenant->save();

        $msg = $validated['published']
            ? 'Clinic website is now LIVE and publicly visible!'
            : 'Clinic website saved as draft.';

        return redirect()->back()->with('success', $msg);
    }

    /**
     * Admin: Update theme and SEO meta fields.
     */
    public function updateTheme(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'theme' => ['required', 'string', 'in:medvisit-teal,ocean-blue,emerald-health,royal-purple,slate-luxury'],
            'seo_title' => ['required', 'string', 'max:255'],
            'seo_description' => ['required', 'string', 'max:500'],
        ]);

        $tenant = tenant();
        $tenant->website_theme = $validated['theme'];
        $tenant->seo_title = $validated['seo_title'];
        $tenant->seo_description = $validated['seo_description'];
        $tenant->save();

        return redirect()->back()->with('success', 'Website theme preset and SEO metadata updated.');
    }

    /**
     * Public Landing Page at clinic subdomain root (GET /).
     */
    public function publicHome(): Response|RedirectResponse
    {
        $tenant = tenant();

        if (! $tenant->isUsable()) {
            return redirect()->route('tenant.suspended');
        }

        $sections = $tenant->website_sections ?? $this->defaultSections;
        $theme = $tenant->website_theme ?? 'medvisit-teal';
        $isPublished = (bool) ($tenant->website_published ?? false);

        // Fetch live active doctors and upcoming channeling sessions
        $doctors = Doctor::where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => trim(($d->title ?? 'Dr.').' '.$d->name),
                'specialty' => $d->specialty,
                'slmc_number' => $d->slmc_number,
                'bio' => $d->bio,
                'total_fee_formatted' => 'Rs. '.number_format(($d->doctor_fee + $d->clinic_fee) / 100, 2),
            ]);

        $upcomingSessions = DoctorSession::with('doctor')
            ->where('session_date', '>=', Carbon::today('Asia/Colombo')->toDateString())
            ->where('session_date', '<=', Carbon::today('Asia/Colombo')->addDays(7)->toDateString())
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->get()
            ->map(function ($s) {
                $bookedCount = $s->tokens()->whereNotIn('status', ['cancelled'])->count();

                return [
                    'id' => $s->id,
                    'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? 'Doctor')),
                    'doctor_specialty' => $s->doctor?->specialty ?? 'Specialist',
                    'session_date' => $s->session_date->format('l, M d'),
                    'start_time' => Carbon::parse($s->start_time)->format('h:i A'),
                    'room_number' => $s->room_number ?? 'Suite 1',
                    'available_tokens_count' => max(0, $s->max_tokens - $bookedCount),
                    'is_full' => $bookedCount >= $s->max_tokens,
                    'total_fee_formatted' => 'Rs. '.number_format(($s->doctor_fee + $s->clinic_fee) / 100, 2),
                ];
            });

        return Inertia::render('Public/ClinicLanding', [
            'clinic' => [
                'name' => ucwords((string) ($tenant->name ?? 'Clinic')),
                'subdomain' => $tenant->subdomain,
                'phone' => $tenant->phone ?? '+94 11 234 5678',
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
            ],
            'sections' => $sections,
            'theme' => $theme,
            'isPublished' => $isPublished,
            'doctors' => $doctors,
            'upcomingSessions' => $upcomingSessions,
            'seo' => [
                'title' => $tenant->seo_title ?? ($tenant->name.' - Doctor Channeling'),
                'description' => $tenant->seo_description ?? ('Book doctor appointments online at '.$tenant->name.'.'),
            ],
        ]);
    }

    /**
     * Public Token Booking Page (GET /book).
     */
    public function publicBooking(Request $request): Response
    {
        $tenant = tenant();
        $today = Carbon::today('Asia/Colombo')->toDateString();

        $sessions = DoctorSession::with('doctor')
            ->where('session_date', '>=', $today)
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->get()
            ->map(function ($s) {
                $booked = $s->tokens()->whereNotIn('status', ['cancelled'])->count();

                return [
                    'id' => $s->id,
                    'doctor_id' => $s->doctor_id,
                    'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? 'Doctor')),
                    'doctor_specialty' => $s->doctor?->specialty ?? 'Specialist',
                    'session_date' => $s->session_date->format('M d, Y (D)'),
                    'start_time' => Carbon::parse($s->start_time)->format('h:i A'),
                    'room_number' => $s->room_number ?? 'Consultation Suite 1',
                    'available_tokens_count' => max(0, $s->max_tokens - $booked),
                    'is_full' => $booked >= $s->max_tokens,
                    'total_fee_formatted' => 'Rs. '.number_format(($s->doctor_fee + $s->clinic_fee) / 100, 2),
                ];
            });

        return Inertia::render('Public/BookToken', [
            'clinic' => [
                'name' => ucwords((string) ($tenant->name ?? 'Clinic')),
                'phone' => $tenant->phone ?? '+94 11 234 5678',
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
                'subdomain' => $tenant->subdomain,
            ],
            'sessions' => $sessions,
        ]);
    }

    /**
     * Public Token Booking Submission (POST /book).
     * Protected by:
     * 1. Honeypot check.
     * 2. Rate limiting.
     * 3. 1 active token per phone per session.
     * 4. Max 3 active tokens per phone across clinic.
     */
    public function storePublicBooking(Request $request): RedirectResponse
    {
        // 1. Honeypot check
        if (! empty($request->input('website_hp'))) {
            return redirect()->back()->withErrors([
                'phone' => 'Spam detected. Booking submission rejected.',
            ]);
        }

        $validated = $request->validate([
            'doctor_session_id' => ['required', 'exists:doctor_sessions,id'],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'nic' => ['nullable', 'string', 'max:20'],
            'city' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $cleanPhone = preg_replace('/[^0-9+]/', '', $validated['phone']);

        // 2. Resolve or find Patient
        $tenantId = tenant('id');
        $patient = Patient::where('tenant_id', $tenantId)
            ->where(function ($q) use ($cleanPhone, $validated) {
                $q->where('phone', $cleanPhone);
                if (! empty($validated['nic'])) {
                    $q->orWhere('nic', $validated['nic']);
                }
            })->first();

        if ($patient) {
            // Anti-abuse Check: 1 active token per phone per session
            $alreadyBookedInSession = BookingToken::where('doctor_session_id', $validated['doctor_session_id'])
                ->where('patient_id', $patient->id)
                ->whereNotIn('status', ['cancelled'])
                ->exists();

            if ($alreadyBookedInSession) {
                return redirect()->back()->withErrors([
                    'phone' => 'An active channeling token for this session has already been issued to this phone number.',
                ]);
            }

            // Anti-abuse Check: Max 3 active tokens across clinic
            $activeTokensCount = BookingToken::where('patient_id', $patient->id)
                ->whereIn('status', ['booked', 'checked_in'])
                ->count();

            if ($activeTokensCount >= 3) {
                return redirect()->back()->withErrors([
                    'phone' => 'Maximum limit of 3 active channeling tokens reached for this patient account.',
                ]);
            }
        } else {
            $patient = Patient::create([
                'tenant_id' => $tenantId,
                'name' => $validated['name'],
                'phone' => $cleanPhone,
                'nic' => $validated['nic'] ?? null,
                'city' => $validated['city'] ?? null,
            ]);
        }

        // Concurrency-safe atomic token assignment
        $token = DB::transaction(function () use ($validated, $patient, $tenantId) {
            $session = DoctorSession::where('id', $validated['doctor_session_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $activeCount = BookingToken::where('doctor_session_id', $session->id)
                ->whereNotIn('status', ['cancelled'])
                ->count();

            if ($activeCount >= $session->max_tokens) {
                throw new \Exception("Session is full ({$session->max_tokens} maximum tokens booked).");
            }

            $lastTokenNumber = (int) BookingToken::where('doctor_session_id', $session->id)
                ->max('token_number') ?? 0;

            $tokenNumber = $lastTokenNumber + 1;
            $estimatedTime = $session->calculateEstimatedTime($tokenNumber);

            $newToken = BookingToken::create([
                'tenant_id' => $tenantId,
                'doctor_session_id' => $session->id,
                'patient_id' => $patient->id,
                'token_number' => $tokenNumber,
                'estimated_time' => $estimatedTime,
                'status' => BookingToken::STATUS_BOOKED,
                'booked_via' => 'online',
                'signed_cancel_token' => Str::random(40),
                'notes' => $validated['notes'] ?? null,
            ]);

            // Create initial bill record (pending payment at clinic arrival)
            $receiptNumber = 'REC-ONL-'.strtoupper(Str::random(5)).'-'.date('dmy');
            Bill::create([
                'tenant_id' => $tenantId,
                'booking_token_id' => $newToken->id,
                'patient_id' => $patient->id,
                'doctor_id' => $session->doctor_id,
                'receipt_number' => $receiptNumber,
                'doctor_fee' => $session->doctor_fee,
                'clinic_fee' => $session->clinic_fee,
                'total_amount' => $session->doctor_fee + $session->clinic_fee,
                'payment_method' => 'cash',
                'payment_status' => 'pending',
            ]);

            return $newToken;
        });

        $session = DoctorSession::find($validated['doctor_session_id']);
        $approxTime = $token->estimated_time ? Carbon::parse($token->estimated_time)->format('h:i A') : $session->start_time;

        return redirect()->back()->with('success', "Appointment Confirmed! Your Token is #{$token->token_number} with Dr. {$session->doctor?->name}. Approximately at {$approxTime}. Please arrive 15 minutes early.");
    }
}
