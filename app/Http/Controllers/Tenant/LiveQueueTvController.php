<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LiveQueueTvController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('PlaceholderPage', [
            'title' => 'Waiting Room TV Display',
            'description' => 'Dedicated widescreen television display for the clinic patient waiting lounge. Features ultra-high contrast "Now Serving" tokens, upcoming patient tokens, auto-refreshing polling, and audible audio chimes.',
            'moduleKey' => 'tv_queue',
            'badge' => 'Phase 3 Preview',
            'features' => [
                'Full-screen kiosk mode optimized for 1080p and 4K waiting-room televisions',
                'Huge, readable "Now Serving" token number with doctor and consultation room details',
                'Next 3 tokens in line with estimated arrival guidance',
                'Automated 5-second polling synchronization and audio chime on token call',
            ],
        ]);
    }
}
