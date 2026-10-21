<?php

declare(strict_types=1);

namespace App\Services\Payments;

use App\Contracts\PaymentGateway;

class FakeGateway implements PaymentGateway
{
    public array $createdCheckouts = [];

    protected string $nextCheckoutId = 'chk_fake_1234567890abcdef';

    protected string $nextCheckoutUrl = 'https://payments.lk/checkout/chk_fake_1234567890abcdef';

    protected ?array $retrieveResult = null;

    protected ?bool $forceSignatureValid = null;

    public function setNextCheckoutId(string $id): self
    {
        $this->nextCheckoutId = $id;

        return $this;
    }

    public function setNextCheckoutUrl(string $url): self
    {
        $this->nextCheckoutUrl = $url;

        return $this;
    }

    public function setRetrieveResult(array $result): self
    {
        $this->retrieveResult = $result;

        return $this;
    }

    public function forceSignatureValid(?bool $valid = true): self
    {
        $this->forceSignatureValid = $valid;

        return $this;
    }

    public function createCheckout(array $params): array
    {
        $this->createdCheckouts[] = $params;

        return [
            'id' => $this->nextCheckoutId,
            'url' => $this->nextCheckoutUrl,
            'payment_id' => 'pay_fake_'.uniqid(),
            'raw' => [
                'id' => $this->nextCheckoutId,
                'url' => $this->nextCheckoutUrl,
                'status' => 'open',
            ],
        ];
    }

    public function retrieveCheckout(string $checkoutId): array
    {
        if ($this->retrieveResult !== null) {
            return $this->retrieveResult;
        }

        return [
            'id' => $checkoutId,
            'status' => 'completed',
            'payment_id' => 'pay_fake_default',
            'payment_status' => 'succeeded',
            'amount_cents' => 500000,
            'currency' => 'LKR',
            'reference' => 'INV-2026-000001',
            'raw' => [],
        ];
    }

    public function verifyWebhookSignature(string $rawPayload, string $signatureHeader, ?int $timestampTolerance = 300): bool
    {
        if ($this->forceSignatureValid !== null) {
            return $this->forceSignatureValid;
        }

        return ! empty($signatureHeader);
    }
}
