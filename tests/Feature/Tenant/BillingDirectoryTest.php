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
use App\Services\SequenceService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingDirectoryTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $adminUser;

    protected User $receptionistUser;

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

        $this->receptionistUser = User::factory()->receptionist()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'reception@suwasethamed.lk',
        ]);

        $this->doctorUser = User::factory()->doctor()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'doctor@suwasethamed.lk',
        ]);

        $this->doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'title' => 'Dr.',
            'name' => 'K. Sivalingam',
            'specialty' => 'Cardiologist',
            'slmc_number' => '12345',
            'doctor_fee' => 250000,
            'clinic_fee' => 80000,
            'is_active' => true,
        ]);

        $this->session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctor->id,
            'session_date' => Carbon::today('Asia/Colombo')->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '13:00:00',
            'max_tokens' => 30,
            'status' => 'open',
            'room_number' => 'Suite 3',
        ]);
    }

    public function test_format_lkr_includes_thousands_separators(): void
    {
        $this->assertSame('Rs. 60,000.00', Bill::formatLKR(6000000, true));
        $this->assertSame('Rs. 3,300.00', Bill::formatLKR(330000, true));
        $this->assertSame('Rs. 2,800.00', Bill::formatLKR(280000, true));
        $this->assertSame('Rs. 0.00', Bill::formatLKR(0, true));
        $this->assertSame('Rs. 0.00', Bill::formatLKR(null, true));
    }

    public function test_billing_index_renders_with_date_range_and_kpis(): void
    {
        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Sunil Perera',
            'phone' => '+94771234567',
        ]);

        $token = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $this->session->id,
            'patient_id' => $patient->id,
            'token_number' => 1,
            'status' => 'booked',
            'fee_snapshot' => [
                'doctor_fee' => 250000,
                'clinic_fee' => 80000,
                'total_fee' => 330000,
            ],
            'booked_via' => 'reception',
        ]);

        $bill = Bill::create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $this->doctor->id,
            'booking_token_id' => $token->id,
            'receipt_number' => 'REC-001001',
            'doctor_fee' => 250000,
            'clinic_fee' => 80000,
            'total_amount' => 330000,
            'payment_status' => Bill::STATUS_PAID,
            'payment_method' => 'cash',
        ]);

        $url = "http://{$this->tenant->subdomain}.{$this->baseDomain}/billing";

        $response = $this->actingAs($this->adminUser)->get($url);

        $response->assertStatus(200);
        $response->assertInertia(fn ($page) => $page
            ->component('Billing/Index')
            ->has('kpis')
            ->has('report')
            ->has('recentReceipts.data', 1)
            ->where('kpis.collected_formatted', 'Rs. 3,300.00')
            ->where('kpis.doctor_share_formatted', 'Rs. 2,500.00')
            ->where('kpis.clinic_share_formatted', 'Rs. 800.00')
        );
    }

    public function test_payment_collection_assigns_gapless_sequential_receipt_number(): void
    {
        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Kamal Silva',
            'phone' => '+94779876543',
        ]);

        $token = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $this->session->id,
            'patient_id' => $patient->id,
            'token_number' => 2,
            'status' => 'booked',
            'booked_via' => 'reception',
        ]);

        $bill = Bill::create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $this->doctor->id,
            'booking_token_id' => $token->id,
            'receipt_number' => null,
            'doctor_fee' => 250000,
            'clinic_fee' => 80000,
            'total_amount' => 330000,
            'payment_status' => Bill::STATUS_PENDING,
            'payment_method' => 'cash',
        ]);

        $payUrl = "http://{$this->tenant->subdomain}.{$this->baseDomain}/billing/{$bill->id}/pay";

        $response = $this->actingAs($this->receptionistUser)->post($payUrl, [
            'payment_method' => 'cash',
            'discount_lkr' => 300,
            'discount_reason' => 'Senior citizen discount',
        ]);

        $response->assertRedirect();
        $bill->refresh();

        $this->assertSame(Bill::STATUS_PAID, $bill->payment_status);
        $this->assertNotNull($bill->receipt_number);
        $this->assertStringStartsWith('REC-', $bill->receipt_number);
        $this->assertSame(300000, $bill->total_amount); // 330,000 - 30,000 discount = 300,000 cents (Rs. 3,000.00)
        $this->assertSame(30000, $bill->discount);

        // Verify audit event was logged
        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $this->tenant->id,
            'action' => 'billing.payment_collected',
            'resource_id' => (string) $bill->id,
        ]);
    }

    public function test_two_payments_generate_consecutive_receipt_numbers(): void
    {
        $sequenceService = app(SequenceService::class);

        $num1 = $sequenceService->nextReceiptNumber($this->tenant->id);
        $num2 = $sequenceService->nextReceiptNumber($this->tenant->id);

        $this->assertStringStartsWith('REC-', $num1);
        $this->assertStringStartsWith('REC-', $num2);

        $seq1 = (int) substr($num1, 4);
        $seq2 = (int) substr($num2, 4);

        $this->assertSame($seq1 + 1, $seq2);
    }

    public function test_export_billing_data_csv_permission_and_audit(): void
    {
        $exportUrl = "http://{$this->tenant->subdomain}.{$this->baseDomain}/billing/export";

        // Receptionist cannot export -> 403
        $forbiddenResponse = $this->actingAs($this->receptionistUser)->get($exportUrl);
        $forbiddenResponse->assertStatus(403);

        // Clinic Admin can export -> Streamed CSV with UTF-8 BOM
        $adminResponse = $this->actingAs($this->adminUser)->get($exportUrl);
        $adminResponse->assertStatus(200);
        $adminResponse->assertHeader('Content-Type', 'text/csv; charset=UTF-8');

        // Verify audit event was recorded
        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $this->tenant->id,
            'action' => 'billing.exported',
        ]);
    }

    public function test_refund_requires_admin_and_logs_audit(): void
    {
        $patient = Patient::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Rohan De Silva',
            'phone' => '+94775551234',
        ]);

        $bill = Bill::create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $this->doctor->id,
            'receipt_number' => 'REC-000099',
            'doctor_fee' => 200000,
            'clinic_fee' => 80000,
            'total_amount' => 280000,
            'payment_status' => Bill::STATUS_PAID,
            'payment_method' => 'cash',
        ]);

        $refundUrl = "http://{$this->tenant->subdomain}.{$this->baseDomain}/billing/{$bill->id}/refund";

        // Receptionist cannot refund -> 403
        $respReception = $this->actingAs($this->receptionistUser)->post($refundUrl, [
            'refund_reason' => 'Doctor cancelled',
        ]);
        $respReception->assertStatus(403);

        // Admin can refund
        $respAdmin = $this->actingAs($this->adminUser)->post($refundUrl, [
            'refund_reason' => 'Doctor emergency leave',
        ]);
        $respAdmin->assertRedirect();

        $bill->refresh();
        $this->assertSame(Bill::STATUS_REFUNDED, $bill->payment_status);
        $this->assertSame('Doctor emergency leave', $bill->refund_reason);
        $this->assertNotNull($bill->refunded_at);

        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $this->tenant->id,
            'action' => 'billing.refunded',
            'resource_id' => (string) $bill->id,
        ]);
    }
}
