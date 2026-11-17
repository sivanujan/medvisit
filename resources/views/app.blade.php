<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        @php
            $seo = $seo ?? $meta ?? [];
            $serverTitle = $seo['title'] ?? config('app.name', 'Laravel');
        @endphp

        <title inertia>{{ $serverTitle }}</title>

        @if(!empty($seo['description']))
            <meta name="description" content="{{ $seo['description'] }}" head-key="description">
        @endif
        @if(!empty($seo['canonical']))
            <link rel="canonical" href="{{ $seo['canonical'] }}" head-key="canonical">
        @endif
        @if(!empty($seo['robots']))
            <meta name="robots" content="{{ $seo['robots'] }}" head-key="robots">
        @endif

        {{-- Open Graph & Twitter Meta Tags --}}
        @if(!empty($seo))
            <meta property="og:site_name" content="MedVisit" head-key="og:site_name">
            <meta property="og:locale" content="en_LK" head-key="og:locale">
            <meta property="og:type" content="{{ $seo['og_type'] ?? 'website' }}" head-key="og:type">
            <meta property="og:title" content="{{ $seo['og_title'] ?? $seo['title'] ?? $serverTitle }}" head-key="og:title">
            <meta property="og:description" content="{{ $seo['og_description'] ?? $seo['description'] ?? '' }}" head-key="og:description">
            @if(!empty($seo['og_url'] ?? $seo['canonical']))
                <meta property="og:url" content="{{ $seo['og_url'] ?? $seo['canonical'] }}" head-key="og:url">
            @endif
            @if(!empty($seo['og_image']))
                <meta property="og:image" content="{{ $seo['og_image'] }}" head-key="og:image">
                <meta property="og:image:width" content="1200" head-key="og:image:width">
                <meta property="og:image:height" content="630" head-key="og:image:height">
                @if(!empty($seo['og_image_alt']))
                    <meta property="og:image:alt" content="{{ $seo['og_image_alt'] }}" head-key="og:image:alt">
                @endif
            @endif

            <meta name="twitter:card" content="{{ $seo['twitter_card'] ?? 'summary_large_image' }}" head-key="twitter:card">
            <meta name="twitter:title" content="{{ $seo['og_title'] ?? $seo['title'] ?? $serverTitle }}" head-key="twitter:title">
            <meta name="twitter:description" content="{{ $seo['og_description'] ?? $seo['description'] ?? '' }}" head-key="twitter:description">
            @if(!empty($seo['og_image']))
                <meta name="twitter:image" content="{{ $seo['og_image'] }}" head-key="twitter:image">
            @endif

            {{-- JSON-LD Structured Data --}}
            @if(!empty($seo['json_ld']))
                @php
                    $jsonLdSchemas = is_array($seo['json_ld']) && isset($seo['json_ld']['@context'])
                        ? [$seo['json_ld']]
                        : (is_array($seo['json_ld']) ? $seo['json_ld'] : []);
                @endphp
                @foreach($jsonLdSchemas as $schema)
                    <script type="application/ld+json" head-key="ldjson-{{ $loop->index }}">{!! json_encode($schema, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) !!}</script>
                @endforeach
            @endif
        @endif

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=Noto+Sans+Sinhala:wght@400;600;700&family=Noto+Sans+Tamil:wght@400;600;700&display=swap" rel="stylesheet">

        <!-- Dynamic Favicon per clinic subdomain -->
        @php
            $currentTenant = function_exists('tenant') ? tenant() : null;
            $faviconUrl = ($currentTenant && !empty($currentTenant->favicon_url)) ? $currentTenant->favicon_url : asset('favicon.ico');
        @endphp
        <link rel="icon" href="{{ $faviconUrl }}">

        <!-- Scripts -->
        @php
            $currentTenant = function_exists('tenant') ? tenant() : null;
            $user = auth()->user();

            if ($user && $user->hasRole('super_admin') && request()->is('super-admin*')) {
                $ziggyGroup = 'super_admin';
            } elseif ($user && $currentTenant && ! request()->routeIs('tenant.home', 'tenant.page', 'tenant.book*', 'tenant.live-queue*')) {
                $ziggyGroup = 'tenant';
            } else {
                $ziggyGroup = 'public';
            }
        @endphp
        @routes($ziggyGroup)
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
