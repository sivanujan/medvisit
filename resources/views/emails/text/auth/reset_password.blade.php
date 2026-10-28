Hello {{ $name }},

We received a request to reset the password for your MedVisit account{{ $clinicName ? ' at ' . $clinicName : '' }}.

Reset your password using the following link:
{{ $resetUrl }}

This password reset link will expire in {{ $expiresIn }} minutes.
If you did not make this request, you can safely ignore this email — your account remains secure.

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.
