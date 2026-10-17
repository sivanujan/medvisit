<?php

declare(strict_types=1);

namespace App\Console\Commands;

use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class WhatsAppCheckCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'medvisit:whatsapp-check';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Verify Meta WhatsApp Cloud API credentials, token validity, and expiration';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $version = config('services.whatsapp.api_version', 'v25.0');
        $phoneNumberId = config('services.whatsapp.phone_number_id');
        $businessAccountId = config('services.whatsapp.business_account_id');
        $accessToken = config('services.whatsapp.access_token');
        $appSecret = config('services.whatsapp.app_secret');
        $verifyToken = config('services.whatsapp.verify_token');
        $businessNumber = config('services.whatsapp.business_number');

        $this->info('=== WhatsApp Cloud API Configuration Check ===');
        $this->table(
            ['Setting', 'Configured Value'],
            [
                ['API Version', $version],
                ['Phone Number ID', $phoneNumberId ? substr($phoneNumberId, 0, 4).'****'.substr($phoneNumberId, -4) : '<fg=red>Not Set</>'],
                ['Business Account ID', $businessAccountId ? substr($businessAccountId, 0, 4).'****'.substr($businessAccountId, -4) : '<fg=yellow>Optional / Not Set</>'],
                ['Business Phone Number', $businessNumber ?: '<fg=yellow>Not Set</>'],
                ['Access Token', $accessToken ? substr($accessToken, 0, 8).'****'.substr($accessToken, -4) : '<fg=red>Not Set</>'],
                ['App Secret', $appSecret ? substr($appSecret, 0, 4).'****' : '<fg=red>Not Set</>'],
                ['Webhook Verify Token', $verifyToken ? 'Configured' : '<fg=red>Not Set</>'],
            ]
        );

        if (empty($accessToken)) {
            $this->error('WHATSAPP_ACCESS_TOKEN is missing in your .env file.');

            return self::FAILURE;
        }

        $this->newLine();
        $this->line('Checking credentials against Meta Graph API ('.$version.')...');

        // 1. Check Phone Number ID endpoint
        if (! empty($phoneNumberId)) {
            try {
                $phoneRes = Http::withToken($accessToken)
                    ->timeout(10)
                    ->get("https://graph.facebook.com/{$version}/{$phoneNumberId}");

                if ($phoneRes->successful()) {
                    $phoneData = $phoneRes->json();
                    $this->info(' Phone Number ID verified successfully!');
                    $this->line('  • Display Phone: <fg=green>'.($phoneData['display_phone_number'] ?? 'N/A').'</>');
                    $this->line('  • Verified Name: <fg=green>'.($phoneData['verified_name'] ?? 'N/A').'</>');
                    $this->line('  • Quality Rating: <fg=green>'.($phoneData['quality_rating'] ?? 'N/A').'</>');
                } else {
                    $err = $phoneRes->json('error.message') ?? $phoneRes->body();
                    $this->warn(' Phone Number ID check returned: '.$err);
                }
            } catch (\Throwable $e) {
                $this->warn(' Could not reach Meta Graph API for Phone Number ID: '.$e->getMessage());
            }
        }

        // 2. Debug Token for expiry information
        try {
            $debugRes = Http::withToken($accessToken)
                ->timeout(10)
                ->get("https://graph.facebook.com/{$version}/debug_token", [
                    'input_token' => $accessToken,
                ]);

            if ($debugRes->successful()) {
                $data = $debugRes->json('data') ?? [];
                $isValid = $data['is_valid'] ?? false;
                $expiresAt = $data['expires_at'] ?? 0;

                $this->newLine();
                if ($isValid) {
                    $this->info(' Access Token is VALID.');
                    if ($expiresAt === 0) {
                        $this->line('  • Expiration: <fg=green>Never (Permanent System User Token)</>');
                    } else {
                        $expiryDate = Carbon::createFromTimestamp($expiresAt);
                        $remaining = $expiryDate->diffForHumans();
                        if ($expiryDate->isPast()) {
                            $this->error("  • Expiration: Expired at {$expiryDate->toDateTimeString()} ({$remaining})");
                        } else {
                            $this->line("  • Expiration: <fg=yellow>{$expiryDate->toDateTimeString()} ({$remaining})</>");
                        }
                    }
                    if (! empty($data['scopes'])) {
                        $this->line('  • Scopes: '.implode(', ', $data['scopes']));
                    }
                } else {
                    $this->error(' Access Token is INVALID or revoked according to Meta token debugger.');
                }
            } else {
                $this->warn('Token debug request returned: '.($debugRes->json('error.message') ?? $debugRes->status()));
            }
        } catch (\Throwable $e) {
            $this->warn('Could not query debug_token endpoint: '.$e->getMessage());
        }

        return self::SUCCESS;
    }
}
