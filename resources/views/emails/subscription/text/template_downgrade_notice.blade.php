Hello {{ $clinicName }},

Your free template ends on {{ $effectiveDate }}.

Your clinic recently scheduled a plan downgrade from the Advanced plan. Under MedVisit plan rules, the plan-included premium website template ({{ $templateName }}) is available only while your clinic is on the Advanced plan.

Buy it for {{ $priceFormatted }} to keep this design:
{{ $purchaseUrl }}

If not purchased by {{ $effectiveDate }}, your live website will fall back gracefully to your previous design or the default free theme. Your customizations will remain safely saved in your draft so you can purchase and reactivate it anytime without losing your work.

---
MedVisit · Clinic management for Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
© {{ date('Y') }} MedVisit. All rights reserved.

