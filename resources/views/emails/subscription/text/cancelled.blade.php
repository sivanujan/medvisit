Hello,

We have processed the subscription cancellation request for {{ $clinicName }}.

Cancellation Details:
- Clinic: {{ $clinicName }}
- Access Valid Until: {{ $accessUntil }}
@if(!empty($reason))
- Reason: {{ $reason }}
@endif

No further renewal charges will be made. You can resume your subscription anytime before {{ $accessUntil }}:
{{ $resumeUrl }}

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.
