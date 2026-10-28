<?php

declare(strict_types=1);

use App\Models\Doctor;
use App\Support\TokenHelper;
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
        // 1. Add token_code to doctors table
        Schema::table('doctors', function (Blueprint $table) {
            $table->string('token_code', 10)->nullable()->after('name');
        });

        // 2. Add doctor_token_code to doctor_sessions table
        Schema::table('doctor_sessions', function (Blueprint $table) {
            $table->string('doctor_token_code', 10)->nullable()->after('doctor_id');
        });

        // 3. Backfill existing doctors across all tenants
        $doctors = Doctor::withTrashed()->get();
        $assignedCodes = [];

        foreach ($doctors as $doctor) {
            $code = TokenHelper::generateUniqueCode(
                tenantId: (string) $doctor->tenant_id,
                name: (string) $doctor->name,
                title: $doctor->title ? (string) $doctor->title : null,
                preferred: null,
                ignoreDoctorId: (int) $doctor->id
            );

            // Direct DB update to avoid event side-effects during migration
            DB::table('doctors')
                ->where('id', $doctor->id)
                ->update(['token_code' => $code]);

            DB::table('doctor_sessions')
                ->where('doctor_id', $doctor->id)
                ->whereNull('doctor_token_code')
                ->update(['doctor_token_code' => $code]);

            $assignedCodes[] = [
                'id' => $doctor->id,
                'tenant_id' => $doctor->tenant_id,
                'name' => $doctor->name,
                'token_code' => $code,
            ];
        }

        // 4. Enforce uniqueness per tenant for non-deleted doctors
        Schema::table('doctors', function (Blueprint $table) {
            $table->unique(['tenant_id', 'token_code']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->dropUnique(['tenant_id', 'token_code']);
            $table->dropColumn('token_code');
        });

        Schema::table('doctor_sessions', function (Blueprint $table) {
            $table->dropColumn('doctor_token_code');
        });
    }
};
