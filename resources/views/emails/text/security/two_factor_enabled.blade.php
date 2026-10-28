Hello {{ $name }},

Two-Factor Authentication (2FA) was successfully enabled for your MedVisit account ({{ $email }}).

Security Event Details:
- Account: {{ $email }}
- Method: Authenticator App (TOTP)
- Timestamp: {{ $enabledAt }}

You will be prompted to enter a 6-digit code from your authenticator app whenever you sign in.

Review security settings:
{{ $securityUrl }}

If you did not perform this change, please contact MedVisit Support immediately.

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.
