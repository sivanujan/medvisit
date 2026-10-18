<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Mail\StaffInviteMail;
use App\Models\Doctor;
use App\Models\StaffInvitation;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class StaffController extends Controller
{
    /**
     * Display the clinic staff directory and pending invitations.
     */
    public function index(Request $request): Response
    {
        $tenantId = tenant('id');

        // Fetch staff users
        $staffUsers = User::where('tenant_id', $tenantId)
            ->with(['roles'])
            ->orderBy('name')
            ->get()
            ->map(function ($u) {
                $linkedDoc = Doctor::where('user_id', $u->id)->first();
                $primaryRole = $u->roles->pluck('name')->first() ?? 'receptionist';

                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role' => $primaryRole,
                    'role_label' => ucwords(str_replace('_', ' ', $primaryRole)),
                    'is_active' => (bool) ($u->is_active ?? true),
                    'is_last_admin' => $primaryRole === 'clinic_admin' && $this->getActiveAdminCount($u->tenant_id) <= 1,
                    'linked_doctor' => $linkedDoc ? [
                        'id' => $linkedDoc->id,
                        'name' => trim(($linkedDoc->title ?? 'Dr.').' '.$linkedDoc->name),
                        'specialty' => $linkedDoc->specialty,
                    ] : null,
                    'created_at_formatted' => $u->created_at->format('M d, Y'),
                ];
            });

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $subdomain = tenant('subdomain');
        $port = $request->getPort();
        $portSuffix = ($port && ! in_array($port, [80, 443])) ? ":{$port}" : '';
        $scheme = $request->getScheme();

        // Fetch pending invitations
        $pendingInvitations = StaffInvitation::where('tenant_id', $tenantId)
            ->whereNull('accepted_at')
            ->with(['doctor'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($inv) => [
                'id' => $inv->id,
                'name' => $inv->name,
                'email' => $inv->email,
                'role' => $inv->role,
                'role_label' => ucwords(str_replace('_', ' ', $inv->role)),
                'is_expired' => $inv->isExpired(),
                'expires_at_formatted' => $inv->expires_at->format('M d, Y'),
                'doctor_name' => $inv->doctor ? trim(($inv->doctor->title ?? 'Dr.').' '.$inv->doctor->name) : null,
                'created_at_formatted' => $inv->created_at->format('M d, Y'),
                'accept_url' => "{$scheme}://{$subdomain}.{$baseDomain}{$portSuffix}/invitation/accept/{$inv->token}",
            ]);

        // Unlinked doctor profiles
        $doctors = Doctor::where('tenant_id', $tenantId)
            ->orderBy('name')
            ->get(['id', 'title', 'name', 'specialty', 'user_id'])
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => trim(($d->title ?? 'Dr.').' '.$d->name),
                'specialty' => $d->specialty,
                'is_linked' => $d->user_id !== null,
            ]);

        return Inertia::render('Staff/Index', [
            'staffUsers' => $staffUsers,
            'pendingInvitations' => $pendingInvitations,
            'doctors' => $doctors,
            'currentUser' => [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                'email' => $request->user()->email,
            ],
        ]);
    }

    /**
     * Send an email invitation to join clinic team.
     */
    public function invite(Request $request): RedirectResponse
    {
        $tenantId = tenant('id');

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'in:clinic_admin,receptionist,doctor'],
            'doctor_id' => ['nullable', 'exists:doctors,id'],
        ]);

        // Check if user already exists in this clinic
        $alreadyMember = User::where('tenant_id', $tenantId)
            ->where('email', $validated['email'])
            ->exists();

        if ($alreadyMember) {
            return redirect()->back()->withErrors([
                'email' => 'A user with this email address is already a team member in this clinic.',
            ]);
        }

        // Delete existing unaccepted invitation for same email if present
        StaffInvitation::where('tenant_id', $tenantId)
            ->where('email', $validated['email'])
            ->delete();

        $token = Str::random(48);
        $invitation = StaffInvitation::create([
            'tenant_id' => $tenantId,
            'email' => $validated['email'],
            'name' => $validated['name'],
            'role' => $validated['role'],
            'doctor_id' => $validated['role'] === 'doctor' ? ($validated['doctor_id'] ?? null) : null,
            'token' => $token,
            'expires_at' => Carbon::now()->addDays(7),
        ]);

        // Build invitation accept URL on clinic subdomain
        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $subdomain = tenant('subdomain');
        $port = $request->getPort();
        $portSuffix = ($port && ! in_array($port, [80, 443])) ? ":{$port}" : '';
        $scheme = $request->getScheme();
        $acceptUrl = "{$scheme}://{$subdomain}.{$baseDomain}{$portSuffix}/invitation/accept/{$token}";
        $clinicName = ucwords((string) (tenant('name') ?? 'MedVisit Clinic'));

        $mailSent = true;
        try {
            Mail::to($invitation->email)->send(new StaffInviteMail($invitation, $acceptUrl, $clinicName));
        } catch (\Throwable $e) {
            report($e);
            $mailSent = false;
        }

        if (! $mailSent) {
            return redirect()->back()->with('warning', "Invitation created for {$invitation->email}, but email dispatch encountered an issue. You can copy the invitation link directly from the list.");
        }

        return redirect()->back()->with('success', "Invitation sent to {$invitation->email}.");
    }

    /**
     * Resend an existing invitation.
     */
    public function resendInvite(Request $request, StaffInvitation $invitation): RedirectResponse
    {
        $invitation->update([
            'token' => Str::random(48),
            'expires_at' => Carbon::now()->addDays(7),
        ]);

        $baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $subdomain = tenant('subdomain');
        $port = $request->getPort();
        $portSuffix = ($port && ! in_array($port, [80, 443])) ? ":{$port}" : '';
        $scheme = $request->getScheme();
        $acceptUrl = "{$scheme}://{$subdomain}.{$baseDomain}{$portSuffix}/invitation/accept/{$invitation->token}";
        $clinicName = ucwords((string) (tenant('name') ?? 'MedVisit Clinic'));

        $mailSent = true;
        try {
            Mail::to($invitation->email)->send(new StaffInviteMail($invitation, $acceptUrl, $clinicName));
        } catch (\Throwable $e) {
            report($e);
            $mailSent = false;
        }

        if (! $mailSent) {
            return redirect()->back()->with('warning', "Invitation refreshed for {$invitation->email}, but email dispatch encountered an issue. You can copy the invitation link directly from the list.");
        }

        return redirect()->back()->with('success', "Invitation resent to {$invitation->email}.");
    }

    /**
     * Revoke / cancel a pending invitation.
     */
    public function revokeInvite(StaffInvitation $invitation): RedirectResponse
    {
        $invitation->delete();

        return redirect()->back()->with('success', 'Invitation has been revoked.');
    }

    /**
     * Toggle active/inactive status with Last Admin protection.
     */
    public function toggleStatus(User $user): RedirectResponse
    {
        if ($user->hasRole('clinic_admin') && $user->is_active && $this->getActiveAdminCount($user->tenant_id) <= 1) {
            return redirect()->back()->withErrors([
                'status' => 'Cannot deactivate the only active clinic administrator.',
            ]);
        }

        $user->update(['is_active' => ! $user->is_active]);
        $statusStr = $user->is_active ? 'activated' : 'deactivated';

        return redirect()->back()->with('success', "Staff member {$user->name} is now {$statusStr}.");
    }

    /**
     * Change a staff member's role with Last Admin protection.
     */
    public function updateRole(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'role' => ['required', 'string', 'in:clinic_admin,receptionist,doctor'],
            'doctor_id' => ['nullable', 'exists:doctors,id'],
        ]);

        // If demoting from clinic_admin, verify there is another active admin
        if ($user->hasRole('clinic_admin') && $validated['role'] !== 'clinic_admin') {
            if ($this->getActiveAdminCount($user->tenant_id) <= 1) {
                return redirect()->back()->withErrors([
                    'role' => 'Cannot demote the last remaining clinic administrator.',
                ]);
            }
        }

        $user->syncRoles([$validated['role']]);

        // If doctor role and doctor_id passed, link doctor profile
        if ($validated['role'] === 'doctor' && ! empty($validated['doctor_id'])) {
            Doctor::where('id', $validated['doctor_id'])->update(['user_id' => $user->id]);
        }

        return redirect()->back()->with('success', "Role updated for {$user->name}.");
    }

    /**
     * Link user to doctor profile.
     */
    public function linkDoctor(Request $request, User $user): RedirectResponse
    {
        $validated = $request->validate([
            'doctor_id' => ['nullable', 'exists:doctors,id'],
        ]);

        // Unlink previous doctor if any
        Doctor::where('user_id', $user->id)->update(['user_id' => null]);

        if (! empty($validated['doctor_id'])) {
            Doctor::where('id', $validated['doctor_id'])->update(['user_id' => $user->id]);
        }

        return redirect()->back()->with('success', "Doctor profile linked to {$user->name}.");
    }

    /**
     * Show Accept Invitation Page (Guest).
     */
    public function showAcceptInvite(string $token): Response|RedirectResponse
    {
        $invitation = StaffInvitation::where('token', $token)
            ->whereNull('accepted_at')
            ->first();

        if (! $invitation || $invitation->isExpired()) {
            return redirect()->route('tenant.login')->withErrors([
                'email' => 'This invitation link is invalid or has expired. Please contact your clinic administrator for a new invite.',
            ]);
        }

        return Inertia::render('Auth/AcceptInvitation', [
            'invitation' => [
                'token' => $invitation->token,
                'name' => $invitation->name,
                'email' => $invitation->email,
                'role' => $invitation->role,
                'role_label' => ucwords(str_replace('_', ' ', $invitation->role)),
            ],
            'clinicName' => ucwords((string) (tenant('name') ?? 'MedVisit Clinic')),
        ]);
    }

    /**
     * Process Accept Invitation (Guest).
     */
    public function acceptInvite(Request $request, string $token): RedirectResponse
    {
        $invitation = StaffInvitation::where('token', $token)
            ->whereNull('accepted_at')
            ->first();

        if (! $invitation || $invitation->isExpired()) {
            return redirect()->route('tenant.login')->withErrors([
                'email' => 'This invitation link is invalid or has expired.',
            ]);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = User::where('tenant_id', $invitation->tenant_id)
            ->where('email', $invitation->email)
            ->first();

        if ($user) {
            $user->update([
                'name' => $validated['name'],
                'password' => Hash::make($validated['password']),
                'email_verified_at' => $user->email_verified_at ?? now(),
                'is_active' => true,
            ]);
        } else {
            $user = User::create([
                'tenant_id' => $invitation->tenant_id,
                'name' => $validated['name'],
                'email' => $invitation->email,
                'password' => Hash::make($validated['password']),
                'email_verified_at' => now(),
                'is_active' => true,
            ]);
        }

        $user->syncRoles([$invitation->role]);

        // If doctor linkage was specified
        if ($invitation->doctor_id) {
            Doctor::where('id', $invitation->doctor_id)->update(['user_id' => $user->id]);
        }

        $invitation->update(['accepted_at' => now()]);

        Auth::login($user);

        return redirect()->route('tenant.dashboard')->with('success', "Welcome to the team, {$user->name}!");
    }

    /**
     * Helper to count active clinic admins.
     */
    protected function getActiveAdminCount(string $tenantId): int
    {
        return User::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->role('clinic_admin')
            ->count();
    }
}
