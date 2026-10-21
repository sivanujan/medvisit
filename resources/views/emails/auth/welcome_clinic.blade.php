@extends('emails.layouts.base', [
    'subject' => "Welcome to MedVisit — {$clinicName} is ready",
    'preheader' => "Your clinic portal is live at {$subdomain}.medvisit.lk. Follow 3 quick steps to get started.",
])

@section('content')
    <x-email.heading>Welcome to MedVisit!</x-email.heading>

    <x-email.text>
        Hello {{ $adminName }},
    </x-email.text>

    <x-email.text>
        <strong>{{ $clinicName }}</strong> is officially registered. Your dedicated digital clinic portal has been provisioned and is ready for everyday operations.
    </x-email.text>

    <x-email.info-card title="Clinic Workspace Details" :items="[
        'Portal URL' => '<a href=\"' . $clinicUrl . '\" style=\"color: #1E6FD9; text-decoration: none; font-weight: 600;\">' . $subdomain . '.medvisit.lk</a>',
        'Subdomain' => $subdomain,
        '14-Day Free Trial Ends' => $trialEnd,
    ]" />

    <x-email.heading level="h2" style="font-size: 17px; margin-top: 24px; margin-bottom: 12px;">
        3 Quick Next Steps to Get Started
    </x-email.heading>

    <x-email.list :ordered="true" :items="[
        '<strong>Sign in to your portal & add doctors:</strong> Sign in to your dedicated portal and create doctor profiles with specialties, consultation fees, and room assignments.',
        '<strong>Invite your team & set schedule:</strong> Invite receptionists and configure weekly clinic session days, consultation hours, and token limits.',
        '<strong>Launch queue & share booking link:</strong> Launch your digital token counter and share your direct booking URL (<a href=\"' . $clinicUrl . '/book\" style=\"color: #1E6FD9; text-decoration: none;\">' . $subdomain . '.medvisit.lk/book</a>) with patients for self-service channeling.',
    ]" />

    <x-email.button :url="$clinicUrl" align="left">
        Open Clinic Portal &rarr;
    </x-email.button>

    <x-email.alert type="info">
        <strong>Need a hand getting set up?</strong> Our Sri Lanka support team is ready to walk you through configuration or answer any questions via WhatsApp or email.
    </x-email.alert>

    <x-email.signature />
@endsection
