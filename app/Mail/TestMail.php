<?php

declare(strict_types=1);

namespace App\Mail;

use App\Mail\Enums\MailSenderType;

class TestMail extends MedVisitMailable
{
    public string $sentAt;

    public ?string $mailDriver;

    public function __construct(
        public string $recipientEmail,
        ?string $mailDriver = null,
    ) {
        $this->sentAt = now()->timezone('Asia/Colombo')->format('l, F j, Y \a\t g:i:s A T');
        $this->mailDriver = $mailDriver ?? config('mail.default');
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'test.delivery';
    }

    public function subjectLine(): string
    {
        return "MedVisit Email Delivery Test [{$this->sentAt}]";
    }

    public function htmlView(): string
    {
        return 'emails.test';
    }

    public function textView(): string
    {
        return 'emails.text.test';
    }

    public function viewData(): array
    {
        return [
            'recipientEmail' => $this->recipientEmail,
            'sentAt' => $this->sentAt,
            'mailer' => $this->mailDriver,
            'reason' => 'You received this test email from MedVisit CLI to verify email delivery and reputation.',
        ];
    }
}
