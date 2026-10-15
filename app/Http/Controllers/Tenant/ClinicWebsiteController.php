<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ClinicWebsiteController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('PlaceholderPage', [
            'title' => 'Clinic Website Builder',
            'description' => 'Visual section builder for your clinic public landing page: Hero, About, automated Doctor roster, weekly Channeling schedules, Services, Operating Hours, Gallery, and Contact Map.',
            'moduleKey' => 'website',
            'badge' => 'Phase 6 Preview',
            'features' => [
                'Live section drag-and-drop reordering with show/hide toggles',
                'Curated healthcare color themes and typography presets',
                'Real-time mobile and desktop preview panes',
                'Integrated public online token booking engine with rate limits',
            ],
        ]);
    }
}
