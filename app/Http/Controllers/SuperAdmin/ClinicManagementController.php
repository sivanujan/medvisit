<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Jobs\ExportClinicDataJob;
use App\Models\AuditEvent;
use App\Models\BookingToken;
use App\Models\ClinicDataExport;
use App\Models\ClinicNote;
use App\Models\Doctor;
use App\Models\OtpLog;
use App\Models\Patient;
use App\Models\PaymentTransaction;
use App\Models\Plan;
use App\Models\Prescription;
use App\Models\Subscription;
use App\Models\Tenant;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ClinicManagementController extends Controller
{
    /**
     * Display the Clinics Fleet Directory.
     */
    public function index(Request $request): Response|StreamedResponse
    {
        $search = trim((string) $request->input('search', ''));
        $status = $request->input('status', 'all');
        $planFilter = $request->input('plan', 'all');
        $showArchived = $request->boolean('archived', false);

        $query = Tenant::query()->withTrashed($showArchived);

        if (! $showArchived) {
            $query->whereNull('deleted_at');
        } else {
            $query->whereNotNull('deleted_at');
        }

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $term = '%'.strtolower($search).'%';
                $q->whereRaw('LOWER(name) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(id) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(subdomain) LIKE ?', [$term])
                    ->orWhereRaw('LOWER(phone) LIKE ?', [$term])
                    ->orWhereHas('users', function ($uq) use ($term) {
                        $uq->whereRaw('LOWER(name) LIKE ?', [$term])
                            ->orWhereRaw('LOWER(email) LIKE ?', [$term]);
                    });
            });
        }

        if ($status !== 'all') {
            if ($status === 'trial') {
                $query->where(function ($q) {
                    $q->where('status', 'trial')->orWhere('status', 'trialing');
                });
            } else {
                $query->where('status', $status);
            }
        }

        if ($planFilter !== 'all') {
            $query->where('plan', $planFilter);
        }

        // CSV Export if requested
        if ($request->input('export') === 'csv') {
            AuditLogger::log('superadmin.clinics.exported_csv');

            return response()->streamDownload(function () use ($query) {
                $out = fopen('php://output', 'w');
                fputcsv($out, ['ID', 'Clinic Name', 'Subdomain', 'Plan', 'Status', 'Phone', 'Created At']);
                foreach ($query->get() as $c) {
                    fputcsv($out, [$c->id, $c->name, $c->subdomain, $c->plan, $c->status, $c->phone, $c->created_at?->toDateString()]);
                }
                fclose($out);
            }, 'medvisit_clinics_'.date('Y_m_d').'.csv');
        }

        $clinics = $query->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(function ($t) {
                $owner = User::where('tenant_id', $t->id)->role('clinic_admin')->first()
                    ?? User::where('tenant_id', $t->id)->first();
                $doctorsCount = Doctor::where('tenant_id', $t->id)->count();
                $tokensThisMonth = BookingToken::where('tenant_id', $t->id)
                    ->where('created_at', '>=', now()->startOfMonth())
                    ->count();

                $sub = Subscription::with('plan')->where('tenant_id', $t->id)->latest('id')->first();
                $mrr = ($sub && $sub->isActive() && $sub->plan && $sub->plan->price_cents > 0 && $sub->plan->slug !== 'comp')
                    ? round($sub->plan->price_cents / 100, 2)
                    : 0;

                return [
                    'id' => $t->id,
                    'name' => $t->name,
                    'subdomain' => $t->subdomain,
                    'url' => $t->url(),
                    'phone' => $t->phone,
                    'plan' => $t->plan ?? 'Standard',
                    'status' => $t->status,
                    'mrr_lkr' => $mrr,
                    'owner_name' => $owner?->name ?? 'None',
                    'owner_email' => $owner?->email ?? '',
                    'doctors_count' => $doctorsCount,
                    'tokens_this_month' => $tokensThisMonth,
                    'trial_ends_at' => $t->trial_ends_at?->toDateString(),
                    'created_at' => $t->created_at?->toDateString(),
                    'deleted_at' => $t->deleted_at?->toDateString(),
                ];
            });

        return Inertia::render('SuperAdmin/Clinics/Index', [
            'clinics' => $clinics,
            'filters' => [
                'search' => $search,
                'status' => $status,
                'plan' => $planFilter,
                'archived' => $showArchived,
            ],
            'plans' => Plan::all(['name', 'slug']),
        ]);
    }

    protected function resolveClinic(Request $request): Tenant
    {
        $id = $request->route('clinicId');

        return Tenant::findOrFail($id);
    }

    protected function resolveClinicWithTrashed(Request $request): Tenant
    {
        $id = $request->route('clinicId');

        return Tenant::withTrashed()->findOrFail($id);
    }

    /**
     * Display a comprehensive tabbed Clinic Detail Page.
     */
    public function show(Request $request): Response
    {
        $tenant = $this->resolveClinicWithTrashed($request);

        // 1. Owner & Staff
        $owner = User::where('tenant_id', $tenant->id)->role('clinic_admin')->first()
            ?? User::where('tenant_id', $tenant->id)->first();
        $doctorsCount = Doctor::where('tenant_id', $tenant->id)->count();
        $staffCount = User::where('tenant_id', $tenant->id)->count();
        $patientsCount = Patient::where('tenant_id', $tenant->id)->count();
        $prescriptionsCount = Prescription::where('tenant_id', $tenant->id)->count();

        // 2. Monthly Tokens History (last 6 months)
        $monthlyTokens = [];
        $now = now();
        for ($i = 5; $i >= 0; $i--) {
            $mStart = $now->copy()->subMonths($i)->startOfMonth();
            $mEnd = $now->copy()->subMonths($i)->endOfMonth();
            $monthlyTokens[] = [
                'month' => $mStart->format('M Y'),
                'count' => BookingToken::where('tenant_id', $tenant->id)->whereBetween('created_at', [$mStart, $mEnd])->count(),
            ];
        }

        // 3. Billing & Invoices
        $subscription = Subscription::with(['plan', 'invoices' => fn ($q) => $q->latest('id')])
            ->where('tenant_id', $tenant->id)
            ->latest('id')
            ->first();

        $transactions = PaymentTransaction::where('tenant_id', $tenant->id)
            ->with('invoice')
            ->latest('id')
            ->limit(10)
            ->get();

        // 4. Messaging usage for this clinic
        $messagingCounts = [
            'sms_total' => OtpLog::where('tenant_id', $tenant->id)->where('channel', 'textlk')->count(),
            'whatsapp_total' => OtpLog::where('tenant_id', $tenant->id)->where('channel', 'whatsapp')->count(),
            'verified_total' => OtpLog::where('tenant_id', $tenant->id)->where('status', 'verified')->count(),
        ];

        // 5. Internal Notes
        $notes = ClinicNote::where('tenant_id', $tenant->id)
            ->with('author')
            ->latest()
            ->get()
            ->map(fn ($n) => [
                'id' => $n->id,
                'author_name' => $n->author?->name ?? 'Super Admin',
                'type' => $n->type,
                'note' => $n->note,
                'created_at_human' => $n->created_at?->diffForHumans(),
            ]);

        // 6. Recent Audit Events for this Clinic
        $auditLogs = AuditEvent::where('tenant_id', $tenant->id)
            ->with('user')
            ->latest('id')
            ->limit(20)
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'event_name' => $a->event_name,
                'actor' => $a->user?->name ?? 'System',
                'metadata' => $a->metadata,
                'created_at_human' => $a->created_at?->diffForHumans(),
            ]);

        // 7. Recent Data Exports
        $exports = ClinicDataExport::where('tenant_id', $tenant->id)
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'status' => $e->status,
                'is_expired' => $e->isExpired(),
                'expires_at' => $e->expires_at?->toDateTimeString(),
                'download_url' => $e->status === 'completed' && ! $e->isExpired()
                    ? URL::temporarySignedRoute('super_admin.clinics.export.download', now()->addMinutes(15), [
                        'clinic' => $tenant->id,
                        'export' => $e->id,
                    ])
                    : null,
                'created_at' => $e->created_at?->diffForHumans(),
            ]);

        return Inertia::render('SuperAdmin/Clinics/Show', [
            'clinic' => [
                'id' => $tenant->id,
                'name' => $tenant->name,
                'subdomain' => $tenant->subdomain,
                'url' => $tenant->url(),
                'phone' => $tenant->phone,
                'address' => $tenant->address,
                'logo_url' => $tenant->logo_url,
                'plan' => $tenant->plan ?? 'Standard',
                'status' => $tenant->status,
                'trial_ends_at' => $tenant->trial_ends_at?->toDateString(),
                'is_suspended' => $tenant->isSuspended(),
                'deleted_at' => $tenant->deleted_at?->toDateString(),
                'pharmacy_enabled' => (bool) ($tenant->pharmacy_enabled ?? false),
                'created_at' => $tenant->created_at?->toFormattedDateString(),
                'owner' => $owner ? [
                    'id' => $owner->id,
                    'name' => $owner->name,
                    'email' => $owner->email,
                    'email_verified_at' => $owner->email_verified_at?->toFormattedDateString(),
                    'last_login' => $owner->updated_at?->diffForHumans(),
                ] : null,
                'stats' => [
                    'doctors_count' => $doctorsCount,
                    'staff_count' => $staffCount,
                    'patients_count' => $patientsCount,
                    'prescriptions_count' => $prescriptionsCount,
                ],
            ],
            'monthlyTokens' => $monthlyTokens,
            'subscription' => $subscription,
            'transactions' => $transactions,
            'messaging' => $messagingCounts,
            'notes' => $notes,
            'auditLogs' => $auditLogs,
            'exports' => $exports,
            'plans' => Plan::all(),
        ]);
    }

    /**
     * Suspend a clinic workspace with a required reason.
     */
    public function suspend(Request $request): RedirectResponse
    {
        $request->validate([
            'reason' => ['required', 'string', 'min:5'],
        ]);

        $tenant = $this->resolveClinic($request);
        $tenant->update(['status' => 'suspended']);

        AuditLogger::log('superadmin.clinic.suspended', [
            'tenant_id' => $tenant->id,
            'user' => $request->user(),
            'metadata' => [
                'reason' => $request->input('reason'),
            ],
        ]);

        return back()->with('success', "Clinic {$tenant->name} has been suspended.");
    }

    /**
     * Reactivate a suspended clinic.
     */
    public function reactivate(Request $request): RedirectResponse
    {
        $tenant = $this->resolveClinic($request);
        $tenant->update(['status' => 'active']);

        AuditLogger::log('superadmin.clinic.reactivated', [
            'tenant_id' => $tenant->id,
            'user' => $request->user(),
        ]);

        return back()->with('success', "Clinic {$tenant->name} has been reactivated.");
    }

    /**
     * Extend clinic trial by N days.
     */
    public function extendTrial(Request $request): RedirectResponse
    {
        $request->validate([
            'days' => ['required', 'integer', 'min:1', 'max:90'],
        ]);

        $tenant = $this->resolveClinic($request);
        $currentExpiry = $tenant->trial_ends_at && $tenant->trial_ends_at->isFuture()
            ? $tenant->trial_ends_at
            : now();

        $newExpiry = $currentExpiry->copy()->addDays((int) $request->input('days'));
        $tenant->update([
            'trial_ends_at' => $newExpiry,
            'status' => 'trial',
        ]);

        AuditLogger::log('superadmin.clinic.trial_extended', [
            'tenant_id' => $tenant->id,
            'user' => $request->user(),
            'metadata' => [
                'days_added' => $request->input('days'),
                'new_expiry' => $newExpiry->toDateTimeString(),
            ],
        ]);

        return back()->with('success', "Trial extended by {$request->input('days')} days until {$newExpiry->toDateString()}.");
    }

    /**
     * Trigger password reset link to the clinic admin.
     */
    public function resetPassword(Request $request): RedirectResponse
    {
        $tenant = $this->resolveClinic($request);
        $owner = User::where('tenant_id', $tenant->id)->role('clinic_admin')->first()
            ?? User::where('tenant_id', $tenant->id)->first();

        if (! $owner) {
            return back()->with('error', 'No clinic admin user found to reset password.');
        }

        Password::broker()->sendResetLink(['email' => $owner->email]);

        AuditLogger::log('superadmin.clinic.password_reset_sent', [
            'tenant_id' => $tenant->id,
            'user' => $request->user(),
            'metadata' => ['target_email' => $owner->email],
        ]);

        return back()->with('success', "Password reset link emailed to {$owner->email}.");
    }

    public function sendPasswordResetLink(Request $request): RedirectResponse
    {
        return $this->resetPassword($request);
    }

    /**
     * Impersonate a clinic admin from the central domain to tenant subdomain.
     */
    public function impersonate(Request $request): mixed
    {
        $request->validate([
            'reason' => ['required', 'string', 'min:5'],
        ]);

        $tenant = $this->resolveClinic($request);
        $clinicAdmin = User::where('tenant_id', $tenant->id)->role('clinic_admin')->first()
            ?? User::where('tenant_id', $tenant->id)->first();

        if (! $clinicAdmin) {
            return back()->with('error', 'Cannot impersonate: this clinic has no administrator user.');
        }

        if ($clinicAdmin->hasRole('super_admin')) {
            abort(403, 'Security violation: Cannot impersonate another Platform Super Admin.');
        }

        // Generate Stancl single-use token
        $token = tenancy()->impersonate($tenant, (string) $clinicAdmin->id, '/dashboard', 'web');

        // Store impersonator metadata with the token
        DB::table('tenant_user_impersonation_tokens')
            ->where('token', $token->token)
            ->update([
                'impersonator_id' => $request->user()->id,
                'reason' => $request->input('reason'),
            ]);

        AuditLogger::log('superadmin.clinic.impersonation_initiated', [
            'tenant_id' => $tenant->id,
            'user' => $request->user(),
            'metadata' => [
                'target_user_id' => $clinicAdmin->id,
                'reason' => $request->input('reason'),
            ],
        ]);

        $tenantUrl = $tenant->url("/impersonate/{$token->token}");

        return Inertia::location($tenantUrl);
    }

    /**
     * Store an internal note for this clinic.
     */
    public function storeNote(Request $request): RedirectResponse
    {
        $request->validate([
            'note' => ['required', 'string', 'min:3'],
            'type' => ['nullable', 'string', 'in:general,call,promise'],
        ]);

        $tenant = $this->resolveClinic($request);

        ClinicNote::create([
            'tenant_id' => $tenant->id,
            'user_id' => $request->user()->id,
            'type' => $request->input('type', 'general'),
            'note' => $request->input('note'),
        ]);

        AuditLogger::log('superadmin.clinic.note_added', [
            'tenant_id' => $tenant->id,
            'user' => $request->user(),
        ]);

        return back()->with('success', 'Internal note recorded.');
    }

    /**
     * Request a secure encrypted clinic data export (requires password confirmation).
     */
    public function requestExport(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'string'],
        ]);

        if (! Hash::check($request->input('password'), $request->user()->password)) {
            return back()->withErrors(['password' => 'Incorrect password. Verification failed.']);
        }

        $tenant = $this->resolveClinic($request);

        $export = ClinicDataExport::create([
            'tenant_id' => $tenant->id,
            'requested_by' => $request->user()->id,
            'status' => 'pending',
        ]);

        dispatch(new ExportClinicDataJob($export->id));

        AuditLogger::log('superadmin.clinic.export_requested', [
            'tenant_id' => $tenant->id,
            'user' => $request->user(),
            'metadata' => ['export_id' => $export->id],
        ]);

        return back()->with('success', 'Data export queued. The encrypted zip file will be ready shortly.');
    }

    public function requestDataExport(Request $request): RedirectResponse
    {
        return $this->requestExport($request);
    }

    /**
     * Download the decrypted clinic export via 15-minute signed URL.
     */
    public function downloadExport(Request $request): BinaryFileResponse|RedirectResponse
    {
        if (! $request->hasValidSignature()) {
            abort(403, 'This download link has expired or is invalid.');
        }

        $exportId = (string) $request->route('export');
        $export = ClinicDataExport::findOrFail($exportId);
        $clinicId = $export->tenant_id;

        if ($export->isExpired() || ! $export->file_path || ! Storage::disk('local')->exists($export->file_path)) {
            abort(404, 'Export file is no longer available or has expired.');
        }

        $encrypted = Storage::disk('local')->get($export->file_path);
        $decryptedZip = Crypt::decrypt($encrypted);

        $tempPath = tempnam(sys_get_temp_dir(), 'export_').'.zip';
        file_put_contents($tempPath, $decryptedZip);

        $export->update(['downloaded_at' => now()]);

        AuditLogger::log('superadmin.clinic.export_downloaded', [
            'tenant_id' => $clinicId,
            'user' => $request->user(),
            'metadata' => ['export_id' => $export->id],
        ]);

        return response()->download($tempPath, "medvisit_clinic_{$clinicId}_export.zip")->deleteFileAfterSend(true);
    }

    /**
     * Soft delete clinic (reserving subdomain for 30-day restore window).
     */
    public function destroy(Request $request): RedirectResponse
    {
        $tenant = $this->resolveClinic($request);
        $tenant->delete();

        AuditLogger::log('superadmin.clinic.soft_deleted', [
            'tenant_id' => $tenant->id,
            'user' => $request->user(),
            'metadata' => ['restore_deadline' => now()->addDays(30)->toDateString()],
        ]);

        return redirect()->route('super_admin.clinics.index')->with('success', "Clinic {$tenant->name} has been archived. Subdomain is reserved for 30 days.");
    }

    /**
     * Restore soft-deleted clinic.
     */
    public function restore(Request $request): RedirectResponse
    {
        $tenant = $this->resolveClinicWithTrashed($request);
        $tenant->restore();

        AuditLogger::log('superadmin.clinic.restored', [
            'tenant_id' => $tenant->id,
            'user' => $request->user(),
        ]);

        return back()->with('success', "Clinic {$tenant->name} has been restored.");
    }
}
