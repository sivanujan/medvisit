Hello {{ $name }},

Thank you for joining MedVisit. To complete your setup and ensure secure access to your healthcare portal, please verify your email address by visiting this link:

{{ $verificationUrl }}

This verification link will expire in 60 minutes. If you did not create an account on MedVisit, please ignore this email.

---
MedVisit, Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
{{ $reason }}
