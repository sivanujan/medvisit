<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Contracts\PaymentGateway;
use App\Models\AuditEvent;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Tenant;
use App\Models\User;
use App\Services\Payments\FakeGateway;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SuspendedPageTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');
        $this->app->instance(PaymentGateway::class, new FakeGateway);
    }

    public function test_trial_expired_state_renders_correct_content(): void
    {
        Carbon::setTestNow('2026-10-28 12:00:00');

        $tenant = Tenant::factory()->create([
            'id' => 'trial-clinic',
            'name' => 'City Care Clinic',
            'subdomain' => 'citycare',
            'status' => 'trial_expired',
            'trial_ends_at' => Carbon::parse('2026-10-25 00:00:00'),
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@citycare.lk',
        ]);

        $response = $this->actingAs($admin)->get("http://citycare.{$this->baseDomain}/clinic/suspended");

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Clinic/SuspendedOrExpired')
            ->where('state', 'trial_expired')
            ->where('stateDetails.pill_label', 'Trial ended')
            ->where('stateDetails.can_pay', true)
            ->where('stateDetails.title', 'Your free trial of City Care Clinic ended on 25 Oct 2026')
            ->where('isAdmin', true)
            ->where('retention.retention_days', 30)
            ->where('retention.deletion_date', '24 Nov 2026')
            ->has('plans', 3)
            ->where('defaultPlanSlug', 'pro')
            ->where('support.phone', config('medvisit_public.business.phone_display'))
            ->where('support.email', config('medvisit_public.business.support_email'))
        );
    }

    public function test_past_due_state_renders_overdue_notice_and_invoice(): void
    {
        Carbon::setTestNow('2026-10-28 12:00:00');

        $tenant = Tenant::factory()->create([
            'id' => 'overdue-clinic',
            'name' => 'Metro Care',
            'subdomain' => 'metrocare',
            'status' => 'past_due',
            'plan' => 'pro',
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@metrocare.lk',
        ]);

        $proPlan = Plan::forSlug('pro') ?? Plan::factory()->create(['slug' => 'pro', 'name' => 'Pro', 'price_cents' => 900000]);

        $subscription = Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $proPlan->id,
            'status' => Subscription::STATUS_PAST_DUE,
            'current_period_end' => Carbon::parse('2026-10-20 00:00:00'),
        ]);

        SubscriptionInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'invoice_number' => 'INV-2026-PAST01',
            'amount_cents' => 900000,
            'period_start' => Carbon::parse('2026-09-20'),
            'period_end' => Carbon::parse('2026-10-20'),
            'due_date' => Carbon::parse('2026-10-20'),
            'status' => SubscriptionInvoice::STATUS_UNPAID,
        ]);

        $response = $this->actingAs($admin)->get("http://metrocare.{$this->baseDomain}/clinic/suspended");

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Clinic/SuspendedOrExpired')
            ->where('state', 'past_due')
            ->where('stateDetails.pill_label', 'Payment overdue')
            ->where('stateDetails.can_pay', true)
            ->where('stateDetails.title', 'Your Pro plan payment is overdue')
            ->where('outstandingInvoice.invoice_number', 'INV-2026-PAST01')
            ->where('outstandingInvoice.amount_formatted', 'Rs. 9,000')
            ->where('retention.deletion_date', '19 Nov 2026')
        );
    }

    public function test_cancelled_state_renders_subscription_ended(): void
    {
        Carbon::setTestNow('2026-10-28 12:00:00');

        $tenant = Tenant::factory()->create([
            'id' => 'cancelled-clinic',
            'name' => 'Sunset Clinic',
            'subdomain' => 'sunset',
            'status' => 'cancelled',
            'plan' => 'basic',
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@sunset.lk',
        ]);

        $response = $this->actingAs($admin)->get("http://sunset.{$this->baseDomain}/clinic/suspended");

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Clinic/SuspendedOrExpired')
            ->where('state', 'cancelled')
            ->where('stateDetails.pill_label', 'Subscription ended')
            ->where('stateDetails.can_pay', true)
            ->where('defaultPlanSlug', 'basic')
        );
    }

    public function test_suspended_by_admin_state_has_no_payment_option(): void
    {
        $tenant = Tenant::factory()->create([
            'id' => 'admin-suspended-clinic',
            'name' => 'Apex Health',
            'subdomain' => 'apex',
            'status' => 'suspended',
            'data' => [
                'suspension_reason' => 'Policy violation review required.',
            ],
        ]);

        AuditEvent::create([
            'tenant_id' => $tenant->id,
            'action' => 'superadmin.clinic.suspended',
            'metadata' => [
                'reason' => 'Policy violation review required.',
            ],
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@apex.lk',
        ]);

        $response = $this->actingAs($admin)->get("http://apex.{$this->baseDomain}/clinic/suspended");

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Clinic/SuspendedOrExpired')
            ->where('state', 'suspended_by_admin')
            ->where('stateDetails.pill_label', 'Account suspended')
            ->where('stateDetails.can_pay', false)
            ->where('stateDetails.reason', 'Policy violation review required.')
        );
    }

    public function test_staff_see_no_prices_or_payment(): void
    {
        $tenant = Tenant::factory()->create([
            'id' => 'staff-view-clinic',
            'name' => 'Staff View Clinic',
            'subdomain' => 'staffview',
            'status' => 'trial_expired',
        ]);

        $doctor = User::factory()->doctor()->create([
            'tenant_id' => $tenant->id,
            'email' => 'doctor@staffview.lk',
        ]);

        $response = $this->actingAs($doctor)->get("http://staffview.{$this->baseDomain}/clinic/suspended");

        $response->assertStatus(200);
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Clinic/SuspendedOrExpired')
            ->where('isAdmin', false)
            ->where('userRole', 'doctor')
        );
    }

    public function test_return_url_alone_does_not_reactivate_tenant(): void
    {
        $tenant = Tenant::factory()->create([
            'id' => 'return-clinic',
            'name' => 'Return Check Clinic',
            'subdomain' => 'returncheck',
            'status' => 'trial_expired',
        ]);

        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $tenant->id,
            'email' => 'admin@returncheck.lk',
        ]);

        $response = $this->actingAs($admin)->get("http://returncheck.{$this->baseDomain}/subscription/return");

        // Should NOT activate the clinic without verified webhook
        $tenant->refresh();
        $this->assertNotSame('active', $tenant->status);
    }

    public function test_successful_webhook_payment_reactivates_tenant(): void
    {
        $tenant = Tenant::factory()->create([
            'id' => 'webhook-reactivate-clinic',
            'name' => 'Reactivate Clinic',
            'subdomain' => 'reactivate',
            'status' => 'trial_expired',
        ]);

        $proPlan = Plan::forSlug('pro') ?? Plan::factory()->create(['slug' => 'pro', 'name' => 'Pro', 'price_cents' => 900000]);

        $subscription = Subscription::create([
            'tenant_id' => $tenant->id,
            'plan_id' => $proPlan->id,
            'status' => Subscription::STATUS_PENDING_PAYMENT,
        ]);

        $invoice = SubscriptionInvoice::create([
            'tenant_id' => $tenant->id,
            'subscription_id' => $subscription->id,
            'invoice_number' => 'INV-2026-SUSP01',
            'amount_cents' => 900000,
            'period_start' => now(),
            'period_end' => now()->addMonth(),
            'due_date' => now()->addDays(3),
            'status' => SubscriptionInvoice::STATUS_UNPAID,
        ]);

        $payload = [
            'id' => 'evt_reactivate_001',
            'type' => 'payment.succeeded',
            'data' => [
                'payment' => [
                    'id' => 'pay_reactivate_001',
                    'checkoutId' => 'chk_reactivate_001',
                    'amountCents' => 900000,
                    'currency' => 'LKR',
                    'reference' => 'INV-2026-SUSP01',
                    'status' => 'succeeded',
                ],
            ],
        ];

        $rawBody = (string) json_encode($payload);
        $time = time();
        $secret = 'test_webhook_secret';
        config(['services.paymentslk.webhook_secret' => $secret]);

        $signature = hash_hmac('sha256', "{$time}.{$rawBody}", $secret);
        $header = "t={$time},v1={$signature}";

        $response = $this->call(
            'POST',
            '/webhooks/paymentslk',
            [],
            [],
            [],
            ['HTTP_Payments-Signature' => $header, 'CONTENT_TYPE' => 'application/json'],
            $rawBody
        );

        $response->assertStatus(200);

        $tenant->refresh();
        $subscription->refresh();
        $invoice->refresh();

        $this->assertSame('active', $tenant->status);
        $this->assertSame(Subscription::STATUS_ACTIVE, $subscription->status);
        $this->assertSame(SubscriptionInvoice::STATUS_PAID, $invoice->status);
    }

    public function test_no_placeholder_numbers_remain_in_views_and_controllers(): void
    {
        $baseDir = base_path();
        $pathsToCheck = [
            $baseDir.'/resources/views',
            $baseDir.'/resources/js/Pages/Clinic',
            $baseDir.'/resources/js/Pages/Subscription',
            $baseDir.'/app/Http/Controllers/Tenant',
            $baseDir.'/config/medvisit_public.php',
        ];

        $disallowedPatterns = ['234 5678', '123 4567'];

        foreach ($pathsToCheck as $path) {
            if (! is_dir($path) && ! is_file($path)) {
                continue;
            }

            $files = is_dir($path)
                ? new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($path))
                : [new \SplFileInfo($path)];

            foreach ($files as $file) {
                if ($file instanceof \SplFileInfo && $file->isFile()) {
                    $content = file_get_contents($file->getPathname());
                    foreach ($disallowedPatterns as $pattern) {
                        $this->assertStringNotContainsString(
                            $pattern,
                            (string) $content,
                            "Placeholder '{$pattern}' was found in file: {$file->getPathname()}"
                        );
                    }
                }
            }
        }
    }
}
