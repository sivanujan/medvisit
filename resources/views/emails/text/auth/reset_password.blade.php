Hello {{ $name }},

We received a request to reset your password for your MedVisit account{{ $clinicName ? " at {$clinicName}" : '' }}.

To reset your password, visit the link below:
{{ $resetUrl }}

This link will expire in {{ $expiresIn }} minutes. If you did not request a password reset, no action is needed.

---
MedVisit, Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
{{ $reason }}
