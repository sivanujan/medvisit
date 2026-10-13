<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->timestamp('trial_ending_reminder_sent_at')->nullable()->after('trial_ends_at');
            $table->timestamp('trial_ended_reminder_sent_at')->nullable()->after('trial_ending_reminder_sent_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'trial_ending_reminder_sent_at',
                'trial_ended_reminder_sent_at',
            ]);
        });
    }
};
