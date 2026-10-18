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
use App\Services\FeeResolutionService;
use App\Support\HtmlSanitizer;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class ClinicWebsiteController extends Controller
{
    /**
     * Default sections configuration.
     */
    protected array $defaultSections = [
        [
            'id' => 'hero',
            'name' => 'Hero Banner',
            'enabled' => true,
            'title' => 'Compassionate Care, Specialist Excellence',
            'subtitle' => 'Book specialist channeling appointments with Sri Lanka’s leading medical practitioners. Zero waiting lounge delays with real-time digital queue updates.',
            'cta_text' => 'Book Appointment Online',
            'cta_link' => '/book',
            'badge' => 'Open Daily • Specialist Channeling',
        ],
        [
            'id' => 'about',
            'name' => 'About Clinic',
            'enabled' => true,
            'title' => 'Your Family’s Trusted Medical Center',
            'description' => 'Providing premier outpatient healthcare, specialist channeling, and diagnostic medical services with international safety protocols and Sri Lankan warmth.',
            'stat_1_number' => '15+',
            'stat_1_label' => 'Medical Specialists',
            'stat_2_number' => '25,000+',
            'stat_2_label' => 'Satisfied Patients',
            'stat_3_number' => '100%',
            'stat_3_label' => 'Digital Queue Tracking',
        ],
        [
            'id' => 'doctors',
            'name' => 'Doctors Roster (Auto)',
            'enabled' => true,
            'title' => 'Meet Our Medical Specialists',
            'subtitle' => 'SLMC verified consultants, surgeons, and physicians practicing at our modern medical center.',
        ],
        [
            'id' => 'sessions',
            'name' => 'This Week Channeling (Auto)',
            'enabled' => true,
            'title' => 'Channeling Sessions This Week',
            'subtitle' => 'Live upcoming schedules with real-time token capacity and consultation suites.',
        ],
        [
            'id' => 'services',
            'name' => 'Clinical Services',
            'enabled' => true,
            'title' => 'Comprehensive Medical Services',
            'subtitle' => 'From preventive healthcare to specialist consultation and diagnostic labs.',
            'items' => [
                ['name' => 'Specialist Doctor Channeling', 'desc' => 'Cardiology, Paediatrics, ENT, Dermatology, and General Medicine.'],
                ['name' => 'Clinical Laboratory & Pathology', 'desc' => 'Automated blood testing, lipid profiles, and diagnostic screening.'],
                ['name' => 'Digital ECG & Vitals Lounge', 'desc' => 'Rapid heart health monitoring and cardiac diagnostics.'],
                ['name' => 'Pharmacy & Prescription Dispensing', 'desc' => 'Certified pharmaceutical supplies and patient medication guidance.'],
            ],
        ],
        [
            'id' => 'hours',
            'name' => 'Operating Hours',
            'enabled' => true,
            'title' => 'Clinical Hours & Availability',
            'weekdays' => '07:30 AM – 10:00 PM',
            'saturday' => '07:30 AM – 10:00 PM',
            'sunday' => '08:00 AM – 08:00 PM',
            'emergency_note' => 'Channeling appointments operate according to individual doctor schedule suites.',
        ],
        [
            'id' => 'contact',
            'name' => 'Contact & Location',
            'enabled' => true,
            'title' => 'Visit Our Medical Center',
            'subtitle' => 'Centrally located with dedicated parking and accessible wheelchair facilities.',
            'map_link' => 'https://maps.google.com',
        ],
        [
            'id' => 'footer',
            'name' => 'Website Footer',
            'enabled' => true,
            'notice' => 'All doctor channeling schedules are subject to practitioner availability. Token appointment times are approximate.',
        ],
    ];

    /**
     * Admin: Visual Section Builder & Website Settings.
     */
    public function index(Request $request): Response
    {
        $tenant = tenant();

        $sections = $tenant->website_sections ?? $this->defaultSections;
        $theme = $tenant->website_theme ?? 'medvisit-teal';
        $isPublished = (bool) ($tenant->website_published ?? false);
        $seo = [
            'title' => $tenant->seo_title ?? ($tenant->name.' - Specialist Doctor Channeling'),
            'description' => $tenant->seo_description ?? ('Book doctor channeling sessions online at '.$tenant->name.'. Live queue monitoring and SLMC verified specialists.'),
        ];

        // Public preview data
        $doctors = Doctor::where('is_active', true)->orderBy('name')->get();
        $upcomingSessions = DoctorSession::with('doctor')
            ->where('session_date', '>=', Carbon::today('Asia/Colombo')->toDateString())
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->limit(10)
            ->get();

        return Inertia::render('Website/Index', [
            'sections' => $sections,
            'theme' => $theme,
            'isPublished' => $isPublished,
            'seo' => $seo,
            'clinic' => [
                'name' => ucwords((string) ($tenant->name ?? 'Demo Clinic')),
                'subdomain' => $tenant->subdomain,
                'phone' => $tenant->phone ?? '+94 11 234 5678',
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
            ],
            'doctors' => $doctors,
            'upcomingSessions' => $upcomingSessions,
        ]);
    }

    /**
     * Admin: Update sections content and ordering.
     */
    public function updateSections(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'sections' => ['required', 'array'],
        ]);

        $tenant = tenant();
        $tenant->website_sections = $validated['sections'];
        $tenant->save();

        return redirect()->back()->with('success', 'Website sections layout and content saved successfully.');
    }

    /**
     * Admin: Toggle Publish status.
     */
    public function publish(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'published' => ['required', 'boolean'],
        ]);

        $tenant = tenant();
        $tenant->website_published = $validated['published'];
        $tenant->save();

        $msg = $validated['published']
            ? 'Clinic website is now LIVE and publicly visible!'
            : 'Clinic website saved as draft.';

        return redirect()->back()->with('success', $msg);
    }

    /**
     * Admin: Update theme and SEO meta fields.
     */
    public function updateTheme(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'theme' => ['required', 'string', 'in:medvisit-teal,ocean-blue,emerald-health,royal-purple,slate-luxury'],
            'seo_title' => ['required', 'string', 'max:255'],
            'seo_description' => ['required', 'string', 'max:500'],
        ]);

        $tenant = tenant();
        $tenant->website_theme = $validated['theme'];
        $tenant->seo_title = $validated['seo_title'];
        $tenant->seo_description = $validated['seo_description'];
        $tenant->save();

        return redirect()->back()->with('success', 'Website theme preset and SEO metadata updated.');
    }

    /**
     * Show Visual Page Builder (Elementor-Style 3-panel editor).
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
                'phone' => $tenant->phone ?? '+94 11 234 5678',
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
            'siteKit' => null,
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
     * Preview homepage (draft mode).
     */
    public function previewHome(Request $request): Response|RedirectResponse
    {
        return $this->renderPublicHome(isPreview: true);
    }

    /**
     * Public Landing Page at clinic subdomain root (GET /).
     */
    public function publicHome(): Response|RedirectResponse
    {
        return $this->renderPublicHome(isPreview: false);
    }

    /**
     * Unified renderer for public homepage & draft preview.
     */
    protected function renderPublicHome(bool $isPreview = false): Response|RedirectResponse
    {
        $tenant = tenant();

        if (! $tenant->isUsable()) {
            return redirect()->route('tenant.suspended');
        }

        $page = ClinicPage::where('tenant_id', $tenant->id)->where('slug', 'home')->first();

        $sections = $tenant->website_sections ?? $this->defaultSections;
        $theme = $page?->theme_preset ?? ($tenant->website_theme ?? 'medvisit-teal');
        $isPublished = (bool) ($page?->is_published ?? ($tenant->website_published ?? false));

        // Live active doctors
        $doctors = Doctor::where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => trim(($d->title ?? 'Dr.').' '.$d->name),
                'specialty' => $d->specialty,
                'slmc_number' => $d->slmc_number,
                'bio' => $d->bio,
                'total_fee_formatted' => 'Rs. '.number_format(($d->doctor_fee + $d->clinic_fee) / 100, 2),
            ]);

        // Upcoming channeling sessions this week
        $upcomingSessions = DoctorSession::with('doctor')
            ->where('session_date', '>=', Carbon::today('Asia/Colombo')->toDateString())
            ->where('session_date', '<=', Carbon::today('Asia/Colombo')->addDays(7)->toDateString())
            ->whereNotIn('status', ['cancelled'])
            ->orderBy('session_date')
            ->orderBy('start_time')
            ->get()
            ->map(function ($s) {
                $bookedCount = $s->tokens()->whereNotIn('status', ['cancelled'])->count();

                return [
                    'id' => $s->id,
                    'doctor_name' => trim(($s->doctor?->title ?? 'Dr.').' '.($s->doctor?->name ?? 'Doctor')),
                    'doctor_specialty' => $s->doctor?->specialty ?? 'Specialist',
                    'session_date' => $s->session_date->format('l, M d'),
                    'start_time' => Carbon::parse($s->start_time)->format('h:i A'),
                    'room_number' => $s->room_number ?? 'Suite 1',
                    'available_tokens_count' => max(0, $s->max_tokens - $bookedCount),
                    'is_full' => $bookedCount >= $s->max_tokens,
                    'total_fee_formatted' => 'Rs. '.number_format(($s->doctor_fee + $s->clinic_fee) / 100, 2),
                ];
            });

        $customHtml = $isPreview ? ($page?->html ?? $page?->published_html) : $page?->published_html;
        $customCss = $isPreview ? ($page?->css ?? $page?->published_css) : $page?->published_css;

        return Inertia::render('Public/ClinicLanding', [
            'clinic' => [
                'name' => ucwords((string) ($tenant->name ?? 'Clinic')),
                'subdomain' => $tenant->subdomain,
                'phone' => $tenant->phone ?? '+94 11 234 5678',
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
                'logo_url' => $tenant->logo_url,
                'whatsapp_number' => $tenant->whatsapp_number,
                'opening_hours' => $tenant->opening_hours,
            ],
            'headerConfig' => $tenant->website_header,
            'footerConfig' => $tenant->website_footer,
            'sections' => $sections,
            'theme' => $theme,
            'isPublished' => $isPublished,
            'doctors' => $doctors,
            'upcomingSessions' => $upcomingSessions,
            'seo' => [
                'title' => $page?->seo_title ?? ($tenant->seo_title ?? ($tenant->name.' - Doctor Channeling')),
                'description' => $page?->seo_description ?? ($tenant->seo_description ?? ('Book doctor appointments online at '.$tenant->name.'.')),
            ],
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
                'phone' => $tenant->phone ?? '+94 11 234 5678',
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
                'subdomain' => $tenant->subdomain,
                'logo_url' => $tenant->logo_url,
                'whatsapp_number' => $tenant->whatsapp_number,
                'opening_hours' => $tenant->opening_hours,
            ],
            'headerConfig' => $tenant->website_header,
            'footerConfig' => $tenant->website_footer,
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
                'phone' => $tenant->phone ?? '+94 11 234 5678',
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
                'logo_url' => $tenant->logo_url,
                'whatsapp_number' => $tenant->whatsapp_number,
                'opening_hours' => $tenant->opening_hours,
            ],
            'headerConfig' => $tenant->website_header,
            'footerConfig' => $tenant->website_footer,
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
                'phone' => $tenant->phone ?? '+94 11 234 5678',
                'address' => $tenant->address ?? 'Colombo, Sri Lanka',
                'logo_url' => $tenant->logo_url,
                'whatsapp_number' => $tenant->whatsapp_number,
                'opening_hours' => $tenant->opening_hours,
            ],
            'headerConfig' => $tenant->website_header,
            'footerConfig' => $tenant->website_footer,
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
