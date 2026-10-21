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
        // 1. Tenant User Impersonation Tokens (Stancl Tenancy integration)
        if (! Schema::hasTable('tenant_user_impersonation_tokens')) {
            Schema::create('tenant_user_impersonation_tokens', function (Blueprint $table) {
                $table->string('token', 128)->primary();
                $table->string('tenant_id');
                $table->string('user_id');
                $table->unsignedBigInteger('impersonator_id')->nullable();
                $table->text('reason')->nullable();
                $table->string('auth_guard')->default('web');
                $table->string('redirect_url')->default('/dashboard');
                $table->timestamp('created_at')->useCurrent();

                $table->foreign('tenant_id')
                    ->references('id')
                    ->on('tenants')
                    ->onUpdate('cascade')
                    ->onDelete('cascade');

                $table->foreign('impersonator_id')
                    ->references('id')
                    ->on('users')
                    ->nullOnDelete();
            });
        }

        // 2. Internal Super Admin Notes for Clinics
        if (! Schema::hasTable('clinic_notes')) {
            Schema::create('clinic_notes', function (Blueprint $table) {
                $table->id();
                $table->string('tenant_id');
                $table->unsignedBigInteger('user_id');
                $table->string('type')->default('general'); // general, call, promise
                $table->text('note');
                $table->timestamps();

                $table->foreign('tenant_id')
                    ->references('id')
                    ->on('tenants')
                    ->onUpdate('cascade')
                    ->onDelete('cascade');

                $table->foreign('user_id')
                    ->references('id')
                    ->on('users')
                    ->cascadeOnDelete();
            });
        }

        // 3. Soft deletes on tenants table (30-day reserve & purge window)
        if (! Schema::hasColumn('tenants', 'deleted_at')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->softDeletes();
            });
        }

        // 4. Secure Encrypted Clinic Data Exports
        if (! Schema::hasTable('clinic_data_exports')) {
            Schema::create('clinic_data_exports', function (Blueprint $table) {
                $table->uuid('id')->primary();
                $table->string('tenant_id');
                $table->unsignedBigInteger('requested_by');
                $table->string('status')->default('pending'); // pending, processing, completed, failed
                $table->string('file_path')->nullable();
                $table->string('error')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamp('downloaded_at')->nullable();
                $table->timestamps();

                $table->foreign('tenant_id')
                    ->references('id')
                    ->on('tenants')
                    ->onUpdate('cascade')
                    ->onDelete('cascade');

                $table->foreign('requested_by')
                    ->references('id')
                    ->on('users')
                    ->cascadeOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clinic_data_exports');

        if (Schema::hasColumn('tenants', 'deleted_at')) {
            Schema::table('tenants', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }

        Schema::dropIfExists('clinic_notes');
        Schema::dropIfExists('tenant_user_impersonation_tokens');
    }
};
