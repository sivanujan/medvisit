<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Backfill all existing tenants to require phone verification by default
        DB::table('tenants')->get()->each(function ($tenant) {
            DB::table('tenants')
                ->where('id', $tenant->id)
                ->update([
                    'require_phone_verification' => true,
                    'phone_verification_methods' => json_encode(['whatsapp', 'textlk']),
                ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        //
    }
};
