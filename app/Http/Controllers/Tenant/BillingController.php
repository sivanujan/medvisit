<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BillingController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('PlaceholderPage', [
            'title' => 'Billing & Collections',
            'description' => 'Clinical cash desk management: collect payments at token issuance or post-consultation, support cash/card/bank transfer, issue sequential receipts, and generate doctor-fee vs. clinic-fee collection reports.',
            'moduleKey' => 'billing',
            'badge' => 'Phase 4 Preview',
            'features' => [
                'Support for Cash, Card, and Bank Transfer with transaction references',
                'Discount management with mandatory clinical justification notes',
                'Printable 80mm thermal slips and standard A4 formal tax invoices',
                'End-of-day revenue reconciliation and doctor disbursement split reports',
            ],
        ]);
    }
}
