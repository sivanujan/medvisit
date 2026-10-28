<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnnouncementRecipient extends Model
{
    use HasUuids;

    protected $fillable = [
        'announcement_id',
        'tenant_id',
        'user_id',
        'email',
        'phone',
        'channel',
        'status',
        'error_reason',
        'sent_at',
        'read_at',
        'dismissed_at',
        'clicked_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'read_at' => 'datetime',
        'dismissed_at' => 'datetime',
        'clicked_at' => 'datetime',
    ];

    public function announcement(): BelongsTo
    {
        return $this->belongsTo(Announcement::class);
    }

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
