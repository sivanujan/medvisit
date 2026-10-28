Hello,

The MedVisit plan for {{ $clinicName }} has been updated.

Plan Change Summary:
- Previous Plan: {{ $oldPlanName }}
- New Plan: {{ $newPlanName }}
- Change Type: {{ $changeType }}
- Effective: {{ $effectiveDate }}
@if(!empty($amountCharged))
- Amount Charged: {{ $amountCharged }}
@endif

Review billing details:
{{ $billingUrl }}

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.
