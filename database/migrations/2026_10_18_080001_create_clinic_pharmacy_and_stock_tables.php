<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Suppliers (BelongsToTenant)
        Schema::create('suppliers', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->string('phone', 30)->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
        });

        // 2. Clinic Medicines (Tenant's stock catalog definition)
        Schema::create('clinic_medicines', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreignId('medicine_variant_id')->constrained('medicine_variants')->cascadeOnDelete();
            $table->foreignId('medicine_brand_id')->nullable()->constrained('medicine_brands')->nullOnDelete();
            $table->string('display_name');
            $table->string('base_unit', 30)->default('tablet'); // tablet, capsule, ml, bottle, tube, vial, piece
            $table->unsignedInteger('selling_price_cents')->default(0);
            $table->unsignedInteger('reorder_level')->nullable();
            $table->string('shelf_location', 100)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['tenant_id', 'is_active']);
        });

        // Unique constraint with NULLS NOT DISTINCT for (tenant_id, medicine_variant_id, medicine_brand_id)
        DB::statement('ALTER TABLE clinic_medicines ADD CONSTRAINT clinic_medicines_unique_combo UNIQUE NULLS NOT DISTINCT (tenant_id, medicine_variant_id, medicine_brand_id);');

        // 3. Stock Receipts (GRN Header)
        Schema::create('stock_receipts', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->string('receipt_number', 50);
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->string('invoice_number', 100)->nullable();
            $table->date('received_date');
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('total_cost_cents')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['tenant_id', 'receipt_number']);
            $table->index(['tenant_id', 'received_date']);
        });

        // 4. Stock Batches
        Schema::create('stock_batches', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreignId('clinic_medicine_id')->constrained('clinic_medicines')->cascadeOnDelete();
            $table->string('batch_number', 100)->nullable();
            $table->date('expiry_date')->nullable();
            $table->integer('quantity_received')->default(0);
            $table->integer('quantity_remaining')->default(0);
            $table->unsignedInteger('cost_price_cents')->default(0);
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->foreignId('stock_receipt_id')->nullable()->constrained('stock_receipts')->nullOnDelete();
            $table->timestamp('received_at')->useCurrent();
            $table->timestamps();

            $table->index(['tenant_id', 'clinic_medicine_id']);
            $table->index(['tenant_id', 'expiry_date']);
            $table->index(['tenant_id', 'quantity_remaining']);
        });

        // 5. Stock Movements (Append-Only Ledger)
        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->foreignId('clinic_medicine_id')->constrained('clinic_medicines')->cascadeOnDelete();
            $table->foreignId('stock_batch_id')->nullable()->constrained('stock_batches')->cascadeOnDelete();
            $table->string('type', 30); // receipt, adjustment_in, adjustment_out, expired, damaged, return_to_supplier, dispense
            $table->integer('quantity'); // signed int (+10, -5)
            $table->text('reason')->nullable();
            $table->nullableMorphs('reference');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['tenant_id', 'clinic_medicine_id', 'created_at']);
            $table->index(['tenant_id', 'stock_batch_id']);
            $table->index(['tenant_id', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('stock_batches');
        Schema::dropIfExists('stock_receipts');
        Schema::dropIfExists('clinic_medicines');
        Schema::dropIfExists('suppliers');
    }
};
