<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\Subscription;

class SubscriptionResumedMail extends MedVisitMailable
{
    public function __construct(
        public Subscription $subscription,
        public string $clinicName,
        public string $billingUrl
    ) {
        $this->tenantId = $subscription->tenant_id;
        $this->onBehalfOfClinicName = $clinicName;
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'subscription.resumed';
    }

    public function subjectLine(): string
    {
        return "MedVisit subscription resumed ({$this->clinicName})";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.resumed';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.resumed';
    }

    public function viewData(): array
    {
        $plan = $this->subscription->plan;
        $nextRenewal = $this->subscription->current_period_end?->setTimezone('Asia/Colombo')->format('d/m/Y') ?? 'Ongoing';

        return [
            'clinicName' => $this->clinicName,
            'planName' => $plan ? $plan->name : 'MedVisit Standard',
            'nextRenewal' => $nextRenewal,
            'billingUrl' => $this->billingUrl,
        ];
    }
}
