@php
    $code = (int) ($code ?? $exception?->getStatusCode() ?? 404);
    if (!in_array($code, [403, 404, 419, 429, 500, 503])) {
        $code = 404;
    }

    $resolvedTenant = null;
    $isUnknownSubdomain = false;
    $subdomainName = null;
    $isClinicDomain = false;

    // 1. Check if Stancl tenancy already initialized a tenant
    try {
        if (function_exists('tenant') && tenant()) {
            $resolvedTenant = tenant();
            $isClinicDomain = true;
        }
    } catch (\Throwable $e) {}

    // 2. Safe check against request Host & central domains
    if (!$resolvedTenant) {
        try {
            $host = request()->getHost();
            $centralDomains = (array) config('tenancy.central_domains', ['medvisit.lk', 'localhost', '127.0.0.1', 'medvisit.localhost']);
            
            $isCentral = false;
            foreach ($centralDomains as $cd) {
                if ($host === $cd || $host === 'www.' . $cd) {
                    $isCentral = true;
                    break;
                }
            }

            if (!$isCentral) {
                foreach ($centralDomains as $cd) {
                    if (str_ends_with($host, '.' . $cd)) {
                        $sub = substr($host, 0, -strlen('.' . $cd));
                        if ($sub && $sub !== 'www') {
                            $subdomainName = $sub;
                            $isClinicDomain = true;
                            try {
                                $resolvedTenant = \App\Models\Tenant::where('subdomain', $sub)
                                    ->orWhere('id', $sub)
                                    ->first();
                            } catch (\Throwable $e) {
                                $resolvedTenant = null;
                            }
                            if (!$resolvedTenant) {
                                $isUnknownSubdomain = true;
                            }
                            break;
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
            $resolvedTenant = null;
            $isUnknownSubdomain = false;
        }
    }

    // 3. Local test preview overrides
    if (app()->environment('local', 'testing')) {
        if (request()->query('test_tenant')) {
            $testId = request()->query('test_tenant');
            try {
                $resolvedTenant = \App\Models\Tenant::find($testId) ?? \App\Models\Tenant::where('subdomain', $testId)->first();
                if ($resolvedTenant) {
                    $isClinicDomain = true;
                    $isUnknownSubdomain = false;
                }
            } catch (\Throwable $e) {}
        } elseif (request()->query('test_unknown')) {
            $isUnknownSubdomain = true;
            $subdomainName = (string) request()->query('test_unknown', 'unknownclinic');
            $isClinicDomain = true;
            $resolvedTenant = null;
        }
    }

    // Central base URL
    $centralDomain = config('tenancy.central_domains')[0] ?? 'medvisit.lk';
    $scheme = request()->getScheme();
    $port = request()->getPort();
    $portSuffix = ($port && !in_array($port, [80, 443])) ? ':' . $port : '';
    $centralBaseUrl = $scheme . '://' . $centralDomain . $portSuffix;

    // Clinic branding
    $brandColor = '#1E6FD9'; // Default MedVisit Blue
    $clinicName = 'MedVisit';
    $clinicLogo = null;
    $onlineBookingEnabled = false;

    if ($resolvedTenant) {
        $clinicName = $resolvedTenant->name ?? 'Clinic';
        $brandColor = $resolvedTenant->brandColor() ?: '#0E9E8F';
        $onlineBookingEnabled = (bool) ($resolvedTenant->online_booking_enabled ?? false);
        
        // Check if physical logo exists
        $rawLogo = $resolvedTenant->logo_url;
        if ($rawLogo && !str_starts_with($rawLogo, 'http') && file_exists(public_path($rawLogo))) {
            $clinicLogo = $rawLogo;
        } elseif ($rawLogo && str_starts_with($rawLogo, 'http')) {
            $pathPart = parse_url($rawLogo, PHP_URL_PATH);
            if ($pathPart && file_exists(public_path($pathPart))) {
                $clinicLogo = $pathPart;
            }
        }
    }

    // Colombo issued timestamp
    try {
        $issuedTime = now('Asia/Colombo')->format('d M Y · h:i A');
    } catch (\Throwable $e) {
        $issuedTime = date('d M Y · h:i A');
    }

    // Messages per status code
    $statusConfig = [
        404 => [
            'badge' => 'Token 404 · Skipped',
            'tv_status' => "This page isn't in today's queue.",
            'headline' => $isUnknownSubdomain
                ? "This clinic address isn't registered on MedVisit"
                : "Looks like this page skipped its turn.",
            'subtext' => $isUnknownSubdomain
                ? "The clinic link '{$subdomainName}' could not be found. Check the URL for typos or find a registered clinic below."
                : "The link may be old, mistyped, or the page has moved.",
            'slip_label' => 'Page not found',
        ],
        403 => [
            'badge' => 'Token 403 · Restricted',
            'tv_status' => 'Access restricted to authorized personnel.',
            'headline' => 'This consultation is private.',
            'subtext' => "You don't have permission to access this clinic area or resource.",
            'slip_label' => 'Access restricted',
        ],
        419 => [
            'badge' => 'Token 419 · Expired',
            'tv_status' => 'Session expired due to inactivity.',
            'headline' => 'Your session ticket has expired.',
            'subtext' => 'For patient security, form tokens expire after inactivity. Please refresh and try again.',
            'slip_label' => 'Token expired',
        ],
        429 => [
            'badge' => 'Token 429 · Counter Busy',
            'tv_status' => 'Too many requests at the counter.',
            'headline' => 'Queue limit reached. Please wait a moment.',
            'subtext' => 'We are processing a high volume of requests. Take a short breath and try again.',
            'slip_label' => 'Counter busy',
        ],
        500 => [
            'badge' => 'Token 500 · System Alert',
            'tv_status' => 'Station experiencing technical difficulty.',
            'headline' => 'Something went wrong on our side.',
            'subtext' => "We've been notified and our technical team is investigating.",
            'slip_label' => 'System alert',
        ],
        503 => [
            'badge' => 'Token 503 · Tune-up',
            'tv_status' => 'Clinic system undergoing scheduled tune-up.',
            'headline' => 'System undergoing maintenance.',
            'subtext' => 'We are applying system updates and will be back shortly.',
            'slip_label' => 'Maintenance in progress',
        ],
    ];

    $info = $statusConfig[$code] ?? $statusConfig[404];
    $pageTitle = $code . ' — ' . ($isUnknownSubdomain ? 'Clinic Not Found' : $info['headline']);
@endphp
<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>{{ $pageTitle }} · {{ $isClinicDomain && $resolvedTenant ? $clinicName : 'MedVisit' }}</title>

    <!-- Google Fonts: Poppins -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400&display=swap" rel="stylesheet">

    @if($resolvedTenant && !empty($resolvedTenant->favicon_url))
        <link rel="icon" href="{{ $resolvedTenant->favicon_url }}">
    @else
        <link rel="icon" href="/favicon.ico">
    @endif

    <style>
        :root {
            --mv-blue: #1E6FD9;
            --mv-teal: #0E9E8F;
            --mv-coral: #FF7A59;
            --clinic-brand: {{ $brandColor }};
            
            /* Light theme tokens */
            --bg-page: #F4F7FC;
            --bg-dot: rgba(30, 111, 217, 0.12);
            --text-heading: #0F172A;
            --text-body: #475569;
            --text-muted: #64748B;
            --card-glass-bg: rgba(255, 255, 255, 0.9);
            --card-glass-border: rgba(226, 232, 240, 0.9);
            --card-glass-shadow: 0 20px 45px -15px rgba(15, 23, 42, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.8) inset;
            
            /* TV Display tokens */
            --tv-bg: #071326;
            --tv-border: rgba(30, 111, 217, 0.35);
            --tv-glow: rgba(14, 158, 143, 0.25);
            --tv-text: #F8FAFC;
            --tv-sub: #94A3B8;

            /* Slip tokens */
            --slip-bg: #FFFFFF;
            --slip-border: rgba(226, 232, 240, 0.95);
            --slip-shadow: 0 24px 40px -15px rgba(15, 23, 42, 0.15);
            --slip-ink: #0F172A;
            --slip-meta: #64748B;
            --slip-perf: #CBD5E1;
        }

        .dark {
            /* Dark theme tokens */
            --bg-page: #08111F;
            --bg-dot: rgba(255, 255, 255, 0.07);
            --text-heading: #F8FAFC;
            --text-body: #94A3B8;
            --text-muted: #64748B;
            --card-glass-bg: rgba(15, 23, 42, 0.75);
            --card-glass-border: rgba(255, 255, 255, 0.12);
            --card-glass-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset;

            /* TV Display tokens */
            --tv-bg: #040914;
            --tv-border: rgba(30, 111, 217, 0.45);
            --tv-glow: rgba(14, 158, 143, 0.3);

            /* Slip tokens */
            --slip-bg: #0E1A2E;
            --slip-border: rgba(255, 255, 255, 0.14);
            --slip-shadow: 0 24px 40px -15px rgba(0, 0, 0, 0.65);
            --slip-ink: #F1F5F9;
            --slip-meta: #94A3B8;
            --slip-perf: rgba(255, 255, 255, 0.18);
        }

        *, *::before, *::after {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        html, body {
            min-height: 100%;
            height: 100%;
            font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: var(--bg-page);
            color: var(--text-body);
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            transition: background-color 0.25s ease, color 0.25s ease;
        }

        /* Dot Grid Background Pattern */
        .mv-grid-pattern {
            background-image: radial-gradient(var(--bg-dot) 1.5px, transparent 1.5px);
            background-size: 24px 24px;
        }

        /* Ambient Blur Spheres */
        .ambient-glow-1 {
            position: absolute;
            top: 8%;
            left: 15%;
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(30, 111, 217, 0.15) 0%, rgba(30, 111, 217, 0) 70%);
            border-radius: 50%;
            pointer-events: none;
            filter: blur(50px);
            z-index: 0;
        }

        .ambient-glow-2 {
            position: absolute;
            bottom: 10%;
            right: 15%;
            width: 460px;
            height: 460px;
            background: radial-gradient(circle, rgba(14, 158, 143, 0.15) 0%, rgba(14, 158, 143, 0) 70%);
            border-radius: 50%;
            pointer-events: none;
            filter: blur(50px);
            z-index: 0;
        }

        /* Page Layout */
        .page-wrapper {
            position: relative;
            z-index: 1;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        .header-bar {
            width: 100%;
            padding: 1.25rem 1.5rem;
        }

        .header-inner {
            max-width: 1140px;
            margin: 0 auto;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .brand-link {
            display: flex;
            align-items: center;
            gap: 0.85rem;
            text-decoration: none;
            color: inherit;
        }

        .brand-avatar {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-weight: 700;
            font-size: 1.1rem;
            box-shadow: 0 4px 12px rgba(30, 111, 217, 0.25);
            overflow: hidden;
            flex-shrink: 0;
        }

        .brand-avatar img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            background: #fff;
        }

        .brand-title {
            font-size: 1.05rem;
            font-weight: 700;
            color: var(--text-heading);
            line-height: 1.2;
        }

        .brand-subtitle {
            font-size: 0.75rem;
            font-weight: 500;
            color: var(--text-muted);
        }

        .theme-btn {
            width: 42px;
            height: 42px;
            border-radius: 12px;
            border: 1px solid var(--card-glass-border);
            background: var(--card-glass-bg);
            color: var(--text-heading);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .theme-btn:hover {
            transform: scale(1.05);
            border-color: var(--mv-blue);
        }

        /* Main Content Container */
        .main-container {
            max-width: 1140px;
            margin: 0 auto;
            padding: 1.5rem 1.5rem 2.5rem;
            width: 100%;
            flex: 1;
            display: flex;
            align-items: center;
        }

        .content-grid {
            width: 100%;
            display: grid;
            grid-template-columns: 1.15fr 1fr;
            gap: 3.5rem;
            align-items: center;
        }

        @media (max-width: 960px) {
            .content-grid {
                grid-template-columns: 1fr;
                gap: 2.5rem;
                text-align: center;
            }
        }

        /* TV Display Card */
        .tv-card {
            background: var(--tv-bg);
            border: 1px solid var(--tv-border);
            border-radius: 26px;
            box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.5), 0 0 35px var(--tv-glow);
            position: relative;
            overflow: hidden;
            color: var(--tv-text);
            padding: 1.6rem 1.75rem;
            width: 100%;
            max-width: 450px;
            margin: 0 auto;
            animation: tvGlowPulse 4s ease-in-out infinite;
        }

        @keyframes tvGlowPulse {
            0%, 100% {
                box-shadow: 0 20px 45px -10px rgba(0, 0, 0, 0.5), 0 0 30px var(--tv-glow);
            }
            50% {
                box-shadow: 0 25px 50px -10px rgba(0, 0, 0, 0.6), 0 0 45px rgba(14, 158, 143, 0.4);
            }
        }

        .tv-card::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, transparent 45%);
            pointer-events: none;
        }

        .tv-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .tv-tag {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #93C5FD;
        }

        .tv-indicator {
            display: flex;
            align-items: center;
            gap: 0.45rem;
            border-radius: 9999px;
            background: rgba(255, 255, 255, 0.1);
            padding: 0.25rem 0.75rem;
            font-size: 0.75rem;
            font-weight: 500;
            color: #E2E8F0;
        }

        /* Live Pulsing Dot */
        .live-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: var(--mv-teal);
            box-shadow: 0 0 10px var(--mv-teal);
            animation: livePulse 2s ease-in-out infinite;
        }

        @keyframes livePulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.4); opacity: 0.6; }
        }

        /* TV Body */
        .tv-body {
            padding: 1.4rem 0 1rem;
            text-align: center;
        }

        .now-serving-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            color: #CBD5E1;
            margin-bottom: 0.75rem;
        }

        .chime-icon {
            color: var(--mv-coral);
            animation: chimeRing 2.5s ease-in-out infinite;
        }

        @keyframes chimeRing {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); filter: drop-shadow(0 0 6px var(--mv-coral)); }
        }

        /* Counter Board */
        .counter-board {
            background: rgba(0, 0, 0, 0.55);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 18px;
            padding: 0.85rem 1.5rem;
            text-align: center;
            position: relative;
            box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.7);
            max-width: 290px;
            margin: 0 auto;
        }

        .counter-board::after {
            content: '';
            position: absolute;
            left: 0;
            right: 0;
            top: 50%;
            height: 1px;
            background: rgba(0, 0, 0, 0.8);
            box-shadow: 0 1px 0 rgba(255, 255, 255, 0.12);
        }

        .counter-digits {
            font-size: 5.5rem;
            font-weight: 800;
            line-height: 1;
            letter-spacing: -0.04em;
            color: #FFFFFF;
            font-variant-numeric: tabular-nums;
            text-shadow: 0 0 30px rgba(79, 209, 195, 0.45);
            display: inline-block;
        }

        /* Dedicated Status Line */
        .tv-status-badge {
            margin-top: 1.15rem;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.825rem;
            font-weight: 500;
            color: #F87171;
            background: rgba(239, 68, 68, 0.12);
            border: 1px solid rgba(239, 68, 68, 0.25);
            padding: 0.4rem 0.95rem;
            border-radius: 9999px;
            max-width: 90%;
        }

        /* TV Footer */
        .tv-footer {
            padding-top: 1rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.78rem;
            color: #94A3B8;
        }

        .tv-status-sub {
            display: flex;
            align-items: center;
            gap: 0.45rem;
            font-weight: 500;
        }

        .live-pulse-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: var(--mv-teal);
        }

        .room-chip {
            font-family: monospace;
            font-size: 0.75rem;
            color: #CBD5E1;
            background: rgba(255, 255, 255, 0.08);
            padding: 0.15rem 0.5rem;
            border-radius: 6px;
        }

        /* Visual Cluster */
        .visual-cluster {
            position: relative;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        /* Printed Thermal Token Slip */
        .token-slip {
            background: var(--slip-bg);
            border: 1px solid var(--slip-border);
            border-radius: 18px;
            box-shadow: var(--slip-shadow);
            color: var(--slip-ink);
            position: relative;
            width: 100%;
            max-width: 320px;
            margin-top: 1.1rem;
            margin-left: auto;
            margin-right: auto;
            padding: 1.15rem 1.15rem 0.45rem;
            z-index: 2;
            animation: slipFloat 4.5s ease-in-out infinite;
            transform-origin: center center;
        }

        @keyframes slipFloat {
            0%, 100% {
                transform: translateY(0px) rotate(-1.5deg);
            }
            50% {
                transform: translateY(-8px) rotate(0.5deg);
            }
        }

        .slip-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-bottom: 0.55rem;
        }

        .slip-clinic-name {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--slip-meta);
        }

        /* Perforation Line with Side Notches */
        .slip-perforation {
            position: relative;
            margin: 0.7rem 0;
            border-top: 2px dashed var(--slip-perf);
        }

        .slip-notch-left, .slip-notch-right {
            position: absolute;
            top: -9px;
            width: 18px;
            height: 18px;
            background-color: var(--bg-page);
            border-radius: 50%;
            border: 1px solid var(--slip-border);
            z-index: 2;
        }

        .slip-notch-left {
            left: -18px;
            clip-path: polygon(50% 0%, 100% 0%, 100% 100%, 50% 100%);
        }

        .slip-notch-right {
            right: -18px;
            clip-path: polygon(0% 0%, 50% 0%, 50% 100%, 0% 100%);
        }

        .slip-body {
            padding: 0.4rem 0;
            text-align: center;
        }

        .slip-token-title {
            font-size: 2rem;
            font-weight: 800;
            letter-spacing: -0.02em;
            color: var(--slip-ink);
            line-height: 1.1;
        }

        .slip-token-status {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--mv-teal);
            margin-top: 0.2rem;
        }

        .slip-footer {
            padding-top: 0.7rem;
            border-top: 1px solid var(--slip-perf);
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 0.73rem;
            font-weight: 500;
            color: var(--slip-meta);
        }

        /* Serrated Torn Bottom Edge */
        .torn-edge {
            height: 12px;
            margin-top: 0.75rem;
            margin-left: -1.15rem;
            margin-right: -1.15rem;
            background-color: var(--slip-bg);
            background-image: 
                linear-gradient(135deg, transparent 50%, var(--bg-page) 50%),
                linear-gradient(225deg, transparent 50%, var(--bg-page) 50%);
            background-position: bottom left, bottom left;
            background-size: 14px 12px;
            background-repeat: repeat-x;
            border-bottom-left-radius: 16px;
            border-bottom-right-radius: 16px;
        }

        /* Right Column Details & Typography */
        .details-col {
            display: flex;
            flex-direction: column;
            gap: 1.4rem;
        }

        @media (max-width: 960px) {
            .details-col {
                align-items: center;
            }
        }

        .status-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.4rem 0.9rem;
            border-radius: 9999px;
            font-size: 0.8rem;
            font-weight: 600;
            background: rgba(244, 63, 94, 0.1);
            color: #E11D48;
            border: 1px solid rgba(244, 63, 94, 0.2);
            width: fit-content;
        }

        .dark .status-badge {
            background: rgba(244, 63, 94, 0.15);
            color: #FB7185;
            border-color: rgba(244, 63, 94, 0.3);
        }

        .status-badge-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background-color: #E11D48;
        }

        .page-headline {
            font-size: 2.4rem;
            font-weight: 800;
            color: var(--text-heading);
            letter-spacing: -0.03em;
            line-height: 1.2;
        }

        @media (max-width: 640px) {
            .page-headline {
                font-size: 1.95rem;
            }
        }

        .page-subtext {
            font-size: 1.05rem;
            color: var(--text-body);
            line-height: 1.6;
            max-width: 520px;
        }

        /* Action Buttons */
        .actions-group {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.85rem;
            padding-top: 0.5rem;
        }

        @media (max-width: 640px) {
            .actions-group {
                flex-direction: column;
                width: 100%;
            }
        }

        .btn-primary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.6rem;
            padding: 0.85rem 1.6rem;
            background-color: var(--clinic-brand);
            color: #FFFFFF;
            font-weight: 600;
            font-size: 0.925rem;
            border-radius: 14px;
            text-decoration: none;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            box-shadow: 0 4px 14px rgba(30, 111, 217, 0.3);
            border: none;
            cursor: pointer;
        }

        @media (max-width: 640px) {
            .btn-primary {
                width: 100%;
            }
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            filter: brightness(1.08);
            box-shadow: 0 8px 20px rgba(30, 111, 217, 0.4);
        }

        .btn-primary:active {
            transform: translateY(0);
        }

        .btn-secondary {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.6rem;
            padding: 0.85rem 1.5rem;
            background-color: var(--card-glass-bg);
            color: var(--text-heading);
            font-weight: 600;
            font-size: 0.925rem;
            border-radius: 14px;
            text-decoration: none;
            border: 1px solid var(--card-glass-border);
            transition: all 0.2s ease;
            cursor: pointer;
        }

        @media (max-width: 640px) {
            .btn-secondary {
                width: 100%;
            }
        }

        .btn-secondary:hover {
            background-color: rgba(255, 255, 255, 0.95);
            border-color: var(--mv-blue);
            transform: translateY(-2px);
        }

        .dark .btn-secondary:hover {
            background-color: rgba(30, 41, 59, 0.95);
            border-color: rgba(255, 255, 255, 0.25);
        }

        .btn-secondary:active {
            transform: translateY(0);
        }

        /* Central Links */
        .central-links {
            padding-top: 1rem;
            border-top: 1px solid var(--card-glass-border);
            display: flex;
            align-items: center;
            gap: 1.25rem;
            font-size: 0.85rem;
            font-weight: 500;
            color: var(--text-muted);
        }

        @media (max-width: 960px) {
            .central-links {
                justify-content: center;
            }
        }

        .central-links a {
            color: inherit;
            text-decoration: none;
            transition: color 0.15s ease;
        }

        .central-links a:hover {
            color: var(--mv-blue);
        }

        /* Footer */
        .page-footer {
            width: 100%;
            padding: 1.25rem;
            text-align: center;
            font-size: 0.8rem;
            color: var(--text-muted);
        }

        /* Accessible focus ring */
        a:focus-visible, button:focus-visible {
            outline: 3px solid var(--mv-blue);
            outline-offset: 3px;
        }

        /* Utility visibility */
        .hidden { display: none !important; }

        /* Prefers-reduced-motion: zero animation */
        @media (prefers-reduced-motion: reduce) {
            .token-slip, .tv-card, .chime-icon, .live-dot {
                animation: none !important;
                transform: none !important;
            }
            .counter-digits {
                text-shadow: none !important;
            }
            * {
                transition-duration: 0.01ms !important;
            }
        }
    </style>
</head>
<body class="mv-grid-pattern">
    <div class="ambient-glow-1"></div>
    <div class="ambient-glow-2"></div>

    <div class="page-wrapper">
        <!-- Header Bar -->
        <header class="header-bar">
            <div class="header-inner">
                <a href="{{ $isClinicDomain && $resolvedTenant ? '/' : $centralBaseUrl }}" class="brand-link">
                    @if($resolvedTenant && $clinicLogo)
                        <div class="brand-avatar">
                            <img src="{{ $clinicLogo }}" alt="{{ $clinicName }} Logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                            <div style="display:none; width:100%; height:100%; align-items:center; justify-content:center; background:linear-gradient(135deg, #1E6FD9, {{ $brandColor }});">
                                {{ strtoupper(substr($clinicName, 0, 2)) }}
                            </div>
                        </div>
                    @elseif($resolvedTenant)
                        <div class="brand-avatar" style="background: linear-gradient(135deg, #1E6FD9, {{ $brandColor }});">
                            {{ strtoupper(substr($clinicName, 0, 2)) }}
                        </div>
                    @else
                        <div class="brand-avatar" style="background: #1E6FD9;">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M12 2v20M2 12h20"/>
                            </svg>
                        </div>
                    @endif

                    <div>
                        <div class="brand-title">{{ $isClinicDomain && $resolvedTenant ? $clinicName : 'MedVisit' }}</div>
                        <div class="brand-subtitle">
                            @if($isClinicDomain && $resolvedTenant)
                                {{ $resolvedTenant->city ? $resolvedTenant->city . ' · ' : '' }}Clinic Workspace
                            @elseif($isUnknownSubdomain)
                                Unregistered Workspace
                            @else
                                Sri Lanka's Clinic Platform
                            @endif
                        </div>
                    </div>
                </a>

                <!-- Theme Toggle Button -->
                <button id="theme-toggle" onclick="toggleTheme()" class="theme-btn" title="Toggle Light / Dark mode" aria-label="Toggle theme">
                    <!-- Sun Icon (dark mode) -->
                    <svg id="theme-icon-sun" class="hidden" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="5"></circle>
                        <line x1="12" y1="1" x2="12" y2="3"></line>
                        <line x1="12" y1="21" x2="12" y2="23"></line>
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                        <line x1="1" y1="12" x2="3" y2="12"></line>
                        <line x1="21" y1="12" x2="23" y2="12"></line>
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                    </svg>
                    <!-- Moon Icon (light mode) -->
                    <svg id="theme-icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
                    </svg>
                </button>
            </div>
        </header>

        <!-- Main Content Area -->
        <main class="main-container">
            <div class="content-grid">
                
                <!-- Left: Waiting-room TV display card & printed token slip -->
                <div class="visual-cluster">
                    
                    <!-- Centre piece: Waiting-room TV display card -->
                    <div class="tv-card">
                        <div class="tv-header">
                            <div class="tv-tag">
                                <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#1E6FD9;"></span>
                                <span>{{ $isClinicDomain && $resolvedTenant ? $clinicName : 'General OPD · Session 01' }}</span>
                            </div>
                            <div class="tv-indicator">
                                <span class="live-dot"></span>
                                <span>Live Display</span>
                            </div>
                        </div>

                        <div class="tv-body">
                            <div class="now-serving-badge">
                                <svg class="chime-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                </svg>
                                <span>Now Serving</span>
                            </div>

                            <div class="counter-board">
                                <div id="counter-value" class="counter-digits" data-target="{{ $code }}">
                                    {{ $code }}
                                </div>
                            </div>

                            <!-- TV Status Line directly below counter -->
                            <div>
                                <div class="tv-status-badge">
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <line x1="12" y1="8" x2="12" y2="12"></line>
                                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                    </svg>
                                    <span>{{ $info['tv_status'] }}</span>
                                </div>
                            </div>
                        </div>

                        <div class="tv-footer">
                            <div class="tv-status-sub">
                                <span class="live-pulse-dot"></span>
                                <span>Queue System Active</span>
                            </div>
                            <span class="room-chip">ROOM 01</span>
                        </div>
                    </div>

                    <!-- Beside or below: Printed token slip -->
                    <div class="token-slip">
                        <div class="slip-header">
                            <span class="slip-clinic-name">{{ $isClinicDomain && $resolvedTenant ? $clinicName : 'MedVisit Queue Slip' }}</span>
                            <!-- SVG Barcode representation -->
                            <svg width="60" height="16" viewBox="0 0 60 16" fill="currentColor" style="opacity: 0.7;">
                                <rect x="0" y="0" width="3" height="16"></rect>
                                <rect x="5" y="0" width="1.5" height="16"></rect>
                                <rect x="8" y="0" width="3.5" height="16"></rect>
                                <rect x="14" y="0" width="2" height="16"></rect>
                                <rect x="18" y="0" width="4" height="16"></rect>
                                <rect x="24" y="0" width="1.5" height="16"></rect>
                                <rect x="27" y="0" width="3" height="16"></rect>
                                <rect x="32" y="0" width="1" height="16"></rect>
                                <rect x="35" y="0" width="3.5" height="16"></rect>
                                <rect x="41" y="0" width="2" height="16"></rect>
                                <rect x="45" y="0" width="4" height="16"></rect>
                                <rect x="51" y="0" width="2" height="16"></rect>
                                <rect x="55" y="0" width="3" height="16"></rect>
                            </svg>
                        </div>

                        <div class="slip-perforation">
                            <div class="slip-notch-left"></div>
                            <div class="slip-notch-right"></div>
                        </div>

                        <div class="slip-body">
                            <div class="slip-token-title">Token {{ $code }}</div>
                            <div class="slip-token-status">{{ $info['slip_label'] }}</div>
                        </div>

                        <div class="slip-footer">
                            <span>Issued: {{ $issuedTime }}</span>
                            <span style="font-family:monospace;">#TK-{{ $code }}</span>
                        </div>

                        <!-- Torn bottom edge -->
                        <div class="torn-edge"></div>
                    </div>

                </div>

                <!-- Right: Headline, Subtext, Actions -->
                <div class="details-col">
                    <div class="status-badge">
                        <span class="status-badge-dot"></span>
                        <span>{{ $info['badge'] }}</span>
                    </div>

                    <!-- Single Accessible H1 Headline -->
                    <h1 class="page-headline">{{ $info['headline'] }}</h1>

                    <p class="page-subtext">{{ $info['subtext'] }}</p>

                    <!-- Buttons -->
                    <div class="actions-group">
                        @if($isClinicDomain && $resolvedTenant)
                            <!-- Clinic Workspace Buttons -->
                            <a href="/" class="btn-primary">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                                <span>Go to {{ $clinicName }} home</span>
                            </a>

                            @if($onlineBookingEnabled)
                                <a href="/book" class="btn-secondary">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mv-teal)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    <span>Book a token</span>
                                </a>
                            @endif

                            <button id="btn-go-back" onclick="history.back()" class="btn-secondary">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="19" y1="12" x2="5" y2="12"></line>
                                    <polyline points="12 19 5 12 12 5"></polyline>
                                </svg>
                                <span>Go back</span>
                            </button>

                        @elseif($isUnknownSubdomain)
                            <!-- Unregistered Clinic Subdomain Buttons -->
                            <a href="{{ $centralBaseUrl }}" class="btn-primary">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                                <span>Go to medvisit.lk</span>
                            </a>

                            <a href="{{ $centralBaseUrl }}/find" class="btn-secondary">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--mv-teal)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                                <span>Find a clinic</span>
                            </a>

                            <button id="btn-go-back" onclick="history.back()" class="btn-secondary">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="19" y1="12" x2="5" y2="12"></line>
                                    <polyline points="12 19 5 12 12 5"></polyline>
                                </svg>
                                <span>Go back</span>
                            </button>

                        @else
                            <!-- Central MedVisit Domain Buttons -->
                            <a href="/" class="btn-primary">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                                </svg>
                                <span>Go to homepage</span>
                            </a>

                            <button id="btn-go-back" onclick="history.back()" class="btn-secondary">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <line x1="19" y1="12" x2="5" y2="12"></line>
                                    <polyline points="12 19 5 12 12 5"></polyline>
                                </svg>
                                <span>Go back</span>
                            </button>
                        @endif
                    </div>

                    <!-- Mini Links (Central only) -->
                    @if(!$isClinicDomain && !$isUnknownSubdomain)
                        <div class="central-links">
                            <a href="/pricing">Pricing</a>
                            <span>·</span>
                            <a href="/contact">Contact</a>
                            <span>·</span>
                            <a href="https://help.medvisit.lk" target="_blank" rel="noopener noreferrer">Help</a>
                        </div>
                    @endif

                </div>

            </div>
        </main>

        <!-- Footer -->
        <footer class="page-footer">
            <p>© {{ date('Y') }} MedVisit. All rights reserved. Sri Lanka standard time (Asia/Colombo).</p>
        </footer>
    </div>

    <script>
        // 1. Theme Initialization and Toggle
        function initTheme() {
            var savedTheme = localStorage.getItem('medvisit_theme');
            var isDark = false;
            if (savedTheme) {
                isDark = savedTheme === 'dark';
            } else {
                isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            }

            if (isDark) {
                document.documentElement.classList.add('dark');
                document.getElementById('theme-icon-sun').classList.remove('hidden');
                document.getElementById('theme-icon-moon').classList.add('hidden');
            } else {
                document.documentElement.classList.remove('dark');
                document.getElementById('theme-icon-sun').classList.add('hidden');
                document.getElementById('theme-icon-moon').classList.remove('hidden');
            }
        }

        function toggleTheme() {
            var isDark = document.documentElement.classList.toggle('dark');
            localStorage.setItem('medvisit_theme', isDark ? 'dark' : 'light');
            if (isDark) {
                document.getElementById('theme-icon-sun').classList.remove('hidden');
                document.getElementById('theme-icon-moon').classList.add('hidden');
            } else {
                document.getElementById('theme-icon-sun').classList.add('hidden');
                document.getElementById('theme-icon-moon').classList.remove('hidden');
            }
        }

        initTheme();

        // 2. Hide "Go back" button if there is no browser history
        document.addEventListener('DOMContentLoaded', function () {
            var backBtn = document.getElementById('btn-go-back');
            if (backBtn && (!window.history || window.history.length <= 1)) {
                backBtn.style.display = 'none';
            }

            // 3. Counter Animation (01 -> 02 -> ... -> Target)
            var counterEl = document.getElementById('counter-value');
            if (!counterEl) return;

            var targetNumber = parseInt(counterEl.getAttribute('data-target') || '404', 10);
            var prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

            if (prefersReducedMotion) {
                counterEl.textContent = targetNumber.toString();
                return;
            }

            var durationMs = 1500;
            var startTime = performance.now();
            var startNumber = 1;

            function animateTicker(currentTime) {
                var elapsed = currentTime - startTime;
                var progress = Math.min(elapsed / durationMs, 1);
                
                // Ease out exponential curve
                var easeOut = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                var currentVal = Math.round(startNumber + (targetNumber - startNumber) * easeOut);

                if (currentVal < 10) {
                    counterEl.textContent = '0' + currentVal;
                } else {
                    counterEl.textContent = currentVal.toString();
                }

                if (progress < 1) {
                    requestAnimationFrame(animateTicker);
                } else {
                    counterEl.textContent = targetNumber.toString();
                }
            }

            requestAnimationFrame(animateTicker);
        });
    </script>
</body>
</html>