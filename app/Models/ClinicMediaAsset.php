<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClinicMediaAsset extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'filename',
        'original_name',
        'disk',
        'path',
        'url',
        'mime_type',
        'size',
        'dimensions',
        'alt_text',
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    /**
     * Human-readable file size format.
     */
    public function getFormattedSizeAttribute(): string
    {
        $bytes = $this->size;
        if ($bytes >= 1048576) {
            return number_format($bytes / 1048576, 1).' MB';
        }
        if ($bytes >= 1024) {
            return number_format($bytes / 1024, 1).' KB';
        }

        return $bytes.' B';
    }
}
