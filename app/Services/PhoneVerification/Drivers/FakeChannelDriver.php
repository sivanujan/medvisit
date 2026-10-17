<?php

declare(strict_types=1);

namespace App\Services\PhoneVerification\Drivers;

use App\Models\PhoneVerification;
use App\Services\PhoneVerification\Contracts\ChannelDriverInterface;

class FakeChannelDriver implements ChannelDriverInterface
{
    /**
     * @var array<int, array{verification: PhoneVerification, code: string}>
     */
    public array $sent = [];

    public bool $shouldFail = false;

    public string $failureReason = 'Simulated SMS failure';

    public function send(PhoneVerification $verification, string $plainCode): array
    {
        $this->sent[] = [
            'verification' => $verification,
            'code' => $plainCode,
        ];

        if ($this->shouldFail) {
            return [
                'success' => false,
                'error' => $this->failureReason,
            ];
        }

        return [
            'success' => true,
            'provider_message_id' => 'fake-'.bin2hex(random_bytes(6)),
            'data' => [
                'test_code' => $plainCode,
            ],
        ];
    }

    public function name(): string
    {
        return 'fake';
    }
}
