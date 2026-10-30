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
        Schema::table('pending_registrations', function (Blueprint $table): void {
            $table->string('phone', 30)->nullable()->index()->after('email');
            $table->string('phone_code_hash')->nullable()->after('code_hash');
            $table->unsignedSmallInteger('phone_attempts')->default(0)->after('attempts');
            $table->timestamp('phone_expires_at')->nullable()->after('expires_at');
            $table->timestamp('phone_resend_available_at')->nullable()->after('resend_available_at');
            $table->timestamp('phone_verified_at')->nullable()->after('verified_at');
            $table->string('phone_signed_token', 64)->nullable()->unique()->after('phone_verified_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pending_registrations', function (Blueprint $table): void {
            $table->dropColumn([
                'phone',
                'phone_code_hash',
                'phone_attempts',
                'phone_expires_at',
                'phone_resend_available_at',
                'phone_verified_at',
                'phone_signed_token',
            ]);
        });
    }
};
