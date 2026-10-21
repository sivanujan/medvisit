Hello,

Great news! The MedVisit subscription for {{ $clinicName }} has been resumed.

Subscription Details:
- Clinic: {{ $clinicName }}
- Plan: {{ $planName }}
- Next Renewal: {{ $nextRenewal }}

Manage your subscription:
{{ $billingUrl }}

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.
