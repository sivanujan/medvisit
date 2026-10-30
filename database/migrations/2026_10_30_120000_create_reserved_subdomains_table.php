<?php

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
        Schema::create('reserved_subdomains', function (Blueprint $table) {
            $table->id();
            $table->string('subdomain', 64)->unique();
            $table->string('reason', 100)->default('manual_block');
            $table->text('notes')->nullable();
            $table->timestampTz('held_until')->nullable()->index();
            $table->string('original_tenant_id', 64)->nullable()->index();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampsTz();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reserved_subdomains');
    }
};
