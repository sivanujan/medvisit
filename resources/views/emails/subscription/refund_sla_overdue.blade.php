@extends('emails.layouts.base', [
    'subject' => "Action Required: Refund request(s) exceed SLA timeline",
    'preheader' => "Pending refund requests require attention per dispute policies.",
])

@section('content')
    <x-email.heading>Refund Requests Requiring Action</x-email.heading>

    <x-email.text>
        The daily SLA check has identified refund requests that exceed our published Dispute Policy review timelines:
    </x-email.text>

    @if($undecidedOverdue->isNotEmpty())
        <x-email.info-card title="Requests Pending Decision (> 2 Working Days)" :items="$undecidedOverdue->mapWithKeys(fn ($r) => [
            $r->public_id => ($r->tenant?->name ?? 'Clinic') . ' — ' . $r->formatted_requested_amount . ' (' . $r->created_at->diffForHumans() . ')'
        ])->all()" />
    @endif

    @if($unrefundedOverdue->isNotEmpty())
        <x-email.info-card title="Approved Requests Pending Execution (> 5 Working Days)" :items="$unrefundedOverdue->mapWithKeys(fn ($r) => [
            $r->public_id => ($r->tenant?->name ?? 'Clinic') . ' — ' . ($r->formatted_approved_amount ?? $r->formatted_requested_amount) . ' (Approved ' . ($r->decided_at ? $r->decided_at->diffForHumans() : 'previously') . ')'
        ])->all()" />
    @endif

    <x-email.button :url="$adminUrl" align="left">
        Open Super Admin Refunds Console &rarr;
    </x-email.button>

    <x-email.signature />
@endsection
