<?php

declare(strict_types=1);

namespace App\Services;

use Illuminate\Support\Facades\DB;

class SequenceService
{
    /**
     * Atomically increment and return the next sequence number for a tenant and key.
     * Uses PostgreSQL INSERT ... ON CONFLICT DO UPDATE ... RETURNING to guarantee race-condition-free sequences.
     */
    public function next(string $tenantId, string $key): int
    {
        $sql = <<<'SQL'
            INSERT INTO tenant_sequences (tenant_id, key, last_value, created_at, updated_at)
            VALUES (?, ?, 1, NOW(), NOW())
            ON CONFLICT (tenant_id, key)
            DO UPDATE SET 
                last_value = tenant_sequences.last_value + 1,
                updated_at = NOW()
            RETURNING last_value;
        SQL;

        $result = DB::selectOne($sql, [$tenantId, $key]);

        return (int) $result->last_value;
    }

    /**
     * Return the current last sequence value without incrementing (0 if unset).
     */
    public function current(string $tenantId, string $key): int
    {
        $value = DB::table('tenant_sequences')
            ->where('tenant_id', $tenantId)
            ->where('key', $key)
            ->value('last_value');

        return (int) ($value ?? 0);
    }

    /**
     * Generate the next dedicated, gapless-per-tenant receipt number (e.g. REC-001092).
     * Guaranteed gapless and race-condition free via atomic database sequence.
     */
    public function nextReceiptNumber(string $tenantId): string
    {
        $this->ensureReceiptSequenceSeeded($tenantId);

        $seq = $this->next($tenantId, 'receipt');

        return sprintf('REC-%06d', $seq);
    }

    /**
     * Generate the next dedicated, gapless-per-tenant doctor payout settlement number (e.g. PAY-2026-000001).
     * Guaranteed gapless and race-condition free via atomic database sequence.
     */
    public function nextPayoutNumber(string $tenantId, ?int $year = null): string
    {
        $year = $year ?? (int) date('Y');
        $key = "payout_{$year}";

        $this->ensurePayoutSequenceSeeded($tenantId, $year);

        $seq = $this->next($tenantId, $key);

        return sprintf('PAY-%04d-%06d', $year, $seq);
    }

    /**
     * Ensure the payout sequence is initialized for this tenant based on existing settlements.
     */
    public function ensurePayoutSequenceSeeded(string $tenantId, int $year): void
    {
        $key = "payout_{$year}";
        $exists = DB::table('tenant_sequences')
            ->where('tenant_id', $tenantId)
            ->where('key', $key)
            ->exists();

        if ($exists) {
            return;
        }

        $maxNum = 0;
        $prefix = "PAY-{$year}-";
        $settlements = DB::table('doctor_settlements')
            ->where('tenant_id', $tenantId)
            ->where('settlement_number', 'LIKE', "{$prefix}%")
            ->pluck('settlement_number');

        foreach ($settlements as $numStr) {
            if (preg_match('/^PAY-\d{4}-(\d+)$/', (string) $numStr, $m)) {
                $val = (int) $m[1];
                if ($val > $maxNum) {
                    $maxNum = $val;
                }
            }
        }

        if ($maxNum > 0) {
            DB::table('tenant_sequences')->insertOrIgnore([
                'tenant_id' => $tenantId,
                'key' => $key,
                'last_value' => $maxNum,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Ensure the receipt sequence is initialized for this tenant based on existing receipts,
     * so existing issued receipts are never collided with or renumbered.
     */
    public function ensureReceiptSequenceSeeded(string $tenantId): void
    {
        $exists = DB::table('tenant_sequences')
            ->where('tenant_id', $tenantId)
            ->where('key', 'receipt')
            ->exists();

        if ($exists) {
            return;
        }

        // Query maximum numeric receipt currently issued for this tenant (e.g. REC-001091 -> 1091)
        $maxNum = 0;
        try {
            $row = DB::selectOne(
                "SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 5) AS INTEGER)), 0) AS max_val FROM bills WHERE tenant_id = ? AND receipt_number ~ '^REC-[0-9]+$'",
                [$tenantId]
            );
            $maxNum = (int) ($row->max_val ?? 0);
        } catch (\Throwable) {
            // Fallback for non-Postgres or unparseable patterns
            $bills = DB::table('bills')
                ->where('tenant_id', $tenantId)
                ->whereNotNull('receipt_number')
                ->pluck('receipt_number');

            foreach ($bills as $rec) {
                if (preg_match('/^REC-(\d+)$/', (string) $rec, $m)) {
                    $num = (int) $m[1];
                    if ($num > $maxNum) {
                        $maxNum = $num;
                    }
                }
            }
        }

        if ($maxNum > 0) {
            DB::table('tenant_sequences')->insertOrIgnore([
                'tenant_id' => $tenantId,
                'key' => 'receipt',
                'last_value' => $maxNum,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }
}
