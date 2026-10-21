Hello {{ $patientName }},

This is a reminder for your upcoming appointment at {{ $clinicName }}.

TOKEN NUMBER: #{{ $tokenNumber }}
Approx. Consultation Time: {{ $approxTime }}

Consultation Details:
- Doctor: {{ $doctorName }} ({{ $doctorSpecialty }})
- Date: {{ $sessionDate }}
- Room: {{ $roomNumber }}
- Patient: {{ $patientName }}

Location:
{{ $clinicName }}
{{ $clinicAddress }}
Phone: {{ $clinicPhone }}
Map: {{ $mapUrl }}

Please arrive at the clinic 15 minutes before your consultation time.

---
Powered by MedVisit · Clinic management for Sri Lanka
© {{ date('Y') }} {{ $clinicName }}. All rights reserved.
