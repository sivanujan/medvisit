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
        Schema::create('directory_listings', function (Blueprint $table) {
            $table->id();
            $table->string('tenant_id')->unique();
            $table->string('clinic_name');
            $table->string('slug')->unique();
            $table->string('district')->index();
            $table->string('city')->index();
            $table->text('address')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('phone')->nullable();
            $table->string('whatsapp')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('description', 300)->nullable();
            $table->json('services')->nullable();
            $table->boolean('online_booking_enabled')->default(true);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamp('consented_at')->nullable();
            $table->unsignedBigInteger('consented_by_user_id')->nullable();
            $table->unsignedInteger('doctor_count')->default(0);
            $table->timestamps();

            $table->index(['district', 'city']);
            $table->index(['is_active', 'district']);
        });

        Schema::create('directory_doctors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('directory_listing_id')->constrained('directory_listings')->cascadeOnDelete();
            $table->string('tenant_id')->index();
            $table->unsignedBigInteger('doctor_id')->index();
            $table->string('name');
            $table->string('title')->default('Dr.');
            $table->string('specialty')->index();
            $table->string('slug');
            $table->string('photo_url')->nullable();
            $table->unsignedInteger('min_fee_cents')->nullable();
            $table->json('session_schedules')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();

            $table->index(['directory_listing_id', 'is_active']);
            $table->index(['tenant_id', 'doctor_id']);
            $table->index(['specialty', 'is_active']);
        });

        if (Schema::hasTable('booking_tokens') && ! Schema::hasColumn('booking_tokens', 'source')) {
            Schema::table('booking_tokens', function (Blueprint $table) {
                $table->string('source')->nullable()->after('booked_via')->index();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('booking_tokens') && Schema::hasColumn('booking_tokens', 'source')) {
            Schema::table('booking_tokens', function (Blueprint $table) {
                $table->dropColumn('source');
            });
        }

        Schema::dropIfExists('directory_doctors');
        Schema::dropIfExists('directory_listings');
    }
};
