@extends('emails.layouts.base', [
    'subject' => 'Your MedVisit Clinic Access Links',
    'preheader' => 'Access links for your MedVisit clinic workspaces.',
])

@section('content')
    <x-email.heading>Your Clinic Access Links</x-email.heading>

    <x-email.text>
        Hello,
    </x-email.text>

    <x-email.text>
        We found the following clinic workspace(s) associated with your email address (<strong style="color: #0F172A;">{{ $recipientEmail }}</strong>):
    </x-email.text>

    @foreach($clinics as $clinic)
        @php
            $subdomain = $clinic['subdomain'] ?? '';
            $baseDomain = config('medvisit.base_domain', 'medvisit.lk');
            $clinicUrl = "https://{$subdomain}.{$baseDomain}";
            $targetUrl = !empty($clinic['auto_login_url']) ? $clinic['auto_login_url'] : ($clinic['login_url'] ?? $clinicUrl);
            $roleName = $clinic['role'] ?? ($clinic['role_name'] ?? 'Clinic Staff');
        @endphp

        <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" class="clinic-box" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; margin-bottom: 16px; border-collapse: separate;">
            <tr>
                <td style="padding: 20px;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
                        <tr>
                            <td>
                                <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 17px; font-weight: 700; color: #0F172A; margin-bottom: 4px;">
                                    {{ $clinic['name'] }}
                                </div>
                                <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #1E6FD9; margin-bottom: 6px;">
                                    <a href="{{ $clinicUrl }}" target="_blank" style="color: #1E6FD9; text-decoration: none; font-weight: 500;">{{ $clinicUrl }}</a>
                                </div>
                                <div style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 12px; color: #64748B;">
                                    Role: <span style="display: inline-block; background-color: #EEF4FF; color: #1E6FD9; font-weight: 600; padding: 2px 8px; border-radius: 6px; font-size: 11px;">{{ ucfirst(str_replace('_', ' ', $roleName)) }}</span>
                                </div>
                            </td>
                            <td align="right" valign="middle" style="padding-left: 12px;">
                                <a href="{{ $targetUrl }}" target="_blank" style="background-color: #1E6FD9; color: #FFFFFF !important; display: inline-block; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 18px; border-radius: 8px; white-space: nowrap;">
                                    Open Clinic &rarr;
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    @endforeach

    <x-email.alert type="info">
        <strong>Tip:</strong> Bookmark your clinic's unique address in your browser for fast daily access.
    </x-email.alert>

    <x-email.text muted>
        If you did not request these login links, please disregard this email. Your account credentials remain secure.
    </x-email.text>

    <x-email.signature />
@endsection
