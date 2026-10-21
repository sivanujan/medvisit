Hello,

{{ $invitedBy }} has invited you to join the central MedVisit Platform team as a Super Administrator.

Invitation Details:
- Target Email: {{ $email }}
- Role: Platform Super Admin
- Invited By: {{ $invitedBy }}
- Expires At: {{ $expiresAt }}

Accept your invitation and set up your administrator account:
{{ $inviteUrl }}

Security Notice: Super Administrator accounts require Two-Factor Authentication (2FA) upon setup.

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.
