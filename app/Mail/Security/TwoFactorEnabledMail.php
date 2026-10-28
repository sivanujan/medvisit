<?php

declare(strict_types=1);

namespace App\Mail\Security;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\Tenant;
use App\Models\User;

class TwoFactorEnabledMail extends MedVisitMailable
{
    public string $formattedTime;

    public string $securityUrl;

    public function __construct(
        public User $user
    ) {
        if ($this->user->tenant_id) {
            $this->forTenant($this->user->tenant_id);
            $tenant = $this->user->tenant ?? Tenant::find($this->user->tenant_id);
            $this->securityUrl = $tenant ? $tenant->url('/settings/security') : url('/super-admin/admins');
        } else {
            $this->securityUrl = url('/super-admin/admins');
        }

        $this->formattedTime = now()->timezone('Asia/Colombo')->format('l, F j, Y \a\t g:i A T');
        $this->preheaderText = 'Two-factor authentication has been successfully enabled for your MedVisit account.';
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'security.two_factor_enabled';
    }

    public function subjectLine(): string
    {
        return 'Two-factor authentication enabled on MedVisit';
    }

    public function htmlView(): string
    {
        return 'emails.security.two_factor_enabled';
    }

    public function textView(): string
    {
        return 'emails.text.security.two_factor_enabled';
    }

    public function viewData(): array
    {
        return [
            'name' => $this->user->name,
            'email' => $this->user->email,
            'enabledAt' => $this->formattedTime,
            'securityUrl' => $this->securityUrl,
        ];
    }
}
