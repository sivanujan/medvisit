<?php

declare(strict_types=1);

namespace App\Services\PhoneVerification\Drivers;

use App\Models\PhoneVerification;
use App\Services\PhoneVerification\Contracts\ChannelDriverInterface;

class WhatsAppChannelDriver implements ChannelDriverInterface
{
    public function send(PhoneVerification $verification, string $plainCode): array
    {
        $rawNumber = config('services.whatsapp.business_number', '');
        $cleanNumber = preg_replace('/\D/', '', (string) $rawNumber);

        $messageText = "VERIFY {$plainCode}";
        $waLink = "https://wa.me/{$cleanNumber}?text=".urlencode($messageText);

        return [
            'success' => true,
            'provider_message_id' => null,
            'data' => [
                'business_number' => $rawNumber,
                'clean_business_number' => $cleanNumber,
                'expected_message' => $messageText,
                'wa_link' => $waLink,
            ],
        ];
    }

    public function name(): string
    {
        return 'whatsapp';
    }
}
