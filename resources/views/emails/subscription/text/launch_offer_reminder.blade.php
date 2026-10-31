Hello {{ $tenant->name }} Team,

Your clinic's free MedVisit Launch Offer on the Advanced tier concludes in {{ $daysRemaining }} day(s).

Your Clinic Usage Summary:
- Active Doctors: {{ $usageSummary['doctors'] ?? 0 }}
- Active Staff Users: {{ $usageSummary['staff'] ?? 0 }}
- Pharmacy Dispenses: {{ $usageSummary['dispenses'] ?? 0 }}
- Waiting Room TV Screens: {{ $usageSummary['tv_screens'] ?? 0 }}
- SMS Alerts Sent: {{ $usageSummary['sms_used'] ?? 0 }}

Based on your clinical activity, we recommend the {{ $recommendedPlan }} plan.

Review plans and keep your clinic active:
{{ $changePlanUrl }}

MedVisit Team
support@medvisit.lk

