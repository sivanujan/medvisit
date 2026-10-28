<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\SupportConversation;
use App\Models\SupportMessage;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SupportMessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public SupportConversation $conversation,
        public SupportMessage $message,
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('support.conversation.'.$this->conversation->public_id),
            new PrivateChannel('support.inbox'),
        ];
    }

    /**
     * Data to broadcast with the event.
     *
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $senderName = match ($this->message->sender_type) {
            'visitor' => $this->conversation->visitor_name ?? 'Visitor',
            'user' => $this->conversation->user?->name ?? $this->conversation->visitor_name ?? 'Clinic Staff',
            'admin' => $this->message->sender?->name ?? 'MedVisit Support',
            'ai' => 'MedVisit Assistant',
            'system' => 'System',
            default => 'Support',
        };

        return [
            'conversation_public_id' => $this->conversation->public_id,
            'message' => [
                'id' => $this->message->id,
                'conversation_id' => $this->message->conversation_id,
                'sender_type' => $this->message->sender_type,
                'sender_id' => $this->message->sender_id,
                'sender_name' => $senderName,
                'body' => $this->message->body,
                'read_at' => $this->message->read_at?->toIso8601String(),
                'created_at' => $this->message->created_at->toIso8601String(),
            ],
            'conversation_status' => $this->conversation->status,
            'last_message_at' => $this->conversation->last_message_at?->toIso8601String(),
        ];
    }
}
