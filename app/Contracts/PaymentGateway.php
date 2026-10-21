<?php

declare(strict_types=1);

namespace App\Contracts;

interface PaymentGateway
{
    /**
     * Create a hosted checkout session.
     *
     * @param array{
     *     amountCents: int,
     *     description: string,
     *     reference: string,
     *     successUrl: string,
     *     cancelUrl: string,
     *     idempotencyKey?: string,
     *     customer?: array{name?: string, email?: string, phone?: string}
     * } $params
     * @return array{
     *     id: string,
     *     url: string,
     *     payment_id?: string|null,
     *     raw: array
     * }
     */
    public function createCheckout(array $params): array;

    /**
     * Retrieve checkout details from the gateway to verify status.
     *
     * @return array{
     *     id: string,
     *     status: string,
     *     payment_id?: string|null,
     *     payment_status?: string|null,
     *     amount_cents?: int|null,
     *     currency?: string|null,
     *     reference?: string|null,
     *     raw: array
     * }
     */
    public function retrieveCheckout(string $checkoutId): array;

    /**
     * Verify the authenticity of an incoming webhook signature.
     */
    public function verifyWebhookSignature(string $rawPayload, string $signatureHeader, ?int $timestampTolerance = 300): bool;
}
