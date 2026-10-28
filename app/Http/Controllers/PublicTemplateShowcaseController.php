<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\WebsiteTemplate;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicTemplateShowcaseController extends Controller
{
    /**
     * Public Clinic Website Templates Showcase (/templates).
     */
    public function index(Request $request): Response
    {
        $templates = WebsiteTemplate::active()
            ->orderBy('sort_order')
            ->get()
            ->map(fn (WebsiteTemplate $t) => [
                'id' => $t->id,
                'slug' => $t->slug,
                'name' => $t->name,
                'tagline' => $t->tagline,
                'description' => $t->description,
                'tier' => $t->tier,
                'price_cents' => $t->price_cents,
                'price_formatted' => $t->formatted_price,
                'version' => $t->version,
                'tags' => $t->tags ?? [],
                'preview_images' => $t->preview_images ?? [],
                'supports' => $t->supports ?? ['section_editor'],
                'is_free' => $t->tier === WebsiteTemplate::TIER_FREE || $t->price_cents === 0,
            ]);

        return Inertia::render('Public/Templates', [
            'templates' => $templates,
            'meta' => [
                'title' => 'Designer Clinic Website Templates — MedVisit',
                'description' => 'Browse beautiful, high-converting animated website templates crafted specifically for Sri Lankan medical centers, specialist suites, family practices, and dental clinics.',
            ],
        ]);
    }

    /**
     * Public live interactive demo preview of a template using the demo clinic data.
     */
    public function demoPreview(Request $request): Response
    {
        $slug = (string) ($request->route('slug') ?? $request->query('slug'));
        $template = WebsiteTemplate::where('slug', $slug)->firstOrFail();
        $demoTenant = Tenant::where('is_demo', true)->first() ?? Tenant::first();

        return Inertia::render('Public/Templates/DemoPreview', [
            'template' => [
                'id' => $template->id,
                'slug' => $template->slug,
                'name' => $template->name,
                'tagline' => $template->tagline,
                'description' => $template->description,
                'tier' => $template->tier,
                'price_formatted' => $template->formatted_price,
                'tags' => $template->tags ?? [],
                'definition' => $template->definition,
            ],
            'demoClinic' => [
                'name' => $demoTenant?->name ?? 'City Health Family Practice',
                'subdomain' => $demoTenant?->subdomain ?? 'cityhealth',
                'phone' => $demoTenant?->phone ?? config('medvisit_public.business.phone_display', '070 129 1688'),
                'address' => $demoTenant?->address ?? 'Colombo 03, Sri Lanka',
            ],
        ]);
    }
}
