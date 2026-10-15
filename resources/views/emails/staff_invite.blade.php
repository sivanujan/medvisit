<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invitation to {{ $clinicName }}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0d9488 100%); padding: 32px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">{{ $clinicName }}</h1>
            <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.9;">Clinical Team Invitation</p>
        </div>
        <div style="padding: 32px;">
            <p style="font-size: 16px; line-height: 24px; margin-top: 0;">Hello <strong>{{ $invitation->name }}</strong>,</p>
            <p style="font-size: 14px; line-height: 22px; color: #475569;">
                You have been invited to join the clinical management team at <strong>{{ $clinicName }}</strong> as a <strong>{{ ucwords(str_replace('_', ' ', $invitation->role)) }}</strong> on MedVisit.
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{{ $acceptUrl }}" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);">
                    Accept Invitation & Set Password
                </a>
            </div>
            <p style="font-size: 12px; line-height: 18px; color: #94a3b8; text-align: center;">
                This invitation link will expire on {{ $invitation->expires_at->format('M d, Y h:i A') }}.
            </p>
        </div>
        <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0;">
            MedVisit Sri Lanka • Smart Clinical Channeling & Practice Management
        </div>
    </div>
</body>
</html>
