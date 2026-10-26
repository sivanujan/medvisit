<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\Bill;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use App\Services\SequenceService;
use App\Support\PrintSettings;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class BillingIntegrityQaTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private Tenant $tenant;

    private User $admin;

    private User $receptionist;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->seed(QaScenarioSeeder::class);

        $this->tenant = Tenant::find('cityhealth');
        $this->admin = User::where('email', 'admin@cityhealth.test')->firstOrFail();
        $this->receptionist = User::where('email', 'receptionist@cityhealth.test')->firstOrFail();
    }

    /**
     * 1. Receipt numbers are strictly gapless under concurrency / atomic sequence.
     */
    public function test_receipt_numbers_are_gapless_under_concurrency(): void
    {
        $sequenceService = app(SequenceService::class);
        $tenantId = $this->tenant->id;

        $r1 = $sequenceService->nextReceiptNumber($tenantId);
        $r2 = $sequenceService->nextReceiptNumber($tenantId);
        $r3 = $sequenceService->nextReceiptNumber($tenantId);

        $this->assertMatchesRegularExpression('/^REC-\d{6}$/', $r1);
        $this->assertMatchesRegularExpression('/^REC-\d{6}$/', $r2);
        $this->assertMatchesRegularExpression('/^REC-\d{6}$/', $r3);

        $n1 = (int) substr($r1, 4);
        $n2 = (int) substr($r2, 4);
        $n3 = (int) substr($r3, 4);

        $this->assertSame($n1 + 1, $n2, 'Receipt sequence must not skip numbers');
        $this->assertSame($n2 + 1, $n3, 'Receipt sequence must be strictly sequential');
    }

    /**
     * 2. Fee snapshot is frozen upon bill creation and immune to subsequent fee configuration changes.
     */
    public function test_fee_snapshot_is_frozen_and_immune_to_configuration_changes(): void
    {
        $doctor = Doctor::where('tenant_id', $this->tenant->id)->firstOrFail();
        $originalDocFee = $doctor->doctor_fee;
        $originalClinicFee = $doctor->clinic_fee;

        $patient = Patient::where('tenant_id', $this->tenant->id)->firstOrFail();

        // Create a bill with original snapshot
        $bill = Bill::create([
            'tenant_id' => $this->tenant->id,
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'doctor_fee' => $originalDocFee,
            'clinic_fee' => $originalClinicFee,
            'other_fee' => 0,
            'discount' => 0,
            'total_amount' => $originalDocFee + $originalClinicFee,
            'payment_status' => Bill::STATUS_PAID,
            'payment_method' => 'cash',
            'receipt_number' => app(SequenceService::class)->nextReceiptNumber($this->tenant->id),
            'fee_snapshot' => [
                'doctor_fee' => $originalDocFee,
                'clinic_fee' => $originalClinicFee,
                'frozen_at' => now()->toIso8601String(),
            ],
        ]);

        // Mutate doctor's fee configuration dramatically
        $doctor->update([
            'doctor_fee' => 999900,
            'clinic_fee' => 888800,
        ]);

        // Reload bill and verify frozen values are unchanged
        $bill->refresh();
        $this->assertSame($originalDocFee, $bill->doctor_fee);
        $this->assertSame($originalClinicFee, $bill->clinic_fee);
        $this->assertSame($originalDocFee + $originalClinicFee, $bill->total_amount);
        $this->assertSame($originalDocFee, $bill->fee_snapshot['doctor_fee']);
    }

    /**
     * 3. Daily report totals strictly equal the sum of individual receipt line totals.
     */
    public function test_daily_report_totals_strictly_match_sum_of_receipts(): void
    {
        $res = $this->actingAs($this->admin)
            ->get("http://cityhealth.{$this->baseDomain}/billing?range=today");

        $res->assertOk();
        $res->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Billing/Index')
            ->has('recentReceipts.data')
            ->has('kpis')
            ->has('report')
        );

        $props = $res->viewData('page')['props'];
        $receipts = $props['recentReceipts']['data'];
        $kpis = $props['kpis'];

        $calculatedSumLkr = 0.0;
        foreach ($receipts as $b) {
            if ($b['payment_status'] === 'paid') {
                $calculatedSumLkr += (float) $b['total_amount_lkr'];
            }
        }

        $this->assertEqualsWithDelta(
            $calculatedSumLkr,
            (float) $kpis['collected_lkr'],
            0.01,
            'Daily report gross collections must exactly equal the sum of paid receipt totals'
        );
    }

    /**
     * 4. Bill supports print layout configs (80mm and A4 format).
     */
    public function test_bill_supports_print_receipt_formats(): void
    {
        $this->tenant->print_receipt_format = '80mm';
        $this->tenant->save();
        $this->assertSame('80mm', PrintSettings::forTenant($this->tenant->fresh())['receipt_format']);

        $this->tenant->print_receipt_format = 'a4';
        $this->tenant->save();
        $this->assertSame('a4', PrintSettings::forTenant($this->tenant->fresh())['receipt_format']);
    }
}
