<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\RefundRequest;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramNotificationService
{
    /**
     * Send a notification to Telegram when a support conversation needs human attention.
     */
    public function sendHandoffAlert(SupportConversation $conversation, ?SupportMessage $lastMessage = null, ?string $summary = null): bool
    {
        $botToken = (string) config('services.telegram.bot_token');
        $chatId = (string) config('services.telegram.chat_id');

        if (empty($botToken) || empty($chatId)) {
            Log::info('Telegram notification skipped: missing bot token or chat ID.');

            return false;
        }

        // Rate limit: 1 alert per conversation per 10 minutes
        $cacheKey = 'telegram_support_alert:'.$conversation->id;
        if (Cache::has($cacheKey)) {
            Log::info("Telegram alert throttled for conversation {$conversation->id}");

            return false;
        }

        $from = $conversation->isDashboard()
            ? ($conversation->tenant?->name ?? 'Clinic User').' ('.$conversation->visitor_name.')'
            : ($conversation->visitor_name ?: 'Guest Visitor');

        $channelLabel = ucfirst((string) $conversation->channel);
        $preview = $lastMessage ? mb_substr($lastMessage->body, 0, 200) : 'New conversation requested';
        $topic = $summary ?: 'Assistance requested';
        $inboxUrl = url('/super-admin/support?c='.$conversation->public_id);

        $text = "🚨 *MedVisit Support Alert*\n\n"
            .'*From:* '.self::escapeMarkdown($from).' ('.$channelLabel.")\n"
            .($conversation->visitor_email ? '*Email:* '.self::escapeMarkdown($conversation->visitor_email)."\n" : '')
            .($conversation->visitor_phone ? '*Phone:* '.self::escapeMarkdown($conversation->visitor_phone)."\n" : '')
            .'*Topic:* '.self::escapeMarkdown($topic)."\n"
            .'*User said:* "'.self::escapeMarkdown($preview)."\"\n\n"
            ."*Status:* Waiting for human\n"
            ."👉 [Open in Inbox]({$inboxUrl})";

        try {
            $response = Http::timeout(8)->post("https://api.telegram.org/bot{$botToken}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => 'Markdown',
                'disable_web_page_preview' => true,
            ]);

            if ($response->successful()) {
                Cache::put($cacheKey, true, now()->addMinutes(10));

                return true;
            }

            Log::warning('Telegram send failed: '.$response->body());

            return false;
        } catch (\Throwable $e) {
            Log::error('Telegram alert exception: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Send a notification to Telegram when a new refund request is received.
     */
    public function sendRefundAlert(RefundRequest $refundRequest): bool
    {
        $botToken = (string) config('services.telegram.bot_token');
        $chatId = (string) config('services.telegram.chat_id');

        if (empty($botToken) || empty($chatId)) {
            Log::info('Telegram refund notification skipped: missing bot token or chat ID.');

            return false;
        }

        $clinicName = $refundRequest->tenant?->name ?? 'Clinic';
        $amount = $refundRequest->formatted_requested_amount;
        $reason = ucfirst(str_replace('_', ' ', $refundRequest->reason_type));
        $eligibility = ucfirst(str_replace('_', ' ', $refundRequest->eligibility));
        $reviewUrl = url("/super-admin/refunds/{$refundRequest->id}");

        $text = "💳 *New Refund Request — MedVisit*\n\n"
            .'*Clinic:* '.self::escapeMarkdown($clinicName)."\n"
            .'*Amount:* '.self::escapeMarkdown($amount)."\n"
            .'*Reason:* '.self::escapeMarkdown($reason)."\n"
            .'*System Eligibility:* '.self::escapeMarkdown($eligibility)."\n"
            .'*Reference:* `'.self::escapeMarkdown($refundRequest->public_id)."`\n\n"
            ."👉 [Review in Admin Console]({$reviewUrl})";

        try {
            $response = Http::timeout(8)->post("https://api.telegram.org/bot{$botToken}/sendMessage", [
                'chat_id' => $chatId,
                'text' => $text,
                'parse_mode' => 'Markdown',
                'disable_web_page_preview' => true,
            ]);

            return $response->successful();
        } catch (\Throwable $e) {
            Log::error('Telegram refund alert exception: '.$e->getMessage());

            return false;
        }
    }

    /**
     * Escape special Markdown characters for Telegram Markdown v1.
     */
    protected static function escapeMarkdown(string $text): string
    {
        return str_replace(['*', '_', '`', '['], ['\\*', '\\_', '\\`', '\\['], $text);
    }
}
