<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class ClinicPage extends Model
{
    use HasFactory;
    use SoftDeletes;

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
        'is_homepage',
        'sort_order',
    ];

    protected $casts = [
        'schema_version' => 'integer',
        'content_json' => 'array',
        'published_json' => 'array',
        'is_published' => 'boolean',
        'published_at' => 'datetime',
        'is_homepage' => 'boolean',
        'sort_order' => 'integer',
    ];

    public function scopeForTenant(Builder $query, string $tenantId): Builder
    {
        return $query->where('tenant_id', $tenantId);
    }

    public static function homepageFor(string $tenantId): ?self
    {
        return static::forTenant($tenantId)->where('is_homepage', true)->first();
    }

    public function hasUnpublishedChanges(): bool
    {
        return $this->is_published
            && $this->published_at !== null
            && $this->updated_at !== null
            && $this->updated_at->gt($this->published_at);
    }

    public function publicUrl(): string
    {
        return $this->is_homepage ? '/' : '/p/'.$this->slug;
    }

    public function makeHomepage(): void
    {
        DB::transaction(function () {
            static::forTenant($this->tenant_id)
                ->where('id', '!=', $this->id)
                ->where('is_homepage', true)
                ->update(['is_homepage' => false]);

            $this->forceFill(['is_homepage' => true])->save();
        });
    }

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
