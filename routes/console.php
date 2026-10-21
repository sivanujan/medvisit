<?php

use App\Models\SchedulerHeartbeat;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Heartbeat ping every minute to track scheduler health
Schedule::call(function () {
    SchedulerHeartbeat::ping();
})->everyMinute()->name('schedule:heartbeat');

// Announcements scheduled check
Schedule::command('announcements:process-scheduled')->everyMinute();

// Business background jobs with heartbeat tracking
Schedule::command('medvisit:send-trial-reminders')
    ->daily()
    ->before(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'medvisit:send-trial-reminders'], ['last_started_at' => now()]))
    ->after(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'medvisit:send-trial-reminders'], ['last_finished_at' => now(), 'status' => 'success']));

Schedule::command('sessions:generate-from-templates --days=30')
    ->daily()
    ->before(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'sessions:generate-from-templates'], ['last_started_at' => now()]))
    ->after(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'sessions:generate-from-templates'], ['last_finished_at' => now(), 'status' => 'success']));

Schedule::command('subscriptions:send-reminders')
    ->daily()
    ->before(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'subscriptions:send-reminders'], ['last_started_at' => now()]))
    ->after(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'subscriptions:send-reminders'], ['last_finished_at' => now(), 'status' => 'success']));

Schedule::command('subscriptions:check-expirations')
    ->hourly()
    ->before(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'subscriptions:check-expirations'], ['last_started_at' => now()]))
    ->after(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'subscriptions:check-expirations'], ['last_finished_at' => now(), 'status' => 'success']));
