Refund Requests Requiring Action — MedVisit Platform

The daily SLA check has identified refund requests that exceed our review timelines:

@if($undecidedOverdue->isNotEmpty())
Requests Pending Decision (> 2 Working Days):
@foreach($undecidedOverdue as $r)
- {{ $r->public_id }}: {{ $r->tenant?->name ?? 'Clinic' }} — {{ $r->formatted_requested_amount }} ({{ $r->created_at->diffForHumans() }})
@endforeach
@endif

@if($unrefundedOverdue->isNotEmpty())
Approved Requests Pending Execution (> 5 Working Days):
@foreach($unrefundedOverdue as $r)
- {{ $r->public_id }}: {{ $r->tenant?->name ?? 'Clinic' }} — {{ $r->formatted_approved_amount ?? $r->formatted_requested_amount }}
@endforeach
@endif

Review now: {{ $adminUrl }}

Regards,
MedVisit Platform Monitoring
