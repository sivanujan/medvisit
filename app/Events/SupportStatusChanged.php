<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\SupportConversation;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SupportStatusChanged implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public SupportConversation $conversation,
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
            'status' => $this->conversation->status,
            'assigned_admin_id' => $this->conversation->assigned_admin_id,
            'assigned_admin_name' => $this->conversation->assignedAdmin?->name,
            'closed_at' => $this->conversation->closed_at?->toIso8601String(),
        ];
    }
}
