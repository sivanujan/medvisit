<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

class CalendarWeekViewQaTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private Tenant $tenant;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->seed(QaScenarioSeeder::class);

        $this->tenant = Tenant::find('cityhealth');
        $this->admin = User::where('email', 'admin@cityhealth.test')->firstOrFail();
    }

    /**
     * 1. Calendar week view returns exactly 7 days and includes scheduled sessions for that week.
     */
    public function test_calendar_week_view_returns_seven_days_and_scheduled_sessions(): void
    {
        $doctor = Doctor::where('tenant_id', $this->tenant->id)->firstOrFail();
        $monday = Carbon::now('Asia/Colombo')->startOfWeek(Carbon::MONDAY);
        $wednesday = $monday->copy()->addDays(2);
        $nextMonth = $monday->copy()->addWeeks(4);

        // In-week session
        $sessionInWeek = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => $wednesday->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 15,
            'status' => 'opened',
        ]);

        // Out-of-week session
        $sessionOutOfWeek = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => $nextMonth->toDateString(),
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'max_tokens' => 15,
            'status' => 'opened',
        ]);

        $res = $this->actingAs($this->admin)
            ->get("http://cityhealth.{$this->baseDomain}/calendar?view=week&date={$wednesday->toDateString()}");

        $res->assertOk();
        $res->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Calendar/Index')
            ->where('view', 'week')
            ->has('days', 7)
            ->has('sessions')
            ->has('doctors')
        );

        $props = $res->viewData('page')['props'];
        $this->assertCount(7, $props['days'], 'Week view must return exactly 7 days (Monday to Sunday)');
        $this->assertSame($monday->toDateString(), $props['days'][0]);
        $this->assertSame($monday->copy()->endOfWeek(Carbon::SUNDAY)->toDateString(), $props['days'][6]);

        $sessionIds = array_column($props['sessions'], 'id');
        $this->assertContains($sessionInWeek->id, $sessionIds, 'Session inside week must be returned');
        $this->assertNotContains($sessionOutOfWeek->id, $sessionIds, 'Session outside week must be excluded');
    }

    /**
     * 2. Admin can cancel a session that has no paid bills.
     */
    public function test_admin_can_cancel_session_without_paid_bills(): void
    {
        $doctor = Doctor::where('tenant_id', $this->tenant->id)->firstOrFail();
        $session = DoctorSession::create([
            'tenant_id' => $this->tenant->id,
            'doctor_id' => $doctor->id,
            'session_date' => now()->addDay()->toDateString(),
            'start_time' => '10:00:00',
            'end_time' => '13:00:00',
            'max_tokens' => 20,
            'status' => 'scheduled',
        ]);

        $res = $this->actingAs($this->admin)
            ->post("http://cityhealth.{$this->baseDomain}/calendar/sessions/{$session->id}/cancel", [
                'reason' => 'Doctor unavailable due to emergency conference',
            ]);

        $res->assertRedirect();
        $res->assertSessionHas('success');

        $session->refresh();
        $this->assertSame('cancelled', $session->status);
        $this->assertSame('Doctor unavailable due to emergency conference', $session->cancellation_reason);
    }
}
