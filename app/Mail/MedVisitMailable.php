<?php

declare(strict_types=1);

namespace App\Mail;

use App\Mail\Enums\MailSenderType;
use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Throwable;

abstract class MedVisitMailable extends Mailable implements ShouldQueue
{
    use Queueable, SerializesModels;

    /**
     * The number of times the queued job may be attempted.
     */
    public int $tries = 3;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var array<int, int>
     */
    public array $backoff = [60, 300, 900];

    /**
     * Tenant identifier for logging and tenancy context.
     */
    public ?string $tenantId = null;

    /**
     * Clinic display name when sending on behalf of a clinic to staff.
     */
    public ?string $onBehalfOfClinicName = null;

    /**
     * Clinic logo URL (PNG, absolute HTTPS).
     */
    public ?string $clinicLogoUrl = null;

    /**
     * Clinic physical address.
     */
    public ?string $clinicAddress = null;

    /**
     * Clinic telephone number.
     */
    public ?string $clinicPhone = null;

    /**
     * Clinic direct reply-to email.
     */
    public ?string $clinicReplyToEmail = null;

    /**
     * Brand mode: 'platform' or 'clinic'.
     */
    public string $brandMode = 'platform';

    /**
     * Optional preheader text (~90 chars) for inbox preview.
     */
    public ?string $preheaderText = null;

    /**
     * Return the sender category for this mailable.
     */
    abstract public function senderType(): MailSenderType;

    /**
     * Return the machine-readable email type identifier for logging and metrics.
     */
    abstract public function emailType(): string;

    /**
     * Return the subject line for this mailable.
     */
    abstract public function subjectLine(): string;

    /**
     * Optional preheader text for this mailable.
     */
    public function preheader(): ?string
    {
        return $this->preheaderText;
    }

    /**
     * Return the Blade view path for the HTML version.
     */
    abstract public function htmlView(): string;

    /**
     * Return the Blade view path for the plain text version.
     */
    abstract public function textView(): string;

    /**
     * Return the view data array.
     *
     * @return array<string, mixed>
     */
    abstract public function viewData(): array;

    /**
     * Associate a tenant with this mailable.
     */
    public function forTenant(Tenant|string|null $tenant): static
    {
        if ($tenant instanceof Tenant) {
            $this->tenantId = $tenant->id;
        } else {
            $this->tenantId = $tenant;
        }

        return $this;
    }

    /**
     * Configure this mailable with clinic branding (patient-facing emails).
     */
    public function withClinicBrand(
        ?Tenant $tenant,
        ?string $clinicName = null,
        ?string $replyToEmail = null
    ): static {
        $this->brandMode = 'clinic';
        $this->onBehalfOfClinicName = $clinicName ?? $tenant?->name ?? 'Clinic';
        $this->clinicLogoUrl = $tenant?->logo_png_url;
        $this->clinicAddress = $tenant?->address;
        $this->clinicPhone = $tenant?->phone;
        $this->clinicReplyToEmail = $replyToEmail;

        if ($tenant) {
            $this->tenantId = $tenant->id;
        }

        return $this;
    }

    /**
     * Mark this email as sent on behalf of a clinic using notifications@.
     */
    public function onBehalfOfClinic(string $clinicName): static
    {
        $this->onBehalfOfClinicName = $clinicName;

        return $this;
    }

    /**
     * Resolve the From address and display name according to MedVisit sender policies.
     */
    public function resolveFromAddress(): Address
    {
        $type = $this->senderType();
        $configKey = "medvisit.mail.from.{$type->value}";

        $address = config("{$configKey}.address", match ($type) {
            MailSenderType::Verify => 'verify@medvisit.lk',
            MailSenderType::Notifications => 'notifications@medvisit.lk',
            MailSenderType::Hello => 'hello@medvisit.lk',
        });

        if ($type === MailSenderType::Notifications && ! empty($this->onBehalfOfClinicName)) {
            $name = "{$this->onBehalfOfClinicName} via MedVisit";
        } else {
            $name = config("{$configKey}.name", 'MedVisit');
        }

        return new Address((string) $address, (string) $name);
    }

    /**
     * Resolve the Reply-To address according to MedVisit policies.
     */
    public function resolveReplyToAddress(): Address
    {
        if (! empty($this->clinicReplyToEmail)) {
            return new Address($this->clinicReplyToEmail, $this->onBehalfOfClinicName ?? 'Clinic');
        }

        $address = config('medvisit.mail.reply_to.address', 'support@medvisit.lk');
        $name = config('medvisit.mail.reply_to.name', 'MedVisit Support');

        return new Address((string) $address, (string) $name);
    }

    /**
     * Get the message envelope.
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            from: $this->resolveFromAddress(),
            replyTo: [$this->resolveReplyToAddress()],
            subject: $this->subjectLine(),
        );
    }

    /**
     * Get the message content definition.
     */
    public function content(): Content
    {
        $mergedData = array_merge([
            'brandMode' => $this->brandMode,
            'clinicName' => $this->onBehalfOfClinicName,
            'clinicLogo' => $this->clinicLogoUrl,
            'clinicAddress' => $this->clinicAddress,
            'clinicPhone' => $this->clinicPhone,
            'preheader' => $this->preheader() ?? $this->subjectLine(),
            'subject' => $this->subjectLine(),
        ], $this->viewData());

        return new Content(
            view: $this->htmlView(),
            text: $this->textView(),
            with: $mergedData,
        );
    }

    /**
     * Handle a permanent job failure.
     * Logs tenant id and email type without logging email body or sensitive tokens.
     */
    public function failed(?Throwable $exception): void
    {
        Log::error('Permanent email failure', [
            'tenant_id' => $this->tenantId,
            'email_type' => $this->emailType(),
            'exception_class' => $exception ? get_class($exception) : null,
            'exception_message' => $exception?->getMessage(),
        ]);
    }
}
