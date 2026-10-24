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
        Schema::table('payment_transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('payment_transactions', 'refunded_amount_cents')) {
                $table->unsignedInteger('refunded_amount_cents')->default(0)->after('amount_cents');
            }
        });

        Schema::create('refund_requests', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 40)->unique()->index();
            $table->string('tenant_id')->index();
            $table->foreignId('payment_id')->constrained('payment_transactions')->cascadeOnDelete();
            $table->foreignId('requested_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason_type', 40)->index();
            $table->text('description')->nullable();
            $table->unsignedInteger('requested_amount_cents');
            $table->unsignedInteger('eligible_amount_cents')->default(0);
            $table->unsignedInteger('approved_amount_cents')->nullable();
            $table->string('eligibility', 30)->default('needs_review')->index();
            $table->json('eligibility_checks')->nullable();
            $table->string('status', 30)->default('requested')->index();
            $table->text('admin_note')->nullable();
            $table->text('decision_reason')->nullable();
            $table->foreignId('decided_by_admin_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('decided_at')->nullable();
            $table->string('refund_method', 40)->nullable()->index();
            $table->string('refund_reference')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->string('credit_note_number', 50)->nullable()->unique()->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('refund_requests');

        Schema::table('payment_transactions', function (Blueprint $table) {
            if (Schema::hasColumn('payment_transactions', 'refunded_amount_cents')) {
                $table->dropColumn('refunded_amount_cents');
            }
        });
    }
};
