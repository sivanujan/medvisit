<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class SupportChatService
{
    public function __construct(
        protected PlatformSettingsService $settingsService,
        protected TurnstileService $turnstileService,
    ) {}

    /**
     * Check if support is currently within business hours (Asia/Colombo).
     */
    public function isOnline(): bool
    {
        $settings = $this->settingsService->all();
        $tz = (string) ($settings['support.business_hours_timezone'] ?? 'Asia/Colombo');
        $now = Carbon::now($tz);

        $days = (array) ($settings['support.business_hours_days'] ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']);
        $currentDay = strtolower($now->englishDayOfWeek);

        if (! in_array($currentDay, array_map('strtolower', $days), true)) {
            return false;
        }

        $start = (string) ($settings['support.business_hours_start'] ?? '08:30');
        $end = (string) ($settings['support.business_hours_end'] ?? '18:00');

        $currentTime = $now->format('H:i');

        return $currentTime >= $start && $currentTime <= $end;
    }

    /**
     * Get public support configuration (business hours, response time, online status).
     *
     * @return array<string, mixed>
     */
    public function getPublicStatus(): array
    {
        $settings = $this->settingsService->all();

        return [
            'is_online' => $this->isOnline(),
            'response_time_text' => (string) ($settings['support.response_time_text'] ?? 'Usually replies within a few hours'),
            'offline_message' => (string) ($settings['support.offline_message'] ?? 'Our team is currently offline. Please leave your message and email, and we will reply as soon as business hours resume.'),
            'business_hours' => [
                'days' => $settings['support.business_hours_days'] ?? ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
                'start' => $settings['support.business_hours_start'] ?? '08:30',
                'end' => $settings['support.business_hours_end'] ?? '18:00',
                'timezone' => $settings['support.business_hours_timezone'] ?? 'Asia/Colombo',
            ],
            'turnstile_site_key' => config('services.turnstile.site_key'),
        ];
    }

    /**
     * Rate limit: max 5 new conversations/hour per IP.
     */
    public function canStartConversation(string $ip): bool
    {
        $key = 'support_new_conv:'.$ip;

        if (RateLimiter::tooManyAttempts($key, 5)) {
            return false;
        }

        RateLimiter::hit($key, 3600);

        return true;
    }

    /**
     * Rate limit: max 20 messages/min per conversation.
     */
    public function canSendMessage(string $conversationId): bool
    {
        $key = 'support_msg:'.$conversationId;

        if (RateLimiter::tooManyAttempts($key, 20)) {
            return false;
        }

        RateLimiter::hit($key, 60);

        return true;
    }

    /**
     * Authorize access to a conversation.
     */
    public function authorizeConversation(SupportConversation $conversation, ?User $user, ?string $visitorToken): bool
    {
        // 1. Super admin has access to all conversations
        if ($user && $user->hasRole('super_admin')) {
            return true;
        }

        // 2. Clinic user matches tenant_id and user_id
        if ($user && $conversation->user_id && (int) $conversation->user_id === (int) $user->id) {
            $effectiveTenantId = $user->tenant_id ?? (function_exists('tenant') && tenant('id') ? tenant('id') : null);
            if ($conversation->tenant_id && $effectiveTenantId && $conversation->tenant_id === $effectiveTenantId) {
                return true;
            }
            if (empty($conversation->tenant_id)) {
                return true;
            }
        }

        // 3. Guest visitor matches visitor_token
        if ($conversation->isGuest() && ! empty($visitorToken)) {
            return $conversation->verifyVisitorToken($visitorToken);
        }

        return false;
    }

    /**
     * Start a new conversation for a guest visitor.
     *
     * @param  array{name: string, email: string, phone?: string|null, message: string, turnstile_token?: string|null}  $data
     * @return array{conversation: SupportConversation, visitor_token: string, message: SupportMessage}
     */
    public function startGuestConversation(array $data, Request $request): array
    {
        $token = Str::random(40);
        $hashedToken = hash('sha256', $token);

        $conversation = SupportConversation::create([
            'channel' => 'website',
            'visitor_name' => strip_tags(trim($data['name'])),
            'visitor_email' => strtolower(trim($data['email'])),
            'visitor_phone' => ! empty($data['phone']) ? trim($data['phone']) : null,
            'visitor_token' => $hashedToken,
            'status' => 'ai',
            'last_message_at' => now(),
            'meta' => [
                'page_url' => $request->header('Referer') ?: $request->input('page_url'),
                'user_agent' => $request->userAgent(),
                'ip' => $request->ip(),
                'locale' => app()->getLocale(),
            ],
        ]);

        $message = SupportMessage::create([
            'conversation_id' => $conversation->id,
            'sender_type' => 'visitor',
            'sender_id' => null,
            'body' => mb_substr(strip_tags(trim($data['message'])), 0, 2000),
        ]);

        return [
            'conversation' => $conversation,
            'visitor_token' => $token,
            'message' => $message,
        ];
    }

    /**
     * Start or retrieve an open conversation for a logged-in clinic user.
     */
    public function getOrStartClinicConversation(User $user, Request $request): SupportConversation
    {
        // Find existing open conversation for this clinic user
        $conversation = SupportConversation::where('tenant_id', $user->tenant_id)
            ->where('user_id', $user->id)
            ->where('status', '!=', 'closed')
            ->latest('last_message_at')
            ->first();

        if ($conversation) {
            return $conversation;
        }

        return SupportConversation::create([
            'channel' => 'dashboard',
            'tenant_id' => $user->tenant_id,
            'user_id' => $user->id,
            'visitor_name' => $user->name,
            'visitor_email' => $user->email,
            'status' => 'ai',
            'last_message_at' => now(),
            'meta' => [
                'page_url' => $request->header('Referer') ?: $request->input('page_url'),
                'user_agent' => $request->userAgent(),
                'role' => $user->roles->pluck('name')->first() ?? 'staff',
            ],
        ]);
    }
}
