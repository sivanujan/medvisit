@extends('emails.layouts.medvisit', [
    'subject' => "Your MedVisit trial ends in 3 days - {$clinicName}",
    'previewText' => "Your trial for {$clinicName} ends in 3 days on {$trialEnd}.",
    'reason' => $reason,
])

@section('content')
    <div style="background-color: #FFF3EB; border-radius: 8px; padding: 6px 12px; display: inline-block; margin-bottom: 16px;">
        <span style="font-size: 13px; font-weight: 600; color: #FF7A59; letter-spacing: 0.5px;">TRIAL EXPIRING SOON</span>
    </div>

    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 28px;">
        Your MedVisit free trial ends in 3 days
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 24px;">
        Hello {{ $adminName }},
    </p>

    <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155; line-height: 24px;">
        This is a friendly reminder that your 14-day free trial for <strong>{{ $clinicName }}</strong> will conclude on <strong>{{ $trialEnd }}</strong>.
    </p>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #475569; font-weight: 600;">
            Keep your clinic operations running seamlessly:
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #64748B; line-height: 22px;">
            <li>Zero interruption to patient queues, tokens, and records.</li>
            <li>Maintain continuous staff and doctor scheduling.</li>
            <li>Predictable pricing in LKR with local Sri Lankan payment support.</li>
        </ul>
    </div>

    <div style="text-align: center; margin: 32px 0;">
        <a href="{{ $portalUrl }}" 
           class="btn-primary responsive-btn" 
           target="_blank" 
           style="background-color: #1E6FD9; color: #FFFFFF; display: inline-block; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(30, 111, 217, 0.25);">
            Upgrade Your Plan Now
        </a>
    </div>

    <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 20px;">
        Have questions or need assistance choosing a subscription plan? Reach out directly to <a href="mailto:support@medvisit.lk" style="color: #1E6FD9;">support@medvisit.lk</a>.
    </p>
@endsection
