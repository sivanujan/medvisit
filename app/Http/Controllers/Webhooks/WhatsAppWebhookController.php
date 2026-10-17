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
        $getParameter = static function (string $paramName) use ($request): ?string {
            $underscoreName = str_replace('.', '_', $paramName);

            // 1. Direct query bag access via Symfony InputBag (avoids data_get interpreting dot as nested array)
            if ($request->query->has($paramName)) {
                return (string) $request->query->get($paramName);
            }
            if ($request->query->has($underscoreName)) {
                return (string) $request->query->get($underscoreName);
            }

            // 2. Request input / attributes fallback
            if ($request->has($paramName)) {
                return (string) $request->get($paramName);
            }
            if ($request->has($underscoreName)) {
                return (string) $request->get($underscoreName);
            }

            // 3. Raw QUERY_STRING manual parse fallback
            $rawQuery = (string) $request->server('QUERY_STRING', '');
            if ($rawQuery !== '') {
                foreach (explode('&', $rawQuery) as $pair) {
                    $parts = explode('=', $pair, 2);
                    $key = urldecode($parts[0]);
                    $val = isset($parts[1]) ? urldecode($parts[1]) : '';
                    if ($key === $paramName || $key === $underscoreName) {
                        return $val;
                    }
                }
            }

            return null;
        };

        $mode = $getParameter('hub.mode');
        $token = $getParameter('hub.verify_token');
        $challenge = $getParameter('hub.challenge');

        $expectedToken = (string) (config('services.whatsapp.verify_token') ?: env('WHATSAPP_VERIFY_TOKEN'));

        if ($mode === 'subscribe' && $expectedToken !== '' && $token !== null && hash_equals(trim($expectedToken), trim($token))) {
            Log::info('[WhatsApp Webhook] Handshake verified successfully.');

            return response((string) $challenge, 200, [
                'Content-Type' => 'text/plain',
            ]);
        }

        Log::warning('[WhatsApp Webhook] Handshake verification failed.');

        return response('Forbidden', 403, [
            'Content-Type' => 'text/plain',
        ]);
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
                $this->logDelivery('messages', 'unknown', 'none', 'invalid_signature');

                return response()->json(['error' => 'Missing signature'], 401);
            }

            $rawBody = $request->getContent();
            $expectedSignature = 'sha256='.hash_hmac('sha256', $rawBody, $appSecret);

            if (! hash_equals($expectedSignature, $signatureHeader)) {
                $this->logDelivery('messages', 'unknown', 'none', 'invalid_signature');

                return response()->json(['error' => 'Invalid signature'], 401);
            }
        }

        $payload = $request->json()->all();

        // Process incoming entries
        $entries = $payload['entry'] ?? [];
        $processedCount = 0;

        foreach ($entries as $entry) {
            $changes = $entry['changes'] ?? [];
            foreach ($changes as $change) {
                $field = (string) ($change['field'] ?? 'messages');
                $value = $change['value'] ?? [];
                $messages = $value['messages'] ?? [];

                if (is_array($messages) && ! empty($messages)) {
                    foreach ($messages as $message) {
                        $this->processMessage($field, $message, $service);
                        $processedCount++;
                    }
                }
            }
        }

        if ($processedCount === 0) {
            $firstField = (string) ($payload['entry'][0]['changes'][0]['field'] ?? 'messages');
            $this->logDelivery($firstField, 'none', 'none', 'ignored_not_verify');
        }

        return response()->json(['status' => 'success'], 200);
    }

    /**
     * Process an individual incoming WhatsApp message.
     */
    protected function processMessage(string $field, array $message, PhoneVerificationService $service): void
    {
        $type = (string) ($message['type'] ?? 'unknown');
        $senderRaw = (string) ($message['from'] ?? '');
        $senderPhone = $senderRaw !== '' ? $service->normalizePhone($senderRaw) : '';
        $maskedSender = $senderPhone !== '' ? $this->maskSender($senderPhone) : 'none';

        // 1. Filter: handle only text messages
        if ($type !== 'text') {
            $this->logDelivery($field, $type, $maskedSender, 'ignored_not_verify');

            return;
        }

        $messageId = (string) ($message['id'] ?? '');
        if ($messageId === '') {
            $this->logDelivery($field, $type, $maskedSender, 'ignored_not_verify');

            return;
        }

        // 2. Idempotency: skip already processed messages
        if (WhatsAppWebhookEvent::where('message_id', $messageId)->exists()) {
            $this->logDelivery($field, $type, $maskedSender, 'duplicate');

            return;
        }

        $body = trim((string) ($message['text']['body'] ?? ''));

        // 3. Parse regex /^VERIFY\s+(\d{6})$/i (tolerate extra spaces)
        if (! preg_match('/^VERIFY\s+(\d{6})$/i', $body, $matches)) {
            WhatsAppWebhookEvent::create([
                'message_id' => $messageId,
                'sender_wa_id' => $senderRaw,
                'payload' => $message,
            ]);

            $this->logDelivery($field, $type, $maskedSender, 'ignored_not_verify');

            return;
        }

        $plainCode = $matches[1];
        $codeHash = hash('sha256', $plainCode);

        // 4. Find verification attempt matching code_hash
        $verification = PhoneVerification::where('code_hash', $codeHash)
            ->latest()
            ->first();

        if (! $verification) {
            WhatsAppWebhookEvent::create([
                'message_id' => $messageId,
                'sender_wa_id' => $senderRaw,
                'payload' => $message,
            ]);

            $this->logDelivery($field, $type, $maskedSender, 'ignored_not_verify');

            return;
        }

        // 5. Check if expired
        if ($verification->expires_at <= Carbon::now() || $verification->status === PhoneVerification::STATUS_EXPIRED) {
            WhatsAppWebhookEvent::create([
                'message_id' => $messageId,
                'sender_wa_id' => $senderRaw,
                'payload' => $message,
            ]);

            $this->logDelivery($field, $type, $maskedSender, 'expired');

            return;
        }

        if ($verification->status !== PhoneVerification::STATUS_PENDING) {
            WhatsAppWebhookEvent::create([
                'message_id' => $messageId,
                'sender_wa_id' => $senderRaw,
                'payload' => $message,
            ]);

            $this->logDelivery($field, $type, $maskedSender, 'ignored_not_verify');

            return;
        }

        $tenant = $verification->tenant_id
            ? Tenant::find($verification->tenant_id)
            : null;

        // 6. Match sender number with attempt's entered phone
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
                'phone_masked' => $this->maskSender($verification->phone),
                'status' => 'verified',
                'provider_message_id' => $messageId,
            ]);

            if (config('services.whatsapp.send_confirmation')) {
                $clinicName = $tenant ? $tenant->name : 'MedVisit';
                $this->sendReplyConfirmation($senderRaw, $clinicName);
            }

            WhatsAppWebhookEvent::create([
                'message_id' => $messageId,
                'sender_wa_id' => $senderRaw,
                'payload' => $message,
            ]);

            $this->logDelivery($field, $type, $maskedSender, 'verified');

            return;
        }

        // Sender mismatch: record mismatch and reject verification
        $verification->update([
            'mismatch_phone' => $senderPhone,
        ]);

        OtpLog::create([
            'tenant_id' => $verification->tenant_id,
            'channel' => 'whatsapp',
            'phone_masked' => $this->maskSender($verification->phone),
            'status' => 'failed',
            'provider_message_id' => $messageId,
            'error' => "Sender mismatch: received from {$maskedSender}",
        ]);

        WhatsAppWebhookEvent::create([
            'message_id' => $messageId,
            'sender_wa_id' => $senderRaw,
            'payload' => $message,
        ]);

        $this->logDelivery($field, $type, $maskedSender, 'mismatch');
    }

    /**
     * Log delivery trace line for every incoming delivery event.
     */
    protected function logDelivery(string $field, string $type, string $maskedSender, string $result): void
    {
        Log::info("[WhatsApp Webhook] Delivery: field={$field}, type={$type}, sender={$maskedSender}, result={$result}");
    }

    /**
     * Mask phone number for logging trace (e.g. +9477****567).
     */
    protected function maskSender(string $phone): string
    {
        $clean = trim($phone);
        if ($clean === '') {
            return 'none';
        }

        $hasPlus = str_starts_with($clean, '+');
        $digits = (string) preg_replace('/[^\d]/', '', $clean);

        if (strlen($digits) < 6) {
            return ($hasPlus ? '+' : '').$digits;
        }

        $prefixLen = $hasPlus ? 5 : 4;
        $prefix = substr($clean, 0, $prefixLen);
        $suffix = substr($clean, -3);

        return "{$prefix}****{$suffix}";
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
            Log::warning('[WhatsApp Webhook] Failed to send reply confirmation.');
        }
    }
}
