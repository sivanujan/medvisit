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
        Schema::table('tenants', function (Blueprint $table) {
            $table->timestamp('setup_completed_at')->nullable()->after('status');
            $table->unsignedSmallInteger('setup_step')->default(1)->after('setup_completed_at');
            $table->unsignedSmallInteger('setup_version')->default(1)->after('setup_step');
            $table->timestamp('setup_grace_until')->nullable()->after('setup_version');
            $table->timestamp('setup_reminder_sent_at')->nullable()->after('setup_grace_until');
        });

        // Existing clinics get a 7-day grace period
        DB::table('tenants')->update([
            'setup_grace_until' => now()->addDays(7),
            'setup_step' => 1,
            'setup_version' => 1,
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'setup_completed_at',
                'setup_step',
                'setup_version',
                'setup_grace_until',
                'setup_reminder_sent_at',
            ]);
        });
    }
};
