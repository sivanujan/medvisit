<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Archive legacy standard plan so it is excluded from active plan lists
        DB::table('plans')
            ->where('slug', 'medvisit-standard')
            ->update([
                'is_active' => false,
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('plans')
            ->where('slug', 'medvisit-standard')
            ->update([
                'is_active' => true,
            ]);
    }
};
