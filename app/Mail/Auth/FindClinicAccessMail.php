<?php

declare(strict_types=1);

namespace App\Mail\Auth;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;

class FindClinicAccessMail extends MedVisitMailable
{
    /**
     * @param  list<array{name: string, subdomain: string, login_url: string, auto_login_url?: string|null}>  $clinics
     */
    public function __construct(
        public string $recipientEmail,
        public array $clinics,
    ) {
        if (! empty($this->clinics[0]['subdomain'])) {
            $this->forTenant($this->clinics[0]['subdomain']);
        }
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Verify;
    }

    public function emailType(): string
    {
        return 'auth.find_clinic';
    }

    public function subjectLine(): string
    {
        return 'Your MedVisit Clinic Access Links';
    }

    public function htmlView(): string
    {
        return 'emails.auth.find_clinic';
    }

    public function textView(): string
    {
        return 'emails.text.auth.find_clinic';
    }

    public function viewData(): array
    {
        return [
            'recipientEmail' => $this->recipientEmail,
            'clinics' => $this->clinics,
            'primaryClinic' => $this->clinics[0] ?? null,
            'reason' => 'You received this email because you requested clinic access links using this work email on MedVisit.',
        ];
    }
}
