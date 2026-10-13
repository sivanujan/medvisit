<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Mail\TestMail;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendTestMailCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'medvisit:test-mail {email : The recipient email address}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send a test email through the configured mail transport (e.g. Resend) to verify deliverability';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = (string) $this->argument('email');

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error("Invalid email address: [{$email}]");

            return Command::FAILURE;
        }

        $mailer = config('mail.default');
        $this->info("Sending test email to <{$email}> via [{$mailer}] mailer...");

        try {
            $testMail = new TestMail($email, $mailer);

            // Send synchronously to immediately check provider acceptance
            Mail::to($email)->sendNow($testMail);

            $this->info("Success! Test email successfully sent to <{$email}>.");
            $this->line("From:      {$testMail->resolveFromAddress()->address} ({$testMail->resolveFromAddress()->name})");
            $this->line("Reply-To:  {$testMail->resolveReplyToAddress()->address}");
            $this->line("Mailer:    {$mailer}");

            return Command::SUCCESS;
        } catch (Throwable $e) {
            $this->error("Failed to send test email: {$e->getMessage()}");
            if ($mailer === 'resend') {
                $this->warn('Check that RESEND_API_KEY is properly set in your .env file and the sender domain is verified in Resend.');
            }

            return Command::FAILURE;
        }
    }
}
