<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Mail\LeadDemoRequestNotificationMail;
use App\Models\Lead;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class PlatformPhaseBTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();
    }

    public function test_public_demo_request_creates_lead_and_returns_json(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/leads/request-demo', [
            'clinic_name' => 'Colombo Family Healthcare',
            'contact_name' => 'Dr. Samantha Silva',
            'phone' => '077 123 4567',
            'email' => 'samantha@colomboclinic.lk',
            'city' => 'Colombo 03',
            'notes' => 'Looking for appointment queuing and SMS tokens.',
        ]);

        $response->assertStatus(201);
        $response->assertJson([
            'success' => true,
        ]);

        $this->assertDatabaseHas('leads', [
            'clinic_name' => 'Colombo Family Healthcare',
            'contact_name' => 'Dr. Samantha Silva',
            'phone' => '+94771234567',
            'source' => 'website_form',
            'stage' => Lead::STAGE_NEW,
        ]);

        Mail::assertQueued(LeadDemoRequestNotificationMail::class);
    }

    public function test_public_demo_request_honeypot_silently_discards_bots(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/leads/request-demo', [
            'clinic_name' => 'Bot Medical Centre',
            'contact_name' => 'Spam Bot',
            'phone' => '077 999 8888',
            'website_check' => 'http://spam-link.ru', // Honeypot filled!
        ]);

        $response->assertStatus(200);
        $response->assertJson(['success' => true]);

        // Verify lead was NOT inserted into database
        $this->assertDatabaseMissing('leads', [
            'clinic_name' => 'Bot Medical Centre',
        ]);

        Mail::assertNothingQueued();
    }

    public function test_public_demo_request_validates_sri_lankan_phone(): void
    {
        $response = $this->postJson('/api/leads/request-demo', [
            'clinic_name' => 'Invalid Phone Clinic',
            'contact_name' => 'Dr. Error',
            'phone' => '12345', // Invalid phone
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['phone']);
    }

    public function test_demo_request_cors_allows_cloudflare_pages(): void
    {
        $response = $this->withHeaders([
            'Origin' => 'https://medvisit.lk',
        ])->options('/api/leads/request-demo');

        // Check Access-Control-Allow-Origin response header
        $allowOrigin = $response->headers->get('Access-Control-Allow-Origin');
        $this->assertSame('https://medvisit.lk', $allowOrigin);
    }

    public function test_non_super_admin_cannot_access_leads_crm(): void
    {
        $clinicUser = User::factory()->create();

        $response = $this->actingAs($clinicUser)->get('/super-admin/leads');
        $response->assertStatus(403);
    }

    public function test_super_admin_can_view_leads_kanban_and_list(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        Lead::create([
            'clinic_name' => 'Kandy Dental Clinic',
            'contact_name' => 'Dr. Bandara',
            'phone' => '+94712345678',
            'source' => 'facebook',
            'stage' => Lead::STAGE_NEW,
        ]);

        // 1. Kanban view
        $kanbanResponse = $this->actingAs($superAdmin)->get('/super-admin/leads');
        $kanbanResponse->assertStatus(200);
        $kanbanResponse->assertInertia(fn ($page) => $page
            ->component('SuperAdmin/Leads/Index')
            ->has('leads.new')
            ->has('metrics')
            ->where('viewMode', 'kanban')
        );

        // 2. List view
        $listResponse = $this->actingAs($superAdmin)->get('/super-admin/leads?view=list');
        $listResponse->assertStatus(200);
        $listResponse->assertInertia(fn ($page) => $page
            ->component('SuperAdmin/Leads/Index')
            ->has('leads.data')
            ->where('viewMode', 'list')
        );
    }

    public function test_super_admin_can_create_update_and_advance_lead_stage(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        // 1. Create lead manually
        $createResponse = $this->actingAs($superAdmin)->post('/super-admin/leads', [
            'clinic_name' => 'Galle Fort Surgery',
            'contact_name' => 'Dr. Fernando',
            'phone' => '+94912345678',
            'email' => 'fernando@galleclinic.lk',
            'city' => 'Galle',
            'source' => 'referral',
            'stage' => Lead::STAGE_CONTACTED,
            'notes' => 'Spoke over the phone. Wants demo next Tuesday.',
            'next_follow_up_at' => now()->addDays(2)->toDateString(),
        ]);
        $createResponse->assertSessionHas('success');

        $lead = Lead::where('clinic_name', 'Galle Fort Surgery')->first();
        $this->assertNotNull($lead);
        $this->assertSame(Lead::STAGE_CONTACTED, $lead->stage);

        // 2. Advance stage via quick mover
        $stageResponse = $this->actingAs($superAdmin)->patch("/super-admin/leads/{$lead->id}/stage", [
            'stage' => Lead::STAGE_DEMO_BOOKED,
        ]);
        $stageResponse->assertSessionHas('success');

        $lead->refresh();
        $this->assertSame(Lead::STAGE_DEMO_BOOKED, $lead->stage);

        // 3. Update details
        $updateResponse = $this->actingAs($superAdmin)->put("/super-admin/leads/{$lead->id}", [
            'clinic_name' => 'Galle Fort Medical Centre',
            'contact_name' => 'Dr. N. Fernando',
            'phone' => '+94912345678',
            'source' => 'referral',
            'stage' => Lead::STAGE_DEMO_DONE,
            'notes' => 'Demo presented. Very interested in WhatsApp queuing.',
        ]);
        $updateResponse->assertSessionHas('success');

        $lead->refresh();
        $this->assertSame('Galle Fort Medical Centre', $lead->clinic_name);
        $this->assertSame(Lead::STAGE_DEMO_DONE, $lead->stage);
    }

    public function test_super_admin_can_convert_lead_to_clinic(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        $lead = Lead::create([
            'clinic_name' => 'Apex Healthcare',
            'contact_name' => 'Dr. Jayawardena',
            'phone' => '+94772345678',
            'source' => 'website_form',
            'stage' => Lead::STAGE_DEMO_DONE,
        ]);

        $convertResponse = $this->actingAs($superAdmin)->post("/super-admin/leads/{$lead->id}/convert", [
            'action_type' => 'create_new',
            'subdomain' => 'apex-clinic',
            'clinic_name' => 'Apex Healthcare',
            'phone' => '+94772345678',
            'plan' => 'standard',
        ]);
        $convertResponse->assertSessionHas('success');

        $lead->refresh();
        $this->assertSame('apex-clinic', $lead->converted_tenant_id);
        $this->assertSame(Lead::STAGE_TRIAL, $lead->stage);

        // Verify Tenant was created
        $tenant = Tenant::find('apex-clinic');
        $this->assertNotNull($tenant);
        $this->assertSame('Apex Healthcare', $tenant->name);
        $this->assertSame('trial', $tenant->status);
    }

    public function test_super_admin_can_soft_delete_lead(): void
    {
        $superAdmin = User::factory()->superAdmin()->create();

        $lead = Lead::create([
            'clinic_name' => 'Archived Clinic',
            'contact_name' => 'Mr. Disqualified',
            'phone' => '+94770001122',
            'source' => 'cold_call',
            'stage' => Lead::STAGE_LOST,
        ]);

        $deleteResponse = $this->actingAs($superAdmin)->delete("/super-admin/leads/{$lead->id}");
        $deleteResponse->assertSessionHas('success');

        $this->assertSoftDeleted('leads', ['id' => $lead->id]);
    }
}
