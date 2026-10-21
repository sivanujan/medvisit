<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\Tenant;
use App\Services\AuditLogger;
use App\Support\RoleRedirect;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class AuthenticatedSessionController extends Controller
{
    public function create(Request $request): Response
    {
        $isAdmin = $request->query('mode') === 'admin'
            || $request->boolean('admin')
            || $request->routeIs('admin.login');

        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
            'showDemoCredentials' => app()->environment('local'),
            'matchedClinics' => session('matchedClinics'),
            'lookupEmail' => session('lookupEmail'),
            'initialMode' => $isAdmin ? 'admin' : 'find',
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): SymfonyResponse|RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = Auth::user();

        // If a clinic tenant user authenticated on central domain, redirect to their clinic
        if ($user && $user->tenant_id) {
            $tenant = $user->tenant ?? Tenant::find($user->tenant_id);
            if ($tenant) {
                Auth::guard('web')->logout();
                $clinicUrl = $tenant->url('/login?email='.urlencode($user->email));

                if ($request->header('X-Inertia')) {
                    return Inertia::location($clinicUrl);
                }

                return redirect()->away($clinicUrl);
            }
        }

        // If the user has 2FA enabled, challenge them before completing session
        if ($user && $user->two_factor_confirmed_at !== null) {
            $remember = $request->boolean('remember');
            Auth::guard('web')->logout();
            $request->session()->put([
                'login.2fa.user_id' => $user->id,
                'login.2fa.remember' => $remember,
            ]);

            return redirect()->route('two-factor.challenge');
        }

        if ($user) {
            $user->forceFill([
                'last_login_at' => now(),
                'last_login_ip' => $request->ip(),
            ])->save();
        }

        AuditLogger::log('user.login');

        return redirect()->intended(RoleRedirect::path($request));
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        AuditLogger::log('user.logout');

        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
