@props([
    'code' => '',
    'expires' => 'Expires in 10 minutes',
])

@php
    $displayCode = !empty($code) ? (string)$code : (string)$slot;
@endphp

<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin: 24px 0;">
    <tr>
        <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #EEF4FF; border: 1px solid #BFDBFE; border-radius: 12px; margin: 0 auto;">
                <tr>
                    <td align="center" style="padding: 16px 36px;">
                        <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 28px; font-weight: 700; color: #1E6FD9; letter-spacing: 6px; display: inline-block;">
                            {{ $displayCode }}
                        </span>
                    </td>
                </tr>
            </table>
            @if (!empty($expires))
                <div style="font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; color: #64748B; margin-top: 10px; line-height: 18px;">
                    {{ $expires }} · Do not share this code with anyone.
                </div>
            @endif
        </td>
    </tr>
</table>
