<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TodayQueueController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('PlaceholderPage', [
            'title' => "Today's Channeling Queue",
            'description' => 'Live operational queue desk with token progression, patient check-in, doctor room calls, recall, and no-show management.',
            'moduleKey' => 'today_queue',
            'badge' => 'Phase 3 Preview',
            'features' => [
                'Live per-session token queue monitor',
                'One-click Check-in, Call next, Recall, Skip, and Complete',
                'Doctor-specific queue view with quick "Complete & Next"',
                'Instant status sync and token elapsed time tracking',
            ],
        ]);
    }
}
