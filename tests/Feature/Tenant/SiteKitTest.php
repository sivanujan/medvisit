<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\Tenant;
use App\Models\User;
use App\Support\SiteKit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteKitTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $admin;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Medical Center',
            'subdomain' => 'suwasetha',
            'website_published' => true,
            'website_theme' => 'ocean-blue',
        ]);

        $this->admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@suwasetha.lk',
        ]);
    }

    private function url(string $path = ''): string
    {
        return "http://{$this->tenant->subdomain}.{$this->baseDomain}{$path}";
    }

    private function validKit(): array
    {
        return SiteKit::defaultsForTheme('medvisit-teal');
    }

    public function test_kit_defaults_from_theme_when_missing(): void
    {
        $this->actingAs($this->admin)
            ->getJson($this->url('/website/kit'))
            ->assertOk()
            ->assertJsonPath('kit.colors.0.id', 'primary')
            ->assertJsonPath('kit.colors.0.value', '#1E6FD9');

        $this->get($this->url('/'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Public/ClinicLanding')
                ->where('siteKit.colors.0.value', '#1E6FD9')
            );
    }

    public function test_admin_can_save_kit(): void
    {
        $kit = $this->validKit();
        $kit['colors'][] = ['id' => 'custom-brand', 'name' => 'Brand', 'value' => '#112233'];
        $kit['fonts'] = ['heading' => 'Merriweather', 'body' => 'Inter'];

        $this->actingAs($this->admin)
            ->putJson($this->url('/website/kit'), $kit)
            ->assertOk()
            ->assertJsonPath('kit.fonts.heading', 'Merriweather');

        $this->actingAs($this->admin)
            ->getJson($this->url('/website/kit'))
            ->assertJsonPath('kit.colors.4.id', 'custom-brand')
            ->assertJsonPath('kit.fonts.heading', 'Merriweather');
    }

    public function test_kit_rejects_unknown_font(): void
    {
        $kit = $this->validKit();
        $kit['fonts']['heading'] = "Evil'; } body { display:none";

        $this->actingAs($this->admin)
            ->putJson($this->url('/website/kit'), $kit)
            ->assertStatus(422)
            ->assertJsonValidationErrors('fonts.heading');
    }

    public function test_kit_rejects_bad_hex(): void
    {
        $kit = $this->validKit();
        $kit['colors'][0]['value'] = 'red';

        $this->actingAs($this->admin)
            ->putJson($this->url('/website/kit'), $kit)
            ->assertStatus(422)
            ->assertJsonValidationErrors('colors.0.value');
    }

    public function test_kit_rejects_eleventh_custom_color(): void
    {
        $kit = $this->validKit();
        for ($i = 1; $i <= 11; $i++) {
            $kit['colors'][] = ['id' => "custom-c{$i}", 'name' => "Color {$i}", 'value' => '#112233'];
        }

        $this->actingAs($this->admin)
            ->putJson($this->url('/website/kit'), $kit)
            ->assertStatus(422)
            ->assertJsonValidationErrors('colors');
    }

    public function test_removed_custom_color_is_retired(): void
    {
        $kit = $this->validKit();
        $kit['colors'][] = ['id' => 'custom-brand', 'name' => 'Brand', 'value' => '#112233'];

        $this->actingAs($this->admin)->putJson($this->url('/website/kit'), $kit)->assertOk();

        $kit['colors'] = array_slice($kit['colors'], 0, 4);

        $this->actingAs($this->admin)
            ->putJson($this->url('/website/kit'), $kit)
            ->assertOk()
            ->assertJsonCount(4, 'kit.colors')
            ->assertJsonPath('kit.retired.0.id', 'custom-brand')
            ->assertJsonPath('kit.retired.0.value', '#112233');

        // Saving again does not duplicate the retired entry.
        $this->actingAs($this->admin)->putJson($this->url('/website/kit'), $kit)->assertOk()
            ->assertJsonCount(1, 'kit.retired');
    }

    public function test_receptionist_cannot_update_kit(): void
    {
        $receptionist = User::factory()->receptionist()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'desk@suwasetha.lk',
        ]);

        $this->actingAs($receptionist)
            ->putJson($this->url('/website/kit'), $this->validKit())
            ->assertForbidden();
    }
}
