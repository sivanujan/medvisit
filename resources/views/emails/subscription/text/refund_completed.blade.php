Refund Completed — MedVisit

Hello,

Your subscription refund for {{ $clinicName }} has been executed.

Amount Refunded: {{ $amount }}
Credit Note Number: {{ $creditNoteNumber }}
Method: {{ ucfirst(str_replace('_', ' ', $method ?? 'Card Reversal')) }}
Reference: {{ $reference ?? '—' }}

Your official PDF credit note is attached to this email. You can also view your billing history online:
{{ $billingUrl }}

Regards,
MedVisit Support Team
