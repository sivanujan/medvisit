@props([
    'teamName' => 'The MedVisit Team',
    'supportEmail' => 'support@medvisit.lk',
])

<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin-top: 24px;">
    <tr>
        <td style="font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 22px; color: #475569;">
            Best regards,<br />
            <strong style="color: #0F172A; font-weight: 600;">{{ $teamName }}</strong>
            @if (!empty($supportEmail))
                <br /><a href="mailto:{{ $supportEmail }}" style="color: #1E6FD9; text-decoration: none; font-size: 13px;">{{ $supportEmail }}</a>
            @endif
        </td>
    </tr>
</table>
