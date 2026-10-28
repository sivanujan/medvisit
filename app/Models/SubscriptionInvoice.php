<?php

declare(strict_types=1);

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class SubscriptionInvoice extends Model
{
    use HasFactory;

    public const STATUS_UNPAID = 'unpaid';

    public const STATUS_PAID = 'paid';

    public const STATUS_FAILED = 'failed';

    public const STATUS_VOID = 'void';

    public const TYPE_SUBSCRIPTION = 'subscription';

    public const TYPE_PRORATION = 'proration';

    public const TYPE_MANUAL = 'manual';

    public const TYPE_TEMPLATE_PURCHASE = 'template_purchase';

    protected $fillable = [
        'tenant_id',
        'subscription_id',
        'is_test',
        'type',
        'invoice_number',
        'receipt_number',
        'amount_cents',
        'period_start',
        'period_end',
        'due_date',
        'status',
        'paid_at',
        'payment_method',
        'billing_details',
        'notes',
    ];

    protected $casts = [
        'is_test' => 'boolean',
        'amount_cents' => 'integer',
        'period_start' => 'datetime',
        'period_end' => 'datetime',
        'due_date' => 'datetime',
        'paid_at' => 'datetime',
        'billing_details' => 'array',
    ];

    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(PaymentTransaction::class, 'invoice_id');
    }

    public function getFormattedAmountAttribute(): string
    {
        return 'Rs. '.number_format($this->amount_cents / 100, 2);
    }

    /**
     * Generate an atomic, race-safe invoice number in format INV-YYYY-000001
     */
    public static function generateInvoiceNumber(): string
    {
        $year = (int) Carbon::now('Asia/Colombo')->year;

        return DB::transaction(function () use ($year) {
            $last = self::where('invoice_number', 'LIKE', "INV-{$year}-%")
                ->lockForUpdate()
                ->orderByDesc('id')
                ->first();

            $seq = 1;
            if ($last && preg_match('/INV-\d{4}-(\d+)/', $last->invoice_number, $matches)) {
                $seq = ((int) $matches[1]) + 1;
            }

            return sprintf('INV-%04d-%06d', $year, $seq);
        });
    }

    /**
     * Generate a global race-safe receipt number in format RCPT-YYYY-000001
     */
    public static function generateReceiptNumber(): string
    {
        $year = (int) Carbon::now('Asia/Colombo')->year;

        return DB::transaction(function () use ($year) {
            $record = DB::table('receipt_sequences')
                ->where('year', $year)
                ->lockForUpdate()
                ->first();

            if (! $record) {
                DB::table('receipt_sequences')->insert([
                    'year' => $year,
                    'current_number' => 1,
                    'created_at' => Carbon::now(),
                    'updated_at' => Carbon::now(),
                ]);
                $next = 1;
            } else {
                $next = $record->current_number + 1;
                DB::table('receipt_sequences')
                    ->where('year', $year)
                    ->update([
                        'current_number' => $next,
                        'updated_at' => Carbon::now(),
                    ]);
            }

            return sprintf('RCPT-%04d-%06d', $year, $next);
        });
    }
}
