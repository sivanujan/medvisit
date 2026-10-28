<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SupportMessage extends Model
{
    use HasFactory;

    protected $table = 'support_messages';

    protected $fillable = [
        'conversation_id',
        'sender_type',
        'sender_id',
        'body',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    /**
     * Associated support conversation.
     *
     * @return BelongsTo<SupportConversation, $this>
     */
    public function conversation(): BelongsTo
    {
        return $this->belongsTo(SupportConversation::class, 'conversation_id');
    }

    /**
     * Associated sender if user or admin.
     *
     * @return BelongsTo<User, $this>
     */
    public function sender(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sender_id');
    }
}
