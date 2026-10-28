New Demo Request Received: {{ $lead->clinic_name }}

A new clinic lead has requested a platform demo:

Clinic Name: {{ $lead->clinic_name }}
Contact Person: {{ $lead->contact_name }}
Phone: {{ $lead->phone }}
Email: {{ $lead->email ?? 'Not provided' }}
City / Town: {{ $lead->city ?? 'Not provided' }}
Notes: {{ $lead->notes ?? 'None' }}

Open in CRM: {{ url('/super-admin/leads') }}
