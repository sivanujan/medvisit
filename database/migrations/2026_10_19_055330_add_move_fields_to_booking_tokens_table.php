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
        Schema::table('booking_tokens', function (Blueprint $table) {
            $table->foreignId('moved_to_token_id')
                ->nullable()
                ->after('status')
                ->constrained('booking_tokens')
                ->nullOnDelete();
            $table->timestamp('moved_at')->nullable()->after('moved_to_token_id');
            $table->string('move_reason')->nullable()->after('moved_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('booking_tokens', function (Blueprint $table) {
            $table->dropForeign(['moved_to_token_id']);
            $table->dropColumn(['moved_to_token_id', 'moved_at', 'move_reason']);
        });
    }
};
