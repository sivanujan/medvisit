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
                'base_domain' => config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost')),
            ] : null,
            'flash' => [
                'status' => session('status'),
                'success' => session('success'),
                'error' => session('error'),
            ],
        ];
    }
}
