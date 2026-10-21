@extends('emails.layouts.base', [
    'subject' => $announcement->title,
    'preheader' => Str::limit(strip_tags($announcement->message), 90),
    'showUnsubscribe' => $showUnsubscribe ?? false,
    'unsubscribeUrl' => $unsubscribeUrl ?? null,
])

@php
    $typeConfig = match(strtolower($announcement->type ?? 'info')) {
        'update', 'feature' => ['bg' => '#E0F2FE', 'color' => '#0284C7', 'label' => 'NEW FEATURE'],
        'warning' => ['bg' => '#FEF3C7', 'color' => '#D97706', 'label' => 'IMPORTANT NOTICE'],
        'maintenance' => ['bg' => '#FEE2E2', 'color' => '#DC2626', 'label' => 'SYSTEM MAINTENANCE'],
        'billing' => ['bg' => '#ECFDF5', 'color' => '#059669', 'label' => 'BILLING UPDATE'],
        default => ['bg' => '#EEF4FF', 'color' => '#1E6FD9', 'label' => 'ANNOUNCEMENT'],
    };
    $ctaUrl = $trackingCtaUrl ?: $announcement->cta_url;
@endphp

@section('content')
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 16px;">
        <tr>
            <td style="background-color: {{ $typeConfig['bg'] }}; border-radius: 6px; padding: 4px 10px;">
                <span style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 700; color: {{ $typeConfig['color'] }}; letter-spacing: 0.5px; text-transform: uppercase;">
                    {{ $typeConfig['label'] }}
                </span>
            </td>
        </tr>
    </table>

    <x-email.heading>{{ $announcement->title }}</x-email.heading>

    @if(!empty($announcement->image_url))
        <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin: 16px 0 20px 0;">
            <tr>
                <td align="center">
                    <img src="{{ $announcement->image_url }}" alt="{{ $announcement->title }}" style="max-width: 100%; height: auto; border-radius: 8px; border: 1px solid #E2E8F0; display: block;" />
                </td>
            </tr>
        </table>
    @endif

    <div style="font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 24px; color: #334155;">
        {!! $announcement->message !!}
    </div>

    @if(!empty($announcement->cta_label) && !empty($ctaUrl))
        <x-email.button :url="$ctaUrl" align="left">
            {{ $announcement->cta_label }} &rarr;
        </x-email.button>
    @endif

    <x-email.signature />
@endsection
