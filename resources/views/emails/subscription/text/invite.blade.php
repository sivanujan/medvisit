Hello {{ $recipientName }},

You have been invited to activate your clinic on MedVisit with {{ $freePeriod }} free access on our {{ $planName }} Plan.

@if($clinicName)
Reserved for: {{ $clinicName }}
@endif
Plan: {{ $planName }}
Free Access: {{ $freePeriod }}
Payment Required: Rs. 0.00
Expires: {{ $expiresAt }}

To accept your invitation and launch your clinic, open this link in your browser:
{{ $inviteUrl }}

Note: This link is bound to your email address and can only be used once.

Best regards,
The MedVisit Team
https://medvisit.lk

