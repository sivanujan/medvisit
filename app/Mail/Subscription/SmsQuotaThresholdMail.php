<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\Tenant;

class SmsQuotaThresholdMail extends MedVisitMailable
{
    public function __construct(
        public Tenant $tenant,
        public int $percent,
        public int $used,
        public int $limit,
        public string $billingUrl
    ) {
        $this->tenantId = $tenant->id;
        $this->onBehalfOfClinicName = $tenant->name;
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'subscription.sms_threshold_'.$this->percent;
    }

    public function subjectLine(): string
    {
        if ($this->percent >= 100) {
            return "Action required: Monthly SMS limit reached ({$this->tenant->name})";
        }

        return "Notice: 80% of monthly SMS quota used ({$this->tenant->name})";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.sms_threshold';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.sms_threshold';
    }

    public function viewData(): array
    {
        return [
            'tenant' => $this->tenant,
            'percent' => $this->percent,
            'used' => $this->used,
            'limit' => $this->limit,
            'billingUrl' => $this->billingUrl,
        ];
    }
}
