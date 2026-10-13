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
        // Update any domain ending in .medvisit.test to .medvisit.localhost
        DB::table('domains')
            ->where('domain', 'like', '%.medvisit.test')
            ->get()
            ->each(function ($row): void {
                $newDomain = str_replace('.medvisit.test', '.medvisit.localhost', $row->domain);
                DB::table('domains')
                    ->where('id', $row->id)
                    ->update(['domain' => $newDomain]);
            });

        // Also update any exact medvisit.test domain
        DB::table('domains')
            ->where('domain', 'medvisit.test')
            ->update(['domain' => 'medvisit.localhost']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('domains')
            ->where('domain', 'like', '%.medvisit.localhost')
            ->get()
            ->each(function ($row): void {
                $oldDomain = str_replace('.medvisit.localhost', '.medvisit.test', $row->domain);
                DB::table('domains')
                    ->where('id', $row->id)
                    ->update(['domain' => $oldDomain]);
            });

        DB::table('domains')
            ->where('domain', 'medvisit.localhost')
            ->update(['domain' => 'medvisit.test']);
    }
};
