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
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
            'showDemoCredentials' => app()->environment('local'),
            'matchedClinics' => session('matchedClinics'),
            'lookupEmail' => session('lookupEmail'),
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
