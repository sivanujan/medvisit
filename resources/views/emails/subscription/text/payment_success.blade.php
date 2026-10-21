Hello,

We have received your payment for {{ $clinicName }}. Your MedVisit subscription is active and in good standing.

Payment Receipt Summary:
- Invoice Number: {{ $invoiceNumber }}
@if(!empty($receiptNumber))
- Receipt Number: {{ $receiptNumber }}
@endif
- Plan: {{ $planName }}
- Amount Paid: {{ $amount }}
@if(!empty($periodEnd))
- Current Period Ends: {{ $periodEnd }}
@endif

An official PDF receipt is attached to this email.

Manage your subscription and view invoices:
{{ $billingUrl }}

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.
