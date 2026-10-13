Hello {{ $name }},

We noticed a new login to your MedVisit account:
- Time: {{ $loginTime }}
- IP Address: {{ $ipAddress }}
- Browser/Device: {{ $userAgent }}

If this wasn't you, reset your password immediately:
{{ $resetUrl }}

---
MedVisit, Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
{{ $reason }}
