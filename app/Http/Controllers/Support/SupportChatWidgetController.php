<?php

declare(strict_types=1);

namespace App\Http\Controllers\Support;

use App\Events\SupportConversationRead;
use App\Events\SupportMessageSent;
use App\Events\SupportStatusChanged;
use App\Events\SupportTyping;
use App\Http\Controllers\Controller;
use App\Jobs\ProcessSupportAiReply;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Services\SupportChatService;
use App\Services\TurnstileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cookie;

class SupportChatWidgetController extends Controller
{
    public function __construct(
        protected SupportChatService $chatService,
        protected TurnstileService $turnstileService,
    ) {}

    /**
     * Public chat widget status & business hours.
     */
    public function status(Request $request): JsonResponse
    {
        $status = $this->chatService->getPublicStatus();
        $user = $request->user();
        $activeConversation = null;

        if ($user && $user->tenant_id) {
            $activeConversation = SupportConversation::where('tenant_id', $user->tenant_id)
                ->where('user_id', $user->id)
                ->where('status', '!=', 'closed')
                ->latest('last_message_at')
                ->first(['public_id', 'status', 'last_message_at']);
        } else {
            $visitorToken = $request->cookie('support_visitor_token')
                ?: $request->header('X-Visitor-Token');
            $publicId = $request->input('conversation_id');

            if ($publicId && $visitorToken) {
                $conv = SupportConversation::where('public_id', $publicId)->first();
                if ($conv && $conv->verifyVisitorToken($visitorToken) && ! $conv->isClosed()) {
                    $activeConversation = [
                        'public_id' => $conv->public_id,
                        'status' => $conv->status,
                        'last_message_at' => $conv->last_message_at?->toIso8601String(),
                    ];
                }
            }
        }

        return response()->json([
            ...$status,
            'active_conversation' => $activeConversation,
        ]);
    }

    /**
     * Start a new support conversation (guest or clinic user).
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        // 1. Clinic user (logged-in on tenant domain or dashboard)
        if ($user && $user->tenant_id) {
            $validated = $request->validate([
                'message' => ['required', 'string', 'max:2000'],
            ]);

            $conversation = $this->chatService->getOrStartClinicConversation($user, $request);

            if ($conversation->isClosed()) {
                return response()->json(['error' => 'This conversation has been closed.'], 422);
            }

            if (! $this->chatService->canSendMessage((string) $conversation->id)) {
                return response()->json(['error' => 'Rate limit exceeded. Please wait a moment before sending more messages.'], 429);
            }

            $message = SupportMessage::create([
                'conversation_id' => $conversation->id,
                'sender_type' => 'user',
                'sender_id' => $user->id,
                'body' => mb_substr(strip_tags(trim($validated['message'])), 0, 2000),
            ]);

            $conversation->update([
                'last_message_at' => now(),
                'status' => $conversation->status === 'closed' ? 'ai' : $conversation->status,
            ]);

            rescue(fn () => broadcast(new SupportMessageSent($conversation, $message))->toOthers(), null, false);

            $this->dispatchAiReply($conversation);

            return response()->json([
                'conversation' => $this->formatConversation($conversation),
                'messages' => [$this->formatMessage($message, $conversation)],
            ]);
        }

        // 2. Guest visitor (central marketing page)
        $ip = (string) $request->ip();
        if (! $this->chatService->canStartConversation($ip)) {
            return response()->json(['error' => 'Too many new conversations created. Please wait an hour before starting a new chat.'], 429);
        }

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
            'message' => ['required', 'string', 'max:2000'],
            'turnstile_token' => ['nullable', 'string'],
        ]);

        if (! $this->turnstileService->verify($validated['turnstile_token'] ?? null, $ip)) {
            return response()->json(['error' => 'Bot challenge verification failed. Please refresh and try again.'], 422);
        }

        $result = $this->chatService->startGuestConversation($validated, $request);
        $conversation = $result['conversation'];
        $plainToken = $result['visitor_token'];
        $message = $result['message'];

        rescue(fn () => broadcast(new SupportMessageSent($conversation, $message))->toOthers(), null, false);

        $this->dispatchAiReply($conversation);

        // 30 days secure cookie
        $cookie = cookie(
            'support_visitor_token',
            $plainToken,
            43200, // minutes
            '/',
            null,
            request()->isSecure(),
            true, // HttpOnly
            false,
            'Lax'
        );

        return response()->json([
            'conversation' => $this->formatConversation($conversation),
            'visitor_token' => $plainToken,
            'messages' => [$this->formatMessage($message, $conversation)],
        ])->withCookie($cookie);
    }

    /**
     * Show conversation details and messages.
     */
    public function show(Request $request): JsonResponse
    {
        $publicId = (string) $request->route('publicId');
        $conversation = SupportConversation::where('public_id', $publicId)->firstOrFail();
        $user = $request->user();
        $visitorToken = $request->cookie('support_visitor_token')
            ?: $request->header('X-Visitor-Token')
            ?: $request->input('visitor_token');

        if (! $this->chatService->authorizeConversation($conversation, $user, $visitorToken)) {
            return response()->json(['error' => 'Unauthorized conversation access.'], 403);
        }

        $messages = $conversation->messages()->with('sender')->get()->map(
            fn (SupportMessage $m) => $this->formatMessage($m, $conversation)
        );

        return response()->json([
            'conversation' => $this->formatConversation($conversation),
            'messages' => $messages,
        ]);
    }

    /**
     * Send a message to an existing conversation.
     */
    public function sendMessage(Request $request): JsonResponse
    {
        $publicId = (string) $request->route('publicId');
        $conversation = SupportConversation::where('public_id', $publicId)->firstOrFail();
        $user = $request->user();
        $visitorToken = $request->cookie('support_visitor_token')
            ?: $request->header('X-Visitor-Token')
            ?: $request->input('visitor_token');

        if (! $this->chatService->authorizeConversation($conversation, $user, $visitorToken)) {
            return response()->json(['error' => 'Unauthorized conversation access.'], 403);
        }

        if ($conversation->isClosed()) {
            return response()->json(['error' => 'This conversation has been closed.'], 422);
        }

        if (! $this->chatService->canSendMessage((string) $conversation->id)) {
            return response()->json(['error' => 'Rate limit exceeded (max 20 messages/min). Please slow down.'], 429);
        }

        $validated = $request->validate([
            'body' => ['required_without:message', 'nullable', 'string', 'max:2000'],
            'message' => ['required_without:body', 'nullable', 'string', 'max:2000'],
        ]);

        $bodyText = $validated['body'] ?? $validated['message'] ?? '';

        $senderType = 'visitor';
        $senderId = null;

        if ($user && $user->hasRole('super_admin')) {
            $senderType = 'admin';
            $senderId = $user->id;
        } elseif ($user && $user->tenant_id) {
            $senderType = 'user';
            $senderId = $user->id;
        }

        $message = SupportMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => $senderType,
            'sender_id' => $senderId,
            'body' => mb_substr(strip_tags(trim($bodyText)), 0, 2000),
        ]);

        $conversation->update([
            'last_message_at' => now(),
            'status' => $senderType === 'admin' ? $conversation->status : ($conversation->status === 'closed' ? 'ai' : $conversation->status),
        ]);

        rescue(fn () => broadcast(new SupportMessageSent($conversation, $message))->toOthers(), null, false);

        if ($senderType !== 'admin') {
            $this->dispatchAiReply($conversation);
        }

        return response()->json([
            'message' => $this->formatMessage($message, $conversation),
            'conversation' => $this->formatConversation($conversation),
        ]);
    }

    /**
     * Mark conversation messages as read.
     */
    public function markRead(Request $request): JsonResponse
    {
        $publicId = (string) $request->route('publicId');
        $conversation = SupportConversation::where('public_id', $publicId)->firstOrFail();
        $user = $request->user();
        $visitorToken = $request->cookie('support_visitor_token')
            ?: $request->header('X-Visitor-Token')
            ?: $request->input('visitor_token');

        if (! $this->chatService->authorizeConversation($conversation, $user, $visitorToken)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $readBy = 'visitor';
        if ($user && $user->hasRole('super_admin')) {
            $readBy = 'admin';
            $conversation->messages()
                ->whereIn('sender_type', ['visitor', 'user'])
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        } else {
            $readBy = $user ? 'user' : 'visitor';
            $conversation->messages()
                ->whereIn('sender_type', ['admin', 'ai', 'system'])
                ->whereNull('read_at')
                ->update(['read_at' => now()]);
        }

        rescue(fn () => broadcast(new SupportConversationRead($conversation, $readBy))->toOthers(), null, false);

        return response()->json(['success' => true]);
    }

    /**
     * Send typing indicator.
     */
    public function typing(Request $request): JsonResponse
    {
        $publicId = (string) $request->route('publicId');
        $conversation = SupportConversation::where('public_id', $publicId)->firstOrFail();
        $user = $request->user();
        $visitorToken = $request->cookie('support_visitor_token')
            ?: $request->header('X-Visitor-Token')
            ?: $request->input('visitor_token');

        if (! $this->chatService->authorizeConversation($conversation, $user, $visitorToken)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $senderType = 'visitor';
        $senderName = $conversation->visitor_name ?? 'Visitor';

        if ($user && $user->hasRole('super_admin')) {
            $senderType = 'admin';
            $senderName = $user->name;
        } elseif ($user) {
            $senderType = 'user';
            $senderName = $user->name;
        }

        $isTyping = (bool) $request->input('is_typing', true);

        rescue(fn () => broadcast(new SupportTyping($publicId, $senderType, $senderName, $isTyping))->toOthers(), null, false);

        return response()->json(['success' => true]);
    }

    /**
     * Close a conversation with optional rating and feedback comment.
     */
    public function close(Request $request): JsonResponse
    {
        $publicId = (string) $request->route('publicId');
        $conversation = SupportConversation::where('public_id', $publicId)->firstOrFail();
        $user = $request->user();
        $visitorToken = $request->cookie('support_visitor_token')
            ?: $request->header('X-Visitor-Token')
            ?: $request->input('visitor_token');

        if (! $this->chatService->authorizeConversation($conversation, $user, $visitorToken)) {
            return response()->json(['error' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'rating' => ['nullable', 'integer', 'min:1', 'max:5'],
            'rating_comment' => ['nullable', 'string', 'max:1000'],
        ]);

        $conversation->update([
            'status' => 'closed',
            'closed_at' => now(),
            'rating' => $validated['rating'] ?? $conversation->rating,
            'rating_comment' => $validated['rating_comment'] ?? $conversation->rating_comment,
        ]);

        $closeMsg = SupportMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'system',
            'body' => 'This support chat has been closed. Thank you for contacting MedVisit!',
        ]);

        rescue(fn () => broadcast(new SupportMessageSent($conversation, $closeMsg))->toOthers(), null, false);
        rescue(fn () => broadcast(new SupportStatusChanged($conversation))->toOthers(), null, false);

        return response()->json([
            'conversation' => $this->formatConversation($conversation),
            'message' => $this->formatMessage($closeMsg, $conversation),
        ]);
    }

    /**
     * Format a conversation for JSON response.
     *
     * @return array<string, mixed>
     */
    protected function formatConversation(SupportConversation $conv): array
    {
        return [
            'id' => $conv->id,
            'public_id' => $conv->public_id,
            'channel' => $conv->channel,
            'status' => $conv->status,
            'visitor_name' => $conv->visitor_name,
            'visitor_email' => $conv->visitor_email,
            'visitor_phone' => $conv->visitor_phone,
            'assigned_admin_name' => $conv->assignedAdmin?->name,
            'last_message_at' => $conv->last_message_at?->toIso8601String(),
            'closed_at' => $conv->closed_at?->toIso8601String(),
            'rating' => $conv->rating,
            'rating_comment' => $conv->rating_comment,
            'created_at' => $conv->created_at->toIso8601String(),
        ];
    }

    /**
     * Format a message for JSON response.
     *
     * @return array<string, mixed>
     */
    protected function formatMessage(SupportMessage $msg, SupportConversation $conv): array
    {
        $senderName = match ($msg->sender_type) {
            'visitor' => $conv->visitor_name ?? 'Visitor',
            'user' => $conv->user?->name ?? $conv->visitor_name ?? 'Clinic Staff',
            'admin' => $msg->sender?->name ?? 'MedVisit Support',
            'ai' => 'MedVisit Assistant',
            'system' => 'System',
            default => 'Support',
        };

        return [
            'id' => $msg->id,
            'conversation_id' => $msg->conversation_id,
            'sender_type' => $msg->sender_type,
            'sender_id' => $msg->sender_id,
            'sender_name' => $senderName,
            'body' => $msg->body,
            'read_at' => $msg->read_at?->toIso8601String(),
            'created_at' => $msg->created_at->toIso8601String(),
        ];
    }

    /**
     * Dispatch AI reply job safely according to environment.
     */
    protected function dispatchAiReply(SupportConversation $conversation): void
    {
        if ($conversation->status !== 'ai' || $conversation->isClosed()) {
            return;
        }

        if (app()->runningUnitTests()) {
            // Keep automated unit/feature tests fast and isolated from external network APIs
            return;
        }

        if (config('queue.default') === 'sync' || app()->environment('local')) {
            ProcessSupportAiReply::dispatchAfterResponse($conversation->id);
        } else {
            ProcessSupportAiReply::dispatch($conversation->id);
        }
    }
}
