Refund Approved — MedVisit

Hello,

Your refund request for {{ $clinicName }} has been approved.

Approved Amount: {{ $amount }}
Request Reference: {{ $refundRequest->public_id }}
@if($decisionReason)
Decision Note: {{ $decisionReason }}
@endif

Timeline: The funds will be reversed back to your original payment card via Payments.lk within 7–14 working days. You will receive an official credit note once processing completes.

Subscription Status: Cancelled. Your clinic subscription plan has been cancelled and clinic workspace access has been ended. You can reactivate anytime by choosing a new plan.

View billing history: {{ $billingUrl }}

Regards,
MedVisit Support Team
