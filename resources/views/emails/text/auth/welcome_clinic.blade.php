Hello {{ $adminName }},

Welcome to MedVisit! Your clinic {{ $clinicName }} is officially registered.

Clinic Details:
- Web Address: {{ $clinicUrl }}
- 14-Day Free Trial Ends: {{ $trialEnd }}

3 Quick Next Steps to Get Started:
1. Sign in to your portal: Visit {{ $clinicUrl }} with your administrator account.
2. Invite your team: Add receptionists, doctors, and nurses with their respective roles.
3. Launch queue & appointments: Configure clinic consultation rooms and start managing visits.

Access your portal now:
{{ $clinicUrl }}

---
MedVisit, Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
{{ $reason }}
