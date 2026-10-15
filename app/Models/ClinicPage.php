<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ClinicPage extends Model
{
    use HasFactory;

    protected $fillable = [
        'tenant_id',
        'slug',
        'title',
        'schema_version',
        'content_json',
        'html',
        'css',
        'is_published',
        'published_at',
        'published_html',
        'published_css',
        'published_json',
        'seo_title',
        'seo_description',
        'theme_preset',
    ];

    protected $casts = [
        'schema_version' => 'integer',
        'content_json' => 'array',
        'published_json' => 'array',
        'is_published' => 'boolean',
        'published_at' => 'datetime',
    ];

    public function tenant(): BelongsTo
    {
        return $this->belongsTo(Tenant::class, 'tenant_id');
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(ClinicPageRevision::class, 'page_id')->orderByDesc('version_number');
    }

    /**
     * Snapshot current state into a new revision.
     */
    public function createRevision(?int $userId = null, ?string $summary = null): ClinicPageRevision
    {
        $lastVersion = $this->revisions()->max('version_number') ?? 0;
        $nextVersion = $lastVersion + 1;

        return $this->revisions()->create([
            'tenant_id' => $this->tenant_id,
            'user_id' => $userId,
            'version_number' => $nextVersion,
            'summary' => $summary ?: "Revision #{$nextVersion}",
            'content_json' => $this->content_json,
            'html' => $this->html,
            'css' => $this->css,
        ]);
    }

    /**
     * Revert page content to a specific revision.
     */
    public function revertToRevision(ClinicPageRevision $revision): void
    {
        $this->update([
            'content_json' => $revision->content_json,
            'html' => $revision->html,
            'css' => $revision->css,
        ]);

        $this->createRevision(
            userId: auth()->id(),
            summary: "Restored from Revision #{$revision->version_number}"
        );
    }
}
