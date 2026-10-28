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
        Schema::create('leads', function (Blueprint $table) {
            $table->id();
            $table->string('clinic_name');
            $table->string('contact_name');
            $table->string('phone');
            $table->string('email')->nullable();
            $table->string('city')->nullable();
            $table->string('source')->default('website_form'); // website_form, facebook, instagram, whatsapp, referral, walk_in, cold_call, other
            $table->string('stage')->default('new'); // new, contacted, demo_booked, demo_done, trial, paying, lost
            $table->text('notes')->nullable();
            $table->timestamp('next_follow_up_at')->nullable();
            $table->timestamp('demo_scheduled_at')->nullable();
            $table->string('lost_reason')->nullable();
            $table->string('converted_tenant_id')->nullable();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('stage');
            $table->index('source');
            $table->index('next_follow_up_at');
            $table->index('converted_tenant_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
