@extends('emails.layouts.medvisit', [
    'subject' => "Welcome to MedVisit - {$clinicName}",
    'previewText' => "Welcome to MedVisit! Your clinic portal is ready at {$clinicUrl}",
    'reason' => $reason,
])

@section('content')
    <div style="background-color: #E8F5F3; border-radius: 8px; padding: 6px 12px; display: inline-block; margin-bottom: 16px;">
        <span style="font-size: 13px; font-weight: 600; color: #0E9E8F; letter-spacing: 0.5px;">CLINIC ACCOUNT ACTIVATED</span>
    </div>

    <h1 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 700; color: #0F172A; line-height: 32px;">
        Welcome to MedVisit!
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 24px;">
        Dear {{ $adminName }},
    </p>

    <p style="margin: 0 0 24px 0; font-size: 15px; color: #334155; line-height: 24px;">
        Congratulations! <strong>{{ $clinicName }}</strong> is officially registered on MedVisit. Your dedicated digital clinic environment has been provisioned and is ready for use.
    </p>

    <!-- Clinic Summary Box -->
    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td style="padding-bottom: 10px; font-size: 14px; color: #64748B;">Clinic Web Address:</td>
                <td style="padding-bottom: 10px; font-size: 14px; font-weight: 600; color: #1E6FD9; text-align: right;">
                    <a href="{{ $clinicUrl }}" style="color: #1E6FD9; text-decoration: none;">{{ $subdomain }}.medvisit.lk</a>
                </td>
            </tr>
            <tr>
                <td style="font-size: 14px; color: #64748B;">14-Day Free Trial Ends:</td>
                <td style="font-size: 14px; font-weight: 600; color: #0E9E8F; text-align: right;">{{ $trialEnd }}</td>
            </tr>
        </table>
    </div>

    <!-- 3 Next Steps -->
    <h2 style="margin: 0 0 16px 0; font-size: 17px; font-weight: 600; color: #0F172A;">
        3 Quick Next Steps to Get Started:
    </h2>

    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 28px;">
        <tr>
            <td valign="top" style="width: 32px; padding-bottom: 16px;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #1E6FD9; color: #ffffff; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">1</div>
            </td>
            <td valign="top" style="padding-bottom: 16px; font-size: 14px; color: #334155; line-height: 22px;">
                <strong>Sign in to your portal:</strong> Access your clinic dashboard using your administrator credentials at your dedicated clinic URL.
            </td>
        </tr>
        <tr>
            <td valign="top" style="width: 32px; padding-bottom: 16px;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #0E9E8F; color: #ffffff; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">2</div>
            </td>
            <td valign="top" style="padding-bottom: 16px; font-size: 14px; color: #334155; line-height: 22px;">
                <strong>Invite your team:</strong> Add your receptionists, nurses, and doctors with role-based access control.
            </td>
        </tr>
        <tr>
            <td valign="top" style="width: 32px;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #FF7A59; color: #ffffff; text-align: center; line-height: 24px; font-size: 12px; font-weight: 700;">3</div>
            </td>
            <td valign="top" style="font-size: 14px; color: #334155; line-height: 22px;">
                <strong>Launch queue & appointments:</strong> Configure your clinic rooms, token counter, and start registering patient visits.
            </td>
        </tr>
    </table>

    <div style="text-align: center; margin: 32px 0;">
        <a href="{{ $clinicUrl }}" 
           class="btn-primary responsive-btn" 
           target="_blank" 
           style="background-color: #1E6FD9; color: #FFFFFF; display: inline-block; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 2px 4px rgba(30, 111, 217, 0.25);">
            Go to Your Clinic Portal
        </a>
    </div>

    <p style="margin: 0; font-size: 13px; color: #64748B; line-height: 20px;">
        Need help onboarding your staff? Our support team in Sri Lanka is ready to assist you. Reply directly to this email or contact us at <a href="mailto:support@medvisit.lk" style="color: #1E6FD9;">support@medvisit.lk</a>.
    </p>
@endsection
