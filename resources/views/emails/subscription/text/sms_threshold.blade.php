{{ $percent >= 100 ? 'Action required: Monthly SMS limit reached' : 'Notice: 80% of monthly SMS quota used' }}

Hello {{ $tenant->name }} Team,

Your clinic has used {{ $used }} of {{ $limit }} SMS alerts for the current monthly period ({{ $percent }}%).

@if ($percent >= 100)
Queue SMS alerts to patients have been temporarily paused. To resume SMS notifications immediately, please upgrade your plan or purchase an SMS Top-Up Pack.
@else
If you exhaust your remaining SMS messages, automatic queue alerts will pause until your next monthly renewal or top-up.
@endif

Manage Plan & SMS Top-Up: {{ $billingUrl }}

Regards,
MedVisit Support Team

