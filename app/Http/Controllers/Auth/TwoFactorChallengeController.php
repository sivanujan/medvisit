<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\TwoFactorService;
use App\Support\RoleRedirect;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class TwoFactorChallengeController extends Controller
{
    public function __construct(
        private readonly TwoFactorService $twoFactorService
    ) {}

    /**
     * Show the two-factor authentication challenge view.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        if (! $request->session()->has('login.2fa.user_id')) {
            return redirect()->route('login');
        }

        return Inertia::render('Auth/TwoFactorChallenge');
    }

    /**
     * Attempt to authenticate using TOTP code or emergency recovery code.
     */
    public function store(Request $request): RedirectResponse
    {
        $userId = $request->session()->get('login.2fa.user_id');
        $remember = (bool) $request->session()->get('login.2fa.remember', false);

        if (! $userId) {
            return redirect()->route('login');
        }

        $user = User::findOrFail($userId);

        $code = $request->input('code');
        $recoveryCode = $request->input('recovery_code');

        $authenticated = false;

        if (! empty($code)) {
            $secret = (string) $user->two_factor_secret;
            if ($this->twoFactorService->verifyCode($secret, $code)) {
                $authenticated = true;
            }
        } elseif (! empty($recoveryCode)) {
            if ($this->twoFactorService->verifyAndConsumeRecoveryCode($user, $recoveryCode)) {
                $authenticated = true;
            }
        }

        if (! $authenticated) {
            return back()->withErrors([
                'code' => 'The provided two-factor authentication code or recovery code was invalid.',
            ]);
        }

        // Clear challenge session
        $request->session()->forget(['login.2fa.user_id', 'login.2fa.remember']);

        Auth::login($user, $remember);
        $request->session()->regenerate();

        $user->forceFill([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ])->save();

        AuditLogger::log('user.login', [
            'user_id' => $user->id,
            'metadata' => [
                'two_factor_verified' => true,
                'used_recovery_code' => ! empty($recoveryCode),
            ],
        ]);

        return redirect()->intended(RoleRedirect::path($request));
    }
}
