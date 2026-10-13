MedVisit Email Delivery Test

This test message confirms that your MedVisit email transport is working properly.

- Recipient: {{ $recipientEmail }}
- Mail Driver: {{ $mailer }}
- Sent At (Asia/Colombo): {{ $sentAt }}

Headers and sender domain: medvisit.lk.

---
MedVisit, Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
{{ $reason }}
