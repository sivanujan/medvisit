<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\VisitType;
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
    protected array $allDistricts = [
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
     * Display the paginated and indexed patient directory.
     */
    public function index(Request $request): Response
    {
        $tenantId = tenant('id');
        $user = $request->user();

        $search = trim((string) $request->query('search', ''));
        $district = $request->query('district');
        $gender = $request->query('gender');
        $ageRange = $request->query('age_range');
        $lastVisitFilter = $request->query('last_visit');
        $doctorId = $request->query('doctor_id');
        $sort = (string) $request->query('sort', 'recently_visited');
        $perPage = (int) $request->query('per_page', 25);
        if (! in_array($perPage, [25, 50, 100], true)) {
            $perPage = 25;
        }

        $query = Patient::where('tenant_id', $tenantId)
            ->withCount('tokens');

        // Instant search across name, phone (any format / normalized), NIC, city, or ID
        if ($search !== '') {
            $extractedId = null;
            if (preg_match('/^(?:#|P-|PAT-|PAT)?(\d+)$/i', $search, $matches)) {
                $extractedId = (int) $matches[1];
            }

            $normalizedPhoneSearch = Patient::normalizePhone($search);
            $cleanDigits = preg_replace('/\D/', '', $search);

            $query->where(function ($q) use ($search, $extractedId, $normalizedPhoneSearch, $cleanDigits) {
                if ($extractedId !== null) {
                    $q->orWhere('id', $extractedId);
                }

                $q->orWhere('name', 'ilike', "%{$search}%")
                    ->orWhere('city', 'ilike', "%{$search}%")
                    ->orWhere('nic', 'ilike', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%");

                if ($normalizedPhoneSearch) {
                    $q->orWhere('phone_normalized', $normalizedPhoneSearch);
                }

                if (! empty($cleanDigits) && strlen($cleanDigits) >= 4) {
                    $q->orWhere('phone_normalized', 'like', "%{$cleanDigits}%");
                }
            });
        }

        // District filter
        if ($district && $district !== 'all') {
            $query->where('district', $district);
        }

        // Gender filter
        if ($gender && in_array($gender, ['male', 'female', 'other'], true)) {
            $query->where('gender', $gender);
        }

        // Age range filter
        if ($ageRange) {
            $today = Carbon::today('Asia/Colombo');
            if ($ageRange === '<18') {
                $query->where('date_of_birth', '>', $today->copy()->subYears(18)->toDateString());
            } elseif ($ageRange === '18-35') {
                $query->whereBetween('date_of_birth', [
                    $today->copy()->subYears(35)->toDateString(),
                    $today->copy()->subYears(18)->toDateString(),
                ]);
            } elseif ($ageRange === '36-55') {
                $query->whereBetween('date_of_birth', [
                    $today->copy()->subYears(55)->toDateString(),
                    $today->copy()->subYears(36)->toDateString(),
                ]);
            } elseif ($ageRange === '55+') {
                $query->where('date_of_birth', '<=', $today->copy()->subYears(55)->toDateString());
            }
        }

        // Doctor seen filter
        if ($doctorId && is_numeric($doctorId)) {
            $query->whereHas('tokens.session', function ($sessionQ) use ($doctorId) {
                $sessionQ->where('doctor_id', (int) $doctorId);
            });
        }

        // Last visit filter
        if ($lastVisitFilter) {
            $nowColombo = Carbon::today('Asia/Colombo');
            if ($lastVisitFilter === 'today') {
                $query->whereHas('tokens', fn ($tq) => $tq->whereDate('created_at', $nowColombo));
            } elseif ($lastVisitFilter === 'this_week') {
                $query->whereHas('tokens', fn ($tq) => $tq->where('created_at', '>=', $nowColombo->copy()->subDays(7)));
            } elseif ($lastVisitFilter === '30_days') {
                $query->whereHas('tokens', fn ($tq) => $tq->where('created_at', '>=', $nowColombo->copy()->subDays(30)));
            } elseif ($lastVisitFilter === 'never') {
                $query->doesntHave('tokens');
            }
        }

        // Subquery for most recent visit timestamp for sorting
        $latestTokenSubquery = BookingToken::selectRaw('max(created_at)')
            ->whereColumn('booking_tokens.patient_id', 'patients.id');

        // Sorting
        if ($sort === 'name_asc') {
            $query->orderBy('name', 'asc');
        } elseif ($sort === 'newest_registered') {
            $query->orderBy('created_at', 'desc');
        } elseif ($sort === 'most_visits') {
            $query->orderBy('tokens_count', 'desc')->orderBy('name', 'asc');
        } else {
            // recently_visited (default)
            $query->orderByDesc($latestTokenSubquery)->orderByDesc('created_at');
        }

        // Find potential duplicates within the current tenant (same normalized phone OR same NIC)
        $duplicatePhoneValues = Patient::where('tenant_id', $tenantId)
            ->whereNotNull('phone_normalized')
            ->where('phone_normalized', '!=', '')
            ->select('phone_normalized')
            ->groupBy('phone_normalized')
            ->havingRaw('count(*) > 1')
            ->pluck('phone_normalized')
            ->all();

        $duplicateNicValues = Patient::where('tenant_id', $tenantId)
            ->whereNotNull('nic')
            ->where('nic', '!=', '')
            ->select('nic')
            ->groupBy('nic')
            ->havingRaw('count(*) > 1')
            ->pluck('nic')
            ->all();

        $duplicatePhoneMap = [];
        if (! empty($duplicatePhoneValues)) {
            $duplicatePhoneMap = Patient::where('tenant_id', $tenantId)
                ->whereIn('phone_normalized', $duplicatePhoneValues)
                ->pluck('phone_normalized', 'id')
                ->all();
        }

        $duplicateNicMap = [];
        if (! empty($duplicateNicValues)) {
            $duplicateNicMap = Patient::where('tenant_id', $tenantId)
                ->whereIn('nic', $duplicateNicValues)
                ->pluck('nic', 'id')
                ->all();
        }

        $now = Carbon::now('Asia/Colombo');

        // Paginate patients
        $patients = $query->paginate($perPage)->through(function ($p) use ($duplicatePhoneMap, $duplicateNicMap, $now) {
            $lastToken = $p->tokens()->latest('id')->first();

            // Correct relative date formatting ("Yesterday", "Today", "22 Oct", or "No visits yet")
            $lastVisitText = 'No visits yet';
            $lastVisitTimestamp = null;
            if ($lastToken && $lastToken->created_at) {
                $lastVisitTimestamp = $lastToken->created_at->toIso8601String();
                $diffDays = (int) $lastToken->created_at->diffInDays($now);
                if ($lastToken->created_at->isToday()) {
                    $lastVisitText = 'Today';
                } elseif ($lastToken->created_at->isYesterday()) {
                    $lastVisitText = 'Yesterday';
                } elseif ($diffDays < 7) {
                    $lastVisitText = $lastToken->created_at->format('D'); // e.g. "Mon"
                } elseif ($lastToken->created_at->year === $now->year) {
                    $lastVisitText = $lastToken->created_at->format('d M'); // e.g. "22 Oct"
                } else {
                    $lastVisitText = $lastToken->created_at->format('d M Y');
                }
            }

            // Determine possible duplicate status
            $isDuplicatePhone = isset($duplicatePhoneMap[$p->id]);
            $isDuplicateNic = isset($duplicateNicMap[$p->id]);
            $isPossibleDuplicate = $isDuplicatePhone || $isDuplicateNic;
            $duplicateReason = null;
            if ($isDuplicatePhone && $isDuplicateNic) {
                $duplicateReason = 'Same mobile & NIC shared with another record';
            } elseif ($isDuplicatePhone) {
                $duplicateReason = 'Same mobile shared with another record';
            } elseif ($isDuplicateNic) {
                $duplicateReason = 'Same NIC shared with another record';
            }

            // Correct plural visits
            $visitsCount = (int) $p->tokens_count;
            $visitsFormatted = $visitsCount === 1 ? '1 visit' : "{$visitsCount} visits";

            return [
                'id' => $p->id,
                'formatted_id' => 'PAT-'.str_pad((string) $p->id, 5, '0', STR_PAD_LEFT),
                'name' => $p->name,
                // Normalized E.164 phone
                'phone_normalized' => $p->phone_normalized ?: Patient::normalizePhone($p->phone),
                // Formatted phone for display as "077 123 4567"
                'phone_display' => Patient::formatPhoneDisplay($p->phone_normalized ?: $p->phone),
                'phone_raw' => $p->phone,
                // Masked NIC in list response: full NIC is NEVER sent in directory list for privacy
                'nic_masked' => Patient::maskNic($p->nic),
                'email' => $p->email,
                'gender' => $p->gender ?? 'other',
                'date_of_birth' => $p->date_of_birth ? $p->date_of_birth->format('Y-m-d') : null,
                'age' => $p->date_of_birth ? $p->date_of_birth->age : null,
                'district' => $p->district,
                'city' => $p->city,
                // Location formatting: "Battaramulla, Colombo" or "Colombo" (never "–," or ", Colombo")
                'location_display' => Patient::formatLocation($p->city, $p->district),
                'address' => $p->address,
                'allergies' => $p->allergies,
                'notes' => $p->notes,
                'emergency_contact_name' => $p->emergency_contact_name,
                'emergency_contact_phone' => $p->emergency_contact_phone,
                'tokens_count' => $visitsCount,
                'visits_formatted' => $visitsFormatted,
                'last_visit' => $lastVisitText,
                'last_visit_timestamp' => $lastVisitTimestamp,
                'has_visits' => $visitsCount > 0,
                'is_possible_duplicate' => $isPossibleDuplicate,
                'duplicate_reason' => $duplicateReason,
                'created_at' => $p->created_at?->format('d M Y'),
            ];
        });

        // Small Header Stats
        $todayStart = Carbon::today('Asia/Colombo');
        $monthStart = Carbon::now('Asia/Colombo')->startOfMonth();

        $totalPatients = Patient::where('tenant_id', $tenantId)->count();
        $newThisMonth = Patient::where('tenant_id', $tenantId)
            ->where('created_at', '>=', $monthStart)
            ->count();
        $visitedToday = BookingToken::where('tenant_id', $tenantId)
            ->whereDate('created_at', $todayStart)
            ->distinct('patient_id')
            ->count('patient_id');

        // Only districts IN USE with counts
        $inUseDistricts = Patient::where('tenant_id', $tenantId)
            ->whereNotNull('district')
            ->where('district', '!=', '')
            ->where('district', '!=', '—')
            ->selectRaw('district, count(*) as count')
            ->groupBy('district')
            ->orderBy('district')
            ->get()
            ->map(fn ($row) => [
                'name' => $row->district,
                'count' => (int) $row->count,
            ]);

        // Active doctors for filter & quick token issue
        $doctors = Doctor::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'title', 'name', 'specialty', 'doctor_fee', 'clinic_fee', 'avg_consultation_minutes'])
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => trim(($d->title ?? 'Dr.').' '.$d->name),
                'specialty' => $d->specialty,
                'avg_consultation_minutes' => $d->avg_consultation_minutes,
                'doctor_fee_lkr' => round($d->doctor_fee / 100, 2),
                'clinic_fee_lkr' => round($d->clinic_fee / 100, 2),
                'total_fee_lkr' => round(($d->doctor_fee + $d->clinic_fee) / 100, 2),
            ]);

        // Active visit types
        $visitTypes = VisitType::where('tenant_id', $tenantId)
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->get(['id', 'name', 'code', 'pricing_type', 'percentage_value', 'fixed_fee_cents', 'is_default']);

        // Check user role permissions
        $canRevealNic = $user && ($user->hasRole('clinic_admin') || $user->hasRole('doctor') || $user->hasRole('super_admin'));
        $canViewPrescriptions = $user && ($user->hasRole('clinic_admin') || $user->hasRole('doctor') || $user->hasRole('super_admin'));
        $canExport = $user && ($user->hasRole('clinic_admin') || $user->hasRole('super_admin'));

        return Inertia::render('Patients/Index', [
            'patients' => $patients,
            'filters' => [
                'search' => $search,
                'district' => $district ?? 'all',
                'gender' => $gender ?? 'all',
                'age_range' => $ageRange ?? 'all',
                'last_visit' => $lastVisitFilter ?? 'all',
                'doctor_id' => $doctorId ?? 'all',
                'sort' => $sort,
                'per_page' => $perPage,
            ],
            'stats' => [
                'total_patients' => $totalPatients,
                'new_this_month' => $newThisMonth,
                'visited_today' => $visitedToday,
            ],
            'inUseDistricts' => $inUseDistricts,
            'allDistricts' => $this->allDistricts,
            'doctors' => $doctors,
            'visitTypes' => $visitTypes,
            'userPermissions' => [
                'can_reveal_nic' => $canRevealNic,
                'can_view_prescriptions' => $canViewPrescriptions,
                'can_export' => $canExport,
                'role' => $user?->roles->pluck('name')->first() ?? 'receptionist',
            ],
        ]);
    }

    /**
     * Reveal full unmasked NIC for an authorized user, with audit logging.
     */
    public function revealNic(Request $request, Patient $patient): JsonResponse
    {
        $tenantId = tenant('id');
        if ($patient->tenant_id !== $tenantId) {
            abort(404);
        }

        $user = $request->user();
        $isAllowed = $user && (
            $user->hasRole('clinic_admin') ||
            $user->hasRole('doctor') ||
            $user->hasRole('super_admin')
        );

        if (! $isAllowed) {
            return response()->json([
                'message' => 'Your role is not authorized to reveal full patient national identity card numbers.',
            ], 403);
        }

        // Audit log the reveal event
        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $user?->id,
            'action' => 'patient.nic_revealed',
            'resource_type' => 'patient',
            'resource_id' => (string) $patient->id,
            'metadata' => [
                'patient_name' => $patient->name,
                'nic_masked' => Patient::maskNic($patient->nic),
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'nic' => $patient->nic ?: '—',
        ]);
    }

    /**
     * Retrieve complete patient visit timeline & records for the slide-over panel.
     */
    public function history(Request $request, Patient $patient): JsonResponse
    {
        $tenantId = tenant('id');
        if ($patient->tenant_id !== $tenantId) {
            abort(404);
        }

        $user = $request->user();

        // Audit log
        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $user?->id,
            'action' => 'patient.viewed',
            'resource_type' => 'patient',
            'resource_id' => (string) $patient->id,
            'metadata' => ['patient_name' => $patient->name],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        // Permissions
        $canViewPrescriptions = $user && ($user->hasRole('clinic_admin') || $user->hasRole('doctor') || $user->hasRole('super_admin'));
        $canRevealNic = $user && ($user->hasRole('clinic_admin') || $user->hasRole('doctor') || $user->hasRole('super_admin'));

        $today = Carbon::today('Asia/Colombo');

        // Past and completed visits
        $tokens = $patient->tokens()
            ->with(['session.doctor', 'bill'])
            ->latest('id')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'token_number' => $t->token_number,
                'doctor_name' => trim(($t->session?->doctor?->title ?? 'Dr.').' '.($t->session?->doctor?->name ?? 'Doctor')),
                'doctor_specialty' => $t->session?->doctor?->specialty ?? 'General',
                'session_date' => $t->session?->session_date?->format('d M Y') ?? '—',
                'room_number' => $t->session?->room_number ?? 'Suite 1',
                'status' => $t->status,
                'booked_via' => $t->booked_via,
                'estimated_time' => $t->estimated_time ? Carbon::parse($t->estimated_time)->format('h:i A') : '—',
                'receipt_number' => $t->bill?->receipt_number ?? null,
                'bill_amount' => $t->bill ? $t->bill->total_amount : null,
                'bill_amount_formatted' => $t->bill ? 'Rs. '.number_format($t->bill->total_amount / 100, 2) : '—',
                'payment_status' => $t->bill?->payment_status ?? 'pending',
                'created_at_formatted' => $t->created_at->format('d M Y, h:i A'),
            ]);

        // Upcoming booked tokens
        $upcomingTokens = $patient->tokens()
            ->with(['session.doctor'])
            ->whereHas('session', fn ($sq) => $sq->where('session_date', '>=', $today->toDateString()))
            ->whereIn('status', ['booked', 'checked_in'])
            ->orderBy('id', 'asc')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'token_number' => $t->token_number,
                'doctor_name' => trim(($t->session?->doctor?->title ?? 'Dr.').' '.($t->session?->doctor?->name ?? 'Doctor')),
                'doctor_specialty' => $t->session?->doctor?->specialty ?? 'General',
                'session_date' => $t->session?->session_date?->format('d M Y') ?? '—',
                'room_number' => $t->session?->room_number ?? 'Suite 1',
                'status' => $t->status,
                'estimated_time' => $t->estimated_time ? Carbon::parse($t->estimated_time)->format('h:i A') : '—',
            ]);

        // Prescriptions (only for allowed roles: doctor, clinic_admin, super_admin)
        $prescriptions = [];
        if ($canViewPrescriptions) {
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
                    'date' => $p->finalized_at?->format('d M Y') ?? $p->created_at->format('d M Y'),
                    'doctor_name' => $p->doctor ? trim(($p->doctor->title ?? 'Dr.').' '.$p->doctor->name) : 'Doctor',
                    'diagnosis' => $p->diagnosis,
                    'print_url' => route('tenant.doctor.prescriptions.print', $p->id),
                    'items' => $p->items->map(fn ($it) => [
                        'display_name' => $it->display_name,
                        'dose' => $it->dose_display,
                        'frequency' => $it->frequency,
                        'timing' => $it->timing,
                        'duration_days' => $it->duration_days,
                    ]),
                ]);
        }

        // Bills
        $bills = $patient->bills()
            ->latest('id')
            ->get()
            ->map(fn ($b) => [
                'id' => $b->id,
                'receipt_number' => $b->receipt_number,
                'amount_formatted' => 'Rs. '.number_format($b->total_amount / 100, 2),
                'amount' => $b->total_amount,
                'payment_status' => $b->payment_status,
                'date' => $b->created_at->format('d M Y, h:i A'),
            ]);

        // Possible duplicate check
        $normalizedPhone = $patient->phone_normalized ?: Patient::normalizePhone($patient->phone);
        $duplicatePhoneMatches = Patient::where('tenant_id', $tenantId)
            ->where('id', '!=', $patient->id)
            ->whereNotNull('phone_normalized')
            ->where('phone_normalized', $normalizedPhone)
            ->get(['id', 'name', 'nic', 'phone']);

        $duplicateNicMatches = collect();
        if (! empty($patient->nic)) {
            $duplicateNicMatches = Patient::where('tenant_id', $tenantId)
                ->where('id', '!=', $patient->id)
                ->whereNotNull('nic')
                ->where('nic', $patient->nic)
                ->get(['id', 'name', 'nic', 'phone']);
        }

        $isDuplicate = $duplicatePhoneMatches->isNotEmpty() || $duplicateNicMatches->isNotEmpty();

        return response()->json([
            'patient' => [
                'id' => $patient->id,
                'formatted_id' => 'PAT-'.str_pad((string) $patient->id, 5, '0', STR_PAD_LEFT),
                'name' => $patient->name,
                'phone_normalized' => $normalizedPhone,
                'phone_display' => Patient::formatPhoneDisplay($normalizedPhone),
                'phone_raw' => $patient->phone,
                'nic_masked' => Patient::maskNic($patient->nic),
                'email' => $patient->email,
                'gender' => $patient->gender ?? 'other',
                'date_of_birth' => $patient->date_of_birth ? $patient->date_of_birth->format('Y-m-d') : null,
                'age' => $patient->date_of_birth ? $patient->date_of_birth->age : null,
                'district' => $patient->district,
                'city' => $patient->city,
                'location_display' => Patient::formatLocation($patient->city, $patient->district),
                'address' => $patient->address,
                'allergies' => $patient->allergies,
                'notes' => $patient->notes,
                'emergency_contact_name' => $patient->emergency_contact_name,
                'emergency_contact_phone' => $patient->emergency_contact_phone,
                'registered_date' => $patient->created_at->format('d M Y'),
                'is_possible_duplicate' => $isDuplicate,
                'duplicate_matches' => [
                    'by_phone' => $duplicatePhoneMatches->map(fn ($m) => ['id' => $m->id, 'name' => $m->name, 'nic' => Patient::maskNic($m->nic)]),
                    'by_nic' => $duplicateNicMatches->map(fn ($m) => ['id' => $m->id, 'name' => $m->name, 'nic' => Patient::maskNic($m->nic)]),
                ],
            ],
            'visits' => $tokens,
            'upcoming' => $upcomingTokens,
            'prescriptions' => $prescriptions,
            'can_view_prescriptions' => $canViewPrescriptions,
            'can_reveal_nic' => $canRevealNic,
            'permissions' => [
                'can_view_prescriptions' => $canViewPrescriptions,
                'can_reveal_nic' => $canRevealNic,
            ],
        ]);
    }

    /**
     * Store a newly created patient with phone normalization.
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

        $tenantId = tenant('id');
        $normalizedPhone = Patient::normalizePhone($validated['phone']);

        $patient = Patient::create(array_merge($validated, [
            'tenant_id' => $tenantId,
            'phone_normalized' => $normalizedPhone,
        ]));

        // Audit log
        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()?->id,
            'action' => 'patient.created',
            'resource_type' => 'patient',
            'resource_id' => (string) $patient->id,
            'metadata' => [
                'name' => $patient->name,
                'phone_normalized' => $patient->phone_normalized,
            ],
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
        $tenantId = tenant('id');
        if ($patient->tenant_id !== $tenantId) {
            abort(404);
        }

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

        $validated['phone_normalized'] = Patient::normalizePhone($validated['phone']);

        $patient->update($validated);

        // Audit log
        AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $request->user()?->id,
            'action' => 'patient.updated',
            'resource_type' => 'patient',
            'resource_id' => (string) $patient->id,
            'metadata' => [
                'name' => $patient->name,
                'updated_fields' => array_keys($validated),
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()->back()->with('success', "Patient {$patient->name} updated successfully.");
    }
}
