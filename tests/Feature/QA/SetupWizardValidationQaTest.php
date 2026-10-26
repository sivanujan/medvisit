<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SetupWizardValidationQaTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private Tenant $tenant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->seed(QaScenarioSeeder::class);

        $this->tenant = Tenant::find('cityhealth');
        $this->admin = User::where('email', 'admin@cityhealth.test')->firstOrFail();
    }

    /**
     * 1. Step 2 validation: invalid hex brand color or missing logo fails validation.
     */
    public function test_setup_step_2_validation_and_draft_live_write(): void
    {
        // Case A: Invalid hex color
        $resInvalid = $this->actingAs($this->admin)
            ->postJson("http://cityhealth.{$this->baseDomain}/setup/step/2", [
                'brand_color' => 'not-a-color',
                'theme' => 'medvisit-teal',
                'use_initials' => true,
            ]);

        $resInvalid->assertStatus(422);
        $resInvalid->assertJsonValidationErrors(['brand_color']);

        // Case B: Valid payload with initials
        $resValid = $this->actingAs($this->admin)
            ->postJson("http://cityhealth.{$this->baseDomain}/setup/step/2", [
                'brand_color' => '#1E6FD9',
                'theme' => 'medvisit-teal',
                'use_initials' => true,
            ]);

        $resValid->assertOk();
        $this->tenant->refresh();

        // Assert values written to both draft and live website look
        $this->assertSame('#1E6FD9', $this->tenant->website_look_draft['brand_color'] ?? null);
        $this->assertSame('#1E6FD9', $this->tenant->website_look['brand_color'] ?? null);
        $this->assertSame('medvisit-teal', $this->tenant->website_theme);
    }

    /**
     * 2. Step 4 validation: address line, district, and phone are required.
     */
    public function test_setup_step_4_validation_and_draft_live_write(): void
    {
        // Case A: Missing required address & phone
        $resInvalid = $this->actingAs($this->admin)
            ->postJson("http://cityhealth.{$this->baseDomain}/setup/step/4", [
                'address_line' => '',
                'city' => '',
                'district' => '',
                'phone' => '',
            ]);

        $resInvalid->assertStatus(422);
        $resInvalid->assertJsonValidationErrors(['address_line', 'city', 'district', 'phone']);

        // Case B: Valid location & contact payload
        $resValid = $this->actingAs($this->admin)
            ->postJson("http://cityhealth.{$this->baseDomain}/setup/step/4", [
                'address_line' => '123 Galle Road',
                'city' => 'Colombo 03',
                'district' => 'Colombo',
                'postal_code' => '00300',
                'latitude' => 6.9271,
                'longitude' => 79.8612,
                'phone' => '0112345678',
                'whatsapp' => '0771234567',
                'email' => 'info@cityhealth.lk',
            ]);

        $resValid->assertOk();
        $this->tenant->refresh();

        $this->assertSame('123 Galle Road', $this->tenant->address_line);
        $this->assertSame('Colombo', $this->tenant->district);
        $this->assertSame('+94 11 234 5678', $this->tenant->phone);
    }
}
