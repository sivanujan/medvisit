<?php

namespace App\Http\Middleware;

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
                ] : null,
            ],
            'tenant' => $tenant ? [
                'id' => $tenant->id,
                'name' => ucwords((string) $tenant->name),
                'subdomain' => $tenant->subdomain,
                'status' => $tenant->status,
                'phone' => $tenant->phone,
                'address' => $tenant->address,
                'plan' => ucfirst((string) ($tenant->plan ?? 'Growth')),
                'trial_days_left' => $tenant->trial_ends_at ? max(0, (int) now()->diffInDays($tenant->trial_ends_at, false)) : 14,
                'is_trial' => $tenant->status === 'trialing' || ($tenant->trial_ends_at && now()->lt($tenant->trial_ends_at)),
                'base_domain' => config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost')),
                'website_theme' => $tenant->website_theme ?? 'medvisit-teal',
                'website_header' => $tenant->website_header ?? null,
                'website_footer' => $tenant->website_footer ?? null,
                'logo_url' => $tenant->logo_url ?? null,
                'whatsapp_number' => $tenant->whatsapp_number ?? null,
                'opening_hours' => $tenant->opening_hours ?? null,
            ] : null,
            'flash' => [
                'status' => session('status'),
                'success' => session('success'),
                'error' => session('error'),
            ],
        ];
    }
}
