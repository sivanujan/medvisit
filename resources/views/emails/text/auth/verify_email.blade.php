Hello {{ $name }},

Thank you for joining MedVisit. To complete your setup and ensure secure access, please verify your email address using the link below:

{{ $verificationUrl }}

This link expires in 60 minutes. If you did not create this account, you can safely ignore this email.

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.
