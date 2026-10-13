<?php

declare(strict_types=1);

namespace App\Mail\Security;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\Tenant;
use App\Models\User;

class NewDeviceLoginMail extends MedVisitMailable
{
    public string $formattedLoginTime;

    public string $resetUrl;

    public function __construct(
        public User $user,
        public string $ipAddress,
        public string $userAgent,
    ) {
        if ($this->user->tenant_id) {
            $this->forTenant($this->user->tenant_id);
            $tenant = $this->user->tenant ?? Tenant::find($this->user->tenant_id);
            $this->resetUrl = $tenant ? $tenant->url('/forgot-password') : url('/forgot-password');
        } else {
            $this->resetUrl = url('/forgot-password');
        }

        $this->formattedLoginTime = now()->timezone('Asia/Colombo')->format('l, F j, Y \a\t g:i A T');
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'security.new_device_login';
    }

    public function subjectLine(): string
    {
        return 'Security alert: New login to MedVisit';
    }

    public function htmlView(): string
    {
        return 'emails.security.new_device_login';
    }

    public function textView(): string
    {
        return 'emails.text.security.new_device_login';
    }

    public function viewData(): array
    {
        return [
            'name' => $this->user->name,
            'ipAddress' => $this->ipAddress,
            'userAgent' => $this->userAgent,
            'loginTime' => $this->formattedLoginTime,
            'resetUrl' => $this->resetUrl,
            'reason' => 'You received this security notification because a new sign-in was detected for your account.',
        ];
    }
}
