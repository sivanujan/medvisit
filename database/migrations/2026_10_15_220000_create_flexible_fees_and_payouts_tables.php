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
        // 1. Visit Types Table
        Schema::create('visit_types', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->string('name');
            $table->string('code')->nullable();
            $table->string('pricing_type')->default('percentage'); // 'percentage' | 'fixed'
            $table->unsignedInteger('percentage_value')->default(100);
            $table->unsignedInteger('fixed_fee_cents')->default(0);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->boolean('allow_online')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->json('payout_rule_override')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'is_active']);
            $table->index(['tenant_id', 'is_default']);
        });

        // 2. Fee Components Table
        Schema::create('fee_components', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->string('name');
            $table->string('code')->nullable();
            $table->string('amount_type')->default('fixed'); // 'fixed' | 'percent_component' | 'percent_subtotal'
            $table->foreignId('target_component_id')->nullable()->constrained('fee_components')->nullOnDelete();
            $table->unsignedInteger('amount_value')->default(0); // LKR cents or percentage (e.g. 10 for 10%)
            $table->string('recipient')->default('clinic'); // 'doctor' | 'clinic' | 'third_party'
            $table->string('recipient_name')->nullable();
            $table->json('applies_to')->nullable(); // ['walk_in', 'phone', 'online']
            $table->boolean('is_mandatory')->default(true);
            $table->boolean('is_separate_line')->default(true);
            $table->boolean('is_active')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->index(['tenant_id', 'is_active']);
        });

        // 3. Doctor Settlements Table
        Schema::create('doctor_settlements', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id');
            $table->foreignId('doctor_id')->constrained('doctors')->cascadeOnDelete();
            $table->foreignId('doctor_session_id')->nullable()->constrained('doctor_sessions')->nullOnDelete();
            $table->string('settlement_number');
            $table->date('period_start');
            $table->date('period_end');
            $table->unsignedSmallInteger('sessions_count')->default(0);
            $table->unsignedSmallInteger('patients_seen')->default(0);
            $table->unsignedSmallInteger('no_shows_count')->default(0);
            $table->unsignedInteger('gross_collected')->default(0); // LKR cents
            $table->unsignedInteger('doctor_payout_amount')->default(0); // LKR cents
            $table->unsignedInteger('clinic_amount')->default(0); // LKR cents
            $table->unsignedInteger('paid_amount')->default(0); // LKR cents
            $table->string('payment_status')->default('unpaid'); // unpaid, partial, paid
            $table->string('payment_method')->nullable(); // cash, card, bank_transfer, cheque
            $table->string('payment_reference')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->foreign('tenant_id')->references('id')->on('tenants')->cascadeOnDelete();
            $table->unique(['tenant_id', 'settlement_number']);
            $table->index(['tenant_id', 'doctor_id', 'period_start']);
            $table->index(['tenant_id', 'payment_status']);
        });

        // 4. Add fee_settings to tenants
        Schema::table('tenants', function (Blueprint $table) {
            $table->json('fee_settings')->nullable()->after('status');
        });

        // 5. Add fee override and payout columns to doctors
        Schema::table('doctors', function (Blueprint $table) {
            $table->boolean('use_clinic_default_fees')->default(true)->after('clinic_fee');
            $table->string('pricing_mode')->nullable()->after('use_clinic_default_fees'); // 'split' | 'single_price'
            $table->unsignedInteger('custom_doctor_fee')->nullable()->after('pricing_mode');
            $table->unsignedInteger('custom_clinic_fee')->nullable()->after('custom_doctor_fee');
            $table->unsignedInteger('custom_total_fee')->nullable()->after('custom_clinic_fee');
            $table->json('payout_rule')->nullable()->after('custom_total_fee');
            $table->json('visit_type_overrides')->nullable()->after('payout_rule');
            $table->json('component_overrides')->nullable()->after('visit_type_overrides');
        });

        // 6. Add fee override columns to session_templates
        Schema::table('session_templates', function (Blueprint $table) {
            $table->string('fee_override_type')->default('inherit')->after('clinic_fee'); // 'inherit' | 'custom'
            $table->unsignedInteger('custom_doctor_fee')->nullable()->after('fee_override_type');
            $table->unsignedInteger('custom_clinic_fee')->nullable()->after('custom_doctor_fee');
            $table->unsignedInteger('custom_total_fee')->nullable()->after('custom_clinic_fee');
            $table->json('payout_rule_override')->nullable()->after('custom_total_fee');
            $table->json('component_overrides')->nullable()->after('payout_rule_override');
        });

        // 7. Add fee override columns to doctor_sessions
        Schema::table('doctor_sessions', function (Blueprint $table) {
            $table->string('fee_override_type')->default('inherit')->after('clinic_fee'); // 'inherit' | 'custom'
            $table->unsignedInteger('custom_doctor_fee')->nullable()->after('fee_override_type');
            $table->unsignedInteger('custom_clinic_fee')->nullable()->after('custom_doctor_fee');
            $table->unsignedInteger('custom_total_fee')->nullable()->after('custom_clinic_fee');
            $table->json('payout_rule_override')->nullable()->after('custom_total_fee');
            $table->json('component_overrides')->nullable()->after('payout_rule_override');
        });

        // 8. Add snapshot and settlement columns to booking_tokens
        Schema::table('booking_tokens', function (Blueprint $table) {
            $table->foreignId('visit_type_id')->nullable()->after('patient_id')->constrained('visit_types')->nullOnDelete();
            $table->json('fee_snapshot')->nullable()->after('notes');
            $table->string('payout_status')->default('pending')->after('fee_snapshot');
            $table->foreignId('doctor_settlement_id')->nullable()->after('payout_status')->constrained('doctor_settlements')->nullOnDelete();
        });

        // 9. Add snapshot, payout, and settlement columns to bills
        Schema::table('bills', function (Blueprint $table) {
            $table->foreignId('visit_type_id')->nullable()->after('doctor_id')->constrained('visit_types')->nullOnDelete();
            $table->json('fee_snapshot')->nullable()->after('total_amount');
            $table->unsignedInteger('doctor_payout_amount')->default(0)->after('fee_snapshot');
            $table->unsignedInteger('clinic_net_amount')->default(0)->after('doctor_payout_amount');
            $table->unsignedInteger('third_party_amount')->default(0)->after('clinic_net_amount');
            $table->foreignId('doctor_settlement_id')->nullable()->after('third_party_amount')->constrained('doctor_settlements')->nullOnDelete();
        });

        // 10. Data Migration: Populate default settings, visit types, fee components, and migrate existing doctors
        $tenants = DB::table('tenants')->get();

        foreach ($tenants as $tenant) {
            $defaultSettings = [
                'pricing_mode' => 'split',
                'default_doctor_fee' => 200000, // Rs. 2,000 in cents
                'default_clinic_fee' => 80000,  // Rs. 800 in cents
                'default_total_fee' => 280000,  // Rs. 2,800 in cents
                'online_booking_fee' => 0,
                'rounding_step' => 0, // 0, 10, 50, 100
                'default_payout_rule' => [
                    'type' => 'full_doctor_fee',
                    'value' => 0,
                    'min_patients' => 0,
                    'pay_no_shows' => false,
                    'pay_cancelled' => false,
                ],
                'receptionist_can_discount' => true,
                'receptionist_max_discount_type' => 'percent',
                'receptionist_max_discount_value' => 20,
                'fee_setup_completed' => true,
            ];

            DB::table('tenants')->where('id', $tenant->id)->update([
                'fee_settings' => json_encode($defaultSettings),
            ]);

            // Seed default Visit Types
            $now = now();
            $newVisitTypeId = DB::table('visit_types')->insertGetId([
                'tenant_id' => $tenant->id,
                'name' => 'New consultation',
                'code' => 'new',
                'pricing_type' => 'percentage',
                'percentage_value' => 100,
                'fixed_fee_cents' => 0,
                'is_default' => true,
                'is_active' => true,
                'allow_online' => true,
                'sort_order' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('visit_types')->insert([
                [
                    'tenant_id' => $tenant->id,
                    'name' => 'Review / follow-up',
                    'code' => 'review',
                    'pricing_type' => 'percentage',
                    'percentage_value' => 50,
                    'fixed_fee_cents' => 0,
                    'is_default' => false,
                    'is_active' => true,
                    'allow_online' => true,
                    'sort_order' => 2,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'tenant_id' => $tenant->id,
                    'name' => 'Report checking',
                    'code' => 'report',
                    'pricing_type' => 'fixed',
                    'percentage_value' => 0,
                    'fixed_fee_cents' => 50000, // Rs. 500
                    'is_default' => false,
                    'is_active' => true,
                    'allow_online' => false,
                    'sort_order' => 3,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'tenant_id' => $tenant->id,
                    'name' => 'Procedure',
                    'code' => 'procedure',
                    'pricing_type' => 'fixed',
                    'percentage_value' => 0,
                    'fixed_fee_cents' => 350000, // Rs. 3,500
                    'is_default' => false,
                    'is_active' => true,
                    'allow_online' => false,
                    'sort_order' => 4,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);

            // Seed default Fee Components
            DB::table('fee_components')->insert([
                [
                    'tenant_id' => $tenant->id,
                    'name' => 'Doctor fee',
                    'code' => 'doctor_fee',
                    'amount_type' => 'fixed',
                    'target_component_id' => null,
                    'amount_value' => 200000,
                    'recipient' => 'doctor',
                    'recipient_name' => null,
                    'applies_to' => json_encode(['walk_in', 'phone', 'online']),
                    'is_mandatory' => true,
                    'is_separate_line' => true,
                    'is_active' => true,
                    'sort_order' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'tenant_id' => $tenant->id,
                    'name' => 'Channeling fee',
                    'code' => 'channeling_fee',
                    'amount_type' => 'fixed',
                    'target_component_id' => null,
                    'amount_value' => 80000,
                    'recipient' => 'clinic',
                    'recipient_name' => null,
                    'applies_to' => json_encode(['walk_in', 'phone', 'online']),
                    'is_mandatory' => true,
                    'is_separate_line' => true,
                    'is_active' => true,
                    'sort_order' => 2,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);
        }

        // Migrate existing doctors
        $existingDoctors = DB::table('doctors')->get();
        foreach ($existingDoctors as $doctor) {
            $hasFees = ($doctor->doctor_fee > 0 || $doctor->clinic_fee > 0);
            DB::table('doctors')->where('id', $doctor->id)->update([
                'use_clinic_default_fees' => ! $hasFees,
                'pricing_mode' => 'split',
                'custom_doctor_fee' => $hasFees ? $doctor->doctor_fee : null,
                'custom_clinic_fee' => $hasFees ? $doctor->clinic_fee : null,
                'custom_total_fee' => $hasFees ? ($doctor->doctor_fee + $doctor->clinic_fee) : null,
                'payout_rule' => json_encode([
                    'type' => 'full_doctor_fee',
                    'value' => 0,
                    'min_patients' => 0,
                    'pay_no_shows' => false,
                    'pay_cancelled' => false,
                ]),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bills', function (Blueprint $table) {
            $table->dropForeign(['visit_type_id']);
            $table->dropForeign(['doctor_settlement_id']);
            $table->dropColumn(['visit_type_id', 'fee_snapshot', 'doctor_payout_amount', 'clinic_net_amount', 'third_party_amount', 'doctor_settlement_id']);
        });

        Schema::table('booking_tokens', function (Blueprint $table) {
            $table->dropForeign(['visit_type_id']);
            $table->dropForeign(['doctor_settlement_id']);
            $table->dropColumn(['visit_type_id', 'fee_snapshot', 'payout_status', 'doctor_settlement_id']);
        });

        Schema::table('doctor_sessions', function (Blueprint $table) {
            $table->dropColumn(['fee_override_type', 'custom_doctor_fee', 'custom_clinic_fee', 'custom_total_fee', 'payout_rule_override', 'component_overrides']);
        });

        Schema::table('session_templates', function (Blueprint $table) {
            $table->dropColumn(['fee_override_type', 'custom_doctor_fee', 'custom_clinic_fee', 'custom_total_fee', 'payout_rule_override', 'component_overrides']);
        });

        Schema::table('doctors', function (Blueprint $table) {
            $table->dropColumn(['use_clinic_default_fees', 'pricing_mode', 'custom_doctor_fee', 'custom_clinic_fee', 'custom_total_fee', 'payout_rule', 'visit_type_overrides', 'component_overrides']);
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['fee_settings']);
        });

        Schema::dropIfExists('doctor_settlements');
        Schema::dropIfExists('fee_components');
        Schema::dropIfExists('visit_types');
    }
};
