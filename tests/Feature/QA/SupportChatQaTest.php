<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\Patient;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Models\Tenant;
use App\Models\User;
use App\Services\SupportAiService;
use App\Services\SupportChatService;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SupportChatQaTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private Tenant $tenant;

    private User $tenantAdmin;

    private SupportChatService $chatService;

    private SupportAiService $aiService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->seed(QaScenarioSeeder::class);

        $this->tenant = Tenant::find('cityhealth');
        $this->tenantAdmin = User::where('email', 'admin@cityhealth.test')->firstOrFail();
        $this->chatService = app(SupportChatService::class);
        $this->aiService = app(SupportAiService::class);
    }

    /**
     * 1. Channel authentication:
     * - Guest with valid visitor token is authorized for their own conversation channel.
     * - Guest with mismatched/invalid visitor token is denied (403).
     * - Tenant user is authorized for their tenant's conversation channel.
     */
    public function test_support_channel_authentication(): void
    {
        $visitorToken = 'visitor_secret_token_abc123';

        $guestConv = SupportConversation::create([
            'public_id' => 'conv_guest_001',
            'channel' => 'landing',
            'visitor_token' => hash('sha256', $visitorToken),
            'status' => 'ai',
        ]);

        $tenantConv = SupportConversation::create([
            'public_id' => 'conv_tenant_001',
            'channel' => 'dashboard',
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->tenantAdmin->id,
            'status' => 'ai',
        ]);

        // Case A: Valid visitor token for guest conversation -> authorized
        $this->assertTrue(
            $this->chatService->authorizeConversation($guestConv, null, $visitorToken),
            'Guest with valid visitor token must be authorized'
        );

        // Case B: Wrong visitor token for guest conversation -> rejected
        $this->assertFalse(
            $this->chatService->authorizeConversation($guestConv, null, 'wrong_token'),
            'Guest with wrong visitor token must be denied'
        );

        // Case C: Authenticated tenant user for tenant conversation -> authorized
        $this->assertTrue(
            $this->chatService->authorizeConversation($tenantConv, $this->tenantAdmin, null),
            'Tenant user must be authorized for their own tenant conversation'
        );

        // Case D: Another user from a different tenant -> rejected
        $otherTenantUser = User::where('email', 'admin@lankamed.test')->firstOrFail();
        $this->assertFalse(
            $this->chatService->authorizeConversation($tenantConv, $otherTenantUser, null),
            'User from another tenant must be denied access to tenant conversation'
        );
    }

    /**
     * 2. AI Handoff logic:
     * - User asking for human triggers immediate handoff to waiting_human.
     */
    public function test_ai_handoff_to_human_on_escalation_keywords(): void
    {
        $conv = SupportConversation::create([
            'public_id' => 'conv_handoff_test',
            'channel' => 'landing',
            'status' => 'ai',
        ]);

        SupportMessage::create([
            'conversation_id' => $conv->id,
            'sender_type' => 'user',
            'body' => 'I need to speak to an agent, human please',
        ]);

        $reply = $this->aiService->generateReply($conv);

        $this->assertTrue($reply['needs_handoff'], 'Explicit human request must trigger needs_handoff = true');
        $this->assertSame('user_requested_human', $reply['handoff_reason']);
    }

    /**
     * 3. AI Payload inspection:
     * Verify that under NO circumstances are patient records, phones, NICs, or medical details passed in the LLM payload.
     */
    public function test_no_patient_data_in_ai_payload(): void
    {
        // Seed sensitive patient in tenant DB
        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Secret Confidential Patient',
            'phone' => '+94779998877',
            'nic' => '199012345678',
            'gender' => 'male',
        ]);

        $conv = SupportConversation::create([
            'public_id' => 'conv_privacy_audit',
            'channel' => 'dashboard',
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->tenantAdmin->id,
            'status' => 'ai',
        ]);

        SupportMessage::create([
            'conversation_id' => $conv->id,
            'sender_type' => 'user',
            'body' => 'How do I add a new doctor session in the calendar?',
        ]);

        Http::fake([
            '*openrouter.ai*' => Http::response([
                'choices' => [
                    ['message' => ['content' => 'You can add a doctor session by navigating to Calendar -> Add Session.']],
                ],
            ], 200),
        ]);

        config(['services.openrouter.api_key' => 'test-fake-key']);

        $reply = $this->aiService->generateReply($conv);

        // Inspect the captured HTTP request payload
        Http::assertSent(function (Request $request) use ($patient) {
            $body = $request->body();

            // Assert ZERO leakage of patient data
            $hasPatientName = str_contains($body, $patient->name);
            $hasPatientPhone = str_contains($body, $patient->phone);
            $hasPatientNic = str_contains($body, (string) $patient->nic);

            return ! $hasPatientName && ! $hasPatientPhone && ! $hasPatientNic;
        });

        $this->assertStringContainsString('Calendar -> Add Session', $reply['content']);
    }
}
