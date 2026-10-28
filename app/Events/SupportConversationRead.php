<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\SupportConversation;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SupportConversationRead implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public SupportConversation $conversation,
        public string $readBy = 'admin',
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
        return [
            'conversation_public_id' => $this->conversation->public_id,
            'read_by' => $this->readBy,
            'read_at' => now()->toIso8601String(),
        ];
    }
}
