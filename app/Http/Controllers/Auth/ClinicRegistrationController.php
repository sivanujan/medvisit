<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ClinicRegistrationRequest;
use App\Mail\Auth\RegistrationVerificationCodeMail;
use App\Mail\Auth\WelcomeClinicMail;
use App\Mail\Subscription\ZeroAmountInvoiceMail;
use App\Models\AgreementAcceptance;
use App\Models\OtpLog;
use App\Models\PendingRegistration;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionInvite;
use App\Models\Tenant;
use App\Models\User;
use App\Rules\NotDisposableEmail;
use App\Rules\SubdomainRule;
use App\Services\AuditLogger;
use App\Services\PhoneVerification\PhoneVerificationService;
use App\Services\TelegramNotificationService;
use App\Services\TurnstileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
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
    public function create(Request $request): Response
    {
        $baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $publicDomain = config('medvisit.public_domain', 'medvisit.lk');

        $inviteData = null;
        $inviteError = null;
        if ($inviteToken = $request->query('invite')) {
            $tokenHash = SubscriptionInvite::hashToken((string) $inviteToken);
            /** @var SubscriptionInvite|null $invite */
            $invite = SubscriptionInvite::where('token_hash', $tokenHash)->first();

            if (! $invite) {
                $inviteError = 'The invitation link is invalid.';
            } elseif ($invite->status === SubscriptionInvite::STATUS_REGISTERED) {
                $inviteError = 'This invitation has already been used to register a clinic.';
            } elseif ($invite->status === SubscriptionInvite::STATUS_REVOKED) {
                $inviteError = 'This invitation has been revoked.';
            } elseif ($invite->isExpired()) {
                $inviteError = 'This invitation link has expired.';
            } else {
                $targetPlan = Plan::where('slug', $invite->plan_slug)->first();
                $inviteData = [
                    'token' => (string) $inviteToken,
                    'email' => $invite->recipient_email,
                    'recipient_name' => $invite->recipient_name,
                    'clinic_name' => $invite->clinic_name,
                    'plan_slug' => $invite->plan_slug,
                    'plan_name' => $targetPlan ? $targetPlan->name : ucfirst($invite->plan_slug),
                    'free_period_text' => $invite->free_period_value.' '.($invite->free_period_type === 'months' ? 'month(s)' : 'day(s)'),
                ];
            }
        }

        $inviteData = null;
        $inviteError = null;
        if ($inviteToken = $request->query('invite')) {
            $tokenHash = SubscriptionInvite::hashToken((string) $inviteToken);
            /** @var SubscriptionInvite|null $invite */
            $invite = SubscriptionInvite::where('token_hash', $tokenHash)->first();

            if (! $invite) {
                $inviteError = 'The invitation link is invalid.';
            } elseif ($invite->status === SubscriptionInvite::STATUS_REGISTERED) {
                $inviteError = 'This invitation has already been used to register a clinic.';
            } elseif ($invite->status === SubscriptionInvite::STATUS_REVOKED) {
                $inviteError = 'This invitation has been revoked.';
            } elseif ($invite->isExpired()) {
                $inviteError = 'This invitation link has expired.';
            } else {
                $targetPlan = Plan::where('slug', $invite->plan_slug)->first();
                $inviteData = [
                    'token' => (string) $inviteToken,
                    'email' => $invite->recipient_email,
                    'recipient_name' => $invite->recipient_name,
                    'clinic_name' => $invite->clinic_name,
                    'plan_slug' => $invite->plan_slug,
                    'plan_name' => $targetPlan ? $targetPlan->name : ucfirst($invite->plan_slug),
                    'free_period_text' => $invite->free_period_value.' '.($invite->free_period_type === 'months' ? 'month(s)' : 'day(s)'),
                ];
            }
        }

        return Inertia::render('Auth/RegisterClinic', [
            'districts' => ClinicRegistrationRequest::DISTRICTS,
            'clinicTypes' => ClinicRegistrationRequest::CLINIC_TYPES,
            'centralDomain' => $baseDomain,
            'publicDomain' => $publicDomain,
            'turnstileSiteKey' => config('services.turnstile.site_key'),
            'legalVersions' => config('legal.versions', [
                'terms' => '2026-10-28',
                'privacy' => '2026-10-27',
                'refund' => '2026-10-28',
                'dispute' => '2026-10-21',
            ]),
            'invite' => $inviteData,
            'inviteError' => $inviteError,
        ]);
    }

    /**
     * Debounced live availability check for subdomains.
     */
    public function checkSubdomain(Request $request): JsonResponse
    {
        $raw = (string) $request->input('subdomain', '');
        $clinicName = (string) $request->input('clinic_name', '');
        $city = (string) $request->input('city', '');
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

        if (str_contains($subdomain, '--')) {
            return response()->json([
                'available' => false,
                'reason' => 'The web address cannot contain consecutive hyphens.',
            ]);
        }

        if (str_contains($subdomain, 'xn--')) {
            return response()->json([
                'available' => false,
                'reason' => 'The web address cannot contain punycode prefixes (xn--).',
            ]);
        }

        if (ctype_digit($subdomain)) {
            return response()->json([
                'available' => false,
                'reason' => 'The web address cannot consist only of numbers.',
            ]);
        }

        if (SubdomainRule::isReserved($subdomain)) {
            $example = SubdomainRule::getPrimaryExample($subdomain, $clinicName, $city);

            return response()->json([
                'available' => false,
                'reason' => "This web address is reserved. Please choose another, e.g. {$example}.",
                'suggestions' => SubdomainRule::generateSuggestions($subdomain, $clinicName, $city),
            ]);
        }

        $centralDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

        $tenantExists = Tenant::withTrashed()->where('id', $subdomain)
            ->orWhere('subdomain', $subdomain)
            ->exists();

        $domainExists = Domain::where('domain', $subdomain)
            ->orWhere('domain', "{$subdomain}.{$centralDomain}")
            ->exists();

        if ($tenantExists || $domainExists) {
            return response()->json([
                'available' => false,
                'reason' => "The address '{$subdomain}' is already taken.",
                'suggestions' => SubdomainRule::generateSuggestions($subdomain, $clinicName, $city),
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
            $raw['mobile'] = ClinicRegistrationRequest::normalizeSriLankanMobile($raw['mobile']);
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
            'mobile' => ['required', 'string', 'regex:/^\+947[0-9]{8}$/'],
            'password' => [
                'required',
                'confirmed',
                Password::min(8)->letters()->mixedCase()->numbers(),
            ],
            'terms' => ['accepted'],
            'agreement_authority' => ['accepted'],
        ], [
            'terms.accepted' => 'You must agree to the Terms & Conditions, Privacy Policy, Refund Policy and Dispute Policy to register.',
            'agreement_authority.accepted' => 'You must confirm that you are authorised to register this clinic and responsible for its information and data.',
            'clinic_type.in' => 'Please select a valid clinic type.',
            'district.in' => 'Please select one of Sri Lanka’s 25 administrative districts.',
            'password.min' => 'Password must be at least 8 characters with uppercase, lowercase, and numbers.',
            'mobile.regex' => 'Please enter a valid Sri Lankan mobile number (e.g. 0771234567 or +94771234567).',
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
            'phone' => $validated['mobile'],
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

        $phoneService = app(PhoneVerificationService::class);

        return response()->json([
            'success' => true,
            'token' => $token,
            'email' => $email,
            'phone' => $validated['mobile'],
            'phone_masked' => $phoneService->maskPhone($validated['mobile']),
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
     * Send phone OTP code via Text.lk (SMS) to owner's mobile number.
     * Cloudflare Turnstile must pass before sending.
     */
    public function sendPhoneOtp(Request $request, TurnstileService $turnstileService, PhoneVerificationService $phoneService): JsonResponse
    {
        $request->validate([
            'token' => ['required', 'string'],
            'cf_turnstile_response' => ['nullable', 'string'],
        ]);

        $ip = $request->ip();
        $token = (string) $request->input('token');
        $turnstileToken = $request->input('cf_turnstile_response') ?: $request->input('cf-turnstile-response');

        /** @var PendingRegistration|null $pending */
        $pending = PendingRegistration::where('token', $token)->first();

        if (! $pending) {
            return response()->json([
                'message' => 'Registration session not found or expired. Please start over.',
            ], 404);
        }

        // Allow updating mobile phone number on the session if provided
        if ($request->filled('mobile')) {
            $normalizedMobile = ClinicRegistrationRequest::normalizeSriLankanMobile((string) $request->input('mobile'));
            if (! preg_match('/^\+947[0-9]{8}$/', $normalizedMobile)) {
                return response()->json([
                    'message' => 'Please enter a valid Sri Lankan mobile number (e.g. 0771234567 or +94771234567).',
                    'errors' => ['mobile' => ['Please enter a valid Sri Lankan mobile number.']],
                ], 422);
            }
            $pending->update(['phone' => $normalizedMobile]);
        }

        // 1. Cloudflare Turnstile Verification
        if (! $turnstileService->verify($turnstileToken, $ip)) {
            return response()->json([
                'message' => 'Security challenge failed. Please complete the captcha before requesting SMS.',
                'turnstile_failed' => true,
            ], 422);
        }

        if ($pending->isPhoneVerified()) {
            return response()->json([
                'success' => true,
                'verified' => true,
                'phone_token' => $pending->phone_signed_token,
                'message' => 'Mobile number is already verified.',
            ]);
        }

        // 2. Cooldown check (60s)
        if ($pending->phone_resend_available_at && $pending->phone_resend_available_at->isFuture()) {
            $diffSeconds = $pending->phone_resend_available_at->diffInSeconds(now());

            return response()->json([
                'message' => "Please wait {$diffSeconds} seconds before requesting a new SMS code.",
                'retry_after' => $diffSeconds,
            ], 429);
        }

        // 3. Global daily OTP cap check (.env REGISTRATION_OTP_DAILY_LIMIT, alerts Telegram once if hit)
        $dailyLimit = (int) config('medvisit.registration_otp_daily_limit', 100);
        $dailyKey = 'registration_otp_daily_count:'.now()->toDateString();
        $currentDaily = (int) Cache::get($dailyKey, 0);

        if ($currentDaily >= $dailyLimit) {
            app(TelegramNotificationService::class)->sendRegistrationOtpCapAlert($currentDaily, $dailyLimit);

            return response()->json([
                'message' => 'Daily SMS verification limit reached. Please contact support or try again tomorrow.',
            ], 429);
        }

        // 4. Rate limits: max 3 sends per number per hour; max 5 sends per IP per hour
        $oneHourAgo = now()->subHour();
        $phoneCount = PendingRegistration::where('phone', $pending->phone)
            ->whereNotNull('phone_code_hash')
            ->where('updated_at', '>=', $oneHourAgo)
            ->count();

        $ipCount = PendingRegistration::where('ip_address', $ip)
            ->whereNotNull('phone_code_hash')
            ->where('updated_at', '>=', $oneHourAgo)
            ->count();

        if ($phoneCount >= 3) {
            return response()->json([
                'message' => 'Too many SMS requests for this phone number. Please wait an hour before requesting a new code.',
            ], 429);
        }

        if ($ipCount >= 5) {
            return response()->json([
                'message' => 'Too many verification requests from your connection. Please wait an hour before trying again.',
            ], 429);
        }

        // 5. Generate 6-digit random code
        $plainCode = sprintf('%06d', random_int(100000, 999999));

        $pending->update([
            'phone_code_hash' => Hash::make($plainCode),
            'phone_attempts' => 0,
            'phone_expires_at' => now()->addMinutes(5),
            'phone_resend_available_at' => now()->addSeconds(60),
        ]);

        Cache::increment($dailyKey);

        // 6. SMS message text: "MedVisit verification code: 123456. Valid for 5 minutes. Do not share this code."
        $messageText = "MedVisit verification code: {$plainCode}. Valid for 5 minutes. Do not share this code.";
        $senderId = (string) config('services.textlk.sender_id', 'medvisit');

        Log::info("[MedVisit Phone OTP] For {$pending->phone}: {$plainCode}");

        $dispatchSuccess = true;
        $providerMessageId = null;
        $errorMessage = null;

        // In testing, when explicitly faked, or when token is empty: use fake SMS driver
        if (app()->environment('testing') || config('services.textlk.driver') === 'fake' || config('services.textlk.driver') === 'log' || empty(config('services.textlk.api_token'))) {
            $dispatchSuccess = true;
            $providerMessageId = 'dev-simulated-'.Str::random(12);
        } else {
            // Real Text.lk dispatch (production / live local testing)
            try {
                $cleanDigits = preg_replace('/\D/', '', (string) $pending->phone);
                $recipient = str_starts_with($cleanDigits, '94') ? $cleanDigits : '94'.$cleanDigits;

                $apiUrl = rtrim((string) config('services.textlk.api_url', 'https://app.text.lk/api/v3'), '/');
                $token = (string) config('services.textlk.api_token');

                $response = Http::timeout(10)->withHeaders([
                    'Authorization' => "Bearer {$token}",
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ])->post("{$apiUrl}/sms/send", [
                    'recipient' => $recipient,
                    'sender_id' => $senderId,
                    'type' => 'plain',
                    'message' => $messageText,
                ]);

                if ($response->successful() && ($response->json('status') === 'success' || $response->json('data.uid'))) {
                    $providerMessageId = $response->json('data.uid') ?? $response->json('uid') ?? 'textlk-ok';
                } else {
                    $dispatchSuccess = false;
                    $errorMessage = $response->json('message') ?? 'Text.lk returned HTTP '.$response->status();
                    Log::error("[TextLk] Registration SMS dispatch failed: {$errorMessage}");
                }
            } catch (\Throwable $e) {
                Log::error("[TextLk] Exception during registration SMS dispatch: {$e->getMessage()}");
                $dispatchSuccess = false;
                $errorMessage = 'SMS gateway connection error.';
            }
        }

        // Audit log in otp_logs
        OtpLog::create([
            'channel' => 'textlk',
            'phone_masked' => $phoneService->maskPhone((string) $pending->phone),
            'status' => $dispatchSuccess ? 'sent' : 'failed',
            'provider_message_id' => $providerMessageId,
            'error' => $errorMessage,
        ]);

        if (! $dispatchSuccess) {
            return response()->json([
                'message' => 'Unable to send SMS verification code right now. Please try again in a moment.',
            ], 500);
        }

        return response()->json([
            'success' => true,
            'phone_masked' => $phoneService->maskPhone((string) $pending->phone),
            'expires_in_seconds' => 300,
            'resend_cooldown_seconds' => 60,
            'message' => "Verification code sent to {$phoneService->maskPhone((string) $pending->phone)}.",
            'dev_code' => config('app.debug') ? $plainCode : null,
        ]);
    }

    /**
     * Verify the 6-digit phone OTP code.
     */
    public function verifyPhoneOtp(Request $request): JsonResponse
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

        if ($pending->isPhoneVerified()) {
            return response()->json([
                'success' => true,
                'verified' => true,
                'phone_token' => $pending->phone_signed_token,
                'message' => 'Mobile number is already verified.',
            ]);
        }

        if ($pending->hasExceededPhoneAttempts()) {
            return response()->json([
                'message' => 'Too many incorrect attempts. Please request a new verification code.',
                'locked' => true,
                'attempts_remaining' => 0,
            ], 422);
        }

        if ($pending->isPhoneExpired()) {
            return response()->json([
                'message' => 'Verification code has expired. Please request a new code.',
                'expired' => true,
            ], 422);
        }

        if (! Hash::check($code, (string) $pending->phone_code_hash)) {
            $pending->increment('phone_attempts');
            $remaining = max(0, 5 - $pending->phone_attempts);

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

        $phoneToken = Str::random(40);
        $pending->update([
            'phone_verified_at' => now(),
            'phone_signed_token' => $phoneToken,
        ]);

        return response()->json([
            'success' => true,
            'verified' => true,
            'phone_token' => $phoneToken,
            'message' => 'Mobile number verified successfully.',
        ]);
    }

    /**
     * Resend phone OTP code.
     */
    public function resendPhoneOtp(Request $request, TurnstileService $turnstileService, PhoneVerificationService $phoneService): JsonResponse
    {
        return $this->sendPhoneOtp($request, $turnstileService, $phoneService);
    }

    /**
     * Process clinic registration in a single database transaction.
     * Only permitted if email AND phone have been verified upfront.
     */
    public function store(ClinicRegistrationRequest $request): RedirectResponse
    {
        $validated = $request->validated();
        $token = (string) $validated['registration_token'];
        $phoneToken = (string) $validated['phone_token'];

        /** @var PendingRegistration|null $pending */
        $pending = PendingRegistration::where('token', $token)->first();

        // Server-side check: refuse unless email is verified
        if (! $pending || ! $pending->isVerified()) {
            return back()->withErrors([
                'email' => 'Your email address must be verified before the clinic can be created.',
            ])->withInput();
        }

        // Server-side check: refuse unless phone is verified within 30 minutes
        if (! $pending->isPhoneVerified() || $pending->phone_signed_token !== $phoneToken || $pending->phone_verified_at->lt(now()->subMinutes(30))) {
            return back()->withErrors([
                'mobile' => 'Your mobile phone number must be verified with an OTP code within the last 30 minutes.',
            ])->withInput();
        }

        $subdomain = Str::lower(trim($validated['subdomain']));

        // Check if registration was initiated via an invite link
        $invite = null;
        if ($inviteToken = $request->input('invite_token')) {
            $tokenHash = SubscriptionInvite::hashToken((string) $inviteToken);
            $invite = SubscriptionInvite::where('token_hash', $tokenHash)->first();

            if (! $invite || ! $invite->isValid()) {
                return back()->withErrors([
                    'email' => 'This invitation link is invalid or has expired.',
                ])->withInput();
            }

            if (Str::lower(trim($invite->recipient_email)) !== Str::lower(trim($validated['email']))) {
                return back()->withErrors([
                    'email' => "This invitation link was issued to {$invite->recipient_email}. Please register with that email address.",
                ])->withInput();
            }
        }

        // Check if registration was initiated via an invite link
        $invite = null;
        if ($inviteToken = $request->input('invite_token')) {
            $tokenHash = SubscriptionInvite::hashToken((string) $inviteToken);
            $invite = SubscriptionInvite::where('token_hash', $tokenHash)->first();

            if (! $invite || ! $invite->isValid()) {
                return back()->withErrors([
                    'email' => 'This invitation link is invalid or has expired.',
                ])->withInput();
            }

            if (Str::lower(trim($invite->recipient_email)) !== Str::lower(trim($validated['email']))) {
                return back()->withErrors([
                    'email' => "This invitation link was issued to {$invite->recipient_email}. Please register with that email address.",
                ])->withInput();
            }
        }

        /** @var Tenant $tenant */
        /** @var User $user */
        $tenant = null;
        $user = null;

        DB::transaction(function () use ($validated, $subdomain, $pending, $request, $invite, &$tenant, &$user) {
            $planSlug = $invite ? $invite->plan_slug : 'pro';
            $plan = Plan::forSlug($planSlug);
            $planId = $plan ? $plan->id : 1;

            $trialDays = (int) config('medvisit.subscription.trial_days', 0);
            $now = now();

            if ($invite) {
                // Free invite replaces trial: active immediately until free period end
                $freePeriodEnd = $invite->free_period_type === 'months'
                    ? $now->copy()->addMonths($invite->free_period_value)
                    : $now->copy()->addDays($invite->free_period_value);

                $tenantStatus = 'active';
                $tenantTrialEnd = null;
                $subStatus = Subscription::STATUS_ACTIVE;
                $subTrialEnd = null;
                $currentPeriodStart = $now;
                $currentPeriodEnd = $freePeriodEnd;
                $activatedAt = $now;
                $notes = "Registered via invite link ({$invite->free_period_value} {$invite->free_period_type} free on {$planSlug})";
            } else {
                $tenantStatus = $trialDays > 0 ? 'trial' : 'pending_payment';
                $tenantTrialEnd = $trialDays > 0 ? $now->copy()->addDays($trialDays) : null;
                $subStatus = $trialDays > 0 ? Subscription::STATUS_ACTIVE : Subscription::STATUS_PENDING_PAYMENT;
                $subTrialEnd = $tenantTrialEnd;
                $currentPeriodStart = $now;
                $currentPeriodEnd = $tenantTrialEnd;
                $activatedAt = $trialDays > 0 ? $now : null;
                $notes = $trialDays > 0 ? "Started with {$trialDays}-day free trial" : 'Initial registration pending subscription payment';
            }

            $tenant = Tenant::create([
                'id' => $subdomain,
                'name' => $validated['clinic_name'],
                'subdomain' => $subdomain,
                'phone' => $validated['clinic_phone'],
                'address' => $validated['address'].', '.$validated['city'].', '.$validated['district'],
                'plan' => $planSlug,
                'status' => $tenantStatus,
                'trial_ends_at' => $tenantTrialEnd,
                'data' => [
                    'clinic_type' => $validated['clinic_type'],
                    'district' => $validated['district'],
                    'city' => $validated['city'],
                    'currency' => 'LKR',
                    'timezone' => 'Asia/Colombo',
                    'token_reset' => 'daily',
                ],
            ]);

            // Create initial Subscription
            $subscription = Subscription::create([
                'tenant_id' => $tenant->id,
                'plan_id' => $planId,
                'status' => $subStatus,
                'current_period_start' => $currentPeriodStart,
                'current_period_end' => $currentPeriodEnd,
                'trial_ends_at' => $subTrialEnd,
                'activated_at' => $activatedAt,
                'created_by' => 'registration',
                'invite_id' => $invite?->id,
                'notes' => $notes,
            ]);

            // If registered via invite, generate Rs. 0 invoice immediately
            if ($invite) {
                $invoice = SubscriptionInvoice::create([
                    'tenant_id' => $tenant->id,
                    'subscription_id' => $subscription->id,
                    'invoice_number' => SubscriptionInvoice::generateInvoiceNumber(),
                    'amount_cents' => 0,
                    'original_amount_cents' => $plan ? $plan->price_cents : 900000,
                    'discount_cents' => $plan ? $plan->price_cents : 900000,
                    'status' => SubscriptionInvoice::STATUS_PAID,
                    'paid_at' => $now,
                    'payment_method' => 'invite',
                    'receipt_number' => null, // No receipt number for Rs. 0
                    'invite_id' => $invite->id,
                    'period_start' => $currentPeriodStart,
                    'period_end' => $currentPeriodEnd,
                    'due_date' => $now,
                    'notes' => "Covered by invite: {$invite->free_period_value} {$invite->free_period_type} free",
                ]);

                $invite->update([
                    'status' => SubscriptionInvite::STATUS_REGISTERED,
                    'registered_at' => $now,
                    'registered_tenant_id' => $tenant->id,
                ]);
            }

            // If registered via invite, generate Rs. 0 invoice immediately
            if ($invite) {
                $invoice = SubscriptionInvoice::create([
                    'tenant_id' => $tenant->id,
                    'subscription_id' => $subscription->id,
                    'invoice_number' => SubscriptionInvoice::generateInvoiceNumber(),
                    'amount_cents' => 0,
                    'original_amount_cents' => $plan ? $plan->price_cents : 900000,
                    'discount_cents' => $plan ? $plan->price_cents : 900000,
                    'status' => SubscriptionInvoice::STATUS_PAID,
                    'paid_at' => $now,
                    'payment_method' => 'invite',
                    'receipt_number' => null, // No receipt number for Rs. 0
                    'invite_id' => $invite->id,
                    'period_start' => $currentPeriodStart,
                    'period_end' => $currentPeriodEnd,
                    'due_date' => $now,
                    'notes' => "Covered by invite: {$invite->free_period_value} {$invite->free_period_type} free",
                ]);

                $invite->update([
                    'status' => SubscriptionInvite::STATUS_REGISTERED,
                    'registered_at' => $now,
                    'registered_tenant_id' => $tenant->id,
                ]);
            }

            $centralDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
            $tenant->domains()->create(['domain' => $subdomain]);
            $tenant->domains()->create(['domain' => "{$subdomain}.{$centralDomain}"]);

            $user = User::create([
                'tenant_id' => $tenant->id,
                'name' => $validated['name'],
                'email' => $validated['email'],
                'phone' => $pending->phone,
                'password' => Hash::make($validated['password']),
                'email_verified_at' => $pending->verified_at ?? now(),
                'phone_verified_at' => $pending->phone_verified_at ?? now(),
            ]);

            $role = Role::firstOrCreate(['name' => 'clinic_admin', 'guard_name' => 'web']);
            $user->assignRole($role);

            if ($invite && isset($invoice)) {
                $invite->update(['registered_user_id' => $user->id]);
                Mail::to($user->email)->queue(new ZeroAmountInvoiceMail(
                    $invoice,
                    $tenant->name,
                    "special invitation ({$invite->free_period_value} {$invite->free_period_type} free)",
                    url('/settings/billing')
                ));
            }

            if ($invite && isset($invoice)) {
                $invite->update(['registered_user_id' => $user->id]);
                Mail::to($user->email)->queue(new ZeroAmountInvoiceMail(
                    $invoice,
                    $tenant->name,
                    "special invitation ({$invite->free_period_value} {$invite->free_period_type} free)",
                    url('/settings/billing')
                ));
            }

            // Store mandatory agreement acceptance record
            AgreementAcceptance::create([
                'user_id' => $user->id,
                'tenant_id' => $tenant->id,
                'terms_version' => (string) config('legal.versions.terms', '2026-10-28'),
                'privacy_version' => (string) config('legal.versions.privacy', '2026-10-27'),
                'refund_version' => (string) config('legal.versions.refund', '2026-10-28'),
                'dispute_version' => (string) config('legal.versions.dispute', '2026-10-21'),
                'accepted_at' => now(),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

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
