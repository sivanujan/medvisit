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
        // 1. Add limits and description to plans table
        Schema::table('plans', function (Blueprint $table) {
            if (! Schema::hasColumn('plans', 'limits')) {
                $table->jsonb('limits')->nullable()->after('features');
            }
            if (! Schema::hasColumn('plans', 'description')) {
                $table->text('description')->nullable()->after('billing_interval');
            }
            if (! Schema::hasColumn('plans', 'is_public')) {
                $table->boolean('is_public')->default(true)->after('is_active');
            }
        });

        // 2. Tenant SMS usage tracking per monthly period
        if (! Schema::hasTable('tenant_sms_usages')) {
            Schema::create('tenant_sms_usages', function (Blueprint $table) {
                $table->id();
                $table->string('tenant_id');
                $table->date('period_start');
                $table->date('period_end');
                $table->unsignedInteger('clinic_triggered_count')->default(0);
                $table->unsignedInteger('otp_grace_count')->default(0);
                $table->timestamp('notification_80_sent_at')->nullable();
                $table->timestamp('notification_100_sent_at')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
                $table->unique(['tenant_id', 'period_start', 'period_end'], 'tenant_sms_period_unique');
                $table->index(['tenant_id', 'period_start']);
            });
        }

        // 3. SMS top-up packs purchased by clinics
        if (! Schema::hasTable('tenant_sms_topups')) {
            Schema::create('tenant_sms_topups', function (Blueprint $table) {
                $table->id();
                $table->string('tenant_id');
                $table->string('pack_id');
                $table->unsignedInteger('credits_total');
                $table->unsignedInteger('credits_remaining');
                $table->unsignedInteger('price_cents');
                $table->unsignedBigInteger('invoice_id')->nullable();
                $table->unsignedBigInteger('payment_id')->nullable();
                $table->timestamp('expires_at');
                $table->timestamps();

                $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
                $table->index(['tenant_id', 'expires_at']);
            });
        }

        // 4. Custom domain enhancement on domains table
        Schema::table('domains', function (Blueprint $table) {
            if (! Schema::hasColumn('domains', 'status')) {
                $table->string('status')->default('pending')->after('tenant_id'); // pending, active, failed
            }
            if (! Schema::hasColumn('domains', 'verified_at')) {
                $table->timestamp('verified_at')->nullable()->after('status');
            }
            if (! Schema::hasColumn('domains', 'last_checked_at')) {
                $table->timestamp('last_checked_at')->nullable()->after('verified_at');
            }
            if (! Schema::hasColumn('domains', 'dns_records')) {
                $table->jsonb('dns_records')->nullable()->after('last_checked_at');
            }
            if (! Schema::hasColumn('domains', 'failure_reason')) {
                $table->string('failure_reason')->nullable()->after('dns_records');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('domains', function (Blueprint $table) {
            $table->dropColumn(['status', 'verified_at', 'last_checked_at', 'dns_records', 'failure_reason']);
        });

        Schema::dropIfExists('tenant_sms_topups');
        Schema::dropIfExists('tenant_sms_usages');

        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['limits', 'description', 'is_public']);
        });
    }
};
