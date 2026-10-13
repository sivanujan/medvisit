<?php

declare(strict_types=1);

namespace App\Mail\Auth;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\User;

class VerifyEmailMail extends MedVisitMailable
{
    public function __construct(
        public User $user,
        public string $verificationUrl,
    ) {
        if ($this->user->tenant_id) {
            $this->forTenant($this->user->tenant_id);
        }
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Verify;
    }

    public function emailType(): string
    {
        return 'auth.verify_email';
    }

    public function subjectLine(): string
    {
        return 'Verify your email address - MedVisit';
    }

    public function htmlView(): string
    {
        return 'emails.auth.verify_email';
    }

    public function textView(): string
    {
        return 'emails.text.auth.verify_email';
    }

    public function viewData(): array
    {
        return [
            'name' => $this->user->name,
            'verificationUrl' => $this->verificationUrl,
            'reason' => 'You received this email because an account was registered with your email address on MedVisit.',
        ];
    }
}
