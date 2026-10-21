<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\Subscription;

class SubscriptionPlanChangedMail extends MedVisitMailable
{
    public function __construct(
        public Subscription $subscription,
        public string $clinicName,
        public string $oldPlanName,
        public string $newPlanName,
        public string $changeType, // "Upgrade (Immediate)" or "Downgrade (Next Renewal)"
        public string $effectiveDate,
        public ?string $amountCharged = null,
        public string $billingUrl = ''
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
        return 'subscription.plan_changed';
    }

    public function subjectLine(): string
    {
        return "MedVisit plan updated to {$this->newPlanName} ({$this->clinicName})";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.plan_changed';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.plan_changed';
    }

    public function viewData(): array
    {
        return [
            'clinicName' => $this->clinicName,
            'oldPlanName' => $this->oldPlanName,
            'newPlanName' => $this->newPlanName,
            'changeType' => $this->changeType,
            'effectiveDate' => $this->effectiveDate,
            'amountCharged' => $this->amountCharged,
            'billingUrl' => $this->billingUrl,
        ];
    }
}
