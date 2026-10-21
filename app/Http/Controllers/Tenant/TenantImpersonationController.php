<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AuditLogger;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class TenantImpersonationController extends Controller
{
    /**
     * Consume an impersonation token on the tenant domain.
     */
    public function enter(string $token): RedirectResponse|Response
    {
        $tokenRecord = DB::table('tenant_user_impersonation_tokens')
            ->where('token', $token)
            ->first();

        if (! $tokenRecord) {
            abort(403, 'Invalid or expired impersonation token.');
        }

        $tenant = tenant();
        if ((string) $tokenRecord->tenant_id !== (string) $tenant->getTenantKey()) {
            abort(403, 'Token tenant mismatch.');
        }

        // Token expires in 60 seconds
        if (Carbon::parse($tokenRecord->created_at)->diffInSeconds(now()) > 60) {
            DB::table('tenant_user_impersonation_tokens')->where('token', $token)->delete();
            abort(403, 'Impersonation token has expired (must be used within 60s).');
        }

        // Find impersonator details
        $impersonator = $tokenRecord->impersonator_id
            ? User::find($tokenRecord->impersonator_id)
            : null;

        // Login as clinic user
        Auth::guard($tokenRecord->auth_guard ?: 'web')->loginUsingId($tokenRecord->user_id);

        $returnUrl = $tenant->urlForSubdomain(
            config('medvisit.base_domain', 'medvisit.localhost'),
            "/super-admin/clinics/{$tenant->id}"
        );

        // Store impersonation metadata in session (max 30 minutes)
        session([
            'medvisit_impersonating' => true,
            'impersonator_id' => $tokenRecord->impersonator_id,
            'impersonator_name' => $impersonator?->name ?? 'Platform Super Admin',
            'impersonation_reason' => $tokenRecord->reason,
            'impersonation_started_at' => now()->timestamp,
            'impersonation_expires_at' => now()->addMinutes(30)->timestamp,
            'impersonation_return_url' => $returnUrl,
        ]);

        // Consume single-use token
        DB::table('tenant_user_impersonation_tokens')->where('token', $token)->delete();

        AuditLogger::log('superadmin.impersonation.session_started', [
            'tenant_id' => $tenant->id,
            'user' => Auth::user(),
            'metadata' => [
                'impersonator_id' => $tokenRecord->impersonator_id,
                'impersonator_name' => $impersonator?->name,
                'reason' => $tokenRecord->reason,
            ],
        ]);

        return redirect($tokenRecord->redirect_url ?: '/dashboard');
    }

    /**
     * Exit the impersonation session and return to central domain.
     */
    public function exit(Request $request): Response|RedirectResponse
    {
        $tenant = tenant();
        $returnUrl = session('impersonation_return_url')
            ?? Tenant::urlForSubdomain(
                config('medvisit.base_domain', 'medvisit.localhost'),
                $tenant ? "/super-admin/clinics/{$tenant->id}" : '/super-admin/clinics'
            );

        AuditLogger::log('superadmin.impersonation.session_ended', [
            'tenant_id' => $tenant?->id,
            'user' => Auth::user(),
            'metadata' => [
                'impersonator_id' => session('impersonator_id'),
                'duration_seconds' => session('impersonation_started_at')
                    ? (now()->timestamp - (int) session('impersonation_started_at'))
                    : 0,
            ],
        ]);

        session()->forget([
            'medvisit_impersonating',
            'impersonator_id',
            'impersonator_name',
            'impersonation_reason',
            'impersonation_started_at',
            'impersonation_expires_at',
            'impersonation_return_url',
        ]);

        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if ($request->header('X-Inertia')) {
            return Inertia::location($returnUrl);
        }

        return redirect()->away($returnUrl);
    }
}
