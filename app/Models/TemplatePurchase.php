<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TemplatePurchase extends Model
{
    use HasFactory;

    public const SOURCE_PURCHASE = 'purchase';

    public const SOURCE_PLAN_INCLUDED = 'plan_included';

    public const SOURCE_ADMIN_GRANT = 'admin_grant';

    public const STATUS_PENDING = 'pending';

    public const STATUS_PAID = 'paid';

    public const STATUS_REFUNDED = 'refunded';

    public const STATUS_REVOKED = 'revoked';

    protected $fillable = [
        'tenant_id',
        'template_id',
        'source',
        'price_cents',
        'version_at_purchase',
        'invoice_id',
        'payment_transaction_id',
        'status',
        'purchased_at',
        'first_published_at',
        'refunded_at',
        'revoked_at',
        'revoked_reason',
        'purchased_by_user_id',
        'terms_version',
        'terms_accepted_at',
    ];

    protected $casts = [
        'price_cents' => 'integer',
        'purchased_at' => 'datetime',
        'first_published_at' => 'datetime',
        'refunded_at' => 'datetime',
        'revoked_at' => 'datetime',
        'terms_accepted_at' => 'datetime',
    ];

    /**
     * Parent template.
     *
     * @return BelongsTo<WebsiteTemplate, $this>
     */
    public function template(): BelongsTo
    {
        return $this->belongsTo(WebsiteTemplate::class, 'template_id');
    }

    /**
     * Associated tenant.
     *
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Associated invoice.
     *
     * @return BelongsTo<SubscriptionInvoice, $this>
     */
    public function invoice(): BelongsTo
    {
        return $this->belongsTo(SubscriptionInvoice::class, 'invoice_id');
    }

    /**
     * Associated payment transaction.
     *
     * @return BelongsTo<PaymentTransaction, $this>
     */
    public function paymentTransaction(): BelongsTo
    {
        return $this->belongsTo(PaymentTransaction::class, 'payment_transaction_id');
    }

    /**
     * Purchasing user.
     *
     * @return BelongsTo<User, $this>
     */
    public function purchaser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'purchased_by_user_id');
    }

    /**
     * Scope for active / usable entitlements.
     *
     * @param  Builder<TemplatePurchase>  $query
     */
    public function scopeActive(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PAID);
    }

    /**
     * Scope for a specific tenant.
     *
     * @param  Builder<TemplatePurchase>  $query
     */
    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where('tenant_id', $tenantId);
    }

    /**
     * Formatted price.
     */
    public function getFormattedPriceAttribute(): string
    {
        if ($this->source === self::SOURCE_PLAN_INCLUDED) {
            return 'Included with plan';
        }

        if ($this->source === self::SOURCE_ADMIN_GRANT) {
            return 'Granted by Admin';
        }

        return 'Rs. '.number_format($this->price_cents / 100, 0);
    }

    /**
     * Has this template ever been published to the live site?
     */
    public function isEverPublished(): bool
    {
        return $this->first_published_at !== null;
    }
}
