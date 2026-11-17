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
        // 1. Add referral columns to tenants
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('referral_code', 64)->nullable()->unique()->after('plan');
            $table->timestamp('referral_code_edited_at')->nullable()->after('referral_code');
            $table->foreignId('referral_code_edited_by')->nullable()->after('referral_code_edited_at')->constrained('users')->nullOnDelete();
        });

        // 2. Add referral_code to pending_registrations
        Schema::table('pending_registrations', function (Blueprint $table) {
            $table->string('referral_code', 64)->nullable()->after('phone_signed_token');
        });

        // 3. Create clinic_referrals table
        Schema::create('clinic_referrals', function (Blueprint $table) {
            $table->id();
            $table->string('referrer_tenant_id')->index();
            $table->foreign('referrer_tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->string('referred_tenant_id')->nullable()->index();
            $table->foreign('referred_tenant_id')->references('id')->on('tenants')->nullOnDelete();
            $table->string('referral_code', 64)->index();
            $table->string('status', 32)->default('registered')->index();
            $table->integer('reward_amount_cents')->default(0);
            $table->integer('qualifying_invoices_count')->default(0);
            $table->jsonb('flags')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->text('admin_notes')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();
            $table->foreignId('rejected_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable();
            $table->timestamps();
        });

        // 4. Create tenant_billing_credits ledger table
        Schema::create('tenant_billing_credits', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreignId('referral_id')->nullable()->constrained('clinic_referrals')->nullOnDelete();
            $table->foreignId('invoice_id')->nullable()->constrained('subscription_invoices')->nullOnDelete();
            $table->string('type', 32)->index();
            $table->integer('amount_cents');
            $table->integer('balance_after_cents');
            $table->timestamp('expires_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // 5. Add credit_cents to subscription_invoices
        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->integer('credit_cents')->default(0)->after('discount_cents');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->dropColumn('credit_cents');
        });

        Schema::dropIfExists('tenant_billing_credits');
        Schema::dropIfExists('clinic_referrals');

        Schema::table('pending_registrations', function (Blueprint $table) {
            $table->dropColumn('referral_code');
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropForeign(['referral_code_edited_by']);
            $table->dropColumn(['referral_code', 'referral_code_edited_at', 'referral_code_edited_by']);
        });
    }
};
