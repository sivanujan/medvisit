Hello {{ $adminName }},

{{ $clinicName }} is officially registered on MedVisit. Your dedicated digital clinic portal is ready for operations.

Clinic Workspace Details:
- Portal URL: {{ $clinicUrl }}
- Subdomain: {{ $subdomain }}
- 14-Day Free Trial Ends: {{ $trialEnd }}

3 Quick Next Steps to Get Started:
1. Sign in to your portal & add doctors: Sign in to your dedicated portal and create doctor profiles.
2. Invite your team & set schedule: Invite receptionists and configure weekly clinic session hours.
3. Launch queue & share booking link: Launch your digital token counter and share your booking link ({{ $clinicUrl }}/book).

Open Clinic Portal:
{{ $clinicUrl }}

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.
