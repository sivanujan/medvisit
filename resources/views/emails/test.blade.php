@extends('emails.layouts.medvisit', [
    'subject' => 'MedVisit Email Delivery Test',
    'previewText' => 'Testing email delivery through Resend for MedVisit.',
    'reason' => $reason,
])

@section('content')
    <div style="background-color: #E8F5F3; border-radius: 8px; padding: 6px 12px; display: inline-block; margin-bottom: 16px;">
        <span style="font-size: 13px; font-weight: 600; color: #0E9E8F; letter-spacing: 0.5px;">DELIVERY TEST</span>
    </div>

    <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #0F172A; line-height: 28px;">
        Email delivery verified!
    </h1>

    <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155; line-height: 24px;">
        This test message confirms that your MedVisit email transport is working properly.
    </p>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td style="padding-bottom: 8px; font-size: 14px; color: #64748B;">Recipient:</td>
                <td style="padding-bottom: 8px; font-size: 14px; font-weight: 600; color: #0F172A; text-align: right;">{{ $recipientEmail }}</td>
            </tr>
            <tr>
                <td style="padding-bottom: 8px; font-size: 14px; color: #64748B;">Mail Driver / Transport:</td>
                <td style="padding-bottom: 8px; font-size: 14px; font-weight: 600; color: #1E6FD9; text-align: right;">{{ $mailer }}</td>
            </tr>
            <tr>
                <td style="font-size: 14px; color: #64748B;">Timestamp (Asia/Colombo):</td>
                <td style="font-size: 14px; color: #475569; text-align: right;">{{ $sentAt }}</td>
            </tr>
        </table>
    </div>

    <p style="margin: 0; font-size: 14px; color: #64748B; line-height: 22px;">
        Headers, SPF, DKIM, and DMARC have passed through the verified domain <strong>medvisit.lk</strong>.
    </p>
@endsection
