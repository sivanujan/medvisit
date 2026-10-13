<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use App\Support\RoleRedirect;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class TenantAuthenticatedSessionController extends Controller
{
    /**
     * Display the clinic tenant login view.
     */
    public function create(): Response
    {
        $tenant = tenant();

        return Inertia::render('Auth/TenantLogin', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => $tenant->name ?? 'MedVisit Clinic',
                'subdomain' => $tenant->subdomain ?? $tenant->id,
                'address' => $tenant->address ?? '',
                'phone' => $tenant->phone ?? '',
                'status' => $tenant->status ?? 'active',
            ],
            'canResetPassword' => Route::has('tenant.password.request'),
            'status' => session('status'),
            'error' => session('error'),
        ]);
    }

    /**
     * Handle incoming authentication request scoped strictly to this tenant.
     */
    public function store(Request $request): RedirectResponse
    {
        $tenant = tenant();

        $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $email = Str::lower($request->input('email'));
        $throttleKey = Str::transliterate($email.'|'.$request->ip().'|'.$tenant->id);

        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => trans('auth.throttle', [
                    'seconds' => $seconds,
                    'minutes' => (int) ceil($seconds / 60),
                ]),
            ]);
        }

        /** @var User|null $user */
        $user = User::where('tenant_id', $tenant->id)
            ->where('email', $email)
            ->first();

        if (! $user || ! Hash::check($request->input('password'), $user->password)) {
            RateLimiter::hit($throttleKey, 300); // 5 min lockout after 5 attempts

            AuditLogger::log('user.login_failed', [
                'email' => $email,
                'tenant_id' => $tenant->id,
                'reason' => 'invalid_credentials',
            ]);

            throw ValidationException::withMessages([
                'email' => trans('auth.failed'),
            ]);
        }

        RateLimiter::clear($throttleKey);

        Auth::login($user, (bool) $request->boolean('remember'));
        $request->session()->regenerate();

        AuditLogger::log('user.login', [
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
        ]);

        if (! $tenant->isUsable()) {
            return redirect()->route('tenant.suspended');
        }

        return redirect()->intended(RoleRedirect::path($request));
    }

    /**
     * Destroy the authenticated session for the tenant.
     */
    public function destroy(Request $request): RedirectResponse
    {
        AuditLogger::log('user.logout', [
            'tenant_id' => tenant('id'),
        ]);

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('tenant.login');
    }
}
