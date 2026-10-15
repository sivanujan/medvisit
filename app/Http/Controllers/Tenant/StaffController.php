<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class StaffController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('PlaceholderPage', [
            'title' => 'Staff & Team Access',
            'description' => 'Manage clinic team members, invite medical doctors and desk receptionists via branded Resend email invitations, configure permissions, and monitor active workstation logins.',
            'moduleKey' => 'staff',
            'badge' => 'Phase 5 Preview',
            'features' => [
                'Clinic team roster with status badges (Active, Invited, Deactivated)',
                'Automated email invitations via Resend with secure one-time setup tokens',
                'Role-based permissions with strict safeguards preventing lockout of the final admin',
                'Seamless linkage between doctor staff users and clinical doctor profiles',
            ],
        ]);
    }
}
