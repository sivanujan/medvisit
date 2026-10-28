@php
    $brandMode = $brandMode ?? 'platform';
    $year = date('Y');
    
    // Read platform settings if available, with fallbacks
    $platformSettings = function_exists('app') && app()->bound(\App\Services\PlatformSettingsService::class)
        ? app(\App\Services\PlatformSettingsService::class)
        : null;

    $supportEmail = $platformSettings?->get('general.support_email', config('medvisit_public.business.support_email', 'support@medvisit.lk')) ?? 'support@medvisit.lk';
    $supportPhone = $platformSettings?->get('general.support_phone', config('medvisit_public.business.phone_display', '070 129 1688')) ?? '070 129 1688';
    $supportWhatsApp = $platformSettings?->get('general.support_whatsapp', config('medvisit_public.business.phone_display', '070 129 1688')) ?? '070 129 1688';
@endphp

<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation">
    <tr>
        <td align="center" style="font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 20px; color: #64748B; text-align: center; padding-bottom: 12px;">
            @if ($brandMode === 'clinic')
                <div style="font-weight: 600; color: #0F172A; margin-bottom: 4px;">
                    {{ $clinicName ?? 'Clinic' }}
                </div>
                @if (!empty($clinicAddress) || !empty($clinicPhone))
                    <div style="font-size: 12px; color: #64748B; margin-bottom: 8px;">
                        {{ $clinicAddress ?? '' }} @if(!empty($clinicAddress) && !empty($clinicPhone)) · @endif {{ $clinicPhone ?? '' }}
                    </div>
                @endif
                <div style="font-size: 11px; color: #94A3B8; margin-top: 8px;">
                    This appointment notification was sent by {{ $clinicName ?? 'your clinic' }} using <a href="https://medvisit.lk" target="_blank" style="color: #1E6FD9; text-decoration: none; font-weight: 600;">MedVisit</a> clinic management software.
                </div>
                <div style="font-size: 11px; color: #94A3B8; margin-top: 4px;">
                    &copy; {{ $year }} {{ $clinicName ?? 'Clinic' }} · Powered by <a href="https://medvisit.lk" target="_blank" style="color: #1E6FD9; text-decoration: none;">MedVisit</a>
                </div>
            @else
                <div style="font-weight: 600; color: #0F172A; margin-bottom: 4px;">
                    MedVisit · Clinic management for Sri Lanka
                </div>
                <div style="font-size: 12px; color: #64748B; margin-bottom: 8px;">
                    Help &amp; Support: 
                    <a href="mailto:{{ $supportEmail }}" style="color: #1E6FD9; text-decoration: none;">{{ $supportEmail }}</a>
                    @if (!empty($supportWhatsApp))
                        · WhatsApp: <a href="https://wa.me/{{ preg_replace('/[^0-9]/', '', $supportWhatsApp) }}" target="_blank" style="color: #0E9E8F; text-decoration: none; font-weight: 500;">{{ $supportWhatsApp }}</a>
                    @endif
                </div>

                {{-- Social & Web Links --}}
                <div style="font-size: 12px; margin-bottom: 10px;">
                    <a href="https://medvisit.lk" target="_blank" style="color: #1E6FD9; text-decoration: none; margin: 0 6px;">Website</a> ·
                    <a href="https://facebook.com/medvisitlk" target="_blank" style="color: #1E6FD9; text-decoration: none; margin: 0 6px;">Facebook</a> ·
                    <a href="https://instagram.com/medvisitlk" target="_blank" style="color: #1E6FD9; text-decoration: none; margin: 0 6px;">Instagram</a>
                </div>

                {{-- Reason / Context line --}}
                <div style="font-size: 11px; color: #94A3B8; margin-bottom: 6px;">
                    {{ $reason ?? 'You received this email because you are registered on the MedVisit Platform.' }}
                </div>

                {{-- Unsubscribe / Preferences (Only on non-transactional emails) --}}
                @if (!empty($showUnsubscribe) && !empty($unsubscribeUrl))
                    <div style="font-size: 11px; color: #94A3B8; margin-bottom: 6px;">
                        Don't want to receive announcement emails? 
                        <a href="{{ $unsubscribeUrl }}" target="_blank" style="color: #64748B; text-decoration: underline;">Unsubscribe / Manage preferences</a>
                    </div>
                @endif

                <div style="font-size: 11px; color: #94A3B8; margin-top: 6px;">
                    &copy; {{ $year }} MedVisit (Pvt) Ltd. All rights reserved.
                </div>
            @endif
        </td>
    </tr>
</table>
