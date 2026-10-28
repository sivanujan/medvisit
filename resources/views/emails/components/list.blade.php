@props([
    'items' => [],
    'ordered' => false,
])

<table border="0" cellpadding="0" cellspacing="0" width="100%" role="presentation" style="margin: 16px 0;">
    @foreach ($items as $idx => $item)
        <tr>
            <td valign="top" style="width: 28px; padding-bottom: 12px; font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: 700; color: #1E6FD9; line-height: 22px;">
                @if ($ordered)
                    {{ $idx + 1 }}.
                @else
                    •
                @endif
            </td>
            <td valign="top" style="padding-bottom: 12px; font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; color: #334155; line-height: 22px;">
                {!! $item !!}
            </td>
        </tr>
    @endforeach
</table>
