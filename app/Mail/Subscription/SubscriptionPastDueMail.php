<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\Subscription;

class SubscriptionPastDueMail extends MedVisitMailable
{
    public function __construct(
        public Subscription $subscription,
        public string $clinicName,
        public bool $isGrace,
        public string $amount,
        public string $payUrl
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
        return $this->isGrace ? 'subscription.past_due_grace' : 'subscription.expired';
    }

    public function subjectLine(): string
    {
        return $this->isGrace
            ? 'Action required: MedVisit subscription grace period active'
            : 'MedVisit subscription expired — clinic access paused';
    }

    public function htmlView(): string
    {
        return 'emails.subscription.past_due';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.past_due';
    }

    public function viewData(): array
    {
        $graceDays = (int) config('medvisit.subscription.grace_days', 3);

        return [
            'clinicName' => $this->clinicName,
            'isGrace' => $this->isGrace,
            'graceDays' => $graceDays,
            'amount' => $this->amount,
            'payUrl' => $this->payUrl,
        ];
    }
}
