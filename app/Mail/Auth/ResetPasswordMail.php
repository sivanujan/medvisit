<?php

declare(strict_types=1);

namespace App\Mail\Auth;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\Tenant;
use App\Models\User;

class ResetPasswordMail extends MedVisitMailable
{
    public string $resetUrl;

    public ?string $clinicName = null;

    public function __construct(
        public User $user,
        public string $token,
        ?string $resetUrl = null,
    ) {
        if ($this->user->tenant_id) {
            $this->forTenant($this->user->tenant_id);
            $tenant = $this->user->tenant ?? Tenant::find($this->user->tenant_id);
            if ($tenant) {
                $this->clinicName = $tenant->name;
            }
        }

        if ($resetUrl !== null) {
            $this->resetUrl = $resetUrl;
        } else {
            $tenant = $this->user->tenant ?? ($this->user->tenant_id ? Tenant::find($this->user->tenant_id) : null);
            if ($tenant) {
                $this->resetUrl = $tenant->url("/reset-password/{$this->token}?email=".urlencode($this->user->email));
            } else {
                $this->resetUrl = url(route('password.reset', [
                    'token' => $this->token,
                    'email' => $this->user->email,
                ], false));
            }
        }
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Verify;
    }

    public function emailType(): string
    {
        return 'auth.reset_password';
    }

    public function subjectLine(): string
    {
        if ($this->clinicName) {
            return "Reset your password - {$this->clinicName} (MedVisit)";
        }

        return 'Reset your MedVisit password';
    }

    public function htmlView(): string
    {
        return 'emails.auth.reset_password';
    }

    public function textView(): string
    {
        return 'emails.text.auth.reset_password';
    }

    public function viewData(): array
    {
        return [
            'name' => $this->user->name,
            'resetUrl' => $this->resetUrl,
            'clinicName' => $this->clinicName,
            'expiresIn' => (int) config('auth.passwords.users.expire', 60),
            'reason' => 'You received this email because a password reset request was submitted for your MedVisit account.',
        ];
    }
}
