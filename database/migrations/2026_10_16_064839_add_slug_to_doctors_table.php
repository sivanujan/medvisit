<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->string('slug')->nullable()->after('name');
            $table->index(['tenant_id', 'slug']);
        });

        // Backfill slugs for existing doctors
        $doctors = DB::table('doctors')->get();
        foreach ($doctors as $doc) {
            $base = Str::slug(($doc->title ? $doc->title.' ' : '').$doc->name);
            $slug = $base;
            $counter = 1;
            while (DB::table('doctors')->where('tenant_id', $doc->tenant_id)->where('slug', $slug)->where('id', '!=', $doc->id)->exists()) {
                $slug = "{$base}-".(++$counter);
            }

            DB::table('doctors')->where('id', $doc->id)->update(['slug' => $slug]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('doctors', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'slug']);
            $table->dropColumn('slug');
        });
    }
};
