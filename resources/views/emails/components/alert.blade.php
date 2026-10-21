@props([
    'type' => 'info',
    'title' => null,
])

@php
    $styles = match($type) {
        'success' => [
            'bg' => '#ECFDF5',
            'border' => '#A7F3D0',
            'text' => '#065F46',
            'icon' => '✓',
        ],
        'warning' => [
            'bg' => '#FFFBEB',
            'border' => '#FDE68A',
            'text' => '#92400E',
            'icon' => '⚠',
        ],
        'danger', 'error' => [
            'bg' => '#FFF1F2',
            'border' => '#FECDD3',
            'text' => '#9F1239',
            'icon' => '✕',
        ],
        default => [
            'bg' => '#EFF6FF',
            'border' => '#BFDBFE',
            'text' => '#1E40AF',
            'icon' => 'ℹ',
        ],
    };
@endphp

<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin: 20px 0; background-color: {{ $styles['bg'] }}; border: 1px solid {{ $styles['border'] }}; border-radius: 10px; border-left: 4px solid {{ $styles['border'] }};">
    <tr>
        <td style="padding: 14px 18px; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 20px; color: {{ $styles['text'] }};">
            @if (!empty($title))
                <strong style="display: block; font-size: 14px; margin-bottom: 4px;">{{ $title }}</strong>
            @endif
            {{ $slot }}
        </td>
    </tr>
</table>
