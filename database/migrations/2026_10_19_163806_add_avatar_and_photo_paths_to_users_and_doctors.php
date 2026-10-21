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
        Schema::table('users', function (Blueprint $table) {
            if (! Schema::hasColumn('users', 'avatar_path')) {
                $table->string('avatar_path')->nullable()->after('remember_token');
            }
            if (! Schema::hasColumn('users', 'avatar_url')) {
                $table->text('avatar_url')->nullable()->after('avatar_path');
            }
        });

        Schema::table('doctors', function (Blueprint $table) {
            if (! Schema::hasColumn('doctors', 'photo_path')) {
                $table->string('photo_path')->nullable()->after('photo_url');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (! Schema::hasColumn('tenants', 'logo_path')) {
                $table->string('logo_path')->nullable()->after('address');
            }
            if (! Schema::hasColumn('tenants', 'logo_url')) {
                $table->text('logo_url')->nullable()->after('logo_path');
            }
            if (! Schema::hasColumn('tenants', 'logo_png_path')) {
                $table->string('logo_png_path')->nullable()->after('logo_url');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (Schema::hasColumn('users', 'avatar_url')) {
                $table->dropColumn('avatar_url');
            }
            if (Schema::hasColumn('users', 'avatar_path')) {
                $table->dropColumn('avatar_path');
            }
        });

        Schema::table('doctors', function (Blueprint $table) {
            if (Schema::hasColumn('doctors', 'photo_path')) {
                $table->dropColumn('photo_path');
            }
        });

        Schema::table('tenants', function (Blueprint $table) {
            if (Schema::hasColumn('tenants', 'logo_png_path')) {
                $table->dropColumn('logo_png_path');
            }
            if (Schema::hasColumn('tenants', 'logo_url')) {
                $table->dropColumn('logo_url');
            }
            if (Schema::hasColumn('tenants', 'logo_path')) {
                $table->dropColumn('logo_path');
            }
        });
    }
};
