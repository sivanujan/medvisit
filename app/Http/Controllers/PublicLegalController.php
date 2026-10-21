<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PublicLegalController extends Controller
{
    /**
     * Display the public pricing page.
     */
    public function pricing(Request $request): Response
    {
        return Inertia::render('Public/Pricing', [
            'config' => config('medvisit_public'),
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
