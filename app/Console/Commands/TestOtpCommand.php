<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Services\PhoneVerification\PhoneVerificationService;
use Illuminate\Console\Command;

class TestOtpCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'medvisit:test-otp 
                            {phone : The mobile phone number (e.g. 0771234567 or +94771234567)}
                            {--channel=textlk : The channel to test (textlk, whatsapp, log)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Dispatch a test phone verification code via Text.lk SMS, WhatsApp reverse verification, or local log';

    /**
     * Execute the console command.
     */
    public function handle(PhoneVerificationService $service): int
    {
        $rawPhone = (string) $this->argument('phone');
        $channel = strtolower((string) $this->option('channel'));

        if (! in_array($channel, ['textlk', 'whatsapp', 'log'], true)) {
            $this->error("Invalid channel '{$channel}'. Allowed options: textlk, whatsapp, log");

            return self::FAILURE;
        }

        $normalized = $service->normalizePhone($rawPhone);
        $this->info("Normalized Phone: {$normalized} (Masked: {$service->maskPhone($normalized)})");
        $this->info("Selected Channel: {$channel}");

        $tenant = Tenant::first();
        $sessionId = 'cli_test_'.time();

        $this->line('Starting verification attempt...');

        $result = $service->startVerification(
            rawPhone: $rawPhone,
            channel: $channel,
            sessionId: $sessionId,
            tenant: $tenant
        );

        if (! $result['success']) {
            $this->error('Verification dispatch failed: '.($result['error'] ?? 'Unknown error'));

            return self::FAILURE;
        }

        $this->info('Verification successfully initiated! (ID: '.$result['verification_id'].')');

        if ($channel === 'whatsapp') {
            $data = $result['data'] ?? [];
            $this->newLine();
            $this->line('<options=bold;fg=green>=== WHATSAPP REVERSE VERIFICATION DETAILS ===</>');
            $this->line('6-Digit Code: <fg=yellow>'.($data['code'] ?? 'N/A').'</>');
            $this->line('Exact Message: <fg=cyan>'.($data['message'] ?? 'N/A').'</>');
            $this->line('Target Number: <fg=white>'.($data['wa_number'] ?? 'Not set in .env').'</>');
            $this->line('Direct Link: <href='.($data['wa_link'] ?? '').'>'.($data['wa_link'] ?? '').'</>');
            $this->newLine();
            $this->comment('Simulate patient action: Open WhatsApp with the link above and send the message, or hit the webhook directly.');
        } elseif ($channel === 'textlk') {
            $this->newLine();
            $this->line('<options=bold;fg=cyan>=== TEXT.LK SMS DETAILS ===</>');
            if (isset($result['data']['dev_code'])) {
                $this->line('Dev/Local Code: <fg=yellow>'.$result['data']['dev_code'].'</>');
            }
            $this->line('Status: <fg=green>Sent via Text.lk REST API</>');
            $this->newLine();
        } else {
            $this->newLine();
            $this->line('<options=bold;fg=yellow>=== LOCAL LOG DRIVER ===</>');
            $this->line('Generated Code: <fg=green>'.($result['data']['dev_code'] ?? 'Logged to storage/logs/laravel.log').'</>');
            $this->newLine();
        }

        return self::SUCCESS;
    }
}
