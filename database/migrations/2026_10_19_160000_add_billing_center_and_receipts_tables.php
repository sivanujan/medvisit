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
        Schema::table('subscription_invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('subscription_invoices', 'type')) {
                $table->string('type', 30)->default('subscription')->after('subscription_id')->index(); // subscription, proration, manual
            }
            if (! Schema::hasColumn('subscription_invoices', 'receipt_number')) {
                $table->string('receipt_number', 50)->nullable()->unique()->after('invoice_number')->index();
            }
            if (! Schema::hasColumn('subscription_invoices', 'billing_details')) {
                $table->json('billing_details')->nullable()->after('payment_method');
            }
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            if (! Schema::hasColumn('subscriptions', 'cancels_at_period_end')) {
                $table->boolean('cancels_at_period_end')->default(false)->after('status');
            }
            if (! Schema::hasColumn('subscriptions', 'cancelled_at')) {
                $table->timestamp('cancelled_at')->nullable()->after('cancels_at_period_end');
            }
            if (! Schema::hasColumn('subscriptions', 'cancellation_reason')) {
                $table->string('cancellation_reason')->nullable()->after('cancelled_at');
            }
            if (! Schema::hasColumn('subscriptions', 'cancellation_reason_detail')) {
                $table->text('cancellation_reason_detail')->nullable()->after('cancellation_reason');
            }
            if (! Schema::hasColumn('subscriptions', 'pending_plan_id')) {
                $table->foreignId('pending_plan_id')->nullable()->after('plan_id')->constrained('plans')->nullOnDelete();
            }
        });

        if (! Schema::hasTable('tenant_billing_details')) {
            Schema::create('tenant_billing_details', function (Blueprint $table) {
                $table->id();
                $table->string('tenant_id')->unique()->index();
                $table->string('legal_name')->nullable();
                $table->string('billing_email')->nullable();
                $table->string('phone')->nullable();
                $table->text('address')->nullable();
                $table->string('tax_id')->nullable();
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('receipt_sequences')) {
            Schema::create('receipt_sequences', function (Blueprint $table) {
                $table->id();
                $table->unsignedSmallInteger('year')->unique();
                $table->unsignedInteger('current_number')->default(0);
                $table->timestamps();
            });
        }

        if (! Schema::hasTable('subscription_notifications')) {
            Schema::create('subscription_notifications', function (Blueprint $table) {
                $table->id();
                $table->string('tenant_id')->index();
                $table->string('event_type', 50)->index();
                $table->string('reference', 100)->index();
                $table->string('recipient');
                $table->json('metadata')->nullable();
                $table->timestamp('sent_at');
                $table->timestamps();

                $table->unique(['tenant_id', 'event_type', 'reference'], 'sub_notif_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subscription_notifications');
        Schema::dropIfExists('receipt_sequences');
        Schema::dropIfExists('tenant_billing_details');

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('pending_plan_id');
            $table->dropColumn([
                'cancels_at_period_end',
                'cancelled_at',
                'cancellation_reason',
                'cancellation_reason_detail',
            ]);
        });

        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->dropColumn([
                'type',
                'receipt_number',
                'billing_details',
            ]);
        });
    }
};
