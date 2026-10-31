<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\Tenant;

class LaunchOfferEndingReminderMail extends MedVisitMailable
{
    /**
     * @param  array<string, mixed>  $usageSummary
     */
    public function __construct(
        public Tenant $tenant,
        public int $daysRemaining,
        public array $usageSummary,
        public string $recommendedPlan,
        public string $changePlanUrl
    ) {
        $this->tenantId = $tenant->id;
        $this->onBehalfOfClinicName = $tenant->name;
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Billing;
    }

    public function emailType(): string
    {
        return 'subscription.launch_offer_reminder_'.$this->daysRemaining;
    }

    public function subjectLine(): string
    {
        return "MedVisit Launch Offer ends in {$this->daysRemaining} day(s) — Recommended plan for {$this->tenant->name}";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.launch_offer_reminder';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.launch_offer_reminder';
    }

    public function viewData(): array
    {
        return [
            'tenant' => $this->tenant,
            'daysRemaining' => $this->daysRemaining,
            'usageSummary' => $this->usageSummary,
            'recommendedPlan' => $this->recommendedPlan,
            'changePlanUrl' => $this->changePlanUrl,
        ];
    }
}
