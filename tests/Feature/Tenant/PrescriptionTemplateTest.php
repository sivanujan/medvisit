<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\Doctor;
use App\Models\PrescriptionTemplate;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Pharmacy\DoseCalculatorService;
use Database\Seeders\PharmacyPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PrescriptionTemplateTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected Tenant $otherTenant;

    protected User $adminUser;

    protected User $doctorUser;

    protected User $otherDoctorUser;

    protected Doctor $doctor;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(PharmacyPermissionsSeeder::class);

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'suwasethamed',
            'name' => 'Suwasetha Medical Care',
            'subdomain' => 'suwasethamed',
        ]);

        $this->otherTenant = Tenant::factory()->active()->create([
            'id' => 'otherclinic',
            'name' => 'Other Clinic Care',
            'subdomain' => 'otherclinic',
        ]);

        $this->adminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@suwasethamed.lk',
        ]);
        $this->adminUser->givePermissionTo('templates.manage_shared');

        $this->doctorUser = User::factory()->doctor()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'doctor@suwasethamed.lk',
        ]);

        $this->doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'user_id' => $this->doctorUser->id,
            'title' => 'Dr.',
            'name' => 'Sunil Perera',
            'specialty' => 'General Physician',
            'slmc_number' => 'SLMC-12345',
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ]);

        $this->otherDoctorUser = User::factory()->doctor()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'otherdoctor@suwasethamed.lk',
        ]);
    }

    public function test_doctor_can_create_personal_template(): void
    {
        $payload = [
            'name' => 'Acute Gastritis Pack',
            'description' => 'Dual therapy for acute burning sensation',
            'condition_tags' => ['Gastritis', 'GERD'],
            'is_shared' => false,
            'items' => [
                [
                    'display_name' => 'Omeprazole 20mg Capsule',
                    'dose' => '1',
                    'frequency' => 'twice_daily',
                    'timing' => 'before_meals',
                    'route' => 'oral',
                    'duration_days' => 14,
                    'quantity' => 28,
                    'instructions' => 'Take 30 mins before food',
                    'source' => 'clinic',
                ],
            ],
        ];

        $response = $this->actingAs($this->doctorUser)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/templates", $payload);

        $response->assertRedirect();

        $this->assertDatabaseHas('prescription_templates', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Acute Gastritis Pack',
            'is_shared' => false,
            'doctor_id' => $this->doctor->id,
        ]);

        $template = PrescriptionTemplate::where('name', 'Acute Gastritis Pack')->first();
        $this->assertEquals(['Gastritis', 'GERD'], $template->condition_tags);
        $this->assertCount(1, $template->items);
        $this->assertEquals('oral', $template->items->first()->route);
        $this->assertEquals(28, $template->items->first()->quantity);
    }

    public function test_doctor_cannot_create_shared_template_without_permission(): void
    {
        $payload = [
            'name' => 'Clinic Wide Protocol',
            'is_shared' => true,
            'items' => [
                [
                    'display_name' => 'Paracetamol 500mg',
                    'dose' => '1',
                    'frequency' => 'once_daily',
                    'timing' => 'after_meals',
                    'quantity' => 10,
                ],
            ],
        ];

        $response = $this->actingAs($this->doctorUser)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/templates", $payload);

        $response->assertStatus(403);
    }

    public function test_admin_with_permission_can_create_and_toggle_shared_template(): void
    {
        $payload = [
            'name' => 'Clinic Shared Protocol',
            'is_shared' => true,
            'condition_tags' => ['Standard'],
            'items' => [
                [
                    'display_name' => 'Paracetamol 500mg',
                    'dose' => '2',
                    'frequency' => 'every_6_hours',
                    'timing' => 'after_meals',
                    'route' => 'oral',
                    'duration_days' => 3,
                    'quantity' => 24,
                ],
            ],
        ];

        $response = $this->actingAs($this->adminUser)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/templates", $payload);

        $response->assertRedirect();

        $template = PrescriptionTemplate::where('name', 'Clinic Shared Protocol')->firstOrFail();
        $this->assertTrue($template->is_shared);

        // Toggle share to personal
        $toggleResponse = $this->actingAs($this->adminUser)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/templates/{$template->id}/toggle-share");

        $toggleResponse->assertRedirect();
        $this->assertFalse($template->fresh()->is_shared);
    }

    public function test_doctor_cannot_edit_another_doctors_personal_template(): void
    {
        $template = PrescriptionTemplate::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'name' => 'Dr Sunils Private Template',
            'is_shared' => false,
            'created_by' => $this->doctorUser->id,
        ]);

        $payload = [
            'name' => 'Modified Name',
            'items' => [
                [
                    'display_name' => 'Cetirizine 10mg',
                    'dose' => '1',
                    'frequency' => 'once_daily',
                    'timing' => 'bedtime',
                    'quantity' => 7,
                ],
            ],
        ];

        // Other doctor attempts edit
        $response = $this->actingAs($this->otherDoctorUser)
            ->put("http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/templates/{$template->id}", $payload);

        $response->assertStatus(403);
    }

    public function test_quantity_calculation_service(): void
    {
        $calc = app(DoseCalculatorService::class);

        // Solid form: 1 tablet twice daily for 14 days = 28
        $qty1 = $calc->calculateQuantity('1', 'twice_daily', 14, 'Tablet');
        $this->assertEquals(28, $qty1);

        // Fractional dose: 1/2 tablet once daily for 10 days = 5
        $qty2 = $calc->calculateQuantity('1/2', 'once_daily', 10, 'Tablet');
        $this->assertEquals(5, $qty2);

        // Liquid / Syrup form: returns null so doctor enters pack quantity manually
        $qtySyrup = $calc->calculateQuantity('5ml', 'thrice_daily', 5, 'Syrup');
        $this->assertNull($qtySyrup);

        // SOS (when needed) tablet: returns null so doctor enters PRN quantity manually
        $qtySos = $calc->calculateQuantity('1', 'sos', 5, 'Tablet');
        $this->assertNull($qtySos);
    }

    public function test_usage_count_increments_when_template_applied(): void
    {
        $template = PrescriptionTemplate::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Oral Rehydration',
            'is_shared' => true,
            'usage_count' => 5,
            'created_by' => $this->adminUser->id,
        ]);

        $response = $this->actingAs($this->doctorUser)
            ->postJson("http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/templates/{$template->id}/apply");

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'usage_count' => 6,
            ]);

        $this->assertEquals(6, $template->fresh()->usage_count);
        $this->assertNotNull($template->fresh()->last_used_at);
    }

    public function test_duplicate_template_creates_personal_copy(): void
    {
        $template = PrescriptionTemplate::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Standard Pain Pack',
            'is_shared' => true,
            'condition_tags' => ['Pain', 'Fever'],
            'created_by' => $this->adminUser->id,
        ]);

        $template->items()->create([
            'tenant_id' => $this->tenant->id,
            'display_name' => 'Paracetamol 500mg',
            'dose_display' => '1',
            'frequency' => 'thrice_daily',
            'timing' => 'after_meals',
            'quantity' => 15,
        ]);

        $response = $this->actingAs($this->doctorUser)
            ->post("http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/templates/{$template->id}/duplicate");

        $response->assertRedirect();

        $this->assertDatabaseHas('prescription_templates', [
            'tenant_id' => $this->tenant->id,
            'name' => 'Standard Pain Pack (Copy)',
            'is_shared' => false,
            'doctor_id' => $this->doctor->id,
            'created_by' => $this->doctorUser->id,
        ]);
    }

    public function test_search_by_tag_and_medicine_name(): void
    {
        $t1 = PrescriptionTemplate::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Digestive Care',
            'condition_tags' => ['Dyspepsia', 'Acid Reflux'],
            'is_shared' => true,
            'created_by' => $this->adminUser->id,
        ]);
        $t1->items()->create([
            'tenant_id' => $this->tenant->id,
            'display_name' => 'Omeprazole 20mg',
            'dose_display' => '1',
            'frequency' => 'once_daily',
            'timing' => 'before_meals',
            'quantity' => 14,
        ]);

        $t2 = PrescriptionTemplate::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Respiratory Care',
            'condition_tags' => ['Asthma', 'Bronchitis'],
            'is_shared' => true,
            'created_by' => $this->adminUser->id,
        ]);
        $t2->items()->create([
            'tenant_id' => $this->tenant->id,
            'display_name' => 'Salbutamol Inhaler',
            'dose_display' => '2 puffs',
            'frequency' => 'sos',
            'timing' => 'any_time',
            'quantity' => 1,
        ]);

        // Search by tag "Dyspepsia"
        $resTag = $this->actingAs($this->doctorUser)
            ->get("http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/templates?search=Dyspepsia");
        $resTag->assertOk();
        $templatesTag = $resTag->original->getData()['page']['props']['templates'];
        $this->assertTrue(collect($templatesTag)->contains('name', 'Digestive Care'));
        $this->assertFalse(collect($templatesTag)->contains('name', 'Respiratory Care'));

        // Search by medicine "Salbutamol"
        $resMed = $this->actingAs($this->doctorUser)
            ->get("http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/templates?search=Salbutamol");
        $resMed->assertOk();
        $templatesMed = $resMed->original->getData()['page']['props']['templates'];
        $this->assertTrue(collect($templatesMed)->contains('name', 'Respiratory Care'));
        $this->assertFalse(collect($templatesMed)->contains('name', 'Digestive Care'));
    }

    public function test_tenant_isolation_for_prescription_templates(): void
    {
        PrescriptionTemplate::create([
            'tenant_id' => $this->otherTenant->id,
            'name' => 'Secret Protocol Other Clinic',
            'is_shared' => true,
        ]);

        $response = $this->actingAs($this->doctorUser)
            ->get("http://{$this->tenant->subdomain}.{$this->baseDomain}/doctor/templates");

        $response->assertOk();
        $templates = $response->original->getData()['page']['props']['templates'];
        $this->assertFalse(collect($templates)->contains('name', 'Secret Protocol Other Clinic'));
    }
}
