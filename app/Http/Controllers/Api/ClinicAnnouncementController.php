<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Announcement;
use App\Models\AnnouncementRecipient;
use App\Services\PlatformSettingsService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ClinicAnnouncementController extends Controller
{
    public function __construct(
        private readonly PlatformSettingsService $settings
    ) {}

    /**
     * Get active broadcast banners and platform maintenance status for clinic shell.
     */
    public function getActiveBanners(Request $request): JsonResponse
    {
        $tenantId = tenant('id') ?? Auth::user()?->tenant_id;
        $now = Carbon::now();

        $platformSettings = $this->settings->all();
        $maintenanceEnabled = (bool) ($platformSettings['maintenance.enabled'] ?? false);
        $maintenanceBanner = $platformSettings['maintenance.banner_text'] ?? null;

        $banners = [];

        // Maintenance banner (highest priority)
        if ($maintenanceEnabled && ! empty($maintenanceBanner)) {
            $banners[] = [
                'id' => 'maintenance-platform',
                'type' => 'maintenance',
                'title' => 'Platform Maintenance Scheduled',
                'message' => $maintenanceBanner,
                'dismissible' => false,
                'cta_label' => null,
                'cta_url' => null,
            ];
        }

        // Broadcast announcement banners targeted to this clinic
        if ($tenantId) {
            $announcements = Announcement::whereIn('status', ['sending', 'sent'])
                ->where(function ($q) use ($now) {
                    $q->whereNull('banner_start_at')->orWhere('banner_start_at', '<=', $now);
                })
                ->where(function ($q) use ($now) {
                    $q->whereNull('banner_end_at')->orWhere('banner_end_at', '>=', $now);
                })
                ->whereHas('recipients', function ($q) use ($tenantId) {
                    $q->where('tenant_id', $tenantId)
                        ->where('channel', 'banner')
                        ->whereNull('dismissed_at');
                })
                ->latest()
                ->limit(3)
                ->get();

            foreach ($announcements as $ann) {
                $recipient = AnnouncementRecipient::where('announcement_id', $ann->id)
                    ->where('tenant_id', $tenantId)
                    ->where('channel', 'banner')
                    ->first();

                $ctaTracking = $recipient && $ann->cta_url
                    ? route('announcements.cta', ['recipient' => $recipient->id])
                    : $ann->cta_url;

                $banners[] = [
                    'id' => $ann->id,
                    'type' => $ann->type,
                    'title' => $ann->title,
                    'message' => strip_tags((string) $ann->message),
                    'dismissible' => (bool) $ann->banner_dismissible,
                    'cta_label' => $ann->cta_label,
                    'cta_url' => $ctaTracking,
                ];
            }
        }

        return response()->json([
            'banners' => $banners,
        ]);
    }

    /**
     * Dismiss a banner announcement for this tenant.
     */
    public function dismissBanner(string $id): JsonResponse
    {
        $tenantId = tenant('id') ?? Auth::user()?->tenant_id;

        if ($tenantId) {
            AnnouncementRecipient::where('announcement_id', $id)
                ->where('tenant_id', $tenantId)
                ->where('channel', 'banner')
                ->update([
                    'dismissed_at' => now(),
                    'status' => 'dismissed',
                ]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Get in-app announcements for notification bell in clinic shell.
     */
    public function getNotifications(Request $request): JsonResponse
    {
        $user = Auth::user();
        if (! $user) {
            return response()->json(['notifications' => [], 'unread_count' => 0]);
        }

        $recipients = AnnouncementRecipient::with('announcement')
            ->where('user_id', $user->id)
            ->where('channel', 'in_app')
            ->latest()
            ->limit(20)
            ->get();

        $items = [];
        $unreadCount = 0;

        foreach ($recipients as $rec) {
            $ann = $rec->announcement;
            if (! $ann) {
                continue;
            }

            $isUnread = $rec->read_at === null;
            if ($isUnread) {
                $unreadCount++;
            }

            $items[] = [
                'id' => $rec->id,
                'announcement_id' => $ann->id,
                'title' => $ann->title,
                'message' => strip_tags((string) $ann->message),
                'type' => $ann->type,
                'time' => $rec->created_at->diffForHumans(),
                'is_unread' => $isUnread,
                'cta_label' => $ann->cta_label,
                'cta_url' => $ann->cta_url ? route('announcements.cta', ['recipient' => $rec->id]) : null,
            ];
        }

        return response()->json([
            'notifications' => $items,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * Mark an in-app announcement as read.
     */
    public function markRead(string $recipientId): JsonResponse
    {
        $user = Auth::user();

        AnnouncementRecipient::where('id', $recipientId)
            ->where('user_id', $user?->id)
            ->update([
                'read_at' => now(),
                'status' => 'read',
            ]);

        return response()->json(['success' => true]);
    }

    /**
     * Mark all in-app announcements as read for the user.
     */
    public function markAllRead(): JsonResponse
    {
        $user = Auth::user();

        if ($user) {
            AnnouncementRecipient::where('user_id', $user->id)
                ->where('channel', 'in_app')
                ->whereNull('read_at')
                ->update([
                    'read_at' => now(),
                    'status' => 'read',
                ]);
        }

        return response()->json(['success' => true]);
    }

    /**
     * Public / Authenticated CTA click tracking redirect.
     */
    public function trackCtaClick(string $recipientId): RedirectResponse
    {
        $recipient = AnnouncementRecipient::with('announcement')->findOrFail($recipientId);

        $recipient->clicked_at = now();
        $recipient->save();

        $targetUrl = $recipient->announcement?->cta_url ?: '/';

        return redirect()->away($targetUrl);
    }
}
