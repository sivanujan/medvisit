<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ClinicRegistrationRequest;
use App\Jobs\SyncClinicDirectoryListing;
use App\Mail\Clinic\ClinicReadyMail;
use App\Models\Doctor;
use App\Models\Tenant;
use App\Services\AuditLogger;
use App\Services\Media\ImageProcessingService;
use App\Support\ClinicWebsite;
use App\Support\PrintSettings;
use Carbon\Carbon;
use Endroid\QrCode\Builder\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class ClinicSetupController extends Controller
{
    public const PRESET_SERVICES = [
        ['id' => 'opd', 'label' => 'OPD consultation'],
        ['id' => 'specialist', 'label' => 'Specialist channeling'],
        ['id' => 'pharmacy', 'label' => 'Pharmacy & dispensing'],
        ['id' => 'lab', 'label' => 'Medical laboratory'],
        ['id' => 'dental', 'label' => 'Dental care'],
        ['id' => 'minor_surgery', 'label' => 'Minor surgery'],
        ['id' => 'ecg', 'label' => 'ECG & diagnostics'],
        ['id' => 'physio', 'label' => 'Physiotherapy'],
        ['id' => 'vaccine', 'label' => 'Vaccination centre'],
        ['id' => 'eye', 'label' => 'Eye care / optometry'],
    ];

    public function __construct(
        protected ImageProcessingService $imageService
    ) {}

    /**
     * Display the clinic setup wizard.
     */
    public function index(Request $request): Response|RedirectResponse
    {
        $tenant = tenant();
        $user = $request->user();

        if (! $tenant) {
            abort(404, 'Clinic workspace not found.');
        }

        // Non-admin roles attempting to access /setup
        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            if ($tenant->setup_grace_until !== null) {
                return redirect()->route('tenant.dashboard');
            }

            return Inertia::render('Setup/Waiting', [
                'clinicName' => (string) $tenant->name,
            ]);
        }

        $draftSections = ClinicWebsite::draftSections($tenant);
        $heroSec = collect($draftSections)->firstWhere('type', 'hero') ?? [];
        $hoursSec = collect($draftSections)->firstWhere('type', 'hours') ?? [];
        $servicesSec = collect($draftSections)->firstWhere('type', 'services') ?? [];
        $look = ClinicWebsite::draftLook($tenant);
        $planSlug = (string) ($tenant->subscription?->plan?->slug ?? $tenant->plan ?? 'pro');
        $planAllowsPharmacy = in_array($planSlug, ['pro', 'advanced', 'comp', 'standard', 'medvisit-standard'], true);

        // Calculate active doctors count
        $doctorsCount = Doctor::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->count();

        // Print settings
        $printSettings = PrintSettings::forTenant($tenant);

        // Stored services: combine directory_services and website services items
        $storedServices = $tenant->directory_services ?? [];
        if (empty($storedServices) && ! empty($servicesSec['items'])) {
            $storedServices = collect($servicesSec['items'])->pluck('name')->all();
        }

        // Clean weekly hours
        $weeklyHours = ! empty($hoursSec['days']) ? $hoursSec['days'] : ClinicWebsite::emptyWeek();

        $data = [
            'tenant' => [
                'id' => $tenant->id,
                'name' => (string) $tenant->name,
                'subdomain' => (string) $tenant->subdomain,
                'plan_slug' => $planSlug,
                'plan_name' => $tenant->currentPlanDisplayName(),
                'plan_allows_pharmacy' => $planAllowsPharmacy,
                'subscription_renews_on' => $tenant->subscription?->current_period_end?->format('d M Y') ?? now()->addMonth()->format('d M Y'),
                'setup_step' => (int) ($tenant->setup_step ?: 1),
                'setup_completed' => ! is_null($tenant->setup_completed_at),
                'setup_completed_at' => $tenant->setup_completed_at?->toIso8601String(),
                'in_grace' => $tenant->inSetupGrace(),
                'grace_days_remaining' => $tenant->setupGraceDaysRemaining(),
                'doctors_count' => $doctorsCount,
            ],
            'form' => [
                // Step 2: Logo & Brand
                'logo_url' => $tenant->logo_url,
                'logo_png_url' => $tenant->logo_png_url,
                'favicon_url' => $tenant->favicon_url,
                'brand_color' => $look['brand_color'] ?? '#0E9E8F',
                'theme' => $look['theme'] ?? 'medvisit-teal',

                // Step 3: Clinic Photo
                'cover_photo_url' => $heroSec['image_url'] ?? '',

                // Step 4: Location & Contact
                'address_line' => (string) ($tenant->address_line ?? ''),
                'city' => (string) ($tenant->city ?? ''),
                'district' => (string) ($tenant->district ?? ''),
                'postal_code' => (string) ($tenant->postal_code ?? ''),
                'latitude' => $tenant->directory_latitude !== null ? (float) $tenant->directory_latitude : 6.9271,
                'longitude' => $tenant->directory_longitude !== null ? (float) $tenant->directory_longitude : 79.8612,
                'has_pinned' => ($tenant->directory_latitude !== null && $tenant->directory_longitude !== null),
                'phone' => (string) ($tenant->phone ?? ''),
                'whatsapp' => (string) ($tenant->whatsapp_number ?? $tenant->phone ?? ''),
                'email' => (string) ($tenant->public_email ?? $user?->email ?? ''),

                // Step 5: Opening Hours
                'opening_hours' => $weeklyHours,
                'opening_hours_note' => (string) ($hoursSec['note'] ?? ''),

                // Step 6: Services
                'services' => $storedServices,

                // Step 7: Online Booking
                'online_booking_enabled' => $tenant->online_booking_enabled !== null
                    ? (bool) $tenant->online_booking_enabled
                    : (bool) ($tenant->data['online_booking_enabled'] ?? false),
                'max_active_tokens_per_phone' => (int) ($tenant->max_active_tokens_per_phone ?? 3),
                'require_staff_approval' => (bool) ($tenant->require_staff_approval ?? false),
                'require_phone_verification' => (bool) ($tenant->require_phone_verification ?? true),

                // Step 8: Pharmacy
                'pharmacy_enabled' => $planAllowsPharmacy
                    ? ($tenant->pharmacy_enabled !== null
                        ? (bool) $tenant->pharmacy_enabled
                        : (bool) ($tenant->data['pharmacy_enabled'] ?? false))
                    : false,
                'stock_reduction_mode' => (string) ($tenant->pharmacy_stock_reduction_mode ?? 'dispense'),

                // Step 9: Printing
                'print_enabled' => (bool) ($printSettings['print_enabled']),
                'print_receipt_format' => (string) ($printSettings['receipt_format']),
                'receipt_prefix' => (string) ($printSettings['receipt_prefix']),
                'print_token_slip_enabled' => (bool) ($printSettings['token_slip_enabled']),
                'print_token_slip_autoprint' => (bool) ($printSettings['token_slip_autoprint']),
                'prescription_print_enabled' => (bool) ($printSettings['prescription_print_enabled']),
                'prescription_print_language' => (string) ($printSettings['prescription_print_language']),
                'prescription_paper_size' => (string) ($printSettings['prescription_paper_size']),
                'print_header_show_logo' => (bool) ($printSettings['show_logo']),
                'print_header_show_address' => (bool) ($printSettings['show_address']),
                'registration_number' => (string) ($printSettings['registration_number']),

                // Step 10: Directory
                'directory_enabled' => $tenant->directory_enabled !== null
                    ? (bool) $tenant->directory_enabled
                    : (bool) ($tenant->data['directory_enabled'] ?? false),
                'directory_consented' => ! empty($tenant->directory_consented_at),
                'directory_consented_at' => $tenant->directory_consented_at,
            ],
            'districts' => ClinicRegistrationRequest::DISTRICTS,
            'preset_services' => self::PRESET_SERVICES,
        ];

        return Inertia::render('Setup/Index', $data);
    }

    /**
     * Save a specific step in the setup wizard.
     */
    public function saveStep(Request $request, int $step): JsonResponse
    {
        $tenant = tenant();
        $user = $request->user();

        if (! $tenant) {
            return response()->json(['message' => 'Clinic workspace not found.'], 404);
        }

        switch ($step) {
            case 1:
                // Step 1: Welcome - just advance
                $this->advanceStep($tenant, 2);
                $tenant->save();

                return response()->json(['success' => true, 'next_step' => 2]);

            case 2:
                // Step 2: Logo & Brand
                // Normalize legacy or alias theme keys if submitted
                $theme = $request->input('theme');
                if ($theme === 'emerald-care') {
                    $request->merge(['theme' => 'emerald-health']);
                } elseif ($theme === 'slate-clean') {
                    $request->merge(['theme' => 'slate-luxury']);
                } elseif (! in_array($theme, ClinicWebsite::THEMES, true)) {
                    $request->merge(['theme' => 'medvisit-teal']);
                }

                $validated = $request->validate([
                    'brand_color' => ['required', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
                    'theme' => ['required', 'string', 'in:'.implode(',', ClinicWebsite::THEMES)],
                    'use_initials' => ['nullable', 'boolean'],
                ]);

                // If user chose initials and has no logo, generate a clean initials logo
                if (! empty($validated['use_initials']) && empty($tenant->logo_path)) {
                    $this->generateInitialsLogo($tenant, $validated['brand_color']);
                }

                if (empty($tenant->logo_path) && empty($tenant->logo_url) && empty($validated['use_initials'])) {
                    throw ValidationException::withMessages([
                        'logo' => ['Please upload a clinic logo or select "Use my clinic initials".'],
                    ]);
                }

                // Update both draft and live look
                $brandColor = strtoupper($validated['brand_color']);
                $theme = $validated['theme'];

                $draftLook = ClinicWebsite::draftLook($tenant);
                $draftLook['brand_color'] = $brandColor;
                $draftLook['theme'] = $theme;
                $tenant->website_look_draft = $draftLook;

                $liveLook = ClinicWebsite::liveLook($tenant);
                $liveLook['brand_color'] = $brandColor;
                $liveLook['theme'] = $theme;
                $tenant->website_look = $liveLook;
                $tenant->website_theme = $theme;

                $this->advanceStep($tenant, 3);
                $tenant->save();

                AuditLogger::log('clinic.setup_step_saved', [
                    'tenant_id' => $tenant->id,
                    'step' => 2,
                    'name' => 'Logo & Brand',
                ]);

                return response()->json(['success' => true, 'next_step' => 3]);

            case 3:
                // Step 3: Clinic Photo (Optional Cover Photo)
                $validated = $request->validate([
                    'cover_photo_url' => ['nullable', 'string', 'max:2048'],
                    'skipped' => ['nullable', 'boolean'],
                ]);

                $photoUrl = $validated['cover_photo_url'] ?? null;

                if (! empty($photoUrl)) {
                    // Update hero section in both draft and live sections
                    $this->updateSectionAcrossDraftAndLive($tenant, 'hero', function (&$hero) use ($photoUrl) {
                        $hero['image_url'] = $photoUrl;
                    });

                    // Set hero style to 'photo'
                    $draftLook = ClinicWebsite::draftLook($tenant);
                    $draftLook['hero_style'] = 'photo';
                    $tenant->website_look_draft = $draftLook;

                    $liveLook = ClinicWebsite::liveLook($tenant);
                    $liveLook['hero_style'] = 'photo';
                    $tenant->website_look = $liveLook;

                    $tenant->website_share_image = $photoUrl;
                }

                $this->advanceStep($tenant, 4);
                $tenant->save();

                AuditLogger::log('clinic.setup_step_saved', [
                    'tenant_id' => $tenant->id,
                    'step' => 3,
                    'name' => 'Clinic Photo',
                ]);

                return response()->json(['success' => true, 'next_step' => 4]);

            case 4:
                // Step 4: Location & Contact
                $validated = $request->validate([
                    'address_line' => ['required', 'string', 'max:255'],
                    'city' => ['required', 'string', 'max:100'],
                    'district' => ['required', 'string', 'in:'.implode(',', ClinicRegistrationRequest::DISTRICTS)],
                    'postal_code' => ['nullable', 'string', 'max:20'],
                    'latitude' => ['required', 'numeric', 'between:5.8,9.9'],
                    'longitude' => ['required', 'numeric', 'between:79.6,82.0'],
                    'phone' => ['required', 'string', 'max:50'],
                    'whatsapp' => ['nullable', 'string', 'max:50'],
                    'email' => ['nullable', 'email', 'max:100'],
                ]);

                $normalizedPhone = ClinicRegistrationRequest::normalizePhone($validated['phone']);
                $normalizedWhatsApp = ! empty($validated['whatsapp'])
                    ? ClinicRegistrationRequest::normalizePhone($validated['whatsapp'])
                    : $normalizedPhone;

                $formattedAddress = implode(', ', array_filter([
                    $validated['address_line'],
                    $validated['city'],
                    $validated['district'],
                    $validated['postal_code'] ?? null,
                ]));

                $tenant->address_line = trim($validated['address_line']);
                $tenant->city = trim($validated['city']);
                $tenant->district = $validated['district'];
                $tenant->postal_code = ! empty($validated['postal_code']) ? trim($validated['postal_code']) : null;
                $tenant->address = $formattedAddress;
                $tenant->legacy_address = $formattedAddress;
                $tenant->phone = $normalizedPhone;
                $tenant->whatsapp_number = $normalizedWhatsApp;
                $tenant->public_email = ! empty($validated['email']) ? trim($validated['email']) : null;

                // Sync directory coordinates and district/city
                $tenant->directory_latitude = (float) $validated['latitude'];
                $tenant->directory_longitude = (float) $validated['longitude'];
                $tenant->directory_district = $validated['district'];
                $tenant->directory_city = trim($validated['city']);

                // Update contact section in both draft and live website
                $this->updateSectionAcrossDraftAndLive($tenant, 'contact', function (&$contact) use ($tenant, $validated) {
                    $contact['phone'] = $tenant->phone;
                    $contact['whatsapp'] = $tenant->whatsapp_number;
                    $contact['address'] = $tenant->address;
                    $contact['latitude'] = (float) $validated['latitude'];
                    $contact['longitude'] = (float) $validated['longitude'];
                });

                $this->advanceStep($tenant, 5);
                $tenant->save();

                AuditLogger::log('clinic.setup_step_saved', [
                    'tenant_id' => $tenant->id,
                    'step' => 4,
                    'name' => 'Location & Contact',
                ]);

                return response()->json(['success' => true, 'next_step' => 5]);

            case 5:
                // Step 5: Opening Hours
                // Support both {mon: {open: true, start: '08:30', end: '17:30'}} and {days: [...]}
                if ($request->has('opening_hours') && ! $request->has('days')) {
                    $rawHours = (array) $request->input('opening_hours', []);
                    $daysArray = [];
                    foreach (['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as $d) {
                        $info = $rawHours[$d] ?? ['day' => $d, 'open' => false];
                        $isOpen = ! empty($info['open']);
                        $start = $info['start'] ?? '08:30';
                        $end = $info['end'] ?? '17:30';
                        $daysArray[] = [
                            'day' => $d,
                            'open' => $isOpen,
                            'ranges' => $isOpen ? [['from' => $start, 'to' => $end]] : [],
                        ];
                    }
                    $request->merge([
                        'days' => $daysArray,
                        'note' => $request->input('opening_hours_note', $request->input('note', '')),
                    ]);
                }

                $validated = $request->validate([
                    'days' => ['required', 'array', 'size:7'],
                    'days.*.day' => ['required', 'string', 'in:mon,tue,wed,thu,fri,sat,sun'],
                    'days.*.open' => ['required', 'boolean'],
                    'days.*.ranges' => ['array'],
                    'days.*.ranges.*.from' => ['required_with:days.*.ranges', 'regex:/^\d{2}:\d{2}$/'],
                    'days.*.ranges.*.to' => ['required_with:days.*.ranges', 'regex:/^\d{2}:\d{2}$/'],
                    'note' => ['nullable', 'string', 'max:250'],
                ]);

                // Ensure at least one open day with valid times
                $hasAtLeastOneOpenDay = false;
                foreach ($validated['days'] as $day) {
                    if ($day['open']) {
                        if (empty($day['ranges'])) {
                            throw ValidationException::withMessages([
                                'days' => ["Please set opening hours for {$day['day']} or mark it closed."],
                            ]);
                        }
                        foreach ($day['ranges'] as $range) {
                            if ($range['from'] >= $range['to']) {
                                throw ValidationException::withMessages([
                                    'days' => ["Opening time must be earlier than closing time on {$day['day']}."],
                                ]);
                            }
                        }
                        $hasAtLeastOneOpenDay = true;
                    }
                }

                if (! $hasAtLeastOneOpenDay) {
                    throw ValidationException::withMessages([
                        'days' => ['Please set at least one day open with working hours.'],
                    ]);
                }

                // Update hours section across both draft and live website
                $cleanDays = array_map(function ($day) {
                    return [
                        'day' => $day['day'],
                        'open' => (bool) $day['open'],
                        'ranges' => $day['open'] ? array_values($day['ranges'] ?? []) : [],
                    ];
                }, $validated['days']);

                $note = trim($validated['note'] ?? '');

                $this->updateSectionAcrossDraftAndLive($tenant, 'hours', function (&$hours) use ($cleanDays, $note) {
                    $hours['days'] = $cleanDays;
                    $hours['note'] = $note;
                });

                $this->advanceStep($tenant, 6);
                $tenant->save();

                AuditLogger::log('clinic.setup_step_saved', [
                    'tenant_id' => $tenant->id,
                    'step' => 5,
                    'name' => 'Opening Hours',
                ]);

                return response()->json(['success' => true, 'next_step' => 6]);

            case 6:
                // Step 6: Services Provided
                $validated = $request->validate([
                    'services' => ['required', 'array', 'min:1'],
                    'services.*' => ['required', 'string', 'max:50'],
                ]);

                $cleanServices = array_values(array_unique(array_map('trim', $validated['services'])));
                $tenant->directory_services = $cleanServices;

                // Sync website services section
                $serviceItems = array_map(function ($serviceName) {
                    return [
                        'name' => $serviceName,
                        'description' => '',
                    ];
                }, $cleanServices);

                $this->updateSectionAcrossDraftAndLive($tenant, 'services', function (&$services) use ($serviceItems) {
                    $services['items'] = $serviceItems;
                });

                $this->advanceStep($tenant, 7);
                $tenant->save();

                AuditLogger::log('clinic.setup_step_saved', [
                    'tenant_id' => $tenant->id,
                    'step' => 6,
                    'name' => 'Services Provided',
                ]);

                return response()->json(['success' => true, 'next_step' => 7]);

            case 7:
                // Step 7: Online Booking
                $validated = $request->validate([
                    'online_booking_enabled' => ['required', 'boolean'],
                    'max_active_tokens_per_phone' => ['nullable', 'integer', 'min:1', 'max:10'],
                    'require_phone_verification' => ['nullable', 'boolean'],
                    'require_staff_approval' => ['nullable', 'boolean'],
                ]);

                $tenant->online_booking_enabled = (bool) $validated['online_booking_enabled'];
                if (isset($validated['max_active_tokens_per_phone'])) {
                    $tenant->max_active_tokens_per_phone = (int) $validated['max_active_tokens_per_phone'];
                }
                if (isset($validated['require_phone_verification'])) {
                    $tenant->require_phone_verification = (bool) $validated['require_phone_verification'];
                }
                if (isset($validated['require_staff_approval'])) {
                    $tenant->require_staff_approval = (bool) $validated['require_staff_approval'];
                }

                $this->advanceStep($tenant, 8);
                $tenant->save();

                AuditLogger::log('clinic.setup_step_saved', [
                    'tenant_id' => $tenant->id,
                    'step' => 7,
                    'name' => 'Online Booking',
                    'enabled' => $tenant->online_booking_enabled,
                ]);

                return response()->json(['success' => true, 'next_step' => 8]);

            case 8:
                // Step 8: Pharmacy Module
                $validated = $request->validate([
                    'pharmacy_enabled' => ['required', 'boolean'],
                    'stock_reduction_mode' => ['nullable', 'string', 'in:dispense,consultation,bill,finalize'],
                ]);

                $planSlug = (string) ($tenant->subscription?->plan?->slug ?? $tenant->plan ?? 'pro');
                $planAllowsPharmacy = in_array($planSlug, ['pro', 'advanced', 'comp', 'standard', 'medvisit-standard'], true);

                if ($validated['pharmacy_enabled'] && ! $planAllowsPharmacy) {
                    throw ValidationException::withMessages([
                        'pharmacy_enabled' => ['The Pharmacy module is included in Pro and Advanced plans. Please upgrade to enable pharmacy or continue without pharmacy.'],
                    ]);
                }

                $tenant->pharmacy_enabled = (bool) $validated['pharmacy_enabled'];
                if ($tenant->pharmacy_enabled) {
                    $tenant->pharmacy_stock_reduction_mode = $validated['stock_reduction_mode'] ?? 'dispense';
                    $tenant->pharmacy_default_reorder_level = (int) ($tenant->pharmacy_default_reorder_level ?? 10);
                    $tenant->pharmacy_expiring_soon_days = (int) ($tenant->pharmacy_expiring_soon_days ?? 60);
                }

                $this->advanceStep($tenant, 9);
                $tenant->save();

                AuditLogger::log('clinic.setup_step_saved', [
                    'tenant_id' => $tenant->id,
                    'step' => 8,
                    'name' => 'Pharmacy Module',
                    'enabled' => $tenant->pharmacy_enabled,
                ]);

                return response()->json(['success' => true, 'next_step' => 9]);

            case 9:
                // Step 9: Printing
                $validated = $request->validate([
                    'print_enabled' => ['required', 'boolean'],
                    'receipt_format' => ['required_if:print_enabled,true', 'string', 'in:80mm,a4,both'],
                    'receipt_prefix' => ['nullable', 'string', 'max:8'],
                    'token_slip_enabled' => ['nullable', 'boolean'],
                    'token_slip_autoprint' => ['nullable', 'boolean'],
                    'prescription_print_enabled' => ['nullable', 'boolean'],
                    'prescription_print_language' => ['nullable', 'string', 'in:en,ta,si'],
                    'prescription_paper_size' => ['nullable', 'string', 'in:a5,a4'],
                    'print_header_show_logo' => ['nullable', 'boolean'],
                    'print_header_show_address' => ['nullable', 'boolean'],
                    'registration_number' => ['nullable', 'string', 'max:50'],
                ]);

                $tenant->print_enabled = (bool) $validated['print_enabled'];
                if ($tenant->print_enabled) {
                    $tenant->print_receipt_format = $validated['receipt_format'];
                    $tenant->receipt_prefix = ! empty($validated['receipt_prefix'])
                        ? strtoupper(trim($validated['receipt_prefix']))
                        : ($tenant->receipt_prefix ?? 'REC');
                    $tenant->print_token_slip_enabled = (bool) ($validated['token_slip_enabled'] ?? true);
                    $tenant->print_token_slip_autoprint = (bool) ($validated['token_slip_autoprint'] ?? false);
                    $tenant->prescription_print_enabled = (bool) ($validated['prescription_print_enabled'] ?? false);
                    $tenant->prescription_print_language = $validated['prescription_print_language'] ?? 'en';
                    $tenant->prescription_paper_size = $validated['prescription_paper_size'] ?? 'a5';
                    $tenant->print_header_show_logo = (bool) ($validated['print_header_show_logo'] ?? true);
                    $tenant->print_header_show_address = (bool) ($validated['print_header_show_address'] ?? true);
                    if (isset($validated['registration_number'])) {
                        $tenant->registration_number = trim($validated['registration_number']);
                    }
                }

                $this->advanceStep($tenant, 10);
                $tenant->save();

                AuditLogger::log('clinic.setup_step_saved', [
                    'tenant_id' => $tenant->id,
                    'step' => 9,
                    'name' => 'Printing',
                ]);

                return response()->json(['success' => true, 'next_step' => 10]);

            case 10:
                // Step 10: Public Directory Opt-in
                $validated = $request->validate([
                    'directory_enabled' => ['required', 'boolean'],
                    'consent' => ['nullable', 'boolean'],
                ]);

                $isEnabling = (bool) $validated['directory_enabled'];
                if ($isEnabling && empty($tenant->directory_consented_at) && empty($validated['consent'])) {
                    throw ValidationException::withMessages([
                        'consent' => ['You must confirm accuracy and consent to publish clinic details on medvisit.lk.'],
                    ]);
                }

                $tenant->directory_enabled = $isEnabling;
                if ($isEnabling && empty($tenant->directory_consented_at)) {
                    $tenant->directory_consented_at = now()->toIso8601String();
                    $tenant->directory_consented_by_user_id = $user?->id;
                }

                $this->advanceStep($tenant, 11);
                $tenant->save();

                // Dispatch sync job if enabled
                if ($isEnabling) {
                    SyncClinicDirectoryListing::dispatch((string) $tenant->id);
                }

                AuditLogger::log('clinic.setup_step_saved', [
                    'tenant_id' => $tenant->id,
                    'step' => 10,
                    'name' => 'Public Directory',
                    'enabled' => $isEnabling,
                ]);

                return response()->json(['success' => true, 'next_step' => 11]);

            default:
                return response()->json(['message' => 'Invalid setup step.'], 400);
        }
    }

    /**
     * Finalize clinic setup and unlock dashboard.
     */
    public function complete(Request $request): JsonResponse
    {
        $tenant = tenant();
        $user = $request->user();

        if (! $tenant) {
            return response()->json(['message' => 'Clinic workspace not found.'], 404);
        }

        // Validate completeness of all required decisions
        if (empty($tenant->logo_path) && empty($tenant->logo_url)) {
            return response()->json(['message' => 'Please provide a clinic logo or initials in Step 2.', 'step' => 2], 422);
        }

        if (empty($tenant->address_line) || empty($tenant->city) || empty($tenant->district)) {
            return response()->json(['message' => 'Please provide clinic address details in Step 4.', 'step' => 4], 422);
        }

        if (empty($tenant->directory_services)) {
            return response()->json(['message' => 'Please select at least one service provided in Step 6.', 'step' => 6], 422);
        }

        $now = Carbon::now();
        $tenant->setup_completed_at = $now;
        $tenant->setup_step = 11;
        $tenant->save();

        AuditLogger::log('clinic.setup_completed', [
            'tenant_id' => $tenant->id,
            'completed_by_user_id' => $user?->id,
            'completed_at' => $now->toDateTimeString(),
        ]);

        // Send Clinic Ready Email
        try {
            $adminEmail = $user?->email;
            if ($adminEmail) {
                $bookingUrl = $tenant->url('/book');
                $dashboardUrl = $tenant->url('/dashboard');

                // Generate QR code data URI if package available
                $qrCodeDataUri = '';
                if (class_exists(Builder::class) || class_exists(QrCode::class)) {
                    // Try generation if available
                }

                Mail::to($adminEmail)->send(new ClinicReadyMail($tenant, $bookingUrl, $dashboardUrl, $qrCodeDataUri));
            }
        } catch (\Throwable $e) {
            // Log but don't fail setup completion
            AuditLogger::log('clinic.setup_email_failed', [
                'tenant_id' => $tenant->id,
                'error' => $e->getMessage(),
            ]);
        }

        return response()->json([
            'success' => true,
            'celebration' => true,
            'redirect' => route('tenant.dashboard'),
        ]);
    }

    /**
     * Upload clinic cover photo (16:9).
     */
    public function uploadPhoto(Request $request): JsonResponse
    {
        $tenant = tenant();
        $request->validate([
            'type' => ['nullable', 'string', 'in:cover,logo'],
            'file' => ['nullable', 'file', 'max:5120', 'mimes:png,jpg,jpeg,webp'],
            'source_url' => ['nullable', 'string', 'max:2048'],
        ]);

        $type = $request->input('type', 'cover');
        $binary = null;
        if ($request->hasFile('file')) {
            $uploaded = $request->file('file');
            if (! $uploaded->isValid()) {
                throw ValidationException::withMessages(['file' => ['The uploaded file is corrupt or invalid.']]);
            }
            $binary = $uploaded->get();
        } elseif ($request->filled('source_url')) {
            $binary = $this->imageService->fetchSecurelyFromUrl($request->input('source_url'), $request->user()?->id);
        } else {
            throw ValidationException::withMessages(['file' => ['Please upload an image file or provide a link.']]);
        }

        $this->imageService->validateImageBytes($binary);

        if ($type === 'logo') {
            $result = $this->imageService->processClinicLogo($tenant, $binary);
            $tenant->logo_path = $result['logo_path'];
            $tenant->logo_url = $result['logo_url'];
            $tenant->logo_png_path = $result['logo_png_path'];
            $tenant->save();

            AuditLogger::log('clinic.logo_updated', [
                'tenant_id' => $tenant->id,
                'logo_path' => $result['logo_path'],
            ]);

            return response()->json([
                'success' => true,
                'url' => $result['logo_url'],
                'logo_url' => $result['logo_url'],
                'logo_png_url' => $result['logo_png_url'],
            ]);
        }

        $disk = $this->imageService->getDisk();
        $hash = Str::random(24);
        $path = "tenants/{$tenant->id}/branding/cover_{$hash}.webp";

        // Store cover image
        Storage::disk($disk)->put($path, $binary);
        $url = Storage::disk($disk)->url($path).'?v='.time();

        return response()->json([
            'success' => true,
            'url' => $url,
            'cover_photo_url' => $url,
        ]);
    }

    /**
     * Dismiss the top setup grace banner for current session.
     */
    public function dismissBanner(Request $request): JsonResponse|RedirectResponse
    {
        $request->session()->put('setup_banner_dismissed', true);

        if ($request->wantsJson()) {
            return response()->json(['success' => true]);
        }

        return redirect()->back();
    }

    /**
     * Helper to advance resume step.
     */
    protected function advanceStep(Tenant $tenant, int $nextStep): void
    {
        if ((int) $tenant->setup_step < $nextStep) {
            $tenant->setup_step = $nextStep;
        }
    }

    /**
     * Helper to update specific section in both website_sections_draft and live website_sections.
     */
    protected function updateSectionAcrossDraftAndLive(Tenant $tenant, string $sectionType, callable $modifier): void
    {
        // 1. Update draft
        $draftSections = ClinicWebsite::draftSections($tenant);
        foreach ($draftSections as &$section) {
            if (($section['type'] ?? $section['id'] ?? '') === $sectionType) {
                $modifier($section);
            }
        }
        $tenant->website_sections_draft = $draftSections;

        // 2. Update live
        $liveSections = ClinicWebsite::liveSections($tenant);
        foreach ($liveSections as &$section) {
            if (($section['type'] ?? $section['id'] ?? '') === $sectionType) {
                $modifier($section);
            }
        }
        $tenant->website_sections = $liveSections;
    }

    /**
     * Generate an initial-based square logo when clinic has no image.
     */
    protected function generateInitialsLogo(Tenant $tenant, string $brandColor): void
    {
        $words = explode(' ', trim((string) $tenant->name));
        $initials = '';
        foreach (array_slice($words, 0, 2) as $w) {
            $initials .= mb_strtoupper(mb_substr($w, 0, 1));
        }
        $initials = $initials ?: 'MV';

        // Create 512x512 SVG with brand color background and clean white text
        $svg = <<<SVG
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="128" fill="{$brandColor}"/>
    <text x="50%" y="54%" font-family="Poppins, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="192" font-weight="700" fill="#FFFFFF" dominant-baseline="middle" text-anchor="middle">{$initials}</text>
</svg>
SVG;

        $disk = $this->imageService->getDisk();
        $hash = Str::random(24);
        $path = "tenants/{$tenant->id}/branding/initials_{$hash}.svg";

        Storage::disk($disk)->put($path, $svg);
        $url = Storage::disk($disk)->url($path).'?v='.time();

        $tenant->logo_path = $path;
        $tenant->logo_url = $url;
        $tenant->logo_png_path = $path;
    }
}
