<?php

declare(strict_types=1);

namespace App\Mail;

use App\Mail\Enums\MailSenderType;
use App\Models\BookingToken;
use App\Models\Tenant;
use Carbon\Carbon;

class BookingCancelledMail extends MedVisitMailable
{
    public function __construct(
        public BookingToken $token,
        public ?string $reason = null,
        public ?Tenant $tenant = null,
        public ?string $clinicName = null
    ) {
        $resolvedClinicName = $clinicName ?? $tenant?->name ?? 'Clinic';
        $this->withClinicBrand($tenant, $resolvedClinicName, $tenant?->email ?? null);
        $this->tenantId = $tenant?->id ?? $token->tenant_id;
        $this->preheaderText = "Your channeling token #{$this->token->token_number} at {$resolvedClinicName} has been cancelled.";
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'patient.token_cancelled';
    }

    public function subjectLine(): string
    {
        $clinic = $this->onBehalfOfClinicName ?? 'Clinic';

        return "Appointment Cancelled: Token #{$this->token->token_number} — {$clinic}";
    }

    public function htmlView(): string
    {
        return 'emails.booking_cancelled';
    }

    public function textView(): string
    {
        return 'emails.text.booking_cancelled';
    }

    public function viewData(): array
    {
        $session = $this->token->doctorSession;
        $doctor = $session?->doctor;
        $sDate = $session?->session_date instanceof Carbon ? $session->session_date : Carbon::parse($session?->session_date ?? 'today');

        $baseDomain = config('medvisit.base_domain', 'medvisit.lk');
        $subdomain = $this->tenant?->subdomain ?? 'clinic';
        $rebookUrl = "https://{$subdomain}.{$baseDomain}/book";

        return [
            'tokenNumber' => $this->token->token_number,
            'reason' => $this->reason ?? ($this->token->cancellation_reason ?? 'Cancelled per patient or doctor request'),
            'patientName' => $this->token->patient?->name ?? 'Patient',
            'doctorName' => trim(($doctor?->title ?? 'Dr.').' '.($doctor?->name ?? 'Doctor')),
            'sessionDate' => $sDate->format('l, F j, Y'),
            'clinicName' => $this->onBehalfOfClinicName,
            'clinicPhone' => $this->clinicPhone ?? $this->tenant?->phone,
            'rebookUrl' => $rebookUrl,
        ];
    }
}
