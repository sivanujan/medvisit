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
        Schema::create('platform_incidents', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->timestamp('started_at');
            $table->timestamp('ended_at')->nullable();
            $table->boolean('affects_all_tenants')->default(true);
            $table->json('tenant_ids')->nullable();
            $table->boolean('is_planned_maintenance')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('platform_incidents');
    }
};
