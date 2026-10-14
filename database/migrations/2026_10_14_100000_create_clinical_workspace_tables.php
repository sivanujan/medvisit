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
        // 1. Doctors
        Schema::create('doctors', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('name');
            $table->string('title')->default('Dr.');
            $table->string('specialty');
            $table->string('slmc_number');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('photo_url')->nullable();
            $table->text('bio')->nullable();
            $table->unsignedInteger('doctor_fee')->default(0); // LKR cents
            $table->unsignedInteger('clinic_fee')->default(0); // LKR cents
            $table->unsignedSmallInteger('avg_consultation_minutes')->default(10);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'is_active']);
        });

        // 2. Session Templates (Recurring Weekly Schedules)
        Schema::create('session_templates', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('doctor_id')->constrained('doctors')->cascadeOnDelete();
            $table->string('title');
            $table->unsignedTinyInteger('day_of_week'); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedSmallInteger('max_patients')->default(30);
            $table->string('mode')->default('token'); // 'token' or 'slot'
            $table->string('room_number')->nullable();
            $table->unsignedInteger('doctor_fee')->nullable(); // overrides doctor fee if set
            $table->unsignedInteger('clinic_fee')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'doctor_id', 'day_of_week']);
        });

        // 3. Doctor Sessions (Concrete Channeling Sessions on Specific Dates)
        Schema::create('doctor_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('doctor_id')->constrained('doctors')->cascadeOnDelete();
            $table->foreignId('session_template_id')->nullable()->constrained('session_templates')->nullOnDelete();
            $table->date('session_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedSmallInteger('max_tokens')->default(30);
            $table->string('mode')->default('token'); // 'token' | 'slot'
            $table->string('status')->default('scheduled'); // scheduled, in_progress, completed, cancelled
            $table->string('room_number')->nullable();
            $table->unsignedInteger('doctor_fee')->default(0);
            $table->unsignedInteger('clinic_fee')->default(0);
            $table->unsignedSmallInteger('current_token_number')->default(0);
            $table->text('notes')->nullable();
            $table->string('cancellation_reason')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'session_date']);
            $table->index(['tenant_id', 'doctor_id', 'session_date']);
            $table->index(['tenant_id', 'status']);
        });

        // 4. Patients
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->string('name');
            $table->string('nic')->nullable();
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('gender')->nullable(); // male, female, other
            $table->date('date_of_birth')->nullable();
            $table->string('district')->nullable();
            $table->string('city')->nullable();
            $table->text('address')->nullable();
            $table->text('allergies')->nullable();
            $table->text('notes')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_contact_phone')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'phone']);
            $table->index(['tenant_id', 'nic']);
        });

        // 5. Booking Tokens
        Schema::create('booking_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('doctor_session_id')->constrained('doctor_sessions')->cascadeOnDelete();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->unsignedSmallInteger('token_number');
            $table->dateTime('estimated_time')->nullable();
            $table->string('status')->default('booked'); // booked, checked_in, called, in_consultation, completed, no_show, cancelled
            $table->string('booked_via')->default('reception'); // reception, online
            $table->timestamp('checked_in_at')->nullable();
            $table->timestamp('called_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancellation_reason')->nullable();
            $table->string('signed_cancel_token', 64)->nullable()->unique();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->unique(['doctor_session_id', 'token_number'], 'session_token_unique');
            $table->index(['tenant_id', 'doctor_session_id', 'status']);
            $table->index(['tenant_id', 'patient_id']);
        });

        // 6. Bills
        Schema::create('bills', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('booking_token_id')->nullable()->constrained('booking_tokens')->nullOnDelete();
            $table->foreignId('patient_id')->constrained('patients')->cascadeOnDelete();
            $table->foreignId('doctor_id')->nullable()->constrained('doctors')->nullOnDelete();
            $table->string('receipt_number');
            $table->unsignedInteger('doctor_fee')->default(0); // cents
            $table->unsignedInteger('clinic_fee')->default(0); // cents
            $table->unsignedInteger('other_fee')->default(0);  // cents
            $table->unsignedInteger('discount')->default(0);   // cents
            $table->string('discount_reason')->nullable();
            $table->unsignedInteger('total_amount')->default(0); // cents
            $table->string('payment_method')->default('cash'); // cash, card, bank_transfer
            $table->string('payment_status')->default('paid'); // paid, pending, refunded
            $table->timestamp('refunded_at')->nullable();
            $table->string('refund_reason')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->unique(['tenant_id', 'receipt_number'], 'tenant_receipt_unique');
            $table->index(['tenant_id', 'created_at']);
            $table->index(['tenant_id', 'payment_status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bills');
        Schema::dropIfExists('booking_tokens');
        Schema::dropIfExists('patients');
        Schema::dropIfExists('doctor_sessions');
        Schema::dropIfExists('session_templates');
        Schema::dropIfExists('doctors');
    }
};
