<?php

declare(strict_types=1);

namespace App\Mail\Auth;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\Tenant;
use App\Models\User;

class WelcomeClinicMail extends MedVisitMailable
{
    public string $clinicUrl;

    public string $formattedTrialEnd;

    public function __construct(
        public Tenant $tenant,
        public User $user,
    ) {
        $this->forTenant($this->tenant);
        $this->clinicUrl = $this->tenant->url('/login');

        $trialEnd = $this->tenant->trial_ends_at ?? now()->addDays(14);
        $this->formattedTrialEnd = $trialEnd->copy()->timezone('Asia/Colombo')->format('F j, Y');
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Hello;
    }

    public function emailType(): string
    {
        return 'auth.welcome_clinic';
    }

    public function subjectLine(): string
    {
        return "Welcome to MedVisit - {$this->tenant->name}";
    }

    public function htmlView(): string
    {
        return 'emails.auth.welcome_clinic';
    }

    public function textView(): string
    {
        return 'emails.text.auth.welcome_clinic';
    }

    public function viewData(): array
    {
        return [
            'adminName' => $this->user->name,
            'clinicName' => $this->tenant->name,
            'subdomain' => $this->tenant->subdomain,
            'clinicUrl' => $this->clinicUrl,
            'trialEnd' => $this->formattedTrialEnd,
            'reason' => 'You received this email because you registered your clinic on MedVisit.',
        ];
    }
}
