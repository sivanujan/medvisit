<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\ClinicMediaAsset;
use App\Models\ClinicPage;
use App\Models\ClinicPageRevision;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\VisitType;
use App\Models\WebsiteTemplate;
use App\Services\FeeResolutionService;
use App\Services\Templates\TemplateService;
use App\Support\ClinicWebsite;
use App\Support\HtmlSanitizer;
use App\Support\SiteKit;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ClinicWebsiteController extends Controller
{
    /**
     * The simple website editor: home page sections, look & feel, extra pages, SEO.
     */
    public function index(Request $request): Response
    {
        $tenant = tenant();
        $sections = ClinicWebsite::draftSections($tenant);
        $homepage = ClinicPage::homepageFor((string) $tenant->id);

        return Inertia::render('Website/Index', [
            'sections' => $sections,
            'look' => ClinicWebsite::draftLook($tenant),
            'status' => $this->statusPayload($tenant, $sections),
            'seo' => [
                'title' => $tenant->seo_title ?: ClinicWebsite::defaultSeoTitle($tenant),
                'description' => $tenant->seo_description ?: ClinicWebsite::defaultSeoDescription($tenant),
                'default_title' => ClinicWebsite::defaultSeoTitle($tenant),
                'default_description' => ClinicWebsite::defaultSeoDescription($tenant),
                'share_image_url' => $tenant->website_share_image,
                'generated_share_image_url' => url('/share-image.png'),
            ],
            'clinic' => [
                'name' => (string) $tenant->name,
                'subdomain' => (string) $tenant->subdomain,
                'site_url' => $tenant->url('/'),
                'display_host' => $tenant->subdomain.'.'.config('medvisit.public_domain', 'medvisit.lk'),
                'phone' => (string) ($tenant->phone ?? ''),
                'address' => (string) ($tenant->address ?? ''),
                'whatsapp' => (string) ($tenant->whatsapp_number ?? ''),
                'logo_url' => $tenant->logo_url,
                'latitude' => $tenant->directory_latitude !== null ? (float) $tenant->directory_latitude : null,
                'longitude' => $tenant->directory_longitude !== null ? (float) $tenant->directory_longitude : null,
            ],
            'counts' => [
                'doctors' => Doctor::where('is_active', true)->count(),
            ],
            'homepageUsesBuilder' => (bool) ($homepage?->published_html),
            'pages' => ClinicPage::forTenant((string) $tenant->id)
                ->where('is_homepage', false)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->map(fn (ClinicPage $p) => $p->toSummaryArray() + ['in_menu' => $this->pageInMenu($tenant, $p)])
                ->values(),
        ]);
    }

    /**
     * Draft autosave. Nothing changes on the live site until Publish.
     */
    public function updateSections(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'sections' => ['required', 'array', 'max:40'],
            'sections.*.id' => ['required', 'string', 'max:64'],
            'sections.*.type' => ['nullable', 'string', 'in:'.implode(',', [...ClinicWebsite::CORE_SECTIONS, ...ClinicWebsite::EXTRA_SECTIONS])],
            'sections.*.enabled' => ['nullable', 'boolean'],
            'look' => ['nullable', 'array'],
        ]);

        $tenant = tenant();
        // validated() keeps only the wildcard-validated keys of each section; use the full input.
        $sections = ClinicWebsite::normalize($this->sanitizeSections((array) $request->input('sections')), $tenant);
        $tenant->website_sections_draft = $sections;
        if (isset($validated['look'])) {
            $tenant->website_look_draft = ClinicWebsite::normalizeLook((array) $request->input('look'), $tenant);
        }
        $tenant->save();

        if (! $request->expectsJson()) {
            return redirect()->back();
        }

        return response()->json([
            'saved_at' => now()->toIso8601String(),
            'status' => $this->statusPayload(Tenant::find($tenant->id), $sections),
        ]);
    }

    /**
     * Publish the draft (or take the site offline). Publishing is blocked only when a
     * blocking checklist item fails (clinic name, phone); other items are warnings.
     */
    public function publish(Request $request): JsonResponse|RedirectResponse
    {
        $validated = $request->validate([
            'published' => ['required', 'boolean'],
        ]);

        $tenant = tenant();

        if (! $validated['published']) {
            $tenant->website_published = false;
            $tenant->save();

            return $request->expectsJson()
                ? response()->json(['status' => $this->statusPayload($tenant, ClinicWebsite::draftSections($tenant))])
                : redirect()->back()->with('success', 'Your website is offline.');
        }

        $checklist = ClinicWebsite::checklist($tenant, ClinicWebsite::draftSections($tenant));
        if (! ClinicWebsite::canPublish($checklist)) {
            $missing = collect($checklist)->filter(fn ($c) => $c['blocking'] && ! $c['ok'])->pluck('label')->implode(' and ');
            $message = 'Add your '.Str::lower($missing).' before publishing.';

            return $request->expectsJson()
                ? response()->json(['message' => $message, 'checklist' => $checklist], 422)
                : redirect()->back()->withErrors(['publish' => $message]);
        }

        ClinicWebsite::publish($tenant);
        // refresh() would skip decoding the tenancy data column, so re-read instead.
        $tenant = Tenant::find($tenant->id);

        return $request->expectsJson()
            ? response()->json(['status' => $this->statusPayload($tenant, ClinicWebsite::draftSections($tenant))])
            : redirect()->back()->with('success', 'Published. Your website is live.');
    }

    /**
     * SEO & sharing (saved straight away; it does not change what visitors see on the page).
     */
    public function updateSeo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'seo_title' => ['nullable', 'string', 'max:70'],
            'seo_description' => ['nullable', 'string', 'max:170'],
            'share_image_url' => ['nullable', 'string', 'max:500'],
        ]);

        $tenant = tenant();
        $tenant->seo_title = $validated['seo_title'] ?: null;
        $tenant->seo_description = $validated['seo_description'] ?: null;
        $tenant->website_share_image = $validated['share_image_url'] ?: null;
        $tenant->save();

        return response()->json(['ok' => true]);
    }

    /**
     * Legacy: theme + SEO in one form (kept for older clients).
     */
    public function updateTheme(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'theme' => ['required', 'string', 'in:'.implode(',', ClinicWebsite::THEMES)],
            'seo_title' => ['required', 'string', 'max:255'],
            'seo_description' => ['required', 'string', 'max:500'],
        ]);

        $tenant = tenant();
        $tenant->website_theme = $validated['theme'];
        $tenant->seo_title = $validated['seo_title'];
        $tenant->seo_description = $validated['seo_description'];
        $tenant->save();

        return redirect()->back()->with('success', 'Website theme and SEO updated.');
    }

    /**
     * Show or hide an extra page in the site header menu.
     */
    public function togglePageMenu(Request $request, ClinicPage $page): JsonResponse
    {
        $tenant = tenant();
        abort_unless((string) $page->tenant_id === (string) $tenant->id, 404);
        $validated = $request->validate(['in_menu' => ['required', 'boolean']]);

        $header = is_array($tenant->website_header) ? $tenant->website_header : [];
        $items = collect($header['menu_items'] ?? [])
            ->reject(fn ($item) => is_array($item) && (string) ($item['page_id'] ?? '') === (string) $page->id)
            ->values();
        if ($validated['in_menu']) {
            $items->push(['label' => $page->title, 'url' => $page->publicUrl(), 'page_id' => (string) $page->id]);
        }
        $header['menu_items'] = $items->all();
        $tenant->website_header = $header;
        $tenant->save();

        return response()->json(['in_menu' => $validated['in_menu']]);
    }

    protected function pageInMenu(Tenant $tenant, ClinicPage $page): bool
    {
        $items = is_array($tenant->website_header) ? ($tenant->website_header['menu_items'] ?? []) : [];

        return collect($items)->contains(fn ($item) => is_array($item) && (string) ($item['page_id'] ?? '') === (string) $page->id);
    }

    /**
     * @param  array<int, array<string, mixed>>  $sections
     * @return array<string, mixed>
     */
    protected function statusPayload(Tenant $tenant, array $sections): array
    {
        return [
            'is_published' => (bool) ($tenant->website_published ?? false),
            'published_at' => $tenant->website_published_at,
            'change_count' => ClinicWebsite::changeCount($tenant),
            'checklist' => ClinicWebsite::checklist($tenant, $sections),
        ];
    }

    /**
     * Strip markup from every text field; keep structure (lists of items/images/days).
     *
     * @param  array<int, mixed>  $sections
     * @return array<int, mixed>
     */
    protected function sanitizeSections(array $sections): array
    {
        $clean = function ($value) use (&$clean) {
            if (is_array($value)) {
                return array_map($clean, $value);
            }
            if (is_string($value)) {
                return Str::limit(trim(strip_tags($value)), 2000, '');
            }

            return is_bool($value) || is_int($value) || is_float($value) || $value === null ? $value : null;
        };

        return array_map($clean, $sections);
    }

    /**
     * Show MedVisit Page Builder (3-panel editor).
     */
    public function showBuilder(Request $request, ?ClinicPage $page = null): Response
    {
        $tenant = tenant();

        if ($page) {
            $this->authorizeTenantPage($page);
        } else {
            $page = ClinicPage::homepageFor((string) $tenant->id) ?? $this->createHomepage($tenant);
        }

        $revisions = $page->revisions()
            ->with('user:id,name')
            ->limit(20)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'version_number' => $r->version_number,
                'summary' => $r->summary,
                'user_name' => $r->user?->name ?? 'Staff',
                'created_at_formatted' => $r->created_at->format('M d, Y h:i A'),
                'created_at_relative' => $r->created_at->diffForHumans(),
            ]);

        $mediaAssets = ClinicMediaAsset::where('tenant_id', $tenant->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'src' => $a->url,
                'url' => $a->url,
                'filename' => $a->filename,
                'name' => $a->original_name,
                'alt' => $a->alt_text ?? $a->original_name,
                'size' => $a->size,
                'size_formatted' => $a->formatted_size,
                'dimensions' => $a->dimensions,
                'updated_at' => $a->updated_at->timestamp,
            ]);

        $doctors = Doctor::where('is_active', true)->orderBy('name')->get();
        $upcomingSessions = DoctorSession::with('doctor')
            ->where('session_date', '>=', Carbon::today('Asia/Colombo')->toDateString())
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->limit(10)
            ->get();

        return Inertia::render('Website/PageBuilder', [
            'tenant' => [
                'id' => $tenant->id,
                'name' => ucwords((string) ($tenant->name ?? 'Clinic')),
                'subdomain' => $tenant->subdomain,
                'phone' => $tenant->phone ?? config('medvisit_public.business.phone_display', '070 129 1688'),
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
                'logo_url' => $tenant->logo_url ?? null,
                'theme' => $page->theme_preset,
            ],
            'page' => [
                'id' => $page->id,
                'slug' => $page->slug,
                'title' => $page->title,
                'schema_version' => $page->schema_version,
                'content_json' => $page->content_json,
                'html' => $page->html,
                'css' => $page->css,
                'is_published' => (bool) $page->is_published,
                'published_at' => $page->published_at?->toIso8601String(),
                'seo_title' => $page->seo_title,
                'seo_description' => $page->seo_description,
                'theme_preset' => $page->theme_preset,
                'is_homepage' => $page->is_homepage,
                'public_url' => $page->publicUrl(),
            ],
            'pages' => ClinicPage::forTenant((string) $tenant->id)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get()
                ->map(fn (ClinicPage $p) => $p->toSummaryArray())
                ->values(),
            'siteKit' => SiteKit::resolveFor($tenant),
            'revisions' => $revisions,
            'mediaAssets' => $mediaAssets,
            'doctors' => $doctors,
            'upcomingSessions' => $upcomingSessions,
            'headerConfig' => $tenant->website_header,
            'footerConfig' => $tenant->website_footer,
        ]);
    }

    /**
     * Save draft of visual page builder layout.
     */
    public function saveBuilder(Request $request, ClinicPage $page): JsonResponse
    {
        $tenant = tenant();
        $this->authorizeTenantPage($page);

        $validated = $request->validate([
            'content_json' => ['nullable'],
            'html' => ['nullable', 'string'],
            'css' => ['nullable', 'string'],
            'theme_preset' => ['nullable', 'string'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:500'],
            'header_config' => ['nullable', 'array'],
            'footer_config' => ['nullable', 'array'],
        ]);

        $cleanHtml = HtmlSanitizer::sanitize($validated['html'] ?? '');
        $cleanCss = HtmlSanitizer::sanitizeCss($validated['css'] ?? '');

        if ($request->has('header_config')) {
            $tenant->website_header = $validated['header_config'];
        }
        if ($request->has('footer_config')) {
            $tenant->website_footer = $validated['footer_config'];
        }
        $tenant->save();

        $page->update([
            'content_json' => $validated['content_json'] ?? $page->content_json,
            'html' => $cleanHtml,
            'css' => $cleanCss,
            'theme_preset' => $validated['theme_preset'] ?? $page->theme_preset ?? 'medvisit-teal',
            'seo_title' => $validated['seo_title'] ?? $page->seo_title,
            'seo_description' => $validated['seo_description'] ?? $page->seo_description,
        ]);

        $revision = $page->createRevision(
            userId: auth()->id(),
            summary: 'Autosaved Draft'
        );

        return response()->json([
            'ok' => true,
            'message' => 'Draft saved successfully.',
            'version_number' => $revision->version_number,
            'updated_at' => now()->toIso8601String(),
        ]);
    }

    /**
     * Publish visual page builder layout to public clinic website.
     */
    public function publishBuilder(Request $request, ClinicPage $page): JsonResponse
    {
        $tenant = tenant();
        $this->authorizeTenantPage($page);

        $validated = $request->validate([
            'content_json' => ['nullable'],
            'html' => ['nullable', 'string'],
            'css' => ['nullable', 'string'],
            'theme_preset' => ['nullable', 'string'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:500'],
            'header_config' => ['nullable', 'array'],
            'footer_config' => ['nullable', 'array'],
        ]);

        $cleanHtml = HtmlSanitizer::sanitize($validated['html'] ?? '');
        $cleanCss = HtmlSanitizer::sanitizeCss($validated['css'] ?? '');

        if ($request->has('header_config')) {
            $tenant->website_header = $validated['header_config'];
        }
        if ($request->has('footer_config')) {
            $tenant->website_footer = $validated['footer_config'];
        }

        $page->update([
            'content_json' => $validated['content_json'] ?? $page->content_json,
            'html' => $cleanHtml,
            'css' => $cleanCss,
            'published_json' => $validated['content_json'] ?? $page->content_json,
            'published_html' => $cleanHtml,
            'published_css' => $cleanCss,
            'is_published' => true,
            'published_at' => now(),
            'theme_preset' => $validated['theme_preset'] ?? $page->theme_preset ?? 'medvisit-teal',
            'seo_title' => $validated['seo_title'] ?? $page->seo_title,
            'seo_description' => $validated['seo_description'] ?? $page->seo_description,
        ]);

        $tenant->website_published = true;
        if (isset($validated['theme_preset'])) {
            $tenant->website_theme = $validated['theme_preset'];
        }
        $tenant->save();

        $revision = $page->createRevision(
            userId: auth()->id(),
            summary: 'Published to Live Site'
        );

        return response()->json([
            'ok' => true,
            'message' => 'Page layout published to live site.',
            'published_at' => now()->toIso8601String(),
            'version_number' => $revision->version_number,
        ]);
    }

    private function authorizeTenantPage(ClinicPage $page): void
    {
        abort_if($page->tenant_id !== tenant('id'), 404);
    }

    private function createHomepage(Tenant $tenant): ClinicPage
    {
        $page = ClinicPage::create([
            'tenant_id' => $tenant->id,
            'slug' => 'home',
            'title' => 'Home',
            'schema_version' => 2,
            'theme_preset' => $tenant->website_theme ?? 'medvisit-teal',
            'seo_title' => $tenant->seo_title ?? ($tenant->name.' - Specialist Doctor Channeling'),
            'seo_description' => $tenant->seo_description ?? ('Book doctor channeling sessions online at '.$tenant->name.'.'),
            'content_json' => $this->getDefaultPageContent($tenant),
            'html' => null,
            'css' => null,
            'is_published' => (bool) ($tenant->website_published ?? false),
            'is_homepage' => true,
        ]);

        return $page->refresh();
    }

    /**
     * Revert page to a chosen historical revision.
     */
    public function revertRevision(Request $request, ClinicPage $page, ClinicPageRevision $revision): JsonResponse
    {
        $tenant = tenant();
        $this->authorizeTenantPage($page);

        if ($revision->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized access to revision.');
        }

        abort_if($revision->page_id !== $page->id, 404);

        $page->revertToRevision($revision);

        return response()->json([
            'ok' => true,
            'message' => "Restored revision #{$revision->version_number}.",
            'content_json' => $page->content_json,
            'html' => $page->html,
            'css' => $page->css,
        ]);
    }

    /**
     * List historical revisions.
     */
    public function listRevisions(Request $request, ClinicPage $page): JsonResponse
    {
        $this->authorizeTenantPage($page);

        $revisions = $page->revisions()
            ->with('user:id,name')
            ->limit(20)
            ->get()
            ->map(fn ($r) => [
                'id' => $r->id,
                'version_number' => $r->version_number,
                'summary' => $r->summary,
                'user_name' => $r->user?->name ?? 'Staff',
                'created_at_formatted' => $r->created_at->format('M d, Y h:i A'),
                'created_at_relative' => $r->created_at->diffForHumans(),
            ]);

        return response()->json(['revisions' => $revisions]);
    }

    /**
     * List media library assets for tenant.
     */
    public function listMedia(Request $request): JsonResponse
    {
        $tenant = tenant();

        $assets = ClinicMediaAsset::where('tenant_id', $tenant->id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'src' => $a->url,
                'url' => $a->url,
                'filename' => $a->filename,
                'name' => $a->original_name,
                'alt' => $a->alt_text ?? $a->original_name,
                'size' => $a->size,
                'size_formatted' => $a->formatted_size,
                'dimensions' => $a->dimensions,
                'updated_at' => $a->updated_at->timestamp,
            ]);

        return response()->json([
            'ok' => true,
            'assets' => $assets,
        ]);
    }

    /**
     * Upload images to media library with multi-tenant isolation.
     */
    public function uploadMedia(Request $request): JsonResponse
    {
        $tenant = tenant();
        $tenantId = $tenant->id;

        if ($request->filled('url') || $request->filled('src')) {
            $url = trim((string) ($request->input('url') ?? $request->input('src')));
            $filename = basename(parse_url($url, PHP_URL_PATH) ?: 'image_'.time());

            $asset = ClinicMediaAsset::create([
                'tenant_id' => $tenantId,
                'filename' => $filename,
                'original_name' => $request->input('name') ?: 'External Image',
                'disk' => 'url',
                'path' => $url,
                'url' => $url,
                'mime_type' => 'image/jpeg',
                'size' => 0,
                'alt_text' => $request->input('alt') ?: 'Clinic Image',
            ]);

            return response()->json([
                'ok' => true,
                'asset' => [
                    'id' => $asset->id,
                    'src' => $asset->url,
                    'url' => $asset->url,
                    'filename' => $asset->filename,
                    'name' => $asset->original_name,
                    'size_formatted' => 'External',
                ],
            ]);
        }

        $request->validate([
            'files' => ['nullable', 'array'],
            'files.*' => ['file', 'mimes:jpeg,png,jpg,webp,svg,gif', 'max:5120'],
            'file' => ['nullable', 'file', 'mimes:jpeg,png,jpg,webp,svg,gif', 'max:5120'],
        ]);

        $uploadedFiles = $request->file('files') ?? ($request->hasFile('file') ? [$request->file('file')] : []);
        $createdAssets = [];

        foreach ($uploadedFiles as $file) {
            $extension = $file->getClientOriginalExtension();
            $filename = Str::uuid()->toString().'.'.$extension;
            $path = $file->storeAs("media/{$tenantId}", $filename, 'public');
            $url = Storage::disk('public')->url($path);

            $dimensions = null;
            if (in_array(strtolower($extension), ['jpg', 'jpeg', 'png', 'webp'])) {
                if (function_exists('getimagesize')) {
                    $imageSize = @getimagesize($file->getRealPath());
                    if ($imageSize) {
                        $dimensions = "{$imageSize[0]}x{$imageSize[1]}";
                    }
                }
            }

            $asset = ClinicMediaAsset::create([
                'tenant_id' => $tenantId,
                'filename' => $filename,
                'original_name' => $file->getClientOriginalName(),
                'disk' => 'public',
                'path' => $path,
                'url' => $url,
                'mime_type' => $file->getClientMimeType() ?: 'image/jpeg',
                'size' => $file->getSize(),
                'dimensions' => $dimensions,
                'alt_text' => pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME),
            ]);

            $createdAssets[] = [
                'id' => $asset->id,
                'src' => $asset->url,
                'url' => $asset->url,
                'filename' => $asset->filename,
                'name' => $asset->original_name,
                'alt' => $asset->alt_text,
                'size' => $asset->size,
                'size_formatted' => $asset->formatted_size,
                'dimensions' => $asset->dimensions,
                'updated_at' => $asset->updated_at->timestamp,
            ];
        }

        return response()->json([
            'ok' => true,
            'assets' => $createdAssets,
            'asset' => $createdAssets[0] ?? null,
            'data' => array_column($createdAssets, 'url'),
        ]);
    }

    /**
     * Delete a media asset with strict multi-tenant check.
     */
    public function deleteMedia(Request $request, ClinicMediaAsset $asset): JsonResponse
    {
        $tenant = tenant();

        if ($asset->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized access to this asset.');
        }

        if ($asset->disk === 'public' && Storage::disk('public')->exists($asset->path)) {
            Storage::disk('public')->delete($asset->path);
        }

        $asset->delete();

        return response()->json(['ok' => true, 'message' => 'Asset deleted successfully.']);
    }

    /**
     * Update asset metadata.
     */
    public function updateMedia(Request $request, ClinicMediaAsset $asset): JsonResponse
    {
        $tenant = tenant();

        if ($asset->tenant_id !== $tenant->id) {
            abort(403, 'Unauthorized access to this asset.');
        }

        $validated = $request->validate([
            'name' => ['nullable', 'string', 'max:255'],
            'alt_text' => ['nullable', 'string', 'max:255'],
        ]);

        $asset->update([
            'original_name' => $validated['name'] ?? $asset->original_name,
            'alt_text' => $validated['alt_text'] ?? $asset->alt_text,
        ]);

        return response()->json(['ok' => true, 'asset' => $asset]);
    }

    /**
     * Preview homepage (draft mode, staff only).
     */
    public function previewHome(Request $request): Response|RedirectResponse
    {
        return $this->renderPage(ClinicPage::homepageFor((string) tenant('id')), isPreview: true);
    }

    /**
     * Preview any page (draft mode, staff only). Trashed pages 404.
     */
    public function previewPage(Request $request, string $slug): Response|RedirectResponse
    {
        $page = ClinicPage::forTenant((string) tenant('id'))->where('slug', $slug)->firstOrFail();

        return $this->renderPage($page, isPreview: true);
    }

    /**
     * Public Landing Page at clinic subdomain root (GET /).
     */
    public function publicHome(): Response|RedirectResponse
    {
        return $this->renderPage(ClinicPage::homepageFor((string) tenant('id')), isPreview: false);
    }

    /**
     * Public page (GET /p/{slug}). Only published pages are served; the homepage lives at /.
     */
    public function publicPage(string $slug): Response|RedirectResponse
    {
        $page = ClinicPage::forTenant((string) tenant('id'))->where('slug', $slug)->firstOrFail();

        abort_unless($page->is_published, 404);

        if ($page->is_homepage) {
            return redirect('/', 301);
        }

        return $this->renderPage($page, isPreview: false);
    }

    /**
     * Resolve header/footer configs so page-linked menu items carry real URLs.
     *
     * @return array{0: mixed, 1: mixed}
     */
    protected function resolvedChromeConfigs(Tenant $tenant, bool $isPreview = false): array
    {
        $header = $tenant->website_header;
        $footer = $tenant->website_footer;

        $hasPageLinks = fn ($config): bool => is_array($config)
            && str_contains((string) json_encode($config), '"page_id"');

        if (! $hasPageLinks($header) && ! $hasPageLinks($footer)) {
            return [$header, $footer];
        }

        $pages = ClinicPage::forTenant((string) $tenant->id)->get()->keyBy('id');

        if (is_array($header) && isset($header['menu_items']) && is_array($header['menu_items'])) {
            $header['menu_items'] = $this->resolveMenuItems($header['menu_items'], $pages, $isPreview);
        }
        if (is_array($footer) && isset($footer['quick_links']) && is_array($footer['quick_links'])) {
            $footer['quick_links'] = $this->resolveMenuItems($footer['quick_links'], $pages, $isPreview);
        }

        return [$header, $footer];
    }

    /**
     * Map page-linked menu items to page URLs; drop links to missing pages and,
     * outside preview, to unpublished pages. Items without page_id pass through.
     *
     * @param  array<int, mixed>  $items
     * @param  Collection<int, ClinicPage>  $pages  keyed by page id
     * @return array<int, mixed>
     */
    protected function resolveMenuItems(array $items, Collection $pages, bool $isPreview = false): array
    {
        $resolved = [];

        foreach ($items as $item) {
            if (is_array($item) && isset($item['children']) && is_array($item['children'])) {
                $item['children'] = $this->resolveMenuItems($item['children'], $pages, $isPreview);
            }

            if (is_array($item) && isset($item['page_id']) && $item['page_id'] !== '') {
                $linked = $pages->get((int) $item['page_id']);

                if ($linked === null || (! $linked->is_published && ! $isPreview)) {
                    continue;
                }

                $item['url'] = $linked->publicUrl();
            }

            $resolved[] = $item;
        }

        return $resolved;
    }

    /**
     * Unified renderer for public pages & draft preview.
     */
    protected function renderPage(?ClinicPage $page, bool $isPreview = false): Response|RedirectResponse
    {
        $tenant = tenant();

        if (! $tenant->isUsable()) {
            return redirect()->route('tenant.suspended');
        }

        [$headerConfig, $footerConfig] = $this->resolvedChromeConfigs($tenant, $isPreview);

        // Server-side entitlement check: if entitlement was lost (e.g. refunded/revoked), fall back gracefully
        if (! $isPreview && $tenant->applied_template_id) {
            $appliedTpl = WebsiteTemplate::find($tenant->applied_template_id);
            if ($appliedTpl && ! config('medvisit.templates_under_development', true) && ! $tenant->isTemplateEntitled($appliedTpl)) {
                app(TemplateService::class)->revertToPreviousDesign($tenant);
                $look = ClinicWebsite::liveLook($tenant);
            }
        }

        // The editor preview shows the draft; visitors see the published copy.
        $sections = $isPreview ? ClinicWebsite::draftSections($tenant) : ClinicWebsite::liveSections($tenant);
        $look = $isPreview ? ClinicWebsite::draftLook($tenant) : ClinicWebsite::liveLook($tenant);
        $theme = $page?->theme_preset ?? $look['theme'];
        $isPublished = (bool) ($page?->is_published ?? ($tenant->website_published ?? false));

        $doctors = Doctor::where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => trim(($d->title ?? 'Dr.').' '.$d->name),
                'specialty' => $d->specialty,
                'slmc_number' => $d->slmc_number,
                'bio' => $d->bio,
                'photo_url' => $d->photo_url ?? null,
                'total_fee_formatted' => 'Rs. '.number_format(($d->doctor_fee + $d->clinic_fee) / 100, 2),
            ]);

        $upcomingSessions = DoctorSession::with('doctor')
            ->where('session_date', '>=', Carbon::today('Asia/Colombo')->toDateString())
            ->where('session_date', '<=', Carbon::today('Asia/Colombo')->addDays(6)->toDateString())
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->get()
            ->map(function ($s) {
                $bookedCount = $s->tokens()->whereNotIn('status', ['cancelled'])->count();

                return [
                    'id' => $s->id,
                    'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? 'Doctor')),
                    'doctor_specialty' => $s->doctor?->specialty ?? '',
                    'session_date' => $s->session_date->format('l, j M'),
                    'start_time' => Carbon::parse($s->start_time)->format('g:i A'),
                    'room_number' => $s->room_number ?? '',
                    'available_tokens_count' => max(0, $s->max_tokens - $bookedCount),
                    'is_full' => $bookedCount >= $s->max_tokens,
                    'total_fee_formatted' => 'Rs. '.number_format(($s->doctor_fee + $s->clinic_fee) / 100, 2),
                ];
            });

        $stats = ClinicWebsite::stats();
        $visibleIds = ClinicWebsite::visibleSectionIds($sections, [
            'doctors' => $doctors->count(),
            'sessions' => $upcomingSessions->count(),
            'stats' => $stats,
        ], $tenant);

        $customHtml = $isPreview ? ($page?->html ?? $page?->published_html) : $page?->published_html;
        $customCss = $isPreview ? ($page?->css ?? $page?->published_css) : $page?->published_css;
        $contact = collect($sections)->firstWhere('type', 'contact') ?? [];

        return Inertia::render('Public/ClinicLanding', [
            'clinic' => [
                'name' => (string) ($tenant->name ?? ''),
                'subdomain' => $tenant->subdomain,
                // Only real details; never placeholders that look like the clinic's own.
                'phone' => ClinicWebsite::contactValue($contact, 'phone', $tenant) ?: null,
                'address' => ClinicWebsite::contactValue($contact, 'address', $tenant) ?: null,
                'email' => ClinicWebsite::contactValue($contact, 'email', $tenant) ?: null,
                'whatsapp_number' => ClinicWebsite::contactValue($contact, 'whatsapp', $tenant) ?: null,
                'logo_url' => $tenant->logo_url,
                'opening_hours' => $tenant->opening_hours,
                'latitude' => $contact['latitude'] ?? ($tenant->directory_latitude !== null ? (float) $tenant->directory_latitude : null),
                'longitude' => $contact['longitude'] ?? ($tenant->directory_longitude !== null ? (float) $tenant->directory_longitude : null),
            ],
            'headerConfig' => $headerConfig,
            'footerConfig' => $footerConfig,
            'sections' => $sections,
            'visibleSectionIds' => $visibleIds,
            'look' => $look,
            'stats' => $stats,
            'theme' => $theme,
            'isPublished' => $isPublished,
            'isPreview' => $isPreview,
            'isEmbed' => $isPreview && request()->boolean('embed'),
            'doctors' => $doctors,
            'upcomingSessions' => $upcomingSessions,
            'seo' => [
                'title' => $page?->seo_title ?? ($tenant->seo_title ?: ClinicWebsite::defaultSeoTitle($tenant)),
                'description' => $page?->seo_description ?? ($tenant->seo_description ?: ClinicWebsite::defaultSeoDescription($tenant)),
                'image' => $tenant->website_share_image ?: url('/share-image.png'),
                'url' => $tenant->url('/'),
            ],
            'siteKit' => SiteKit::resolveFor($tenant),
            'customPage' => $customHtml ? [
                'html' => $customHtml,
                'css' => $customCss,
                'isPreview' => $isPreview,
            ] : null,
        ]);
    }

    /**
     * Initial starter content for new clinics.
     */
    protected function getDefaultPageContent(Tenant $tenant): array
    {
        return [
            'version' => 2,
            'template' => 'modern-clinic',
            'components' => [],
            'styles' => [],
        ];
    }

    /**
     * Public Token Booking Page (GET /book).
     */
    public function publicBooking(Request $request): Response
    {
        $tenant = tenant();
        $today = Carbon::today('Asia/Colombo')->toDateString();
        $feeService = app(FeeResolutionService::class);

        $sessions = DoctorSession::with('doctor')
            ->where('session_date', '>=', $today)
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->get()
            ->map(function ($s) use ($feeService) {
                $booked = $s->tokens()->whereNotIn('status', ['cancelled'])->count();
                $resolved = $feeService->resolve(
                    doctor: $s->doctor,
                    session: $s,
                    channel: 'online'
                );

                return [
                    'id' => $s->id,
                    'doctor_id' => $s->doctor_id,
                    'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? 'Doctor')),
                    'doctor_specialty' => $s->doctor?->specialty ?? 'Specialist',
                    'session_date' => $s->session_date->format('M d, Y (D)'),
                    'start_time' => Carbon::parse($s->start_time)->format('h:i A'),
                    'room_number' => $s->room_number ?? 'Consultation Suite 1',
                    'available_tokens_count' => max(0, $s->max_tokens - $booked),
                    'is_full' => $booked >= $s->max_tokens,
                    'total_fee_formatted' => $resolved['patient_total_formatted'],
                    'online_fee_formatted' => ! empty($resolved['online_fee']) ? 'Rs. '.number_format($resolved['online_fee'] / 100, 2) : null,
                ];
            });

        $onlineVisitTypes = VisitType::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->where('allow_online', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'code', 'pricing_type', 'percentage_value', 'fixed_fee_cents', 'is_default']);

        return Inertia::render('Public/BookToken', [
            'clinic' => [
                'name' => ucwords((string) ($tenant->name ?? 'Clinic')),
                'phone' => $tenant->phone ?? config('medvisit_public.business.phone_display', '070 129 1688'),
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
                'subdomain' => $tenant->subdomain,
                'logo_url' => $tenant->logo_url,
                'whatsapp_number' => $tenant->whatsapp_number,
                'opening_hours' => $tenant->opening_hours,
            ],
            'headerConfig' => $this->resolvedChromeConfigs($tenant)[0],
            'footerConfig' => $this->resolvedChromeConfigs($tenant)[1],
            'theme' => $tenant->website_theme ?? 'medvisit-teal',
            'sessions' => $sessions,
            'visitTypes' => $onlineVisitTypes,
        ]);
    }

    /**
     * Public Token Booking Submission (POST /book).
     * Protected by:
     * 1. Honeypot check.
     * 2. Rate limiting.
     * 3. 1 active token per phone per session.
     * 4. Max 3 active tokens per phone across clinic.
     */
    public function storePublicBooking(Request $request): RedirectResponse
    {
        // 1. Honeypot check
        if (! empty($request->input('website_hp'))) {
            return redirect()->back()->withErrors([
                'phone' => 'Spam detected. Booking submission rejected.',
            ]);
        }

        $validated = $request->validate([
            'doctor_session_id' => ['required', 'exists:doctor_sessions,id'],
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'nic' => ['nullable', 'string', 'max:20'],
            'city' => ['nullable', 'string', 'max:100'],
            'visit_type_id' => ['nullable', 'exists:visit_types,id'],
            'notes' => ['nullable', 'string', 'max:255'],
        ]);

        $cleanPhone = preg_replace('/[^0-9+]/', '', $validated['phone']);

        // 2. Resolve or find Patient
        $tenantId = tenant('id');
        $patient = Patient::where('tenant_id', $tenantId)
            ->where(function ($q) use ($cleanPhone, $validated) {
                $q->where('phone', $cleanPhone);
                if (! empty($validated['nic'])) {
                    $q->orWhere('nic', $validated['nic']);
                }
            })->first();

        if ($patient) {
            // Anti-abuse Check: 1 active token per phone per session
            $alreadyBookedInSession = BookingToken::where('doctor_session_id', $validated['doctor_session_id'])
                ->where('patient_id', $patient->id)
                ->whereNotIn('status', ['cancelled'])
                ->exists();

            if ($alreadyBookedInSession) {
                return redirect()->back()->withErrors([
                    'phone' => 'An active channeling token for this session has already been issued to this phone number.',
                ]);
            }

            // Anti-abuse Check: Max 3 active tokens across clinic
            $activeTokensCount = BookingToken::where('patient_id', $patient->id)
                ->whereIn('status', ['booked', 'checked_in'])
                ->count();

            if ($activeTokensCount >= 3) {
                return redirect()->back()->withErrors([
                    'phone' => 'Maximum limit of 3 active channeling tokens reached for this patient account.',
                ]);
            }
        } else {
            $patient = Patient::create([
                'tenant_id' => $tenantId,
                'name' => $validated['name'],
                'phone' => $cleanPhone,
                'nic' => $validated['nic'] ?? null,
                'city' => $validated['city'] ?? null,
            ]);
        }

        // Concurrency-safe atomic token assignment
        $feeService = app(FeeResolutionService::class);
        $token = DB::transaction(function () use ($validated, $patient, $tenantId, $feeService) {
            $session = DoctorSession::with('doctor')
                ->where('id', $validated['doctor_session_id'])
                ->lockForUpdate()
                ->firstOrFail();

            $activeCount = BookingToken::where('doctor_session_id', $session->id)
                ->whereNotIn('status', ['cancelled'])
                ->count();

            if ($activeCount >= $session->max_tokens) {
                throw new \Exception("Session is full ({$session->max_tokens} maximum tokens booked).");
            }

            $lastTokenNumber = (int) BookingToken::where('doctor_session_id', $session->id)
                ->max('token_number') ?? 0;

            $tokenNumber = $lastTokenNumber + 1;
            $estimatedTime = $session->calculateEstimatedTime($tokenNumber);

            // Resolve online fee snapshot
            $snapshot = $feeService->resolve(
                doctor: $session->doctor,
                session: $session,
                visitType: $validated['visit_type_id'] ?? null,
                channel: 'online'
            );

            $newToken = BookingToken::create([
                'tenant_id' => $tenantId,
                'doctor_session_id' => $session->id,
                'patient_id' => $patient->id,
                'token_number' => $tokenNumber,
                'visit_type_id' => $snapshot['visit_type']['id'] ?? null,
                'estimated_time' => $estimatedTime,
                'status' => BookingToken::STATUS_BOOKED,
                'booked_via' => 'online',
                'signed_cancel_token' => Str::random(40),
                'fee_snapshot' => $snapshot,
                'payout_status' => 'pending',
                'notes' => $validated['notes'] ?? null,
            ]);

            // Create initial bill record (pending payment at clinic arrival)
            $receiptNumber = 'REC-ONL-'.strtoupper(Str::random(5)).'-'.date('dmy');
            Bill::create([
                'tenant_id' => $tenantId,
                'booking_token_id' => $newToken->id,
                'patient_id' => $patient->id,
                'doctor_id' => $session->doctor_id,
                'visit_type_id' => $snapshot['visit_type']['id'] ?? null,
                'receipt_number' => $receiptNumber,
                'doctor_fee' => $snapshot['doctor_fee_portion'],
                'clinic_fee' => $snapshot['clinic_portion'],
                'other_fee' => $snapshot['third_party_portion'],
                'discount' => 0,
                'total_amount' => $snapshot['patient_total'],
                'fee_snapshot' => $snapshot,
                'doctor_payout_amount' => $snapshot['doctor_payout_amount'],
                'clinic_net_amount' => $snapshot['clinic_net_amount'],
                'third_party_amount' => $snapshot['third_party_portion'],
                'payment_method' => 'cash',
                'payment_status' => 'pending',
            ]);

            return $newToken;
        });

        $session = DoctorSession::find($validated['doctor_session_id']);
        $approxTime = $token->estimated_time ? Carbon::parse($token->estimated_time)->format('h:i A') : $session->start_time;

        return redirect()->back()->with('success', "Appointment Confirmed! Your Token is #{$token->token_number} with Dr. {$session->doctor?->name}. Approximately at {$approxTime}. Please arrive 15 minutes early.");
    }

    /**
     * Public Queue Status page (GET /queue).
     */
    public function publicQueue(): Response
    {
        $tenant = tenant();
        $today = Carbon::today('Asia/Colombo')->toDateString();

        $activeSessions = DoctorSession::with('doctor')
            ->where('session_date', $today)
            ->whereIn('status', ['scheduled', 'in_progress'])
            ->get()
            ->map(function ($s) {
                $currentToken = $s->tokens()
                    ->whereIn('status', ['called', 'in_consultation'])
                    ->orderByDesc('token_number')
                    ->value('token_number');

                return [
                    'id' => $s->id,
                    'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? 'Doctor')),
                    'specialty' => $s->doctor?->specialty ?? 'Specialist',
                    'room' => $s->room_number ?? 'Suite 1',
                    'currentToken' => $currentToken,
                    'status' => $s->status,
                    'totalTokens' => $s->tokens()->whereNotIn('status', ['cancelled'])->count(),
                ];
            });

        return Inertia::render('Public/QueueStatus', [
            'clinic' => [
                'name' => ucwords((string) ($tenant->name ?? 'Clinic')),
                'subdomain' => $tenant->subdomain,
                'phone' => $tenant->phone ?? config('medvisit_public.business.phone_display', '070 129 1688'),
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
                'logo_url' => $tenant->logo_url,
                'whatsapp_number' => $tenant->whatsapp_number,
                'opening_hours' => $tenant->opening_hours,
            ],
            'headerConfig' => $this->resolvedChromeConfigs($tenant)[0],
            'footerConfig' => $this->resolvedChromeConfigs($tenant)[1],
            'theme' => $tenant->website_theme ?? 'medvisit-teal',
            'activeSessions' => $activeSessions,
        ]);
    }

    /**
     * Public Token status and cancellation (GET /tokens/{signedToken}/status).
     */
    public function publicTokenStatus(string $signedToken): Response
    {
        $tenant = tenant();
        $token = BookingToken::with(['doctorSession.doctor', 'patient'])
            ->where('tenant_id', $tenant->id)
            ->where('signed_cancel_token', $signedToken)
            ->first();

        $tokenData = $token ? [
            'id' => $token->id,
            'token_number' => $token->token_number,
            'status' => $token->status,
            'doctor_name' => trim(($token->doctorSession?->doctor?->title ?? 'Dr.').' '.($token->doctorSession?->doctor?->name ?? 'Doctor')),
            'specialty' => $token->doctorSession?->doctor?->specialty ?? 'Specialist',
            'session_date' => $token->doctorSession?->session_date->format('M d, Y (D)') ?? '',
            'start_time' => $token->doctorSession ? Carbon::parse($token->doctorSession->start_time)->format('h:i A') : '',
            'estimated_time' => $token->estimated_time ? Carbon::parse($token->estimated_time)->format('h:i A') : null,
            'patient_name' => $token->patient?->name ?? 'Patient',
            'total_fee_formatted' => $token->doctorSession ? 'Rs. '.number_format(($token->doctorSession->doctor_fee + $token->doctorSession->clinic_fee) / 100, 2) : 'Rs. 0.00',
            'signed_cancel_token' => $token->signed_cancel_token,
        ] : null;

        return Inertia::render('Public/BookingStatus', [
            'clinic' => [
                'name' => ucwords((string) ($tenant->name ?? 'Clinic')),
                'subdomain' => $tenant->subdomain,
                'phone' => $tenant->phone ?? config('medvisit_public.business.phone_display', '070 129 1688'),
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
                'logo_url' => $tenant->logo_url,
                'whatsapp_number' => $tenant->whatsapp_number,
                'opening_hours' => $tenant->opening_hours,
            ],
            'headerConfig' => $this->resolvedChromeConfigs($tenant)[0],
            'footerConfig' => $this->resolvedChromeConfigs($tenant)[1],
            'theme' => $tenant->website_theme ?? 'medvisit-teal',
            'token' => $tokenData,
        ]);
    }

    /**
     * Cancel a booking token via signed cancel token (POST /tokens/{signedToken}/cancel).
     */
    public function cancelPublicToken(string $signedToken): RedirectResponse
    {
        $tenant = tenant();
        $token = BookingToken::where('tenant_id', $tenant->id)
            ->where('signed_cancel_token', $signedToken)
            ->firstOrFail();

        if ($token->status === BookingToken::STATUS_BOOKED) {
            $token->update(['status' => BookingToken::STATUS_CANCELLED]);
        }

        return redirect()->back()->with('success', 'Your appointment token has been cancelled.');
    }
}
