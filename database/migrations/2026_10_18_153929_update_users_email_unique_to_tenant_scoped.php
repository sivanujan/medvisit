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
        // Drop legacy global email uniqueness constraint/index
        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique CASCADE;');

        // Add tenant-scoped email uniqueness (supporting NULL tenant_id for platform superadmin)
        DB::statement('ALTER TABLE users ADD CONSTRAINT users_tenant_id_email_unique UNIQUE NULLS NOT DISTINCT (tenant_id, email);');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tenant_id_email_unique CASCADE;');

        Schema::table('users', function (Blueprint $table) {
            $table->unique('email', 'users_email_unique');
        });
    }
};
