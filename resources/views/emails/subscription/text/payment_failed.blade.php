Hello,

We were unable to process the subscription payment for {{ $clinicName }} for invoice {{ $invoiceNumber }}.

Payment Details:
- Invoice: {{ $invoiceNumber }}
- Amount Due: {{ $amount }}
- Reason: {{ $failureMessage ?? 'Card was declined or session expired' }}

Please retry your payment or update your payment details:
{{ $retryUrl }}

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.
