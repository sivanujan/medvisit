[{{ strtoupper($announcement->type) }}] {{ $announcement->title }}

{{ strip_tags(str_replace(['<br>', '<p>', '</p>'], ["\n", "\n\n", ""], $announcement->message)) }}

@if($announcement->cta_label && ($trackingCtaUrl || $announcement->cta_url))
{{ $announcement->cta_label }}: {{ $trackingCtaUrl ?: $announcement->cta_url }}
@endif

--
Sent by MedVisit Platform to your clinic team.
@if($showUnsubscribe && $unsubscribeUrl)
To mute announcement emails, visit: {{ $unsubscribeUrl }}
@endif
