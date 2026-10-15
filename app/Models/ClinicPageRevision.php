<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicPageRevision extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'page_id',
        'user_id',
        'version_number',
        'summary',
        'content_json',
        'html',
        'css',
    ];

    protected $casts = [
        'version_number' => 'integer',
        'content_json' => 'array',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function page(): BelongsTo
    {
        return $this->belongsTo(ClinicPage::class, 'page_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
