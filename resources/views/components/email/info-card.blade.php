@props([
    'title' => null,
    'items' => [],
])

<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" class="info-box" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; margin: 20px 0; border-collapse: separate;">
    @if (!empty($title))
        <tr>
            <td colspan="2" style="padding: 16px 20px 10px 20px; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 700; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #E2E8F0;">
                {{ $title }}
            </td>
        </tr>
    @endif

    @if (!empty($items) && is_array($items))
        @foreach ($items as $label => $value)
            <tr>
                <td valign="top" style="padding: 10px 20px; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #64748B; width: 38%; line-height: 20px; border-bottom: {{ $loop->last ? 'none' : '1px solid #EDF2F7' }};">
                    {{ is_numeric($label) ? ($value['label'] ?? '') : $label }}
                </td>
                <td valign="top" align="right" style="padding: 10px 20px; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #0F172A; line-height: 20px; border-bottom: {{ $loop->last ? 'none' : '1px solid #EDF2F7' }};">
                    {!! is_numeric($label) ? ($value['value'] ?? '') : $value !!}
                </td>
            </tr>
        @endforeach
    @else
        <tr>
            <td style="padding: 16px 20px; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #334155; line-height: 22px;">
                {{ $slot }}
            </td>
        </tr>
    @endif
</table>
