@extends('emails.layouts.base', [
    'subject' => "Plan changed to {$newPlanName} — {$clinicName}",
    'preheader' => "The MedVisit plan for {$clinicName} has been updated to {$newPlanName}.",
])

@section('content')
    <x-email.heading>Plan change confirmed</x-email.heading>

    <x-email.text>
        Hello,
    </x-email.text>

    <x-email.text>
        The subscription plan for <strong>{{ $clinicName }}</strong> has been successfully updated.
    </x-email.text>

    <x-email.info-card title="Plan Change Summary" :items="array_filter([
        'Clinic Workspace' => $clinicName,
        'Previous Plan' => $oldPlanName,
        'New Plan' => '<strong style=\"color: #1E6FD9;\">' . $newPlanName . '</strong>',
        'Change Type' => $changeType,
        'Effective Date' => $effectiveDate,
        'Amount Charged' => !empty($amountCharged) ? '<strong style=\"color: #0E9E8F;\">' . $amountCharged . '</strong>' : null,
    ])" />

    <x-email.alert type="info">
        <strong>Plan Features Updated:</strong> Any new doctor limits, storage quotas, and analytics features included with your new plan are available immediately.
    </x-email.alert>

    <x-email.button :url="$billingUrl" align="left">
        Open Billing Portal &rarr;
    </x-email.button>

    <x-email.signature />
@endsection
