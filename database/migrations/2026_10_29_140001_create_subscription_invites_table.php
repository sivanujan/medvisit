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
        Schema::create('subscription_invites', function (Blueprint $table) {
            $table->id();
            $table->string('recipient_email');
            $table->string('recipient_name')->nullable();
            $table->string('clinic_name')->nullable();
            $table->string('plan_slug', 64)->default('pro');
            $table->string('free_period_type', 32)->default('months'); // 'days', 'months'
            $table->integer('free_period_value')->default(1);
            $table->string('token_hash', 64)->unique(); // SHA-256 of plain token
            $table->string('status', 32)->default('sent'); // 'sent', 'registered', 'expired', 'revoked'
            $table->timestampTz('expires_at');
            $table->timestampTz('registered_at')->nullable();
            $table->string('registered_tenant_id')->nullable();
            $table->foreign('registered_tenant_id')->references('id')->on('tenants')->nullOnDelete();
            $table->foreignId('registered_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();

            $table->index('recipient_email');
            $table->index('status');
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_invites');
    }
};
