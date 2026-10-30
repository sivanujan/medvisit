<?php

declare(strict_types=1);

namespace App\Mail\Subscription;

use App\Mail\Enums\MailSenderType;
use App\Mail\MedVisitMailable;
use App\Models\Tenant;
use App\Models\WebsiteTemplate;

class TemplateDowngradeNoticeMail extends MedVisitMailable
{
    public function __construct(
        public Tenant $tenant,
        public WebsiteTemplate $template,
        public string $effectiveDateFormatted,
        public string $purchaseUrl,
        public string $priceFormatted = 'Rs. 3,500'
    ) {
        $this->tenantId = $tenant->id;
        $this->onBehalfOfClinicName = $tenant->name;
    }

    public function senderType(): MailSenderType
    {
        return MailSenderType::Notifications;
    }

    public function emailType(): string
    {
        return 'subscription.template_downgrade_notice';
    }

    public function subjectLine(): string
    {
        return "Action required: Your free website template ends on {$this->effectiveDateFormatted}";
    }

    public function htmlView(): string
    {
        return 'emails.subscription.template_downgrade_notice';
    }

    public function textView(): string
    {
        return 'emails.subscription.text.template_downgrade_notice';
    }

    public function viewData(): array
    {
        return [
            'clinicName' => $this->tenant->name,
            'templateName' => $this->template->name,
            'effectiveDate' => $this->effectiveDateFormatted,
            'purchaseUrl' => $this->purchaseUrl,
            'priceFormatted' => $this->priceFormatted,
        ];
    }
}
