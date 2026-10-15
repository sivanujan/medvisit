<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\StaffInvitation;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StaffInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public StaffInvitation $invitation,
        public string $acceptUrl,
        public string $clinicName
    ) {}

    public function envelope(): Envelope
    {
        $senderName = "{$this->clinicName} via MedVisit";

        return new Envelope(
            from: new Address(config('mail.from.address', 'notifications@medvisit.lk'), $senderName),
            subject: "Invitation to join {$this->clinicName} on MedVisit",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.staff_invite',
        );
    }
}
