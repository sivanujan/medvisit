<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Patient;
use App\Models\Prescription;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PatientController extends Controller
{
    /**
     * Sri Lankan 25 administrative districts.
     */
    protected array $districts = [
        'Colombo', 'Gampaha', 'Kalutara',
        'Kandy', 'Matale', 'Nuwara Eliya',
        'Galle', 'Matara', 'Hambantota',
        'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu',
        'Batticaloa', 'Ampara', 'Trincomalee',
        'Kurunegala', 'Puttalam',
        'Anuradhapura', 'Polonnaruwa',
        'Badulla', 'Monaragala',
        'Ratnapura', 'Kegalle',
    ];

    /**
     * Display the patient directory.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $district = $request->query('district');

        $query = Patient::withCount('tokens')
            ->orderBy('name');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('nic', 'like', "%{$search}%")
                    ->orWhere('city', 'ilike', "%{$search}%");
            });
        }

        if ($district) {
            $query->where('district', $district);
        }

        $patients = $query->paginate(25)->through(function ($p) {
            $lastToken = $p->tokens()->latest('id')->first();

            return [
                'id' => $p->id,
                'name' => $p->name,
                'phone' => $p->phone,
                'nic' => $p->nic ?? '—',
                'email' => $p->email,
                'gender' => $p->gender ?? 'other',
                'date_of_birth' => $p->date_of_birth ? $p->date_of_birth->format('Y-m-d') : null,
                'age' => $p->date_of_birth ? $p->date_of_birth->age : null,
                'district' => $p->district ?? 'Colombo',
                'city' => $p->city ?? '—',
                'address' => $p->address,
                'allergies' => $p->allergies,
                'notes' => $p->notes,
                'emergency_contact_name' => $p->emergency_contact_name,
                'emergency_contact_phone' => $p->emergency_contact_phone,
                'tokens_count' => $p->tokens_count,
                'last_visit' => $lastToken ? $lastToken->created_at->format('M d, Y') : 'Never',
            ];
        });

        return Inertia::render('Patients/Index', [
            'patients' => $patients,
            'filters' => [
                'search' => $search,
                'district' => $district,
            ],
            'districts' => $this->districts,
        ]);
    }

    /**
     * Store a newly created patient.
     */
    public function store(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'nic' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'gender' => ['nullable', 'string', 'in:male,female,other'],
            'date_of_birth' => ['nullable', 'date'],
            'district' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string'],
            'allergies' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:30'],
        ]);

        $patient = Patient::create(array_merge($validated, [
            'tenant_id' => tenant('id'),
        ]));

        // Audit log
        AuditEvent::create([
            'tenant_id' => tenant('id'),
            'user_id' => $request->user()?->id,
            'action' => 'patient.created',
            'resource_type' => 'patient',
            'resource_id' => (string) $patient->id,
            'metadata' => ['name' => $patient->name, 'phone' => $patient->phone],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->back()->with('success', "Patient {$patient->name} registered successfully.");
    }

    /**
     * Update an existing patient record and log patient.updated audit.
     */
    public function update(Request $request, Patient $patient): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'nic' => ['nullable', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:255'],
            'gender' => ['nullable', 'string', 'in:male,female,other'],
            'date_of_birth' => ['nullable', 'date'],
            'district' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string'],
            'allergies' => ['nullable', 'string'],
            'notes' => ['nullable', 'string'],
            'emergency_contact_name' => ['nullable', 'string', 'max:255'],
            'emergency_contact_phone' => ['nullable', 'string', 'max:30'],
        ]);

        $patient->update($validated);

        // Audit log
        AuditEvent::create([
            'tenant_id' => tenant('id'),
            'user_id' => $request->user()?->id,
            'action' => 'patient.updated',
            'resource_type' => 'patient',
            'resource_id' => (string) $patient->id,
            'metadata' => ['name' => $patient->name, 'updated_fields' => array_keys($validated)],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->back()->with('success', "Patient {$patient->name} updated successfully.");
    }

    /**
     * Retrieve complete patient visit timeline & log patient.viewed audit.
     */
    public function history(Request $request, Patient $patient): JsonResponse
    {
        // Audit log
        AuditEvent::create([
            'tenant_id' => tenant('id'),
            'user_id' => $request->user()?->id,
            'action' => 'patient.viewed',
            'resource_type' => 'patient',
            'resource_id' => (string) $patient->id,
            'metadata' => ['patient_name' => $patient->name],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        $tokens = $patient->tokens()
            ->with(['session.doctor', 'bill'])
            ->latest('id')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'token_number' => $t->token_number,
                'doctor_name' => trim(($t->session?->doctor?->title ?? 'Dr.').' '.($t->session?->doctor?->name ?? 'Doctor')),
                'doctor_specialty' => $t->session?->doctor?->specialty ?? 'General',
                'session_date' => $t->session?->session_date?->format('M d, Y') ?? '—',
                'room_number' => $t->session?->room_number ?? 'Suite 1',
                'status' => $t->status,
                'booked_via' => $t->booked_via,
                'estimated_time' => $t->estimated_time ? Carbon::parse($t->estimated_time)->format('h:i A') : '—',
                'receipt_number' => $t->bill?->receipt_number ?? null,
                'total_amount_formatted' => $t->bill ? 'Rs. '.number_format($t->bill->total_amount / 100, 2) : '—',
                'payment_status' => $t->bill?->payment_status ?? 'pending',
                'created_at_formatted' => $t->created_at->format('M d, Y h:i A'),
            ]);

        $prescriptions = $patient->prescriptions()
            ->with(['doctor', 'items'])
            ->whereIn('status', [
                Prescription::STATUS_FINALIZED,
                Prescription::STATUS_PARTIALLY_DISPENSED,
                Prescription::STATUS_DISPENSED,
            ])
            ->latest('finalized_at')
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'prescription_number' => $p->prescription_number,
                'date' => $p->finalized_at?->format('d/m/Y') ?? $p->created_at->format('d/m/Y'),
                'doctor_name' => $p->doctor ? trim(($p->doctor->title ?? 'Dr.').' '.$p->doctor->name) : 'Doctor',
                'diagnosis' => $p->diagnosis,
                'items' => $p->items->map(fn ($it) => [
                    'display_name' => $it->display_name,
                    'dose' => $it->dose_display,
                    'frequency' => $it->frequency,
                    'timing' => $it->timing,
                    'duration_days' => $it->duration_days,
                ]),
            ]);

        return response()->json([
            'patient' => [
                'id' => $patient->id,
                'name' => $patient->name,
                'phone' => $patient->phone,
                'nic' => $patient->nic,
                'email' => $patient->email,
                'gender' => $patient->gender,
                'district' => $patient->district,
                'city' => $patient->city,
                'allergies' => $patient->allergies,
                'notes' => $patient->notes,
            ],
            'visits' => $tokens,
            'prescriptions' => $prescriptions,
        ]);
    }
}
