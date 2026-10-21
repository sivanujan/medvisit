<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Contracts\PaymentGateway;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class PaymentsLkGateway implements PaymentGateway
{
    protected string $secretKey;

    protected string $baseUrl;

    protected string $webhookSecret;

    protected ?string $returnBaseUrl;

    public function __construct(array $config = [])
    {
        $this->secretKey = $config['secret_key'] ?? (string) config('services.paymentslk.secret_key');
        $this->baseUrl = rtrim($config['base_url'] ?? (string) config('services.paymentslk.base_url', 'https://api.payments.lk'), '/');
        $this->webhookSecret = $config['webhook_secret'] ?? (string) config('services.paymentslk.webhook_secret');
        $this->returnBaseUrl = $config['return_base_url'] ?? config('services.paymentslk.return_base_url');
    }

    public function createCheckout(array $params): array
    {
        $idempotencyKey = $params['idempotencyKey'] ?? ('inv-chk-'.($params['reference'] ?? uniqid()).'-'.time());

        // Rewrite return URLs if return_base_url is explicitly configured (e.g. for local cloudflare tunnels)
        $successUrl = $this->formatUrl((string) $params['successUrl']);
        $cancelUrl = $this->formatUrl((string) $params['cancelUrl']);

        $body = [
            'amountCents' => (int) $params['amountCents'],
            'description' => (string) $params['description'],
            'reference' => (string) $params['reference'],
            'successUrl' => $successUrl,
            'cancelUrl' => $cancelUrl,
        ];

        if (! empty($params['customer'])) {
            $customer = array_filter([
                'name' => $params['customer']['name'] ?? null,
                'email' => $params['customer']['email'] ?? null,
                'phone' => $params['customer']['phone'] ?? null,
            ]);
            if (! empty($customer)) {
                $body['customer'] = $customer;
            }
        }

        $response = Http::withToken($this->secretKey)
            ->withHeaders([
                'Idempotency-Key' => $idempotencyKey,
                'Content-Type' => 'application/json',
            ])
            ->timeout(15)
            ->post("{$this->baseUrl}/v1/checkouts", $body);

        if (! $response->successful()) {
            Log::error('Payments.lk createCheckout failed', [
                'status' => $response->status(),
                'response' => $response->json() ?? $response->body(),
                'reference' => $params['reference'] ?? null,
            ]);

            throw new RuntimeException('Failed to initiate Payments.lk checkout: '.($response->json('message') ?? $response->body()));
        }

        $data = $response->json();

        return [
            'id' => (string) ($data['id'] ?? ''),
            'url' => (string) ($data['url'] ?? ''),
            'payment_id' => $data['payment']['id'] ?? null,
            'raw' => $data,
        ];
    }

    public function retrieveCheckout(string $checkoutId): array
    {
        $response = Http::withToken($this->secretKey)
            ->timeout(10)
            ->get("{$this->baseUrl}/v1/checkouts/{$checkoutId}");

        if (! $response->successful()) {
            Log::error('Payments.lk retrieveCheckout failed', [
                'status' => $response->status(),
                'checkout_id' => $checkoutId,
            ]);

            throw new RuntimeException('Failed to retrieve Payments.lk checkout.');
        }

        $data = $response->json();
        $payment = $data['payment'] ?? [];

        return [
            'id' => (string) ($data['id'] ?? $checkoutId),
            'status' => (string) ($data['status'] ?? 'unknown'),
            'payment_id' => $payment['id'] ?? null,
            'payment_status' => $payment['status'] ?? null,
            'amount_cents' => isset($payment['amountCents']) ? (int) $payment['amountCents'] : null,
            'currency' => $payment['currency'] ?? 'LKR',
            'reference' => $payment['reference'] ?? null,
            'raw' => $data,
        ];
    }

    public function verifyWebhookSignature(string $rawPayload, string $signatureHeader, ?int $timestampTolerance = 300): bool
    {
        if (empty($signatureHeader) || empty($this->webhookSecret)) {
            return false;
        }

        // Header format: t=<timestamp>,v1=<hmac_hex>,v1=<hmac_hex>
        $parts = explode(',', $signatureHeader);
        $timestamp = null;
        $signatures = [];

        foreach ($parts as $part) {
            $part = trim($part);
            if (str_starts_with($part, 't=')) {
                $timestamp = (int) substr($part, 2);
            } elseif (str_starts_with($part, 'v1=')) {
                $signatures[] = substr($part, 3);
            }
        }

        if (! $timestamp || empty($signatures)) {
            return false;
        }

        // Enforce 300-second timestamp tolerance
        if ($timestampTolerance !== null && abs(time() - $timestamp) > $timestampTolerance) {
            Log::warning('Payments.lk webhook timestamp out of tolerance', [
                'timestamp' => $timestamp,
                'now' => time(),
            ]);

            return false;
        }

        $signedPayload = "{$timestamp}.{$rawPayload}";
        $expectedSignature = hash_hmac('sha256', $signedPayload, $this->webhookSecret);

        foreach ($signatures as $sig) {
            if (hash_equals($expectedSignature, $sig)) {
                return true;
            }
        }

        return false;
    }

    protected function formatUrl(string $url): string
    {
        if ($this->returnBaseUrl) {
            $parsedUrl = parse_url($url);
            $parsedReturnBase = parse_url($this->returnBaseUrl);

            $scheme = $parsedReturnBase['scheme'] ?? 'https';
            $host = $parsedReturnBase['host'] ?? '';
            $port = isset($parsedReturnBase['port']) ? ":{$parsedReturnBase['port']}" : '';
            $path = $parsedUrl['path'] ?? '/';
            $query = isset($parsedUrl['query']) ? "?{$parsedUrl['query']}" : '';

            return "{$scheme}://{$host}{$port}{$path}{$query}";
        }

        // Payments.lk strictly requires https:// for successUrl and cancelUrl
        if (str_starts_with($url, 'http://')) {
            return 'https://'.substr($url, 7);
        }

        return $url;
    }
}
