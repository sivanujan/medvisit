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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class StaffController extends Controller
{
    /**
     * Display the clinic staff directory, pending invitations, and roles & permissions matrix.
     */
    public function index(Request $request): Response
    {
        $tenantId = tenant('id');

        // Fetch latest session activity for users in this tenant
        $recentSessions = DB::table('sessions')
            ->whereNotNull('user_id')
            ->select('user_id', DB::raw('MAX(last_activity) as last_activity'))
            ->groupBy('user_id')
            ->pluck('last_activity', 'user_id');

        // Fetch staff users
        $staffUsers = User::where('tenant_id', $tenantId)
            ->with(['roles'])
            ->orderBy('name')
            ->get()
            ->map(function ($u) use ($recentSessions) {
                $linkedDoc = Doctor::where('tenant_id', $u->tenant_id)
                    ->where('user_id', $u->id)
                    ->first();

                $roles = $u->roles->pluck('name')->all();
                $primaryRole = $roles[0] ?? 'receptionist';

                // Check if this user is the last active admin
                $isLastAdmin = in_array('clinic_admin', $roles, true)
                    && (bool) ($u->is_active ?? true)
                    && $this->getActiveAdminCount($u->tenant_id) <= 1;

                // Relative last active time
                $lastActivity = $recentSessions->get($u->id);
                $lastActiveFormatted = $lastActivity
                    ? Carbon::createFromTimestamp($lastActivity)->diffForHumans()
                    : ($u->updated_at ? $u->updated_at->diffForHumans() : 'Never');

                $doctorData = $linkedDoc ? [
                    'id' => $linkedDoc->id,
                    'name' => trim(($linkedDoc->title ?? 'Dr.').' '.$linkedDoc->name),
                    'specialty' => $linkedDoc->specialty,
                    'slmc_number' => $linkedDoc->slmc_number,
                ] : null;

                $isUnrelatedDoctor = false;
                if ($doctorData && in_array('clinic_admin', $roles, true)) {
                    $isUnrelatedDoctor = $this->isUnrelatedDoctorName($u->name, $linkedDoc->name);
                }

                return [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'role' => $primaryRole,
                    'roles' => ! empty($roles) ? $roles : [$primaryRole],
                    'role_label' => ucwords(str_replace('_', ' ', implode(', ', $roles ?: [$primaryRole]))),
                    'is_active' => (bool) ($u->is_active ?? true),
                    'is_last_admin' => $isLastAdmin,
                    'linked_doctor' => $doctorData,
                    'is_unrelated_doctor' => $isUnrelatedDoctor,
                    'last_active_at' => $lastActiveFormatted,
                    'created_at_formatted' => $u->created_at ? $u->created_at->format('d M Y') : 'Unknown',
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
            ->map(function ($inv) use ($scheme, $subdomain, $baseDomain, $portSuffix) {
                $roles = explode(',', $inv->role);
                $primaryRole = $roles[0] ?? 'receptionist';
                $roleLabels = array_map(fn ($r) => ucwords(str_replace('_', ' ', $r)), $roles);

                $expiresIn = $inv->isExpired()
                    ? 'Expired'
                    : Carbon::now()->diffForHumans($inv->expires_at, [
                        'syntax' => Carbon::DIFF_RELATIVE_TO_NOW,
                        'options' => Carbon::JUST_NOW | Carbon::ONE_DAY_WORDS,
                    ]);

                // Cleaner format: e.g. "6 days" or "in 6 days"
                if (! $inv->isExpired()) {
                    $days = (int) ceil(Carbon::now()->floatDiffInDays($inv->expires_at, false));
                    $expiresIn = $days > 1 ? "{$days} days" : ($days === 1 ? '1 day' : 'Today');
                }

                return [
                    'id' => $inv->id,
                    'name' => $inv->name,
                    'email' => $inv->email,
                    'role' => $primaryRole,
                    'roles' => $roles,
                    'role_label' => implode(', ', $roleLabels),
                    'is_expired' => $inv->isExpired(),
                    'expires_in' => $expiresIn,
                    'expires_at_formatted' => $inv->expires_at ? $inv->expires_at->format('d M Y') : '—',
                    'doctor_name' => $inv->doctor ? trim(($inv->doctor->title ?? 'Dr.').' '.$inv->doctor->name) : null,
                    'created_at_formatted' => $inv->created_at ? $inv->created_at->format('d M Y') : '—',
                    'accept_url' => "{$scheme}://{$subdomain}.{$baseDomain}{$portSuffix}/invitation/accept/{$inv->token}",
                ];
            });

        // Doctor profiles for this tenant
        $doctors = Doctor::where('tenant_id', $tenantId)
            ->orderBy('name')
            ->get(['id', 'title', 'name', 'specialty', 'slmc_number', 'user_id'])
            ->map(function ($d) {
                $linkedUser = $d->user_id ? User::find($d->user_id) : null;

                return [
                    'id' => $d->id,
                    'name' => trim(($d->title ?? 'Dr.').' '.$d->name),
                    'specialty' => $d->specialty,
                    'slmc_number' => $d->slmc_number,
                    'is_linked' => $d->user_id !== null,
                    'linked_user_id' => $d->user_id,
                    'linked_user_name' => $linkedUser?->name,
                ];
            });

        // Dynamic Permissions Matrix
        $permissionsMatrix = $this->buildPermissionsMatrix();

        return Inertia::render('Staff/Index', [
            'staffUsers' => $staffUsers,
            'pendingInvitations' => $pendingInvitations,
            'doctors' => $doctors,
            'permissionsMatrix' => $permissionsMatrix,
            'flashInviteLink' => session('invite_link'),
            'currentUser' => [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'roles' => $request->user()->roles->pluck('name')->all(),
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
            'phone' => ['nullable', 'string', 'max:30'],
            'role' => ['required', 'string', 'in:clinic_admin,receptionist,doctor,pharmacist'],
            'secondary_role' => ['nullable', 'string', 'in:clinic_admin,receptionist,doctor,pharmacist'],
            'doctor_id' => ['nullable', 'exists:doctors,id'],
            'create_doctor' => ['nullable', 'boolean'],
            'new_doctor' => ['nullable', 'array'],
            'new_doctor.name' => ['required_if:create_doctor,true', 'nullable', 'string', 'max:255'],
            'new_doctor.specialty' => ['required_if:create_doctor,true', 'nullable', 'string', 'max:255'],
            'new_doctor.slmc_number' => ['required_if:create_doctor,true', 'nullable', 'string', 'max:50'],
            'personal_message' => ['nullable', 'string', 'max:500'],
        ]);

        // Check if user already exists as active member in this clinic
        $existingUser = User::where('tenant_id', $tenantId)
            ->where('email', $validated['email'])
            ->first();

        if ($existingUser) {
            return redirect()->back()->withErrors([
                'email' => 'A user with this email address is already a member of this clinic team.',
            ]);
        }

        // Inline doctor profile creation
        $doctorId = null;
        if ($validated['role'] === 'doctor' || ($validated['secondary_role'] ?? null) === 'doctor') {
            if (! empty($validated['create_doctor']) && ! empty($validated['new_doctor'])) {
                $doc = Doctor::create([
                    'tenant_id' => $tenantId,
                    'title' => 'Dr.',
                    'name' => $validated['new_doctor']['name'],
                    'specialty' => $validated['new_doctor']['specialty'],
                    'slmc_number' => $validated['new_doctor']['slmc_number'],
                    'email' => $validated['email'],
                    'phone' => $validated['phone'] ?? null,
                    'is_active' => true,
                ]);
                $doctorId = $doc->id;
            } elseif (! empty($validated['doctor_id'])) {
                $doctorId = (int) $validated['doctor_id'];
            }
        }

        // Delete existing unaccepted invitations for this email to avoid duplicate tokens
        StaffInvitation::where('tenant_id', $tenantId)
            ->where('email', $validated['email'])
            ->delete();

        // Assemble roles
        $rolesToAssign = [$validated['role']];
        if (! empty($validated['secondary_role']) && $validated['secondary_role'] !== $validated['role']) {
            $rolesToAssign[] = $validated['secondary_role'];
        }
        $roleString = implode(',', $rolesToAssign);

        $token = Str::random(48);
        $invitation = StaffInvitation::create([
            'tenant_id' => $tenantId,
            'email' => $validated['email'],
            'name' => $validated['name'],
            'role' => $roleString,
            'doctor_id' => $doctorId,
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
            Mail::to($invitation->email)->send(new StaffInviteMail(
                $invitation,
                $acceptUrl,
                $clinicName,
                $validated['personal_message'] ?? null,
                $request->user()->name
            ));
        } catch (\Throwable $e) {
            report($e);
            $mailSent = false;
        }

        $response = redirect()->back()->with('invite_link', $acceptUrl);

        if (! $mailSent) {
            return $response->with('warning', "Invitation created for {$invitation->email}, but email delivery encountered an issue. You can copy the invite link directly.");
        }

        return $response->with('success', "Invitation sent to {$invitation->email}.");
    }

    /**
     * Resend an existing invitation.
     */
    public function resendInvite(Request $request, StaffInvitation $invitation): RedirectResponse
    {
        if ($invitation->tenant_id !== tenant('id')) {
            abort(403);
        }

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
            Mail::to($invitation->email)->send(new StaffInviteMail(
                $invitation,
                $acceptUrl,
                $clinicName,
                null,
                $request->user()->name
            ));
        } catch (\Throwable $e) {
            report($e);
            $mailSent = false;
        }

        $response = redirect()->back()->with('invite_link', $acceptUrl);

        if (! $mailSent) {
            return $response->with('warning', "Invitation refreshed for {$invitation->email}, but email delivery encountered an issue. You can copy the invite link directly.");
        }

        return $response->with('success', "Invitation resent to {$invitation->email}.");
    }

    /**
     * Revoke / cancel a pending invitation.
     */
    public function revokeInvite(StaffInvitation $invitation): RedirectResponse
    {
        if ($invitation->tenant_id !== tenant('id')) {
            abort(403);
        }

        $invitation->delete();

        return redirect()->back()->with('success', 'Invitation has been revoked.');
    }

    /**
     * Toggle active/inactive status with Safety Rules:
     * 1. Cannot deactivate yourself.
     * 2. Cannot deactivate the last active clinic admin.
     * 3. Deactivated users are logged out immediately (sessions & tokens revoked).
     */
    public function toggleStatus(User $user): RedirectResponse
    {
        if ($user->tenant_id !== tenant('id')) {
            abort(403);
        }

        // Safety Rule 1: Cannot deactivate yourself
        if ($user->id === Auth::id()) {
            return redirect()->back()->withErrors([
                'status' => 'You cannot deactivate your own account.',
            ]);
        }

        // Safety Rule 2: Cannot deactivate the last active clinic administrator
        if ($user->hasRole('clinic_admin') && $user->is_active && $this->getActiveAdminCount($user->tenant_id) <= 1) {
            return redirect()->back()->withErrors([
                'status' => 'Cannot deactivate the only active clinic administrator.',
            ]);
        }

        $newStatus = ! $user->is_active;
        $user->update(['is_active' => $newStatus]);

        // Safety Rule 3: Revoke all active sessions and API tokens immediately when deactivated
        if (! $newStatus) {
            DB::table('sessions')->where('user_id', $user->id)->delete();
            if (method_exists($user, 'tokens')) {
                $user->tokens()->delete();
            }
        }

        $statusStr = $newStatus ? 'activated' : 'deactivated';

        return redirect()->back()->with('success', "Staff member {$user->name} is now {$statusStr}.");
    }

    /**
     * Change a staff member's role with Last Admin protection.
     */
    public function updateRole(Request $request, User $user): RedirectResponse
    {
        if ($user->tenant_id !== tenant('id')) {
            abort(403);
        }

        $validated = $request->validate([
            'role' => ['required', 'string', 'in:clinic_admin,receptionist,doctor,pharmacist'],
            'secondary_role' => ['nullable', 'string', 'in:clinic_admin,receptionist,doctor,pharmacist'],
            'doctor_id' => ['nullable', 'exists:doctors,id'],
        ]);

        $rolesToSync = [$validated['role']];
        if (! empty($validated['secondary_role']) && $validated['secondary_role'] !== $validated['role']) {
            $rolesToSync[] = $validated['secondary_role'];
        }

        // If currently clinic_admin and removing clinic_admin, verify there is another active admin
        $wasAdmin = $user->hasRole('clinic_admin');
        $willBeAdmin = in_array('clinic_admin', $rolesToSync, true);

        if ($wasAdmin && ! $willBeAdmin) {
            if ($this->getActiveAdminCount($user->tenant_id) <= 1) {
                return redirect()->back()->withErrors([
                    'role' => 'Cannot remove administrator role from the last active clinic administrator.',
                ]);
            }
        }

        $user->syncRoles($rolesToSync);

        // If doctor role is among roles and doctor_id passed, update doctor linkage
        if (in_array('doctor', $rolesToSync, true) && ! empty($validated['doctor_id'])) {
            Doctor::where('tenant_id', tenant('id'))
                ->where('user_id', $user->id)
                ->update(['user_id' => null]);

            Doctor::where('tenant_id', tenant('id'))
                ->where('id', $validated['doctor_id'])
                ->update(['user_id' => $user->id]);
        }

        return redirect()->back()->with('success', "Role updated for {$user->name}.");
    }

    /**
     * Link user to doctor profile.
     */
    public function linkDoctor(Request $request, User $user): RedirectResponse
    {
        if ($user->tenant_id !== tenant('id')) {
            abort(403);
        }

        $validated = $request->validate([
            'doctor_id' => ['nullable', 'exists:doctors,id'],
        ]);

        // Unlink previous doctor for this user
        Doctor::where('tenant_id', tenant('id'))
            ->where('user_id', $user->id)
            ->update(['user_id' => null]);

        if (! empty($validated['doctor_id'])) {
            // Ensure target doctor belongs to this tenant
            Doctor::where('tenant_id', tenant('id'))
                ->where('id', $validated['doctor_id'])
                ->update(['user_id' => $user->id]);
        }

        return redirect()->back()->with('success', "Doctor profile updated for {$user->name}.");
    }

    /**
     * Unlink doctor profile from user.
     */
    public function unlinkDoctor(User $user): RedirectResponse
    {
        if ($user->tenant_id !== tenant('id')) {
            abort(403);
        }

        Doctor::where('tenant_id', tenant('id'))
            ->where('user_id', $user->id)
            ->update(['user_id' => null]);

        return redirect()->back()->with('success', "Doctor profile unlinked from {$user->name}.");
    }

    /**
     * Trigger a password reset link to staff user's email.
     */
    public function sendPasswordReset(User $user): RedirectResponse
    {
        if ($user->tenant_id !== tenant('id')) {
            abort(403);
        }

        Password::sendResetLink(['email' => $user->email]);

        return redirect()->back()->with('success', "Password reset link sent to {$user->email}.");
    }

    /**
     * Show Accept Invitation Page (Guest).
     */
    public function showAcceptInvite(string $token): Response|RedirectResponse
    {
        $invitation = StaffInvitation::where('token', $token)
            ->where('tenant_id', tenant('id'))
            ->whereNull('accepted_at')
            ->first();

        if (! $invitation || $invitation->isExpired()) {
            return redirect()->route('tenant.login')->withErrors([
                'email' => 'This invitation link is invalid or has expired. Please contact your clinic administrator for a new invite.',
            ]);
        }

        $roles = explode(',', $invitation->role);
        $roleLabels = array_map(fn ($r) => ucwords(str_replace('_', ' ', $r)), $roles);

        return Inertia::render('Auth/AcceptInvitation', [
            'invitation' => [
                'token' => $invitation->token,
                'name' => $invitation->name,
                'email' => $invitation->email,
                'role' => $roles[0] ?? 'receptionist',
                'role_label' => implode(', ', $roleLabels),
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
            ->where('tenant_id', tenant('id'))
            ->whereNull('accepted_at')
            ->first();

        if (! $invitation || $invitation->isExpired()) {
            return redirect()->route('tenant.login')->withErrors([
                'email' => 'This invitation link is invalid or has expired.',
            ]);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'confirmed', PasswordRule::defaults()],
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

        $rolesToAssign = explode(',', $invitation->role);
        $user->syncRoles($rolesToAssign);

        // If doctor linkage was specified
        if ($invitation->doctor_id) {
            Doctor::where('tenant_id', $invitation->tenant_id)
                ->where('id', $invitation->doctor_id)
                ->update(['user_id' => $user->id]);
        }

        $invitation->update(['accepted_at' => now()]);

        Auth::login($user);

        return redirect()->route('tenant.dashboard')->with('success', "Welcome to the team, {$user->name}!");
    }

    /**
     * Helper to count active clinic admins in tenant.
     */
    protected function getActiveAdminCount(string $tenantId): int
    {
        return User::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->role('clinic_admin')
            ->count();
    }

    /**
     * Detect if a linked doctor's name looks unrelated to the user's name.
     */
    protected function isUnrelatedDoctorName(string $userName, ?string $doctorName): bool
    {
        if (empty($doctorName)) {
            return false;
        }

        $titles = ['dr', 'doctor', 'mrs', 'mr', 'ms', 'miss', 'prof', 'md'];

        $cleanWords = function (string $str) use ($titles): array {
            $clean = preg_replace('/[^a-zA-Z\s]/', ' ', strtolower($str));
            $words = preg_split('/\s+/', trim((string) $clean), -1, PREG_SPLIT_NO_EMPTY);

            return array_values(array_filter($words, fn ($w) => strlen($w) > 2 && ! in_array($w, $titles, true)));
        };

        $userWords = $cleanWords($userName);
        $docWords = $cleanWords($doctorName);

        if (empty($userWords) || empty($docWords)) {
            return false;
        }

        foreach ($userWords as $uw) {
            foreach ($docWords as $dw) {
                if ($uw === $dw || str_contains($uw, $dw) || str_contains($dw, $uw)) {
                    return false;
                }
                if (levenshtein($uw, $dw) <= 2) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Dynamically construct the roles and permissions matrix from real Spatie definitions.
     */
    protected function buildPermissionsMatrix(): array
    {
        // Spatie roles with their actual permissions
        $roles = Role::with('permissions')
            ->whereIn('name', ['clinic_admin', 'doctor', 'receptionist', 'pharmacist'])
            ->get()
            ->keyBy('name');

        $has = function (string $roleName, string $permission) use ($roles): bool {
            /** @var Role|null $role */
            $role = $roles->get($roleName);

            return $role ? $role->hasPermissionTo($permission) : false;
        };

        return [
            [
                'area' => 'Today / Queue',
                'description' => 'Real-time patient check-ins and live queue call',
                'clinic_admin' => 'full',
                'doctor' => 'full',
                'receptionist' => 'full',
                'pharmacist' => 'view',
            ],
            [
                'area' => 'Issue Token & Bookings',
                'description' => 'Issue patient tokens and create channeling appointments',
                'clinic_admin' => 'full',
                'doctor' => 'none',
                'receptionist' => 'full',
                'pharmacist' => 'none',
            ],
            [
                'area' => 'Calendar & Schedules',
                'description' => 'View schedule grid and upcoming doctor sessions',
                'clinic_admin' => 'full',
                'doctor' => 'full',
                'receptionist' => 'full',
                'pharmacist' => 'none',
            ],
            [
                'area' => 'Doctors & Schedules',
                'description' => 'Manage doctor profiles, fees and weekly recurring sessions',
                'clinic_admin' => 'full',
                'doctor' => 'view',
                'receptionist' => 'view',
                'pharmacist' => 'none',
            ],
            [
                'area' => 'Patient Directory',
                'description' => 'Patient profiles, search by NIC/phone, and clinical history',
                'clinic_admin' => 'full',
                'doctor' => 'full',
                'receptionist' => 'full',
                'pharmacist' => 'view',
            ],
            [
                'area' => 'Prescriptions',
                'description' => 'Author electronic prescriptions, dosage notes and view history',
                'clinic_admin' => $has('clinic_admin', 'prescriptions.create') ? 'full' : 'view',
                'doctor' => $has('doctor', 'prescriptions.create') ? 'full' : 'view',
                'receptionist' => 'none',
                'pharmacist' => $has('pharmacist', 'prescriptions.view') ? 'view' : 'none',
            ],
            [
                'area' => 'Billing & Collections',
                'description' => 'Collect cash/card payments, issue invoices and record refunds',
                'clinic_admin' => 'full',
                'doctor' => 'none',
                'receptionist' => 'full',
                'pharmacist' => 'none',
            ],
            [
                'area' => 'Doctor Payouts',
                'description' => 'Daily settlement balances, payout calculations and mark paid',
                'clinic_admin' => 'full',
                'doctor' => 'view',
                'receptionist' => 'none',
                'pharmacist' => 'none',
            ],
            [
                'area' => 'Pharmacy',
                'description' => 'Dispense medicines, receive GRN stock and adjust inventories',
                'clinic_admin' => $has('clinic_admin', 'pharmacy.dispense') ? 'full' : 'view',
                'doctor' => $has('doctor', 'pharmacy.view') ? 'view' : 'none',
                'receptionist' => $has('receptionist', 'pharmacy.view') ? 'view' : 'none',
                'pharmacist' => $has('pharmacist', 'pharmacy.dispense') ? 'full' : 'view',
            ],
            [
                'area' => 'Clinic Website',
                'description' => 'Public landing page, branding, content blocks and Page Builder',
                'clinic_admin' => 'full',
                'doctor' => 'none',
                'receptionist' => 'none',
                'pharmacist' => 'none',
            ],
            [
                'area' => 'Staff & Team',
                'description' => 'Invite clinic team members, assign roles and link doctor profiles',
                'clinic_admin' => 'full',
                'doctor' => 'none',
                'receptionist' => 'none',
                'pharmacist' => 'none',
            ],
            [
                'area' => 'Clinic Settings',
                'description' => 'Clinic profile, session defaults, fee policies and audit logs',
                'clinic_admin' => 'full',
                'doctor' => 'none',
                'receptionist' => 'none',
                'pharmacist' => 'none',
            ],
            [
                'area' => 'Subscription & Billing',
                'description' => 'MedVisit subscription plan, payment methods and invoices',
                'clinic_admin' => 'full',
                'doctor' => 'none',
                'receptionist' => 'none',
                'pharmacist' => 'none',
            ],
        ];
    }
}
