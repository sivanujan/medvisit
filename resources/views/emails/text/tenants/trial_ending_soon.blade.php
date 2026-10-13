Hello {{ $adminName }},

This is a reminder that your 14-day free trial for {{ $clinicName }} will conclude on {{ $trialEnd }}.

Upgrade your plan now to prevent any disruption to your patient queues, appointments, and medical staff:
{{ $portalUrl }}

Pricing is available in LKR with local Sri Lankan payment methods.

---
MedVisit, Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
{{ $reason }}
