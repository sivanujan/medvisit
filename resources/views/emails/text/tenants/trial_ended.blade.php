Hello {{ $adminName }},

The 14-day free trial period for {{ $clinicName }} has ended and concluded.

Your clinic data, past patient records, and doctor profiles are securely preserved.
To reactivate full access and token counters, please select an active plan:
{{ $portalUrl }}

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.
