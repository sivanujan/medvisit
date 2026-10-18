<?php

use App\Models\Tenant;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Backfill all existing tenants to require phone verification by default
        Tenant::all()->each(function (Tenant $tenant) {
            $tenant->require_phone_verification = true;
            $tenant->phone_verification_methods = ['whatsapp', 'textlk'];
            $tenant->save();
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
