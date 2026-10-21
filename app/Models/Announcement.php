<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Announcement extends Model
{
    use HasUuids, SoftDeletes;

    protected $fillable = [
        'title',
        'message',
        'type',
        'cta_label',
        'cta_url',
        'image_path',
        'audience_type',
        'target_clinic_ids',
        'target_plans',
        'target_statuses',
        'target_recipient_roles',
        'channels',
        'banner_start_at',
        'banner_end_at',
        'banner_dismissible',
        'scheduled_at',
        'status',
        'sent_at',
        'created_by',
    ];

    protected $casts = [
        'target_clinic_ids' => 'array',
        'target_plans' => 'array',
        'target_statuses' => 'array',
        'target_recipient_roles' => 'array',
        'channels' => 'array',
        'banner_dismissible' => 'boolean',
        'banner_start_at' => 'datetime',
        'banner_end_at' => 'datetime',
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function recipients(): HasMany
    {
        return $this->hasMany(AnnouncementRecipient::class);
    }
}
