<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Jobs\SendAnnouncementChunkJob;
use App\Models\Announcement;
use App\Models\AnnouncementRecipient;
use App\Models\SchedulerHeartbeat;
use Carbon\Carbon;
use Illuminate\Console\Command;

class ProcessScheduledAnnouncementsCommand extends Command
{
    protected $signature = 'announcements:process-scheduled';

    protected $description = 'Process and send scheduled announcements due for delivery';

    public function handle(): int
    {
        $start = microtime(true);

        $dueAnnouncements = Announcement::where('status', 'scheduled')
            ->where('scheduled_at', '<=', now())
            ->get();

        $processed = 0;

        foreach ($dueAnnouncements as $announcement) {
            $announcement->status = 'sending';
            $announcement->save();

            $recipientIds = AnnouncementRecipient::where('announcement_id', $announcement->id)
                ->where('status', 'pending')
                ->pluck('id')
                ->all();

            $chunks = array_chunk($recipientIds, 50);
            foreach ($chunks as $chunk) {
                SendAnnouncementChunkJob::dispatch($chunk);
            }

            $processed++;
        }

        $durationMs = (int) round((microtime(true) - $start) * 1000);

        SchedulerHeartbeat::updateOrCreate(
            ['command' => 'announcements:process-scheduled'],
            [
                'last_started_at' => Carbon::now(),
                'last_finished_at' => Carbon::now(),
                'duration_ms' => $durationMs,
                'status' => 'success',
                'last_output' => "Processed {$processed} scheduled announcements.",
            ]
        );

        $this->info("Processed {$processed} due scheduled announcements.");

        return Command::SUCCESS;
    }
}
