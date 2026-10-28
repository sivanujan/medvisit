<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\Bill;
use App\Models\BillAdjustment;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use App\Services\DoctorPayoutService;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TokenMoveBillingQaTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private string $baseDomain;

    private User $receptionist;

    private Doctor $doctorA;

    private Doctor $doctorB;

    private DoctorSession $sessionA;

    private DoctorSession $sessionB;

    private Patient $patient;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->seed(QaScenarioSeeder::class);

        $this->tenant = Tenant::find('cityhealth');
        tenancy()->initialize($this->tenant);

        $this->receptionist = User::where('email', 'receptionist@cityhealth.test')->firstOrFail();

        $doctors = Doctor::where('tenant_id', $this->tenant->id)->get();
        $this->doctorA = $doctors[0];
        $this->doctorB = $doctors[1];

        // Ensure distinct consultation fees
        $this->doctorA->update([
            'use_clinic_default_fees' => false,
            'custom_doctor_fee' => 150000,
            'doctor_fee' => 150000,
            'payout_rule' => ['type' => 'full_doctor_fee'],
        ]);
        $this->doctorB->update([
            'use_clinic_default_fees' => false,
            'custom_doctor_fee' => 250000,
            'doctor_fee' => 250000,
            'payout_rule' => ['type' => 'full_doctor_fee'],
        ]);

        $this->sessionA = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctorA->id,
            'session_date' => now()->toDateString(),
            'start_time' => '09:00',
            'end_time' => '12:00',
            'max_tokens' => 30,
            'status' => 'open',
        ]);

        $this->sessionB = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $this->doctorB->id,
            'session_date' => now()->toDateString(),
            'start_time' => '14:00',
            'end_time' => '17:00',
            'max_tokens' => 30,
            'status' => 'open',
        ]);

        $this->patient = Patient::where('tenant_id', $this->tenant->id)->firstOrFail();
    }

    /**
     * 1. Higher fee + "Keep current fee":
     * Snapshot stays at the paid amount; the doctor share stays at the paid snapshot (e.g. 1,500).
     */
    public function test_higher_fee_keep_current_fee_path(): void
    {
        // Token in Session A: Paid 2,000 LKR (1,500 doctor + 500 clinic)
        $token = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $this->sessionA->id,
            'patient_id' => $this->patient->id,
            'token_number' => 1,
            'status' => BookingToken::STATUS_BOOKED,
            'booked_via' => 'reception',
            'fee_snapshot' => [
                'patient_total' => 200000,
                'doctor_payout_amount' => 150000,
                'clinic_net_amount' => 50000,
                'doctor_fee_portion' => 150000,
                'clinic_portion' => 50000,
            ],
        ]);

        $bill = Bill::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctorA->id,
            'receipt_number' => 'REC-000010',
            'payment_status' => Bill::STATUS_PAID,
            'payment_method' => 'cash',
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'total_amount' => 200000,
            'doctor_payout_amount' => 150000,
            'clinic_net_amount' => 50000,
            'paid_at' => now(),
        ]);

        $response = $this->actingAs($this->receptionist)
            ->post("http://{$this->tenant->id}.{$this->baseDomain}/bookings/{$token->id}/move", [
                'destination_session_id' => $this->sessionB->id,
                'fee_action' => 'keep_current_fee',
                'reason' => 'Patient requested later time with Dr. B',
            ]);

        $response->assertRedirect();

        $token->refresh();
        $this->assertSame(BookingToken::STATUS_MOVED, $token->status);

        $newToken = BookingToken::find($token->moved_to_token_id);
        $this->assertNotNull($newToken);
        $this->assertSame($this->sessionB->id, $newToken->doctor_session_id);

        // Snapshot stays at paid amount (2,000 LKR) and doctor share stays at paid snapshot (1,500 LKR)
        $this->assertEquals(200000, $newToken->fee_snapshot['patient_total']);
        $this->assertEquals(150000, $newToken->fee_snapshot['doctor_payout_amount']);
        $this->assertEquals(50000, $newToken->fee_snapshot['clinic_net_amount']);

        $bill->refresh();
        $this->assertSame($newToken->id, $bill->booking_token_id);
        $this->assertSame($this->doctorB->id, $bill->doctor_id);
        $this->assertEquals(200000, $bill->total_amount);
        $this->assertEquals(150000, $bill->doctor_fee);
        $this->assertEquals(50000, $bill->clinic_fee);

        // Audit event logged
        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $this->tenant->id,
            'action' => 'booking_token.moved',
            'resource_type' => 'booking_token',
            'resource_id' => (string) $newToken->id,
        ]);

        // Payout reconciliation: Dr. B receives the retained snapshot doctor share (1,500 LKR)
        $payoutService = app(DoctorPayoutService::class);
        $unsettled = $payoutService->getUnsettledBillsForDoctor($this->tenant->id, $this->doctorB->id);
        $matchingBill = collect($unsettled['bills'])->firstWhere('bill_id', $bill->id);
        $this->assertNotNull($matchingBill);
        $this->assertEquals(150000, $matchingBill['doctor_share_cents']);
    }

    /**
     * 2. Lower fee + "Keep current fee":
     * No refund. The doctor share = NEW session's doctor fee; remainder goes to clinic share.
     */
    public function test_lower_fee_keep_current_fee_path(): void
    {
        // Token in Session B: Paid 3,000 LKR (2,500 doctor + 500 clinic)
        $token = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $this->sessionB->id,
            'patient_id' => $this->patient->id,
            'token_number' => 2,
            'status' => BookingToken::STATUS_BOOKED,
            'booked_via' => 'reception',
            'fee_snapshot' => [
                'patient_total' => 300000,
                'doctor_payout_amount' => 250000,
                'clinic_net_amount' => 50000,
                'doctor_fee_portion' => 250000,
                'clinic_portion' => 50000,
            ],
        ]);

        $bill = Bill::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctorB->id,
            'receipt_number' => 'REC-000020',
            'payment_status' => Bill::STATUS_PAID,
            'payment_method' => 'cash',
            'doctor_fee' => 250000,
            'clinic_fee' => 50000,
            'total_amount' => 300000,
            'doctor_payout_amount' => 250000,
            'clinic_net_amount' => 50000,
            'paid_at' => now(),
        ]);

        // Move to Session A (lower fee doctor: Dr. A fee is 1,500 LKR) with keep_current_fee
        $response = $this->actingAs($this->receptionist)
            ->post("http://{$this->tenant->id}.{$this->baseDomain}/bookings/{$token->id}/move", [
                'destination_session_id' => $this->sessionA->id,
                'fee_action' => 'keep_current_fee',
                'reason' => 'Moved to Dr. A',
            ]);

        $response->assertRedirect();

        $token->refresh();
        $newToken = BookingToken::find($token->moved_to_token_id);
        $this->assertNotNull($newToken);

        // Paid total stays 3,000 LKR. Doctor share becomes 1,500 LKR. Clinic share gets remainder = 1,500 LKR.
        $this->assertEquals(300000, $newToken->fee_snapshot['patient_total']);
        $this->assertEquals(150000, $newToken->fee_snapshot['doctor_payout_amount']);
        $this->assertEquals(150000, $newToken->fee_snapshot['clinic_net_amount']);

        $bill->refresh();
        $this->assertEquals(300000, $bill->total_amount);
        $this->assertEquals(150000, $bill->doctor_fee);
        $this->assertEquals(150000, $bill->clinic_fee);
        $this->assertSame($this->doctorA->id, $bill->doctor_id);

        // Payout reconciliation: Dr. A receives 1,500 LKR, clinic retains 1,500 LKR
        $payoutService = app(DoctorPayoutService::class);
        $unsettled = $payoutService->getUnsettledBillsForDoctor($this->tenant->id, $this->doctorA->id);
        $matchingBill = collect($unsettled['bills'])->firstWhere('bill_id', $bill->id);
        $this->assertNotNull($matchingBill);
        $this->assertEquals(150000, $matchingBill['doctor_share_cents']);
        $this->assertEquals(150000, $matchingBill['clinic_share_cents']);
    }

    /**
     * 3. "Collect difference":
     * Creates a separate paid bill line/receipt for the difference (gapless receipt number).
     * The snapshot is updated to the new fee.
     */
    public function test_collect_difference_path(): void
    {
        // Session A paid 2,000 LKR. Session B costs 3,000 LKR (diff = +1,000 LKR).
        $token = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $this->sessionA->id,
            'patient_id' => $this->patient->id,
            'token_number' => 3,
            'status' => BookingToken::STATUS_BOOKED,
            'booked_via' => 'reception',
            'fee_snapshot' => [
                'patient_total' => 200000,
                'doctor_payout_amount' => 150000,
                'clinic_net_amount' => 50000,
            ],
        ]);

        $bill = Bill::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctorA->id,
            'receipt_number' => 'REC-000030',
            'payment_status' => Bill::STATUS_PAID,
            'payment_method' => 'cash',
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'total_amount' => 200000,
            'paid_at' => now(),
        ]);

        $response = $this->actingAs($this->receptionist)
            ->post("http://{$this->tenant->id}.{$this->baseDomain}/bookings/{$token->id}/move", [
                'destination_session_id' => $this->sessionB->id,
                'fee_action' => 'collect_difference',
                'payment_method' => 'cash',
                'reason' => 'Patient paid difference',
            ]);

        $response->assertRedirect();

        $token->refresh();
        $newToken = BookingToken::find($token->moved_to_token_id);
        $this->assertNotNull($newToken);

        // Snapshot is updated to new higher fee
        $this->assertGreaterThan(200000, $newToken->fee_snapshot['patient_total']);

        // Separate paid differential bill created with gapless receipt number
        $diffBill = Bill::where('tenant_id', $this->tenant->id)
            ->where('booking_token_id', $newToken->id)
            ->where('id', '!=', $bill->id)
            ->first();

        $this->assertNotNull($diffBill, 'Must create separate differential bill');
        $this->assertSame(Bill::STATUS_PAID, $diffBill->payment_status);
        $this->assertNotNull($diffBill->receipt_number);
        $this->assertMatchesRegularExpression('/^REC-\d{6}$/', $diffBill->receipt_number);

        // Audit adjustment recorded
        $this->assertDatabaseHas('bill_adjustments', [
            'tenant_id' => $this->tenant->id,
            'bill_id' => $bill->id,
            'type' => BillAdjustment::TYPE_MOVE_DIFFERENTIAL,
        ]);

        // Payout reconciliation: Dr. B receives new fee share
        $payoutService = app(DoctorPayoutService::class);
        $unsettled = $payoutService->getUnsettledBillsForDoctor($this->tenant->id, $this->doctorB->id);
        $matchingBill = collect($unsettled['bills'])->firstWhere('bill_id', $bill->id);
        $this->assertNotNull($matchingBill);
        $this->assertEquals($bill->fresh()->doctor_fee, $matchingBill['doctor_share_cents']);
    }

    /**
     * 4. "Record refund of difference":
     * Creates the refund record or credit note and reduces the snapshot.
     */
    public function test_record_refund_difference_path(): void
    {
        // Session B paid 3,000 LKR. Session A costs 2,000 LKR (diff = -1,000 LKR).
        $token = BookingToken::create([
            'tenant_id' => $this->tenant->id,
            'doctor_session_id' => $this->sessionB->id,
            'patient_id' => $this->patient->id,
            'token_number' => 4,
            'status' => BookingToken::STATUS_BOOKED,
            'booked_via' => 'reception',
            'fee_snapshot' => [
                'patient_total' => 300000,
                'doctor_payout_amount' => 250000,
                'clinic_net_amount' => 50000,
            ],
        ]);

        $bill = Bill::create([
            'tenant_id' => $this->tenant->id,
            'booking_token_id' => $token->id,
            'patient_id' => $this->patient->id,
            'doctor_id' => $this->doctorB->id,
            'receipt_number' => 'REC-000040',
            'payment_status' => Bill::STATUS_PAID,
            'payment_method' => 'cash',
            'doctor_fee' => 250000,
            'clinic_fee' => 50000,
            'total_amount' => 300000,
            'paid_at' => now(),
        ]);

        $response = $this->actingAs($this->receptionist)
            ->post("http://{$this->tenant->id}.{$this->baseDomain}/bookings/{$token->id}/move", [
                'destination_session_id' => $this->sessionA->id,
                'fee_action' => 'record_refund',
                'reason' => 'Patient moved to lower cost session',
            ]);

        $response->assertRedirect();

        $token->refresh();
        $newToken = BookingToken::find($token->moved_to_token_id);
        $this->assertNotNull($newToken);

        // Snapshot is reduced to new fee
        $this->assertLessThan(300000, $newToken->fee_snapshot['patient_total']);

        // Adjustment recorded with credit note reference
        $adj = BillAdjustment::where('tenant_id', $this->tenant->id)
            ->where('bill_id', $bill->id)
            ->first();

        $this->assertNotNull($adj);
        $this->assertArrayHasKey('credit_note_number', $adj->metadata);
        $this->assertMatchesRegularExpression('/^CN-\d{4}-\d{6}$/', $adj->metadata['credit_note_number']);

        // Payout reconciliation: Dr. A receives reduced snapshot doctor share
        $payoutService = app(DoctorPayoutService::class);
        $unsettled = $payoutService->getUnsettledBillsForDoctor($this->tenant->id, $this->doctorA->id);
        $matchingBill = collect($unsettled['bills'])->firstWhere('bill_id', $bill->id);
        $this->assertNotNull($matchingBill);
        $this->assertEquals($bill->fresh()->doctor_fee, $matchingBill['doctor_share_cents']);
    }
}
