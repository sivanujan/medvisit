<?php

declare(strict_types=1);

use App\Models\AuditEvent;
use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\DoctorSettlement;
use App\ValueObjects\FeeSnapshot;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add paid_at and fee_snapshot_backup to bills
        Schema::table('bills', function (Blueprint $table) {
            if (! Schema::hasColumn('bills', 'paid_at')) {
                $table->timestampTz('paid_at')->nullable()->after('payment_status');
                $table->index(['tenant_id', 'paid_at']);
            }
            if (! Schema::hasColumn('bills', 'fee_snapshot_backup')) {
                $table->json('fee_snapshot_backup')->nullable()->after('fee_snapshot');
            }
        });

        // 2. Add fee_snapshot_backup to booking_tokens
        Schema::table('booking_tokens', function (Blueprint $table) {
            if (! Schema::hasColumn('booking_tokens', 'fee_snapshot_backup')) {
                $table->json('fee_snapshot_backup')->nullable()->after('fee_snapshot');
            }
        });

        // 3. Update doctor_settlements with legacy, void and adjustment tracking
        Schema::table('doctor_settlements', function (Blueprint $table) {
            if (! Schema::hasColumn('doctor_settlements', 'is_legacy')) {
                $table->boolean('is_legacy')->default(false)->after('payment_status');
            }
            if (! Schema::hasColumn('doctor_settlements', 'is_voided')) {
                $table->boolean('is_voided')->default(false)->after('is_legacy');
                $table->text('void_reason')->nullable()->after('is_voided');
                $table->timestampTz('voided_at')->nullable()->after('void_reason');
                $table->foreignId('voided_by')->nullable()->constrained('users')->nullOnDelete()->after('voided_at');
            }
            if (! Schema::hasColumn('doctor_settlements', 'adjustments_total')) {
                $table->integer('adjustments_total')->default(0)->after('paid_amount');
            }
        });

        // 4. Create payout_settlement_items table (Bill-level locking)
        if (! Schema::hasTable('payout_settlement_items')) {
            Schema::create('payout_settlement_items', function (Blueprint $table) {
                $table->id();
                $table->string('tenant_id', 50);
                $table->foreignId('doctor_settlement_id')->constrained('doctor_settlements')->cascadeOnDelete();
                $table->foreignId('bill_id')->constrained('bills')->cascadeOnDelete();
                $table->unsignedInteger('consultation_fee_cents')->default(0);
                $table->unsignedInteger('doctor_share_cents')->default(0);
                $table->unsignedInteger('clinic_share_cents')->default(0);
                $table->timestampsTz();

                $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
                $table->unique(['tenant_id', 'bill_id'], 'payout_items_tenant_bill_unique');
                $table->index(['tenant_id', 'doctor_settlement_id']);
            });
        }

        // 5. Create settlement_adjustments table
        if (! Schema::hasTable('settlement_adjustments')) {
            Schema::create('settlement_adjustments', function (Blueprint $table) {
                $table->id();
                $table->string('tenant_id', 50);
                $table->foreignId('doctor_id')->constrained('doctors')->cascadeOnDelete();
                $table->foreignId('doctor_settlement_id')->nullable()->constrained('doctor_settlements')->nullOnDelete();
                $table->foreignId('bill_id')->nullable()->constrained('bills')->nullOnDelete();
                $table->string('type', 50)->default('refund'); // refund, bonus, deduction, credit
                $table->integer('amount_cents'); // Signed integer (e.g. -250000 for refund)
                $table->string('reason', 255);
                $table->timestampTz('applied_at')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestampsTz();

                $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
                $table->index(['tenant_id', 'doctor_id', 'doctor_settlement_id'], 'settle_adj_tenant_doc_set_idx');
            });
        }

        // --- BACKFILL SECTION ---
        $this->backfillPaidAt();
        $this->normaliseFeeSnapshots();
        $this->linkLegacySettlements();
    }

    /**
     * Backfill bills.paid_at timestamp and report sources.
     */
    protected function backfillPaidAt(): void
    {
        $bills = Bill::where('payment_status', Bill::STATUS_PAID)
            ->whereNull('paid_at')
            ->get();

        $auditSourceCount = 0;
        $createdSourceCount = 0;

        foreach ($bills as $bill) {
            $paymentAudit = AuditEvent::where('resource_id', (string) $bill->id)
                ->whereIn('action', ['billing.payment_collected', 'billing.paid'])
                ->latest('created_at')
                ->first();

            if ($paymentAudit && $paymentAudit->created_at) {
                $bill->updateQuietly(['paid_at' => $paymentAudit->created_at]);
                $auditSourceCount++;
            } else {
                // Use created_at as it preserves the original demo billing date
                $bill->updateQuietly(['paid_at' => $bill->created_at ?? $bill->updated_at ?? now()]);
                $createdSourceCount++;
            }
        }

        Log::info("bills.paid_at backfilled: {$auditSourceCount} from audit log, {$createdSourceCount} from created_at.");
    }

    /**
     * Normalise existing fee snapshots to canonical unified schema.
     */
    protected function normaliseFeeSnapshots(): void
    {
        // 1. Booking Tokens
        $tokens = BookingToken::with('session.doctor')->whereNotNull('fee_snapshot')->get();
        foreach ($tokens as $token) {
            $original = $token->fee_snapshot;
            if (empty($original) || isset($original['version']) && $original['version'] === 2) {
                continue;
            }

            try {
                $snapshotVO = FeeSnapshot::fromArray($original, $token->session);
                $token->updateQuietly([
                    'fee_snapshot_backup' => $original,
                    'fee_snapshot' => $snapshotVO->toUnifiedArray(),
                ]);
            } catch (Throwable $e) {
                Log::warning("Could not normalise token #{$token->id} snapshot: ".$e->getMessage());
            }
        }

        // 2. Bills
        $bills = Bill::with('token.session.doctor')->get();
        foreach ($bills as $bill) {
            $original = $bill->fee_snapshot ?? $bill->token?->fee_snapshot;
            if (empty($original)) {
                continue;
            }

            try {
                $snapshotVO = FeeSnapshot::fromArray($original, $bill->token?->session);
                $bill->updateQuietly([
                    'fee_snapshot_backup' => $original,
                    'fee_snapshot' => $snapshotVO->toUnifiedArray(),
                ]);
            } catch (Throwable $e) {
                Log::warning("Could not normalise bill #{$bill->id} snapshot: ".$e->getMessage());
            }
        }
    }

    /**
     * Link existing legacy settlements to matching bills and lock them.
     */
    protected function linkLegacySettlements(): void
    {
        $settlements = DoctorSettlement::whereNull('is_legacy')
            ->orWhere('is_legacy', false)
            ->get();

        foreach ($settlements as $settlement) {
            $tenantId = $settlement->tenant_id;
            $sessionId = $settlement->doctor_session_id;

            if (! $sessionId) {
                continue;
            }

            // Find paid bills belonging to this session
            $sessionBills = Bill::where('tenant_id', $tenantId)
                ->where('payment_status', Bill::STATUS_PAID)
                ->whereHas('token', fn ($q) => $q->where('doctor_session_id', $sessionId))
                ->get();

            // Calculate doctor share on these bills
            $itemsToLink = [];
            $totalDocShare = 0;

            foreach ($sessionBills as $b) {
                // Exclude pharmacy items
                $pharmacyCents = DB::table('bill_items')->where('bill_id', $b->id)->sum('total_price_cents');
                $consultationGross = max(0, $b->total_amount - (int) $pharmacyCents);

                $docShare = $b->doctor_fee;
                if ($docShare === 0 && ! empty($b->fee_snapshot['doctor_payout_amount'])) {
                    $docShare = (int) $b->fee_snapshot['doctor_payout_amount'];
                }
                $clinicShare = max(0, $consultationGross - $docShare);

                $itemsToLink[] = [
                    'bill_id' => $b->id,
                    'consultation_fee_cents' => $consultationGross,
                    'doctor_share_cents' => $docShare,
                    'clinic_share_cents' => $clinicShare,
                ];
                $totalDocShare += $docShare;
            }

            // Check if matches settlement doctor payout amount exactly
            if ($totalDocShare === $settlement->doctor_payout_amount && count($itemsToLink) > 0) {
                $settlement->updateQuietly(['is_legacy' => true]);

                foreach ($itemsToLink as $item) {
                    DB::table('payout_settlement_items')->insertOrIgnore([
                        'tenant_id' => $tenantId,
                        'doctor_settlement_id' => $settlement->id,
                        'bill_id' => $item['bill_id'],
                        'consultation_fee_cents' => $item['consultation_fee_cents'],
                        'doctor_share_cents' => $item['doctor_share_cents'],
                        'clinic_share_cents' => $item['clinic_share_cents'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }

                Log::info("Settlement #{$settlement->id} ({$settlement->settlement_number}) auto-linked to ".count($itemsToLink).' bills (Total doctor share: Rs. '.($totalDocShare / 100).').');
            } else {
                // If not all bills match or session has more bills (e.g. Session 1 where settlement was only 1,500 of 61,500)
                // Match single bill if exactly matches (e.g. Bill #2)
                $matchedSingle = $sessionBills->first(function ($b) use ($settlement) {
                    $docShare = $b->doctor_fee > 0 ? $b->doctor_fee : (int) ($b->fee_snapshot['doctor_payout_amount'] ?? 0);

                    return $docShare === $settlement->doctor_payout_amount;
                });

                if ($matchedSingle) {
                    $settlement->updateQuietly(['is_legacy' => true]);
                    $pharmacyCents = DB::table('bill_items')->where('bill_id', $matchedSingle->id)->sum('total_price_cents');
                    $consultationGross = max(0, $matchedSingle->total_amount - (int) $pharmacyCents);
                    $docShare = $settlement->doctor_payout_amount;
                    $clinicShare = max(0, $consultationGross - $docShare);

                    DB::table('payout_settlement_items')->insertOrIgnore([
                        'tenant_id' => $tenantId,
                        'doctor_settlement_id' => $settlement->id,
                        'bill_id' => $matchedSingle->id,
                        'consultation_fee_cents' => $consultationGross,
                        'doctor_share_cents' => $docShare,
                        'clinic_share_cents' => $clinicShare,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    Log::info("Settlement #{$settlement->id} ({$settlement->settlement_number}) single-linked to Bill #{$matchedSingle->id} (Doctor share: Rs. ".($docShare / 100).').');
                } else {
                    Log::warning("Settlement #{$settlement->id} ({$settlement->settlement_number}) could not be auto-linked to exact bills. Amount: {$settlement->doctor_payout_amount}. Kept as unlinked.");
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('settlement_adjustments');
        Schema::dropIfExists('payout_settlement_items');

        Schema::table('doctor_settlements', function (Blueprint $table) {
            $table->dropColumn(['is_legacy', 'is_voided', 'void_reason', 'voided_at', 'voided_by', 'adjustments_total']);
        });

        Schema::table('booking_tokens', function (Blueprint $table) {
            $table->dropColumn(['fee_snapshot_backup']);
        });

        Schema::table('bills', function (Blueprint $table) {
            $table->dropColumn(['paid_at', 'fee_snapshot_backup']);
        });
    }
};
