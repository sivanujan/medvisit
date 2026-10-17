<?php

declare(strict_types=1);

namespace App\Services\PhoneVerification\Drivers;

use App\Models\PhoneVerification;
use App\Services\PhoneVerification\Contracts\ChannelDriverInterface;
use Illuminate\Support\Facades\Log;

class LogChannelDriver implements ChannelDriverInterface
{
    public function send(PhoneVerification $verification, string $plainCode): array
    {
        Log::info("[DEV OTP] Phone verification code for {$verification->phone}: {$plainCode}");

        return [
            'success' => true,
            'provider_message_id' => 'log-'.uniqid(),
            'data' => [
                'dev_code' => app()->environment('local', 'testing') ? $plainCode : null,
            ],
        ];
    }

    public function name(): string
    {
        return 'log';
    }
}
