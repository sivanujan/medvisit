<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Events\SupportMessageSent;
use App\Events\SupportStatusChanged;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SupportChatTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private User $superAdmin;

    private Tenant $tenantA;

    private Tenant $tenantB;

    private User $clinicUserA;

    private User $clinicUserB;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->app['url']->defaults(['central_domain' => $this->baseDomain]);

        // Roles
        $superAdminRole = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $doctorRole = Role::firstOrCreate(['name' => 'doctor', 'guard_name' => 'web']);

        $this->superAdmin = User::factory()->create([
            'email' => 'admin@medvisit.lk',
            'name' => 'MedVisit Super Admin',
        ]);
        $this->superAdmin->assignRole($superAdminRole);

        // Tenants
        $this->tenantA = Tenant::factory()->active()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Clinic',
            'subdomain' => 'suwasetha',
        ]);

        $this->tenantB = Tenant::factory()->active()->create([
            'id' => 'lankahealth',
            'name' => 'Lanka Health Clinic',
            'subdomain' => 'lankahealth',
        ]);

        $this->clinicUserA = User::factory()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Dr. Silva',
            'email' => 'silva@suwasetha.lk',
        ]);
        $this->clinicUserA->assignRole($doctorRole);

        $this->clinicUserB = User::factory()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Dr. Perera',
            'email' => 'perera@lankahealth.lk',
        ]);
        $this->clinicUserB->assignRole($doctorRole);

        RateLimiter::clear('support_conv_ip:127.0.0.1');
    }

    public function test_guest_can_start_conversation_with_turnstile_test_token_and_receives_cookie(): void
    {
        Event::fake([SupportMessageSent::class]);

        $response = $this->postJson('/support/conversations', [
            'name' => 'Kusal Mendis',
            'email' => 'kusal@example.com',
            'phone' => '0771234567',
            'message' => 'Hello, I want to know about token queues for my medical center.',
            'turnstile_token' => 'XXXX.DUMMY.TOKEN.XXXX',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'conversation' => ['id', 'public_id', 'status', 'channel', 'visitor_name', 'visitor_email'],
                'visitor_token',
                'messages' => [
                    ['id', 'body', 'sender_type', 'sender_name', 'created_at'],
                ],
            ]);

        $response->assertCookie('support_visitor_token');

        $this->assertDatabaseHas('support_conversations', [
            'visitor_email' => 'kusal@example.com',
            'visitor_name' => 'Kusal Mendis',
            'channel' => 'website',
            'status' => 'ai',
        ]);

        $this->assertDatabaseHas('support_messages', [
            'body' => 'Hello, I want to know about token queues for my medical center.',
            'sender_type' => 'visitor',
        ]);

        Event::assertDispatched(SupportMessageSent::class);
    }

    public function test_guest_cannot_start_conversation_with_invalid_turnstile_token(): void
    {
        $response = $this->postJson('/support/conversations', [
            'name' => 'Bot Spammer',
            'email' => 'spammer@example.com',
            'message' => 'Spam message',
            'turnstile_token' => 'invalid-token',
        ]);

        $response->assertStatus(422);
    }

    public function test_guest_can_send_message_with_valid_visitor_token(): void
    {
        Event::fake([SupportMessageSent::class]);

        $plainToken = 'test_guest_secret_token_12345';
        $hashedToken = hash('sha256', $plainToken);

        $conversation = SupportConversation::create([
            'channel' => 'website',
            'visitor_name' => 'Anura Kumara',
            'visitor_email' => 'anura@example.com',
            'visitor_token' => $hashedToken,
            'status' => 'waiting_human',
            'last_message_at' => now(),
        ]);

        $response = $this->withHeaders(['X-Visitor-Token' => $plainToken])
            ->postJson("/support/conversations/{$conversation->public_id}/messages", [
                'message' => 'Can you also support SMS reminders to patients?',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('message.body', 'Can you also support SMS reminders to patients?')
            ->assertJsonPath('message.sender_type', 'visitor');

        $this->assertDatabaseHas('support_messages', [
            'conversation_id' => $conversation->id,
            'body' => 'Can you also support SMS reminders to patients?',
            'sender_type' => 'visitor',
        ]);

        Event::assertDispatched(SupportMessageSent::class);
    }

    public function test_guest_cannot_send_message_with_invalid_visitor_token(): void
    {
        $plainToken = 'correct_token_12345';
        $hashedToken = hash('sha256', $plainToken);

        $conversation = SupportConversation::create([
            'channel' => 'website',
            'visitor_name' => 'Guest User',
            'visitor_email' => 'guest@example.com',
            'visitor_token' => $hashedToken,
            'status' => 'waiting_human',
            'last_message_at' => now(),
        ]);

        $response = $this->withHeaders(['X-Visitor-Token' => 'wrong_fake_token'])
            ->postJson("/support/conversations/{$conversation->public_id}/messages", [
                'message' => 'Unauthorized message attempt',
            ]);

        $response->assertStatus(403);
    }

    public function test_guest_custom_broadcasting_auth_authorizes_valid_visitor_token(): void
    {
        $plainToken = 'guest_token_broadcasting_123';
        $hashedToken = hash('sha256', $plainToken);

        $conversation = SupportConversation::create([
            'channel' => 'website',
            'visitor_name' => 'Chaminda Vaas',
            'visitor_email' => 'chaminda@example.com',
            'visitor_token' => $hashedToken,
            'status' => 'waiting_human',
            'last_message_at' => now(),
        ]);

        $channelName = "private-support.conversation.{$conversation->public_id}";
        $socketId = '1234.5678';

        $response = $this->withHeaders(['X-Visitor-Token' => $plainToken])
            ->postJson('/support/broadcasting/auth', [
                'channel_name' => $channelName,
                'socket_id' => $socketId,
            ]);

        $response->assertStatus(200)
            ->assertJsonStructure(['auth']);
    }

    public function test_guest_broadcasting_auth_forbidden_for_unauthorized_channel(): void
    {
        $conversation = SupportConversation::create([
            'channel' => 'website',
            'visitor_name' => 'Someone Else',
            'visitor_email' => 'other@example.com',
            'visitor_token' => hash('sha256', 'other_token'),
            'status' => 'waiting_human',
        ]);

        $channelName = "private-support.conversation.{$conversation->public_id}";
        $socketId = '1234.5678';

        $response = $this->withHeaders(['X-Visitor-Token' => 'wrong_token'])
            ->postJson('/support/broadcasting/auth', [
                'channel_name' => $channelName,
                'socket_id' => $socketId,
            ]);

        $response->assertStatus(403);
    }

    public function test_tenant_clinic_user_can_message_support_on_tenant_subdomain(): void
    {
        Event::fake([SupportMessageSent::class]);

        $tenantDomain = "{$this->tenantA->subdomain}.{$this->baseDomain}";

        $response = $this->actingAs($this->clinicUserA)
            ->post("http://{$tenantDomain}/support/conversations", [
                'message' => 'We need assistance configuring multiple receptionists.',
            ], [
                'HTTP_HOST' => $tenantDomain,
                'Accept' => 'application/json',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('conversation.channel', 'dashboard')
            ->assertJsonPath('conversation.status', 'ai');

        $this->assertDatabaseHas('support_conversations', [
            'tenant_id' => $this->tenantA->id,
            'user_id' => $this->clinicUserA->id,
            'channel' => 'dashboard',
        ]);

        Event::assertDispatched(SupportMessageSent::class);
    }

    public function test_cross_tenant_isolation_user_from_tenant_b_cannot_access_tenant_a_conversation(): void
    {
        $convA = SupportConversation::create([
            'channel' => 'dashboard',
            'tenant_id' => $this->tenantA->id,
            'user_id' => $this->clinicUserA->id,
            'status' => 'waiting_human',
            'last_message_at' => now(),
        ]);

        $tenantBDomain = "{$this->tenantB->subdomain}.{$this->baseDomain}";

        // Tenant B user tries to read Tenant A's conversation
        $response = $this->actingAs($this->clinicUserB)
            ->get("http://{$tenantBDomain}/support/conversations/{$convA->public_id}", [
                'HTTP_HOST' => $tenantBDomain,
                'Accept' => 'application/json',
            ]);

        $response->assertStatus(403);

        // Tenant B user tries to send message into Tenant A's conversation
        $postResponse = $this->actingAs($this->clinicUserB)
            ->post("http://{$tenantBDomain}/support/conversations/{$convA->public_id}/messages", [
                'message' => 'Malicious message from another clinic',
            ], [
                'HTTP_HOST' => $tenantBDomain,
                'Accept' => 'application/json',
            ]);

        $postResponse->assertStatus(403);
    }

    public function test_super_admin_can_access_support_inbox_and_reply(): void
    {
        Event::fake([SupportMessageSent::class]);

        $conversation = SupportConversation::create([
            'channel' => 'website',
            'visitor_name' => 'Sanath Jayasuriya',
            'visitor_email' => 'sanath@example.com',
            'status' => 'waiting_human',
            'last_message_at' => now(),
        ]);

        SupportMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'visitor',
            'body' => 'Need pricing information for 3 doctor channeling rooms.',
        ]);

        // Super Admin views the Support Inbox
        $indexResponse = $this->actingAs($this->superAdmin)
            ->get('/super-admin/support?conversation='.$conversation->public_id);

        $indexResponse->assertStatus(200)
            ->assertInertia(fn ($page) => $page
                ->component('SuperAdmin/Support/Inbox')
                ->has('conversations')
                ->has('activeConversation')
                ->has('counts')
            );

        // Super Admin replies
        $replyResponse = $this->actingAs($this->superAdmin)
            ->postJson("/super-admin/support/conversations/{$conversation->public_id}/reply", [
                'message' => 'Hello Sanath, MedVisit supports unlimited channeling rooms on the Growth plan.',
            ]);

        $replyResponse->assertStatus(200)
            ->assertJsonPath('message.body', 'Hello Sanath, MedVisit supports unlimited channeling rooms on the Growth plan.')
            ->assertJsonPath('message.sender_type', 'admin');

        $conversation->refresh();
        $this->assertEquals('human_active', $conversation->status);
        $this->assertEquals($this->superAdmin->id, $conversation->assigned_admin_id);

        Event::assertDispatched(SupportMessageSent::class);
    }

    public function test_non_admin_cannot_access_super_admin_support_inbox(): void
    {
        $response = $this->actingAs($this->clinicUserA)->get('/super-admin/support');
        $response->assertStatus(403);
    }

    public function test_super_admin_can_take_over_and_close_conversation(): void
    {
        Event::fake([SupportStatusChanged::class]);

        $conversation = SupportConversation::create([
            'channel' => 'website',
            'visitor_name' => 'Mahela',
            'visitor_email' => 'mahela@example.com',
            'status' => 'ai',
            'last_message_at' => now(),
        ]);

        // Take Over
        $this->actingAs($this->superAdmin)
            ->post("/super-admin/support/conversations/{$conversation->public_id}/take-over")
            ->assertRedirect();

        $conversation->refresh();
        $this->assertEquals('human_active', $conversation->status);
        $this->assertEquals($this->superAdmin->id, $conversation->assigned_admin_id);

        // Close Conversation
        $this->actingAs($this->superAdmin)
            ->post("/super-admin/support/conversations/{$conversation->public_id}/close")
            ->assertRedirect();

        $conversation->refresh();
        $this->assertEquals('closed', $conversation->status);
        $this->assertNotNull($conversation->closed_at);

        Event::assertDispatched(SupportStatusChanged::class);
    }

    public function test_visitor_can_submit_rating_and_comment_on_closed_conversation(): void
    {
        $plainToken = 'rating_secret_token';
        $hashedToken = hash('sha256', $plainToken);

        $conversation = SupportConversation::create([
            'channel' => 'website',
            'visitor_name' => 'Kumar Sangakkara',
            'visitor_token' => $hashedToken,
            'status' => 'waiting_human',
            'last_message_at' => now(),
        ]);

        $response = $this->withHeaders(['X-Visitor-Token' => $plainToken])
            ->postJson("/support/conversations/{$conversation->public_id}/close", [
                'rating' => 5,
                'rating_comment' => 'Outstanding support experience! Fast and friendly.',
            ]);

        $response->assertStatus(200);

        $conversation->refresh();
        $this->assertEquals('closed', $conversation->status);
        $this->assertEquals(5, $conversation->rating);
        $this->assertEquals('Outstanding support experience! Fast and friendly.', $conversation->rating_comment);
    }

    public function test_super_admin_can_manage_canned_replies(): void
    {
        // 1. Create
        $createRes = $this->actingAs($this->superAdmin)
            ->postJson('/super-admin/support/canned-replies', [
                'title' => 'Pricing details',
                'body' => 'Our Growth plan is LKR 5,000/month with online booking and queue management.',
            ]);

        $createRes->assertStatus(201)
            ->assertJsonPath('reply.title', 'Pricing details');

        $replyId = $createRes->json('reply.id');

        // 2. Update
        $updateRes = $this->actingAs($this->superAdmin)
            ->putJson("/super-admin/support/canned-replies/{$replyId}", [
                'title' => 'Pricing details updated',
                'body' => 'Our Growth plan is LKR 5,000/month and includes a 14-day free trial.',
            ]);

        $updateRes->assertStatus(200)
            ->assertJsonPath('reply.title', 'Pricing details updated');

        // 3. Delete
        $deleteRes = $this->actingAs($this->superAdmin)
            ->deleteJson("/super-admin/support/canned-replies/{$replyId}");

        $deleteRes->assertStatus(200);
        $this->assertDatabaseMissing('support_canned_replies', ['id' => $replyId]);
    }

    public function test_rate_limit_max_5_guest_conversations_per_hour(): void
    {
        RateLimiter::clear('support_conv_ip:127.0.0.1');

        for ($i = 1; $i <= 5; $i++) {
            $res = $this->postJson('/support/conversations', [
                'name' => "Visitor {$i}",
                'email' => "visitor{$i}@example.com",
                'message' => "Message {$i}",
                'turnstile_token' => 'XXXX.DUMMY.TOKEN.XXXX',
            ]);
            $res->assertStatus(200);
        }

        // 6th should be rejected by rate limiter with 429
        $sixth = $this->postJson('/support/conversations', [
            'name' => 'Visitor 6',
            'email' => 'visitor6@example.com',
            'message' => 'Message 6',
            'turnstile_token' => 'XXXX.DUMMY.TOKEN.XXXX',
        ]);
        $sixth->assertStatus(429);
    }

    public function test_rate_limit_max_20_messages_per_minute(): void
    {
        $plainToken = 'rate_msg_token_123';
        $hashedToken = hash('sha256', $plainToken);

        $conversation = SupportConversation::create([
            'channel' => 'website',
            'visitor_name' => 'Rapid Typer',
            'visitor_email' => 'rapid@example.com',
            'visitor_token' => $hashedToken,
            'status' => 'waiting_human',
            'last_message_at' => now(),
        ]);

        RateLimiter::clear("support_msg:{$conversation->id}");

        for ($i = 1; $i <= 20; $i++) {
            $res = $this->withHeaders(['X-Visitor-Token' => $plainToken])
                ->postJson("/support/conversations/{$conversation->public_id}/messages", [
                    'message' => "Fast message {$i}",
                ]);
            $res->assertStatus(200);
        }

        // 21st message rejected by rate limiter with 429
        $twentyFirst = $this->withHeaders(['X-Visitor-Token' => $plainToken])
            ->postJson("/support/conversations/{$conversation->public_id}/messages", [
                'message' => 'Fast message 21',
            ]);
        $twentyFirst->assertStatus(429);
    }
}
