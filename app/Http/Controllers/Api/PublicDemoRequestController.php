<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\LeadDemoRequestNotificationMail;
use App\Models\Lead;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class PublicDemoRequestController extends Controller
{
    /**
     * Handle public demo request from marketing landing page (medvisit.lk).
     */
    public function store(Request $request): JsonResponse
    {
        // 1. Honeypot check (field must be empty; bots fill it out)
        if ($request->filled('website_check') || $request->filled('hp_fax')) {
            // Silently return 200 so spambots believe submission succeeded
            return response()->json([
                'success' => true,
                'message' => 'Thank you! We will reach out within 24 hours to schedule your demo.',
            ]);
        }

        // 2. Validate input fields
        $validated = $request->validate([
            'clinic_name' => ['required', 'string', 'max:150'],
            'contact_name' => ['required', 'string', 'max:100'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
            'city' => ['nullable', 'string', 'max:100'],
            'notes' => ['nullable', 'string', 'max:1000'],
            'cf_turnstile_response' => ['nullable', 'string'],
        ]);

        // 3. Normalize & validate Sri Lankan phone number
        $rawPhone = trim($validated['phone']);
        $normalizedPhone = $this->normalizeSriLankanPhone($rawPhone);

        if (! $normalizedPhone) {
            throw ValidationException::withMessages([
                'phone' => ['Please enter a valid Sri Lankan phone number (e.g., 077 123 4567 or +94 77 123 4567).'],
            ]);
        }

        // 4. Optional Cloudflare Turnstile verification
        if (config('services.turnstile.enabled', false)) {
            $turnstileToken = $request->input('cf_turnstile_response') ?: $request->input('cf-turnstile-response');
            if (! $this->verifyTurnstile($turnstileToken, $request->ip())) {
                return response()->json([
                    'success' => false,
                    'message' => 'Security check failed (Cloudflare Turnstile). Please try again.',
                ], 422);
            }
        }

        // 5. Create the lead
        $lead = Lead::create([
            'clinic_name' => $validated['clinic_name'],
            'contact_name' => $validated['contact_name'],
            'phone' => $normalizedPhone,
            'email' => $validated['email'] ?? null,
            'city' => $validated['city'] ?? null,
            'source' => 'website_form',
            'stage' => Lead::STAGE_NEW,
            'notes' => $validated['notes'] ?? null,
            'next_follow_up_at' => now()->addDay(),
            'metadata' => [
                'ip' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'origin' => $request->header('Origin'),
                'referer' => $request->header('Referer'),
            ],
        ]);

        // 6. Log audit event
        AuditLogger::log('lead.demo_requested', [
            'resource' => $lead,
            'metadata' => [
                'clinic_name' => $lead->clinic_name,
                'phone' => $lead->phone,
                'source' => 'website_form',
            ],
        ]);

        // 7. Send notification email to super admins
        try {
            $superAdmins = User::role('super_admin')->pluck('email')->filter()->all();
            $notificationRecipients = ! empty($superAdmins)
                ? $superAdmins
                : [config('mail.from.address', 'support@medvisit.lk')];

            foreach ($notificationRecipients as $recipient) {
                Mail::to($recipient)->queue(new LeadDemoRequestNotificationMail($lead));
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'success' => true,
            'message' => 'Thank you! We will reach out within 24 hours to schedule your demo.',
            'lead_id' => $lead->id,
        ], 201);
    }

    /**
     * Normalize and validate Sri Lankan phone numbers.
     */
    protected function normalizeSriLankanPhone(string $phone): ?string
    {
        // Strip spaces, dashes, parentheses
        $cleaned = preg_replace('/[\s\-\(\)]+/', '', $phone);

        if (! $cleaned) {
            return null;
        }

        // Match +947XXXXXXXX or 00947XXXXXXXX
        if (preg_match('/^(\+94|0094)([1-9][0-9]{8})$/', $cleaned, $matches)) {
            return '+94'.$matches[2];
        }

        // Match local 07XXXXXXXX or 01XXXXXXXX
        if (preg_match('/^0([1-9][0-9]{8})$/', $cleaned, $matches)) {
            return '+94'.$matches[1];
        }

        // Match 9 digits without leading 0 or +94 (e.g. 771234567)
        if (preg_match('/^([1-9][0-9]{8})$/', $cleaned)) {
            return '+94'.$cleaned;
        }

        return null;
    }

    /**
     * Verify Cloudflare Turnstile token.
     */
    protected function verifyTurnstile(?string $token, ?string $ip): bool
    {
        if (! $token) {
            return false;
        }

        $secretKey = config('services.turnstile.secret_key');
        if (! $secretKey) {
            return true; // Skip if misconfigured
        }

        try {
            $response = Http::asForm()->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                'secret' => $secretKey,
                'response' => $token,
                'remoteip' => $ip,
            ]);

            return (bool) $response->json('success', false);
        } catch (\Throwable $e) {
            report($e);

            return false;
        }
    }
}
