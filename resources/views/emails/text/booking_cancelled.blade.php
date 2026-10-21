Hello {{ $patientName }},

Your appointment with {{ $doctorName }} at {{ $clinicName }} on {{ $sessionDate }} has been cancelled.

Cancelled Booking Details:
- Token: #{{ $tokenNumber }}
- Doctor: {{ $doctorName }}
- Date: {{ $sessionDate }}
- Reason: {{ $reason }}

Book a new appointment:
{{ $rebookUrl }}

Clinic Phone: {{ $clinicPhone }}

---
Powered by MedVisit · Clinic management for Sri Lanka
© {{ date('Y') }} {{ $clinicName }}. All rights reserved.
