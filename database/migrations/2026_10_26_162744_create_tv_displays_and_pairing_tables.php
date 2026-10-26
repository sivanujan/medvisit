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
        Schema::create('tv_devices', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->string('name')->default('Waiting Room TV');
            $table->string('device_token_hash', 64)->unique();
            $table->json('doctor_ids')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'revoked_at']);
        });

        Schema::create('tv_pairing_codes', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->string('code', 6);
            $table->string('device_name')->default('Waiting Room TV');
            $table->json('doctor_ids')->nullable();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'code']);
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tv_pairing_codes');
        Schema::dropIfExists('tv_devices');
    }
};
