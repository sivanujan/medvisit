<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PatientController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('PlaceholderPage', [
            'title' => 'Patient Directory',
            'description' => 'Comprehensive patient registry with national identity (NIC), contact numbers (+94), Sri Lankan district/city, allergy warnings, clinical notes, and token visit histories.',
            'moduleKey' => 'patients',
            'badge' => 'Phase 4 Preview',
            'features' => [
                'Fast lookup by name, phone (+94), or National Identity Card (NIC)',
                'Medical alert badges for severe drug and food allergies',
                'Visit timeline with previous channeling sessions and token receipts',
                'Strict audit logging on every patient record viewed or modified',
            ],
        ]);
    }
}
