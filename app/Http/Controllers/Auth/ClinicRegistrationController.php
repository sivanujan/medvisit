<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ClinicRegistrationRequest;
use App\Mail\Auth\WelcomeClinicMail;
use App\Models\Tenant;
use App\Models\User;
use App\Rules\SubdomainRule;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;
use Stancl\Tenancy\Database\Models\Domain;

class ClinicRegistrationController extends Controller
{
    /**
     * Display the multi-step clinic registration wizard.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/RegisterClinic', [
            'districts' => ClinicRegistrationRequest::DISTRICTS,
            'clinicTypes' => ClinicRegistrationRequest::CLINIC_TYPES,
            'centralDomain' => config('tenancy.central_domains.0', 'medvisit.test'),
        ]);
    }

    /**
     * Debounced live availability check for subdomains.
     */
    public function checkSubdomain(Request $request): JsonResponse
    {
        $raw = (string) $request->input('subdomain', '');
        $subdomain = Str::lower(trim($raw));

        if (empty($subdomain)) {
            return response()->json([
                'available' => false,
                'reason' => 'Please enter a clinic web address.',
            ]);
        }

        if (strlen($subdomain) < 3 || strlen($subdomain) > 30) {
            return response()->json([
                'available' => false,
                'reason' => 'Web address must be between 3 and 30 characters.',
            ]);
        }

        if (! preg_match('/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/', $subdomain)) {
            return response()->json([
                'available' => false,
                'reason' => 'Use only lowercase letters, numbers, and hyphens (no hyphens at start or end).',
            ]);
        }

        if (in_array($subdomain, SubdomainRule::RESERVED, true)) {
            return response()->json([
                'available' => false,
                'reason' => "The address '{$subdomain}' is reserved by MedVisit.",
                'suggestions' => SubdomainRule::generateSuggestions($subdomain),
            ]);
        }

        $centralDomain = config('tenancy.central_domains.0', 'medvisit.test');

        $tenantExists = Tenant::where('id', $subdomain)
            ->orWhere('subdomain', $subdomain)
            ->exists();

        $domainExists = Domain::where('domain', $subdomain)
            ->orWhere('domain', "{$subdomain}.{$centralDomain}")
            ->exists();

        if ($tenantExists || $domainExists) {
            return response()->json([
                'available' => false,
                'reason' => "The address '{$subdomain}' is already taken.",
                'suggestions' => SubdomainRule::generateSuggestions($subdomain),
            ]);
        }

        return response()->json([
            'available' => true,
            'subdomain' => $subdomain,
            'url' => "https://{$subdomain}.{$centralDomain}",
        ]);
    }

    /**
     * Process clinic registration in a single database transaction.
     */
    public function store(ClinicRegistrationRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $subdomain = Str::lower(trim($validated['subdomain']));

        /** @var Tenant $tenant */
        /** @var User $user */
        $tenant = null;
        $user = null;

        DB::transaction(function () use ($validated, $subdomain, &$tenant, &$user) {
            $tenant = Tenant::create([
                'id' => $subdomain,
                'name' => $validated['clinic_name'],
                'subdomain' => $subdomain,
                'phone' => $validated['clinic_phone'],
                'address' => $validated['address'].', '.$validated['city'].', '.$validated['district'],
                'plan' => 'trial',
                'status' => 'trial',
                'trial_ends_at' => now()->addDays(14),
                'data' => [
                    'clinic_type' => $validated['clinic_type'],
                    'district' => $validated['district'],
                    'city' => $validated['city'],
                    'currency' => 'LKR',
                    'timezone' => 'Asia/Colombo',
                    'token_reset' => 'daily',
                ],
            ]);

            $centralDomain = config('tenancy.central_domains.0', 'medvisit.test');
            $tenant->domains()->create(['domain' => $subdomain]);
            $tenant->domains()->create(['domain' => "{$subdomain}.{$centralDomain}"]);

            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
            ]);

            $role = Role::firstOrCreate(['name' => 'clinic_admin', 'guard_name' => 'web']);
            $user->assignRole($role);

            AuditLogger::log('tenant.created', [
                'tenant_id' => $tenant->id,
                'name' => $tenant->name,
                'subdomain' => $subdomain,
                'plan' => 'trial',
            ]);

            AuditLogger::log('user.created', [
                'user_id' => $user->id,
                'email' => $user->email,
                'role' => 'clinic_admin',
                'tenant_id' => $tenant->id,
            ]);

            $user->sendEmailVerificationNotification();
            Mail::to($user->email)->queue(new WelcomeClinicMail($tenant, $user));
        });

        // Generate short-lived signed auto-login URL
        $oneTimeToken = Str::random(40);
        Cache::put("one_time_login:{$oneTimeToken}", [
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
        ], now()->addMinutes(15));

        $centralDomain = config('tenancy.central_domains.0', 'medvisit.test');
        $scheme = $request->getScheme();
        $port = $request->getPort();
        $portSuffix = ($port && ! in_array($port, [80, 443])) ? ":{$port}" : '';
        $tenantHost = "{$subdomain}.{$centralDomain}{$portSuffix}";
        $tenantBaseUrl = "{$scheme}://{$tenantHost}";
        $clinicUrl = "{$tenantBaseUrl}/login";

        $relativeSigned = URL::temporarySignedRoute(
            'tenant.login.one_time',
            now()->addMinutes(15),
            ['token' => $oneTimeToken],
            absolute: false
        );
        $autoLoginUrl = $tenantBaseUrl.$relativeSigned;

        return redirect()->route('register.success')->with('registration_success', [
            'clinic_name' => $tenant->name,
            'subdomain' => $subdomain,
            'clinic_url' => $clinicUrl,
            'auto_login_url' => $autoLoginUrl,
            'trial_ends_at' => $tenant->trial_ends_at->toFormattedDateString(),
            'admin_email' => $user->email,
            'clinic_type' => $validated['clinic_type'],
            'district' => $validated['district'],
        ]);
    }

    /**
     * Display the celebratory registration success screen.
     */
    public function success(Request $request): Response|RedirectResponse
    {
        $data = session('registration_success');

        if (! $data) {
            return redirect()->route('register');
        }

        return Inertia::render('Auth/RegisterClinicSuccess', [
            'registration' => $data,
        ]);
    }
}
