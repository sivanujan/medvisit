<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PatientAndBillingTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $adminUser;

    protected User $doctorUser;

    protected Doctor $doctor;

    protected DoctorSession $session;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'suwasethamed',
            'name' => 'Suwasetha Medical Care',
            'subdomain' => 'suwasethamed',
        ]);

        $this->adminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@suwasethamed.lk',
        ]);

        $this->doctorUser = User::factory()->doctor()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'doctor@suwasethamed.lk',
        ]);

        $this->doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'Nalin Wickramasinghe',
            'specialty' => 'Dermatologist',
            'slmc_number' => 'SLMC-77665',
            'doctor_fee' => 180000,
            'clinic_fee' => 60000,
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ]);

        $this->session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'session_date' => Carbon::today('Asia/Colombo')->toDateString(),
            'start_time' => '17:00',
            'end_time' => '20:00',
            'max_tokens' => 25,
            'status' => 'scheduled',
            'doctor_fee' => 180000,
            'clinic_fee' => 60000,
            'room_number' => 'Suite 2',
        ]);
    }

    public function test_patient_directory_crud_and_audit_logging(): void
    {
        // 1. Create patient
        $response = $this->actingAs($this->adminUser)
            ->post("http://suwasethamed.{$this->baseDomain}/patients", [
                'name' => 'Chathura Senanayake',
                'phone' => '+94778899001',
                'nic' => '199245678901',
                'gender' => 'male',
                'district' => 'Gampaha',
                'city' => 'Negombo',
                'allergies' => 'Penicillin, Dust',
                'notes' => 'Asthmatic since childhood',
            ]);

        $response->assertSessionHas('success');

        $patient = Patient::where('phone', '+94778899001')->first();
        $this->assertNotNull($patient);
        $this->assertEquals('Chathura Senanayake', $patient->name);
        $this->assertEquals('Gampaha', $patient->district);

        // Verify patient.created audit log
        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $this->tenant->id,
            'action' => 'patient.created',
            'resource_type' => 'patient',
            'resource_id' => (string) $patient->id,
        ]);

        // 2. Update patient
        $updateResponse = $this->actingAs($this->adminUser)
            ->put("http://suwasethamed.{$this->baseDomain}/patients/{$patient->id}", [
                'name' => 'Chathura Senanayake',
                'phone' => '+94778899001',
                'nic' => '199245678901',
                'gender' => 'male',
                'district' => 'Gampaha',
                'city' => 'Ja-Ela',
                'allergies' => 'Penicillin, Aspirin',
            ]);

        $updateResponse->assertSessionHas('success');
        $patient->refresh();
        $this->assertEquals('Ja-Ela', $patient->city);

        // Verify patient.updated audit log
        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $this->tenant->id,
            'action' => 'patient.updated',
            'resource_type' => 'patient',
            'resource_id' => (string) $patient->id,
        ]);

        // 3. View history & audit log
        $historyResponse = $this->actingAs($this->adminUser)
            ->get("http://suwasethamed.{$this->baseDomain}/patients/{$patient->id}/history");

        $historyResponse->assertStatus(200);
        $historyResponse->assertJsonFragment(['name' => 'Chathura Senanayake']);

        // Verify patient.viewed audit log
        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $this->tenant->id,
            'action' => 'patient.viewed',
            'resource_type' => 'patient',
            'resource_id' => (string) $patient->id,
        ]);
    }

    public function test_billing_collections_and_refunds(): void
    {
        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Ruwan Bandara',
            'phone' => '+94712223334',
        ]);

        $token = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $this->session->id,
            'patient_id' => $patient->id,
            'token_number' => 1,
            'status' => 'booked',
        ]);

        $bill = Bill::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $token->id,
            'patient_id' => $patient->id,
            'doctor_id' => $this->doctor->id,
            'receipt_number' => 'REC-TEST-001',
            'doctor_fee' => 180000,
            'clinic_fee' => 60000,
            'other_fee' => 0,
            'discount' => 0,
            'total_amount' => 240000,
            'payment_method' => 'cash',
            'payment_status' => 'pending',
        ]);

        // View billing desk
        $response = $this->actingAs($this->adminUser)
            ->get("http://suwasethamed.{$this->baseDomain}/billing");
        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page->component('Billing/Index'));

        // Collect payment with card and a 200 LKR discount
        $payResponse = $this->actingAs($this->adminUser)
            ->post("http://suwasethamed.{$this->baseDomain}/billing/{$bill->id}/pay", [
                'payment_method' => 'card',
                'discount_lkr' => 200,
                'discount_reason' => 'Senior Citizen Discount',
            ]);

        $payResponse->assertSessionHas('success');

        $bill->refresh();
        $this->assertEquals('paid', $bill->payment_status);
        $this->assertEquals('card', $bill->payment_method);
        $this->assertEquals(20000, $bill->discount); // 200 * 100 cents
        $this->assertEquals(220000, $bill->total_amount); // 2400 - 200 = 2200 LKR (220000 cents)

        // Process refund
        $refundResponse = $this->actingAs($this->adminUser)
            ->post("http://suwasethamed.{$this->baseDomain}/billing/{$bill->id}/refund", [
                'refund_reason' => 'Doctor cancelled consultation',
            ]);

        $refundResponse->assertSessionHas('success');
        $bill->refresh();
        $this->assertEquals('refunded', $bill->payment_status);
        $this->assertNotNull($bill->refunded_at);
        $this->assertEquals('Doctor cancelled consultation', $bill->refund_reason);
    }
}
