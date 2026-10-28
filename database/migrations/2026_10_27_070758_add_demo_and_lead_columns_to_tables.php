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
        // 1. Tenants table: is_demo flag
        Schema::table('tenants', function (Blueprint $table) {
            if (! Schema::hasColumn('tenants', 'is_demo')) {
                $table->boolean('is_demo')->default(false)->index();
            }
        });

        // 2. Subscription Invoices: is_test flag to exclude sandbox/demo invoices from revenue
        Schema::table('subscription_invoices', function (Blueprint $table) {
            if (! Schema::hasColumn('subscription_invoices', 'is_test')) {
                $table->boolean('is_test')->default(false)->index();
            }
        });

        // 3. Leads table: demo try and lead tracking fields
        Schema::table('leads', function (Blueprint $table) {
            if (! Schema::hasColumn('leads', 'role')) {
                $table->string('role', 50)->nullable()->after('city');
            }
            if (! Schema::hasColumn('leads', 'consented_at')) {
                $table->timestamp('consented_at')->nullable()->after('role');
            }
            if (! Schema::hasColumn('leads', 'ip_hash')) {
                $table->string('ip_hash', 64)->nullable()->index()->after('consented_at');
            }
            if (! Schema::hasColumn('leads', 'user_agent')) {
                $table->text('user_agent')->nullable()->after('ip_hash');
            }
            if (! Schema::hasColumn('leads', 'utm')) {
                $table->json('utm')->nullable()->after('user_agent');
            }
            if (! Schema::hasColumn('leads', 'first_seen_at')) {
                $table->timestamp('first_seen_at')->nullable()->after('utm');
            }
            if (! Schema::hasColumn('leads', 'last_seen_at')) {
                $table->timestamp('last_seen_at')->nullable()->after('first_seen_at');
            }
            if (! Schema::hasColumn('leads', 'sessions_count')) {
                $table->integer('sessions_count')->default(1)->after('last_seen_at');
            }
            if (! Schema::hasColumn('leads', 'roles_tried')) {
                $table->json('roles_tried')->nullable()->after('sessions_count');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn([
                'role',
                'consented_at',
                'ip_hash',
                'user_agent',
                'utm',
                'first_seen_at',
                'last_seen_at',
                'sessions_count',
                'roles_tried',
            ]);
        });

        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->dropColumn('is_test');
        });

        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn('is_demo');
        });
    }
};
