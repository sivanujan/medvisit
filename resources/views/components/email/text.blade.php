@props(['muted' => false])

<p style="font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: {{ $muted ? '13px' : '15px' }}; line-height: 1.6; color: {{ $muted ? '#64748B' : '#334155' }}; margin: 0 0 16px 0;">
    {{ $slot }}
</p>
