<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TurnstileService
{
    /**
     * Verify a Cloudflare Turnstile token.
     */
    public function verify(?string $token, ?string $remoteIp = null): bool
    {
        if (empty($token)) {
            return false;
        }

        $secret = config('services.turnstile.secret_key');

        if (app()->environment('testing')) {
            return in_array($token, ['XXXX.DUMMY.TOKEN.XXXX', 'test-token', '1x00000000000000000000AA'], true);
        }

        if (empty($secret)) {
            return true; // If turnstile secret is not set, allow graceful pass
        }

        try {
            $response = Http::asForm()->timeout(5)->post('https://challenges.cloudflare.com/turnstile/v0/siteverify', [
                'secret' => $secret,
                'response' => $token,
                'remoteip' => $remoteIp,
            ]);

            if ($response->successful()) {
                return (bool) ($response->json('success') ?? false);
            }
        } catch (\Throwable $e) {
            Log::warning('Turnstile verification failed to connect', ['error' => $e->getMessage()]);
        }

        return false;
    }
}
