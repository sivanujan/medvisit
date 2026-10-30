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
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->foreignId('active_promo_id')->nullable()->after('plan_id')->constrained('promo_codes')->nullOnDelete();
            $table->jsonb('promo_snapshot')->nullable()->after('active_promo_id'); // Snapshot of deal: type, value, duration, duration_months, eligible_plans
            $table->smallInteger('promo_months_remaining')->nullable()->after('promo_snapshot');
            $table->foreignId('invite_id')->nullable()->after('promo_months_remaining')->constrained('subscription_invites')->nullOnDelete();
        });

        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->integer('original_amount_cents')->nullable()->after('amount_cents');
            $table->integer('discount_cents')->default(0)->after('original_amount_cents');
            $table->string('promo_code', 64)->nullable()->after('discount_cents');
            $table->foreignId('promo_id')->nullable()->after('promo_code')->constrained('promo_codes')->nullOnDelete();
            $table->foreignId('invite_id')->nullable()->after('promo_id')->constrained('subscription_invites')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->dropForeign(['invite_id']);
            $table->dropForeign(['promo_id']);
            $table->dropColumn(['original_amount_cents', 'discount_cents', 'promo_code', 'promo_id', 'invite_id']);
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropForeign(['invite_id']);
            $table->dropForeign(['active_promo_id']);
            $table->dropColumn(['active_promo_id', 'promo_snapshot', 'promo_months_remaining', 'invite_id']);
        });
    }
};
