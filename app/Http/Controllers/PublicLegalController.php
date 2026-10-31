<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Services\PlatformSettingsService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Inertia\Inertia;
use Inertia\Response;

class PublicLegalController extends Controller
{
    /**
     * Display the public pricing page.
     */
    public function pricing(Request $request): Response
    {
        $settings = app(PlatformSettingsService::class)->all();
        $isLaunchOfferActive = (bool) ($settings['launch_offer.enabled'] ?? false)
            && (empty($settings['launch_offer.end_date']) || now()->lte(Carbon::parse($settings['launch_offer.end_date'])));

        $launchOffer = [
            'is_active' => $isLaunchOfferActive,
            'free_months' => (int) ($settings['launch_offer.free_months'] ?? 3),
            'end_date' => $settings['launch_offer.end_date'] ?? null,
            'sms_cap' => (int) ($settings['launch_offer.sms_cap'] ?? 500),
        ];

        $plans = Plan::where('is_active', true)
            ->where('is_public', true)
            ->orderBy('price_cents', 'asc')
            ->get()
            ->map(function (Plan $plan) {
                $configTier = config("plans.tiers.{$plan->slug}", []);

                return [
                    'id' => $plan->slug,
                    'name' => $plan->name,
                    'slug' => $plan->slug,
                    'price' => (int) round($plan->price_cents / 100),
                    'price_formatted' => $plan->formatted_price,
                    'price_cents' => $plan->price_cents,
                    'interval' => 'per month',
                    'target' => 'per clinic',
                    'badge' => $configTier['badge'] ?? ($plan->slug === 'pro' ? 'Most popular' : null),
                    'description' => $plan->description ?: ($configTier['description'] ?? null),
                    'limits' => $plan->limits ?? ($configTier['limits'] ?? []),
                    'features' => $plan->features ?? ($configTier['features'] ?? []),
                    'highlighted_bullets' => $configTier['highlighted_bullets'] ?? [],
                ];
            });

        return Inertia::render('Public/Pricing', [
            'config' => config('medvisit_public'),
            'plans' => $plans,
            'launchOffer' => $launchOffer,
        ]);
    }

    /**
     * Display the public Terms and Conditions.
     */
    public function terms(Request $request): Response
    {
        return Inertia::render('Public/Legal/Terms', [
            'config' => config('medvisit_public'),
        ]);
    }

    /**
     * Display the public Refund and Cancellation Policy.
     */
    public function refundPolicy(Request $request): Response
    {
        return Inertia::render('Public/Legal/RefundPolicy', [
            'config' => config('medvisit_public'),
        ]);
    }

    /**
     * Display the public Dispute Resolution Policy.
     */
    public function disputePolicy(Request $request): Response
    {
        return Inertia::render('Public/Legal/DisputePolicy', [
            'config' => config('medvisit_public'),
        ]);
    }

    /**
     * Display the public Privacy Policy.
     */
    public function privacyPolicy(Request $request): Response
    {
        return Inertia::render('Public/Legal/PrivacyPolicy', [
            'config' => config('medvisit_public'),
        ]);
    }
}
