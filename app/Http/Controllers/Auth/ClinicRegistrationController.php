<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ClinicRegistrationRequest;
use App\Mail\Auth\RegistrationVerificationCodeMail;
use App\Mail\Auth\WelcomeClinicMail;
use App\Models\PendingRegistration;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Rules\NotDisposableEmail;
use App\Rules\SubdomainRule;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
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
        $baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $publicDomain = config('medvisit.public_domain', 'medvisit.lk');

        return Inertia::render('Auth/RegisterClinic', [
            'districts' => ClinicRegistrationRequest::DISTRICTS,
            'clinicTypes' => ClinicRegistrationRequest::CLINIC_TYPES,
            'centralDomain' => $baseDomain,
            'publicDomain' => $publicDomain,
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

        $centralDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

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
     * Send email verification code before clinic is created (Step 3 -> Step 4).
     */
    public function sendVerificationCode(Request $request): JsonResponse
    {
        $raw = $request->all();
        if (isset($raw['clinic_phone'])) {
            $raw['clinic_phone'] = ClinicRegistrationRequest::normalizePhone($raw['clinic_phone']);
        }
        if (isset($raw['mobile'])) {
            $raw['mobile'] = ClinicRegistrationRequest::normalizePhone($raw['mobile']);
        }
        if (isset($raw['subdomain'])) {
            $raw['subdomain'] = strtolower(trim((string) $raw['subdomain']));
        }

        $validator = Validator::make($raw, [
            'honeypot' => ['nullable', 'max:0'],
            'clinic_name' => ['required', 'string', 'max:120'],
            'clinic_type' => ['required', 'string', 'in:'.implode(',', ClinicRegistrationRequest::CLINIC_TYPES)],
            'district' => ['required', 'string', 'in:'.implode(',', ClinicRegistrationRequest::DISTRICTS)],
            'city' => ['required', 'string', 'max:100'],
            'address' => ['required', 'string', 'max:255'],
            'clinic_phone' => ['required', 'string', 'max:30'],
            'subdomain' => ['required', 'string', new SubdomainRule],
            'name' => ['required', 'string', 'max:120'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                'unique:users,email',
                new NotDisposableEmail,
            ],
            'mobile' => ['required', 'string', 'max:30'],
            'password' => [
                'required',
                'confirmed',
                Password::min(8)->letters()->mixedCase()->numbers(),
            ],
            'terms' => ['accepted'],
        ], [
            'terms.accepted' => 'You must agree to the Terms of Service and Privacy Policy to register.',
            'clinic_type.in' => 'Please select a valid clinic type.',
            'district.in' => 'Please select one of Sri Lanka’s 25 administrative districts.',
            'password.min' => 'Password must be at least 8 characters with uppercase, lowercase, and numbers.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $email = Str::lower(trim($validated['email']));
        $ip = $request->ip();

        // Rate limit sending: max 5 codes per email per hour and per IP
        $oneHourAgo = now()->subHour();
        $emailCount = PendingRegistration::where('email', $email)
            ->where('created_at', '>=', $oneHourAgo)
            ->count();

        $ipCount = PendingRegistration::where('ip_address', $ip)
            ->where('created_at', '>=', $oneHourAgo)
            ->count();

        if ($emailCount >= 5 || $ipCount >= 5) {
            return response()->json([
                'message' => 'Too many verification codes requested. Please wait an hour before requesting a new code.',
            ], 429);
        }

        $code = sprintf('%06d', random_int(100000, 999999));
        $token = Str::random(40);

        $pending = new PendingRegistration([
            'email' => $email,
            'token' => $token,
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'resend_available_at' => now()->addSeconds(60),
            'ip_address' => $ip,
        ]);
        $pending->setEncryptedPayload($validated);
        $pending->save();

        Log::info("[MedVisit OTP Code] For {$email}: {$code}");

        Mail::to($email)->send(new RegistrationVerificationCodeMail(
            code: $code,
            email: $email,
            name: $validated['name'],
            clinicName: $validated['clinic_name'],
        ));

        return response()->json([
            'success' => true,
            'token' => $token,
            'email' => $email,
            'expires_in_seconds' => 600,
            'resend_cooldown_seconds' => 60,
            'message' => "Verification code sent to {$email}.",
            'dev_code' => config('app.debug') ? $code : null,
        ]);
    }

    /**
     * Verify the 6-digit code.
     */
    public function verifyCode(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $token = (string) $request->input('token');
        $code = trim((string) $request->input('code'));

        /** @var PendingRegistration|null $pending */
        $pending = PendingRegistration::where('token', $token)->first();

        if (! $pending) {
            return response()->json([
                'message' => 'Registration session not found or expired. Please start over.',
            ], 404);
        }

        if ($pending->isVerified()) {
            return response()->json([
                'success' => true,
                'verified' => true,
                'token' => $pending->token,
                'message' => 'Email is already verified.',
            ]);
        }

        if ($pending->hasExceededAttempts()) {
            return response()->json([
                'message' => 'Too many incorrect attempts. Please request a new verification code.',
                'locked' => true,
                'attempts_remaining' => 0,
            ], 422);
        }

        if ($pending->isExpired()) {
            return response()->json([
                'message' => 'Verification code has expired. Please request a new code.',
                'expired' => true,
            ], 422);
        }

        if (! Hash::check($code, $pending->code_hash)) {
            $pending->increment('attempts');
            $remaining = max(0, 5 - $pending->attempts);

            if ($remaining === 0) {
                return response()->json([
                    'message' => 'Too many incorrect attempts. Please request a new verification code.',
                    'locked' => true,
                    'attempts_remaining' => 0,
                ], 422);
            }

            return response()->json([
                'message' => "Incorrect verification code. {$remaining} attempts remaining.",
                'attempts_remaining' => $remaining,
            ], 422);
        }

        $pending->update([
            'verified_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'verified' => true,
            'token' => $pending->token,
            'message' => 'Email verified successfully.',
        ]);
    }

    /**
     * Resend verification code (with 60-second cooldown and 1-hour rate limit).
     */
    public function resendCode(Request $request): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
        ]);

        $token = (string) $request->input('token');

        /** @var PendingRegistration|null $pending */
        $pending = PendingRegistration::where('token', $token)->first();

        if (! $pending) {
            return response()->json([
                'message' => 'Registration session not found. Please restart registration.',
            ], 404);
        }

        if ($pending->isVerified()) {
            return response()->json([
                'message' => 'Email is already verified.',
            ], 400);
        }

        if ($pending->resend_available_at && $pending->resend_available_at->isFuture()) {
            $diffSeconds = $pending->resend_available_at->diffInSeconds(now());

            return response()->json([
                'message' => "Please wait {$diffSeconds} seconds before requesting a new code.",
                'retry_after' => $diffSeconds,
            ], 429);
        }

        $oneHourAgo = now()->subHour();
        $emailCount = PendingRegistration::where('email', $pending->email)
            ->where('created_at', '>=', $oneHourAgo)
            ->count();

        $ipCount = PendingRegistration::where('ip_address', $request->ip())
            ->where('created_at', '>=', $oneHourAgo)
            ->count();

        if ($emailCount >= 5 || $ipCount >= 5) {
            return response()->json([
                'message' => 'Too many verification requests. Please wait an hour before trying again.',
            ], 429);
        }

        $code = sprintf('%06d', random_int(100000, 999999));

        $pending->update([
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(10),
            'resend_available_at' => now()->addSeconds(60),
        ]);

        $payload = $pending->getDecryptedPayload();

        Log::info("[MedVisit OTP Code] For {$pending->email}: {$code}");

        Mail::to($pending->email)->send(new RegistrationVerificationCodeMail(
            code: $code,
            email: $pending->email,
            name: $payload['name'] ?? null,
            clinicName: $payload['clinic_name'] ?? null,
        ));

        return response()->json([
            'success' => true,
            'expires_in_seconds' => 600,
            'resend_cooldown_seconds' => 60,
            'message' => "A new verification code has been sent to {$pending->email}.",
            'dev_code' => config('app.debug') ? $code : null,
        ]);
    }

    /**
     * Process clinic registration in a single database transaction.
     * Only permitted if email has been verified upfront.
     */
    public function store(ClinicRegistrationRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $token = (string) $validated['registration_token'];

        /** @var PendingRegistration|null $pending */
        $pending = PendingRegistration::where('token', $token)->first();

        // Server-side check: refuse to create clinic unless pending registration is verified
        if (! $pending || ! $pending->isVerified()) {
            return back()->withErrors([
                'email' => 'Your email address must be verified before the clinic can be created.',
            ])->withInput();
        }

        $subdomain = Str::lower(trim($validated['subdomain']));

        /** @var Tenant $tenant */
        /** @var User $user */
        $tenant = null;
        $user = null;

        DB::transaction(function () use ($validated, $subdomain, $pending, &$tenant, &$user) {
            $tenant = Tenant::create([
                'id' => $subdomain,
                'name' => $validated['clinic_name'],
                'subdomain' => $subdomain,
                'phone' => $validated['clinic_phone'],
                'address' => $validated['address'].', '.$validated['city'].', '.$validated['district'],
                'plan' => 'pro',
                'status' => ((int) config('medvisit.subscription.trial_days', 0)) > 0 ? 'trial' : 'pending_payment',
                'trial_ends_at' => ((int) config('medvisit.subscription.trial_days', 0)) > 0 ? now()->addDays((int) config('medvisit.subscription.trial_days', 0)) : null,
                'data' => [
                    'clinic_type' => $validated['clinic_type'],
                    'district' => $validated['district'],
                    'city' => $validated['city'],
                    'currency' => 'LKR',
                    'timezone' => 'Asia/Colombo',
                    'token_reset' => 'daily',
                ],
            ]);

            // Create initial Subscription (Pending payment; invoice is created only when Pay is clicked)
            $trialDays = (int) config('medvisit.subscription.trial_days', 0);
            $proPlan = Plan::forSlug('pro');
            $planId = $proPlan ? $proPlan->id : 1;

            $trialEndsAt = $trialDays > 0 ? now()->addDays($trialDays) : null;
            $subStatus = $trialDays > 0 ? Subscription::STATUS_ACTIVE : Subscription::STATUS_PENDING_PAYMENT;

            Subscription::create([
                'tenant_id' => $tenant->id,
                'plan_id' => $planId,
                'status' => $subStatus,
                'current_period_start' => now(),
                'current_period_end' => $trialEndsAt,
                'trial_ends_at' => $trialEndsAt,
                'activated_at' => $trialDays > 0 ? now() : null,
                'created_by' => 'registration',
                'notes' => $trialDays > 0 ? "Started with {$trialDays}-day free trial" : 'Initial registration pending subscription payment',
            ]);

            $centralDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
            $tenant->domains()->create(['domain' => $subdomain]);
            $tenant->domains()->create(['domain' => "{$subdomain}.{$centralDomain}"]);

            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'email_verified_at' => $pending->verified_at ?? now(),
            ]);

            $role = Role::firstOrCreate(['name' => 'clinic_admin', 'guard_name' => 'web']);
            $user->assignRole($role);

            // Clean up the verified pending registration
            $pending->delete();

            AuditLogger::log('tenant.created', [
                'tenant_id' => $tenant->id,
                'name' => $tenant->name,
                'subdomain' => $subdomain,
                'plan' => 'pro',
            ]);

            AuditLogger::log('user.created', [
                'user_id' => $user->id,
                'email' => $user->email,
                'role' => 'clinic_admin',
                'tenant_id' => $tenant->id,
            ]);

            Mail::to($user->email)->queue(new WelcomeClinicMail($tenant, $user));
        });

        // Generate short-lived signed auto-login URL
        $oneTimeToken = Str::random(40);
        Cache::put("one_time_login:{$oneTimeToken}", [
            'user_id' => $user->id,
            'tenant_id' => $tenant->id,
        ], now()->addMinutes(15));

        $centralDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
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
            'trial_ends_at' => $tenant->trial_ends_at?->toFormattedDateString(),
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
