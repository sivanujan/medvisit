<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClinicSettingsController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('PlaceholderPage', [
            'title' => 'Clinic Settings & Audit Trail',
            'description' => 'Configure clinical practice parameters: clinic profile, branding & logo, channeling consultation rules, payment timings, and searchable system audit log viewer.',
            'moduleKey' => 'settings',
            'badge' => 'Phase 7 Preview',
            'features' => [
                'Clinic branding: name, registered healthcare license, contact and address',
                'Global channeling parameters: default token limits and consultation intervals',
                'Billing rules: payment collection at token issuance vs. post-consultation',
                'Immutable clinical audit trail tracking user logins, token changes, and patient views',
            ],
        ]);
    }
}
