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
        Schema::table('prescription_templates', function (Blueprint $table) {
            $table->jsonb('condition_tags')->nullable()->after('description');
            $table->unsignedInteger('usage_count')->default(0)->after('is_shared');
            $table->timestamp('last_used_at')->nullable()->after('usage_count');
        });

        Schema::table('prescription_template_items', function (Blueprint $table) {
            $table->string('route', 50)->nullable()->default('oral')->after('timing');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('prescription_template_items', function (Blueprint $table) {
            $table->dropColumn('route');
        });

        Schema::table('prescription_templates', function (Blueprint $table) {
            $table->dropColumn(['condition_tags', 'usage_count', 'last_used_at']);
        });
    }
};
