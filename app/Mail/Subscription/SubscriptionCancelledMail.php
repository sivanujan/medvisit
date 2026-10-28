<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\Subscription;

class SubscriptionCancelledMail extends MedVisitMailable
{
    public function __construct(
        public Subscription $subscription,
        public string $clinicName,
        public string $accessUntil,
        public string $resumeUrl,
        public ?string $reason = null
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
        return 'subscription.cancelled';
    }

    public function subjectLine(): string
    {
        return "MedVisit subscription cancellation confirmed ({$this->clinicName})";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.cancelled';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.cancelled';
    }

    public function viewData(): array
    {
        return [
            'clinicName' => $this->clinicName,
            'accessUntil' => $this->accessUntil,
            'resumeUrl' => $this->resumeUrl,
            'reason' => $this->reason,
        ];
    }
}
