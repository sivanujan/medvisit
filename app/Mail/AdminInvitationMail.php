<?php

declare(strict_types=1);

namespace App\Mail;

use App\Mail\Enums\MailSenderType;
use App\Models\AdminInvitation;

class AdminInvitationMail extends MedVisitMailable
{
    public function __construct(
        public AdminInvitation $invitation,
        public string $inviteUrl,
        public ?string $invitedByName = null
    ) {
        $this->preheaderText = 'You have been invited to join the MedVisit Platform engineering and operations team as a Super Administrator.';
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'admin.invitation';
    }

    public function subjectLine(): string
    {
        return 'Invitation to join MedVisit as Super Administrator';
    }

    public function htmlView(): string
    {
        return 'emails.admin_invitation';
    }

    public function textView(): string
    {
        return 'emails.text.admin_invitation';
    }

    public function viewData(): array
    {
        return [
            'email' => $this->invitation->email,
            'invitedBy' => $this->invitedByName ?? 'A Platform Administrator',
            'inviteUrl' => $this->inviteUrl,
            'expiresAt' => $this->invitation->expires_at ? $this->invitation->expires_at->timezone('Asia/Colombo')->format('M d, Y h:i A T') : 'in 48 hours',
        ];
    }
}
