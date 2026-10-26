<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant\Doctor;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\ClinicMedicine;
use App\Models\DiagnosisTag;
use App\Models\Doctor;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionTemplate;
use App\Services\AuditLogger;
use App\Services\Pdf\ChromiumPdfService;
use App\Services\Pharmacy\DispenseService;
use App\Services\Pharmacy\DoseCalculatorService;
use App\Services\SequenceService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class ConsultationController extends Controller
{
    public function __construct(
        protected SequenceService $sequenceService,
        protected DoseCalculatorService $doseCalculator,
        protected DispenseService $dispenseService
    ) {}

    /**
     * Display the mobile-first consultation workspace for a patient visit.
     */
    public function show(Request $request, BookingToken $token): Response
    {
        $tenant = tenant();
        $tenantId = $tenant->id;
        abort_unless($token->tenant_id === $tenantId, 404);

        $user = $request->user();
        abort_unless(
            $user->can('prescriptions.create') || $user->can('prescriptions.view'),
            403,
            'You do not have permission to view or manage consultations.'
        );

        $token->load(['patient', 'doctorSession.doctor', 'bill.items']);

        // Doctor ownership check: A doctor can only view/manage consultations assigned to them
        $isDoctor = $user->hasRole('doctor');
        $currentDoctor = $isDoctor ? Doctor::where('user_id', $user->id)->first() : null;

        if ($isDoctor && $currentDoctor) {
            $sessionDoctorId = $token->doctorSession?->doctor_id;
            if ($sessionDoctorId && $sessionDoctorId !== $currentDoctor->id) {
                abort(403, 'You are not assigned to this patient consultation.');
            }
        }

        // Find or initialize draft prescription
        $prescription = Prescription::where('tenant_id', $tenantId)
            ->where('booking_token_id', $token->id)
            ->where('status', '!=', Prescription::STATUS_CANCELLED)
            ->with(['items.clinicMedicine', 'items.variant.medicine', 'diagnosisTags'])
            ->first();

        if (! $prescription) {
            $prescription = Prescription::create([
                'tenant_id' => $tenantId,
                'booking_token_id' => $token->id,
                'patient_id' => $token->patient_id,
                'doctor_id' => $token->doctorSession?->doctor_id ?? $currentDoctor?->id,
                'prescription_number' => 'DRAFT-'.strtoupper(bin2hex(random_bytes(3))),
                'status' => Prescription::STATUS_DRAFT,
                'stock_reduction_mode' => $tenant->pharmacy_stock_reduction_mode ?? Prescription::MODE_DISPENSE,
                'created_by' => $user->id,
            ]);
            $prescription->load(['items.clinicMedicine', 'items.variant.medicine', 'diagnosisTags']);
        }

        // Audit log consultation view
        AuditLogger::log('consultation.viewed', [
            'tenant_id' => $tenantId,
            'user_id' => $user->id,
            'resource' => $prescription,
            'metadata' => [
                'token_id' => $token->id,
                'token_number' => $token->token_number,
                'patient_id' => $token->patient_id,
                'patient_name' => $token->patient?->name,
            ],
        ]);

        // Patient History in this clinic (strict tenant isolation, most recent first)
        $patientHistory = [];
        if ($user->can('prescriptions.view_history')) {
            $patientHistory = Prescription::where('tenant_id', $tenantId)
                ->where('patient_id', $token->patient_id)
                ->where('id', '!=', $prescription->id)
                ->whereIn('status', [
                    Prescription::STATUS_FINALIZED,
                    Prescription::STATUS_PARTIALLY_DISPENSED,
                    Prescription::STATUS_DISPENSED,
                ])
                ->with(['doctor', 'items'])
                ->latest('finalized_at')
                ->limit(20)
                ->get()
                ->map(fn ($p) => [
                    'id' => $p->id,
                    'prescription_number' => $p->prescription_number,
                    'date' => $p->finalized_at?->format('d/m/Y') ?? $p->created_at->format('d/m/Y'),
                    'doctor_name' => $p->doctor ? trim(($p->doctor->title ?? 'Dr.').' '.$p->doctor->name) : 'Doctor',
                    'chief_complaint' => $p->chief_complaint,
                    'diagnosis' => $p->diagnosis,
                    'follow_up_date' => $p->follow_up_date?->format('d/m/Y'),
                    'items' => $p->items->map(fn ($it) => [
                        'id' => $it->id,
                        'display_name' => $it->display_name,
                        'dose' => $it->dose_display,
                        'frequency' => $it->frequency,
                        'duration_days' => $it->duration_days,
                        'timing' => $it->timing,
                        'quantity' => $it->quantity,
                        'source' => $it->source,
                    ]),
                ]);
        }

        // Suggested Diagnosis Tags (most used first)
        $suggestedTags = DiagnosisTag::where('tenant_id', $tenantId)
            ->orderByDesc('usage_count')
            ->limit(30)
            ->get(['id', 'name', 'usage_count']);

        // Doctor's personal & clinic-shared templates
        $doctorId = $token->doctorSession?->doctor_id ?? $currentDoctor?->id;
        $templates = PrescriptionTemplate::where('tenant_id', $tenantId)
            ->where(function ($q) use ($doctorId) {
                $q->where('is_shared', true);
                if ($doctorId) {
                    $q->orWhere('doctor_id', $doctorId);
                }
            })
            ->with('items')
            ->orderBy('name')
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'name' => $t->name,
                'description' => $t->description,
                'is_shared' => $t->is_shared,
                'items' => $t->items->map(fn ($it) => [
                    'display_name' => $it->display_name,
                    'clinic_medicine_id' => $it->clinic_medicine_id,
                    'medicine_variant_id' => $it->medicine_variant_id,
                    'source' => $it->source,
                    'dose' => $it->dose_display,
                    'frequency' => $it->frequency,
                    'duration_days' => $it->duration_days,
                    'timing' => $it->timing,
                    'quantity' => $it->quantity,
                    'instructions' => $it->instructions,
                ]),
            ]);

        // Pharmacy & printing settings
        $pharmacyEnabled = (bool) ($tenant->pharmacy_enabled ?? false);
        $printEnabled = (bool) ($tenant->prescription_print_enabled ?? true);
        $stockMode = $tenant->pharmacy_stock_reduction_mode ?? Prescription::MODE_DISPENSE;

        // Check if consultation is locked (cannot be edited)
        $isBillPaid = $token->bill?->payment_status === Bill::STATUS_PAID;
        $isLocked = false;
        if ($prescription->status === Prescription::STATUS_CANCELLED) {
            $isLocked = true;
        } elseif ($prescription->isFinalized()) {
            if ($stockMode === Prescription::MODE_FINALIZE) {
                $isLocked = $isBillPaid;
            } else {
                $isLocked = $prescription->isDispensed() || $isBillPaid;
            }
        }

        return Inertia::render('Tenant/Doctor/Consultation', [
            'token' => [
                'id' => $token->id,
                'token_number' => $token->token_number,
                'status' => $token->status,
                'estimated_time' => $token->estimated_time?->format('h:i A'),
                'patient' => [
                    'id' => $token->patient->id,
                    'name' => $token->patient->name,
                    'phone' => $token->patient->phone,
                    'gender' => $token->patient->gender,
                    'age' => $token->patient->date_of_birth ? Carbon::parse($token->patient->date_of_birth)->age : null,
                    'allergies' => $token->patient->allergies,
                ],
                'doctor' => [
                    'id' => $token->doctorSession?->doctor?->id,
                    'name' => trim(($token->doctorSession?->doctor?->title ?? 'Dr.').' '.($token->doctorSession?->doctor?->name ?? 'Doctor')),
                    'specialty' => $token->doctorSession?->doctor?->specialty ?? 'General Practitioner',
                    'slmc_number' => $token->doctorSession?->doctor?->slmc_number,
                ],
                'bill' => $token->bill ? [
                    'id' => $token->bill->id,
                    'payment_status' => $token->bill->payment_status,
                    'total_amount_formatted' => $token->bill->formatted_total,
                ] : null,
            ],
            'prescription' => [
                'id' => $prescription->id,
                'prescription_number' => $prescription->prescription_number,
                'status' => $prescription->status,
                'chief_complaint' => $prescription->chief_complaint ?? '',
                'diagnosis' => $prescription->diagnosis ?? '',
                'clinical_notes' => $prescription->clinical_notes ?? '',
                'follow_up_date' => $prescription->follow_up_date?->toDateString() ?? '',
                'addendum_notes' => $prescription->addendum_notes ?? '',
                'cancellation_reason' => $prescription->cancellation_reason ?? '',
                'is_finalized' => $prescription->isFinalized(),
                'is_dispensed' => $prescription->isDispensed(),
                'is_cancelled' => $prescription->isCancelled(),
                'is_locked' => $isLocked,
                'stock_reduction_mode' => $prescription->stock_reduction_mode,
                'tags' => $prescription->diagnosisTags->pluck('name')->all(),
                'items' => $prescription->items->map(fn ($it) => [
                    'id' => $it->id,
                    'clinic_medicine_id' => $it->clinic_medicine_id,
                    'medicine_variant_id' => $it->medicine_variant_id,
                    'generic_name' => $it->generic_name,
                    'strength_text' => $it->strength_text,
                    'dosage_form' => $it->dosage_form,
                    'brand_name' => $it->brand_name,
                    'display_name' => $it->display_name,
                    'source' => $it->source,
                    'dose' => $it->dose_display,
                    'frequency' => $it->frequency,
                    'frequency_text' => $it->frequency_text,
                    'duration_days' => $it->duration_days,
                    'timing' => $it->timing,
                    'quantity' => $it->quantity,
                    'instructions' => $it->instructions,
                    'dispensed_quantity' => $it->dispensed_quantity,
                ]),
            ],
            'settings' => [
                'pharmacy_enabled' => $pharmacyEnabled,
                'stock_reduction_mode' => $stockMode,
                'prescription_print_enabled' => $printEnabled,
                'print_language' => $tenant->prescription_print_language ?? 'en',
            ],
            'patientHistory' => $patientHistory,
            'suggestedTags' => $suggestedTags,
            'templates' => $templates,
        ]);
    }

    /**
     * Save draft consultation & prescription items.
     */
    public function saveDraft(Request $request, BookingToken $token): RedirectResponse
    {
        $tenant = tenant();
        $tenantId = $tenant->id;
        abort_unless($token->tenant_id === $tenantId, 404);

        $validated = $this->validateConsultationPayload($request);

        try {
            DB::transaction(function () use ($token, $validated, $tenantId) {
                /** @var Prescription $rx */
                $rx = Prescription::where('tenant_id', $tenantId)
                    ->where('booking_token_id', $token->id)
                    ->where('status', '!=', Prescription::STATUS_CANCELLED)
                    ->lockForUpdate()
                    ->firstOrFail();

                if ($rx->isFinalized()) {
                    throw new InvalidArgumentException('Cannot edit a finalized prescription as draft.');
                }

                $rx->update([
                    'chief_complaint' => $validated['chief_complaint'] ?? null,
                    'diagnosis' => $validated['diagnosis'] ?? null,
                    'clinical_notes' => $validated['clinical_notes'] ?? null,
                    'follow_up_date' => $validated['follow_up_date'] ?? null,
                ]);

                // Sync diagnosis tags
                $this->syncDiagnosisTags($rx, $validated['tags'] ?? [], $tenantId);

                // Sync items
                $this->syncPrescriptionItems($rx, $validated['items'] ?? [], $tenantId);
            });

            return redirect()->back()->with('success', 'Consultation draft saved successfully.');
        } catch (InvalidArgumentException $e) {
            return redirect()->back()->withErrors(['draft' => $e->getMessage()]);
        }
    }

    /**
     * Finalize the prescription.
     * In Mode (b): reduces stock immediately and adds bill lines.
     * In Mode (a): sets status to finalized (ready for pharmacy dispense).
     */
    public function finalize(Request $request, BookingToken $token): RedirectResponse
    {
        $tenant = tenant();
        $tenantId = $tenant->id;
        abort_unless($token->tenant_id === $tenantId, 404);

        $validated = $this->validateConsultationPayload($request);
        $user = $request->user();

        DB::transaction(function () use ($token, $validated, $tenant, $tenantId, $user) {
            /** @var Prescription $rx */
            $rx = Prescription::where('tenant_id', $tenantId)
                ->where('booking_token_id', $token->id)
                ->where('status', '!=', Prescription::STATUS_CANCELLED)
                ->lockForUpdate()
                ->firstOrFail();

            if ($rx->isFinalized()) {
                return; // Idempotent check
            }

            // Assign real sequential RX number
            if (str_starts_with($rx->prescription_number, 'DRAFT-')) {
                $seq = $this->sequenceService->next($tenantId, 'prescription');
                $rx->prescription_number = sprintf('RX-%06d', $seq);
            }

            $stockMode = $rx->stock_reduction_mode ?: ($tenant->pharmacy_stock_reduction_mode ?? Prescription::MODE_DISPENSE);
            $pharmacyEnabled = (bool) ($tenant->pharmacy_enabled ?? false);

            $rx->update([
                'chief_complaint' => $validated['chief_complaint'] ?? null,
                'diagnosis' => $validated['diagnosis'] ?? null,
                'clinical_notes' => $validated['clinical_notes'] ?? null,
                'follow_up_date' => $validated['follow_up_date'] ?? null,
                'stock_reduction_mode' => $stockMode,
                'finalized_at' => now(),
            ]);

            $this->syncDiagnosisTags($rx, $validated['tags'] ?? [], $tenantId);
            $this->syncPrescriptionItems($rx, $validated['items'] ?? [], $tenantId);

            if ($pharmacyEnabled && $stockMode === Prescription::MODE_FINALIZE) {
                // Mode (b): Automatically dispense all clinic items immediately
                $this->dispenseService->dispensePrescription($rx, $user, $tenantId);
            } else {
                // Mode (a) or pharmacy disabled: Mark finalized
                $rx->update(['status' => Prescription::STATUS_FINALIZED]);
            }

            // Update token consultation status to completed
            $token->update(['status' => BookingToken::STATUS_COMPLETED, 'completed_at' => now()]);

            AuditLogger::log('consultation.finalized', [
                'tenant_id' => $tenantId,
                'user_id' => $user->id,
                'resource' => $rx,
                'metadata' => [
                    'prescription_number' => $rx->prescription_number,
                    'stock_reduction_mode' => $stockMode,
                ],
            ]);
        });

        return redirect()->back()->with('success', 'Prescription finalized successfully.');
    }

    /**
     * Cancel a finalized prescription with a mandatory reason.
     */
    public function cancel(Request $request, BookingToken $token): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($token->tenant_id === $tenantId, 404);

        $validated = $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $user = $request->user();

        try {
            DB::transaction(function () use ($token, $validated, $tenantId, $user) {
                /** @var Prescription $rx */
                $rx = Prescription::where('tenant_id', $tenantId)
                    ->where('booking_token_id', $token->id)
                    ->where('status', '!=', Prescription::STATUS_CANCELLED)
                    ->lockForUpdate()
                    ->firstOrFail();

                // If it was already dispensed, undo dispense first
                if ($rx->isDispensed()) {
                    $this->dispenseService->undoDispense($rx, "Cancellation: {$validated['reason']}", $user, $tenantId);
                }

                $rx->update([
                    'status' => Prescription::STATUS_CANCELLED,
                    'cancellation_reason' => trim($validated['reason']),
                    'cancelled_at' => now(),
                ]);

                AuditLogger::log('consultation.cancelled', [
                    'tenant_id' => $tenantId,
                    'user_id' => $user->id,
                    'resource' => $rx,
                    'metadata' => [
                        'prescription_number' => $rx->prescription_number,
                        'reason' => $validated['reason'],
                    ],
                ]);
            });

            return redirect()->back()->with('success', 'Prescription cancelled successfully.');
        } catch (InvalidArgumentException $e) {
            return redirect()->back()->withErrors(['cancel' => $e->getMessage()]);
        }
    }

    /**
     * Add an addendum note to a locked prescription.
     */
    public function addendum(Request $request, BookingToken $token): RedirectResponse
    {
        $tenantId = tenant('id');
        abort_unless($token->tenant_id === $tenantId, 404);

        $validated = $request->validate([
            'note' => ['required', 'string', 'max:1000'],
        ]);

        $user = $request->user();
        $dateStr = Carbon::now('Asia/Colombo')->format('d/m/Y h:i A');
        $newEntry = "[{$dateStr} by {$user->name}]\n".trim($validated['note']);

        DB::transaction(function () use ($token, $newEntry, $tenantId) {
            /** @var Prescription $rx */
            $rx = Prescription::where('tenant_id', $tenantId)
                ->where('booking_token_id', $token->id)
                ->where('status', '!=', Prescription::STATUS_CANCELLED)
                ->lockForUpdate()
                ->firstOrFail();

            $existing = $rx->addendum_notes ? $rx->addendum_notes."\n\n" : '';
            $rx->update([
                'addendum_notes' => $existing.$newEntry,
            ]);
        });

        return redirect()->back()->with('success', 'Addendum note appended successfully.');
    }

    /**
     * Printable A5 layout or downloadable PDF for a finalized prescription.
     */
    public function print(Request $request, Prescription $prescription): Response|\Illuminate\Http\Response
    {
        $tenant = tenant();
        $tenantId = $tenant->id;
        abort_unless($prescription->tenant_id === $tenantId, 404);

        // Guard: Printing is enabled by default unless explicitly disabled in settings
        $printEnabled = (bool) ($tenant->prescription_print_enabled ?? true);
        abort_unless($printEnabled, 404, 'Prescription printing is disabled for this clinic.');

        abort_unless($prescription->isFinalized(), 400, 'Cannot print an unfinalized prescription.');

        // Support direct PDF download / view via ChromiumPdfService
        if ($request->query('format') === 'pdf') {
            $pdfService = app(ChromiumPdfService::class);
            $binary = $pdfService->generatePrescriptionPdf($prescription, $tenant->prescription_print_language ?? 'en');

            return response($binary, 200, [
                'Content-Type' => 'application/pdf',
                'Content-Disposition' => 'inline; filename="prescription-'.$prescription->prescription_number.'.pdf"',
            ]);
        }

        $prescription->load(['patient', 'doctor', 'token.doctorSession.doctor', 'items.clinicMedicine.brand', 'items.variant.medicine', 'diagnosisTags']);
        $rx = $prescription;

        $lang = $tenant->prescription_print_language ?? 'en';
        app()->setLocale($lang);

        $itemsFormatted = $rx->items->map(function ($it) use ($lang) {
            $timingKey = $it->timing ?? 'after_meals';
            $timingText = trans("prescriptions.timing.{$timingKey}", [], $lang);
            $freqText = trans("prescriptions.frequency.{$it->frequency}", [], $lang);
            if ($freqText === "prescriptions.frequency.{$it->frequency}") {
                $freqText = $it->frequency;
            }

            $durationText = $it->duration_days ? trans('prescriptions.duration', ['days' => $it->duration_days], $lang) : '';

            return [
                'display_name' => $it->display_name,
                'generic_name' => $it->generic_name,
                'strength_text' => $it->strength_text,
                'dosage_form' => $it->dosage_form,
                'brand_name' => $it->brand_name,
                'dose_display' => $it->dose_display,
                'frequency' => $it->frequency,
                'frequency_text' => $freqText,
                'timing_text' => $timingText,
                'duration_text' => $durationText,
                'quantity' => $it->quantity,
                'source' => $it->source,
                'instructions' => $it->instructions,
            ];
        });

        $doctor = $rx->token?->doctorSession?->doctor ?? $rx->doctor;

        return Inertia::render('Tenant/Doctor/PrescriptionPrint', [
            'clinic' => [
                'name' => $tenant->name,
                'address' => $tenant->address,
                'phone' => $tenant->phone,
                'logo_url' => $tenant->logo_url,
            ],
            'doctor' => [
                'name' => $doctor ? trim(($doctor->title ?? 'Dr.').' '.$doctor->name) : 'Doctor',
                'specialty' => $doctor?->specialty ?? 'General Practitioner',
                'slmc_number' => $doctor?->slmc_number,
                'show_slmc' => (bool) ($tenant->prescription_print_show_doctor_reg ?? true),
            ],
            'patient' => [
                'name' => $rx->patient?->name ?? 'Patient',
                'age' => $rx->patient?->date_of_birth ? Carbon::parse($rx->patient->date_of_birth)->age : null,
                'gender' => $rx->patient?->gender,
                'phone' => $rx->patient?->phone,
            ],
            'prescription' => [
                'prescription_number' => $rx->prescription_number,
                'date' => $rx->finalized_at?->format('d/m/Y') ?? now()->format('d/m/Y'),
                'diagnosis' => $rx->diagnosis,
                'show_diagnosis' => (bool) ($tenant->prescription_print_show_diagnosis ?? false),
                'follow_up_date' => $rx->follow_up_date?->format('d/m/Y'),
                'items' => $itemsFormatted,
            ],
            'labels' => [
                'prescription' => trans('prescriptions.prescription', [], $lang),
                'diagnosis' => trans('prescriptions.diagnosis', [], $lang),
                'slmc_reg' => trans('prescriptions.slmc_reg', [], $lang),
                'patient' => trans('prescriptions.patient', [], $lang),
                'age' => trans('prescriptions.age', [], $lang),
                'gender' => trans('prescriptions.gender', [], $lang),
                'date' => trans('prescriptions.date', [], $lang),
                'rx_number' => trans('prescriptions.rx_number', [], $lang),
                'follow_up' => trans('prescriptions.follow_up', [], $lang),
                'doctor_signature' => trans('prescriptions.doctor_signature', [], $lang),
                'buy_outside' => trans('prescriptions.buy_outside', [], $lang),
            ],
        ]);
    }

    /**
     * Repeat patient's most recent prescription items (any doctor in clinic).
     */
    public function repeatLast(BookingToken $token): JsonResponse
    {
        $tenantId = tenant('id');
        abort_unless($token->tenant_id === $tenantId, 404);

        $lastRx = Prescription::where('tenant_id', $tenantId)
            ->where('patient_id', $token->patient_id)
            ->whereIn('status', [
                Prescription::STATUS_FINALIZED,
                Prescription::STATUS_PARTIALLY_DISPENSED,
                Prescription::STATUS_DISPENSED,
            ])
            ->with(['items.clinicMedicine'])
            ->latest('finalized_at')
            ->first();

        if (! $lastRx) {
            return response()->json(['items' => []]);
        }

        $items = $lastRx->items->map(function ($it) use ($tenantId) {
            $inStock = false;
            $clinicMedId = $it->clinic_medicine_id;

            if ($clinicMedId) {
                $clinicMed = ClinicMedicine::where('tenant_id', $tenantId)->find($clinicMedId);
                if ($clinicMed && $clinicMed->is_active && $clinicMed->total_quantity > 0) {
                    $inStock = true;
                }
            }

            return [
                'clinic_medicine_id' => $inStock ? $clinicMedId : null,
                'medicine_variant_id' => $it->medicine_variant_id,
                'generic_name' => $it->generic_name,
                'strength_text' => $it->strength_text,
                'dosage_form' => $it->dosage_form,
                'brand_name' => $it->brand_name,
                'display_name' => $it->display_name,
                'source' => $inStock ? PrescriptionItem::SOURCE_CLINIC : PrescriptionItem::SOURCE_OUTSIDE,
                'dose' => $it->dose_display,
                'frequency' => $it->frequency,
                'frequency_text' => $it->frequency_text,
                'duration_days' => $it->duration_days,
                'timing' => $it->timing,
                'quantity' => $it->quantity,
                'instructions' => $it->instructions,
            ];
        });

        return response()->json(['items' => $items]);
    }

    /**
     * Validate incoming consultation payload.
     *
     * @return array<string, mixed>
     */
    protected function validateConsultationPayload(Request $request): array
    {
        return $request->validate([
            'chief_complaint' => ['nullable', 'string', 'max:1000'],
            'diagnosis' => ['nullable', 'string', 'max:1000'],
            'clinical_notes' => ['nullable', 'string', 'max:2000'],
            'follow_up_date' => ['nullable', 'date'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:100'],
            'items' => ['nullable', 'array'],
            'items.*.clinic_medicine_id' => ['nullable', 'integer'],
            'items.*.medicine_variant_id' => ['nullable', 'integer'],
            'items.*.generic_name' => ['nullable', 'string', 'max:200'],
            'items.*.strength_text' => ['nullable', 'string', 'max:100'],
            'items.*.dosage_form' => ['nullable', 'string', 'max:100'],
            'items.*.brand_name' => ['nullable', 'string', 'max:200'],
            'items.*.display_name' => ['required', 'string', 'max:255'],
            'items.*.source' => ['required', 'string', 'in:clinic,outside,clinic_stock,buy_outside'],
            'items.*.dose' => ['required', 'string', 'max:50'],
            'items.*.frequency' => ['required', 'string', 'max:50'],
            'items.*.frequency_text' => ['nullable', 'string', 'max:100'],
            'items.*.duration_days' => ['nullable', 'integer', 'min:1'],
            'items.*.timing' => ['required', 'string', 'max:50'],
            'items.*.quantity' => ['required', 'integer', 'min:0'],
            'items.*.instructions' => ['nullable', 'string', 'max:500'],
        ]);
    }

    /**
     * Sync diagnosis tags & usage count.
     *
     * @param  array<string>  $tags
     */
    protected function syncDiagnosisTags(Prescription $rx, array $tags, string $tenantId): void
    {
        $tagIds = [];
        foreach ($tags as $tagName) {
            $name = trim($tagName);
            if ($name === '') {
                continue;
            }

            /** @var DiagnosisTag $tag */
            $tag = DiagnosisTag::firstOrCreate(
                ['tenant_id' => $tenantId, 'name' => $name],
                ['usage_count' => 0]
            );
            $tag->increment('usage_count');
            $tagIds[] = $tag->id;
        }

        $rx->diagnosisTags()->sync($tagIds);
    }

    /**
     * Sync prescription items.
     *
     * @param  array<array<string, mixed>>  $itemsData
     */
    protected function syncPrescriptionItems(Prescription $rx, array $itemsData, string $tenantId): void
    {
        $rx->items()->delete();

        foreach ($itemsData as $idx => $item) {
            $doseDecimal = $this->doseCalculator->parseDoseToDecimal($item['dose'] ?? '1');
            $calcQty = (int) ($item['quantity'] ?? 1);

            $rawSource = $item['source'] ?? PrescriptionItem::SOURCE_CLINIC;
            $source = in_array($rawSource, ['outside', 'buy_outside'], true)
                ? PrescriptionItem::SOURCE_OUTSIDE
                : PrescriptionItem::SOURCE_CLINIC;

            $rx->items()->create([
                'tenant_id' => $tenantId,
                'clinic_medicine_id' => $item['clinic_medicine_id'] ?? null,
                'medicine_variant_id' => $item['medicine_variant_id'] ?? null,
                'generic_name' => $item['generic_name'] ?? null,
                'strength_text' => $item['strength_text'] ?? null,
                'dosage_form' => $item['dosage_form'] ?? 'Tablet',
                'brand_name' => $item['brand_name'] ?? null,
                'display_name' => $item['display_name'],
                'source' => $source,
                'dose_amount' => $doseDecimal,
                'dose_unit' => strtolower($item['dosage_form'] ?? 'tablet'),
                'dose_display' => trim((string) ($item['dose'] ?? '1')),
                'frequency' => $item['frequency'] ?? '1-0-1',
                'frequency_text' => $item['frequency_text'] ?? null,
                'duration_days' => isset($item['duration_days']) ? (int) $item['duration_days'] : null,
                'timing' => $item['timing'] ?? 'after_meals',
                'quantity' => $calcQty,
                'instructions' => $item['instructions'] ?? null,
                'sort_order' => $idx,
            ]);
        }
    }

    /**
     * Retrieve complete patient visit and prescription history.
     */
    public function patientHistory(Request $request, Patient $patient): JsonResponse
    {
        return app(PatientController::class)->history($request, $patient);
    }
}
