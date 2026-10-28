<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Console\Command;

class ResetTwoFactorCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'medvisit:reset-2fa {email : The email address of the user}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Reset 2FA credentials for a user in emergency';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->argument('email');

        $user = User::where('email', $email)->first();

        if (! $user) {
            $this->error("User with email [{$email}] was not found.");

            return Command::FAILURE;
        }

        $user->forceFill([
            'two_factor_secret' => null,
            'two_factor_recovery_codes' => null,
            'two_factor_confirmed_at' => null,
        ])->save();

        AuditLogger::log('admin.2fa_reset_cli', [
            'user_id' => $user->id,
            'metadata' => [
                'email' => $email,
                'source' => 'cli',
            ],
        ]);

        $this->info("Successfully reset 2FA for [{$email}]. The user can now log in using standard credentials.");

        return Command::SUCCESS;
    }
}
