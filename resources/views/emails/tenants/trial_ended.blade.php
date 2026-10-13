@extends('emails.layouts.medvisit', [
    'subject' => "Your MedVisit trial has ended - {$clinicName}",
    'previewText' => "Your free trial for {$clinicName} has expired. Reactivate your clinic portal.",
    'reason' => $reason,
])

@section('content')
    <div style="background-color: #FEE2E2; border-radius: 8px; padding: 6px 12px; display: inline-block; margin-bottom: 16px;">
        <span style="font-size: 13px; font-weight: 600; color: #DC2626; letter-spacing: 0.5px;">TRIAL CONCLUDED</span>
    </div>

    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 28px;">
        Your MedVisit free trial has expired
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 24px;">
        Hello {{ $adminName }},
    </p>

    <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 24px;">
        The 14-day free trial period for <strong>{{ $clinicName }}</strong> has concluded. Access to routine queue operations and clinic staff portals is temporarily paused until an active subscription is activated.
    </p>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; font-weight: 600;">
            Your clinic data is completely safe:
        </p>
        <p style="margin: 0; font-size: 14px; color: #64748B; line-height: 22px;">
            All your patients, staff profiles, and visit records remain securely preserved. Select a plan to immediately reactivate full clinic access.
        </p>
    </div>

    <div style="text-align: center; margin: 32px 0;">
        <a href="{{ $portalUrl }}" 
           class="btn-primary responsive-btn" 
           target="_blank" 
           style="background-color: #1E6FD9; color: #FFFFFF; display: inline-block; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(30, 111, 217, 0.25);">
            Reactivate Clinic Access
        </a>
    </div>

    <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 20px;">
        Questions or need custom enterprise pricing? Contact our dedicated Sri Lanka support team at <a href="mailto:support@medvisit.lk" style="color: #1E6FD9;">support@medvisit.lk</a>.
    </p>
@endsection
