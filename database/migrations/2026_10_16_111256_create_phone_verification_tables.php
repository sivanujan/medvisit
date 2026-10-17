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
        // 1. Phone Verification Attempts
        Schema::create('phone_verifications', function (Blueprint $table): void {
            $table->id();
            $table->string('tenant_id')->nullable()->index();
            $table->string('session_id')->index();
            $table->string('phone', 30);
            $table->string('channel', 20); // whatsapp, textlk, log
            $table->string('code_hash', 64)->index();
            $table->string('status', 20)->default('pending'); // pending, verified, failed, expired
            $table->unsignedSmallInteger('attempts')->default(0);
            $table->timestamp('expires_at')->index();
            $table->timestamp('verified_at')->nullable();
            $table->string('mismatch_phone', 30)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['phone', 'status']);
        });

        // 2. Verified Phones Cache (180 days retention)
        Schema::create('verified_phones', function (Blueprint $table): void {
            $table->id();
            $table->string('tenant_id')->nullable()->index();
            $table->string('phone', 30)->index();
            $table->string('channel', 20); // whatsapp, textlk, log
            $table->timestamp('verified_at');
            $table->timestamp('expires_at')->index();
            $table->timestamps();

            $table->index(['phone', 'expires_at']);
        });

        // 3. OTP Audit Logs (No secret codes stored)
        Schema::create('otp_logs', function (Blueprint $table): void {
            $table->id();
            $table->string('tenant_id')->nullable()->index();
            $table->string('channel', 20);
            $table->string('phone_masked', 30);
            $table->string('status', 20)->index(); // sent, verified, failed, expired
            $table->string('provider_message_id')->nullable();
            $table->text('error')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'created_at']);
        });

        // 4. WhatsApp Webhook Events (Idempotency)
        Schema::create('whatsapp_webhook_events', function (Blueprint $table): void {
            $table->id();
            $table->string('message_id')->unique();
            $table->string('sender_wa_id', 30);
            $table->json('payload')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whatsapp_webhook_events');
        Schema::dropIfExists('otp_logs');
        Schema::dropIfExists('verified_phones');
        Schema::dropIfExists('phone_verifications');
    }
};
