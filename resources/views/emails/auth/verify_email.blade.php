@extends('emails.layouts.medvisit', [
    'subject' => 'Verify your email address - MedVisit',
    'previewText' => 'Please confirm your email address to activate your MedVisit account.',
    'reason' => $reason,
])

@section('content')
    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 28px;">
        Verify your email address
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 24px;">
        Hello {{ $name }},
    </p>

    <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155; line-height: 24px;">
        Thank you for joining MedVisit. To complete your setup and ensure secure access to your healthcare portal, please verify your email address by clicking the button below.
    </p>

    <div style="text-align: center; margin: 32px 0;">
        <!--[if mso]>
        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ $verificationUrl }}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="17%" stroke="f" fillcolor="#1E6FD9">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Verify Email Address</center>
        </v:roundrect>
        <![endif]-->
        <a href="{{ $verificationUrl }}" 
           class="btn-primary responsive-btn" 
           target="_blank" 
           style="background-color: #1E6FD9; color: #FFFFFF; display: inline-block; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(30, 111, 217, 0.25);">
            Verify Email Address
        </a>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748B; line-height: 20px;">
        This verification link will expire in 60 minutes. If you did not create an account on MedVisit, no further action is required.
    </p>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />

    <p style="margin: 0; font-size: 12px; color: #94A3B8; line-height: 18px; word-break: break-all;">
        If you are having trouble clicking the button, copy and paste the following URL into your browser:<br>
        <a href="{{ $verificationUrl }}" style="color: #1E6FD9;">{{ $verificationUrl }}</a>
    </p>
@endsection
