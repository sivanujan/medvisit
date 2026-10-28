<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\DoctorSession;
use App\Models\Lead;
use App\Services\AuditLogger;
use App\Services\Demo\DemoModeService;
use App\Services\TelegramNotificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class PublicDemoController extends Controller
{
    public function __construct(
        protected DemoModeService $demoService
    ) {}

    /**
     * Display the Central Public Demo Hub (/demo).
     */
    public function index(Request $request): Response
    {
        $tenantId = config('demo.tenant_id', 'demo');
        $subdomain = config('demo.subdomain', 'demo');
        $baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

        $scheme = (app()->environment('production') || config('demo.force_https', false)) ? 'https' : 'http';
        $port = $request->getPort();
        $portSuffix = ($port && ! in_array($port, [80, 443], true)) ? ":{$port}" : '';

        $demoRootUrl = "{$scheme}://{$subdomain}.{$baseDomain}{$portSuffix}";

        // Retrieve remembered lead from 30-day cookie if present
        $rememberedLead = null;
        $cookiePayload = $request->cookie('medvisit_demo_lead');
        if ($cookiePayload) {
            $decoded = json_decode($cookiePayload, true);
            if (is_array($decoded) && ! empty($decoded['lead_id'])) {
                $lead = Lead::find($decoded['lead_id']);
                if ($lead) {
                    $rememberedLead = [
                        'id' => $lead->id,
                        'contact_name' => $lead->contact_name,
                        'clinic_name' => $lead->clinic_name,
                        'phone' => $lead->phone,
                        'email' => $lead->email,
                        'city' => $lead->city,
                        'roles_tried' => $lead->roles_tried ?? [],
                    ];
                }
            }
        }

        // Live sessions currently active in the demo clinic
        $colomboNow = Carbon::now('Asia/Colombo');
        $today = $colomboNow->toDateString();

        $activeSessions = DoctorSession::where('tenant_id', $tenantId)
            ->where('session_date', $today)
            ->with('doctor:id,name,title,specialty,token_code')
            ->get()
            ->map(fn (DoctorSession $s) => [
                'id' => $s->id,
                'doctor_name' => $s->doctor?->name ?? 'Consultant',
                'specialty' => $s->doctor?->specialty ?? 'General Outpatient',
                'token_code' => $s->doctor_token_code,
                'status' => $s->status,
                'room' => $s->room_number,
                'start_time' => substr((string) $s->start_time, 0, 5),
                'end_time' => substr((string) $s->end_time, 0, 5),
                'current_token' => $s->current_token_number,
                'max_tokens' => $s->max_tokens,
            ]);

        $roleParam = (string) $request->query('role');
        $validRoles = ['clinic_admin', 'receptionist', 'doctor', 'pharmacist'];
        $preselectedRole = in_array($roleParam, $validRoles, true) ? $roleParam : null;

        return Inertia::render('Public/Demo', [
            'rememberedLead' => $rememberedLead,
            'roles' => $this->demoService->getDemoRoles(),
            'activeSessions' => $activeSessions,
            'demoUrls' => [
                'root' => $demoRootUrl,
                'tv' => "{$demoRootUrl}/queue/tv",
                'booking' => "{$demoRootUrl}/book",
            ],
            'turnstileSiteKey' => config('services.turnstile.site_key'),
            'preselectedRole' => $preselectedRole,
        ]);
    }

    /**
     * Submit lead capture and receive signed instant access URL to the demo clinic.
     */
    public function launch(Request $request): JsonResponse
    {
        // 1. Honeypot check
        if ($request->filled('website_check') || $request->filled('hp_fax')) {
            return response()->json([
                'success' => true,
                'redirect_url' => $this->demoService->generateSignedLoginUrl('clinic_admin'),
            ]);
        }

        // 2. Validate inputs
        $validated = $request->validate([
            'role' => ['required', 'string', 'in:clinic_admin,receptionist,doctor,pharmacist'],
            'contact_name' => ['required', 'string', 'max:100'],
            'clinic_name' => ['required', 'string', 'max:150'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
            'city' => ['nullable', 'string', 'max:100'],
            'consent' => ['sometimes', 'boolean'],
            'cf_turnstile_response' => ['nullable', 'string'],
        ]);

        // 3. Normalize Sri Lankan mobile number
        $normalizedPhone = $this->normalizeSriLankanPhone($validated['phone']);
        if (! $normalizedPhone) {
            throw ValidationException::withMessages([
                'phone' => ['Please enter a valid Sri Lankan mobile number (e.g. 077 123 4567 or +94 77 123 4567).'],
            ]);
        }

        // 4. Cloudflare Turnstile Verification if configured
        if (config('services.turnstile.enabled', false)) {
            $turnstileToken = $request->input('cf_turnstile_response') ?: $request->input('cf-turnstile-response');
            if (! $this->verifyTurnstile($turnstileToken, $request->ip())) {
                return response()->json([
                    'success' => false,
                    'message' => 'Security check failed (Cloudflare Turnstile). Please try again.',
                ], 422);
            }
        }

        $role = $validated['role'];
        $now = now();
        $ipHash = hash('sha256', (string) $request->ip());

        // 5. Reuse or create Lead
        $lead = Lead::where('phone', $normalizedPhone)->first();

        if ($lead) {
            $existingRoles = is_array($lead->roles_tried) ? $lead->roles_tried : [];
            if (! in_array($role, $existingRoles, true)) {
                $existingRoles[] = $role;
            }

            $lead->update([
                'contact_name' => $validated['contact_name'],
                'clinic_name' => $validated['clinic_name'],
                'email' => $validated['email'] ?? $lead->email,
                'city' => $validated['city'] ?? $lead->city,
                'role' => $role,
                'roles_tried' => $existingRoles,
                'last_seen_at' => $now,
                'sessions_count' => ($lead->sessions_count ?? 0) + 1,
            ]);
        } else {
            $lead = Lead::create([
                'contact_name' => $validated['contact_name'],
                'clinic_name' => $validated['clinic_name'],
                'phone' => $normalizedPhone,
                'email' => $validated['email'] ?? null,
                'city' => $validated['city'] ?? null,
                'source' => 'public_demo_sandbox',
                'stage' => Lead::STAGE_NEW,
                'role' => $role,
                'roles_tried' => [$role],
                'consented_at' => $now,
                'ip_hash' => $ipHash,
                'user_agent' => substr((string) $request->userAgent(), 0, 500),
                'first_seen_at' => $now,
                'last_seen_at' => $now,
                'sessions_count' => 1,
                'utm' => $request->only(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']),
            ]);

            AuditLogger::log('lead.demo_sandbox_started', [
                'resource' => $lead,
                'metadata' => [
                    'role' => $role,
                    'clinic' => $lead->clinic_name,
                    'phone' => $lead->phone,
                ],
            ]);
        }

        // Notify team via Telegram (debounced once per lead per 24 hours)
        try {
            app(TelegramNotificationService::class)->sendDemoLeadAlert($lead);
        } catch (\Throwable $e) {
            report($e);
        }

        // 6. Generate signed single-use URL to enter the demo clinic
        $signedUrl = $this->demoService->generateSignedLoginUrl($role);

        // 7. Store 30-day cookie for seamless return
        $cookieData = json_encode([
            'lead_id' => $lead->id,
            'contact_name' => $lead->contact_name,
            'clinic_name' => $lead->clinic_name,
            'phone' => $lead->phone,
        ]);

        $cookie = cookie(
            'medvisit_demo_lead',
            $cookieData,
            60 * 24 * 30, // 30 days
            '/',
            null,
            false,
            false // allow JS reading for frontend pre-fills
        );

        $cookieLeadId = cookie(
            'medvisit_demo_lead_id',
            (string) $lead->id,
            60 * 24 * 30,
            '/',
            null,
            false,
            false
        );

        return response()->json([
            'success' => true,
            'redirect_url' => $signedUrl,
            'lead_id' => $lead->id,
        ])->withCookie($cookie)->withCookie($cookieLeadId);
    }

    /**
     * Normalize Sri Lankan phone numbers (+947XXXXXXXX).
     */
    protected function normalizeSriLankanPhone(string $raw): ?string
    {
        $digits = preg_replace('/\D/', '', $raw);

        if (str_starts_with($digits, '94') && strlen($digits) === 11) {
            $digits = substr($digits, 2);
        } elseif (str_starts_with($digits, '0') && strlen($digits) === 10) {
            $digits = substr($digits, 1);
        }

        if (strlen($digits) === 9 && in_array($digits[0], ['7', '1', '2', '3', '4', '5', '6', '8', '9'], true)) {
            return '+94'.$digits;
        }

        return null;
    }

    /**
     * Validate Cloudflare Turnstile token.
     */
    protected function verifyTurnstile(?string $token, ?string $ip): bool
    {
        if (empty($token)) {
            return false;
        }

        $secret = config('services.turnstile.secret_key');
        if (empty($secret)) {
            return true;
        }

        try {
            $response = Http::asForm()->timeout(5)->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                'secret' => $secret,
                'response' => $token,
                'remoteip' => $ip,
            ]);

            return (bool) $response->json('success', false);
        } catch (\Throwable $e) {
            Log::warning('Turnstile verification failed to connect: '.$e->getMessage());

            return true;
        }
    }
}
