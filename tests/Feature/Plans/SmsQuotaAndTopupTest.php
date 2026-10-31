<?php

declare(strict_types=1);

namespace Tests\Feature\Plans;

use App\Models\Plan;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\TenantSmsTopup;
use App\Models\TenantSmsUsage;
use App\Models\User;
use App\Services\Plans\PlanGate;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SmsQuotaAndTopupTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        config(['plans.gating_enabled' => true]);
        PlanGate::clearCache();

        $basicPlan = Plan::firstOrCreate(
            ['slug' => 'basic'],
            [
                'name' => 'Basic',
                'price_cents' => 700000,
                'billing_interval' => 'month',
                'is_active' => true,
                'features' => config('plans.tiers.basic.features'),
                'limits' => config('plans.tiers.basic.limits'),
            ]
        );

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'sms-clinic',
            'subdomain' => 'sms-clinic',
            'name' => 'SMS Test Clinic',
            'plan' => 'basic',
        ]);

        $this->tenant->subscription()->update([
            'plan_id' => $basicPlan->id,
        ]);

        $this->admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'email' => 'admin@smsclinic.lk',
        ]);
    }

    public function test_system_and_registration_sms_are_exempt_from_quota(): void
    {
        $planGate = app(PlanGate::class);

        $regAllowance = $planGate->checkSmsAllowance($this->tenant, 'registration_otp');
        $this->assertTrue($regAllowance['allowed']);
        $this->assertSame('exempt', $regAllowance['deduct_type']);

        $sysAllowance = $planGate->checkSmsAllowance($this->tenant, 'system_alert');
        $this->assertTrue($sysAllowance['allowed']);
        $this->assertSame('exempt', $sysAllowance['deduct_type']);
    }

    public function test_queue_alert_is_blocked_when_monthly_quota_is_exhausted(): void
    {
        $planGate = app(PlanGate::class);
        $usage = TenantSmsUsage::currentForTenant($this->tenant);
        $usage->update(['clinic_triggered_count' => 300]); // 300 limit reached

        $allowance = $planGate->checkSmsAllowance($this->tenant, 'queue_alert');
        $this->assertFalse($allowance['allowed']);
        $this->assertSame('blocked', $allowance['deduct_type']);
    }

    public function test_patient_booking_otp_receives_10_percent_grace_when_quota_exhausted(): void
    {
        $planGate = app(PlanGate::class);
        $usage = TenantSmsUsage::currentForTenant($this->tenant);
        $usage->update(['clinic_triggered_count' => 300, 'otp_grace_count' => 5]);

        // 10% of 300 is 30. With 5 used, grace allows it!
        $allowance = $planGate->checkSmsAllowance($this->tenant, 'patient_otp');
        $this->assertTrue($allowance['allowed']);
        $this->assertSame('otp_grace', $allowance['deduct_type']);
    }

    public function test_patient_booking_otp_falls_back_to_web_link_when_grace_exceeded(): void
    {
        $planGate = app(PlanGate::class);
        $usage = TenantSmsUsage::currentForTenant($this->tenant);
        $usage->update(['clinic_triggered_count' => 300, 'otp_grace_count' => 30]);

        $allowance = $planGate->checkSmsAllowance($this->tenant, 'patient_otp');
        $this->assertFalse($allowance['allowed']);
        $this->assertTrue($allowance['fallback_to_web']);
    }

    public function test_active_topup_pack_unblocks_sms_when_monthly_quota_exhausted(): void
    {
        $planGate = app(PlanGate::class);
        $usage = TenantSmsUsage::currentForTenant($this->tenant);
        $usage->update(['clinic_triggered_count' => 300]);

        // Create active topup pack with 500 credits
        TenantSmsTopup::create([
            'tenant_id' => $this->tenant->id,
            'pack_id' => 'sms_500',
            'credits_total' => 500,
            'credits_remaining' => 500,
            'price_cents' => 100000,
            'expires_at' => now()->addDays(90),
        ]);

        $allowance = $planGate->checkSmsAllowance($this->tenant, 'queue_alert');
        $this->assertTrue($allowance['allowed']);
        $this->assertSame('topup', $allowance['deduct_type']);
    }

    public function test_sms_quota_resets_on_clinic_own_billing_period_start_not_on_1st_of_month(): void
    {
        Carbon::setTestNow(Carbon::parse('2026-10-20 10:00:00', 'Asia/Colombo'));

        $proPlan = Plan::firstOrCreate(
            ['slug' => 'pro'],
            [
                'name' => 'Pro',
                'price_cents' => 900000,
                'billing_interval' => 'month',
                'is_active' => true,
                'features' => config('plans.tiers.pro.features'),
                'limits' => config('plans.tiers.pro.limits'),
            ]
        );

        // Clinic whose billing cycle starts on the 15th
        $clinic = Tenant::factory()->active()->create([
            'id' => 'fifteenth-clinic',
            'subdomain' => 'fifteenth-clinic',
            'name' => 'Fifteenth Medical Care',
            'plan' => 'pro',
        ]);

        $sub = Subscription::create([
            'tenant_id' => $clinic->id,
            'plan_id' => $proPlan->id,
            'status' => Subscription::STATUS_ACTIVE,
            'current_period_start' => Carbon::parse('2026-10-15 00:00:00', 'Asia/Colombo'),
            'current_period_end' => Carbon::parse('2026-11-15 00:00:00', 'Asia/Colombo'),
        ]);

        $planGate = app(PlanGate::class);

        // 1. Clinic uses 150 SMS during October
        $usage = TenantSmsUsage::currentForTenant($clinic);
        $this->assertSame('2026-10-15', $usage->period_start->toDateString());
        $this->assertSame('2026-11-15', $usage->period_end->toDateString());

        $usage->update(['clinic_triggered_count' => 150]);
        $this->assertSame(150, $planGate->usage($clinic, 'sms_monthly'));
        $this->assertSame(850, $planGate->remaining($clinic, 'sms_monthly')); // 1,000 - 150 = 850

        // 2. Advance time to 1st of November (calendar month rollover):
        // The daily check runs. This clinic's quota must NOT reset because their cycle is the 15th!
        Carbon::setTestNow(Carbon::parse('2026-11-01 00:05:00', 'Asia/Colombo'));
        $this->artisan('medvisit:reset-monthly-sms')->assertSuccessful();

        // Usage is still 150, remaining is still 850
        $this->assertSame(150, $planGate->usage($clinic, 'sms_monthly'));
        $this->assertSame(850, $planGate->remaining($clinic, 'sms_monthly'));

        // 3. Advance time to 15th of November:
        // The clinic's billing period renews today!
        Carbon::setTestNow(Carbon::parse('2026-11-15 00:05:00', 'Asia/Colombo'));
        $sub->update([
            'current_period_start' => Carbon::parse('2026-11-15 00:00:00', 'Asia/Colombo'),
            'current_period_end' => Carbon::parse('2026-12-15 00:00:00', 'Asia/Colombo'),
        ]);
        $clinic->refresh();

        // Daily reset check runs on the clinic's renewal day
        $this->artisan('medvisit:reset-monthly-sms')
            ->expectsOutputToContain('SMS usage renewal check completed.')
            ->assertSuccessful();

        // 4. A new cycle has been created, and usage has reset to 0!
        $this->assertSame(0, $planGate->usage($clinic, 'sms_monthly'));
        $this->assertSame(1000, $planGate->remaining($clinic, 'sms_monthly'));

        // The previous cycle's records remain intact in database
        $this->assertDatabaseHas('tenant_sms_usages', [
            'tenant_id' => $clinic->id,
            'period_start' => '2026-10-15',
            'period_end' => '2026-11-15',
            'clinic_triggered_count' => 150,
        ]);

        $this->assertDatabaseHas('tenant_sms_usages', [
            'tenant_id' => $clinic->id,
            'period_start' => '2026-11-15',
            'period_end' => '2026-12-15',
            'clinic_triggered_count' => 0,
        ]);

        Carbon::setTestNow();
    }

    public function test_calculate_monthly_cycle_dates_clamps_to_shorter_months_with_no_gaps_or_overlaps(): void
    {
        // 1. Anchor Day 31 in standard year (2027)
        // Jan 15 -> cycle is Dec 31 to Jan 31
        $this->assertSame(
            ['2026-12-31', '2027-01-31'],
            TenantSmsUsage::calculateMonthlyCycleDates(31, Carbon::parse('2027-01-15', 'Asia/Colombo'))
        );

        // Jan 31 -> cycle is Jan 31 to Feb 28 (clamped to 28 Feb)
        $this->assertSame(
            ['2027-01-31', '2027-02-28'],
            TenantSmsUsage::calculateMonthlyCycleDates(31, Carbon::parse('2027-01-31', 'Asia/Colombo'))
        );

        // Feb 15 -> still in Jan 31 to Feb 28 cycle
        $this->assertSame(
            ['2027-01-31', '2027-02-28'],
            TenantSmsUsage::calculateMonthlyCycleDates(31, Carbon::parse('2027-02-15', 'Asia/Colombo'))
        );

        // Feb 28 -> new cycle begins on Feb 28, ends Mar 31 (no gap!)
        $this->assertSame(
            ['2027-02-28', '2027-03-31'],
            TenantSmsUsage::calculateMonthlyCycleDates(31, Carbon::parse('2027-02-28', 'Asia/Colombo'))
        );

        // Mar 15 -> still in Feb 28 to Mar 31 cycle
        $this->assertSame(
            ['2027-02-28', '2027-03-31'],
            TenantSmsUsage::calculateMonthlyCycleDates(31, Carbon::parse('2027-03-15', 'Asia/Colombo'))
        );

        // Mar 31 -> new cycle begins on Mar 31, ends Apr 30 (clamped to 30 Apr)
        $this->assertSame(
            ['2027-03-31', '2027-04-30'],
            TenantSmsUsage::calculateMonthlyCycleDates(31, Carbon::parse('2027-03-31', 'Asia/Colombo'))
        );

        // Apr 30 -> new cycle begins on Apr 30, ends May 31
        $this->assertSame(
            ['2027-04-30', '2027-05-31'],
            TenantSmsUsage::calculateMonthlyCycleDates(31, Carbon::parse('2027-04-30', 'Asia/Colombo'))
        );

        // 2. Anchor Day 31 in Leap Year (2028)
        // Jan 31 -> clamped to Feb 29
        $this->assertSame(
            ['2028-01-31', '2028-02-29'],
            TenantSmsUsage::calculateMonthlyCycleDates(31, Carbon::parse('2028-01-31', 'Asia/Colombo'))
        );

        // Feb 28 -> still in Jan 31 to Feb 29 cycle
        $this->assertSame(
            ['2028-01-31', '2028-02-29'],
            TenantSmsUsage::calculateMonthlyCycleDates(31, Carbon::parse('2028-02-28', 'Asia/Colombo'))
        );

        // Feb 29 -> new cycle starts on Feb 29, ends Mar 31
        $this->assertSame(
            ['2028-02-29', '2028-03-31'],
            TenantSmsUsage::calculateMonthlyCycleDates(31, Carbon::parse('2028-02-29', 'Asia/Colombo'))
        );

        // 3. Anchor Day 30 in standard year (2027)
        // Jan 30 -> ends Feb 28
        $this->assertSame(
            ['2027-01-30', '2027-02-28'],
            TenantSmsUsage::calculateMonthlyCycleDates(30, Carbon::parse('2027-01-30', 'Asia/Colombo'))
        );

        // Feb 28 -> starts Feb 28, ends Mar 30
        $this->assertSame(
            ['2027-02-28', '2027-03-30'],
            TenantSmsUsage::calculateMonthlyCycleDates(30, Carbon::parse('2027-02-28', 'Asia/Colombo'))
        );

        // Mar 30 -> starts Mar 30, ends Apr 30
        $this->assertSame(
            ['2027-03-30', '2027-04-30'],
            TenantSmsUsage::calculateMonthlyCycleDates(30, Carbon::parse('2027-03-30', 'Asia/Colombo'))
        );

        // 4. Anchor Day 29 in standard year (2027)
        // Jan 29 -> ends Feb 28
        $this->assertSame(
            ['2027-01-29', '2027-02-28'],
            TenantSmsUsage::calculateMonthlyCycleDates(29, Carbon::parse('2027-01-29', 'Asia/Colombo'))
        );

        // Feb 28 -> starts Feb 28, ends Mar 29
        $this->assertSame(
            ['2027-02-28', '2027-03-29'],
            TenantSmsUsage::calculateMonthlyCycleDates(29, Carbon::parse('2027-02-28', 'Asia/Colombo'))
        );

        // Mar 29 -> starts Mar 29, ends Apr 29
        $this->assertSame(
            ['2027-03-29', '2027-04-29'],
            TenantSmsUsage::calculateMonthlyCycleDates(29, Carbon::parse('2027-03-29', 'Asia/Colombo'))
        );
    }
}
