<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Medicine;
use App\Models\MedicineComponent;
use App\Models\MedicineVariant;
use App\Services\Medicines\RxTermsClient;
use App\Services\Medicines\RxTermsParser;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;

class ImportRxTermsMedicines extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'medicines:import-rxterms
                            {--file=database/data/medicine_seed_list.txt : Path to the generic names seed file}
                            {--term= : Import a single term instead of full file}
                            {--with-combinations : Import combination products containing slashes}
                            {--dry-run : Run parsing and display summary without modifying database}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Import standardized medicines and variants from NLM RxTerms API';

    /**
     * Map of British / Sri Lankan local generic names to US RxTerms names.
     *
     * @var array<string, string>
     */
    public const SYNONYM_MAP = [
        'paracetamol' => 'Acetaminophen',
        'salbutamol' => 'Albuterol',
        'adrenaline' => 'Epinephrine',
        'noradrenaline' => 'Norepinephrine',
        'glibenclamide' => 'Glyburide',
        'frusemide' => 'Furosemide',
        'lignocaine' => 'Lidocaine',
        'chlorpheniramine' => 'Chlorpheniramine',
        'co-amoxiclav' => 'Amoxicillin/Clavulanate',
        'pethidine' => 'Meperidine',
        'cyclosporin' => 'Cyclosporine',
        'bendrofluazide' => 'Bendroflumethiazide',
        'isoprenaline' => 'Isoproterenol',
    ];

    public const SSL_HINT = <<<'HINT'

[SSL Configuration Hint for Windows]
cURL error 60 indicates missing or unconfigured CA certificates in PHP.
To resolve without disabling SSL verification:
1. Download official cacert.pem from https://curl.se/ca/cacert.pem
2. Save it to a permanent path, e.g.: C:\Users\<Username>\.php\cacert.pem
3. Open active php.ini (run `php --ini` to locate it)
4. Set the following directives:
   curl.cainfo = "C:/Users/<Username>/.php/cacert.pem"
   openssl.cafile = "C:/Users/<Username>/.php/cacert.pem"
5. Save php.ini and re-run this command.
HINT;

    public function __construct(
        protected RxTermsClient $client,
        protected RxTermsParser $parser
    ) {
        parent::__construct();
    }

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $singleTerm = $this->option('term') ? trim((string) $this->option('term')) : null;
        $withCombos = (bool) $this->option('with-combinations');
        $isDryRun = (bool) $this->option('dry-run');
        $isVerbose = $this->output->isVerbose();

        if ($singleTerm !== null && $singleTerm !== '') {
            $lines = [$singleTerm];
        } else {
            $filePath = base_path((string) $this->option('file'));
            if (! File::exists($filePath)) {
                $this->error("Seed file not found at: {$filePath}");

                return self::FAILURE;
            }

            $fileLines = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if ($fileLines === false || empty($fileLines)) {
                $this->warn('Seed file is empty.');

                return self::SUCCESS;
            }

            $lines = $fileLines;
        }

        $this->info(sprintf(
            'Starting RxTerms import (%d term(s), withCombos: %s, dryRun: %s, verbose: %s)...',
            count($lines),
            $withCombos ? 'yes' : 'no',
            $isDryRun ? 'yes' : 'no',
            $isVerbose ? 'yes' : 'no'
        ));

        $stats = [
            'created' => 0,
            'updated' => 0,
            'skipped' => 0,
            'http_errors' => 0,
            'unparsed' => 0,
        ];

        $consecutiveHttpErrors = 0;
        $firstHttpErrorMessage = null;

        $progressBar = count($lines) > 1 && ! $isVerbose ? $this->output->createProgressBar(count($lines)) : null;
        $progressBar?->start();

        foreach ($lines as $rawTerm) {
            $term = trim($rawTerm);
            if ($term === '' || str_starts_with($term, '#')) {
                $progressBar?->advance();

                continue;
            }

            $lowerTerm = strtolower($term);
            $usSynonym = self::SYNONYM_MAP[$lowerTerm] ?? null;
            $searchTerm = $usSynonym ?? $term;

            if ($isVerbose) {
                $this->line('');
                $this->info('--------------------------------------------------');
                $this->info("Seed term: '{$term}'".($usSynonym ? " (US Synonym: '{$usSynonym}')" : ''));
            }

            // Rate limit sleep (skip for single term)
            if (count($lines) > 1) {
                usleep(250000);
            }

            $searchRes = $this->client->search($searchTerm, 25);

            if ($isVerbose) {
                $rawCount = count($searchRes['names']);
                $this->line("[VERBOSE] RxTerms API raw response: total = {$searchRes['total']}, returned {$rawCount} items");
                if ($rawCount > 0) {
                    $this->line('[VERBOSE] Candidates: '.json_encode($searchRes['names'], JSON_UNESCAPED_SLASHES));
                }
            }

            // 1. Check HTTP Errors
            if (! empty($searchRes['error'])) {
                $stats['http_errors']++;
                $consecutiveHttpErrors++;

                if ($firstHttpErrorMessage === null) {
                    $firstHttpErrorMessage = $searchRes['error'];
                    $this->newLine();
                    $this->error("HTTP error encountered on '{$term}': {$firstHttpErrorMessage}");
                    if (str_contains($firstHttpErrorMessage, 'cURL error 60') || str_contains($firstHttpErrorMessage, 'SSL certificate')) {
                        $this->warn(self::SSL_HINT);
                    }
                }

                if ($consecutiveHttpErrors >= 5) {
                    $this->newLine();
                    $this->error('Aborting import: 5 consecutive HTTP requests failed.');
                    $this->error("Latest error: {$searchRes['error']}");
                    if (str_contains($searchRes['error'], 'cURL error 60') || str_contains($searchRes['error'], 'SSL') || str_contains($firstHttpErrorMessage ?? '', 'SSL')) {
                        $this->line(self::SSL_HINT);
                    }

                    $progressBar?->finish();

                    return self::FAILURE;
                }

                $progressBar?->advance();

                continue;
            }

            $consecutiveHttpErrors = 0;
            $names = $searchRes['names'];
            $ef = $searchRes['extra_fields'];

            if (empty($names)) {
                $stats['skipped']++;
                if ($isVerbose) {
                    $this->warn("[VERBOSE] Decision: SKIPPED (No API Match returned for '{$searchTerm}')");
                }
                $progressBar?->advance();

                continue;
            }

            $strengthsAndFormsList = $ef['STRENGTHS_AND_FORMS'] ?? [];
            $rxcuisList = $ef['RXCUIS'] ?? [];
            $sxdgRxcuis = $ef['SXDG_RXCUI'] ?? [];

            $targetBaseSeed = $this->normalizeBaseKey($term);
            $targetBaseSearch = $this->normalizeBaseKey($searchTerm);

            $matchedAnyForSeed = false;

            foreach ($names as $idx => $rawDisplayName) {
                $candidateBase = $this->normalizeBaseKey($rawDisplayName);
                $isCombo = str_contains($rawDisplayName, '/');

                // Determine if candidate matches target seed or synonym
                $isDirectBaseMatch = ($candidateBase === $targetBaseSearch || $candidateBase === $targetBaseSeed);

                // Check combo logic
                if ($isCombo) {
                    $targetIsCombo = str_contains($targetBaseSearch, '/') || str_contains($targetBaseSeed, '/');
                    if (! $targetIsCombo && ! $withCombos) {
                        if ($isVerbose) {
                            $this->line("[VERBOSE] Candidate '{$rawDisplayName}': SKIPPED (combo excluded without --with-combinations)");
                        }

                        continue;
                    }

                    if (! $isDirectBaseMatch) {
                        $firstIng = explode('/', $candidateBase)[0] ?? '';
                        if (! $withCombos || ($firstIng !== $targetBaseSearch && $firstIng !== $targetBaseSeed)) {
                            if ($isVerbose) {
                                $this->line("[VERBOSE] Candidate '{$rawDisplayName}': SKIPPED (combo does not match base)");
                            }

                            continue;
                        }
                    }
                } elseif (! $isDirectBaseMatch) {
                    if ($isVerbose) {
                        $this->line("[VERBOSE] Candidate '{$rawDisplayName}': SKIPPED (base '{$candidateBase}' != '{$targetBaseSearch}')");
                    }

                    continue;
                }

                $matchedAnyForSeed = true;
                $route = $this->parser->parseRoute($rawDisplayName);
                $rawSxdg = ! empty($sxdgRxcuis[$idx]) ? trim((string) $sxdgRxcuis[$idx]) : null;
                $sxdgRxcui = ($rawSxdg !== null && $rawSxdg !== '' && strtoupper($rawSxdg) !== 'NA') ? $rawSxdg : null;

                $strengths = $strengthsAndFormsList[$idx] ?? [];
                $rxcuis = $rxcuisList[$idx] ?? [];

                // Generic name & synonyms to store
                if ($usSynonym !== null) {
                    $genericName = $this->parser->normalizeIngredientName($term);
                    $synonyms = [$usSynonym];
                } else {
                    $genericName = $this->parser->normalizeGenericName($rawDisplayName);
                    $synonyms = [];
                }

                $normalizedName = strtolower(trim($genericName));

                if ($isVerbose) {
                    $this->info(sprintf(
                        "[VERBOSE] Candidate '%s': MATCHED -> Generic: '%s', Route: '%s', Variants: %d",
                        $rawDisplayName,
                        $genericName,
                        $route,
                        count($strengths)
                    ));
                }

                if ($isDryRun) {
                    $stats['created']++;

                    continue;
                }

                DB::transaction(function () use (
                    $normalizedName,
                    $genericName,
                    $route,
                    $synonyms,
                    $isCombo,
                    $sxdgRxcui,
                    $rawDisplayName,
                    $strengths,
                    $rxcuis,
                    &$stats
                ) {
                    $existing = Medicine::withTrashed()
                        ->where('normalized_name', $normalizedName)
                        ->where('route', $route)
                        ->first();

                    if (! $existing && $sxdgRxcui) {
                        $existing = Medicine::withTrashed()
                            ->where('rxterms_sxdg_rxcui', $sxdgRxcui)
                            ->first();
                    }

                    if ($existing) {
                        $existingMergedSynonyms = array_values(array_unique(array_filter(array_merge(
                            $existing->synonyms ?? [],
                            $synonyms,
                            ($genericName !== $existing->generic_name ? [$genericName] : [])
                        ))));

                        $existing->update([
                            'synonyms' => $existingMergedSynonyms,
                            'deleted_at' => null,
                        ]);
                        $medicine = $existing;
                        $stats['updated']++;
                    } else {
                        $sxdgTaken = $sxdgRxcui ? Medicine::withTrashed()->where('rxterms_sxdg_rxcui', $sxdgRxcui)->exists() : false;

                        $medicine = Medicine::create([
                            'generic_name' => $genericName,
                            'normalized_name' => $normalizedName,
                            'route' => $route,
                            'synonyms' => $synonyms,
                            'is_combination' => $isCombo,
                            'rxterms_sxdg_rxcui' => (! $sxdgTaken ? $sxdgRxcui : null),
                            'source' => Medicine::SOURCE_RXTERMS,
                            'status' => Medicine::STATUS_APPROVED,
                        ]);
                        $stats['created']++;
                    }

                    // Save combination components
                    if ($isCombo) {
                        $ingredients = array_map('trim', explode('/', preg_replace('/\s*\(.*?\)\s*/', '', $rawDisplayName) ?? $rawDisplayName));
                        foreach ($ingredients as $pos => $ingredient) {
                            $cleanIng = $this->parser->normalizeIngredientName($ingredient);
                            MedicineComponent::updateOrCreate(
                                [
                                    'medicine_id' => $medicine->id,
                                    'position' => $pos + 1,
                                ],
                                [
                                    'ingredient_name' => $cleanIng,
                                ]
                            );
                        }
                    }

                    // Save variants (strength + form)
                    foreach ($strengths as $sIdx => $rawSf) {
                        $parsedSf = $this->parser->parseStrengthAndForm((string) $rawSf);
                        $rawRxcui = ! empty($rxcuis[$sIdx]) ? trim((string) $rxcuis[$sIdx]) : null;
                        $rxcui = ($rawRxcui !== null && $rawRxcui !== '' && strtoupper($rawRxcui) !== 'NA') ? $rawRxcui : null;

                        if ($parsedSf['dosage_form'] === 'Other') {
                            $stats['unparsed']++;
                        }

                        $existingCombo = MedicineVariant::where('medicine_id', $medicine->id)
                            ->where('strength_text', $parsedSf['strength_text'])
                            ->where('dosage_form', $parsedSf['dosage_form'])
                            ->where('form_detail', $parsedSf['form_detail'])
                            ->first();

                        $variantByRxcui = $rxcui ? MedicineVariant::where('rxcui', $rxcui)->first() : null;

                        if ($existingCombo) {
                            if ($variantByRxcui && $variantByRxcui->id !== $existingCombo->id) {
                                $variantByRxcui->brands()->update(['medicine_variant_id' => $existingCombo->id]);
                                $variantByRxcui->delete();
                            }

                            $existingCombo->update([
                                'strength_value' => $parsedSf['strength_value'],
                                'strength_unit' => $parsedSf['strength_unit'],
                                'rxcui' => $rxcui ?? $existingCombo->rxcui,
                                'source' => Medicine::SOURCE_RXTERMS,
                                'status' => Medicine::STATUS_APPROVED,
                            ]);
                        } elseif ($variantByRxcui) {
                            $variantByRxcui->update([
                                'medicine_id' => $medicine->id,
                                'strength_text' => $parsedSf['strength_text'],
                                'dosage_form' => $parsedSf['dosage_form'],
                                'form_detail' => $parsedSf['form_detail'],
                                'strength_value' => $parsedSf['strength_value'],
                                'strength_unit' => $parsedSf['strength_unit'],
                                'rxcui' => $rxcui,
                                'source' => Medicine::SOURCE_RXTERMS,
                                'status' => Medicine::STATUS_APPROVED,
                            ]);
                        } else {
                            MedicineVariant::create([
                                'medicine_id' => $medicine->id,
                                'strength_text' => $parsedSf['strength_text'],
                                'dosage_form' => $parsedSf['dosage_form'],
                                'form_detail' => $parsedSf['form_detail'],
                                'strength_value' => $parsedSf['strength_value'],
                                'strength_unit' => $parsedSf['strength_unit'],
                                'rxcui' => $rxcui,
                                'source' => Medicine::SOURCE_RXTERMS,
                                'status' => Medicine::STATUS_APPROVED,
                            ]);
                        }
                    }
                });
            }

            if (! $matchedAnyForSeed) {
                $stats['skipped']++;
                if ($isVerbose) {
                    $this->warn("[VERBOSE] Decision: SKIPPED (candidates did not match seed '{$term}')");
                }
            }

            $progressBar?->advance();
        }

        $progressBar?->finish();
        $this->newLine(2);

        $this->table(
            ['Metric', 'Count'],
            [
                ['Created / Parsed', $stats['created']],
                ['Updated', $stats['updated']],
                ['Skipped (No API Match)', $stats['skipped']],
                ['HTTP Errors', $stats['http_errors']],
                ['Unparsed Forms (Logged as Other)', $stats['unparsed']],
            ]
        );

        $this->info('RxTerms import completed successfully.');

        return self::SUCCESS;
    }

    /**
     * Normalize drug base name for robust cross-matching.
     * Strips route parentheses (e.g. "(Oral Pill)"), release modifiers (e.g. "XR"),
     * removes whitespace around slashes, and lowercases.
     */
    protected function normalizeBaseKey(string $name): string
    {
        // 1. Strip parentheses e.g. "amLODIPine (Oral Pill)" -> "amLODIPine"
        $cleaned = preg_replace('/\s*\(.*?\)\s*/', '', trim($name)) ?? $name;

        // 2. Strip trailing release abbreviations if present e.g. "Amoxicillin/Clavulanate XR" -> "Amoxicillin/Clavulanate"
        $cleaned = preg_replace('/\s+(?:xr|er|sr|cr|dr|ir)$/i', '', $cleaned) ?? $cleaned;

        // 3. Normalize slashes e.g. "A / B" -> "a/b"
        $parts = explode('/', $cleaned);
        $normalizedParts = array_map(fn ($p) => strtolower(trim($p)), $parts);

        return implode('/', $normalizedParts);
    }
}
