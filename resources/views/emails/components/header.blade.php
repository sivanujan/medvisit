@php
    $brandMode = $brandMode ?? 'platform';
    $rawLogoUrl = config('medvisit.mail.logo_url');
    // Only use image URL if absolute HTTPS and not localhost
    $hasValidPlatformLogo = !empty($rawLogoUrl) 
        && str_starts_with($rawLogoUrl, 'https://') 
        && !str_contains($rawLogoUrl, 'localhost') 
        && !str_contains($rawLogoUrl, '127.0.0.1');

    $hasValidClinicLogo = !empty($clinicLogo)
        && str_starts_with($clinicLogo, 'https://')
        && !str_contains($clinicLogo, 'localhost')
        && !str_contains($clinicLogo, '127.0.0.1');
@endphp

<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
    <tr>
        @if ($brandMode === 'clinic')
            <td align="left" valign="middle">
                @if ($hasValidClinicLogo)
                    <img src="{{ $clinicLogo }}" height="42" alt="{{ $clinicName ?? 'Clinic' }}" style="display: block; max-height: 42px; width: auto; border: 0; outline: none; text-decoration: none;" />
                @else
                    <div style="font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 20px; font-weight: 700; color: #0F172A; line-height: 24px;">
                        {{ $clinicName ?? 'Clinic' }}
                    </div>
                @endif
                @if (!empty($clinicAddress) || !empty($clinicPhone))
                    <div style="font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #64748B; line-height: 16px; margin-top: 4px;">
                        {{ $clinicAddress ?? '' }} @if(!empty($clinicAddress) && !empty($clinicPhone)) · @endif {{ $clinicPhone ?? '' }}
                    </div>
                @endif
            </td>
            <td align="right" valign="middle" style="font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 11px; color: #94A3B8; line-height: 16px;">
                <span>Powered by</span>
                <a href="https://medvisit.lk" target="_blank" style="color: #1E6FD9; font-weight: 600; text-decoration: none; margin-left: 2px;">MedVisit</a>
            </td>
        @else
            <td align="left" valign="middle">
                <a href="https://medvisit.lk" target="_blank" style="text-decoration: none; display: inline-block;">
                    @if ($hasValidPlatformLogo)
                        <img src="{{ $rawLogoUrl }}" width="144" height="48" alt="MedVisit" style="display: block; width: 144px; height: 48px; border: 0; outline: none; text-decoration: none;" />
                    @else
                        {{-- Bulletproof Text Wordmark Fallback (Zero broken images in Gmail) --}}
                        <table border="0" cellpadding="0" cellspacing="0" role="presentation">
                            <tr>
                                <td style="padding-right: 8px;" valign="middle">
                                    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="background: linear-gradient(135deg, #1E6FD9 0%, #0E9E8F 100%); background-color: #1E6FD9; border-radius: 8px; width: 32px; height: 32px;">
                                        <tr>
                                            <td align="center" valign="middle" style="color: #FFFFFF; font-family: -apple-system, 'Segoe UI', Arial, sans-serif; font-size: 18px; font-weight: 800; line-height: 32px;">
                                                M
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                                <td valign="middle" style="font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 22px; font-weight: 700; color: #0F172A; letter-spacing: -0.4px;">
                                    Med<span style="color: #0E9E8F;">Visit</span>
                                </td>
                            </tr>
                        </table>
                    @endif
                </a>
            </td>
            <td align="right" valign="middle" style="font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; color: #64748B;">
                <span style="display: inline-block; background-color: #EEF4FF; color: #1E6FD9; font-weight: 600; padding: 4px 10px; border-radius: 12px; font-size: 11px;">
                    Sri Lanka
                </span>
            </td>
        @endif
    </tr>
</table>
