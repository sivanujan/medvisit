<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Tenant;
use App\Support\ClinicWebsite;
use Illuminate\Console\Command;

/**
 * Replace the old invented default website copy ("25,000+ Satisfied Patients",
 * "SLMC verified specialists", parking/wheelchair claims, …) with neutral defaults,
 * in both the live site and the draft. Only exact default strings are touched.
 */
class CleanWebsiteDefaultClaims extends Command
{
    protected $signature = 'website:clean-default-claims {--dry-run : Count affected clinics without saving}';

    protected $description = 'Replace invented default claims on clinic websites with neutral defaults';

    public function handle(): int
    {
        $affected = [];

        Tenant::query()->orderBy('id')->each(function (Tenant $tenant) use (&$affected) {
            if ($this->option('dry-run')) {
                [, $a] = ClinicWebsite::replaceLegacy($tenant->website_sections, $tenant);
                [, $b] = ClinicWebsite::replaceLegacy($tenant->website_sections_draft, $tenant);
                $seo = is_string($tenant->seo_description) && str_ends_with($tenant->seo_description, ClinicWebsite::LEGACY_SEO_SUFFIX);
                if ($a + $b > 0 || $seo) {
                    $affected[] = $tenant->id;
                }

                return;
            }

            if (ClinicWebsite::cleanLegacyFor($tenant)) {
                $affected[] = $tenant->id;
            }
        });

        $verb = $this->option('dry-run') ? 'would be updated' : 'updated';
        $this->info(count($affected).' clinic website(s) '.$verb.($affected ? ': '.implode(', ', $affected) : '.'));

        return self::SUCCESS;
    }
}
