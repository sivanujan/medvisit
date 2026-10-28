<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Log;

/**
 * One-off: replace the old invented default website copy for every existing clinic
 * (live + draft). Re-running is harmless; only exact old default strings are touched.
 */
return new class extends Migration
{
    public function up(): void
    {
        Artisan::call('website:clean-default-claims');
        Log::info('[website] '.trim(Artisan::output()));
    }

    public function down(): void
    {
        // The old copy made claims about clinics; it is not restored.
    }
};
