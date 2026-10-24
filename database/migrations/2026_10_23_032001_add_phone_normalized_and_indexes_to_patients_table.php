<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('phone_normalized', 30)->nullable()->after('phone');
            $table->index(['tenant_id', 'phone_normalized']);
        });

        // Attempt PostgreSQL pg_trgm index for fast partial name search
        if (DB::getDriverName() === 'pgsql') {
            try {
                DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
                DB::statement('CREATE INDEX IF NOT EXISTS patients_name_trgm_idx ON patients USING gin (name gin_trgm_ops)');
            } catch (Throwable $e) {
                Schema::table('patients', function (Blueprint $table) {
                    $table->index(['tenant_id', 'name']);
                });
            }
        } else {
            Schema::table('patients', function (Blueprint $table) {
                $table->index(['tenant_id', 'name']);
            });
        }

        // Backfill existing patient records
        $patients = DB::table('patients')->select('id', 'phone')->get();
        foreach ($patients as $patient) {
            $normalized = $this->normalizePhone($patient->phone);
            if ($normalized) {
                DB::table('patients')
                    ->where('id', $patient->id)
                    ->update(['phone_normalized' => $normalized]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS patients_name_trgm_idx');
        }

        Schema::table('patients', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'phone_normalized']);
            $table->dropColumn('phone_normalized');
        });
    }

    /**
     * E.164 phone normalizer for Sri Lankan numbers.
     */
    protected function normalizePhone(?string $phone): ?string
    {
        if (! $phone) {
            return null;
        }

        $digits = preg_replace('/\D/', '', $phone);
        if (empty($digits)) {
            return null;
        }

        // If starts with 94 followed by at least 9 digits (e.g. 94771234567)
        if (str_starts_with($digits, '94') && strlen($digits) >= 11) {
            return '+94'.substr($digits, 2, 9);
        }

        // If starts with 0 followed by 9 digits (e.g. 0771234567)
        if (str_starts_with($digits, '0') && strlen($digits) >= 10) {
            return '+94'.substr($digits, 1, 9);
        }

        // If starts with a valid Sri Lankan mobile/landline digit without leading 0 (e.g. 771234567)
        if (strlen($digits) === 9 && in_array($digits[0], ['7', '1', '2', '3', '4', '5', '6', '8'])) {
            return '+94'.$digits;
        }

        // Fallback for foreign or arbitrary format
        return '+'.$digits;
    }
};
