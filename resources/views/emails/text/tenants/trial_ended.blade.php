Hello {{ $adminName }},

The free trial period for {{ $clinicName }} has ended. Clinic access is temporarily paused.

Your patient records and clinic configuration are completely safe. Select a subscription plan to reactivate full access:
{{ $portalUrl }}

---
MedVisit, Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
{{ $reason }}
