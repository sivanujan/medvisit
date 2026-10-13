@extends('emails.layouts.medvisit', [
    'subject' => "Your MedVisit verification code: {$code}",
    'previewText' => "Your 6-digit verification code is {$code}. Valid for 10 minutes.",
    'reason' => 'verification',
])

@section('content')
    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 28px;">
        Verify your email address
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 24px;">
        Hello{{ $name ? ' '.$name : '' }},
    </p>

    <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155; line-height: 24px;">
        Use the following 6-digit verification code to confirm your email and complete creating your clinic{{ $clinicName ? ' ('.$clinicName.')' : '' }} on MedVisit:
    </p>

    <!-- 6-Digit OTP Code Card -->
    <div style="text-align: center; margin: 32px 0;">
        <div style="display: inline-block; background-color: #F0F6FE; border: 2px solid #1E6FD9; border-radius: 12px; padding: 18px 36px; box-shadow: 0 2px 8px rgba(30, 111, 217, 0.15);">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #1E6FD9;">
                {{ $code }}
            </span>
        </div>
        <p style="margin: 12px 0 0 0; font-size: 13px; color: #64748B;">
            This code expires in <strong>10 minutes</strong>.
        </p>
    </div>

    <div style="background-color: #F8FAFC; border-left: 4px solid #0E9E8F; border-radius: 6px; padding: 12px 16px; margin: 24px 0;">
        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 20px;">
            <strong>Security Notice:</strong> Never share this code with anyone. MedVisit staff will never ask for your verification code.
        </p>
    </div>

    <p style="margin: 0 0 16px 0; font-size: 13px; color: #64748B; line-height: 20px;">
        If you did not initiate this clinic registration, you can safely ignore this email.
    </p>
@endsection
