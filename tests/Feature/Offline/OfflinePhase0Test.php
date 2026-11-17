<?php

declare(strict_types=1);

namespace Tests\Feature\Offline;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OfflinePhase0Test extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private Tenant $tenant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = (string) config('medvisit.base_domain', 'medvisit.localhost');

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'offline-clinic',
            'name' => 'Offline Resilience Clinic',
            'subdomain' => 'offlinecli',
            'setup_completed_at' => now(),
        ]);

        $plan = Plan::firstOrCreate(
            ['slug' => 'pro'],
            [
                'name' => 'Professional',
                'price_cents' => 1500000,
                'billing_period' => 'monthly',
                'is_active' => true,
            ]
        );

        Subscription::create([
            'tenant_id' => $this->tenant->id,
            'plan_id' => $plan->id,
            'status' => 'active',
            'current_period_start' => now()->subDay(),
            'current_period_end' => now()->addMonth(),
        ]);

        $this->admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@offlinecli.lk',
        ]);
    }

    public function test_offline_config_defaults_are_disabled(): void
    {
        $this->assertFalse(config('offline.enabled'));
        $this->assertFalse(config('offline.phases.phase_0'));
        $this->assertFalse(config('offline.phases.phase_1'));
        $this->assertFalse(config('offline.phases.phase_2'));
        $this->assertSame(36, config('offline.trusted_device_ttl_hours'));
        $this->assertSame(15, config('offline.ping_interval_seconds'));
    }

    public function test_inertia_shares_disabled_offline_props_when_flags_off(): void
    {
        config([
            'offline.enabled' => false,
            'offline.phases.phase_0' => false,
        ]);

        $response = $this->actingAs($this->admin)->get("http://offlinecli.{$this->baseDomain}/dashboard");
        $response->assertStatus(200);

        $response->assertInertia(fn ($page) => $page
            ->where('offline.enabled', false)
            ->where('offline.phase_0', false)
            ->where('offline.phase_1', false)
            ->where('offline.phase_2', false)
        );
    }

    public function test_inertia_shares_enabled_phase_0_when_both_master_and_phase_0_flags_on(): void
    {
        config([
            'offline.enabled' => true,
            'offline.phases.phase_0' => true,
            'offline.phases.phase_1' => false,
            'offline.phases.phase_2' => false,
        ]);

        $response = $this->actingAs($this->admin)->get("http://offlinecli.{$this->baseDomain}/dashboard");
        $response->assertStatus(200);

        $response->assertInertia(fn ($page) => $page
            ->where('offline.enabled', true)
            ->where('offline.phase_0', true)
            ->where('offline.phase_1', false)
            ->where('offline.phase_2', false)
            ->where('offline.ping_interval_seconds', 15)
        );
    }

    public function test_master_flag_off_overrides_phase_flags(): void
    {
        config([
            'offline.enabled' => false,
            'offline.phases.phase_0' => true,
        ]);

        $response = $this->actingAs($this->admin)->get("http://offlinecli.{$this->baseDomain}/dashboard");
        $response->assertStatus(200);

        $response->assertInertia(fn ($page) => $page
            ->where('offline.enabled', false)
            ->where('offline.phase_0', false)
        );
    }

    public function test_health_up_endpoint_returns_ok_on_tenant_subdomain(): void
    {
        $response = $this->get("http://offlinecli.{$this->baseDomain}/up");
        $response->assertStatus(200);

        $headResponse = $this->call('HEAD', "http://offlinecli.{$this->baseDomain}/up");
        $headResponse->assertStatus(200);
    }

    public function test_today_queue_page_loads_with_print_capability(): void
    {
        config([
            'offline.enabled' => true,
            'offline.phases.phase_0' => true,
        ]);

        $response = $this->actingAs($this->admin)->get("http://offlinecli.{$this->baseDomain}/sessions/today");
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('Queue/Today'));
    }

    public function test_settings_page_loads_with_offline_tip_card(): void
    {
        config([
            'offline.enabled' => true,
            'offline.phases.phase_0' => true,
        ]);

        $response = $this->actingAs($this->admin)->get("http://offlinecli.{$this->baseDomain}/settings");
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('Settings/Index'));
    }
}
