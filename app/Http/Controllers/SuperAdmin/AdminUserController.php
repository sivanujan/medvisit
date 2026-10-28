<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Mail\AdminInvitationMail;
use App\Mail\Security\TwoFactorEnabledMail;
use App\Models\AdminInvitation;
use App\Models\AuditEvent;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\TwoFactorService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class AdminUserController extends Controller
{
    public function __construct(
        private readonly TwoFactorService $twoFactorService
    ) {}

    /**
     * Display listing of super admins, invitations, active sessions, and 2FA status.
     */
    public function index(Request $request): Response
    {
        $superAdmins = User::whereHas('roles', fn ($q) => $q->where('name', 'super_admin'))
            ->orWhereNull('tenant_id')
            ->get()
            ->filter(fn ($u) => $u->hasRole('super_admin'))
            ->values()
            ->map(function ($admin) {
                return [
                    'id' => $admin->id,
                    'name' => $admin->name,
                    'email' => $admin->email,
                    'is_active' => (bool) $admin->is_active,
                    'two_factor_enabled' => $admin->two_factor_confirmed_at !== null,
                    'last_login_at' => $admin->last_login_at?->toIso8601String(),
                    'last_login_ip' => $admin->last_login_ip,
                    'created_at' => $admin->created_at?->toIso8601String(),
                ];
            });

        $invitations = AdminInvitation::with('inviter')
            ->whereNull('accepted_at')
            ->latest()
            ->get()
            ->map(fn ($inv) => [
                'id' => $inv->id,
                'email' => $inv->email,
                'invited_by' => $inv->inviter?->name ?? 'Admin',
                'expires_at' => $inv->expires_at->toIso8601String(),
                'is_expired' => $inv->isExpired(),
            ]);

        // Active sessions for the logged-in user
        $currentSessionId = $request->session()->getId();
        $sessions = DB::table('sessions')
            ->where('user_id', Auth::id())
            ->orderBy('last_activity', 'desc')
            ->get()
            ->map(function ($s) use ($currentSessionId) {
                $agent = (string) $s->user_agent;
                $browser = 'Desktop Browser';
                if (str_contains($agent, 'Chrome')) {
                    $browser = 'Chrome';
                } elseif (str_contains($agent, 'Firefox')) {
                    $browser = 'Firefox';
                } elseif (str_contains($agent, 'Safari')) {
                    $browser = 'Safari';
                }

                $platform = 'Desktop';
                if (str_contains($agent, 'Windows')) {
                    $platform = 'Windows';
                } elseif (str_contains($agent, 'Macintosh')) {
                    $platform = 'macOS';
                } elseif (str_contains($agent, 'Linux')) {
                    $platform = 'Linux';
                } elseif (str_contains($agent, 'iPhone') || str_contains($agent, 'Android')) {
                    $platform = 'Mobile';
                }

                return [
                    'id' => $s->id,
                    'ip_address' => $s->ip_address,
                    'is_current' => $s->id === $currentSessionId,
                    'browser' => $browser,
                    'platform' => $platform,
                    'last_active' => Carbon::createFromTimestamp($s->last_activity)->diffForHumans(),
                ];
            });

        // Login history (last 50 events)
        $loginHistory = AuditEvent::whereIn('action', ['user.login', 'user.login_failed', 'admin.2fa_recovery_used'])
            ->where('user_id', Auth::id())
            ->latest()
            ->limit(50)
            ->get()
            ->map(fn ($ev) => [
                'id' => $ev->id,
                'action' => $ev->action,
                'ip_address' => $ev->ip_address,
                'user_agent' => $ev->user_agent,
                'created_at' => $ev->created_at->diffForHumans(),
            ]);

        $currentUser = Auth::user();

        return Inertia::render('SuperAdmin/Admins/Index', [
            'superAdmins' => $superAdmins,
            'invitations' => $invitations,
            'sessions' => $sessions,
            'loginHistory' => $loginHistory,
            'my2fa' => [
                'enabled' => $currentUser->two_factor_confirmed_at !== null,
                'confirmed_at' => $currentUser->two_factor_confirmed_at?->toIso8601String(),
                'has_recovery_codes' => ! empty($currentUser->two_factor_recovery_codes),
            ],
        ]);
    }

    /**
     * Invite a new Super Admin via signed email link.
     */
    public function invite(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
        ]);

        $token = Str::random(40);

        $invitation = AdminInvitation::create([
            'email' => $validated['email'],
            'token' => $token,
            'invited_by' => Auth::id(),
            'expires_at' => Carbon::now()->addHours(48),
        ]);

        AuditLogger::log('admin.invited', [
            'metadata' => [
                'email' => $invitation->email,
                'invitation_id' => $invitation->id,
            ],
        ]);

        // Generate signed URL
        $inviteUrl = URL::temporarySignedRoute(
            'admin.invitation.accept',
            Carbon::now()->addHours(48),
            ['token' => $token]
        );

        Mail::to($invitation->email)->queue(new AdminInvitationMail($invitation, $inviteUrl, Auth::user()?->name));

        return back()->with('success', "Invitation sent to {$invitation->email}. Link expires in 48 hours.");
    }

    /**
     * Revoke a pending invitation.
     */
    public function revokeInvite(Request $request): RedirectResponse
    {
        $id = (string) $request->route('id');
        $invitation = AdminInvitation::findOrFail($id);
        $invitation->delete();

        return back()->with('success', 'Invitation was revoked.');
    }

    /**
     * Deactivate an admin user.
     */
    public function deactivate(Request $request): RedirectResponse
    {
        $id = (int) $request->route('id');
        if ($id === Auth::id()) {
            return back()->with('error', 'You cannot deactivate your own account.');
        }

        $activeCount = User::whereHas('roles', fn ($q) => $q->where('name', 'super_admin'))
            ->where('is_active', true)
            ->count();

        if ($activeCount <= 1) {
            return back()->with('error', 'Cannot deactivate the last active Super Admin account.');
        }

        $user = User::findOrFail($id);
        $user->is_active = false;
        $user->save();

        // Invalidate active sessions
        DB::table('sessions')->where('user_id', $user->id)->delete();

        AuditLogger::log('admin.deactivated', [
            'resource_type' => 'user',
            'resource_id' => (string) $user->id,
            'metadata' => ['email' => $user->email],
        ]);

        return back()->with('success', "Admin user {$user->name} has been deactivated.");
    }

    /**
     * Reactivate an admin user.
     */
    public function reactivate(Request $request): RedirectResponse
    {
        $id = (int) $request->route('id');
        $user = User::findOrFail($id);
        $user->is_active = true;
        $user->save();

        AuditLogger::log('admin.reactivated', [
            'resource_type' => 'user',
            'resource_id' => (string) $user->id,
            'metadata' => ['email' => $user->email],
        ]);

        return back()->with('success', "Admin user {$user->name} has been reactivated.");
    }

    /**
     * Initialize 2FA Setup: returns Base32 secret and QR Code URL.
     */
    public function getTwoFactorSetup(Request $request): JsonResponse
    {
        $user = Auth::user();

        // If secret doesn't exist or is unconfirmed, generate new one
        $secret = $user->two_factor_secret;
        if (! $secret || ! $user->two_factor_confirmed_at) {
            $secret = $this->twoFactorService->generateSecretKey();
            $user->two_factor_secret = $secret;
            $user->save();
        }

        $qrCodeUrl = $this->twoFactorService->getQrCodeUrl('MedVisit', $user->email, $secret);

        return response()->json([
            'secret' => $secret,
            'qr_code_url' => $qrCodeUrl,
            'otp_auth_url' => $this->twoFactorService->getOtpAuthUrl('MedVisit', $user->email, $secret),
        ]);
    }

    /**
     * Confirm 2FA setup with a TOTP verification code. Returns 10 one-time recovery codes.
     */
    public function confirmTwoFactor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = Auth::user();
        $secret = $user->two_factor_secret;

        if (! $secret || ! $this->twoFactorService->verifyCode($secret, $validated['code'])) {
            return response()->json([
                'success' => false,
                'message' => 'The authentication code entered is invalid. Please try again.',
            ], 422);
        }

        $recoveryCodes = $this->twoFactorService->generateRecoveryCodes(10);

        $user->forceFill([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => $recoveryCodes,
        ])->save();

        AuditLogger::log('admin.2fa_enabled', [
            'user_id' => $user->id,
        ]);

        Mail::to($user->email)->queue(new TwoFactorEnabledMail($user));

        return response()->json([
            'success' => true,
            'recovery_codes' => $recoveryCodes,
            'message' => 'Two-Factor Authentication is now enabled. Please store your recovery codes safely.',
        ]);
    }

    /**
     * Regenerate one-time recovery codes (requires current password).
     */
    public function regenerateRecoveryCodes(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string'],
        ]);

        $user = Auth::user();

        if (! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'The provided password was incorrect.',
            ], 422);
        }

        $newCodes = $this->twoFactorService->generateRecoveryCodes(10);
        $user->two_factor_recovery_codes = $newCodes;
        $user->save();

        AuditLogger::log('admin.2fa_codes_regenerated', [
            'user_id' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'recovery_codes' => $newCodes,
            'message' => 'New recovery codes generated. Any prior codes are now invalidated.',
        ]);
    }

    /**
     * Disable 2FA (requires current password + valid TOTP code).
     */
    public function disableTwoFactor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'password' => ['required', 'string'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $user = Auth::user();

        if (! Hash::check($validated['password'], $user->password)) {
            return response()->json([
                'success' => false,
                'message' => 'The provided password was incorrect.',
            ], 422);
        }

        if (! $this->twoFactorService->verifyCode((string) $user->two_factor_secret, $validated['code'])) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid two-factor authentication code.',
            ], 422);
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        AuditLogger::log('admin.2fa_disabled', [
            'user_id' => $user->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Two-Factor Authentication has been disabled.',
        ]);
    }

    /**
     * Terminate all other active sessions for the current user.
     */
    public function logoutOtherSessions(Request $request): RedirectResponse
    {
        $currentSessionId = $request->session()->getId();

        DB::table('sessions')
            ->where('user_id', Auth::id())
            ->where('id', '!=', $currentSessionId)
            ->delete();

        AuditLogger::log('user.other_sessions_terminated', [
            'user_id' => Auth::id(),
        ]);

        return back()->with('success', 'All other browser sessions have been logged out.');
    }
}
