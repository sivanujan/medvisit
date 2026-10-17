<?php

declare(strict_types=1);

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
        Schema::table('otp_logs', function (Blueprint $table): void {
            $table->decimal('cost', 8, 4)->nullable()->after('provider_message_id');
            $table->unsignedSmallInteger('sms_count')->nullable()->after('cost');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('otp_logs', function (Blueprint $table): void {
            $table->dropColumn(['cost', 'sms_count']);
        });
    }
};
