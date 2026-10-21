@extends('emails.layouts.base', [
    'subject' => "New Demo Request: {$lead->clinic_name} ({$lead->contact_name})",
    'preheader' => "New demo request from {$lead->contact_name} for {$lead->clinic_name} in {$lead->city}.",
])

@section('content')
    <x-email.heading>New demo request received</x-email.heading>

    <x-email.text>
        A new clinic lead has requested a live product demonstration through the MedVisit public landing page:
    </x-email.text>

    <x-email.info-card title="Lead Details" :items="array_filter([
        'Clinic Name' => $lead->clinic_name,
        'Contact Person' => $lead->contact_name,
        'Phone Number' => '<a href=\"tel:' . $lead->phone . '\" style=\"color: #0E9E8F; font-weight: 600; text-decoration: none;\">' . $lead->phone . '</a>',
        'Email Address' => $lead->email ? '<a href=\"mailto:' . $lead->email . '\" style=\"color: #1E6FD9; text-decoration: none;\">' . $lead->email . '</a>' : null,
        'Location' => $lead->city ?? null,
        'Special Requests / Notes' => $lead->notes ?? null,
    ])" />

    <x-email.button :url="url('/super-admin/leads')" align="left">
        Open in Leads CRM &rarr;
    </x-email.button>

    <x-email.signature />
@endsection
