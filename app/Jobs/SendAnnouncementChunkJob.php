<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Mail\AnnouncementMail;
use App\Models\Announcement;
use App\Models\AnnouncementRecipient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendAnnouncementChunkJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    /**
     * @param  array<int, string>  $recipientIds
     */
    public function __construct(
        public array $recipientIds
    ) {}

    public function handle(): void
    {
        $recipients = AnnouncementRecipient::with(['announcement', 'user', 'tenant'])
            ->whereIn('id', $this->recipientIds)
            ->get();

        foreach ($recipients as $recipient) {
            // Idempotency: Skip if already finished
            if (in_array($recipient->status, ['sent', 'delivered', 'read', 'dismissed'], true)) {
                continue;
            }

            $announcement = $recipient->announcement;
            if (! $announcement) {
                continue;
            }

            try {
                if ($recipient->channel === 'email') {
                    if (empty($recipient->email)) {
                        $recipient->status = 'failed';
                        $recipient->error_reason = 'Recipient email address is missing';
                        $recipient->save();

                        continue;
                    }

                    // Check user mute preference
                    $isCritical = in_array($announcement->type, ['billing', 'maintenance'], true);
                    if (! $isCritical && $recipient->user && $recipient->user->mute_announcement_emails) {
                        $recipient->status = 'dismissed';
                        $recipient->error_reason = 'Muted by user preference';
                        $recipient->save();

                        continue;
                    }

                    $trackingCtaUrl = $announcement->cta_url
                        ? route('announcements.cta', ['recipient' => $recipient->id])
                        : null;

                    $tenantDomain = $recipient->tenant?->domains()->first()?->domain;
                    $scheme = request()?->getScheme() ?? 'http';
                    $unsubscribeUrl = $tenantDomain
                        ? "{$scheme}://{$tenantDomain}/profile"
                        : url('/profile');

                    Mail::to($recipient->email)->send(
                        new AnnouncementMail(
                            $announcement,
                            $recipient,
                            $trackingCtaUrl,
                            $unsubscribeUrl
                        )
                    );

                    $recipient->status = 'sent';
                    $recipient->sent_at = now();
                    $recipient->save();
                } else {
                    // in_app or banner: delivered to clinic workspace feed
                    $recipient->status = 'delivered';
                    $recipient->sent_at = now();
                    $recipient->save();
                }
            } catch (Throwable $e) {
                Log::warning("Failed delivering announcement {$announcement->id} to recipient {$recipient->id}: {$e->getMessage()}");
                $recipient->status = 'failed';
                $recipient->error_reason = mb_substr($e->getMessage(), 0, 500);
                $recipient->save();
            }
        }

        // Check if all recipients for the announcement(s) are completed
        $announcementIds = $recipients->pluck('announcement_id')->unique();
        foreach ($announcementIds as $announcementId) {
            $pendingCount = AnnouncementRecipient::where('announcement_id', $announcementId)
                ->where('status', 'pending')
                ->count();

            if ($pendingCount === 0) {
                $hasFailed = AnnouncementRecipient::where('announcement_id', $announcementId)
                    ->where('status', 'failed')
                    ->exists();

                Announcement::where('id', $announcementId)->update([
                    'status' => $hasFailed ? 'partially_failed' : 'sent',
                    'sent_at' => now(),
                ]);
            }
        }
    }
}
