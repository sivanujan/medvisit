<?php

declare(strict_types=1);

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\AuditEvent;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PlatformAuditLogController extends Controller
{
    /**
     * Display a paginated listing of platform audit events.
     */
    public function index(Request $request): Response
    {
        $query = AuditEvent::with(['user.roles', 'tenant'])->latest();

        // Filters
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('action', 'like', "%{$search}%")
                    ->orWhere('resource_type', 'like', "%{$search}%")
                    ->orWhere('resource_id', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        if ($action = $request->input('action')) {
            $query->where('action', $action);
        }

        if ($tenantId = $request->input('tenant_id')) {
            $query->where('tenant_id', $tenantId);
        }

        if ($userId = $request->input('user_id')) {
            $query->where('user_id', $userId);
        }

        if ($dateFrom = $request->input('date_from')) {
            $query->where('created_at', '>=', Carbon::parse($dateFrom)->startOfDay());
        }

        if ($dateTo = $request->input('date_to')) {
            $query->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }

        $events = $query->paginate(25)->withQueryString();

        // Transform events to sanitize metadata (redact passwords, tokens, secrets)
        $events->getCollection()->transform(function ($event) {
            $event->metadata = $this->redactSecrets($event->metadata ?? []);

            return $event;
        });

        // Dropdown filter options
        $availableActions = AuditEvent::select('action')->distinct()->orderBy('action')->pluck('action');
        $availableClinics = Tenant::select('id', 'name')->orderBy('name')->get();
        $availableUsers = User::whereHas('roles', fn ($q) => $q->where('name', 'super_admin'))
            ->orWhereNotNull('tenant_id')
            ->select('id', 'name', 'email')
            ->limit(100)
            ->get();

        return Inertia::render('SuperAdmin/AuditLogs/Index', [
            'events' => $events,
            'filters' => $request->only(['search', 'action', 'tenant_id', 'user_id', 'date_from', 'date_to']),
            'availableActions' => $availableActions,
            'availableClinics' => $availableClinics,
            'availableUsers' => $availableUsers,
        ]);
    }

    /**
     * Export filtered audit logs as CSV.
     */
    public function export(Request $request): StreamedResponse
    {
        $query = AuditEvent::with(['user', 'tenant'])->latest();

        if ($action = $request->input('action')) {
            $query->where('action', $action);
        }
        if ($tenantId = $request->input('tenant_id')) {
            $query->where('tenant_id', $tenantId);
        }
        if ($userId = $request->input('user_id')) {
            $query->where('user_id', $userId);
        }
        if ($dateFrom = $request->input('date_from')) {
            $query->where('created_at', '>=', Carbon::parse($dateFrom)->startOfDay());
        }
        if ($dateTo = $request->input('date_to')) {
            $query->where('created_at', '<=', Carbon::parse($dateTo)->endOfDay());
        }

        return response()->streamDownload(function () use ($query) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Timestamp', 'Actor Name', 'Actor Email', 'Action', 'Clinic', 'Resource Type', 'Resource ID', 'IP Address', 'User Agent', 'Metadata']);

            $query->chunk(200, function ($rows) use ($handle) {
                foreach ($rows as $row) {
                    $metadataClean = json_encode($this->redactSecrets($row->metadata ?? []));
                    fputcsv($handle, [
                        $row->id,
                        $row->created_at?->toIso8601String() ?? '',
                        $row->user?->name ?? 'System',
                        $row->user?->email ?? '',
                        $row->action,
                        $row->tenant?->name ?? 'Central Platform',
                        $row->resource_type ?? '',
                        $row->resource_id ?? '',
                        $row->ip_address ?? '',
                        $row->user_agent ?? '',
                        $metadataClean,
                    ]);
                }
            });

            fclose($handle);
        }, 'platform_audit_logs_'.now()->format('Y-m-d_His').'.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * Recursively redact sensitive keys from metadata.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function redactSecrets(array $data): array
    {
        $sensitiveKeys = ['password', 'secret', 'token', 'key', 'auth', 'card', 'cvv', 'two_factor_secret', 'recovery_codes'];

        foreach ($data as $k => $v) {
            if (is_array($v)) {
                $data[$k] = $this->redactSecrets($v);
            } else {
                foreach ($sensitiveKeys as $pattern) {
                    if (str_contains(strtolower((string) $k), $pattern)) {
                        $data[$k] = '••••••••';
                        break;
                    }
                }
            }
        }

        return $data;
    }
}
