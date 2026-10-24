<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Events\SupportMessageSent;
use App\Events\SupportStatusChanged;
use App\Events\SupportTyping;
use App\Models\SupportConversation;
use App\Models\SupportMessage;
use App\Services\SupportAiService;
use App\Services\TelegramNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessSupportAiReply implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 2;

    public int $timeout = 60;

    public function __construct(
        public int $conversationId,
    ) {}

    public function handle(SupportAiService $aiService, TelegramNotificationService $telegramService): void
    {
        $conversation = SupportConversation::find($this->conversationId);
        if (! $conversation) {
            return;
        }

        // Only reply if still in AI mode and not closed
        if ($conversation->status !== 'ai' || $conversation->isClosed()) {
            Log::info("Support AI skipped for conv #{$conversation->id}: status is {$conversation->status}");

            return;
        }

        // Broadcast typing indicator
        rescue(fn () => broadcast(new SupportTyping($conversation, 'ai', true))->toOthers(), null, false);

        try {
            $result = $aiService->generateReply($conversation);

            // Re-check status before saving in case an admin took over in the meantime
            $conversation->refresh();
            if ($conversation->status !== 'ai' || $conversation->isClosed()) {
                return;
            }

            // Create AI response message
            $message = SupportMessage::create([
                'conversation_id' => $conversation->id,
                'sender_type' => 'ai',
                'sender_id' => null,
                'body' => $result['content'],
            ]);

            $conversation->update([
                'last_message_at' => now(),
            ]);

            rescue(fn () => broadcast(new SupportMessageSent($conversation, $message))->toOthers(), null, false);

            // Handle handoff if triggered
            if ($result['needs_handoff']) {
                $conversation->update([
                    'status' => 'waiting_human',
                ]);

                rescue(fn () => broadcast(new SupportStatusChanged($conversation, 'waiting_human', null))->toOthers(), null, false);

                // Dispatch Telegram alert to platform owner
                $telegramService->sendHandoffAlert($conversation, $message, $result['handoff_reason'] ?? 'AI escalation');
            }
        } catch (\Throwable $e) {
            Log::error("Error processing AI reply for conversation #{$this->conversationId}: ".$e->getMessage());
        } finally {
            // Turn off typing indicator
            rescue(fn () => broadcast(new SupportTyping($conversation, 'ai', false))->toOthers(), null, false);
        }
    }
}
