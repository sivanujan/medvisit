<?php

declare(strict_types=1);

namespace App\Mail\Tenants;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\Tenant;
use App\Models\User;

class TrialEndingSoonMail extends MedVisitMailable
{
    public string $formattedTrialEnd;

    public string $portalUrl;

    public function __construct(
        public Tenant $tenant,
        public User $user,
    ) {
        $this->forTenant($this->tenant);
        $this->portalUrl = $this->tenant->url('/dashboard');

        $trialEnd = $this->tenant->trial_ends_at ?? now()->addDays(3);
        $this->formattedTrialEnd = $trialEnd->copy()->timezone('Asia/Colombo')->format('l, F j, Y');
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'tenant.trial_ending_soon';
    }

    public function subjectLine(): string
    {
        return "Your MedVisit trial ends in 3 days - {$this->tenant->name}";
    }

    public function htmlView(): string
    {
        return 'emails.tenants.trial_ending_soon';
    }

    public function textView(): string
    {
        return 'emails.text.tenants.trial_ending_soon';
    }

    public function viewData(): array
    {
        return [
            'adminName' => $this->user->name,
            'clinicName' => $this->tenant->name,
            'subdomain' => $this->tenant->subdomain,
            'trialEnd' => $this->formattedTrialEnd,
            'portalUrl' => $this->portalUrl,
            'reason' => 'You received this notification because you are a clinic administrator of a MedVisit trial account.',
        ];
    }
}
