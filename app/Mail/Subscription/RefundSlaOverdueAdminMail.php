<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\RefundRequest;
use Illuminate\Support\Collection;

class RefundSlaOverdueAdminMail extends MedVisitMailable
{
    /**
     * @param  Collection<RefundRequest>  $undecidedOverdue
     * @param  Collection<RefundRequest>  $unrefundedOverdue
     */
    public function __construct(
        public Collection $undecidedOverdue,
        public Collection $unrefundedOverdue,
        public string $adminUrl
    ) {
        $this->tenantId = null;
        $this->onBehalfOfClinicName = 'MedVisit Platform';
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'super_admin.refund_sla_overdue';
    }

    public function subjectLine(): string
    {
        $total = $this->undecidedOverdue->count() + $this->unrefundedOverdue->count();

        return "Action Required: {$total} refund request(s) exceed SLA timeline";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.refund_sla_overdue';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.refund_sla_overdue';
    }

    public function viewData(): array
    {
        return [
            'undecidedOverdue' => $this->undecidedOverdue,
            'unrefundedOverdue' => $this->unrefundedOverdue,
            'adminUrl' => $this->adminUrl,
        ];
    }
}
