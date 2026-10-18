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

        DB::table('clinic_pages')->where('slug', 'home')->update(['is_homepage' => true]);
    }

    public function down(): void
    {
        Schema::table('clinic_pages', function (Blueprint $table) {
            $table->dropColumn(['is_homepage', 'sort_order', 'deleted_at']);
        });
    }
};
