<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Support\TvDisplayHelper;
use PHPUnit\Framework\TestCase;

class TvDisplayHelperTest extends TestCase
{
    public function test_format_doctor_name_strips_duplicate_titles(): void
    {
        $this->assertSame('Dr. Anoma Wijesinghe', TvDisplayHelper::formatDoctorName('Dr. Dr. Anoma Wijesinghe'));
        $this->assertSame('Dr. Anoma Wijesinghe', TvDisplayHelper::formatDoctorName('Dr.Dr.Anoma Wijesinghe'));
        $this->assertSame('Dr. Anoma Wijesinghe', TvDisplayHelper::formatDoctorName('Dr. Anoma Wijesinghe'));
        $this->assertSame('Dr. Anoma Wijesinghe', TvDisplayHelper::formatDoctorName('Anoma Wijesinghe'));
        $this->assertSame('Prof. K. Silva', TvDisplayHelper::formatDoctorName('Prof. Dr. K. Silva'));
        $this->assertSame('Doctor', TvDisplayHelper::formatDoctorName(''));
        $this->assertSame('Doctor', TvDisplayHelper::formatDoctorName(null));
    }

    public function test_plural_waiting_returns_proper_plurals(): void
    {
        $this->assertSame('No one waiting', TvDisplayHelper::pluralWaiting(0));
        $this->assertSame('1 patient waiting', TvDisplayHelper::pluralWaiting(1));
        $this->assertSame('5 patients waiting', TvDisplayHelper::pluralWaiting(5));
        $this->assertSame('12 patients waiting', TvDisplayHelper::pluralWaiting(12));
    }

    public function test_mask_patient_name_respects_privacy_modes(): void
    {
        $name = 'Thanarasan Sivanujan';

        // 1. token_only (DEFAULT) -> null (never leak name!)
        $this->assertNull(TvDisplayHelper::maskPatientName($name, TvDisplayHelper::NAME_MODE_TOKEN_ONLY));
        $this->assertNull(TvDisplayHelper::maskPatientName($name, 'unknown'));

        // 2. initial_last -> T. Sivanujan
        $this->assertSame('T. Sivanujan', TvDisplayHelper::maskPatientName($name, TvDisplayHelper::NAME_MODE_INITIAL_LAST));
        $this->assertSame('M. Jinnah', TvDisplayHelper::maskPatientName('Mohamed Ali Jinnah', TvDisplayHelper::NAME_MODE_INITIAL_LAST));
        $this->assertSame('Perera', TvDisplayHelper::maskPatientName('Perera', TvDisplayHelper::NAME_MODE_INITIAL_LAST));

        // 3. first_only -> Thanarasan
        $this->assertSame('Thanarasan', TvDisplayHelper::maskPatientName($name, TvDisplayHelper::NAME_MODE_FIRST_ONLY));

        // 4. full_name -> Thanarasan Sivanujan
        $this->assertSame('Thanarasan Sivanujan', TvDisplayHelper::maskPatientName($name, TvDisplayHelper::NAME_MODE_FULL_NAME));
    }
}
