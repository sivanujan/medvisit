<?php

declare(strict_types=1);

namespace App\Services\Templates;

use App\Contracts\PaymentGateway;
use App\Models\PaymentTransaction;
use App\Models\SubscriptionInvoice;
use App\Models\TemplatePurchase;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WebsiteTemplate;
use App\Services\AuditLogger;
use App\Services\Billing\SubscriptionNotificationService;
use App\Services\PlatformSettingsService;
use App\Support\ClinicWebsite;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class TemplateService
{
    public function __construct(
        protected PaymentGateway $gateway,
        protected PlatformSettingsService $settingsService,
        protected ?SubscriptionNotificationService $notificationService = null
    ) {
        $this->notificationService = $notificationService ?? app(SubscriptionNotificationService::class);
    }

    /**
     * Get the full templates gallery formatted for a clinic tenant.
     *
     * @return array{
     *     templates: array<int, mixed>,
     *     plan_info: array{
     *         plan: string,
     *         is_advanced: bool,
     *         free_limit: int,
     *         free_claimed_id: ?int,
     *         can_claim_free: bool,
     *         can_change_free_choice: bool,
     *         days_until_can_change: int,
     *     },
     *     applied_template_id: ?int,
     *     can_revert: bool
     * }
     */
    public function getGallery(Tenant $tenant): array
    {
        $allTemplates = WebsiteTemplate::active()->orderBy('sort_order')->get();
        $purchases = TemplatePurchase::forTenant((string) $tenant->id)
            ->whereIn('status', [TemplatePurchase::STATUS_PAID, TemplatePurchase::STATUS_PENDING])
            ->get()
            ->keyBy('template_id');

        $freeLimit = $tenant->getFreeTemplatesLimit();
        $planIncluded = $purchases->firstWhere('source', TemplatePurchase::SOURCE_PLAN_INCLUDED);
        $freeClaimedId = $planIncluded ? $planIncluded->template_id : null;

        $canChangeFreeChoice = true;
        $daysUntilCanChange = 0;
        if ($tenant->free_template_changed_at) {
            $diffDays = Carbon::now()->diffInDays($tenant->free_template_changed_at);
            if ($diffDays < 30) {
                $canChangeFreeChoice = false;
                $daysUntilCanChange = 30 - $diffDays;
            }
        }

        $formatted = $allTemplates->map(function (WebsiteTemplate $t) use ($tenant, $purchases, $freeLimit, $freeClaimedId, $canChangeFreeChoice) {
            $purchase = $purchases->get($t->id);
            $isPaid = $purchase && $purchase->status === TemplatePurchase::STATUS_PAID;
            $isPending = $purchase && $purchase->status === TemplatePurchase::STATUS_PENDING;
            $isPlanIncluded = $purchase && $purchase->source === TemplatePurchase::SOURCE_PLAN_INCLUDED;
            $isApplied = (int) $tenant->applied_template_id === (int) $t->id;
            $isFree = $t->tier === WebsiteTemplate::TIER_FREE || $t->price_cents === 0;

            $canClaimFree = $freeLimit > 0
                && $t->isPremium()
                && (! $isPaid || $isPlanIncluded)
                && ($freeClaimedId === null || ($freeClaimedId !== $t->id && $canChangeFreeChoice));

            return [
                'id' => $t->id,
                'slug' => $t->slug,
                'name' => $t->name,
                'tagline' => $t->tagline,
                'description' => $t->description,
                'tier' => $t->tier,
                'price_cents' => $t->price_cents,
                'price_formatted' => $t->formatted_price,
                'version' => $t->version,
                'tags' => $t->tags ?? [],
                'preview_images' => $t->preview_images ?? [],
                'preview_video_url' => $t->preview_video_url,
                'supports' => $t->supports ?? ['section_editor'],
                'is_active' => $t->is_active,
                'is_free' => $isFree,
                'is_paid' => $isPaid,
                'is_pending' => $isPending,
                'is_plan_included' => $isPlanIncluded,
                'is_applied' => $isApplied,
                'can_claim_free' => $canClaimFree,
                'definition' => $t->definition,
            ];
        })->values()->all();

        return [
            'templates' => $formatted,
            'plan_info' => [
                'plan' => (string) ($tenant->plan ?? 'basic'),
                'is_advanced' => strtolower((string) ($tenant->plan ?? '')) === 'advanced',
                'free_limit' => $freeLimit,
                'free_claimed_id' => $freeClaimedId,
                'can_claim_free' => $freeLimit > 0 && ($freeClaimedId === null || $canChangeFreeChoice),
                'can_change_free_choice' => $canChangeFreeChoice,
                'days_until_can_change' => $daysUntilCanChange,
            ],
            'applied_template_id' => $tenant->applied_template_id ? (int) $tenant->applied_template_id : null,
            'can_revert' => ! empty($tenant->previous_template_snapshot),
        ];
    }

    /**
     * Initiate checkout for a premium template via Payments.lk.
     *
     * @param  array{terms_accepted: bool, terms_version?: string}  $data
     * @return array{checkout_url: ?string, is_demo: bool, success: bool, message?: string}
     */
    public function checkout(Tenant $tenant, User $user, WebsiteTemplate $template, array $data): array
    {
        // 1. Double purchase prevention
        $existing = TemplatePurchase::where('tenant_id', $tenant->id)
            ->where('template_id', $template->id)
            ->where('status', TemplatePurchase::STATUS_PAID)
            ->first();

        if ($existing) {
            return [
                'success' => true,
                'is_demo' => false,
                'checkout_url' => null,
                'message' => 'Template has already been purchased.',
            ];
        }

        // 2. Demo tenant handling
        if ((bool) $tenant->is_demo) {
            TemplatePurchase::updateOrCreate(
                ['tenant_id' => $tenant->id, 'template_id' => $template->id],
                [
                    'source' => TemplatePurchase::SOURCE_PURCHASE,
                    'price_cents' => $template->price_cents,
                    'version_at_purchase' => $template->version,
                    'status' => TemplatePurchase::STATUS_PAID,
                    'purchased_at' => now(),
                    'purchased_by_user_id' => $user->id,
                    'terms_version' => $data['terms_version'] ?? '2026-10-28',
                    'terms_accepted_at' => now(),
                ]
            );

            return [
                'success' => true,
                'is_demo' => true,
                'checkout_url' => null,
                'message' => 'Demo purchase simulated successfully. Template unlocked!',
            ];
        }

        // 3. Reuse or create pending invoice
        return DB::transaction(function () use ($tenant, $user, $template, $data) {
            $invoiceNumber = SubscriptionInvoice::generateInvoiceNumber();
            $reference = "TPL-{$invoiceNumber}";

            $invoice = SubscriptionInvoice::create([
                'tenant_id' => $tenant->id,
                'subscription_id' => null,
                'is_test' => (bool) config('services.paymentslk.sandbox', true),
                'type' => SubscriptionInvoice::TYPE_TEMPLATE_PURCHASE,
                'invoice_number' => $reference,
                'amount_cents' => $template->price_cents,
                'due_date' => Carbon::now()->toDateString(),
                'status' => SubscriptionInvoice::STATUS_UNPAID,
                'billing_details' => [
                    'template_id' => $template->id,
                    'template_slug' => $template->slug,
                    'template_name' => $template->name,
                    'version' => $template->version,
                    'purchaser_email' => $user->email,
                    'purchaser_name' => $user->name,
                ],
                'notes' => "One-time purchase of clinic website template: {$template->name}",
            ]);

            $purchase = TemplatePurchase::updateOrCreate(
                ['tenant_id' => $tenant->id, 'template_id' => $template->id],
                [
                    'source' => TemplatePurchase::SOURCE_PURCHASE,
                    'price_cents' => $template->price_cents,
                    'version_at_purchase' => $template->version,
                    'invoice_id' => $invoice->id,
                    'status' => TemplatePurchase::STATUS_PENDING,
                    'purchased_by_user_id' => $user->id,
                    'terms_version' => $data['terms_version'] ?? '2026-10-28',
                    'terms_accepted_at' => now(),
                ]
            );

            $returnUrl = $tenant->url("/website?template_purchase=return&tpl={$template->slug}");
            $cancelUrl = $tenant->url("/website?template_purchase=cancelled&tpl={$template->slug}");

            $session = $this->gateway->createCheckoutSession([
                'reference' => $reference,
                'amount_cents' => $template->price_cents,
                'currency' => 'LKR',
                'description' => "MedVisit Template: {$template->name} ({$tenant->subdomain})",
                'customer_email' => $user->email,
                'customer_name' => $user->name,
                'return_url' => $returnUrl,
                'cancel_url' => $cancelUrl,
            ]);

            return [
                'success' => true,
                'is_demo' => false,
                'checkout_url' => $session['checkout_url'] ?? null,
                'reference' => $reference,
            ];
        });
    }

    /**
     * Claim free template choice included with Advanced plan.
     */
    public function claimPlanIncluded(Tenant $tenant, User $user, WebsiteTemplate $template): TemplatePurchase
    {
        $freeLimit = $tenant->getFreeTemplatesLimit();
        if ($freeLimit <= 0) {
            abort(403, 'Your clinic plan does not include free premium templates.');
        }

        // Check 30-day change limitation
        if ($tenant->free_template_changed_at) {
            $changedAt = Carbon::parse($tenant->free_template_changed_at);
            $diffDays = (int) abs($changedAt->diffInDays(Carbon::now()));
            if ($diffDays < 30) {
                abort(422, 'Free template choice can only be changed once every 30 days. Please wait '.(30 - $diffDays).' more days.');
            }
        }

        return DB::transaction(function () use ($tenant, $user, $template) {
            // Revoke any previous plan-included claim
            $existing = TemplatePurchase::where('tenant_id', $tenant->id)
                ->where('source', TemplatePurchase::SOURCE_PLAN_INCLUDED)
                ->where('status', TemplatePurchase::STATUS_PAID)
                ->get();

            foreach ($existing as $old) {
                $old->update([
                    'status' => TemplatePurchase::STATUS_REVOKED,
                    'revoked_at' => now(),
                    'revoked_reason' => "Switched to free template choice: {$template->name}",
                ]);

                // If currently applied live, fall back
                if ((int) $tenant->applied_template_id === (int) $old->template_id) {
                    $this->revertToPreviousDesign($tenant);
                }
            }

            $purchase = TemplatePurchase::updateOrCreate(
                ['tenant_id' => $tenant->id, 'template_id' => $template->id],
                [
                    'source' => TemplatePurchase::SOURCE_PLAN_INCLUDED,
                    'price_cents' => 0,
                    'version_at_purchase' => $template->version,
                    'status' => TemplatePurchase::STATUS_PAID,
                    'purchased_at' => now(),
                    'purchased_by_user_id' => $user->id,
                    'terms_version' => '2026-10-28',
                    'terms_accepted_at' => now(),
                ]
            );

            $tenant->free_template_changed_at = now();
            $tenant->save();

            AuditLogger::log('template.plan_included_claimed', [
                'tenant_id' => $tenant->id,
                'user_id' => $user->id,
                'template_id' => $template->id,
                'template_name' => $template->name,
            ]);

            return $purchase;
        });
    }

    /**
     * Process webhook fulfillment for successful template purchase.
     *
     * @param  array{reference: string, amount_cents: int, currency: string, payment_id?: ?string, checkout_id?: ?string}  $paymentDetails
     */
    public function processSuccessfulPurchase(array $paymentDetails, ?array $rawPayload = null): bool
    {
        $reference = $paymentDetails['reference'];
        $amountCents = $paymentDetails['amount_cents'];
        $currency = strtoupper($paymentDetails['currency'] ?? 'LKR');
        $paymentId = $paymentDetails['payment_id'] ?? null;
        $checkoutId = $paymentDetails['checkout_id'] ?? null;

        return DB::transaction(function () use ($reference, $amountCents, $currency, $paymentId, $checkoutId, $rawPayload) {
            $invoice = SubscriptionInvoice::where('invoice_number', $reference)
                ->lockForUpdate()
                ->first();

            if (! $invoice) {
                Log::error("TemplateService: Invoice [{$reference}] not found for template purchase");

                return false;
            }

            if ($currency !== 'LKR' || $amountCents !== $invoice->amount_cents) {
                Log::warning("TemplateService: Currency/amount mismatch on invoice [{$reference}]");

                return false;
            }

            // Record PaymentTransaction
            $paymentTx = PaymentTransaction::updateOrCreate(
                [
                    'tenant_id' => $invoice->tenant_id,
                    'invoice_id' => $invoice->id,
                    'gateway_checkout_id' => $checkoutId,
                ],
                [
                    'gateway' => 'paymentslk',
                    'gateway_payment_id' => $paymentId,
                    'amount_cents' => $amountCents,
                    'currency' => $currency,
                    'status' => PaymentTransaction::STATUS_SUCCEEDED,
                    'raw_payload' => $rawPayload,
                ]
            );

            if ($invoice->status === SubscriptionInvoice::STATUS_PAID) {
                return true; // Idempotent
            }

            $receiptNumber = SubscriptionInvoice::generateReceiptNumber();
            $now = Carbon::now();

            $invoice->update([
                'status' => SubscriptionInvoice::STATUS_PAID,
                'paid_at' => $now,
                'payment_method' => 'paymentslk',
                'receipt_number' => $receiptNumber,
            ]);

            $purchase = TemplatePurchase::where('invoice_id', $invoice->id)->first();
            if ($purchase) {
                $purchase->update([
                    'status' => TemplatePurchase::STATUS_PAID,
                    'purchased_at' => $now,
                    'payment_transaction_id' => $paymentTx->id,
                ]);

                AuditLogger::log('template.purchased', [
                    'tenant_id' => $invoice->tenant_id,
                    'template_id' => $purchase->template_id,
                    'invoice_number' => $invoice->invoice_number,
                    'receipt_number' => $receiptNumber,
                    'amount_cents' => $amountCents,
                ]);
            }

            // Send confirmation email with receipt
            try {
                $this->notificationService->sendPaymentSuccess($invoice);
            } catch (\Throwable $e) {
                Log::warning("TemplateService: Failed sending receipt email: {$e->getMessage()}");
            }

            return true;
        });
    }

    /**
     * Apply a template to the tenant's draft.
     */
    public function applyToDraft(Tenant $tenant, WebsiteTemplate $template): void
    {
        if (! config('medvisit.templates_under_development', true) && ! $tenant->isTemplateEntitled($template)) {
            abort(403, 'Your clinic is not entitled to apply this premium template. Please purchase it first.');
        }

        // Snapshot existing look & sections before applying new template
        if (empty($tenant->previous_template_snapshot)) {
            $tenant->previous_template_snapshot = [
                'applied_template_id' => $tenant->applied_template_id,
                'applied_template_version' => $tenant->applied_template_version,
                'website_look' => $tenant->website_look,
                'website_sections' => $tenant->website_sections,
                'snapshotted_at' => now()->toIso8601String(),
            ];
        }

        $tenant->applied_template_id = $template->id;
        $tenant->applied_template_version = $template->version;

        // Apply theme tokens to look draft
        $tokens = $template->definition['theme_tokens'] ?? [];
        $currentLook = ClinicWebsite::draftLook($tenant);
        $newLook = array_merge($currentLook, [
            'theme' => $tokens['theme'] ?? $currentLook['theme'],
            'hero_style' => $tokens['hero_style'] ?? $currentLook['hero_style'],
            'font' => $tokens['font'] ?? $currentLook['font'],
            'button_style' => $tokens['button_style'] ?? $currentLook['button_style'],
            'mode' => $tokens['mode'] ?? $currentLook['mode'],
            'brand_color' => $tokens['brand_color'] ?? $currentLook['brand_color'],
        ]);

        $tenant->website_look_draft = ClinicWebsite::normalizeLook($newLook, $tenant);

        // Section variants mapping (keeps all clinic data safe)
        $sections = ClinicWebsite::draftSections($tenant);
        $variants = $template->definition['section_variants'] ?? [];

        foreach ($sections as &$sec) {
            $type = $sec['type'] ?? $sec['id'];
            if (isset($variants[$type])) {
                $sec = array_merge($sec, $variants[$type]);
            }
        }
        unset($sec);

        $tenant->website_sections_draft = $sections;
        $tenant->save();

        AuditLogger::log('template.applied_to_draft', [
            'tenant_id' => $tenant->id,
            'template_id' => $template->id,
            'template_name' => $template->name,
        ]);
    }

    /**
     * Revert draft and/or live site to previous design snapshot.
     */
    public function revertToPreviousDesign(Tenant $tenant): bool
    {
        $snapshot = $tenant->previous_template_snapshot;
        if (empty($snapshot)) {
            return false;
        }

        $tenant->applied_template_id = $snapshot['applied_template_id'] ?? null;
        $tenant->applied_template_version = $snapshot['applied_template_version'] ?? null;
        $tenant->website_look_draft = $snapshot['website_look'] ?? null;
        $tenant->website_sections_draft = $snapshot['website_sections'] ?? null;
        $tenant->previous_template_snapshot = null;
        $tenant->save();

        return true;
    }

    /**
     * Handles subscription downgrade from Advanced plan.
     */
    public function onDowngradeFromAdvanced(Tenant $tenant): void
    {
        // 1. Revoke plan-included entitlements
        $purchases = TemplatePurchase::where('tenant_id', $tenant->id)
            ->where('source', TemplatePurchase::SOURCE_PLAN_INCLUDED)
            ->where('status', TemplatePurchase::STATUS_PAID)
            ->get();

        foreach ($purchases as $p) {
            $p->update([
                'status' => TemplatePurchase::STATUS_REVOKED,
                'revoked_at' => now(),
                'revoked_reason' => 'Clinic downgraded from Advanced plan.',
            ]);

            // If template was live on the clinic, gracefully fall back
            if ((int) $tenant->applied_template_id === (int) $p->template_id) {
                // Check if clinic has purchased it separately
                $hasPaid = TemplatePurchase::where('tenant_id', $tenant->id)
                    ->where('template_id', $p->template_id)
                    ->where('source', TemplatePurchase::SOURCE_PURCHASE)
                    ->where('status', TemplatePurchase::STATUS_PAID)
                    ->exists();

                if (! $hasPaid) {
                    $this->revertToPreviousDesign($tenant);
                    ClinicWebsite::publish($tenant); // Update live site safely
                }
            }
        }
    }
}
