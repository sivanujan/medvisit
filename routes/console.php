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
    ->timezone('Asia/Colombo')
    ->before(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'medvisit:send-trial-reminders'], ['last_started_at' => now()]))
    ->after(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'medvisit:send-trial-reminders'], ['last_finished_at' => now(), 'status' => 'success']));

Schedule::command('sessions:generate-from-templates --days=30')
    ->daily()
    ->timezone('Asia/Colombo')
    ->before(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'sessions:generate-from-templates'], ['last_started_at' => now()]))
    ->after(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'sessions:generate-from-templates'], ['last_finished_at' => now(), 'status' => 'success']));

Schedule::command('subscriptions:send-reminders')
    ->daily()
    ->timezone('Asia/Colombo')
    ->before(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'subscriptions:send-reminders'], ['last_started_at' => now()]))
    ->after(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'subscriptions:send-reminders'], ['last_finished_at' => now(), 'status' => 'success']));

Schedule::command('subscriptions:check-expirations')
    ->hourly()
    ->before(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'subscriptions:check-expirations'], ['last_started_at' => now()]))
    ->after(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'subscriptions:check-expirations'], ['last_finished_at' => now(), 'status' => 'success']));

Schedule::command('clinic:send-setup-reminders')
    ->hourly()
    ->before(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'clinic:send-setup-reminders'], ['last_started_at' => now()]))
    ->after(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'clinic:send-setup-reminders'], ['last_finished_at' => now(), 'status' => 'success']));

Schedule::command('medvisit:check-refund-slas')
    ->dailyAt('08:00')
    ->timezone('Asia/Colombo')
    ->before(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'medvisit:check-refund-slas'], ['last_started_at' => now()]))
    ->after(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'medvisit:check-refund-slas'], ['last_finished_at' => now(), 'status' => 'success']));

Schedule::command('medvisit:send-launch-offer-reminders')
    ->dailyAt('09:00')
    ->timezone('Asia/Colombo')
    ->before(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'medvisit:send-launch-offer-reminders'], ['last_started_at' => now()]))
    ->after(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'medvisit:send-launch-offer-reminders'], ['last_finished_at' => now(), 'status' => 'success']));

// Daily SMS usage quota renewal check (resets when each clinic's own billing period renews)
Schedule::command('medvisit:reset-monthly-sms')
    ->dailyAt('00:05')
    ->timezone('Asia/Colombo')
    ->before(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'medvisit:reset-monthly-sms'], ['last_started_at' => now()]))
    ->after(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'medvisit:reset-monthly-sms'], ['last_finished_at' => now(), 'status' => 'success']));

// Public Demo Sandbox nightly reset (03:00 Asia/Colombo)
Schedule::command('demo:reset')
    ->dailyAt('03:00')
    ->timezone('Asia/Colombo')
    ->before(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'demo:reset'], ['last_started_at' => now()]))
    ->after(fn () => SchedulerHeartbeat::updateOrCreate(['command' => 'demo:reset'], ['last_finished_at' => now(), 'status' => 'success']));

// Public Demo Sandbox hourly session shifter (keeps waiting room and TV live 24/7)
Schedule::command('demo:refresh-today')
    ->hourly()
    ->timezone('Asia/Colombo');

// Release abandoned promo code reservations
Schedule::command('promo:release-expired-reservations')->everyFiveMinutes();
