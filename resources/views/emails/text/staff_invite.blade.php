Hello {{ $name }},

You have been invited to join the clinical management team at {{ $clinicName }} as a {{ $role }} on MedVisit.

Invitation Details:
- Clinic: {{ $clinicName }}
- Role: {{ $role }}
- Expires: {{ $expiresAt }}

Accept your invitation and set up your password:
{{ $acceptUrl }}

If you were not expecting this invitation, you can safely ignore this email.

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.
