<?php

declare(strict_types=1);

namespace App\Mail;

use App\Mail\Enums\MailSenderType;
use App\Models\Lead;

class LeadDemoRequestNotificationMail extends MedVisitMailable
{
    public function __construct(
        public Lead $lead
    ) {
        $this->tenantId = null;
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'platform.lead_demo_request';
    }

    public function subjectLine(): string
    {
        return "New Demo Request: {$this->lead->clinic_name} ({$this->lead->contact_name})";
    }

    public function htmlView(): string
    {
        return 'emails.lead_demo_request';
    }

    public function textView(): string
    {
        return 'emails.lead_demo_request_text';
    }

    public function viewData(): array
    {
        return [
            'lead' => $this->lead,
        ];
    }
}
