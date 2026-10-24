<?php

declare(strict_types=1);

namespace App\Contracts;

use App\Models\RefundRequest;

interface RefundProcessor
{
    /**
     * Process an approved refund request.
     *
     * @param array{
     *     method: string,
     *     reference: string,
     *     admin_id?: int|null,
     *     admin_note?: string|null,
     * } $context
     */
    public function process(RefundRequest $refundRequest, array $context): RefundRequest;
}
