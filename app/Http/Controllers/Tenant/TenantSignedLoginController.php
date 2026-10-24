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
use Illuminate\Support\Facades\Cache;

class TenantSignedLoginController extends Controller
{
    /**
     * Authenticate a user via a short-lived single-use signed link.
     */
    public function login(Request $request): RedirectResponse
    {
        $tenant = tenant();

        if (! $request->hasValidSignature(false)) {
            return redirect()->route('tenant.login')->with('error', 'This auto-login link has expired or has an invalid signature.');
        }

        $token = (string) $request->query('token');

        if (empty($token)) {
            return redirect()->route('tenant.login')->with('error', 'Missing one-time login token.');
        }

        /** @var array{user_id: int|string, tenant_id: string}|null $payload */
        $payload = tenancy()->central(function () use ($token) {
            return Cache::pull("one_time_login:{$token}");
        });

        if (! $payload) {
            return redirect()->route('tenant.login')->with('error', 'This single-use login link has already been used or expired. Please sign in with your password.');
        }

        if (($payload['tenant_id'] ?? null) !== $tenant->id) {
            abort(403, 'Tenant mismatch for signed login.');
        }

        /** @var User $user */
        $user = User::where('tenant_id', $tenant->id)
            ->where('id', $payload['user_id'])
            ->firstOrFail();

        Auth::login($user);
        $request->session()->regenerate();

        AuditLogger::log('user.login', [
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'method' => 'one_time_signed_link',
        ]);

        if (! $tenant->isUsable()) {
            return redirect()->route('tenant.suspended');
        }

        if ($request->filled('redirect')) {
            return redirect($request->query('redirect'));
        }

        if (! $tenant->hasActiveSubscription() && $user->hasRole('clinic_admin')) {
            return redirect()->route('tenant.subscription.subscribe');
        }

        return redirect()->intended(RoleRedirect::path($request));
    }
}
