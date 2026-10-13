@extends('emails.layouts.medvisit', [
    'subject' => 'Security alert: New login to MedVisit',
    'previewText' => "A new login was detected from IP {$ipAddress}",
    'reason' => $reason,
])

@section('content')
    <div style="background-color: #FEF3C7; border-radius: 8px; padding: 6px 12px; display: inline-block; margin-bottom: 16px;">
        <span style="font-size: 13px; font-weight: 600; color: #D97706; letter-spacing: 0.5px;">SECURITY ALERT</span>
    </div>

    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 28px;">
        New login detected
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 24px;">
        Hello {{ $name }},
    </p>

    <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 24px;">
        We noticed a sign-in to your MedVisit account from an unrecognized device or location:
    </p>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td style="padding-bottom: 8px; font-size: 14px; color: #64748B;">Time:</td>
                <td style="padding-bottom: 8px; font-size: 14px; font-weight: 600; color: #0F172A; text-align: right;">{{ $loginTime }}</td>
            </tr>
            <tr>
                <td style="padding-bottom: 8px; font-size: 14px; color: #64748B;">IP Address:</td>
                <td style="padding-bottom: 8px; font-size: 14px; font-weight: 600; color: #0F172A; text-align: right;">{{ $ipAddress }}</td>
            </tr>
            <tr>
                <td style="font-size: 14px; color: #64748B;">Device / Browser:</td>
                <td style="font-size: 14px; color: #475569; text-align: right; word-break: break-all;">{{ Str::limit($userAgent, 50) }}</td>
            </tr>
        </table>
    </div>

    <p style="margin: 0 0 20px 0; font-size: 14px; color: #475569; line-height: 22px;">
        If this was you, you can safely disregard this email. If you did not sign in or suspect unauthorized access, please reset your password immediately:
    </p>

    <div style="text-align: center; margin: 28px 0;">
        <a href="{{ $resetUrl }}" 
           class="btn-primary responsive-btn" 
           target="_blank" 
           style="background-color: #DC2626; color: #FFFFFF; display: inline-block; font-size: 15px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 8px;">
            Secure Account & Reset Password
        </a>
    </div>
@endsection
