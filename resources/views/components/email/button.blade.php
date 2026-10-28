@props([
    'url' => '#',
    'align' => 'left',
    'showFallback' => true,
    'label' => null,
])

@php
    $text = $label ?? (string)$slot;
    $tableAlign = $align === 'center' ? 'center' : ($align === 'right' ? 'right' : 'left');
@endphp

<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin: 20px 0 24px 0;">
    <tr>
        <td align="{{ $tableAlign }}">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ $url }}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="21%" stroke="f" fillcolor="#1E6FD9">
                <w:anchorlock/>
                <center style="color:#ffffff;font-family:-apple-system,'Segoe UI',Arial,sans-serif;font-size:15px;font-weight:600;">{!! $text !!}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-- -->
            <a href="{{ $url }}" target="_blank" class="responsive-btn" style="background-color: #1E6FD9; background: #1E6FD9; color: #FFFFFF !important; display: inline-block; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 10px; line-height: 20px; text-align: center; -webkit-text-size-adjust: none; box-sizing: border-box; mso-hide: all;">
                {!! $text !!}
            </a>
            <!--<![endif]-->
        </td>
    </tr>
    @if ($showFallback && !empty($url) && $url !== '#')
        <tr>
            <td align="{{ $tableAlign }}" style="padding-top: 14px;">
                <p style="font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 12px; line-height: 18px; color: #64748B; margin: 0; word-break: break-all;">
                    Button not working? Copy and paste this link into your browser:<br />
                    <a href="{{ $url }}" target="_blank" style="color: #1E6FD9; text-decoration: underline;">{{ $url }}</a>
                </p>
            </td>
        </tr>
    @endif
</table>
