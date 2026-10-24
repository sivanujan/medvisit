<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class PluralizeTest extends TestCase
{
    public function test_plurals_formatting(): void
    {
        $pluralize = fn (int $count, string $singular, ?string $plural = null) => "{$count} ".($count === 1 ? $singular : ($plural ?? "{$singular}s"));

        $this->assertEquals('1 line', $pluralize(1, 'line'));
        $this->assertEquals('2 lines', $pluralize(2, 'line'));
        $this->assertEquals('0 lines', $pluralize(0, 'line'));
        $this->assertEquals('1 unit', $pluralize(1, 'unit'));
        $this->assertEquals('160 units', $pluralize(160, 'unit'));
    }
}
