<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\ClinicMedicine;
use App\Models\DirectoryListing;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\StockBatch;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QaScenarioSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_qa_scenario_seeder_executes_and_creates_all_fixtures(): void
    {
        $this->seed(QaScenarioSeeder::class);

        // 1. Super Admin
        $superAdmin = User::where('email', 'superadmin@medvisit.test')->first();
        $this->assertNotNull($superAdmin);
        $this->assertTrue($superAdmin->hasRole('super_admin'));
        $this->assertNull($superAdmin->tenant_id);

        // 2. Tenants (A, B, C, D)
        $tenantA = Tenant::find('cityhealth');
        $tenantB = Tenant::find('apexcare');
        $tenantC = Tenant::find('novaclinic');
        $tenantD = Tenant::find('lankamed');

        $this->assertNotNull($tenantA, 'Tenant A (cityhealth) must exist');
        $this->assertNotNull($tenantB, 'Tenant B (apexcare) must exist');
        $this->assertNotNull($tenantC, 'Tenant C (novaclinic) must exist');
        $this->assertNotNull($tenantD, 'Tenant D (lankamed) must exist');

        // Verify setup completion states
        $this->assertNotNull($tenantA->setup_completed_at, 'Tenant A setup must be completed');
        $this->assertNotNull($tenantB->setup_completed_at, 'Tenant B setup must be completed');
        $this->assertNull($tenantC->setup_completed_at, 'Tenant C setup must NOT be completed');
        $this->assertNull($tenantD->setup_completed_at, 'Tenant D setup must NOT be completed');

        // Gating states
        $this->assertTrue($tenantC->inSetupGrace(), 'Tenant C must be within setup grace period');
        $this->assertFalse($tenantD->inSetupGrace(), 'Tenant D must NOT be in grace period (immediate gating)');

        // Feature flags
        $this->assertTrue((bool) ($tenantA->pharmacy_enabled ?? $tenantA->data['pharmacy_enabled'] ?? false));
        $this->assertTrue((bool) ($tenantA->online_booking_enabled ?? $tenantA->data['online_booking_enabled'] ?? false));
        $this->assertTrue((bool) ($tenantA->directory_consented ?? $tenantA->data['directory_consented'] ?? false));

        $this->assertFalse((bool) ($tenantB->pharmacy_enabled ?? $tenantB->data['pharmacy_enabled'] ?? false));
        $this->assertFalse((bool) ($tenantB->online_booking_enabled ?? $tenantB->data['online_booking_enabled'] ?? false));

        // 3. Staff per tenant (Admin, 2 Doctors, Receptionist, Pharmacist)
        foreach ([$tenantA, $tenantB, $tenantC, $tenantD] as $t) {
            $admin = User::where('email', "admin@{$t->subdomain}.test")->first();
            $this->assertNotNull($admin);
            $this->assertTrue($admin->hasRole('clinic_admin'));

            $receptionist = User::where('email', "receptionist@{$t->subdomain}.test")->first();
            $this->assertNotNull($receptionist);
            $this->assertTrue($receptionist->hasRole('receptionist'));

            $pharmacist = User::where('email', "pharmacist@{$t->subdomain}.test")->first();
            $this->assertNotNull($pharmacist);
            $this->assertTrue($pharmacist->hasRole('pharmacist'));

            $doctors = Doctor::where('tenant_id', $t->id)->get();
            $this->assertCount(2, $doctors, "Tenant {$t->id} must have exactly 2 doctors");

            // One doctor is linked to a user, one doctor is unlinked
            $linkedDoctor = $doctors->first(fn ($d) => ! is_null($d->user_id));
            $unlinkedDoctor = $doctors->first(fn ($d) => is_null($d->user_id));
            $this->assertNotNull($linkedDoctor, "Tenant {$t->id} must have a linked doctor");
            $this->assertNotNull($unlinkedDoctor, "Tenant {$t->id} must have an unlinked doctor");
        }

        // 4. Patients (60 patients in Tenant A)
        $patientsCount = Patient::where('tenant_id', $tenantA->id)->count();
        $this->assertEquals(60, $patientsCount, 'Tenant A must have 60 patients');

        // Check duplicate phone detection
        $duplicatePhones = Patient::where('tenant_id', $tenantA->id)
            ->select('phone_normalized')
            ->groupBy('phone_normalized')
            ->havingRaw('COUNT(*) > 1')
            ->get();
        $this->assertNotEmpty($duplicatePhones, 'Must have patients with duplicate phones for QA testing');

        // 5. Sessions, Tokens, Bills
        $todaySession = DoctorSession::where('tenant_id', $tenantA->id)
            ->where('session_date', now('Asia/Colombo')->toDateString())
            ->first();
        $this->assertNotNull($todaySession);

        $tokensCount = BookingToken::where('doctor_session_id', $todaySession->id)->count();
        $this->assertEquals(15, $tokensCount);

        $billsCount = Bill::where('tenant_id', $tenantA->id)->count();
        $this->assertEquals(15, $billsCount);

        // Check bill statuses include paid, pending (unpaid), and refunded
        $this->assertTrue(Bill::where('tenant_id', $tenantA->id)->where('payment_status', Bill::STATUS_PAID)->exists());
        $this->assertTrue(Bill::where('tenant_id', $tenantA->id)->where('payment_status', Bill::STATUS_PENDING)->exists());
        $this->assertTrue(Bill::where('tenant_id', $tenantA->id)->where('payment_status', Bill::STATUS_REFUNDED)->exists());
        $this->assertTrue(Bill::where('tenant_id', $tenantA->id)->where('discount', '>', 0)->exists());

        // 6. Pharmacy (Medicines, Batches near-expiry and expired, GRN, Prescription)
        $meds = ClinicMedicine::where('tenant_id', $tenantA->id)->get();
        $this->assertCount(2, $meds);

        $nearExpiryBatch = StockBatch::where('tenant_id', $tenantA->id)
            ->where('batch_number', 'BATCH-NEAR-EXP')
            ->first();
        $this->assertNotNull($nearExpiryBatch);
        $this->assertTrue(Carbon::parse($nearExpiryBatch->expiry_date)->isFuture());
        $this->assertTrue(Carbon::parse($nearExpiryBatch->expiry_date)->diffInDays(now()) <= 15);

        $expiredBatch = StockBatch::where('tenant_id', $tenantA->id)
            ->where('batch_number', 'BATCH-EXPIRED-99')
            ->first();
        $this->assertNotNull($expiredBatch);
        $this->assertTrue(Carbon::parse($expiredBatch->expiry_date)->isPast());

        $rx = Prescription::where('tenant_id', $tenantA->id)->first();
        $this->assertNotNull($rx);
        $this->assertEquals('RX-QA-0001', $rx->prescription_number);
        $this->assertCount(1, $rx->items);

        // 7. Directory Listing
        $dir = DirectoryListing::where('tenant_id', $tenantA->id)->first();
        $this->assertNotNull($dir);
        $this->assertEquals('cityhealth', $dir->slug);
    }
}
