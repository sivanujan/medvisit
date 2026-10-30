<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\AgreementAcceptance;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class AgreementAcceptanceController extends Controller
{
    /**
     * Accept the updated legal agreements.
     */
    public function accept(Request $request): RedirectResponse
    {
        $request->validate([
            'terms' => ['accepted'],
            'agreement_authority' => ['accepted'],
        ], [
            'terms.accepted' => 'You must agree to the Terms & Conditions, Privacy Policy, Refund Policy and Dispute Policy to continue.',
            'agreement_authority.accepted' => 'You must confirm that you are authorised and responsible for clinic information and patient data.',
        ]);

        $user = $request->user();

        if (! $user) {
            return redirect()->route('login');
        }

        AgreementAcceptance::create([
            'user_id' => $user->id,
            'tenant_id' => (string) ($user->tenant_id ?? 'central'),
            'terms_version' => (string) config('legal.versions.terms', '2026-10-28'),
            'privacy_version' => (string) config('legal.versions.privacy', '2026-10-27'),
            'refund_version' => (string) config('legal.versions.refund', '2026-10-28'),
            'dispute_version' => (string) config('legal.versions.dispute', '2026-10-21'),
            'accepted_at' => now(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return back()->with('status', 'Agreements accepted successfully.');
    }
}
