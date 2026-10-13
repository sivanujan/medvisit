Hello,

Here are the MedVisit clinic accounts associated with your email ({{ $recipientEmail }}):

@foreach($clinics as $clinic)
- {{ $clinic['name'] }} ({{ $clinic['subdomain'] }}.medvisit.lk)
  Login Page: {{ $clinic['login_url'] }}
  @if(!empty($clinic['auto_login_url']))
  Direct Access Link: {{ $clinic['auto_login_url'] }}
  @endif
@endforeach

If you did not request these login links, please ignore this email.

---
MedVisit, Sri Lanka
Support: {{ config('medvisit.mail.reply_to.address', 'support@medvisit.lk') }}
{{ $reason }}
