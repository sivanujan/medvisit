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
        Schema::create('promo_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 64)->unique();
            $table->text('notes')->nullable();
            $table->string('type', 32); // 'percent', 'fixed', 'free_months', 'extra_trial_days'
            $table->integer('value')->default(0); // percent (e.g. 20), cents for fixed (e.g. 200000), months (e.g. 1), or days (e.g. 14)
            $table->string('duration', 32)->default('once'); // 'once', 'repeating', 'forever'
            $table->smallInteger('duration_months')->nullable(); // for repeating
            $table->jsonb('eligible_plans'); // e.g. ["basic", "pro"] or ["*"]
            $table->boolean('new_clinics_only')->default(false);
            $table->integer('max_redemptions')->nullable(); // null = unlimited
            $table->integer('times_redeemed')->default(0);
            $table->timestampTz('valid_from')->nullable();
            $table->timestampTz('valid_until')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();

            $table->index('is_active');
            $table->index(['valid_from', 'valid_until']);
        });

        Schema::create('promo_code_redemptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('promo_code_id')->constrained('promo_codes')->onDelete('restrict');
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreignId('subscription_id')->constrained('subscriptions')->cascadeOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained('subscription_invoices')->nullOnDelete();

            $table->string('status', 32)->default('reserved'); // 'reserved', 'active', 'completed', 'released'

            // Deal snapshot at redemption time (never changes even if code is edited or deactivated)
            $table->string('discount_type', 32);
            $table->integer('discount_value')->default(0);
            $table->string('duration', 32)->default('once');
            $table->smallInteger('duration_months')->nullable();
            $table->jsonb('eligible_plans')->nullable();

            $table->integer('discount_amount_cents')->default(0);
            $table->integer('original_amount_cents')->default(0);
            $table->integer('final_amount_cents')->default(0);

            $table->timestampTz('reserved_at');
            $table->timestampTz('activated_at')->nullable();
            $table->timestampTz('expires_at')->nullable(); // for 30-min reservation release
            $table->smallInteger('months_remaining')->nullable(); // decremented on repeating renewals
            $table->timestampsTz();

            $table->index('status');
            $table->index(['tenant_id', 'status']);
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('promo_code_redemptions');
        Schema::dropIfExists('promo_codes');
    }
};
