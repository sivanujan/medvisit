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
        Schema::table('subscriptions', function (Blueprint $table) {
            if (! Schema::hasColumn('subscriptions', 'terms_accepted_at')) {
                $table->timestamp('terms_accepted_at')->nullable()->after('status');
            }
            if (! Schema::hasColumn('subscriptions', 'terms_version')) {
                $table->string('terms_version', 30)->nullable()->after('terms_accepted_at');
            }
        });

        Schema::table('payment_transactions', function (Blueprint $table) {
            if (! Schema::hasColumn('payment_transactions', 'terms_accepted_at')) {
                $table->timestamp('terms_accepted_at')->nullable()->after('status');
            }
            if (! Schema::hasColumn('payment_transactions', 'terms_version')) {
                $table->string('terms_version', 30)->nullable()->after('terms_accepted_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            if (Schema::hasColumn('subscriptions', 'terms_version')) {
                $table->dropColumn('terms_version');
            }
            if (Schema::hasColumn('subscriptions', 'terms_accepted_at')) {
                $table->dropColumn('terms_accepted_at');
            }
        });

        Schema::table('payment_transactions', function (Blueprint $table) {
            if (Schema::hasColumn('payment_transactions', 'terms_version')) {
                $table->dropColumn('terms_version');
            }
            if (Schema::hasColumn('payment_transactions', 'terms_accepted_at')) {
                $table->dropColumn('terms_accepted_at');
            }
        });
    }
};
