<?php

namespace Tests\Feature\QA;

use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class ScheduledCommandsQaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(QaScenarioSeeder::class);
    }

    public function test_scheduled_commands_execute_cleanly(): void
    {
        // 1. Directory sync
        $syncExit = Artisan::call('directory:sync');
        $this->assertEquals(0, $syncExit, 'directory:sync command failed');

        // 2. Refund SLA reminder
        $refundSlaExit = Artisan::call('medvisit:check-refund-slas');
        $this->assertEquals(0, $refundSlaExit, 'medvisit:check-refund-slas command failed');

        // 3. Clinic setup reminders
        $setupRemindersExit = Artisan::call('clinic:send-setup-reminders');
        $this->assertEquals(0, $setupRemindersExit, 'clinic:send-setup-reminders command failed');

        // 4. Trial reminders
        $trialRemindersExit = Artisan::call('medvisit:send-trial-reminders');
        $this->assertEquals(0, $trialRemindersExit, 'medvisit:send-trial-reminders command failed');

        // 5. Subscription check expirations
        $checkExpExit = Artisan::call('subscriptions:check-expirations');
        $this->assertEquals(0, $checkExpExit, 'subscriptions:check-expirations command failed');

        // 6. Generate sessions from templates
        $genSessionsExit = Artisan::call('sessions:generate-from-templates', ['--days' => 14]);
        $this->assertEquals(0, $genSessionsExit, 'sessions:generate-from-templates command failed');

        // 7. Announcements process scheduled
        $announcementsExit = Artisan::call('announcements:process-scheduled');
        $this->assertEquals(0, $announcementsExit, 'announcements:process-scheduled command failed');
    }
}
