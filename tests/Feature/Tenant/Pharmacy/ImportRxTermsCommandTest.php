<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant\Pharmacy;

use App\Models\Medicine;
use App\Models\MedicineVariant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ImportRxTermsCommandTest extends TestCase
{
    use RefreshDatabase;

    protected string $tempSeedFile;

    protected function setUp(): void
    {
        parent::setUp();

        $this->tempSeedFile = 'storage/temp_test_medicines.txt';
        File::put(base_path($this->tempSeedFile), "Amlodipine\n");
    }

    protected function tearDown(): void
    {
        if (File::exists(base_path($this->tempSeedFile))) {
            File::delete(base_path($this->tempSeedFile));
        }

        parent::tearDown();
    }

    public function test_import_command_creates_rows(): void
    {
        Http::fake([
            'clinicaltables.nlm.nih.gov/api/rxterms/v3/search*' => Http::response([
                1,
                ['amLODIPine (Oral Pill)'],
                [
                    'STRENGTHS_AND_FORMS' => [[' 5 mg Tab', ' 10 mg Tab']],
                    'RXCUIS' => [['197361', '197362']],
                    'SXDG_RXCUI' => ['1152707'],
                ],
                [['amLODIPine (Oral Pill)']],
            ], 200),
        ]);

        $this->artisan("medicines:import-rxterms --file={$this->tempSeedFile}")
            ->assertSuccessful();

        $this->assertDatabaseHas('medicines', [
            'generic_name' => 'Amlodipine',
            'normalized_name' => 'amlodipine',
            'route' => 'Oral',
            'status' => 'approved',
        ]);

        $this->assertEquals(2, MedicineVariant::count());
        $this->assertDatabaseHas('medicine_variants', [
            'strength_text' => '5 mg',
            'dosage_form' => 'Tablet',
        ]);
        $this->assertDatabaseHas('medicine_variants', [
            'strength_text' => '10 mg',
            'dosage_form' => 'Tablet',
        ]);
    }

    public function test_import_command_matches_real_tallman_and_multiple_routes(): void
    {
        Http::fake([
            'clinicaltables.nlm.nih.gov/api/rxterms/v3/search*' => Http::response([
                2,
                ['amLODIPine (Oral Pill)', 'amLODIPine (Oral Liquid)'],
                [
                    'STRENGTHS_AND_FORMS' => [
                        [' 5 mg Tab', ' 10 mg Tab'],
                        [' 1 mg/ml Soln'],
                    ],
                    'RXCUIS' => [
                        ['197361', '197362'],
                        ['197363'],
                    ],
                    'SXDG_RXCUI' => ['1152707', '1152708'],
                ],
                [['amLODIPine (Oral Pill)'], ['amLODIPine (Oral Liquid)']],
            ], 200),
        ]);

        $this->artisan('medicines:import-rxterms --term=amlodipine --verbose')
            ->expectsOutputToContain('amLODIPine (Oral Pill)')
            ->expectsOutputToContain('amLODIPine (Oral Liquid)')
            ->assertSuccessful();

        $this->assertDatabaseHas('medicines', [
            'generic_name' => 'Amlodipine',
            'normalized_name' => 'amlodipine',
            'route' => 'Oral',
        ]);

        $this->assertEquals(3, MedicineVariant::count());
        $this->assertDatabaseHas('medicine_variants', [
            'strength_text' => '1 mg/ml',
            'dosage_form' => 'Solution',
        ]);
    }

    public function test_import_command_uses_synonym_map_for_local_names(): void
    {
        Http::fake([
            'clinicaltables.nlm.nih.gov/api/rxterms/v3/search*terms=Acetaminophen*' => Http::response([
                2,
                ['Acetaminophen (Oral Pill)', 'Acetaminophen (Injectable)'],
                [
                    'STRENGTHS_AND_FORMS' => [
                        [' 500 mg Tab'],
                        [' 10 mg/ml Soln'],
                    ],
                    'RXCUIS' => [
                        ['198440'],
                        ['198441'],
                    ],
                    'SXDG_RXCUI' => ['1152800', '1152801'],
                ],
                [['Acetaminophen (Oral Pill)'], ['Acetaminophen (Injectable)']],
            ], 200),
        ]);

        $this->artisan('medicines:import-rxterms --term=Paracetamol --verbose')
            ->assertSuccessful();

        // 2 medicines imported (Oral and Injection routes)
        $this->assertEquals(2, Medicine::count());

        $oral = Medicine::where('route', 'Oral')->first();
        $this->assertNotNull($oral);
        $this->assertEquals('Paracetamol', $oral->generic_name);
        $this->assertEquals(['Acetaminophen'], $oral->synonyms);

        $injection = Medicine::where('route', 'Injection')->first();
        $this->assertNotNull($injection);
        $this->assertEquals('Paracetamol', $injection->generic_name);
        $this->assertEquals(['Acetaminophen'], $injection->synonyms);
    }

    public function test_import_command_reports_http_errors_and_aborts_on_5_consecutive(): void
    {
        File::put(base_path($this->tempSeedFile), "Term1\nTerm2\nTerm3\nTerm4\nTerm5\nTerm6\n");

        Http::fake([
            'clinicaltables.nlm.nih.gov/api/rxterms/v3/search*' => Http::response('Gateway Timeout', 504),
        ]);

        $this->artisan("medicines:import-rxterms --file={$this->tempSeedFile}")
            ->expectsOutputToContain('HTTP error encountered')
            ->expectsOutputToContain('Aborting import: 5 consecutive HTTP requests failed.')
            ->assertFailed();
    }

    public function test_import_command_is_idempotent(): void
    {
        Http::fake([
            'clinicaltables.nlm.nih.gov/api/rxterms/v3/search*' => Http::response([
                1,
                ['amLODIPine (Oral Pill)'],
                [
                    'STRENGTHS_AND_FORMS' => [[' 5 mg Tab', ' 10 mg Tab']],
                    'RXCUIS' => [['197361', '197362']],
                    'SXDG_RXCUI' => ['1152707'],
                ],
                [['amLODIPine (Oral Pill)']],
            ], 200),
        ]);

        // Run once
        $this->artisan("medicines:import-rxterms --file={$this->tempSeedFile}")
            ->assertSuccessful();

        $initialMedicineCount = Medicine::count();
        $initialVariantCount = MedicineVariant::count();

        // Run again
        $this->artisan("medicines:import-rxterms --file={$this->tempSeedFile}")
            ->assertSuccessful();

        $this->assertEquals($initialMedicineCount, Medicine::count());
        $this->assertEquals($initialVariantCount, MedicineVariant::count());
    }

    public function test_dry_run_writes_nothing(): void
    {
        Http::fake([
            'clinicaltables.nlm.nih.gov/api/rxterms/v3/search*' => Http::response([
                1,
                ['amLODIPine (Oral Pill)'],
                [
                    'STRENGTHS_AND_FORMS' => [[' 5 mg Tab', ' 10 mg Tab']],
                    'RXCUIS' => [['197361', '197362']],
                    'SXDG_RXCUI' => ['1152707'],
                ],
                [['amLODIPine (Oral Pill)']],
            ], 200),
        ]);

        $this->artisan("medicines:import-rxterms --file={$this->tempSeedFile} --dry-run")
            ->assertSuccessful();

        $this->assertEquals(0, Medicine::count());
        $this->assertEquals(0, MedicineVariant::count());
    }
}
