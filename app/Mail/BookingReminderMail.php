<?php

declare(strict_types=1);

namespace App\Mail;

use App\Mail\Enums\MailSenderType;
use App\Models\BookingToken;
use App\Models\Tenant;
use Carbon\Carbon;

class BookingReminderMail extends MedVisitMailable
{
    public function __construct(
        public BookingToken $token,
        public ?Tenant $tenant = null,
        public ?string $clinicName = null
    ) {
        $resolvedClinicName = $clinicName ?? $tenant?->name ?? 'Clinic';
        $this->withClinicBrand($tenant, $resolvedClinicName, $tenant?->email ?? null);
        $this->tenantId = $tenant?->id ?? $token->tenant_id;
        $this->preheaderText = 'Friendly reminder: Your appointment with '.($token->doctorSession?->doctor?->name ?? 'Doctor')." is today. Token #{$this->token->token_number}.";
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'patient.booking_reminder';
    }

    public function subjectLine(): string
    {
        $clinic = $this->onBehalfOfClinicName ?? 'Clinic';

        return "Appointment Reminder: Token #{$this->token->token_number} — {$clinic}";
    }

    public function htmlView(): string
    {
        return 'emails.booking_reminder';
    }

    public function textView(): string
    {
        return 'emails.text.booking_reminder';
    }

    public function viewData(): array
    {
        $session = $this->token->doctorSession;
        $doctor = $session?->doctor;
        $sDate = $session?->session_date instanceof Carbon ? $session->session_date : Carbon::parse($session?->session_date ?? 'today');

        $approxTime = $this->token->estimated_time
            ? Carbon::parse($this->token->estimated_time)->format('h:i A')
            : ($session ? Carbon::parse($session->start_time)->format('h:i A') : 'TBD');

        $clinicAddress = $this->clinicAddress ?? $this->tenant?->address;
        $mapUrl = ! empty($clinicAddress)
            ? 'https://www.google.com/maps/search/?api=1&query='.urlencode($clinicAddress)
            : 'https://www.google.com/maps/search/?api=1&query='.urlencode($this->onBehalfOfClinicName ?? 'Sri Lanka Clinic');

        return [
            'tokenNumber' => $this->token->token_number,
            'patientName' => $this->token->patient?->name ?? 'Patient',
            'doctorName' => trim(($doctor?->title ?? 'Dr.').' '.($doctor?->name ?? 'Doctor')),
            'doctorSpecialty' => $doctor?->specialty ?? 'General Practice',
            'sessionDate' => $sDate->format('l, F j, Y'),
            'sessionTime' => $session ? Carbon::parse($session->start_time)->format('h:i A').' – '.Carbon::parse($session->end_time)->format('h:i A') : 'Scheduled Session',
            'approxTime' => $approxTime,
            'roomNumber' => $session?->room_number ?? 'Consultation Suite',
            'clinicName' => $this->onBehalfOfClinicName,
            'clinicAddress' => $clinicAddress,
            'clinicPhone' => $this->clinicPhone ?? $this->tenant?->phone,
            'mapUrl' => $mapUrl,
        ];
    }
}
