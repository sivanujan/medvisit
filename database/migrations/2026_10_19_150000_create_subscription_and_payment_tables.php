<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->unsignedInteger('price_cents')->default(500000);
            $table->string('billing_interval')->default('month');
            $table->json('features')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->foreignId('plan_id')->constrained('plans')->cascadeOnDelete();
            $table->string('status')->default('pending_payment')->index(); // pending_payment, active, past_due, expired, cancelled
            $table->timestamp('current_period_start')->nullable();
            $table->timestamp('current_period_end')->nullable()->index();
            $table->timestamp('trial_ends_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->string('created_by')->nullable(); // registration, migration, super_admin
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('subscription_invoices', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->foreignId('subscription_id')->constrained('subscriptions')->cascadeOnDelete();
            $table->string('invoice_number')->unique()->index(); // e.g. INV-2026-000001
            $table->unsignedInteger('amount_cents');
            $table->timestamp('period_start')->nullable();
            $table->timestamp('period_end')->nullable();
            $table->timestamp('due_date')->nullable();
            $table->string('status')->default('unpaid')->index(); // unpaid, paid, failed, void
            $table->timestamp('paid_at')->nullable();
            $table->string('payment_method')->nullable(); // paymentslk, offline, comp
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->index();
            $table->foreignId('invoice_id')->constrained('subscription_invoices')->cascadeOnDelete();
            $table->string('gateway')->default('paymentslk');
            $table->string('gateway_checkout_id')->nullable()->index();
            $table->string('gateway_payment_id')->nullable()->index();
            $table->unsignedInteger('amount_cents');
            $table->string('currency', 10)->default('LKR');
            $table->string('status')->default('pending')->index(); // pending, succeeded, failed
            $table->string('idempotency_key')->nullable()->index();
            $table->json('raw_payload')->nullable();
            $table->timestamps();
        });

        Schema::create('webhook_events', function (Blueprint $table) {
            $table->id();
            $table->string('gateway')->default('paymentslk');
            $table->string('event_id')->unique()->index();
            $table->string('type')->index();
            $table->json('payload');
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });

        // 1. Seed initial plans
        $now = Carbon::now();
        $standardPlanId = DB::table('plans')->insertGetId([
            'name' => 'MedVisit Standard',
            'slug' => 'medvisit-standard',
            'price_cents' => (int) config('medvisit.subscription.default_price_cents', 500000),
            'billing_interval' => 'month',
            'features' => json_encode([
                'Unlimited Channeling Sessions & Doctor Roster',
                'Live Queue TV Display & Real-time Calling',
                'SMS Queue Alerts & WhatsApp Confirmations',
                'Prescription Management & Direct Clinic Dispensing',
                'Complete Financial Settlements & Doctor Payouts',
            ]),
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $compPlanId = DB::table('plans')->insertGetId([
            'name' => 'Complimentary',
            'slug' => 'comp',
            'price_cents' => 0,
            'billing_interval' => 'month',
            'features' => json_encode([
                'All MedVisit Features Included',
                'Grandfathered Active Status (No Monthly Billing)',
            ]),
            'is_active' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        // 2. Grandfather all existing clinics so they remain active and unlocked
        $existingTenants = DB::table('tenants')->get();
        foreach ($existingTenants as $tenant) {
            DB::table('subscriptions')->insert([
                'tenant_id' => $tenant->id,
                'plan_id' => $compPlanId,
                'status' => 'active',
                'current_period_start' => $now,
                'current_period_end' => null, // No expiration for comp clinics
                'activated_at' => $now,
                'created_by' => 'migration',
                'notes' => 'Existing clinic grandfathered on complimentary plan',
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('webhook_events');
        Schema::dropIfExists('payment_transactions');
        Schema::dropIfExists('subscription_invoices');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('plans');
    }
};
