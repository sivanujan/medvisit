<?php

declare(strict_types=1);

namespace Tests\Feature\Demo;

use App\Models\SupportConversation;
use App\Models\Tenant;
use App\Models\User;
use App\Services\PhoneVerification\PhoneVerificationService;
use App\Services\SupportAiService;
use App\Services\TelegramNotificationService;
use Database\Seeders\DemoClinicSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemoGuardsTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $demoTenant;

    protected User $demoAdmin;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DemoClinicSeeder::class);

        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->demoTenant = Tenant::where('is_demo', true)->where('subdomain', 'demo')->firstOrFail();
        $this->demoAdmin = User::where('tenant_id', $this->demoTenant->id)->where('email', 'demo.admin@medvisit.lk')->firstOrFail();
    }

    /**
     * Test X-Robots-Tag header is present on demo requests.
     */
    public function test_demo_tenant_sets_noindex_nofollow_headers(): void
    {
        $response = $this->get("http://demo.{$this->baseDomain}/");
        $response->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    }

    /**
     * Test password changes/resets are blocked in demo mode.
     */
    public function test_password_change_is_blocked_in_demo_mode(): void
    {
        $response = $this->actingAs($this->demoAdmin)
            ->post("http://demo.{$this->baseDomain}/staff/{$this->demoAdmin->id}/reset-password");

        $response->assertSessionHas('error');
        $this->assertStringContainsString('disabled in the demo sandbox', session('error'));
    }

    /**
     * Test staff creation/invitation is blocked in demo mode.
     */
    public function test_staff_creation_is_blocked_in_demo_mode(): void
    {
        $response = $this->actingAs($this->demoAdmin)
            ->post("http://demo.{$this->baseDomain}/staff/invite", [
                'name' => 'Hacker Admin',
                'email' => 'hacker@example.com',
                'role' => 'clinic_admin',
            ]);

        $response->assertSessionHas('error');
        $this->assertStringContainsString('disabled in the demo sandbox', session('error'));
    }

    /**
     * Test JSON requests to blocked actions return 403.
     */
    public function test_blocked_actions_return_403_for_json_requests(): void
    {
        $response = $this->actingAs($this->demoAdmin)
            ->postJson("http://demo.{$this->baseDomain}/staff/invite", [
                'name' => 'Hacker Admin',
                'email' => 'hacker@example.com',
                'role' => 'clinic_admin',
            ]);

        $response->assertStatus(403);
        $response->assertJson([
            'is_demo' => true,
        ]);
    }

    /**
     * Test phone verification returns simulated 123456 code in demo mode.
     */
    public function test_phone_verification_uses_simulated_code_in_demo(): void
    {
        $pv = app(PhoneVerificationService::class);
        $res = $pv->startVerification('0771234567', 'textlk', 'session-demo-test', $this->demoTenant);

        $this->assertTrue($res['success']);
        $this->assertEquals('123456', $res['data']['demo_code'] ?? null);

        // Verify with 123456 succeeds
        $verifyRes = $pv->verifyCode($res['verification_id'], '123456', $this->demoTenant);
        $this->assertTrue($verifyRes['success']);
    }

    /**
     * Test AI support chat returns canned response without external LLM calls.
     */
    public function test_support_ai_returns_canned_message_for_demo(): void
    {
        $conversation = new SupportConversation([
            'tenant_id' => $this->demoTenant->id,
            'channel' => 'dashboard',
            'status' => 'active',
            'visitor_name' => 'Demo Visitor',
        ]);
        $conversation->save();

        $aiService = app(SupportAiService::class);
        $reply = $aiService->generateReply($conversation);

        $this->assertStringContainsString('MedVisit public sandbox demo', $reply['content']);
        $this->assertStringContainsString('070 129 1688', $reply['content']);
        $this->assertFalse($reply['needs_handoff']);
    }

    /**
     * Test Telegram alerts are suppressed for demo tenant.
     */
    public function test_telegram_alerts_are_suppressed_for_demo(): void
    {
        $conversation = new SupportConversation([
            'tenant_id' => $this->demoTenant->id,
            'channel' => 'dashboard',
            'status' => 'waiting_human',
            'visitor_name' => 'Demo Doctor',
        ]);
        $conversation->save();

        $tgService = app(TelegramNotificationService::class);
        $result = $tgService->sendHandoffAlert($conversation);

        // Returns true because it cleanly suppressed without calling Telegram API
        $this->assertTrue($result);
    }
}
