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
        Schema::create('bill_adjustments', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('bill_id')->constrained('bills')->cascadeOnDelete();
            $table->foreignId('booking_token_id')->nullable()->constrained('booking_tokens')->nullOnDelete();
            $table->string('type')->default('move_differential'); // move_differential, waiver, discount_correction, refund
            $table->integer('amount_cents'); // Signed integer: positive = balance due, negative = credit/refund due
            $table->string('reason')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'bill_id']);
            $table->index(['tenant_id', 'booking_token_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bill_adjustments');
    }
};
