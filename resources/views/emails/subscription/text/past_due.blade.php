Hello,

@if($isGrace)
The MedVisit subscription for {{ $clinicName }} has entered a {{ $graceDays }}-day grace period. Settle your invoice immediately to prevent disruption.
@else
The MedVisit subscription for {{ $clinicName }} is past due. Clinic portal features may be paused.
@endif

Account Standing:
- Clinic: {{ $clinicName }}
- Status: {{ $isGrace ? 'Grace Period' : 'Past Due' }}
- Amount Due: {{ $amount }}

Pay your balance now:
{{ $payUrl }}

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.
