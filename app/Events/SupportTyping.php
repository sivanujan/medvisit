<?php

declare(strict_types=1);

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class SupportTyping implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public string $publicId,
        public string $senderType,
        public string $senderName,
        public bool $isTyping = true,
    ) {}

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('support.conversation.'.$this->publicId),
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
            'conversation_public_id' => $this->publicId,
            'sender_type' => $this->senderType,
            'sender_name' => $this->senderName,
            'is_typing' => $this->isTyping,
        ];
    }
}
