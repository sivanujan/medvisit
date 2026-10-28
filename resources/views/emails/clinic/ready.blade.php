@extends('emails.layouts.base', [
    'subject' => "{$clinicName} is ready on MedVisit",
    'preheader' => "Setup is complete. Your booking site and clinic dashboard are live.",
])

@section('content')
    <x-email.heading>{{ $clinicName }} is ready!</x-email.heading>

    <x-email.text>
        Congratulations! Clinic setup has been successfully completed for <strong>{{ $clinicName }}</strong>. Your clinic website, online booking, and operational workspace are now active and ready for your team and patients.
    </x-email.text>

    @php
        $clinicReadyItems = array_filter([
            'Clinic Name' => $clinicName,
            'Physical Address' => $clinicAddress ?: 'Configured in workspace',
            'Clinic Contact' => $clinicPhone ?: 'Configured in workspace',
            'Online Booking Site' => '<a href="' . $bookingUrl . '" style="color: #1E6FD9; text-decoration: underline;">' . $bookingUrl . '</a>',
        ]);
    @endphp

    <x-email.info-card title="Clinic Information" :items="$clinicReadyItems" />

    <x-email.text>
        <strong>Next recommended steps:</strong>
        <ul style="margin: 8px 0; padding-left: 20px; line-height: 1.6;">
            <li><strong>Add your doctors:</strong> Add consultant profiles, SLMC numbers, and consultation fees.</li>
            <li><strong>Create your first session:</strong> Schedule channeling time slots and token quotas.</li>
            <li><strong>Invite your staff:</strong> Invite receptionists and dispensers to join your clinic workspace.</li>
        </ul>
    </x-email.text>

    @if(!empty($qrCodeDataUri))
        <div style="text-align: center; margin: 24px 0; padding: 16px; background-color: #F8FAFC; border-radius: 12px; border: 1px solid #E2E8F0;">
            <p style="font-size: 13px; font-weight: 600; color: #1E293B; margin-bottom: 12px;">Public Booking QR Code for Reception</p>
            <img src="{{ $qrCodeDataUri }}" alt="Booking QR Code" style="width: 140px; height: 140px; display: inline-block;" />
            <p style="font-size: 11px; color: #64748B; margin-top: 8px;">Scan with any mobile camera to book tokens online.</p>
        </div>
    @endif

    <x-email.button :url="$dashboardUrl" align="left">
        Enter Clinic Dashboard &rarr;
    </x-email.button>

    <x-email.signature />
@endsection
