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

class EndToEndClinicalWalkthroughTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $adminUser;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Medical Center',
            'subdomain' => 'suwasetha',
        ]);

        $this->adminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Dr. Admin Perera',
            'email' => 'admin@suwasetha.lk',
        ]);
    }

    /**
     * Complete Walkthrough:
     * 1. Add doctor
     * 2. Create session for today
     * 3. Issue 3 tokens
     * 4. Call tokens on TV view
     * 5. Settle bill for patient
     * 6. Print / verify receipt
     */
    public function test_complete_clinical_workflow_walkthrough(): void
    {
        // -------------------------------------------------------------
        // STEP 1: Add a Doctor
        // -------------------------------------------------------------
        $doctorsUrl = "http://suwasetha.{$this->baseDomain}/doctors";
        $doctorResponse = $this->actingAs($this->adminUser)->post($doctorsUrl, [
            'title' => 'Dr.',
            'name' => 'Ruwan Wickramasinghe',
            'specialty' => 'Cardiology',
            'slmc_number' => '28410',
            'bio' => 'Senior Consultant Cardiologist at National Hospital.',
            'doctor_fee_lkr' => 2500, // Rs. 2,500.00
            'clinic_fee_lkr' => 500,  // Rs. 500.00
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ]);
        $doctorResponse->assertRedirect();

        $doctor = Doctor::where('tenant_id', $this->tenant->id)
            ->where('slmc_number', '28410')
            ->firstOrFail();

        $this->assertEquals('Ruwan Wickramasinghe', $doctor->name);
        $this->assertEquals(250000, $doctor->doctor_fee); // Stored in cents
        $this->assertEquals(50000, $doctor->clinic_fee);

        // -------------------------------------------------------------
        // STEP 2: Create a Session for Today
        // -------------------------------------------------------------
        $todayDate = Carbon::today('Asia/Colombo')->toDateString();
        $sessionUrl = "http://suwasetha.{$this->baseDomain}/doctors/sessions/one-off";
        $sessionResponse = $this->actingAs($this->adminUser)->post($sessionUrl, [
            'doctor_id' => $doctor->id,
            'session_date' => $todayDate,
            'start_time' => '16:00',
            'end_time' => '19:00',
            'max_tokens' => 20,
            'room_number' => 'Consultation Suite 101',
            'doctor_fee' => 2500,
            'clinic_fee' => 500,
        ]);
        $sessionResponse->assertRedirect();

        $session = DoctorSession::where('tenant_id', $this->tenant->id)
            ->where('doctor_id', $doctor->id)
            ->where('session_date', $todayDate)
            ->firstOrFail();

        $this->assertEquals('Consultation Suite 101', $session->room_number);
        $this->assertEquals(20, $session->max_tokens);

        // -------------------------------------------------------------
        // STEP 3: Issue 3 Sequential Tokens
        // -------------------------------------------------------------
        $bookingUrl = "http://suwasetha.{$this->baseDomain}/bookings";

        $patientsData = [
            [
                'name' => 'Kamal Silva',
                'phone' => '+94 77 123 4567',
                'nic' => '198512345678',
                'city' => 'Colombo',
            ],
            [
                'name' => 'Nimali Fernando',
                'phone' => '+94 71 234 5678',
                'nic' => '199023456789',
                'city' => 'Dehiwala',
            ],
            [
                'name' => 'Priyantha Dias',
                'phone' => '+94 76 345 6789',
                'nic' => '197834567890',
                'city' => 'Moratuwa',
            ],
        ];

        foreach ($patientsData as $idx => $pData) {
            $resp = $this->actingAs($this->adminUser)->post($bookingUrl, [
                'doctor_session_id' => $session->id,
                'new_patient_name' => $pData['name'],
                'new_patient_phone' => $pData['phone'],
                'new_patient_nic' => $pData['nic'],
                'notes' => 'Patient '.($idx + 1).' visit note',
            ]);
            $resp->assertRedirect();
        }

        $tokens = BookingToken::where('doctor_session_id', $session->id)
            ->orderBy('token_number')
            ->get();

        $this->assertCount(3, $tokens);
        $this->assertEquals(1, $tokens[0]->token_number);
        $this->assertEquals(2, $tokens[1]->token_number);
        $this->assertEquals(3, $tokens[2]->token_number);

        // -------------------------------------------------------------
        // STEP 4: Call Tokens on Today's Queue & Verify Live TV Display
        // -------------------------------------------------------------
        // Check-in Kamal Silva (Token #1)
        $checkInUrl = "http://suwasetha.{$this->baseDomain}/sessions/today/{$tokens[0]->id}/check-in";
        $this->actingAs($this->adminUser)->post($checkInUrl)->assertRedirect();

        // Call Next -> Token #1 becomes "called"
        $callNextUrl = "http://suwasetha.{$this->baseDomain}/sessions/today/{$session->id}/call-next";
        $callResponse = $this->actingAs($this->adminUser)->post($callNextUrl);
        $callResponse->assertRedirect();

        $tokens[0]->refresh();
        $this->assertEquals('called', $tokens[0]->status);

        // Check Live Queue TV API
        $tvDataUrl = "http://suwasetha.{$this->baseDomain}/queue/tv/data";
        $tvResponse = $this->actingAs($this->adminUser)->get($tvDataUrl);
        $tvResponse->assertOk();

        $tvJson = $tvResponse->json();
        $this->assertNotNull($tvJson['nowServing']);
        $this->assertEquals(1, $tvJson['nowServing']['token_number']);
        $this->assertEquals('Kamal Silva', $tvJson['nowServing']['patient_name']);
        $this->assertEquals('Consultation Suite 101', $tvJson['nowServing']['room_number']);

        // Next 3 in queue should contain Token #2 and Token #3
        $this->assertCount(2, $tvJson['nextInLine']);
        $this->assertEquals(2, $tvJson['nextInLine'][0]['token_number']);
        $this->assertEquals(3, $tvJson['nextInLine'][1]['token_number']);

        // -------------------------------------------------------------
        // STEP 5: Bill One Patient (Token #1)
        // -------------------------------------------------------------
        $bill = Bill::where('booking_token_id', $tokens[0]->id)->firstOrFail();
        $this->assertEquals('pending', $bill->payment_status);
        $this->assertEquals(300000, $bill->total_amount); // Rs. 3,000 (2500 dr + 500 clinic)

        // Settle Bill
        $payUrl = "http://suwasetha.{$this->baseDomain}/billing/{$bill->id}/pay";
        $payResponse = $this->actingAs($this->adminUser)->post($payUrl, [
            'payment_method' => 'cash',
            'discount_lkr' => 200, // Rs. 200 discount
            'discount_reason' => 'Senior citizen healthcare discount',
            'notes' => 'Received exact cash at cashier desk',
        ]);
        $payResponse->assertRedirect();

        $bill->refresh();
        $this->assertEquals('paid', $bill->payment_status);
        $this->assertEquals('cash', $bill->payment_method);
        $this->assertEquals(20000, $bill->discount);
        $this->assertEquals(280000, $bill->total_amount); // Rs. 2,800.00 net paid

        // -------------------------------------------------------------
        // STEP 6: Verify Thermal / A4 Receipt Generation
        // -------------------------------------------------------------
        $this->assertStringStartsWith('REC-', $bill->receipt_number);
        $this->assertEquals(250000, $bill->doctor_fee);
        $this->assertEquals(50000, $bill->clinic_fee);

        // Complete Consultation for Token #1
        $completeUrl = "http://suwasetha.{$this->baseDomain}/sessions/today/{$session->id}/complete";
        $this->actingAs($this->adminUser)->post($completeUrl)->assertRedirect();

        $tokens[0]->refresh();
        $this->assertEquals('completed', $tokens[0]->status);
    }
}
