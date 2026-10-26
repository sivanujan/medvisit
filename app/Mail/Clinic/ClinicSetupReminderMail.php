<?php

declare(strict_types=1);

namespace App\Mail\Clinic;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\Tenant;

class ClinicSetupReminderMail extends MedVisitMailable
{
    public function __construct(
        public Tenant $tenant,
        public string $setupUrl,
        public int $daysRemaining
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
        return 'clinic.setup_reminder';
    }

    public function subjectLine(): string
    {
        return "Complete setup for {$this->tenant->name} — MedVisit";
    }

    public function htmlView(): string
    {
        return 'emails.clinic.setup_reminder';
    }

    public function textView(): string
    {
        return 'emails.clinic.text.setup_reminder';
    }

    public function viewData(): array
    {
        return [
            'clinicName' => $this->tenant->name,
            'setupUrl' => $this->setupUrl,
            'daysRemaining' => $this->daysRemaining,
        ];
    }
}
