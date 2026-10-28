Hello,

This is a reminder that the MedVisit subscription for {{ $clinicName }} is due for renewal in {{ $daysRemaining }} {{ Str::plural('day', $daysRemaining) }}.

Renewal Details:
- Clinic: {{ $clinicName }}
- Plan: {{ $planName }}
- Amount: {{ $amount }}
- Due Date: {{ $dueDate }}

Renew your subscription online:
{{ $payUrl }}

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.
