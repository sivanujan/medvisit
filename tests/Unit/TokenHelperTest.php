<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\TokenHelper;
use PHPUnit\Framework\TestCase;

class TokenHelperTest extends TestCase
{
    public function test_generate_code_candidates_creates_meaningful_initials(): void
    {
        $candidates = TokenHelper::generateCodeCandidates('Sivanujan Thanarasan');
        $this->assertContains('ST', $candidates);
        $this->assertContains('SV', $candidates);

        $anoma = TokenHelper::generateCodeCandidates('Anoma Wijesinghe', 'Dr.');
        $this->assertContains('AW', $anoma);

        $single = TokenHelper::generateCodeCandidates('Thanarasan');
        $this->assertContains('TH', $single);
    }

    public function test_format_token_applies_code_and_padding_rules(): void
    {
        // 2-digit padding for numbers < 100
        $this->assertSame('SV-01', TokenHelper::format(1, 'SV', TokenHelper::FORMAT_WITH_DOCTOR_CODE));
        $this->assertSame('TH-09', TokenHelper::format(9, 'TH', TokenHelper::FORMAT_WITH_DOCTOR_CODE));
        $this->assertSame('AW-42', TokenHelper::format(42, 'AW', TokenHelper::FORMAT_WITH_DOCTOR_CODE));

        // 3-digit without zero pad if >= 100
        $this->assertSame('SV-100', TokenHelper::format(100, 'SV', TokenHelper::FORMAT_WITH_DOCTOR_CODE));
        $this->assertSame('SV-125', TokenHelper::format(125, 'SV', TokenHelper::FORMAT_WITH_DOCTOR_CODE));

        // number_only mode
        $this->assertSame('01', TokenHelper::format(1, 'SV', TokenHelper::FORMAT_NUMBER_ONLY));
        $this->assertSame('99', TokenHelper::format(99, 'SV', TokenHelper::FORMAT_NUMBER_ONLY));
        $this->assertSame('105', TokenHelper::format(105, 'SV', TokenHelper::FORMAT_NUMBER_ONLY));

        // fallback if code is empty
        $this->assertSame('01', TokenHelper::format(1, null, TokenHelper::FORMAT_WITH_DOCTOR_CODE));
        $this->assertSame('05', TokenHelper::format(5, '', TokenHelper::FORMAT_WITH_DOCTOR_CODE));
    }

    public function test_parse_search_term_correctly_identifies_prefixes_and_numbers(): void
    {
        // Standard code hyphen number
        $parsed = TokenHelper::parseSearchTerm('SV-01');
        $this->assertNotNull($parsed);
        $this->assertSame('SV', $parsed['code']);
        $this->assertSame(1, $parsed['number']);

        // Lowercase and no hyphen: sv01
        $parsed = TokenHelper::parseSearchTerm('sv01');
        $this->assertNotNull($parsed);
        $this->assertSame('SV', $parsed['code']);
        $this->assertSame(1, $parsed['number']);

        // Code space number
        $parsed = TokenHelper::parseSearchTerm('TH 5');
        $this->assertNotNull($parsed);
        $this->assertSame('TH', $parsed['code']);
        $this->assertSame(5, $parsed['number']);

        // Plain numbers
        $parsedNum = TokenHelper::parseSearchTerm('01');
        $this->assertNotNull($parsedNum);
        $this->assertNull($parsedNum['code']);
        $this->assertSame(1, $parsedNum['number']);

        $parsedNumSingle = TokenHelper::parseSearchTerm('5');
        $this->assertNotNull($parsedNumSingle);
        $this->assertNull($parsedNumSingle['code']);
        $this->assertSame(5, $parsedNumSingle['number']);

        $parsedNumLarge = TokenHelper::parseSearchTerm('125');
        $this->assertNotNull($parsedNumLarge);
        $this->assertNull($parsedNumLarge['code']);
        $this->assertSame(125, $parsedNumLarge['number']);

        // Non-token search queries
        $this->assertNull(TokenHelper::parseSearchTerm('Dr. Sivanujan'));
        $this->assertNull(TokenHelper::parseSearchTerm('Kamal Perera'));
        $this->assertNull(TokenHelper::parseSearchTerm(''));
    }
}
