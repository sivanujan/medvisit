@extends('emails.layouts.medvisit', [
    'subject' => 'Your MedVisit Clinic Access Links',
    'previewText' => 'Access links for your MedVisit clinic account.',
    'reason' => $reason,
])

@section('content')
    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 28px;">
        Your Clinic Access Links
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 24px;">
        Hello,
    </p>

    <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155; line-height: 24px;">
        We found the following MedVisit clinic account(s) associated with your email address (<strong>{{ $recipientEmail }}</strong>):
    </p>

    <div style="margin-bottom: 28px;">
        @foreach($clinics as $clinic)
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td>
                            <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #0F172A;">
                                {{ $clinic['name'] }}
                            </h3>
                            <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748B;">
                                Address: {{ $clinic['subdomain'] }}.medvisit.lk
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td>
                            @if(!empty($clinic['auto_login_url']))
                                <a href="{{ $clinic['auto_login_url'] }}" 
                                   class="btn-primary" 
                                   target="_blank" 
                                   style="background-color: #0E9E8F; color: #FFFFFF; display: inline-block; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 6px; margin-right: 8px;">
                                    Sign In Directly (Single-Use)
                                </a>
                            @endif
                            <a href="{{ $clinic['login_url'] }}" 
                               class="btn-primary" 
                               target="_blank" 
                               style="background-color: #1E6FD9; color: #FFFFFF; display: inline-block; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 6px;">
                                Go to Clinic Login
                            </a>
                        </td>
                    </tr>
                </table>
            </div>
        @endforeach
    </div>

    <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748B; line-height: 20px;">
        If you did not request these login links, please disregard this email. Your account credentials remain secure.
    </p>
@endsection
