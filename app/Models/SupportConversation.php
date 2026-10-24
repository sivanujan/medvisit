<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class SupportConversation extends Model
{
    use HasFactory;

    protected $table = 'support_conversations';

    protected $fillable = [
        'public_id',
        'channel',
        'tenant_id',
        'user_id',
        'visitor_name',
        'visitor_email',
        'visitor_phone',
        'visitor_token',
        'status',
        'assigned_admin_id',
        'last_message_at',
        'closed_at',
        'rating',
        'rating_comment',
        'meta',
    ];

    protected $casts = [
        'meta' => 'array',
        'last_message_at' => 'datetime',
        'closed_at' => 'datetime',
        'rating' => 'integer',
    ];

    protected static function booted(): void
    {
        static::creating(function (SupportConversation $model): void {
            if (empty($model->public_id)) {
                $model->public_id = (string) Str::ulid();
            }
        });
    }

    /**
     * Get all messages in this conversation.
     *
     * @return HasMany<SupportMessage, $this>
     */
    public function messages(): HasMany
    {
        return $this->hasMany(SupportMessage::class, 'conversation_id')->orderBy('created_at', 'asc');
    }

    /**
     * Associated clinic tenant (central relation, not tenant scoped).
     *
     * @return BelongsTo<Tenant, $this>
     */
    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Associated clinic user (if logged in).
     *
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Assigned super admin handling the thread.
     *
     * @return BelongsTo<User, $this>
     */
    public function assignedAdmin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_admin_id');
    }

    /**
     * Check if the visitor token matches.
     */
    public function verifyVisitorToken(?string $plainToken): bool
    {
        if (empty($plainToken) || empty($this->visitor_token)) {
            return false;
        }

        return hash_equals($this->visitor_token, hash('sha256', $plainToken));
    }

    /**
     * Whether this conversation is closed.
     */
    public function isClosed(): bool
    {
        return $this->status === 'closed';
    }

    /**
     * Check if conversation belongs to a guest visitor.
     */
    public function isGuest(): bool
    {
        return empty($this->user_id);
    }

    /**
     * Check if conversation originated from the clinic dashboard.
     */
    public function isDashboard(): bool
    {
        return $this->channel === 'dashboard' || ! empty($this->tenant_id);
    }

    /**
     * Check if conversation originated from the public marketing website.
     */
    public function isWebsite(): bool
    {
        return $this->channel === 'website';
    }
}
