Refund Approved — MedVisit

Hello,

Your refund request for {{ $clinicName }} has been approved.

Approved Amount: {{ $amount }}
Request Reference: {{ $refundRequest->public_id }}
@if(!empty($creditNoteNumber))
Credit Note: {{ $creditNoteNumber }}
@endif
@if(!empty($reference))
Payments.lk Reference: {{ $reference }}
@endif
@if($decisionReason)
Decision Note: {{ $decisionReason }}
@endif

Timeline: The refund has been executed and will be reversed back to your original payment card via Payments.lk {{ $timelineText }}.

@if($isPartial)
Subscription Status: Active. Your subscription remains active and you retain full access to your clinic workspace. This partial refund or service credit has been credited back to your account.
@else
Subscription Status: Cancelled. Your clinic subscription plan has been cancelled and clinic workspace access has been ended.
Data Retention: Per our Terms and Privacy Policy, your clinic records and patient data are safely preserved for 30 days. You can download past invoices and receipts anytime.
@endif

View billing history: {{ $billingUrl }}

Regards,
MedVisit Support Team
