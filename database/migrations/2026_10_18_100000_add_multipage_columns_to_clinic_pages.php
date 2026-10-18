<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clinic_pages', function (Blueprint $table) {
            $table->boolean('is_homepage')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->softDeletes();
        });

        DB::statement('CREATE UNIQUE INDEX clinic_pages_one_homepage_per_tenant ON clinic_pages (tenant_id) WHERE is_homepage = true AND deleted_at IS NULL');

        DB::table('clinic_pages')->where('slug', 'home')->update(['is_homepage' => true]);
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS clinic_pages_one_homepage_per_tenant');

        Schema::table('clinic_pages', function (Blueprint $table) {
            $table->dropColumn(['is_homepage', 'sort_order', 'deleted_at']);
        });
    }
};
