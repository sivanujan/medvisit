Hello {{ $patientName }},

Your channeling appointment has been confirmed at {{ $clinicName }}.

YOUR CHANNELING TOKEN: #{{ $tokenNumber }}
Approx. Consultation Time: {{ $approxTime }}

Consultation Details:
- Doctor: {{ $doctorName }} ({{ $doctorSpecialty }})
- Date: {{ $sessionDate }}
- Session Hours: {{ $sessionTime }}
- Room: {{ $roomNumber }}
- Patient: {{ $patientName }}

Clinic Location:
{{ $clinicName }}
{{ $clinicAddress }}
Phone: {{ $clinicPhone }}
Google Maps: {{ $mapUrl }}

Please arrive at the clinic 15 minutes before your approximate consultation time.

@if(!empty($cancelUrl))
Cancel or manage your booking: {{ $cancelUrl }}
@endif

---
Powered by MedVisit · Clinic management for Sri Lanka
© {{ date('Y') }} {{ $clinicName }}. All rights reserved.
