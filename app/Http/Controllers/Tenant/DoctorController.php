<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DoctorController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('PlaceholderPage', [
            'title' => 'Doctors & Schedules',
            'description' => 'Manage medical practitioners, SLMC registration details, consultation fees, weekly recurring session templates, and one-off channeling dates.',
            'moduleKey' => 'doctors',
            'badge' => 'Phase 2 Preview',
            'features' => [
                'Doctor directory with SLMC verification numbers and specialties',
                'Customizable doctor channeling fee and clinic consultation fee splits',
                'Weekly recurring schedule templates with automated 30-day generation',
                'Doctor leave management and session cancellation handling',
            ],
        ]);
    }
}
