<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class BookingTokenController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('PlaceholderPage', [
            'title' => 'Issue Token & Bookings',
            'description' => 'Fast reception token issuance desk: select doctor session, find patient by +94 mobile or Sri Lankan NIC, generate atomic token, and issue print slip or WhatsApp confirmation.',
            'moduleKey' => 'bookings',
            'badge' => 'Phase 3 Preview',
            'features' => [
                'Fast doctor & session channeling selector',
                'Patient lookup by +94 mobile, NIC, or instant quick-registration',
                'Atomic token sequencing with concurrency safety',
                'Printable 80mm thermal token slip and instant WhatsApp confirmation link',
            ],
        ]);
    }
}
