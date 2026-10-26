<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ClinicRegistrationRequest;
use App\Jobs\SyncClinicDirectoryListing;
use App\Models\AuditEvent;
use App\Models\Doctor;
use App\Models\TvDevice;
use App\Support\TvDisplayHelper;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ClinicSettingsController extends Controller
{
    /**
     * Show Clinic Settings & Audit Trail.
     */
    public function index(Request $request, ?string $section = 'profile'): Response
    {
        $tenant = tenant();

        // 1. Clinic Profile
        $profile = [
            'name' => (string) ($tenant->name ?? ''),
            'subdomain' => (string) ($tenant->subdomain ?? ''),
            'phone' => (string) ($tenant->phone ?? ''),
            'address' => (string) ($tenant->formatted_address ?: ($tenant->address ?? '')),
            'address_line' => (string) ($tenant->address_line ?? ''),
            'city' => (string) ($tenant->city ?? ''),
            'district' => (string) ($tenant->district ?? ''),
            'postal_code' => (string) ($tenant->postal_code ?? ''),
            'legacy_address' => (string) ($tenant->legacy_address ?? ($tenant->address ?? '')),
            'registration_number' => (string) ($tenant->registration_number ?? ''),
            'logo_url' => (string) ($tenant->logo_url ?? ''),
            'logo_png_url' => (string) ($tenant->logo_png_url ?? ''),
            'favicon_url' => (string) ($tenant->favicon_url ?? '/favicon.ico'),
            'plan' => $tenant->plan ?? 'growth',
            'status' => $tenant->status ?? 'active',
            'districts' => ClinicRegistrationRequest::DISTRICTS,
        ];

        // 2. Session Defaults
        $sessionDefaults = [
            'default_avg_consultation_minutes' => (int) ($tenant->default_avg_consultation_minutes ?? 10),
            'default_max_tokens' => (int) ($tenant->default_max_tokens ?? 20),
            'cancellation_window_hours' => (int) ($tenant->cancellation_window_hours ?? 2),
            'auto_generate_days' => (int) ($tenant->auto_generate_days ?? 30),
        ];

        // 3. Billing Settings
        $feeSettings = $tenant->fee_settings ?? [];
        $billingSettings = [
            'billing_timing' => $tenant->billing_timing ?? 'pay_at_issue', // pay_at_issue | pay_after_consult
            'receipt_prefix' => $tenant->receipt_prefix ?? 'REC',
            'tax_percentage' => (float) ($tenant->tax_percentage ?? 0),
            'accepted_methods' => $tenant->accepted_methods ?? ['cash', 'card', 'bank_transfer'],
            'show_clinic_share_to_doctors' => (bool) ($feeSettings['show_clinic_share_to_doctors'] ?? false),
            'currency' => 'LKR',
        ];

        // 4. Online Booking Settings
        $onlineBookingSettings = [
            'online_booking_enabled' => (bool) ($tenant->online_booking_enabled ?? true),
            'max_active_tokens_per_phone' => (int) ($tenant->max_active_tokens_per_phone ?? 3),
            'require_staff_approval' => (bool) ($tenant->require_staff_approval ?? false),
            'require_phone_verification' => (bool) ($tenant->require_phone_verification ?? true),
            'phone_verification_methods' => $tenant->phone_verification_methods ?? config('phone_verification.channels', ['whatsapp', 'textlk']),
            'platform_available_channels' => config('phone_verification.channels', ['whatsapp', 'textlk']),
        ];

        // 5. Pharmacy & Prescription Settings
        $pharmacySettings = [
            'pharmacy_enabled' => (bool) ($tenant->pharmacy_enabled ?? false),
            'default_reorder_level' => (int) ($tenant->pharmacy_default_reorder_level ?? 10),
            'expiring_soon_threshold_days' => (int) ($tenant->pharmacy_expiring_soon_days ?? 60),
            'stock_reduction_mode' => $tenant->pharmacy_stock_reduction_mode ?? 'dispense',
            'prescription_print_enabled' => (bool) ($tenant->prescription_print_enabled ?? true),
            'prescription_print_language' => $tenant->prescription_print_language ?? 'en',
            'prescription_print_show_doctor_reg' => (bool) ($tenant->prescription_print_show_doctor_reg ?? true),
            'prescription_print_show_diagnosis' => (bool) ($tenant->prescription_print_show_diagnosis ?? false),
        ];

        // 6. Audit Log Viewer with Query Filters
        $auditQuery = AuditEvent::with('user')
            ->where('tenant_id', $tenant->id)
            ->latest('created_at');

        if ($request->filled('action')) {
            $auditQuery->where('action', $request->input('action'));
        }

        if ($request->filled('date')) {
            $auditQuery->whereDate('created_at', $request->input('date'));
        }

        if ($request->filled('search')) {
            $search = '%'.$request->input('search').'%';
            $auditQuery->where(function ($q) use ($search) {
                $q->where('action', 'ilike', $search)
                    ->orWhere('resource_type', 'ilike', $search)
                    ->orWhere('ip_address', 'ilike', $search)
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'ilike', $search)
                            ->orWhere('email', 'ilike', $search);
                    });
            });
        }

        $auditLogs = $auditQuery->limit(100)->get()->map(function ($event) {
            return [
                'id' => $event->id,
                'action' => $event->action,
                'resource_type' => $event->resource_type,
                'resource_id' => $event->resource_id,
                'metadata' => $event->metadata,
                'ip_address' => $event->ip_address,
                'user_name' => $event->user?->name ?? 'System',
                'user_email' => $event->user?->email,
                'created_at' => $event->created_at->format('M d, Y h:i A'),
                'created_at_relative' => $event->created_at->diffForHumans(),
            ];
        });

        // Available actions for filter dropdown
        $availableActions = AuditEvent::where('tenant_id', $tenant->id)
            ->select('action')
            ->distinct()
            ->orderBy('action')
            ->pluck('action')
            ->all();

        // 6. Public Directory Settings
        $activeDoctorsCount = Doctor::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->count();

        $data = $tenant->data ?? [];
        $registeredDistrict = ! empty($data['district']) ? $data['district'] : (! empty($tenant->district) ? $tenant->district : '');
        $registeredCity = ! empty($data['city']) ? $data['city'] : (! empty($tenant->city) ? $tenant->city : '');

        $district = ! empty($tenant->directory_district) ? $tenant->directory_district : $registeredDistrict;
        $city = ! empty($tenant->directory_city) ? $tenant->directory_city : $registeredCity;
        $lat = $tenant->directory_latitude ?? null;
        $lng = $tenant->directory_longitude ?? null;
        $hasCoords = ($lat !== null && $lng !== null);

        $missingFields = [];
        if (empty($district)) {
            $missingFields[] = 'District';
        }
        if (empty($tenant->phone)) {
            $missingFields[] = 'Clinic phone number';
        }
        if (! $hasCoords) {
            $missingFields[] = 'Map pin location';
        }
        if ($activeDoctorsCount === 0) {
            $missingFields[] = 'At least one active doctor';
        }

        $centralBase = config('app.url', 'http://127.0.0.1:8000');
        $previewUrl = rtrim($centralBase, '/').'/clinics/'.$tenant->subdomain;

        $directorySettings = [
            'enabled' => (bool) ($tenant->directory_enabled ?? false),
            'consented_at' => $tenant->directory_consented_at ? Carbon::parse($tenant->directory_consented_at)->format('M d, Y h:i A') : null,
            'district' => (string) $district,
            'city' => (string) $city,
            'latitude' => $hasCoords ? (float) $lat : 6.9271,
            'longitude' => $hasCoords ? (float) $lng : 79.8612,
            'has_pinned' => $hasCoords,
            'description' => (string) ($tenant->directory_description ?? ''),
            'services' => $tenant->directory_services ?? ['OPD Consultation', 'Specialist Channeling'],
            'active_doctors_count' => $activeDoctorsCount,
            'missing_fields' => $missingFields,
            'preview_url' => $previewUrl,
            'districts' => config('medvisit_public.directory.districts', ClinicRegistrationRequest::DISTRICTS),
            'fixed_services' => config('medvisit_public.directory.fixed_services', []),
            'is_owner' => $request->user()?->hasRole('clinic_admin') || $request->user()?->hasRole('super_admin'),
        ];

        // 7. TV Display Settings & Paired Devices
        $tvSettings = [
            'name_display_mode' => (string) ($tenant->tv_name_display_mode ?? 'token_only'),
            'languages' => $tenant->tv_languages ?? ['en', 'ta', 'si'],
            'chime_enabled' => (bool) ($tenant->tv_chime_enabled ?? true),
            'voice_language' => (string) ($tenant->tv_voice_language ?? 'off'),
            'ticker_text' => (string) ($tenant->tv_ticker_text ?? 'Please have your token slip ready. Keep the waiting area quiet and comfortable for all patients.'),
            'theme' => (string) ($tenant->tv_theme ?? 'dark'),
            'reduced_motion' => (bool) ($tenant->tv_reduced_motion ?? false),
        ];

        $tvDevices = TvDevice::where('tenant_id', $tenant->id)
            ->orderByDesc('last_seen_at')
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => $d->name,
                'doctor_ids' => $d->doctor_ids,
                'last_seen_at' => $d->last_seen_at?->diffForHumans() ?? 'Never',
                'last_seen_timestamp' => $d->last_seen_at?->timestamp,
                'is_online' => $d->last_seen_at ? $d->last_seen_at->gt(now()->subMinutes(2)) : false,
                'is_revoked' => $d->isRevoked(),
                'revoked_at' => $d->revoked_at?->toIso8601String(),
                'created_at' => $d->created_at->format('M d, Y'),
            ]);

        $availableDoctors = Doctor::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->select('id', 'name', 'title', 'specialty')
            ->orderBy('name')
            ->get()
            ->map(fn ($doc) => [
                'id' => $doc->id,
                'name' => TvDisplayHelper::formatDoctorName($doc->name, $doc->title),
                'specialty' => $doc->specialty,
            ]);

        return Inertia::render('Settings/Index', [
            'activeSection' => $section ?: 'profile',
            'profile' => $profile,
            'sessionDefaults' => $sessionDefaults,
            'billingSettings' => $billingSettings,
            'onlineBookingSettings' => $onlineBookingSettings,
            'pharmacySettings' => $pharmacySettings,
            'directorySettings' => $directorySettings,
            'tvSettings' => $tvSettings,
            'tvDevices' => $tvDevices,
            'availableDoctors' => $availableDoctors,
            'auditLogs' => $auditLogs,
            'availableActions' => $availableActions,
            'districts' => ClinicRegistrationRequest::DISTRICTS,
            'filters' => [
                'action' => $request->input('action', ''),
                'search' => $request->input('search', ''),
                'date' => $request->input('date', ''),
            ],
        ]);
    }

    /**
     * Update Clinic Profile.
     */
    public function updateProfile(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address_line' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'district' => ['nullable', 'string', 'in:'.implode(',', ClinicRegistrationRequest::DISTRICTS)],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'address' => ['nullable', 'string', 'max:500'],
            'registration_number' => ['nullable', 'string', 'max:100'],
            'logo_url' => ['nullable', 'string', 'max:500'],
        ]);

        $tenant = tenant();
        $tenant->name = trim($validated['name']);
        $tenant->phone = ! empty($validated['phone']) ? ClinicRegistrationRequest::normalizePhone($validated['phone']) : null;

        $addressLine = ! empty($validated['address_line']) ? trim($validated['address_line']) : null;
        $city = ! empty($validated['city']) ? trim($validated['city']) : null;
        $district = ! empty($validated['district']) ? trim($validated['district']) : null;
        $postalCode = ! empty($validated['postal_code']) ? trim($validated['postal_code']) : null;

        $formatted = implode(', ', array_filter([$addressLine, $city, $district, $postalCode]));

        $tenant->address_line = $addressLine;
        $tenant->city = $city;
        $tenant->district = $district;
        $tenant->postal_code = $postalCode;
        $tenant->address = $formatted ?: ($validated['address'] ?? $tenant->address);
        if (empty($tenant->legacy_address) && ! empty($tenant->address)) {
            $tenant->legacy_address = $tenant->address;
        }

        // Also synchronize directory_district and directory_city if empty
        if ($district && empty($tenant->directory_district)) {
            $tenant->directory_district = $district;
        }
        if ($city && empty($tenant->directory_city)) {
            $tenant->directory_city = $city;
        }

        $tenant->registration_number = $validated['registration_number'] ?? null;
        $tenant->logo_url = $validated['logo_url'] ?? null;
        $tenant->save();

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => 'settings.profile_updated',
            'resource_type' => 'tenant',
            'resource_id' => $tenant->id,
            'metadata' => [
                'updated_fields' => array_keys($validated),
                'clinic_name' => $tenant->name,
                'address' => $tenant->address,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', 'Clinic profile updated successfully.');
    }

    /**
     * Update Session Defaults.
     */
    public function updateSessionDefaults(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'default_avg_consultation_minutes' => ['required', 'integer', 'min:3', 'max:60'],
            'default_max_tokens' => ['required', 'integer', 'min:1', 'max:100'],
            'cancellation_window_hours' => ['required', 'integer', 'min:0', 'max:48'],
            'auto_generate_days' => ['required', 'integer', 'min:7', 'max:90'],
        ]);

        $tenant = tenant();
        $tenant->default_avg_consultation_minutes = $validated['default_avg_consultation_minutes'];
        $tenant->default_max_tokens = $validated['default_max_tokens'];
        $tenant->cancellation_window_hours = $validated['cancellation_window_hours'];
        $tenant->auto_generate_days = $validated['auto_generate_days'];
        $tenant->save();

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => 'settings.session_defaults_updated',
            'resource_type' => 'tenant',
            'resource_id' => $tenant->id,
            'metadata' => $validated,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', 'Channeling session defaults updated successfully.');
    }

    /**
     * Update Billing Settings.
     */
    public function updateBillingSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'billing_timing' => ['required', 'string', 'in:pay_at_issue,pay_after_consult'],
            'receipt_prefix' => ['required', 'string', 'max:10'],
            'tax_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'accepted_methods' => ['required', 'array', 'min:1'],
            'accepted_methods.*' => ['string', 'in:cash,card,bank_transfer'],
            'show_clinic_share_to_doctors' => ['nullable', 'boolean'],
        ]);

        $tenant = tenant();
        $tenant->billing_timing = $validated['billing_timing'];
        $tenant->receipt_prefix = strtoupper(trim($validated['receipt_prefix']));
        $tenant->tax_percentage = $validated['tax_percentage'] ?? 0;
        $tenant->accepted_methods = $validated['accepted_methods'];

        if (array_key_exists('show_clinic_share_to_doctors', $validated)) {
            $feeSettings = $tenant->fee_settings ?? [];
            $feeSettings['show_clinic_share_to_doctors'] = (bool) $validated['show_clinic_share_to_doctors'];
            $tenant->fee_settings = $feeSettings;
        }

        $tenant->save();

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => 'settings.billing_updated',
            'resource_type' => 'tenant',
            'resource_id' => $tenant->id,
            'metadata' => $validated,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', 'Billing rules and payment settings updated.');
    }

    /**
     * Export audit logs to CSV (clinic admin only).
     */
    public function exportAuditLogs(Request $request): StreamedResponse
    {
        $user = $request->user();
        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403, 'Only clinic administrators can export the audit trail.');
        }

        $tenant = tenant();

        // Audit-log the export action itself
        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user?->id,
            'action' => 'audit.exported',
            'resource_type' => 'tenant',
            'resource_id' => $tenant->id,
            'metadata' => [
                'action_filter' => $request->input('action', 'all'),
                'date_filter' => $request->input('date', 'all'),
                'search_filter' => $request->input('search', ''),
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        $auditQuery = AuditEvent::with('user')
            ->where('tenant_id', $tenant->id)
            ->latest('created_at');

        if ($request->filled('action')) {
            $auditQuery->where('action', $request->input('action'));
        }

        if ($request->filled('date')) {
            $auditQuery->whereDate('created_at', $request->input('date'));
        }

        if ($request->filled('search')) {
            $search = '%'.$request->input('search').'%';
            $auditQuery->where(function ($q) use ($search) {
                $q->where('action', 'ilike', $search)
                    ->orWhere('resource_type', 'ilike', $search)
                    ->orWhere('ip_address', 'ilike', $search)
                    ->orWhereHas('user', function ($uq) use ($search) {
                        $uq->where('name', 'ilike', $search)
                            ->orWhere('email', 'ilike', $search);
                    });
            });
        }

        $events = $auditQuery->limit(2000)->get();

        $filename = 'audit-log-'.$tenant->subdomain.'-'.now()->format('Y-m-d-His').'.csv';

        return response()->streamDownload(function () use ($events) {
            $handle = fopen('php://output', 'w');
            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, ['Event ID', 'Date & Time (Asia/Colombo)', 'Action', 'Resource Type', 'Resource ID', 'User Name', 'User Email', 'IP Address', 'Metadata']);

            foreach ($events as $event) {
                fputcsv($handle, [
                    $event->id,
                    $event->created_at ? $event->created_at->setTimezone('Asia/Colombo')->format('Y-m-d H:i:s') : '',
                    $event->action,
                    $event->resource_type ?? '',
                    $event->resource_id ?? '',
                    $event->user?->name ?? 'System',
                    $event->user?->email ?? '',
                    $event->ip_address ?? '',
                    ! empty($event->metadata) ? json_encode($event->metadata, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : '',
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Update Online Booking Settings.
     */
    public function updateOnlineBooking(Request $request): RedirectResponse
    {
        $platformChannels = config('phone_verification.channels', ['whatsapp', 'textlk']);

        $validated = $request->validate([
            'online_booking_enabled' => ['required', 'boolean'],
            'max_active_tokens_per_phone' => ['required', 'integer', 'min:1', 'max:10'],
            'require_staff_approval' => ['required', 'boolean'],
            'require_phone_verification' => ['sometimes', 'boolean'],
            'phone_verification_methods' => ['nullable', 'array'],
            'phone_verification_methods.*' => ['string', 'in:'.implode(',', $platformChannels)],
        ]);

        $tenant = tenant();
        $tenant->online_booking_enabled = $validated['online_booking_enabled'];
        $tenant->max_active_tokens_per_phone = $validated['max_active_tokens_per_phone'];
        $tenant->require_staff_approval = $validated['require_staff_approval'];
        if (isset($validated['require_phone_verification'])) {
            $tenant->require_phone_verification = (bool) $validated['require_phone_verification'];
        }
        // Filter methods to only allowed platform channels
        if (isset($validated['phone_verification_methods'])) {
            $selectedMethods = $validated['phone_verification_methods'];
            $tenant->phone_verification_methods = array_values(array_intersect($platformChannels, $selectedMethods));
        }
        $tenant->save();

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => 'settings.online_booking_updated',
            'resource_type' => 'tenant',
            'resource_id' => $tenant->id,
            'metadata' => $validated,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', 'Public online booking settings updated.');
    }

    /**
     * Update Pharmacy & Inventory Settings.
     */
    public function updatePharmacySettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'pharmacy_enabled' => ['required', 'boolean'],
            'default_reorder_level' => ['required', 'integer', 'min:0', 'max:10000'],
            'expiring_soon_threshold_days' => ['required', 'integer', 'min:7', 'max:365'],
            'stock_reduction_mode' => ['nullable', 'string', 'in:dispense,consultation'],
            'prescription_print_enabled' => ['nullable', 'boolean'],
            'prescription_print_language' => ['nullable', 'string', 'in:en,ta,si'],
            'prescription_print_show_doctor_reg' => ['nullable', 'boolean'],
            'prescription_print_show_diagnosis' => ['nullable', 'boolean'],
        ]);

        $tenant = tenant();
        $tenant->pharmacy_enabled = (bool) $validated['pharmacy_enabled'];
        $tenant->pharmacy_default_reorder_level = (int) $validated['default_reorder_level'];
        $tenant->pharmacy_expiring_soon_days = (int) $validated['expiring_soon_threshold_days'];
        if (isset($validated['stock_reduction_mode'])) {
            $tenant->pharmacy_stock_reduction_mode = $validated['stock_reduction_mode'];
        }
        if (isset($validated['prescription_print_enabled'])) {
            $tenant->prescription_print_enabled = (bool) $validated['prescription_print_enabled'];
        }
        if (isset($validated['prescription_print_language'])) {
            $tenant->prescription_print_language = $validated['prescription_print_language'];
        }
        if (isset($validated['prescription_print_show_doctor_reg'])) {
            $tenant->prescription_print_show_doctor_reg = (bool) $validated['prescription_print_show_doctor_reg'];
        }
        if (isset($validated['prescription_print_show_diagnosis'])) {
            $tenant->prescription_print_show_diagnosis = (bool) $validated['prescription_print_show_diagnosis'];
        }
        $tenant->save();

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'action' => 'settings.pharmacy_updated',
            'resource_type' => 'tenant',
            'resource_id' => $tenant->id,
            'metadata' => $validated,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', 'Pharmacy & prescription settings updated successfully.');
    }

    /**
     * Update Public Directory Settings.
     */
    public function updateDirectory(Request $request): RedirectResponse
    {
        $user = $request->user();
        if ($user && ! $user->hasRole('clinic_admin') && ! $user->hasRole('super_admin')) {
            abort(403, 'Only clinic owners and administrators can manage public directory settings.');
        }

        $districts = config('medvisit_public.directory.districts', []);
        $fixedServices = config('medvisit_public.directory.fixed_services', []);

        $validated = $request->validate([
            'directory_enabled' => ['required', 'boolean'],
            'consent' => ['nullable', 'boolean'],
            'directory_district' => ['nullable', 'string', 'in:'.implode(',', $districts)],
            'directory_city' => ['nullable', 'string', 'max:100'],
            'directory_latitude' => ['nullable', 'numeric', 'between:5.8,9.9'],
            'directory_longitude' => ['nullable', 'numeric', 'between:79.6,82.0'],
            'directory_description' => ['nullable', 'string', 'max:300'],
            'directory_services' => ['nullable', 'array'],
            'directory_services.*' => ['string', 'in:'.implode(',', $fixedServices)],
        ]);

        $tenant = tenant();
        $isEnabling = (bool) $validated['directory_enabled'];

        if ($isEnabling && empty($tenant->directory_consented_at) && empty($validated['consent'])) {
            return redirect()->back()->withErrors([
                'consent' => 'You must agree to publish your clinic details and active doctor schedule on the public MedVisit directory.',
            ]);
        }

        $tenant->directory_enabled = $isEnabling;

        if ($isEnabling && empty($tenant->directory_consented_at)) {
            $tenant->directory_consented_at = now()->toIso8601String();
            $tenant->directory_consented_by_user_id = $user?->id;
        }

        if (isset($validated['directory_district'])) {
            $tenant->directory_district = $validated['directory_district'];
        }
        if (isset($validated['directory_city'])) {
            $tenant->directory_city = trim($validated['directory_city']);
        }
        if (array_key_exists('directory_latitude', $validated) && $validated['directory_latitude'] !== null) {
            $tenant->directory_latitude = (float) $validated['directory_latitude'];
        }
        if (array_key_exists('directory_longitude', $validated) && $validated['directory_longitude'] !== null) {
            $tenant->directory_longitude = (float) $validated['directory_longitude'];
        }
        if (isset($validated['directory_description'])) {
            $tenant->directory_description = trim($validated['directory_description']);
        }
        if (isset($validated['directory_services'])) {
            $tenant->directory_services = array_values($validated['directory_services']);
        }

        $tenant->save();

        // Dispatch sync job immediately
        SyncClinicDirectoryListing::dispatch((string) $tenant->id);

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user?->id,
            'action' => 'settings.directory_updated',
            'resource_type' => 'tenant',
            'resource_id' => $tenant->id,
            'metadata' => [
                'directory_enabled' => $isEnabling,
                'district' => $tenant->directory_district,
                'city' => $tenant->directory_city,
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', 'Public directory listing settings saved successfully.');
    }

    /**
     * Update Waiting Room TV Display Settings.
     */
    public function updateTvDisplay(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name_display_mode' => ['required', 'string', 'in:token_only,initial_last,first_only,full_name'],
            'languages' => ['required', 'array', 'min:1'],
            'languages.*' => ['string', 'in:en,ta,si'],
            'chime_enabled' => ['required', 'boolean'],
            'voice_language' => ['required', 'string', 'in:off,en,ta,si'],
            'ticker_text' => ['nullable', 'string', 'max:500'],
            'theme' => ['required', 'string', 'in:dark,light'],
            'reduced_motion' => ['required', 'boolean'],
        ]);

        $tenant = tenant();
        $tenant->tv_name_display_mode = $validated['name_display_mode'];
        $tenant->tv_languages = array_values($validated['languages']);
        $tenant->tv_chime_enabled = (bool) $validated['chime_enabled'];
        $tenant->tv_voice_language = $validated['voice_language'];
        $tenant->tv_ticker_text = trim((string) ($validated['ticker_text'] ?? ''));
        $tenant->tv_theme = $validated['theme'];
        $tenant->tv_reduced_motion = (bool) $validated['reduced_motion'];
        $tenant->save();

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()?->id,
            'action' => 'settings.tv_display_updated',
            'resource_type' => 'tenant',
            'resource_id' => $tenant->id,
            'metadata' => $validated,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'created_at' => Carbon::now('Asia/Colombo'),
        ]);

        return redirect()->back()->with('success', 'TV display settings saved successfully.');
    }
}
