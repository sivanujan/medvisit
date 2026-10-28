<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class CreateSuperAdminCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'make:super-admin {email? : The email of the super admin}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Create a super admin account interactively with hidden password input';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = $this->argument('email') ?: $this->ask('Super admin email');

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Invalid email address.');

            return self::FAILURE;
        }

        $existing = User::where('email', $email)->first();
        if ($existing) {
            $this->error("User with email {$email} already exists.");

            return self::FAILURE;
        }

        $name = $this->ask('Full Name', 'Platform Super Admin');

        $password = $this->secret('Password');
        $confirm = $this->secret('Confirm Password');

        if ($password !== $confirm) {
            $this->error('Passwords do not match.');

            return self::FAILURE;
        }

        if (strlen((string) $password) < 8) {
            $this->error('Password must be at least 8 characters.');

            return self::FAILURE;
        }

        $user = User::create([
            'tenant_id' => null,
            'name' => $name,
            'email' => $email,
            'password' => Hash::make((string) $password),
            'email_verified_at' => now(),
            'is_active' => true,
        ]);

        $role = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $user->syncRoles([$role]);

        $this->info("Super Admin account successfully created for {$email}.");
        $this->line('You can log in at https://medvisit.lk/login and access /super-admin/dashboard.');
        $this->line('Please navigate to your Admin Profile to set up TOTP Two-Factor Authentication.');

        return self::SUCCESS;
    }
}
