<?php

declare(strict_types=1);

namespace Tests\Feature\Demo;

use App\Models\Lead;
use App\Models\User;
use Database\Seeders\DemoClinicSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DemoLeadFormTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DemoClinicSeeder::class);
    }

    /**
     * Test /demo loads page with active sessions and roles.
     */
    public function test_demo_hub_page_renders_successfully(): void
    {
        $response = $this->get('/demo');

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Public/Demo')
            ->has('roles')
            ->has('activeSessions')
            ->has('demoUrls')
        );
    }

    /**
     * Test submitting lead capture validates and creates lead with signed access url.
     */
    public function test_submitting_lead_capture_creates_lead_and_returns_signed_url(): void
    {
        $phone = '077 445 6677';

        $response = $this->postJson('/demo/start', [
            'contact_name' => 'Dr. Priyantha Senanayake',
            'clinic_name' => 'Senanayake Care Centre',
            'phone' => $phone,
            'role' => 'clinic_admin',
            'city' => 'Kandy',
            'consent' => true,
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'redirect_url',
            'lead_id',
        ]);

        $response->assertCookie('medvisit_demo_lead');

        $lead = Lead::where('phone', '+94774456677')->first();
        $this->assertNotNull($lead);
        $this->assertEquals('Senanayake Care Centre', $lead->clinic_name);
        $this->assertEquals('public_demo_sandbox', $lead->source);
        $this->assertEquals(['clinic_admin'], $lead->roles_tried);

        // Submit again with different role for same phone
        $secondResponse = $this->postJson('/demo/start', [
            'contact_name' => 'Dr. Priyantha Senanayake',
            'clinic_name' => 'Senanayake Care Centre',
            'phone' => $phone,
            'role' => 'doctor',
            'city' => 'Kandy',
            'consent' => true,
        ]);

        $secondResponse->assertStatus(200);
        $lead->refresh();
        $this->assertEquals(2, $lead->sessions_count);
        $this->assertContains('doctor', $lead->roles_tried);
        $this->assertContains('clinic_admin', $lead->roles_tried);
    }

    /**
     * Test super admin can trigger reset demo from leads CRM.
     */
    public function test_super_admin_can_trigger_demo_reset(): void
    {
        $role = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $superAdmin = User::factory()->create();
        $superAdmin->assignRole($role);

        $response = $this->actingAs($superAdmin)
            ->post('/super-admin/leads/reset-demo');

        $response->assertRedirect();
        $response->assertSessionHas('success');
    }
}
