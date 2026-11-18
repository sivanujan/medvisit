<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Support\SeoMeta;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicFeaturesController extends Controller
{
    /**
     * Show features page in English (/features).
     */
    public function index(Request $request): Response
    {
        return $this->renderLocale('en');
    }

    /**
     * Show features page in Tamil (/ta/features).
     */
    public function tamil(Request $request): Response
    {
        return $this->renderLocale('ta');
    }

    /**
     * Show features page in Sinhala (/si/features).
     */
    public function sinhala(Request $request): Response
    {
        return $this->renderLocale('si');
    }

    /**
     * Common renderer for the multilingual features page.
     */
    protected function renderLocale(string $locale): Response
    {
        $normalizedLocale = match ($locale) {
            'ta' => 'ta',
            'si' => 'si',
            default => 'en',
        };

        app()->setLocale($normalizedLocale);

        // Remember user language choice via cookie for 1 year
        cookie()->queue(cookie()->forever('medvisit_locale', $normalizedLocale));

        $seo = SeoMeta::forFeatures($normalizedLocale);

        $content = trans('features', [], $normalizedLocale);
        if (! is_array($content)) {
            $content = [];
        }

        $tiers = config('plans.tiers', []);
        $publicTiers = array_filter($tiers, fn ($t) => ($t['is_public'] ?? false) === true);

        return Inertia::render('Public/Features', [
            'currentLocale' => $normalizedLocale,
            'content' => $content,
            'plans' => $publicTiers,
            'prelaunchMode' => (bool) config('medvisit.prelaunch_mode', false),
            'whatsapp' => config('medvisit.contact.whatsapp'),
        ])->withViewData(['seo' => $seo->toViewData()]);
    }
}
