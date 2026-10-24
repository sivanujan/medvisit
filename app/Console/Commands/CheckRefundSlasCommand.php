<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Mail\Subscription\RefundSlaOverdueAdminMail;
use App\Models\RefundRequest;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class CheckRefundSlasCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'medvisit:check-refund-slas';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Daily monitor for refund requests exceeding 2-day decision SLA or 5-day execution SLA.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $now = Carbon::now('Asia/Colombo');

        // 1. Requests pending decision for > 2 working days
        $pendingRequests = RefundRequest::with('tenant')
            ->whereIn('status', [RefundRequest::STATUS_REQUESTED, RefundRequest::STATUS_UNDER_REVIEW])
            ->get();

        $undecidedOverdue = $pendingRequests->filter(function (RefundRequest $r) use ($now) {
            return $r->created_at->diffInWeekdays($now) >= 2;
        });

        // 2. Approved requests not marked refunded after > 5 working days
        $approvedRequests = RefundRequest::with('tenant')
            ->whereIn('status', [RefundRequest::STATUS_APPROVED, RefundRequest::STATUS_PROCESSING])
            ->whereNotNull('decided_at')
            ->get();

        $unrefundedOverdue = $approvedRequests->filter(function (RefundRequest $r) use ($now) {
            return $r->decided_at?->diffInWeekdays($now) >= 5;
        });

        $totalOverdue = $undecidedOverdue->count() + $unrefundedOverdue->count();

        if ($totalOverdue === 0) {
            $this->info('No refund requests currently exceed SLA timelines.');

            return self::SUCCESS;
        }

        $this->warn("Found {$totalOverdue} refund request(s) exceeding SLA. Dispatching alert email to support@medvisit.lk...");

        $adminEmail = config('medvisit.mail.reply_to.address', 'support@medvisit.lk');
        $adminUrl = url('/super-admin/refunds');

        try {
            Mail::to($adminEmail)->send(new RefundSlaOverdueAdminMail(
                $undecidedOverdue->values(),
                $unrefundedOverdue->values(),
                $adminUrl
            ));
            $this->info("Alert email dispatched successfully to {$adminEmail}.");
        } catch (\Throwable $e) {
            Log::error("Failed sending refund SLA reminder email: {$e->getMessage()}");
            $this->error("Failed to send email: {$e->getMessage()}");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
