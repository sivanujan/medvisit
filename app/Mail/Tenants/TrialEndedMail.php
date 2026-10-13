<?php

declare(strict_types=1);

namespace App\Mail\Tenants;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\Tenant;
use App\Models\User;

class TrialEndedMail extends MedVisitMailable
{
    public string $portalUrl;

    public function __construct(
        public Tenant $tenant,
        public User $user,
    ) {
        $this->forTenant($this->tenant);
        $this->portalUrl = $this->tenant->url('/clinic/suspended');
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'tenant.trial_ended';
    }

    public function subjectLine(): string
    {
        return "Your MedVisit trial has ended - {$this->tenant->name}";
    }

    public function htmlView(): string
    {
        return 'emails.tenants.trial_ended';
    }

    public function textView(): string
    {
        return 'emails.text.tenants.trial_ended';
    }

    public function viewData(): array
    {
        return [
            'adminName' => $this->user->name,
            'clinicName' => $this->tenant->name,
            'subdomain' => $this->tenant->subdomain,
            'portalUrl' => $this->portalUrl,
            'reason' => 'You received this notification because your MedVisit clinic free trial has ended.',
        ];
    }
}
