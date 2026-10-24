<?php

namespace App\Http\Middleware;

use App\Models\DoctorSession;
use App\Models\RefundRequest;
use App\Models\Subscription;
use App\Models\SupportConversation;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $tenant = function_exists('tenant') ? tenant() : null;

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'email_verified_at' => $request->user()->email_verified_at,
                    'tenant_id' => $request->user()->tenant_id,
                    'roles' => $request->user()->roles->pluck('name')->all(),
                    'permissions' => $request->user()->getAllPermissions()->pluck('name')->all(),
                    'avatar_url' => $request->user()->avatar_url,
                ] : null,
            ],
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'name' => (string) ($tenant->name ?? ''),
                'subdomain' => $tenant->subdomain,
                'status' => $tenant->status,
                'phone' => $tenant->phone,
                'address' => (string) ($tenant->formatted_address ?: $tenant->address ?: ''),
                'address_line' => (string) ($tenant->address_line ?? ''),
                'city' => (string) ($tenant->city ?? ''),
                'district' => (string) ($tenant->district ?? ''),
                'postal_code' => (string) ($tenant->postal_code ?? ''),
                'legacy_address' => (string) ($tenant->legacy_address ?? ''),
                'plan' => rescue(fn () => $tenant->currentPlanDisplayName(), ucfirst((string) ($tenant->plan ?? 'Pro')), false),
                'trial_days_left' => $tenant->trial_ends_at ? max(0, (int) now()->diffInDays($tenant->trial_ends_at, false)) : 14,
                'is_trial' => $tenant->status === 'trialing' || ($tenant->trial_ends_at && now()->lt($tenant->trial_ends_at)),
                'subscription_days_left' => rescue(function () use ($tenant) {
                    $sub = Subscription::where('tenant_id', $tenant->id)->first();

                    return ($sub && $sub->current_period_end) ? (int) now()->diffInDays($sub->current_period_end, false) : null;
                }, null, false),
                'base_domain' => config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost')),
                'website_theme' => $tenant->website_theme ?? 'medvisit-teal',
                'website_header' => $tenant->website_header ?? null,
                'website_footer' => $tenant->website_footer ?? null,
                'logo_url' => $tenant->logo_url ?? null,
                'logo_png_url' => $tenant->logo_png_url ?? null,
                'favicon_url' => $tenant->favicon_url ?? '/favicon.ico',
                'whatsapp_number' => $tenant->whatsapp_number ?? null,
                'opening_hours' => $tenant->opening_hours ?? null,
                'pharmacy_enabled' => (bool) ($tenant->pharmacy_enabled ?? false),
                'pharmacy_default_reorder_level' => (int) ($tenant->pharmacy_default_reorder_level ?? 10),
                'pharmacy_expiring_soon_days' => (int) ($tenant->pharmacy_expiring_soon_days ?? 60),
                'live_sessions_count' => rescue(function () use ($tenant, $request) {
                    if (! $tenant || ! $request->user()) {
                        return 0;
                    }

                    $colomboNow = Carbon::now('Asia/Colombo');
                    $today = $colomboNow->toDateString();
                    $currentTime = $colomboNow->format('H:i:s');

                    return DoctorSession::where('session_date', $today)
                        ->where('status', 'in_progress')
                        ->where('end_time', '>=', $currentTime)
                        ->count();
                }, 0, false),
                'overrunning_sessions_count' => rescue(function () use ($tenant, $request) {
                    if (! $tenant || ! $request->user()) {
                        return 0;
                    }

                    $colomboNow = Carbon::now('Asia/Colombo');
                    $today = $colomboNow->toDateString();
                    $currentTime = $colomboNow->format('H:i:s');

                    return DoctorSession::where('session_date', $today)
                        ->where('status', 'in_progress')
                        ->where('end_time', '<', $currentTime)
                        ->count();
                }, 0, false),
            ] : null,
            'flash' => [
                'status' => session('status'),
                'success' => session('success'),
                'error' => session('error'),
                'issuedToken' => session('issuedToken'),
                'createdSessionId' => session('createdSessionId'),
            ],
            'impersonation' => session('medvisit_impersonating') ? [
                'is_active' => true,
                'impersonator_name' => session('impersonator_name', 'Platform Super Admin'),
                'reason' => session('impersonation_reason'),
                'started_at' => session('impersonation_started_at'),
                'expires_at' => session('impersonation_expires_at'),
                'return_url' => session('impersonation_return_url'),
            ] : null,
            'publicConfig' => config('medvisit_public'),
            'waitingSupportCount' => rescue(function () use ($request) {
                if ($request->user()?->hasRole('super_admin')) {
                    return SupportConversation::where('status', 'waiting_human')->count();
                }

                return 0;
            }, 0, false),
            'pendingRefundsCount' => rescue(function () use ($request) {
                if ($request->user()?->hasRole('super_admin')) {
                    return RefundRequest::whereIn('status', [
                        RefundRequest::STATUS_REQUESTED,
                        RefundRequest::STATUS_UNDER_REVIEW,
                    ])->count();
                }

                return 0;
            }, 0, false),
            'turnstileSiteKey' => config('services.turnstile.site_key'),
            'reverb' => [
                'key' => config('broadcasting.connections.reverb.key') ?? config('reverb.apps.apps.0.key'),
                'host' => config('broadcasting.connections.reverb.options.host') ?? env('REVERB_HOST', 'localhost'),
                'port' => config('broadcasting.connections.reverb.options.port') ?? env('REVERB_PORT', 8080),
                'scheme' => config('broadcasting.connections.reverb.options.scheme') ?? env('REVERB_SCHEME', 'http'),
            ],
        ];
    }
}
