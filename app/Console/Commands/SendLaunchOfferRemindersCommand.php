<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Mail\Subscription\LaunchOfferEndingReminderMail;
use App\Models\DispenseRecord;
use App\Models\Tenant;
use App\Models\TenantSmsUsage;
use App\Models\TvDevice;
use App\Models\User;
use App\Services\AuditLogger;
use App\Services\Plans\PlanGate;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendLaunchOfferRemindersCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'medvisit:send-launch-offer-reminders';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send reminder emails (14, 7, 3, 1 days) before launch offer concludes with usage summary and recommended plan';

    /**
     * Execute the console command.
     */
    public function handle(PlanGate $planGate): int
    {
        $this->info('Scanning clinics for launch offer conclusion notices...');

        $now = Carbon::now('Asia/Colombo')->startOfDay();
        $thresholds = [14, 7, 3, 1];

        $tenants = Tenant::where('status', 'active')
            ->whereNotNull('data')
            ->get()
            ->filter(fn (Tenant $t) => $planGate->isLaunchOfferActive($t));

        $count = 0;

        foreach ($tenants as $tenant) {
            $periodEnd = $tenant->subscription?->current_period_end?->setTimezone('Asia/Colombo')->startOfDay();
            if (! $periodEnd) {
                continue;
            }

            $daysDiff = (int) $now->diffInDays($periodEnd, false);

            if (! in_array($daysDiff, $thresholds, true)) {
                continue;
            }

            $data = $tenant->data ?? [];
            $trackerKey = "launch_offer_reminder_{$daysDiff}_sent_at";

            if (! empty($data[$trackerKey])) {
                continue;
            }

            // Clinic Administrator user
            $adminUser = User::where('tenant_id', $tenant->id)
                ->whereHas('roles', fn ($q) => $q->where('name', 'clinic_admin'))
                ->first() ?? User::where('tenant_id', $tenant->id)->first();

            if (! $adminUser || empty($adminUser->email)) {
                continue;
            }

            // Usage calculation
            $activeDoctors = $planGate->activeDoctorsCount($tenant);
            $activeStaff = $planGate->activeStaffCount($tenant);
            $dispenses = class_exists(DispenseRecord::class)
                ? DispenseRecord::where('tenant_id', $tenant->id)->count()
                : 0;
            $tvScreens = TvDevice::where('tenant_id', $tenant->id)->whereNull('revoked_at')->count();
            $smsUsage = TenantSmsUsage::currentForTenant($tenant);
            $smsUsed = $smsUsage->clinic_triggered_count;

            $usageSummary = [
                'doctors' => $activeDoctors,
                'staff' => $activeStaff,
                'dispenses' => $dispenses,
                'tv_screens' => $tvScreens,
                'sms_used' => $smsUsed,
            ];

            // Recommended plan logic
            if ($activeDoctors > 8 || $activeStaff > 15 || $tvScreens > 3) {
                $recommendedPlan = 'Advanced';
            } elseif ($activeDoctors > 3 || $activeStaff > 5 || $dispenses > 0) {
                $recommendedPlan = 'Pro';
            } else {
                $recommendedPlan = 'Basic';
            }

            $centralDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
            $changePlanUrl = "http://{$tenant->subdomain}.{$centralDomain}/settings/billing/change-plan";

            Mail::to($adminUser->email)->queue(
                new LaunchOfferEndingReminderMail(
                    tenant: $tenant,
                    daysRemaining: $daysDiff,
                    usageSummary: $usageSummary,
                    recommendedPlan: $recommendedPlan,
                    changePlanUrl: $changePlanUrl
                )
            );

            $data[$trackerKey] = Carbon::now('Asia/Colombo')->toIso8601String();
            $tenant->update(['data' => $data]);

            AuditLogger::log('launch_offer.reminder_sent', [
                'tenant_id' => $tenant->id,
                'user_id' => $adminUser->id,
                'days_remaining' => $daysDiff,
                'recommended_plan' => $recommendedPlan,
                'usage_summary' => $usageSummary,
            ]);

            $count++;
            $this->line("Sent {$daysDiff}-day reminder to clinic [{$tenant->id}] ({$adminUser->email}) recommending {$recommendedPlan}.");
        }

        $this->info("Completed. {$count} launch offer reminder notices dispatched.");

        return Command::SUCCESS;
    }
}
