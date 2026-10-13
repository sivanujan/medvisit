<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\AuditEvent;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditLogger
{
    /**
     * Log an audit event.
     *
     * @param  string  $action  e.g. 'patient.viewed', 'patient.updated', 'bill.created'
     * @param  array<string, mixed>  $options
     */
    public static function log(string $action, array $options = []): AuditEvent
    {
        $user = $options['user'] ?? Auth::user();
        $userId = $user instanceof User ? $user->id : ($options['user_id'] ?? null);

        $resource = $options['resource'] ?? null;
        $resourceType = $options['resource_type'] ?? ($resource instanceof Model ? $resource->getMorphClass() : null);
        $resourceId = $options['resource_id'] ?? ($resource instanceof Model ? (string) $resource->getKey() : null);

        $tenantId = $options['tenant_id'] ?? (function_exists('tenant') && tenant() ? tenant('id') : ($user?->tenant_id ?? null));

        return AuditEvent::create([
            'tenant_id' => $tenantId,
            'user_id' => $userId,
            'action' => $action,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'metadata' => $options['metadata'] ?? null,
            'ip_address' => $options['ip_address'] ?? Request::ip(),
            'user_agent' => $options['user_agent'] ?? Request::userAgent(),
            'reason' => $options['reason'] ?? null,
        ]);
    }
}
