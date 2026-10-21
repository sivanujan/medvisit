<?php

declare(strict_types=1);

namespace App\Mail;

use App\Mail\Enums\MailSenderType;
use App\Models\StaffInvitation;

class StaffInviteMail extends MedVisitMailable
{
    public function __construct(
        public StaffInvitation $invitation,
        public string $acceptUrl,
        public string $clinicName
    ) {
        $this->tenantId = $invitation->tenant_id;
        $this->onBehalfOfClinicName = $clinicName;
        $this->preheaderText = "You have been invited to join {$clinicName} as a ".ucwords(str_replace('_', ' ', $invitation->role)).'.';
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'auth.staff_invite';
    }

    public function subjectLine(): string
    {
        return "Invitation to join {$this->clinicName} on MedVisit";
    }

    public function htmlView(): string
    {
        return 'emails.staff_invite';
    }

    public function textView(): string
    {
        return 'emails.text.staff_invite';
    }

    public function viewData(): array
    {
        return [
            'name' => $this->invitation->name,
            'clinicName' => $this->clinicName,
            'role' => ucwords(str_replace('_', ' ', $this->invitation->role)),
            'acceptUrl' => $this->acceptUrl,
            'expiresAt' => $this->invitation->expires_at ? $this->invitation->expires_at->format('M d, Y h:i A') : 'in 48 hours',
        ];
    }
}
