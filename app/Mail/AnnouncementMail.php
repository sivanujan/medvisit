<?php

declare(strict_types=1);

namespace App\Mail;

use App\Mail\Enums\MailSenderType;
use App\Models\Announcement;
use App\Models\AnnouncementRecipient;

class AnnouncementMail extends MedVisitMailable
{
    public function __construct(
        public Announcement $announcement,
        public ?AnnouncementRecipient $recipient = null,
        public ?string $trackingCtaUrl = null,
        public ?string $unsubscribeUrl = null,
    ) {
        $this->tenantId = $recipient?->tenant_id;
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'platform.announcement';
    }

    public function subjectLine(): string
    {
        return $this->announcement->title;
    }

    public function htmlView(): string
    {
        return 'emails.announcement';
    }

    public function textView(): string
    {
        return 'emails.announcement_text';
    }

    public function viewData(): array
    {
        return [
            'announcement' => $this->announcement,
            'recipient' => $this->recipient,
            'trackingCtaUrl' => $this->trackingCtaUrl,
            'unsubscribeUrl' => $this->unsubscribeUrl,
            'showUnsubscribe' => ! in_array($this->announcement->type, ['billing', 'maintenance'], true),
        ];
    }
}
