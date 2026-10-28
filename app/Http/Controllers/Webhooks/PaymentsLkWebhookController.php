<?php

declare(strict_types=1);

namespace App\Http\Controllers\Webhooks;

use App\Contracts\PaymentGateway;
use App\Http\Controllers\Controller;
use App\Models\WebhookEvent;
use App\Services\Payments\SubscriptionPaymentService;
use App\Services\Templates\TemplateService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class PaymentsLkWebhookController extends Controller
{
    public function handle(
        Request $request,
        PaymentGateway $gateway,
        SubscriptionPaymentService $paymentService
    ): JsonResponse {
        $rawPayload = $request->getContent();
        $signatureHeader = (string) $request->header('Payments-Signature', '');

        // 1. Verify signature with 300-second tolerance and key rotation support
        if (! $gateway->verifyWebhookSignature($rawPayload, $signatureHeader, 300)) {
            Log::warning('Payments.lk webhook signature verification failed', [
                'signature' => $signatureHeader,
            ]);

            return response()->json(['error' => 'Invalid signature'], 400);
        }

        $payload = json_decode($rawPayload, true);
        if (! is_array($payload)) {
            return response()->json(['error' => 'Invalid JSON payload'], 400);
        }

        $eventId = (string) ($payload['id'] ?? ('evt_fallback_'.md5($rawPayload)));
        $eventType = (string) ($payload['type'] ?? $payload['event'] ?? 'unknown');

        // 2. Deduplication check
        $existingEvent = WebhookEvent::where('gateway', 'paymentslk')
            ->where('event_id', $eventId)
            ->first();

        if ($existingEvent) {
            return response()->json(['status' => 'already_processed'], 200);
        }

        $webhookEvent = WebhookEvent::create([
            'gateway' => 'paymentslk',
            'event_id' => $eventId,
            'type' => $eventType,
            'payload' => $payload,
        ]);

        // 3. Dispatch according to event type
        switch ($eventType) {
            case 'payment.succeeded':
                $data = $payload['data'] ?? [];
                $payment = $data['payment'] ?? $data;
                $ref = (string) ($payment['reference'] ?? '');

                if (str_starts_with($ref, 'TPL-')) {
                    app(TemplateService::class)->processSuccessfulPurchase([
                        'reference' => $ref,
                        'amount_cents' => isset($payment['amountCents']) ? (int) $payment['amountCents'] : (isset($payment['amount_cents']) ? (int) $payment['amount_cents'] : 0),
                        'currency' => (string) ($payment['currency'] ?? 'LKR'),
                        'status' => (string) ($payment['status'] ?? ''),
                        'checkout_id' => $payment['checkoutId'] ?? $payment['checkout_id'] ?? null,
                        'payment_id' => $payment['id'] ?? null,
                        'method' => $payment['method'] ?? 'paymentslk',
                    ], $payload);
                    break;
                }

                $paymentService->processSuccessfulPayment([
                    'reference' => $ref,
                    'amount_cents' => isset($payment['amountCents']) ? (int) $payment['amountCents'] : (isset($payment['amount_cents']) ? (int) $payment['amount_cents'] : 0),
                    'currency' => (string) ($payment['currency'] ?? 'LKR'),
                    'status' => (string) ($payment['status'] ?? ''),
                    'checkout_id' => $payment['checkoutId'] ?? $payment['checkout_id'] ?? null,
                    'payment_id' => $payment['id'] ?? null,
                    'method' => $payment['method'] ?? 'paymentslk',
                ], $payload);
                break;

            case 'payment.failed':
                $data = $payload['data'] ?? [];
                $payment = $data['payment'] ?? $data;

                $paymentService->processFailedPayment([
                    'reference' => (string) ($payment['reference'] ?? ''),
                    'amount_cents' => isset($payment['amountCents']) ? (int) $payment['amountCents'] : (isset($payment['amount_cents']) ? (int) $payment['amount_cents'] : null),
                    'checkout_id' => $payment['checkoutId'] ?? $payment['checkout_id'] ?? null,
                    'payment_id' => $payment['id'] ?? null,
                ], $payload);
                break;

            default:
                Log::info("Payments.lk unhandled webhook event type [{$eventType}] ignored");
                break;
        }

        $webhookEvent->update(['processed_at' => Carbon::now()]);

        return response()->json(['status' => 'success'], 200);
    }
}
