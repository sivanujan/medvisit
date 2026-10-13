@extends('emails.layouts.medvisit', [
    'subject' => $clinicName ? "Reset your password - {$clinicName} (MedVisit)" : 'Reset your MedVisit password',
    'previewText' => 'A password reset was requested for your MedVisit account.',
    'reason' => $reason,
])

@section('content')
    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 28px;">
        Reset your password
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 24px;">
        Hello {{ $name }},
    </p>

    <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 24px;">
        We received a request to reset your password for your MedVisit account
        @if($clinicName)
            at <strong>{{ $clinicName }}</strong>.
        @else
            .
        @endif
    </p>

    <div style="text-align: center; margin: 32px 0;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ $resetUrl }}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="17%" stroke="f" fillcolor="#1E6FD9">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Reset Password</center>
        </v:roundrect>
        <![endif]-->
        <a href="{{ $resetUrl }}" 
           class="btn-primary responsive-btn" 
           target="_blank" 
           style="background-color: #1E6FD9; color: #FFFFFF; display: inline-block; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(30, 111, 217, 0.25);">
            Reset Password
        </a>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748B; line-height: 20px;">
        This password reset link will expire in {{ $expiresIn }} minutes. If you did not request a password reset, no further action is required and your current password remains secure.
    </p>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />

    <p style="margin: 0; font-size: 12px; color: #94A3B8; line-height: 18px; word-break: break-all;">
        If you are having trouble clicking the button, copy and paste the following URL into your browser:<br>
        <a href="{{ $resetUrl }}" style="color: #1E6FD9;">{{ $resetUrl }}</a>
    </p>
@endsection
