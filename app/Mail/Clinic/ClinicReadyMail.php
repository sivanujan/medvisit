<?php

declare(strict_types=1);

namespace App\Mail\Clinic;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\Tenant;

class ClinicReadyMail extends MedVisitMailable
{
    public function __construct(
        public Tenant $tenant,
        public string $bookingUrl,
        public string $dashboardUrl,
        public string $qrCodeDataUri = ''
    ) {
        $this->tenantId = (string) $tenant->id;
        $this->onBehalfOfClinicName = (string) $tenant->name;
        $this->clinicLogoUrl = $tenant->logo_png_url ?? $tenant->logo_url;
        $this->clinicAddress = (string) ($tenant->formatted_address ?: $tenant->address);
        $this->clinicPhone = (string) $tenant->phone;
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'clinic.ready';
    }

    public function subjectLine(): string
    {
        return "{$this->tenant->name} is ready on MedVisit";
    }

    public function htmlView(): string
    {
        return 'emails.clinic.ready';
    }

    public function textView(): string
    {
        return 'emails.clinic.text.ready';
    }

    public function viewData(): array
    {
        return [
            'clinicName' => $this->tenant->name,
            'clinicAddress' => $this->clinicAddress,
            'clinicPhone' => $this->clinicPhone,
            'bookingUrl' => $this->bookingUrl,
            'dashboardUrl' => $this->dashboardUrl,
            'qrCodeDataUri' => $this->qrCodeDataUri,
        ];
    }
}
