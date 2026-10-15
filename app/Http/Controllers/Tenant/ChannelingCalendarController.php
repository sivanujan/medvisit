<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ChannelingCalendarController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('PlaceholderPage', [
            'title' => 'Channeling Calendar',
            'description' => 'Interactive Day, Week, and Month channeling schedule with doctor filters, color badges, booked/max token quotas, and session rosters.',
            'moduleKey' => 'calendar',
            'badge' => 'Phase 2 Preview',
            'features' => [
                'Day, Week, and Month interactive calendar views',
                'Doctor color-coded channeling blocks with real-time token capacity',
                'Click-to-view session roster and patient token details',
                'Reschedule session workflow with patient notification protections',
            ],
        ]);
    }
}
