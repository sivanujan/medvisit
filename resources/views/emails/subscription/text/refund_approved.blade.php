Refund Approved — MedVisit

Hello,

Your refund request for {{ $clinicName }} has been approved.

Approved Amount: {{ $amount }}
Request Reference: {{ $refundRequest->public_id }}
@if($decisionReason)
Decision Note: {{ $decisionReason }}
@endif

Timeline: The funds will be returned to your original payment card within 7–14 working days. You will receive an official credit note once processing completes.

View billing history: {{ $billingUrl }}

Regards,
MedVisit Support Team
