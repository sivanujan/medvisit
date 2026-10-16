<?php

declare(strict_types=1);

namespace App\Mail;

use App\Models\BookingToken;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BookingConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public BookingToken $token,
        public string $clinicName
    ) {}

    public function envelope(): Envelope
    {
        $senderName = "{$this->clinicName} via MedVisit";

        return new Envelope(
            from: new Address(config('mail.from.address', 'notifications@medvisit.lk'), $senderName),
            subject: "Your Channeling Appointment Token #{$this->token->token_number} - {$this->clinicName}",
        );
    }

    public function content(): Content
    {
        $session = $this->token->doctorSession;
        $doctor = $session?->doctor;
        $sDate = $session?->session_date instanceof Carbon ? $session->session_date : Carbon::parse($session?->session_date ?? 'today');

        $approxTime = $this->token->estimated_time
            ? Carbon::parse($this->token->estimated_time)->format('h:i A')
            : ($session ? Carbon::parse($session->start_time)->format('h:i A') : 'TBD');

        return new Content(
            view: 'emails.booking_confirmation',
            with: [
                'tokenNumber' => $this->token->token_number,
                'doctorName' => trim(($doctor?->title ?? 'Dr.').' '.($doctor?->name ?? 'Doctor')),
                'doctorSpecialty' => $doctor?->specialty ?? 'Specialist',
                'sessionDate' => $sDate->format('l, F j, Y'),
                'sessionTime' => $session ? Carbon::parse($session->start_time)->format('h:i A').' – '.Carbon::parse($session->end_time)->format('h:i A') : '',
                'approxTime' => $approxTime,
                'roomNumber' => $session?->room_number ?? 'Consultation Suite',
                'patientName' => $this->token->patient?->name ?? 'Patient',
                'signedCode' => $this->token->signed_cancel_token,
            ]
        );
    }
}
