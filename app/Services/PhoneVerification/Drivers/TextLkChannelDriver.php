<?php

declare(strict_types=1);

namespace App\Services\PhoneVerification\Drivers;

use App\Models\PhoneVerification;
use App\Services\PhoneVerification\Contracts\ChannelDriverInterface;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TextLkChannelDriver implements ChannelDriverInterface
{
    public function send(PhoneVerification $verification, string $plainCode): array
    {
        $mode = strtolower((string) config('services.textlk.mode', 'oauth'));
        $token = (string) config('services.textlk.api_token');
        $senderId = substr((string) config('services.textlk.sender_id', 'medvisit'), 0, 11);
        $apiUrl = rtrim((string) config('services.textlk.api_url', 'https://app.text.lk/api/v3'), '/');
        $httpUrl = rtrim((string) config('services.textlk.http_url', 'https://app.text.lk/api/http'), '/');

        if ($senderId === 'TextLKDemo') {
            Log::warning('[TextLkChannelDriver] Using TextLKDemo sender ID — this demo sender cannot be used for real OTPs in production.');
        }

        if (empty($token)) {
            Log::warning('[TextLkChannelDriver] TEXTLK_API_TOKEN is not configured.');

            return [
                'success' => false,
                'error' => 'SMS gateway credentials not configured.',
            ];
        }

        // Format recipient to 94XXXXXXXXX (country code, no plus sign, no leading 0)
        $cleanDigits = preg_replace('/\D/', '', $verification->phone);
        if (str_starts_with($cleanDigits, '0')) {
            $recipient = '94'.substr($cleanDigits, 1);
        } elseif (str_starts_with($cleanDigits, '94')) {
            $recipient = $cleanDigits;
        } else {
            $recipient = '94'.$cleanDigits;
        }

        // One standard GSM segment message
        $message = "MedVisit code: {$plainCode}. Valid 10 min. Do not share.";

        try {
            // Retry twice with backoff on network errors or 5xx server errors only (never on 4xx)
            $httpClient = Http::timeout(10)->retry(2, 200, function ($exception) {
                if ($exception instanceof ConnectionException) {
                    return true;
                }

                if (method_exists($exception, 'hasResponse') && $exception->hasResponse()) {
                    return $exception->getResponse()?->serverError() ?? false;
                }

                return false;
            }, throw: false);

            if ($mode === 'http') {
                // HTTP GET mode (fallback only)
                // Note: Token is in query string, so never log the full request URL!
                $endpoint = "{$httpUrl}/sms/send";
                $response = $httpClient->get($endpoint, [
                    'recipient' => $recipient,
                    'sender_id' => $senderId,
                    'type' => 'plain',
                    'message' => $message,
                    'api_token' => $token,
                ]);
            } else {
                // OAuth Bearer POST mode (recommended, default)
                $endpoint = "{$apiUrl}/sms/send";
                $response = $httpClient->withHeaders([
                    'Authorization' => "Bearer {$token}",
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ])->post($endpoint, [
                    'recipient' => $recipient,
                    'sender_id' => $senderId,
                    'type' => 'plain',
                    'message' => $message,
                ]);
            }

            return $this->parseResponse($response);
        } catch (\Throwable $e) {
            Log::error('[TextLkChannelDriver] Connection exception during SMS dispatch: '.$e->getMessage());

            return [
                'success' => false,
                'error' => 'Unable to reach SMS gateway. Please try WhatsApp verification instead.',
            ];
        }
    }

    /**
     * Parse Text.lk response according to official API documented shapes.
     *
     * @return array{
     *     success: bool,
     *     provider_message_id?: string,
     *     cost?: float,
     *     sms_count?: int,
     *     error?: string
     * }
     */
    protected function parseResponse(Response $response): array
    {
        $json = $response->json() ?? [];
        $rawStatus = $json['status'] ?? null;

        // Documented success: "status" == "success" OR "status" === true
        $isSuccess = ($rawStatus === 'success' || $rawStatus === true) && $response->successful();

        if ($isSuccess) {
            $data = is_array($json['data'] ?? null) ? $json['data'] : [];

            // Read message ID from data.uid OR data.sms_id OR data.id OR top-level message_id
            $providerMsgId = $data['uid']
                ?? $data['sms_id']
                ?? $data['message_id']
                ?? $data['id']
                ?? $json['message_id']
                ?? null;

            $cost = isset($data['cost']) ? (float) $data['cost'] : null;
            $smsCount = isset($data['sms_count']) ? (int) $data['sms_count'] : (isset($data['count']) ? (int) $data['count'] : 1);

            return [
                'success' => true,
                'provider_message_id' => is_string($providerMsgId) ? $providerMsgId : (string) ($providerMsgId ?? ''),
                'cost' => $cost,
                'sms_count' => $smsCount,
            ];
        }

        // Documented error: "status" == "error" OR "status" === false, with "message"
        $errorMessage = $json['message'] ?? $json['error'] ?? "HTTP {$response->status()} delivery failed";

        Log::error("[TextLkChannelDriver] Text.lk SMS error: {$errorMessage}", [
            'status' => $response->status(),
            'response' => $json,
        ]);

        return [
            'success' => false,
            'error' => "SMS delivery failed: {$errorMessage}. Please try WhatsApp instead or check your number.",
        ];
    }

    public function name(): string
    {
        return 'textlk';
    }
}
