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
        // 1. Diagnosis Tags & Pivot
        Schema::create('diagnosis_tags', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->string('name');
            $table->unsignedInteger('usage_count')->default(1);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->unique(['tenant_id', 'name'], 'tenant_diagnosis_tag_unique');
            $table->index(['tenant_id', 'usage_count']);
        });

        // 2. Prescriptions
        Schema::create('prescriptions', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->string('prescription_number', 50);
            $table->foreignId('booking_token_id')->nullable()->constrained('booking_tokens')->nullOnDelete();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('doctor_id')->constrained('doctors')->cascadeOnDelete();
            $table->string('status', 30)->default('draft'); // draft, finalized, partially_dispensed, dispensed, cancelled
            $table->string('stock_reduction_mode', 20)->default('dispense'); // dispense, finalize
            $table->text('chief_complaint')->nullable();
            $table->text('diagnosis')->nullable();
            $table->text('clinical_notes')->nullable();
            $table->date('follow_up_date')->nullable();
            $table->text('addendum_notes')->nullable();
            $table->text('cancellation_reason')->nullable();
            $table->timestamp('finalized_at')->nullable();
            $table->timestamp('dispensed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'prescription_number']);
            $table->index(['tenant_id', 'status']);
            $table->index(['tenant_id', 'patient_id']);
            $table->index(['tenant_id', 'doctor_id']);
            $table->index(['tenant_id', 'created_at']);
        });

        // Partial unique index: only one active prescription per visit token
        DB::statement("CREATE UNIQUE INDEX unique_active_prescription_per_token ON prescriptions (tenant_id, booking_token_id) WHERE status <> 'cancelled' AND booking_token_id IS NOT NULL");

        // 3. Prescription Diagnosis Tag Pivot
        Schema::create('prescription_diagnosis_tag', function (Blueprint $table) {
            $table->foreignId('prescription_id')->constrained('prescriptions')->cascadeOnDelete();
            $table->foreignId('diagnosis_tag_id')->constrained('diagnosis_tags')->cascadeOnDelete();
            $table->primary(['prescription_id', 'diagnosis_tag_id']);
        });

        // 4. Prescription Items
        Schema::create('prescription_items', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('prescription_id')->constrained('prescriptions')->cascadeOnDelete();
            $table->foreignId('clinic_medicine_id')->nullable()->constrained('clinic_medicines')->nullOnDelete();
            $table->foreignId('medicine_variant_id')->nullable()->constrained('medicine_variants')->nullOnDelete();
            $table->string('generic_name')->nullable();
            $table->string('strength_text')->nullable();
            $table->string('dosage_form')->nullable();
            $table->string('brand_name')->nullable();
            $table->string('display_name');
            $table->string('source', 20)->default('clinic'); // clinic, outside
            $table->decimal('dose_amount', 8, 3)->default(1.000);
            $table->string('dose_unit', 50)->default('tablet');
            $table->string('dose_display', 50)->default('1');
            $table->string('frequency', 50); // 1-0-1, 1-1-1, once_daily, sos, etc.
            $table->string('frequency_text', 100)->nullable();
            $table->unsignedInteger('duration_days')->nullable();
            $table->string('timing', 50)->default('after_meals'); // before_meals, after_meals, with_meals, bedtime, any_time
            $table->unsignedInteger('quantity')->default(0);
            $table->text('instructions')->nullable();
            $table->unsignedInteger('dispensed_quantity')->default(0);
            $table->foreignId('dispensed_clinic_medicine_id')->nullable()->constrained('clinic_medicines')->nullOnDelete();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'prescription_id']);
        });

        // 5. Prescription Item Batches (Exact Batch Traceability for Dispensing & Undo)
        Schema::create('prescription_item_batches', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('prescription_item_id')->constrained('prescription_items')->cascadeOnDelete();
            $table->foreignId('stock_batch_id')->constrained('stock_batches')->cascadeOnDelete();
            $table->foreignId('stock_movement_id')->constrained('stock_movements')->cascadeOnDelete();
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('cost_price_cents')->default(0);
            $table->unsignedInteger('selling_price_cents')->default(0);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'prescription_item_id'], 'pib_tenant_item_idx');
            $table->index(['tenant_id', 'stock_batch_id'], 'pib_tenant_batch_idx');
        });

        // 6. Prescription Templates
        Schema::create('prescription_templates', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('doctor_id')->nullable()->constrained('doctors')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->boolean('is_shared')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'is_shared']);
            $table->index(['tenant_id', 'doctor_id']);
        });

        // 7. Prescription Template Items
        Schema::create('prescription_template_items', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('prescription_template_id')->constrained('prescription_templates')->cascadeOnDelete();
            $table->foreignId('clinic_medicine_id')->nullable()->constrained('clinic_medicines')->nullOnDelete();
            $table->foreignId('medicine_variant_id')->nullable()->constrained('medicine_variants')->nullOnDelete();
            $table->string('generic_name')->nullable();
            $table->string('strength_text')->nullable();
            $table->string('dosage_form')->nullable();
            $table->string('brand_name')->nullable();
            $table->string('display_name');
            $table->string('source', 20)->default('clinic');
            $table->decimal('dose_amount', 8, 3)->default(1.000);
            $table->string('dose_unit', 50)->default('tablet');
            $table->string('dose_display', 50)->default('1');
            $table->string('frequency', 50);
            $table->string('frequency_text', 100)->nullable();
            $table->unsignedInteger('duration_days')->nullable();
            $table->string('timing', 50)->default('after_meals');
            $table->unsignedInteger('quantity')->default(0);
            $table->text('instructions')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'prescription_template_id'], 'pti_tenant_template_idx');
        });

        // 8. Bill Items (Line Items for Bills including Dispensed Medicines)
        Schema::create('bill_items', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('bill_id')->constrained('bills')->cascadeOnDelete();
            $table->foreignId('prescription_item_id')->nullable()->constrained('prescription_items')->nullOnDelete();
            $table->foreignId('clinic_medicine_id')->nullable()->constrained('clinic_medicines')->nullOnDelete();
            $table->string('description');
            $table->unsignedInteger('quantity')->default(1);
            $table->unsignedInteger('unit_price_cents')->default(0);
            $table->unsignedInteger('total_price_cents')->default(0);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'bill_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bill_items');
        Schema::dropIfExists('prescription_template_items');
        Schema::dropIfExists('prescription_templates');
        Schema::dropIfExists('prescription_item_batches');
        Schema::dropIfExists('prescription_items');
        Schema::dropIfExists('prescription_diagnosis_tag');
        Schema::dropIfExists('prescriptions');
        Schema::dropIfExists('diagnosis_tags');
    }
};
