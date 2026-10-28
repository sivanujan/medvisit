<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\WebsiteTemplate;
use App\Services\Templates\TemplateService;
use App\Support\ClinicWebsite;
use App\Support\SiteKit;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class WebsiteTemplateController extends Controller
{
    public function __construct(
        protected TemplateService $templateService
    ) {}

    /**
     * Get templates gallery data for the clinic website editor.
     */
    public function index(Request $request): JsonResponse
    {
        $tenant = tenant();
        $gallery = $this->templateService->getGallery($tenant);

        return response()->json($gallery);
    }

    /**
     * Live sandboxed preview of a template with the clinic's real data.
     * Features: device toggle, watermark, top bar "Preview - buy to publish", noindex.
     */
    public function preview(Request $request, string $slug): Response|RedirectResponse
    {
        $template = WebsiteTemplate::where('slug', $slug)->firstOrFail();
        $tenant = tenant();

        // 1. Resolve Chrome (Header/Footer)
        $headerConfig = $tenant->website_header;
        $footerConfig = $tenant->website_footer;

        $chromeClinic = [
            'name' => (string) ($tenant->name ?? 'Clinic'),
            'subdomain' => (string) $tenant->subdomain,
            'phone' => (string) ($tenant->phone ?? ''),
            'address' => (string) ($tenant->address ?? ''),
            'logo_url' => $tenant->logo_url,
            'brand_color' => $tenant->brandColor(),
        ];

        // 2. Real Clinic Doctors & Sessions
        $doctors = Doctor::where('is_active', true)
            ->orderBy('name')
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => $d->full_title,
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
                    'doctor_name' => $s->doctor ? $s->doctor->full_title : 'Doctor',
                    'doctor_specialty' => $s->doctor?->specialty ?? '',
                    'session_date' => $s->session_date->format('l, j M'),
                    'start_time' => Carbon::parse($s->start_time)->format('g:i A'),
                    'room_number' => $s->room_number ?? '',
                    'available_tokens_count' => max(0, $s->max_tokens - $bookedCount),
                    'is_full' => $bookedCount >= $s->max_tokens,
                    'total_fee_formatted' => 'Rs. '.number_format(($s->doctor_fee + $s->clinic_fee) / 100, 2),
                ];
            });

        // 3. Merge template tokens into clinic draft look
        $tokens = $template->definition['theme_tokens'] ?? [];
        $currentLook = ClinicWebsite::draftLook($tenant);
        $previewLook = array_merge($currentLook, [
            'theme' => $tokens['theme'] ?? $currentLook['theme'],
            'hero_style' => $tokens['hero_style'] ?? $currentLook['hero_style'],
            'font' => $tokens['font'] ?? $currentLook['font'],
            'button_style' => $tokens['button_style'] ?? $currentLook['button_style'],
            'mode' => $tokens['mode'] ?? $currentLook['mode'],
            'brand_color' => $tokens['brand_color'] ?? $currentLook['brand_color'],
        ]);

        $sections = ClinicWebsite::draftSections($tenant);
        $variants = $template->definition['section_variants'] ?? [];
        foreach ($sections as &$sec) {
            $type = $sec['type'] ?? $sec['id'];
            if (isset($variants[$type])) {
                $sec = array_merge($sec, $variants[$type]);
            }
        }
        unset($sec);

        $stats = ClinicWebsite::stats();
        $visibleIds = ClinicWebsite::visibleSectionIds($sections, [
            'doctors' => $doctors->count(),
            'sessions' => $upcomingSessions->count(),
            'stats' => $stats,
        ], $tenant);

        $contact = collect($sections)->firstWhere('type', 'contact') ?? [];
        $isEntitled = (bool) config('medvisit.templates_under_development', true) || $tenant->isTemplateEntitled($template);
        $allTemplates = WebsiteTemplate::active()->orderBy('sort_order')->get(['id', 'slug', 'name', 'tier', 'price_cents']);

        return Inertia::render('Website/Templates/Preview', [
            'template' => [
                'id' => $template->id,
                'slug' => $template->slug,
                'name' => $template->name,
                'tagline' => $template->tagline,
                'description' => $template->description,
                'tier' => $template->tier,
                'price_cents' => $template->price_cents,
                'price_formatted' => $template->formatted_price,
                'is_entitled' => $isEntitled,
                'custom_css' => $template->definition['custom_css'] ?? '',
                'animation_preset' => $template->definition['animation_preset'] ?? [],
            ],
            'availableTemplates' => $allTemplates,
            'clinic' => [
                'name' => (string) ($tenant->name ?? ''),
                'subdomain' => $tenant->subdomain,
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
            'look' => $previewLook,
            'stats' => $stats,
            'theme' => $previewLook['theme'],
            'doctors' => $doctors,
            'upcomingSessions' => $upcomingSessions,
            'siteKit' => SiteKit::resolveFor($tenant),
            'seo' => [
                'title' => "Preview {$template->name} — {$tenant->name}",
                'description' => $template->description,
            ],
        ]);
    }

    /**
     * Start one-time template checkout.
     */
    public function checkout(Request $request, string $slug): JsonResponse
    {
        $request->validate([
            'terms_accepted' => ['required', 'accepted'],
            'terms_version' => ['nullable', 'string', 'max:32'],
        ]);

        $template = WebsiteTemplate::where('slug', $slug)->firstOrFail();
        $tenant = tenant();
        $user = auth()->user();

        $result = $this->templateService->checkout($tenant, $user, $template, [
            'terms_accepted' => (bool) $request->input('terms_accepted'),
            'terms_version' => (string) $request->input('terms_version', '2026-10-28'),
        ]);

        return response()->json($result);
    }

    /**
     * Claim free template choice included with Advanced plan.
     */
    public function claimFree(Request $request, string $slug): JsonResponse
    {
        $template = WebsiteTemplate::where('slug', $slug)->firstOrFail();
        $tenant = tenant();
        $user = auth()->user();

        $purchase = $this->templateService->claimPlanIncluded($tenant, $user, $template);

        return response()->json([
            'ok' => true,
            'message' => "Successfully claimed {$template->name} as your free template choice!",
            'purchase' => $purchase,
        ]);
    }

    /**
     * Apply template to draft.
     */
    public function apply(Request $request, string $slug): JsonResponse
    {
        $template = WebsiteTemplate::where('slug', $slug)->firstOrFail();
        $tenant = tenant();

        $this->templateService->applyToDraft($tenant, $template);

        return response()->json([
            'ok' => true,
            'message' => "{$template->name} applied to your website draft. Click Publish when you are ready to go live.",
            'applied_template_id' => $template->id,
            'look' => ClinicWebsite::draftLook($tenant),
            'sections' => ClinicWebsite::draftSections($tenant),
        ]);
    }

    /**
     * Revert draft to previous design snapshot.
     */
    public function revert(Request $request): JsonResponse
    {
        $tenant = tenant();
        $reverted = $this->templateService->revertToPreviousDesign($tenant);

        if (! $reverted) {
            return response()->json([
                'ok' => false,
                'message' => 'No previous design snapshot found to revert to.',
            ], 422);
        }

        return response()->json([
            'ok' => true,
            'message' => 'Reverted to your previous website design snapshot.',
            'look' => ClinicWebsite::draftLook($tenant),
            'sections' => ClinicWebsite::draftSections($tenant),
            'applied_template_id' => $tenant->applied_template_id,
        ]);
    }
}
