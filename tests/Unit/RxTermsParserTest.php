<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\Medicines\RxTermsParser;
use PHPUnit\Framework\TestCase;

class RxTermsParserTest extends TestCase
{
    protected RxTermsParser $parser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->parser = new RxTermsParser;
    }

    public function test_normalizes_tall_man_lettering(): void
    {
        $this->assertEquals('Amlodipine', $this->parser->normalizeIngredientName('amLODIPine'));
        $this->assertEquals('Prednisone', $this->parser->normalizeIngredientName('predniSONE'));
        $this->assertEquals('Metformin', $this->parser->normalizeIngredientName('METFORMIN'));
    }

    public function test_normalizes_single_drug_names(): void
    {
        $single = $this->parser->normalizeGenericName('amLODIPine (Oral)');
        $this->assertEquals('Amlodipine', $single);
    }

    public function test_normalizes_generic_name_combinations(): void
    {
        $normalized = $this->parser->normalizeGenericName('amLODIPine / benazePRIL (Oral Pill)');
        $this->assertEquals('Amlodipine / Benazepril', $normalized);
    }

    public function test_parses_administration_routes(): void
    {
        $this->assertEquals('Oral', $this->parser->parseRoute('amLODIPine (Oral Pill)'));
        $this->assertEquals('Inhalation', $this->parser->parseRoute('Salbutamol (Inhalation)'));
        $this->assertEquals('Injection', $this->parser->parseRoute('Ceftriaxone (Injection)'));
        $this->assertEquals('Topical', $this->parser->parseRoute('Hydrocortisone (Topical Cream)'));
    }

    public function test_parses_er_tablet(): void
    {
        $res = $this->parser->parseStrengthAndForm(' 10 mg ER Tab');
        $this->assertEquals(10.0, $res['strength_value']);
        $this->assertEquals('mg', $res['strength_unit']);
        $this->assertEquals('Tablet', $res['dosage_form']);
        $this->assertEquals('Extended Release', $res['form_detail']);
    }

    public function test_parses_thousands_separator_and_extended_release_variants(): void
    {
        // Metformin 1,000 mg raw RxTerms string
        $res1 = $this->parser->parseStrengthAndForm(' 1,000 mg Modified 24 HR XR Tab');
        $this->assertEquals(1000.0, $res1['strength_value']);
        $this->assertEquals('mg', $res1['strength_unit']);
        $this->assertEquals('1000 mg', $res1['strength_text']);
        $this->assertEquals('Tablet', $res1['dosage_form']);
        $this->assertEquals('Extended Release', $res1['form_detail']);

        $res2 = $this->parser->parseStrengthAndForm(' 1,000 mg Tab');
        $this->assertEquals(1000.0, $res2['strength_value']);
        $this->assertEquals('mg', $res2['strength_unit']);
        $this->assertEquals('1000 mg', $res2['strength_text']);
        $this->assertEquals('Tablet', $res2['dosage_form']);

        $res3 = $this->parser->parseStrengthAndForm(' 500 mg 24HR ER Tab');
        $this->assertEquals(500.0, $res3['strength_value']);
        $this->assertEquals('mg', $res3['strength_unit']);
        $this->assertEquals('Tablet', $res3['dosage_form']);
        $this->assertEquals('Extended Release', $res3['form_detail']);

        $res4 = $this->parser->parseStrengthAndForm(' 1000 mg ER Tab');
        $this->assertEquals(1000.0, $res4['strength_value']);
        $this->assertEquals('mg', $res4['strength_unit']);
        $this->assertEquals('Tablet', $res4['dosage_form']);
        $this->assertEquals('Extended Release', $res4['form_detail']);
    }

    public function test_parses_meq_and_units_with_thousands_separator(): void
    {
        $meq = $this->parser->parseStrengthAndForm(' 8 meq XR Cap');
        $this->assertEquals(8.0, $meq['strength_value']);
        $this->assertEquals('meq', $meq['strength_unit']);
        $this->assertEquals('Capsule', $meq['dosage_form']);
        $this->assertEquals('Extended Release', $meq['form_detail']);

        $unt = $this->parser->parseStrengthAndForm('100,000 unt/ml Cream');
        $this->assertEquals(100000.0, $unt['strength_value']);
        $this->assertEquals('unt/ml', $unt['strength_unit']);
        $this->assertEquals('100000 unt/ml', $unt['strength_text']);
        $this->assertEquals('Cream', $unt['dosage_form']);
    }

    public function test_parses_suspension_concentration(): void
    {
        $res = $this->parser->parseStrengthAndForm(' 100 mg/5ml Susp');
        $this->assertEquals('Suspension', $res['dosage_form']);
        $this->assertEquals('100 mg/5ml', $res['strength_text']);
        $this->assertEquals(100.0, $res['strength_value']);
        $this->assertEquals('mg/5ml', $res['strength_unit']);
    }

    public function test_parses_topical_cream(): void
    {
        $res = $this->parser->parseStrengthAndForm(' 0.1% Crm');
        $this->assertEquals('Cream', $res['dosage_form']);
        $this->assertEquals(0.1, $res['strength_value']);
        $this->assertEquals('%', $res['strength_unit']);
    }

    public function test_handles_unknown_form_as_other(): void
    {
        $res = $this->parser->parseStrengthAndForm(' 50 mg UnknownGizmo');
        $this->assertEquals('Other', $res['dosage_form']);
        $this->assertNull($res['form_detail']);
    }
}
