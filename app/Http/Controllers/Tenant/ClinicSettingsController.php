<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClinicSettingsController extends Controller
{
    /**
     * Show Clinic Settings & Audit Trail.
     */
    public function index(Request $request): Response
    {
        $tenant = tenant();

        // 1. Clinic Profile
        $profile = [
            'name' => ucwords((string) ($tenant->name ?? '')),
            'subdomain' => $tenant->subdomain,
            'phone' => $tenant->phone ?? '',
            'address' => $tenant->address ?? '',
            'registration_number' => $tenant->registration_number ?? '',
            'logo_url' => $tenant->logo_url ?? '',
            'plan' => $tenant->plan ?? 'growth',
            'status' => $tenant->status ?? 'active',
        ];

        // 2. Session Defaults
        $sessionDefaults = [
            'default_avg_consultation_minutes' => (int) ($tenant->default_avg_consultation_minutes ?? 10),
            'default_max_tokens' => (int) ($tenant->default_max_tokens ?? 20),
            'cancellation_window_hours' => (int) ($tenant->cancellation_window_hours ?? 2),
            'auto_generate_days' => (int) ($tenant->auto_generate_days ?? 30),
        ];

        // 3. Billing Settings
        $billingSettings = [
            'billing_timing' => $tenant->billing_timing ?? 'pay_at_issue', // pay_at_issue | pay_after_consult
            'receipt_prefix' => $tenant->receipt_prefix ?? 'REC',
            'tax_percentage' => (float) ($tenant->tax_percentage ?? 0),
            'accepted_methods' => $tenant->accepted_methods ?? ['cash', 'card', 'bank_transfer'],
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

        // 5. Audit Log Viewer with Query Filters
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

        return Inertia::render('Settings/Index', [
            'profile' => $profile,
            'sessionDefaults' => $sessionDefaults,
            'billingSettings' => $billingSettings,
            'onlineBookingSettings' => $onlineBookingSettings,
            'auditLogs' => $auditLogs,
            'availableActions' => $availableActions,
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
            'address' => ['nullable', 'string', 'max:500'],
            'registration_number' => ['nullable', 'string', 'max:100'],
            'logo_url' => ['nullable', 'string', 'max:500'],
        ]);

        $tenant = tenant();
        $tenant->name = ucwords(trim($validated['name']));
        $tenant->phone = $validated['phone'];
        $tenant->address = $validated['address'];
        $tenant->registration_number = $validated['registration_number'];
        $tenant->logo_url = $validated['logo_url'];
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
        ]);

        $tenant = tenant();
        $tenant->billing_timing = $validated['billing_timing'];
        $tenant->receipt_prefix = strtoupper(trim($validated['receipt_prefix']));
        $tenant->tax_percentage = $validated['tax_percentage'] ?? 0;
        $tenant->accepted_methods = $validated['accepted_methods'];
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
}
