<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Jobs\SendAnnouncementChunkJob;
use App\Mail\AnnouncementMail;
use App\Models\Announcement;
use App\Models\AnnouncementRecipient;
use App\Models\Plan;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AnnouncementManagementController extends Controller
{
    /**
     * Display a listing of announcements.
     */
    public function index(Request $request): Response
    {
        $query = Announcement::with('creator')->latest();

        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('message', 'like', "%{$search}%");
            });
        }

        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        if ($type = $request->input('type')) {
            $query->where('type', $type);
        }

        $announcements = $query->paginate(15)->withQueryString();

        // Metrics
        $totalCount = Announcement::count();
        $sentCount = Announcement::where('status', 'sent')->count();
        $scheduledCount = Announcement::where('status', 'scheduled')->count();
        $draftCount = Announcement::where('status', 'draft')->count();

        $totalDeliveries = AnnouncementRecipient::count();
        $readDeliveries = AnnouncementRecipient::whereNotNull('read_at')->count();
        $clickedDeliveries = AnnouncementRecipient::whereNotNull('clicked_at')->count();

        $readRate = $totalDeliveries > 0 ? round(($readDeliveries / $totalDeliveries) * 100, 1) : 0;
        $clickRate = $totalDeliveries > 0 ? round(($clickedDeliveries / $totalDeliveries) * 100, 1) : 0;

        // Clinics and plans list for audience selector
        $clinics = Tenant::select('id', 'name')->orderBy('name')->get();
        $plans = Plan::select('id', 'name', 'slug')->get();

        return Inertia::render('SuperAdmin/Announcements/Index', [
            'announcements' => $announcements,
            'filters' => $request->only(['search', 'status', 'type']),
            'metrics' => [
                'total' => $totalCount,
                'sent' => $sentCount,
                'scheduled' => $scheduledCount,
                'drafts' => $draftCount,
                'read_rate' => $readRate,
                'click_rate' => $clickRate,
            ],
            'availableClinics' => $clinics,
            'availablePlans' => $plans,
        ]);
    }

    /**
     * Store a new announcement (draft, scheduled, or send immediately).
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string'],
            'type' => ['required', 'in:info,update,warning,maintenance,billing'],
            'cta_label' => ['nullable', 'string', 'max:100'],
            'cta_url' => ['nullable', 'url', 'max:255'],
            'channels' => ['required', 'array', 'min:1'],
            'channels.*' => ['in:in_app,banner,email,sms,whatsapp'],
            'audience_type' => ['required', 'in:all,selected,filtered'],
            'target_clinic_ids' => ['nullable', 'array'],
            'target_plans' => ['nullable', 'array'],
            'target_statuses' => ['nullable', 'array'],
            'target_recipient_roles' => ['nullable', 'array'],
            'banner_start_at' => ['nullable', 'date'],
            'banner_end_at' => ['nullable', 'date', 'after_or_equal:banner_start_at'],
            'banner_dismissible' => ['boolean'],
            'action' => ['required', 'in:draft,send,schedule'],
            'scheduled_at' => ['nullable', 'date', 'required_if:action,schedule'],
        ]);

        // Basic HTML sanitization: strip script, iframe, object, dangerous tags
        $cleanMessage = $this->sanitizeHtml($validated['message']);

        $status = match ($validated['action']) {
            'send' => 'sending',
            'schedule' => 'scheduled',
            default => 'draft',
        };

        $announcement = Announcement::create([
            'title' => $validated['title'],
            'message' => $cleanMessage,
            'type' => $validated['type'],
            'cta_label' => $validated['cta_label'] ?? null,
            'cta_url' => $validated['cta_url'] ?? null,
            'channels' => $validated['channels'],
            'audience_type' => $validated['audience_type'],
            'target_clinic_ids' => $validated['target_clinic_ids'] ?? null,
            'target_plans' => $validated['target_plans'] ?? null,
            'target_statuses' => $validated['target_statuses'] ?? null,
            'target_recipient_roles' => $validated['target_recipient_roles'] ?? ['clinic_admin'],
            'banner_start_at' => $validated['banner_start_at'] ?? null,
            'banner_end_at' => $validated['banner_end_at'] ?? null,
            'banner_dismissible' => $validated['banner_dismissible'] ?? true,
            'scheduled_at' => $status === 'scheduled' ? $validated['scheduled_at'] : null,
            'status' => $status,
            'created_by' => Auth::id(),
        ]);

        AuditLogger::log('announcement.created', [
            'resource_type' => 'announcement',
            'resource_id' => $announcement->id,
            'metadata' => [
                'title' => $announcement->title,
                'status' => $status,
                'audience_type' => $announcement->audience_type,
            ],
        ]);

        // If sending immediately or scheduled, generate recipient rows
        if (in_array($status, ['sending', 'scheduled'], true)) {
            $this->generateRecipients($announcement);

            if ($status === 'sending') {
                $recipientIds = AnnouncementRecipient::where('announcement_id', $announcement->id)
                    ->pluck('id')
                    ->all();

                $chunks = array_chunk($recipientIds, 50);
                foreach ($chunks as $chunk) {
                    SendAnnouncementChunkJob::dispatch($chunk);
                }
            }
        }

        $message = match ($status) {
            'sending' => 'Announcement is being sent to recipients.',
            'scheduled' => 'Announcement has been scheduled successfully.',
            default => 'Announcement draft saved successfully.',
        };

        return back()->with('success', $message);
    }

    /**
     * Show detailed announcement delivery report.
     */
    public function show(Request $request): Response
    {
        $id = (string) $request->route('id');
        $announcement = Announcement::with(['creator'])->findOrFail($id);

        $recipientsQuery = AnnouncementRecipient::with(['tenant', 'user'])
            ->where('announcement_id', $announcement->id);

        $totalRecipients = $recipientsQuery->count();
        $deliveredCount = (clone $recipientsQuery)->whereIn('status', ['sent', 'delivered', 'read'])->count();
        $failedCount = (clone $recipientsQuery)->where('status', 'failed')->count();
        $readCount = (clone $recipientsQuery)->whereNotNull('read_at')->count();
        $dismissedCount = (clone $recipientsQuery)->whereNotNull('dismissed_at')->count();
        $clickedCount = (clone $recipientsQuery)->whereNotNull('clicked_at')->count();

        $recipients = $recipientsQuery->latest()->paginate(25);

        return Inertia::render('SuperAdmin/Announcements/Show', [
            'announcement' => $announcement,
            'recipients' => $recipients,
            'stats' => [
                'total' => $totalRecipients,
                'delivered' => $deliveredCount,
                'failed' => $failedCount,
                'read' => $readCount,
                'dismissed' => $dismissedCount,
                'clicked' => $clickedCount,
            ],
        ]);
    }

    /**
     * Update an announcement draft.
     */
    public function update(Request $request): RedirectResponse
    {
        $id = (string) $request->route('id');
        $announcement = Announcement::findOrFail($id);

        if (! in_array($announcement->status, ['draft', 'scheduled'], true)) {
            return back()->with('error', 'Only drafts and scheduled announcements can be modified.');
        }

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'message' => ['required', 'string'],
            'type' => ['required', 'in:info,update,warning,maintenance,billing'],
            'cta_label' => ['nullable', 'string', 'max:100'],
            'cta_url' => ['nullable', 'url', 'max:255'],
            'channels' => ['required', 'array', 'min:1'],
            'channels.*' => ['in:in_app,banner,email,sms,whatsapp'],
            'audience_type' => ['required', 'in:all,selected,filtered'],
            'target_clinic_ids' => ['nullable', 'array'],
            'target_plans' => ['nullable', 'array'],
            'target_statuses' => ['nullable', 'array'],
            'target_recipient_roles' => ['nullable', 'array'],
            'banner_start_at' => ['nullable', 'date'],
            'banner_end_at' => ['nullable', 'date', 'after_or_equal:banner_start_at'],
            'banner_dismissible' => ['boolean'],
            'action' => ['required', 'in:draft,send,schedule'],
            'scheduled_at' => ['nullable', 'date'],
        ]);

        $status = match ($validated['action']) {
            'send' => 'sending',
            'schedule' => 'scheduled',
            default => 'draft',
        };

        $announcement->update([
            'title' => $validated['title'],
            'message' => $this->sanitizeHtml($validated['message']),
            'type' => $validated['type'],
            'cta_label' => $validated['cta_label'] ?? null,
            'cta_url' => $validated['cta_url'] ?? null,
            'channels' => $validated['channels'],
            'audience_type' => $validated['audience_type'],
            'target_clinic_ids' => $validated['target_clinic_ids'] ?? null,
            'target_plans' => $validated['target_plans'] ?? null,
            'target_statuses' => $validated['target_statuses'] ?? null,
            'target_recipient_roles' => $validated['target_recipient_roles'] ?? ['clinic_admin'],
            'banner_start_at' => $validated['banner_start_at'] ?? null,
            'banner_end_at' => $validated['banner_end_at'] ?? null,
            'banner_dismissible' => $validated['banner_dismissible'] ?? true,
            'scheduled_at' => $status === 'scheduled' ? $validated['scheduled_at'] : null,
            'status' => $status,
        ]);

        if (in_array($status, ['sending', 'scheduled'], true)) {
            // Remove previous pending recipients and regenerate
            AnnouncementRecipient::where('announcement_id', $announcement->id)->delete();
            $this->generateRecipients($announcement);

            if ($status === 'sending') {
                $recipientIds = AnnouncementRecipient::where('announcement_id', $announcement->id)->pluck('id')->all();
                foreach (array_chunk($recipientIds, 50) as $chunk) {
                    SendAnnouncementChunkJob::dispatch($chunk);
                }
            }
        }

        return back()->with('success', 'Announcement updated successfully.');
    }

    /**
     * Cancel a scheduled announcement.
     */
    public function cancel(Request $request): RedirectResponse
    {
        $id = (string) $request->route('id');
        $announcement = Announcement::findOrFail($id);

        if ($announcement->status !== 'scheduled') {
            return back()->with('error', 'Only scheduled announcements can be cancelled.');
        }

        $announcement->status = 'cancelled';
        $announcement->save();

        AnnouncementRecipient::where('announcement_id', $announcement->id)
            ->where('status', 'pending')
            ->delete();

        AuditLogger::log('announcement.cancelled', [
            'resource_type' => 'announcement',
            'resource_id' => $announcement->id,
        ]);

        return back()->with('success', 'Scheduled announcement was cancelled.');
    }

    /**
     * Duplicate an announcement into a new draft.
     */
    public function duplicate(Request $request): RedirectResponse
    {
        $id = (string) $request->route('id');
        $source = Announcement::findOrFail($id);

        $copy = $source->replicate(['created_at', 'updated_at', 'sent_at', 'status']);
        $copy->title = "{$source->title} (Copy)";
        $copy->status = 'draft';
        $copy->created_by = Auth::id();
        $copy->save();

        return back()->with('success', 'Announcement duplicated into a new draft.');
    }

    /**
     * Delete a draft or cancelled announcement.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $id = (string) $request->route('id');
        $announcement = Announcement::findOrFail($id);
        $announcement->delete();

        return back()->with('success', 'Announcement deleted.');
    }

    /**
     * Live audience count calculator.
     */
    public function audienceCount(Request $request): JsonResponse
    {
        $audienceType = $request->input('audience_type', 'all');
        $clinicIds = $request->input('target_clinic_ids', []);
        $plans = $request->input('target_plans', []);
        $statuses = $request->input('target_statuses', []);
        $roles = $request->input('target_recipient_roles', ['clinic_admin']);

        $clinicsQuery = Tenant::query();

        if ($audienceType === 'selected' && ! empty($clinicIds)) {
            $clinicsQuery->whereIn('id', $clinicIds);
        } elseif ($audienceType === 'filtered') {
            if (! empty($plans)) {
                $clinicsQuery->whereIn('plan', $plans);
            }
            if (! empty($statuses)) {
                $clinicsQuery->whereIn('status', $statuses);
            }
        }

        $targetClinics = $clinicsQuery->get();
        $clinicCount = $targetClinics->count();

        // Calculate people count
        $tenantIds = $targetClinics->pluck('id')->all();

        $usersQuery = User::whereIn('tenant_id', $tenantIds)->where('is_active', true);

        if (! in_array('all_staff', $roles, true)) {
            $roleNames = [];
            if (in_array('clinic_admin', $roles, true)) {
                $roleNames[] = 'clinic_admin';
            }
            if (in_array('doctor', $roles, true)) {
                $roleNames[] = 'doctor';
            }

            if (! empty($roleNames)) {
                $usersQuery->whereHas('roles', function ($q) use ($roleNames) {
                    $q->whereIn('name', $roleNames);
                });
            }
        }

        $peopleCount = $usersQuery->count();

        return response()->json([
            'clinics_count' => $clinicCount,
            'people_count' => $peopleCount,
            'summary' => "{$clinicCount} clinics · {$peopleCount} people",
        ]);
    }

    /**
     * Send test email to current super admin.
     */
    public function sendTest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string'],
            'message' => ['required', 'string'],
            'type' => ['required', 'string'],
            'cta_label' => ['nullable', 'string'],
            'cta_url' => ['nullable', 'string'],
        ]);

        $dummy = new Announcement([
            'title' => '[TEST] '.$validated['title'],
            'message' => $this->sanitizeHtml($validated['message']),
            'type' => $validated['type'],
            'cta_label' => $validated['cta_label'] ?? null,
            'cta_url' => $validated['cta_url'] ?? null,
        ]);

        $recipientEmail = Auth::user()->email;

        Mail::to($recipientEmail)->send(new AnnouncementMail($dummy));

        return response()->json([
            'success' => true,
            'message' => "Test email dispatched to {$recipientEmail}",
        ]);
    }

    /**
     * Export delivery stats as CSV.
     */
    public function export(Request $request): StreamedResponse
    {
        $id = (string) $request->route('id');
        $announcement = Announcement::findOrFail($id);

        return response()->streamDownload(function () use ($announcement) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Recipient ID', 'Clinic Name', 'User Email', 'Channel', 'Status', 'Error', 'Sent At', 'Read At', 'Dismissed At', 'Clicked At']);

            AnnouncementRecipient::with(['tenant', 'user'])
                ->where('announcement_id', $announcement->id)
                ->chunk(200, function ($rows) use ($handle) {
                    foreach ($rows as $row) {
                        fputcsv($handle, [
                            $row->id,
                            $row->tenant?->name ?? 'N/A',
                            $row->email ?? $row->user?->email ?? 'N/A',
                            $row->channel,
                            $row->status,
                            $row->error_reason ?? '',
                            $row->sent_at?->toIso8601String() ?? '',
                            $row->read_at?->toIso8601String() ?? '',
                            $row->dismissed_at?->toIso8601String() ?? '',
                            $row->clicked_at?->toIso8601String() ?? '',
                        ]);
                    }
                });

            fclose($handle);
        }, "announcement_{$announcement->id}_report.csv", [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * Generate recipient records for an announcement.
     */
    private function generateRecipients(Announcement $announcement): void
    {
        $clinicsQuery = Tenant::query();

        if ($announcement->audience_type === 'selected' && ! empty($announcement->target_clinic_ids)) {
            $clinicsQuery->whereIn('id', $announcement->target_clinic_ids);
        } elseif ($announcement->audience_type === 'filtered') {
            if (! empty($announcement->target_plans)) {
                $clinicsQuery->whereIn('plan', $announcement->target_plans);
            }
            if (! empty($announcement->target_statuses)) {
                $clinicsQuery->whereIn('status', $announcement->target_statuses);
            }
        }

        $clinics = $clinicsQuery->get();
        $roles = $announcement->target_recipient_roles ?? ['clinic_admin'];
        $channels = $announcement->channels ?? ['in_app'];

        foreach ($clinics as $clinic) {
            // Find users in this tenant matching role criteria
            $usersQuery = User::where('tenant_id', $clinic->id)->where('is_active', true);

            if (! in_array('all_staff', $roles, true)) {
                $roleNames = [];
                if (in_array('clinic_admin', $roles, true)) {
                    $roleNames[] = 'clinic_admin';
                }
                if (in_array('doctor', $roles, true)) {
                    $roleNames[] = 'doctor';
                }
                if (! empty($roleNames)) {
                    $usersQuery->whereHas('roles', fn ($q) => $q->whereIn('name', $roleNames));
                }
            }

            $users = $usersQuery->get();

            // If banner channel is requested, create at least one clinic-level banner recipient
            if (in_array('banner', $channels, true)) {
                AnnouncementRecipient::firstOrCreate([
                    'announcement_id' => $announcement->id,
                    'tenant_id' => $clinic->id,
                    'user_id' => null,
                    'channel' => 'banner',
                ], [
                    'status' => 'pending',
                ]);
            }

            // Create recipient rows per user for in_app and email
            foreach ($users as $u) {
                foreach ($channels as $channel) {
                    if ($channel === 'banner') {
                        continue;
                    } // Handled above

                    AnnouncementRecipient::firstOrCreate([
                        'announcement_id' => $announcement->id,
                        'tenant_id' => $clinic->id,
                        'user_id' => $u->id,
                        'channel' => $channel,
                    ], [
                        'email' => $u->email,
                        'status' => 'pending',
                    ]);
                }
            }
        }
    }

    /**
     * Basic HTML sanitizer to allow safe styling while preventing XSS.
     */
    private function sanitizeHtml(string $html): string
    {
        // Strip script, style, iframe, object, embed, form tags
        $stripped = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $html);
        $stripped = preg_replace('/<style\b[^>]*>(.*?)<\/style>/is', '', (string) $stripped);
        $stripped = preg_replace('/<iframe\b[^>]*>(.*?)<\/iframe>/is', '', (string) $stripped);
        $stripped = preg_replace('/<(applet|object|embed|form)\b[^>]*>(.*?)<\/\1>/is', '', (string) $stripped);

        // Strip inline on* event handlers (onclick, onerror, onload, etc.)
        $stripped = preg_replace('/\s+on[a-z]+="[^"]*"/i', '', (string) $stripped);
        $stripped = preg_replace('/\s+on[a-z]+=\'[^\']*\'/i', '', (string) $stripped);
        $stripped = preg_replace('/javascript:/i', 'unsafe:', (string) $stripped);

        return (string) $stripped;
    }
}
