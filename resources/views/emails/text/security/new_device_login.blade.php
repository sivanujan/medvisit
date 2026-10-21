Hello {{ $name }},

We noticed a new sign-in to your MedVisit account from an unrecognized device or network location:

Sign-In Activity Details:
- Timestamp: {{ $loginTime }}
- IP Address: {{ $ipAddress }}
- Device: {{ $userAgent }}

If this was you, you can safely ignore this email.
If you suspect unauthorized access, reset your password immediately:
{{ $resetUrl }}

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.
