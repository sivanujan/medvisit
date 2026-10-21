<?php

declare(strict_types=1);

namespace App\Mail;

use App\Mail\Enums\MailSenderType;
use App\Models\BookingToken;
use App\Models\Tenant;
use Carbon\Carbon;

class BookingTokenMovedMail extends MedVisitMailable
{
    public function __construct(
        public BookingToken $token,
        public int $oldTokenNumber,
        public ?string $reason = null,
        public ?Tenant $tenant = null,
        public ?string $clinicName = null
    ) {
        $resolvedClinicName = $clinicName ?? $tenant?->name ?? 'Clinic';
        $this->withClinicBrand($tenant, $resolvedClinicName, $tenant?->email ?? null);
        $this->tenantId = $tenant?->id ?? $token->tenant_id;
        $this->preheaderText = "Your channeling token has been updated to #{$this->token->token_number} at {$resolvedClinicName}.";
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'patient.token_moved';
    }

    public function subjectLine(): string
    {
        $clinic = $this->onBehalfOfClinicName ?? 'Clinic';

        return "Token Updated: #{$this->oldTokenNumber} \u{2192} #{$this->token->token_number} — {$clinic}";
    }

    public function htmlView(): string
    {
        return 'emails.booking_token_moved';
    }

    public function textView(): string
    {
        return 'emails.text.booking_token_moved';
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
            'newTokenNumber' => $this->token->token_number,
            'oldTokenNumber' => $this->oldTokenNumber,
            'reason' => $this->reason ?? 'Schedule optimization or patient request',
            'patientName' => $this->token->patient?->name ?? 'Patient',
            'doctorName' => trim(($doctor?->title ?? 'Dr.').' '.($doctor?->name ?? 'Doctor')),
            'doctorSpecialty' => $doctor?->specialty ?? 'General Practice',
            'sessionDate' => $sDate->format('l, F j, Y'),
            'approxTime' => $approxTime,
            'roomNumber' => $session?->room_number ?? 'Consultation Suite',
            'clinicName' => $this->onBehalfOfClinicName,
            'clinicAddress' => $clinicAddress,
            'clinicPhone' => $this->clinicPhone ?? $this->tenant?->phone,
            'mapUrl' => $mapUrl,
        ];
    }
}
