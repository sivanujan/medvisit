<?php

declare(strict_types=1);

namespace App\Mail\Auth;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;

class RegistrationVerificationCodeMail extends MedVisitMailable
{
    public function __construct(
        public string $code,
        public string $email,
        public ?string $name = null,
        public ?string $clinicName = null,
    ) {}

    public function senderType(): MailSenderType
    {
        return MailSenderType::Verify;
    }

    public function emailType(): string
    {
        return 'auth.registration_otp';
    }

    public function subjectLine(): string
    {
        return "Your MedVisit verification code: {$this->code}";
    }

    public function htmlView(): string
    {
        return 'emails.auth.registration_otp';
    }

    public function textView(): string
    {
        return 'emails.text.auth.registration_otp';
    }

    /**
     * @return array<string, mixed>
     */
    public function viewData(): array
    {
        return [
            'code' => $this->code,
            'email' => $this->email,
            'name' => $this->name,
            'clinicName' => $this->clinicName,
            'reason' => 'verification',
        ];
    }
}
