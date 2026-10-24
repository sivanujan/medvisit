<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $plans = config('medvisit_public.plans', []);
        $now = Carbon::now();

        foreach ($plans as $slug => $def) {
            $existing = DB::table('plans')->where('slug', $slug)->first();

            $data = [
                'name' => $def['name'] ?? ucfirst($slug),
                'price_cents' => (int) ($def['price_cents'] ?? 0),
                'billing_interval' => 'month',
                'features' => json_encode($def['features'] ?? []),
                'is_active' => true,
                'updated_at' => $now,
            ];

            if ($existing) {
                DB::table('plans')->where('slug', $slug)->update($data);
            } else {
                $data['slug'] = $slug;
                $data['created_at'] = $now;
                DB::table('plans')->insert($data);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('plans')->whereIn('slug', ['basic', 'pro', 'advanced'])->delete();
    }
};
