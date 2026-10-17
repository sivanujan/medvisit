<?php

declare(strict_types=1);

namespace App\Services\PhoneVerification\Contracts;

use App\Models\PhoneVerification;

interface ChannelDriverInterface
{
    /**
     * Send or prepare verification for the given channel.
     *
     * @return array{
     *     success: bool,
     *     provider_message_id?: string|null,
     *     error?: string|null,
     *     data?: array<string, mixed>
     * }
     */
    public function send(PhoneVerification $verification, string $plainCode): array;

    /**
     * Get the channel identifier name (e.g. 'whatsapp', 'textlk', 'log', 'fake').
     */
    public function name(): string;
}
