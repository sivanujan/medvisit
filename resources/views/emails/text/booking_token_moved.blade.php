Hello {{ $patientName }},

Your channeling token at {{ $clinicName }} has been updated.

NEW TOKEN NUMBER: #{{ $newTokenNumber }} (Previous: #{{ $oldTokenNumber }})
Estimated Time: {{ $approxTime }}

Consultation Details:
- Doctor: {{ $doctorName }} ({{ $doctorSpecialty }})
- Date: {{ $sessionDate }}
- Room: {{ $roomNumber }}
- Reason: {{ $reason }}

Location:
{{ $clinicName }}
{{ $clinicAddress }}
Phone: {{ $clinicPhone }}
Map: {{ $mapUrl }}

Please arrive at the clinic 15 minutes before your consultation time.

---
Powered by MedVisit · Clinic management for Sri Lanka
© {{ date('Y') }} {{ $clinicName }}. All rights reserved.
