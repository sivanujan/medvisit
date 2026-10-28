<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Events\SupportConversationRead;
use App\Events\SupportMessageSent;
use App\Events\SupportStatusChanged;
use App\Http\Controllers\Controller;
use App\Jobs\ProcessSupportAiReply;
use App\Models\PlatformSetting;
use App\Models\SubscriptionInvoice;
use App\Models\SupportCannedReply;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Services\PlatformSettingsService;
use App\Services\SupportChatService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SupportInboxController extends Controller
{
    public function __construct(
        protected SupportChatService $chatService,
        protected PlatformSettingsService $settingsService,
    ) {}

    /**
     * Render the Super Admin Support Inbox.
     */
    public function index(Request $request): Response
    {
        $filter = (string) $request->input('filter', 'waiting');
        $search = trim((string) $request->input('search', ''));
        $selectedPublicId = (string) $request->input('conversation', '');
        $user = $request->user();

        // 1. Calculate badge counts
        $waitingCount = SupportConversation::where('status', 'waiting_human')->count();
        $aiCount = SupportConversation::where('status', 'ai')->count();
        $mineCount = SupportConversation::where('assigned_admin_id', $user?->id)->where('status', '!=', 'closed')->count();
        $closedCount = SupportConversation::where('status', 'closed')->count();
        $allCount = SupportConversation::count();

        // 2. Query conversations based on filter
        $query = SupportConversation::with(['tenant', 'user', 'assignedAdmin'])
            ->latest('last_message_at');

        if (! empty($search)) {
            $query->where(function ($q) use ($search) {
                $q->where('visitor_name', 'ilike', "%{$search}%")
                    ->orWhere('visitor_email', 'ilike', "%{$search}%")
                    ->orWhere('visitor_phone', 'ilike', "%{$search}%")
                    ->orWhereHas('tenant', fn ($t) => $t->where('name', 'ilike', "%{$search}%")->orWhere('subdomain', 'ilike', "%{$search}%"));
            });
        }

        match ($filter) {
            'waiting' => $query->where('status', 'waiting_human'),
            'mine' => $query->where('assigned_admin_id', $user?->id)->where('status', '!=', 'closed'),
            'ai' => $query->where('status', 'ai'),
            'closed' => $query->where('status', 'closed'),
            default => null, // 'all'
        };

        $conversations = $query->take(60)->get()->map(function (SupportConversation $conv) {
            $lastMessage = $conv->messages()->latest('created_at')->first(['body', 'sender_type', 'created_at']);
            $waitingSeconds = $conv->status === 'waiting_human' && $conv->last_message_at
                ? max(0, now()->diffInSeconds($conv->last_message_at))
                : null;

            return [
                'id' => $conv->id,
                'public_id' => $conv->public_id,
                'channel' => $conv->channel,
                'status' => $conv->status,
                'visitor_name' => $conv->visitor_name ?? ($conv->channel === 'dashboard' ? 'Clinic Staff' : 'Website Visitor'),
                'visitor_email' => $conv->visitor_email,
                'visitor_phone' => $conv->visitor_phone,
                'clinic_name' => $conv->tenant?->name,
                'clinic_subdomain' => $conv->tenant?->subdomain,
                'assigned_admin_name' => $conv->assignedAdmin?->name,
                'assigned_admin_id' => $conv->assigned_admin_id,
                'last_message' => $lastMessage ? [
                    'body' => $lastMessage->body,
                    'sender_type' => $lastMessage->sender_type,
                    'created_at' => $lastMessage->created_at->toIso8601String(),
                ] : null,
                'last_message_at' => $conv->last_message_at?->toIso8601String(),
                'waiting_seconds' => $waitingSeconds,
                'rating' => $conv->rating,
                'rating_comment' => $conv->rating_comment,
            ];
        });

        // 3. Resolve active conversation
        $activeConversation = null;
        $activeMessages = [];
        $activeContext = null;

        $targetPublicId = $selectedPublicId ?: ($conversations->first()['public_id'] ?? null);

        if ($targetPublicId) {
            $selectedConv = SupportConversation::where('public_id', $targetPublicId)
                ->with(['tenant', 'user', 'assignedAdmin'])
                ->first();

            if ($selectedConv) {
                // Mark unread messages as read by admin
                $selectedConv->messages()
                    ->whereIn('sender_type', ['visitor', 'user'])
                    ->whereNull('read_at')
                    ->update(['read_at' => now()]);

                rescue(fn () => broadcast(new SupportConversationRead($selectedConv, 'admin'))->toOthers(), null, false);

                $activeConversation = [
                    'id' => $selectedConv->id,
                    'public_id' => $selectedConv->public_id,
                    'channel' => $selectedConv->channel,
                    'status' => $selectedConv->status,
                    'visitor_name' => $selectedConv->visitor_name ?? ($selectedConv->channel === 'dashboard' ? 'Clinic Staff' : 'Website Visitor'),
                    'visitor_email' => $selectedConv->visitor_email,
                    'visitor_phone' => $selectedConv->visitor_phone,
                    'assigned_admin_id' => $selectedConv->assigned_admin_id,
                    'assigned_admin_name' => $selectedConv->assignedAdmin?->name,
                    'rating' => $selectedConv->rating,
                    'rating_comment' => $selectedConv->rating_comment,
                    'closed_at' => $selectedConv->closed_at?->toIso8601String(),
                    'last_message_at' => $selectedConv->last_message_at?->toIso8601String(),
                ];

                $activeMessages = $selectedConv->messages()->with('sender')->get()->map(function (SupportMessage $m) use ($selectedConv) {
                    $senderName = match ($m->sender_type) {
                        'visitor' => $selectedConv->visitor_name ?? 'Visitor',
                        'user' => $selectedConv->user?->name ?? $selectedConv->visitor_name ?? 'Clinic Staff',
                        'admin' => $m->sender?->name ?? 'MedVisit Support',
                        'ai' => 'MedVisit Assistant',
                        'system' => 'System',
                        default => 'Support',
                    };

                    return [
                        'id' => $m->id,
                        'conversation_id' => $m->conversation_id,
                        'sender_type' => $m->sender_type,
                        'sender_id' => $m->sender_id,
                        'sender_name' => $senderName,
                        'body' => $m->body,
                        'read_at' => $m->read_at?->toIso8601String(),
                        'created_at' => $m->created_at->toIso8601String(),
                    ];
                });

                // Context Panel (Clinic user vs Guest)
                if ($selectedConv->tenant) {
                    $tenant = $selectedConv->tenant;
                    $lastInvoice = SubscriptionInvoice::where('tenant_id', $tenant->id)
                        ->where('status', 'paid')
                        ->latest('paid_at')
                        ->first();

                    $activeContext = [
                        'type' => 'clinic',
                        'clinic_name' => $tenant->name,
                        'subdomain' => $tenant->subdomain,
                        'subdomain_url' => $tenant->url('/dashboard'),
                        'plan' => ucfirst((string) ($tenant->plan ?? 'Growth')),
                        'status' => $tenant->status,
                        'created_date' => $tenant->created_at->format('M d, Y'),
                        'last_payment_date' => $lastInvoice?->paid_at ? Carbon::parse($lastInvoice->paid_at)->format('M d, Y') : 'N/A',
                        'last_payment_amount' => $lastInvoice ? 'LKR '.number_format($lastInvoice->amount_cents / 100, 2) : 'N/A',
                        'user_role' => $selectedConv->user ? ($selectedConv->user->roles->pluck('name')->first() ?? 'Staff') : 'Clinic User',
                        'user_name' => $selectedConv->user?->name ?? $selectedConv->visitor_name,
                        'user_email' => $selectedConv->user?->email ?? $selectedConv->visitor_email,
                        'user_phone' => $selectedConv->user?->phone ?? $tenant->phone ?? 'N/A',
                    ];
                } else {
                    $meta = $selectedConv->meta ?? [];
                    $activeContext = [
                        'type' => 'guest',
                        'visitor_name' => $selectedConv->visitor_name ?? 'Website Guest',
                        'visitor_email' => $selectedConv->visitor_email ?? 'N/A',
                        'visitor_phone' => $selectedConv->visitor_phone ?? 'N/A',
                        'started_page' => $meta['page_url'] ?? '/',
                        'user_agent' => $meta['user_agent'] ?? 'Browser',
                        'colombo_time' => Carbon::now('Asia/Colombo')->format('g:i A (T)'),
                    ];
                }
            }
        }

        $cannedReplies = SupportCannedReply::orderBy('title')->get(['id', 'title', 'body']);
        $settings = $this->settingsService->all();

        return Inertia::render('SuperAdmin/Support/Inbox', [
            'conversations' => $conversations,
            'activeConversation' => $activeConversation,
            'activeMessages' => $activeMessages,
            'activeContext' => $activeContext,
            'cannedReplies' => $cannedReplies,
            'counts' => [
                'waiting' => $waitingCount,
                'ai' => $aiCount,
                'mine' => $mineCount,
                'closed' => $closedCount,
                'all' => $allCount,
            ],
            'filters' => [
                'filter' => $filter,
                'search' => $search,
                'selectedPublicId' => $targetPublicId,
            ],
            'supportSettings' => [
                'business_hours_days' => $settings['support.business_hours_days'] ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
                'business_hours_start' => $settings['support.business_hours_start'] ?? '08:30',
                'business_hours_end' => $settings['support.business_hours_end'] ?? '18:00',
                'business_hours_timezone' => $settings['support.business_hours_timezone'] ?? 'Asia/Colombo',
                'offline_message' => $settings['support.offline_message'] ?? '',
                'response_time_text' => $settings['support.response_time_text'] ?? 'Usually replies within a few hours',
            ],
        ]);
    }

    /**
     * Admin reply to an active conversation.
     */
    public function reply(Request $request): JsonResponse
    {
        $publicId = (string) $request->route('publicId');
        $conversation = SupportConversation::where('public_id', $publicId)->firstOrFail();
        $user = $request->user();

        $validated = $request->validate([
            'body' => ['required_without:message', 'nullable', 'string', 'max:2000'],
            'message' => ['required_without:body', 'nullable', 'string', 'max:2000'],
        ]);

        $bodyText = $validated['body'] ?? $validated['message'] ?? '';

        $message = SupportMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'admin',
            'sender_id' => $user->id,
            'body' => mb_substr(strip_tags(trim($bodyText)), 0, 2000),
        ]);

        $updates = [
            'last_message_at' => now(),
        ];

        // Transition from waiting_human to human_active automatically when admin replies
        if ($conversation->status === 'waiting_human') {
            $updates['status'] = 'human_active';
            if (empty($conversation->assigned_admin_id)) {
                $updates['assigned_admin_id'] = $user->id;
            }
        }

        $conversation->update($updates);

        rescue(fn () => broadcast(new SupportMessageSent($conversation, $message))->toOthers(), null, false);
        rescue(fn () => broadcast(new SupportStatusChanged($conversation))->toOthers(), null, false);

        return response()->json([
            'message' => [
                'id' => $message->id,
                'conversation_id' => $message->conversation_id,
                'sender_type' => $message->sender_type,
                'sender_id' => $message->sender_id,
                'sender_name' => $user->name,
                'body' => $message->body,
                'created_at' => $message->created_at->toIso8601String(),
            ],
            'conversation' => [
                'public_id' => $conversation->public_id,
                'status' => $conversation->status,
                'assigned_admin_name' => $conversation->assignedAdmin?->name ?? $user->name,
            ],
        ]);
    }

    /**
     * Take over conversation by current admin.
     */
    public function takeOver(Request $request): JsonResponse|RedirectResponse
    {
        $publicId = (string) $request->route('publicId');
        $conversation = SupportConversation::where('public_id', $publicId)->firstOrFail();
        $user = $request->user();

        $conversation->update([
            'status' => 'human_active',
            'assigned_admin_id' => $user->id,
        ]);

        rescue(fn () => broadcast(new SupportStatusChanged($conversation))->toOthers(), null, false);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'status' => $conversation->status,
                'assigned_admin_id' => $user->id,
                'assigned_admin_name' => $user->name,
            ]);
        }

        return back();
    }

    /**
     * Return to AI handling (Phase 2 capability).
     */
    public function returnToAi(Request $request): JsonResponse|RedirectResponse
    {
        $publicId = (string) $request->route('publicId');
        $conversation = SupportConversation::where('public_id', $publicId)->firstOrFail();

        $conversation->update([
            'status' => 'ai',
            'assigned_admin_id' => null,
        ]);

        rescue(fn () => broadcast(new SupportStatusChanged($conversation))->toOthers(), null, false);

        $latestMessage = $conversation->messages()->latest('id')->first();
        if ($latestMessage && in_array($latestMessage->sender_type, ['visitor', 'user'], true)) {
            ProcessSupportAiReply::dispatchAfterResponse($conversation->id);
        }

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'status' => 'ai',
            ]);
        }

        return back();
    }

    /**
     * Close a conversation from super admin.
     */
    public function close(Request $request): JsonResponse|RedirectResponse
    {
        $publicId = (string) $request->route('publicId');
        $conversation = SupportConversation::where('public_id', $publicId)->firstOrFail();

        $conversation->update([
            'status' => 'closed',
            'closed_at' => now(),
        ]);

        $closeMsg = SupportMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'system',
            'body' => 'This support chat has been closed by MedVisit Support.',
        ]);

        rescue(fn () => broadcast(new SupportMessageSent($conversation, $closeMsg))->toOthers(), null, false);
        rescue(fn () => broadcast(new SupportStatusChanged($conversation))->toOthers(), null, false);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'status' => 'closed',
            ]);
        }

        return back();
    }

    /**
     * Store new canned reply.
     */
    public function storeCannedReply(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $reply = SupportCannedReply::create($validated);

        return response()->json(['reply' => $reply], 201);
    }

    /**
     * Update an existing canned reply.
     */
    public function updateCannedReply(Request $request): JsonResponse
    {
        $replyParam = $request->route('reply');
        $reply = $replyParam instanceof SupportCannedReply ? $replyParam : SupportCannedReply::findOrFail($replyParam);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string', 'max:2000'],
        ]);

        $reply->update($validated);

        return response()->json(['reply' => $reply]);
    }

    /**
     * Delete a canned reply.
     */
    public function destroyCannedReply(Request $request): JsonResponse
    {
        $replyParam = $request->route('reply');
        $reply = $replyParam instanceof SupportCannedReply ? $replyParam : SupportCannedReply::findOrFail($replyParam);

        $reply->delete();

        return response()->json(['success' => true]);
    }

    /**
     * Update support settings (business hours and offline message).
     */
    public function updateSettings(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'business_hours_days' => ['required', 'array'],
            'business_hours_start' => ['required', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'business_hours_end' => ['required', 'string', 'regex:/^\d{2}:\d{2}$/'],
            'business_hours_timezone' => ['required', 'string'],
            'offline_message' => ['required', 'string', 'max:1000'],
            'response_time_text' => ['required', 'string', 'max:150'],
        ]);

        foreach ($validated as $key => $val) {
            PlatformSetting::updateOrCreate(
                ['key' => 'support.'.$key],
                ['value' => $val, 'group' => 'support']
            );
        }

        $this->settingsService->clearCache();

        return redirect()->back()->with('success', 'Support settings updated successfully.');
    }
}
