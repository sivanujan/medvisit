@extends('emails.layouts.base', [
    'subject' => $subject ?? 'MedVisit',
    'preheader' => $previewText ?? null,
    'reason' => $reason ?? null,
])

@section('content')
    @yield('content')
@endsection
