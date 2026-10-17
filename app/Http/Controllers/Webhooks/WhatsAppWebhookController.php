<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\OtpLog;
use App\Models\PhoneVerification;
use App\Models\Tenant;
use App\Models\WhatsAppWebhookEvent;
use App\Services\PhoneVerification\PhoneVerificationService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppWebhookController extends Controller
{
    /**
     * Meta Webhook Subscription Handshake (GET /webhooks/whatsapp).
     */
    public function verify(Request $request): Response
    {
        $mode = $request->query('hub_mode', $request->query('hub.mode'));
        $token = $request->query('hub_verify_token', $request->query('hub.verify_token'));
        $challenge = $request->query('hub_challenge', $request->query('hub.challenge'));

        $expectedToken = config('services.whatsapp.verify_token');

        if ($mode === 'subscribe' && ! empty($expectedToken) && $token === $expectedToken) {
            Log::info('[WhatsApp Webhook] Handshake verified successfully.');

            return response((string) $challenge, 200, [
                'Content-Type' => 'text/plain',
            ]);
        }

        Log::warning('[WhatsApp Webhook] Handshake verification rejected: token or mode mismatch.', [
            'mode' => $mode,
            'received_token' => $token,
        ]);

        return response('Forbidden', 403);
    }

    /**
     * Handle incoming WhatsApp messages (POST /webhooks/whatsapp).
     */
    public function handle(Request $request, PhoneVerificationService $service): JsonResponse
    {
        $appSecret = config('services.whatsapp.app_secret');

        // Validate X-Hub-Signature-256 header if secret is configured
        if (! empty($appSecret)) {
            $signatureHeader = $request->header('X-Hub-Signature-256');

            if (empty($signatureHeader)) {
                Log::warning('[WhatsApp Webhook] Missing X-Hub-Signature-256 header.');

                return response()->json(['error' => 'Missing signature'], 401);
            }

            $rawBody = $request->getContent();
            $expectedSignature = 'sha256='.hash_hmac('sha256', $rawBody, $appSecret);

            if (! hash_equals($expectedSignature, $signatureHeader)) {
                Log::warning('[WhatsApp Webhook] Invalid X-Hub-Signature-256 signature.');

                return response()->json(['error' => 'Invalid signature'], 401);
            }
        }

        $payload = $request->json()->all();

        // Process incoming entries
        $entries = $payload['entry'] ?? [];
        foreach ($entries as $entry) {
            $changes = $entry['changes'] ?? [];
            foreach ($changes as $change) {
                $value = $change['value'] ?? [];
                $messages = $value['messages'] ?? [];

                foreach ($messages as $message) {
                    $this->processMessage($message, $service);
                }
            }
        }

        return response()->json(['status' => 'success'], 200);
    }

    /**
     * Process an individual incoming WhatsApp message.
     */
    protected function processMessage(array $message, PhoneVerificationService $service): void
    {
        // 1. Filter: handle only text messages
        if (($message['type'] ?? '') !== 'text') {
            return;
        }

        $messageId = $message['id'] ?? null;
        if (empty($messageId)) {
            return;
        }

        // 2. Idempotency: skip already processed messages
        if (WhatsAppWebhookEvent::where('message_id', $messageId)->exists()) {
            Log::info("[WhatsApp Webhook] Duplicate message {$messageId} ignored.");

            return;
        }

        $senderRaw = $message['from'] ?? '';
        $senderPhone = $service->normalizePhone((string) $senderRaw);
        $body = trim((string) ($message['text']['body'] ?? ''));

        // 3. Parse regex /^VERIFY\s+(\d{6})$/i (tolerate extra spaces)
        if (preg_match('/^VERIFY\s+(\d{6})$/i', $body, $matches)) {
            $plainCode = $matches[1];
            $codeHash = hash('sha256', $plainCode);

            // 4. Find open pending verification attempt matching code_hash
            $verification = PhoneVerification::where('code_hash', $codeHash)
                ->where('status', PhoneVerification::STATUS_PENDING)
                ->where('expires_at', '>', Carbon::now())
                ->latest()
                ->first();

            if ($verification) {
                $tenant = $verification->tenant_id
                    ? Tenant::find($verification->tenant_id)
                    : null;

                // 5. Match sender number with attempt's entered phone
                if ($senderPhone === $verification->phone) {
                    $verification->update([
                        'status' => PhoneVerification::STATUS_VERIFIED,
                        'verified_at' => Carbon::now(),
                        'mismatch_phone' => null,
                    ]);

                    $service->markVerified($verification->phone, 'whatsapp', $tenant);

                    OtpLog::create([
                        'tenant_id' => $verification->tenant_id,
                        'channel' => 'whatsapp',
                        'phone_masked' => $service->maskPhone($verification->phone),
                        'status' => 'verified',
                        'provider_message_id' => $messageId,
                    ]);

                    Log::info("[WhatsApp Webhook] Phone {$verification->phone} verified successfully via WhatsApp.");

                    // 6. Optional chat confirmation
                    if (config('services.whatsapp.send_confirmation')) {
                        $clinicName = $tenant ? $tenant->name : 'MedVisit';
                        $this->sendReplyConfirmation($senderRaw, $clinicName);
                    }
                } else {
                    // Sender mismatch: record mismatch and reject verification
                    $verification->update([
                        'mismatch_phone' => $senderPhone,
                    ]);

                    OtpLog::create([
                        'tenant_id' => $verification->tenant_id,
                        'channel' => 'whatsapp',
                        'phone_masked' => $service->maskPhone($verification->phone),
                        'status' => 'failed',
                        'provider_message_id' => $messageId,
                        'error' => "Sender mismatch: received from {$senderPhone}, expected {$verification->phone}",
                    ]);

                    Log::warning("[WhatsApp Webhook] Mismatch: Code for {$verification->phone} received from {$senderPhone}.");
                }
            }
        }

        // Record message as processed
        WhatsAppWebhookEvent::create([
            'message_id' => $messageId,
            'sender_wa_id' => $senderRaw,
            'payload' => $message,
        ]);
    }

    /**
     * Send optional confirmation message back to patient via WhatsApp Cloud API.
     */
    protected function sendReplyConfirmation(string $toWaId, string $clinicName): void
    {
        $token = config('services.whatsapp.access_token');
        $phoneNumberId = config('services.whatsapp.phone_number_id');
        $apiVersion = config('services.whatsapp.api_version', 'v25.0');

        if (empty($token) || empty($phoneNumberId)) {
            return;
        }

        $url = "https://graph.facebook.com/{$apiVersion}/{$phoneNumberId}/messages";

        try {
            Http::withToken($token)
                ->timeout(5)
                ->post($url, [
                    'messaging_product' => 'whatsapp',
                    'recipient_type' => 'individual',
                    'to' => $toWaId,
                    'type' => 'text',
                    'text' => [
                        'body' => "✅ Number verified for {$clinicName}. Return to the booking page.",
                    ],
                ]);
        } catch (\Throwable $e) {
            Log::warning("[WhatsApp Webhook] Failed to send reply confirmation: {$e->getMessage()}");
        }
    }
}
