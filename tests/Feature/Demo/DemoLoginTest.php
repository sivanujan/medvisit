<?php

declare(strict_types=1);

namespace Tests\Feature\Demo;

use App\Models\Tenant;
use App\Models\User;
use App\Services\Demo\DemoModeService;
use Database\Seeders\DemoClinicSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoLoginTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $demoTenant;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DemoClinicSeeder::class);

        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->demoTenant = Tenant::where('is_demo', true)->where('subdomain', 'demo')->firstOrFail();
    }

    /**
     * Test unsigned requests to demo login are rejected.
     */
    public function test_unsigned_demo_login_is_rejected(): void
    {
        $response = $this->get("http://demo.{$this->baseDomain}/demo-login/doctor");
        $response->assertStatus(403);
    }

    /**
     * Test valid signed link signs in as doctor and redirects to /doctor.
     */
    public function test_signed_demo_login_authenticates_and_redirects(): void
    {
        $demoService = app(DemoModeService::class);
        $signedUrl = $demoService->generateSignedLoginUrl('doctor');

        $response = $this->get($signedUrl);

        $this->assertTrue($response->isRedirection());
        $this->assertStringEndsWith('/doctor', (string) parse_url((string) $response->headers->get('Location'), PHP_URL_PATH));
        $this->assertAuthenticated();
        $this->assertEquals('demo.doctor@medvisit.lk', auth()->user()->email);
        $this->assertEquals('doctor', session('demo_role'));
    }

    /**
     * Test role switching inside sandbox changes logged-in user and redirects.
     */
    public function test_role_switcher_switches_user_and_redirects(): void
    {
        $doctorUser = User::where('tenant_id', $this->demoTenant->id)->where('email', 'demo.doctor@medvisit.lk')->firstOrFail();

        $response = $this->actingAs($doctorUser)
            ->post("http://demo.{$this->baseDomain}/demo-switch-role", [
                'role' => 'receptionist',
            ]);

        $response->assertRedirect("http://demo.{$this->baseDomain}/queue");
        $this->assertAuthenticated();
        $this->assertEquals('demo.reception@medvisit.lk', auth()->user()->email);
        $this->assertEquals('receptionist', session('demo_role'));
    }
}
