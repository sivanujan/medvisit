<?php

declare(strict_types=1);

namespace App\Mail;

use App\Mail\Enums\MailSenderType;
use App\Models\Plan;
use App\Models\SubscriptionInvite;

class SubscriptionInviteMail extends MedVisitMailable
{
    public function __construct(
        public SubscriptionInvite $invite,
        public string $plainToken
    ) {}

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'subscription.invite';
    }

    public function subjectLine(): string
    {
        $plan = Plan::where('slug', $this->invite->plan_slug)->first();
        $planName = $plan ? $plan->name : ucfirst($this->invite->plan_slug);
        $period = $this->invite->free_period_value.' '.($this->invite->free_period_type === 'months' ? 'month(s)' : 'day(s)');

        return "You're invited to MedVisit — {$period} free on the {$planName} Plan";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.invite';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.invite';
    }

    public function viewData(): array
    {
        $plan = Plan::where('slug', $this->invite->plan_slug)->first();
        $planName = $plan ? $plan->name : ucfirst($this->invite->plan_slug);
        $period = $this->invite->free_period_value.' '.($this->invite->free_period_type === 'months' ? 'month(s)' : 'day(s)');
        $baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.lk'));
        $scheme = config('app.env') === 'local' ? 'http' : 'https';
        $port = config('app.env') === 'local' ? ':8000' : '';
        $inviteUrl = "{$scheme}://{$baseDomain}{$port}/register?invite={$this->plainToken}";

        return [
            'recipientName' => $this->invite->recipient_name ?: 'Doctor / Clinic Administrator',
            'clinicName' => $this->invite->clinic_name,
            'planName' => $planName,
            'freePeriod' => $period,
            'inviteUrl' => $inviteUrl,
            'expiresAt' => $this->invite->expires_at->setTimezone('Asia/Colombo')->format('d M Y, h:i A'),
        ];
    }
}
