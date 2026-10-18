<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Http\Requests\Tenant\StoreClinicPageRequest;
use App\Http\Requests\Tenant\UpdateClinicPageRequest;
use App\Models\ClinicPage;
use App\Support\HtmlSanitizer;
use App\Support\PageSlug;
use Illuminate\Http\JsonResponse;

class ClinicPageController extends Controller
{
    public function index(): JsonResponse
    {
        $pages = ClinicPage::forTenant((string) tenant('id'))
            ->orderByDesc('is_homepage')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(['pages' => $pages->map(fn (ClinicPage $p) => $this->present($p))->values()]);
    }

    public function trash(): JsonResponse
    {
        $pages = ClinicPage::forTenant((string) tenant('id'))
            ->onlyTrashed()
            ->orderByDesc('deleted_at')
            ->get();

        return response()->json(['pages' => $pages->map(fn (ClinicPage $p) => $this->present($p))->values()]);
    }

    public function store(StoreClinicPageRequest $request): JsonResponse
    {
        $tenant = tenant();
        $data = $request->validated();
        $source = $data['source'];

        $attributes = [
            'tenant_id' => $tenant->id,
            'title' => $data['title'],
            'slug' => $data['slug'],
            'theme_preset' => $tenant->website_theme ?? 'medvisit-teal',
        ];

        if (str_starts_with($source, 'copy:')) {
            $original = ClinicPage::forTenant($tenant->id)->where('id', (int) substr($source, 5))->first();
            if (! $original) {
                return response()->json([
                    'message' => 'The page to copy was not found.',
                    'errors' => ['source' => ['The page to copy was not found.']],
                ], 422);
            }
            $attributes += [
                'html' => $original->html,
                'css' => $original->css,
                'content_json' => $original->content_json,
            ];
        } elseif (str_starts_with($source, 'template:')) {
            $attributes['html'] = HtmlSanitizer::sanitize($data['html'] ?? '');
        }

        $page = ClinicPage::create($attributes);

        return response()->json($this->present($page->refresh()), 201);
    }

    public function duplicate(ClinicPage $page): JsonResponse
    {
        $this->authorizeTenant($page);

        $copy = ClinicPage::create([
            'tenant_id' => $page->tenant_id,
            'title' => $page->title.' (Copy)',
            'slug' => PageSlug::nextAvailable($page->tenant_id, $page->slug),
            'html' => $page->html,
            'css' => $page->css,
            'content_json' => $page->content_json,
            'theme_preset' => $page->theme_preset,
            'seo_title' => $page->seo_title,
            'seo_description' => $page->seo_description,
        ]);

        return response()->json($this->present($copy->refresh()), 201);
    }

    public function update(UpdateClinicPageRequest $request, ClinicPage $page): JsonResponse
    {
        $this->authorizeTenant($page);

        $page->update($request->validated());

        return response()->json($this->present($page->refresh()));
    }

    public function destroy(ClinicPage $page): JsonResponse
    {
        $this->authorizeTenant($page);

        if ($page->is_homepage) {
            return response()->json(['message' => 'The homepage cannot be deleted. Set another page as homepage first.'], 422);
        }

        $page->delete();

        return response()->json(['ok' => true]);
    }

    public function restore(int $pageId): JsonResponse
    {
        $page = ClinicPage::withTrashed()->findOrFail($pageId);
        $this->authorizeTenant($page);

        $page->restore();

        return response()->json($this->present($page->refresh()));
    }

    public function homepage(ClinicPage $page): JsonResponse
    {
        $this->authorizeTenant($page);

        $page->makeHomepage();

        return response()->json($this->present($page->refresh()));
    }

    private function authorizeTenant(ClinicPage $page): void
    {
        abort_if($page->tenant_id !== tenant('id'), 404);
    }

    /**
     * @return array<string, mixed>
     */
    private function present(ClinicPage $page): array
    {
        return [
            'id' => $page->id,
            'title' => $page->title,
            'slug' => $page->slug,
            'url' => $page->publicUrl(),
            'is_homepage' => $page->is_homepage,
            'is_published' => $page->is_published,
            'has_unpublished_changes' => $page->hasUnpublishedChanges(),
            'updated_at' => $page->updated_at?->toIso8601String(),
            'sort_order' => $page->sort_order,
        ];
    }
}
