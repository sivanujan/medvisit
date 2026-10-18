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
}
