<?php

declare(strict_types=1);

namespace Tests\Feature\Security;

use App\Http\Middleware\TrustHosts;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Symfony\Component\HttpFoundation\Exception\SuspiciousOperationException;
use Tests\TestCase;

class TrustedProxiesAndHostsTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Ensure the insecure "private_ranges" shortcut (CVE-2026-121619) is not used.
     */
    public function test_trusted_proxies_does_not_contain_private_ranges_shortcut(): void
    {
        $cloudflareIps = config('trustedproxy.cloudflare', []);
        $this->assertNotEmpty($cloudflareIps, 'Cloudflare proxy IP ranges must be configured');

        $this->assertNotContains('private_ranges', $cloudflareIps, 'The private_ranges shortcut must never be trusted');

        $activeProxies = config('trustedproxy.proxies') ?? $cloudflareIps;
        $this->assertNotContains('private_ranges', $activeProxies, 'Active trusted proxies must not include private_ranges');
    }

    /**
     * Cloudflare official IPv4 and IPv6 subnets are present.
     */
    public function test_cloudflare_ip_ranges_contain_known_ipv4_and_ipv6_cidrs(): void
    {
        $cloudflareIps = config('trustedproxy.cloudflare', []);

        $this->assertContains('173.245.48.0/20', $cloudflareIps);
        $this->assertContains('104.16.0.0/13', $cloudflareIps);
        $this->assertContains('2400:cb00::/32', $cloudflareIps);
        $this->assertContains('2606:4700::/32', $cloudflareIps);
    }

    /**
     * Requests with valid MedVisit hosts (root and subdomains) are allowed.
     */
    public function test_valid_medvisit_hosts_are_trusted(): void
    {
        $middleware = app(TrustHosts::class);
        $hosts = $middleware->hosts();

        $validHosts = [
            'medvisit.lk',
            'www.medvisit.lk',
            'cityhealth.medvisit.lk',
            'demo.medvisit.lk',
            'admin.medvisit.lk',
            'medvisit.localhost',
            'cityhealth.medvisit.localhost',
            'localhost',
            '127.0.0.1',
        ];

        foreach ($validHosts as $host) {
            $matched = false;
            foreach ($hosts as $pattern) {
                if ($pattern && preg_match('#'.$pattern.'#i', $host)) {
                    $matched = true;
                    break;
                }
            }
            $this->assertTrue($matched, "Host '{$host}' should be trusted by TrustHosts patterns");
        }
    }

    /**
     * Attacker host patterns are rejected by TrustHosts.
     */
    public function test_untrusted_attacker_hosts_are_rejected_by_patterns(): void
    {
        $middleware = app(TrustHosts::class);
        $hosts = $middleware->hosts();

        $attackerHosts = [
            'evil.com',
            'attacker.com',
            'medvisit.lk.attacker.com',
            'attackermedvisit.lk',
            'notmedvisit.lk',
            'evil-medvisit.localhost',
        ];

        foreach ($attackerHosts as $host) {
            $matched = false;
            foreach ($hosts as $pattern) {
                if ($pattern && preg_match('#'.$pattern.'#i', $host)) {
                    $matched = true;
                    break;
                }
            }
            $this->assertFalse($matched, "Attacker host '{$host}' must NOT be matched by TrustHosts patterns");
        }
    }

    /**
     * Untrusted host header triggers SuspiciousOperationException when resolving host.
     */
    public function test_untrusted_host_header_throws_suspicious_operation_exception(): void
    {
        $middleware = app(TrustHosts::class);
        Request::setTrustedHosts($middleware->hosts());

        $request = Request::create('http://evil.com/login');

        $this->expectException(SuspiciousOperationException::class);
        $this->expectExceptionMessage('Untrusted Host "evil.com"');

        $request->getHost();
    }

    /**
     * An untrusted client IP attempting X-Forwarded-Host injection is completely ignored.
     */
    public function test_untrusted_proxy_x_forwarded_host_is_ignored(): void
    {
        $cloudflareIps = config('trustedproxy.cloudflare', []);
        Request::setTrustedProxies($cloudflareIps, Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_HOST | Request::HEADER_X_FORWARDED_PROTO);

        // Attacker directly connects from an arbitrary IP (not in Cloudflare ranges)
        $request = Request::create('http://medvisit.lk/reset-password', 'GET', [], [], [], [
            'REMOTE_ADDR' => '203.0.113.195',
            'HTTP_HOST' => 'medvisit.lk',
            'HTTP_X_FORWARDED_HOST' => 'evil.com',
            'HTTP_X_FORWARDED_PROTO' => 'http',
        ]);

        $this->assertSame('medvisit.lk', $request->getHost(), 'Host must remain medvisit.lk; forwarded host from untrusted IP must be ignored');
    }

    /**
     * A legitimate Cloudflare edge IP is trusted for X-Forwarded-Proto and forwarded headers.
     */
    public function test_cloudflare_proxy_ip_is_trusted_for_https_forwarding(): void
    {
        $cloudflareIps = config('trustedproxy.cloudflare', []);
        Request::setTrustedProxies($cloudflareIps, Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_HOST | Request::HEADER_X_FORWARDED_PROTO);

        // Request forwarded through Cloudflare edge (173.245.48.5 is in 173.245.48.0/20)
        $request = Request::create('http://medvisit.lk/login', 'GET', [], [], [], [
            'REMOTE_ADDR' => '173.245.48.5',
            'HTTP_HOST' => 'medvisit.lk',
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTP_X_FORWARDED_FOR' => '198.51.100.12',
        ]);

        $this->assertTrue($request->isSecure(), 'Request through Cloudflare with X-Forwarded-Proto https must be recognized as secure');
        $this->assertSame('https', $request->getScheme());
        $this->assertSame('198.51.100.12', $request->getClientIp());
    }

    /**
     * Even if a request arrives from a trusted proxy, forwarding an untrusted host is blocked.
     */
    public function test_cloudflare_proxy_forwarding_untrusted_host_is_blocked(): void
    {
        $middleware = app(TrustHosts::class);
        Request::setTrustedHosts($middleware->hosts());

        $cloudflareIps = config('trustedproxy.cloudflare', []);
        Request::setTrustedProxies($cloudflareIps, Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_HOST | Request::HEADER_X_FORWARDED_PROTO);

        $request = Request::create('http://127.0.0.1/login', 'GET', [], [], [], [
            'REMOTE_ADDR' => '173.245.48.5',
            'HTTP_X_FORWARDED_HOST' => 'evil.com',
            'HTTP_X_FORWARDED_PROTO' => 'https',
        ]);

        $this->expectException(SuspiciousOperationException::class);
        $this->expectExceptionMessage('Untrusted Host "evil.com"');

        $request->getHost();
    }

    /**
     * Generated URLs (signed URLs, password reset, routes) cannot be pointed to an attacker host.
     */
    public function test_url_generation_uses_trusted_host_and_cannot_be_poisoned(): void
    {
        $middleware = app(TrustHosts::class);
        Request::setTrustedHosts($middleware->hosts());

        $cloudflareIps = config('trustedproxy.cloudflare', []);
        Request::setTrustedProxies($cloudflareIps, Request::HEADER_X_FORWARDED_FOR | Request::HEADER_X_FORWARDED_HOST | Request::HEADER_X_FORWARDED_PROTO);

        // Simulate incoming legitimate request to clinic
        $request = Request::create('https://cityhealth.medvisit.lk/login', 'GET', [], [], [], [
            'REMOTE_ADDR' => '173.245.48.5',
            'HTTP_HOST' => 'cityhealth.medvisit.lk',
            'HTTP_X_FORWARDED_PROTO' => 'https',
        ]);

        app()->instance('request', $request);

        $generated = URL::to('/password-reset/sample-token');
        $this->assertStringStartsWith('https://cityhealth.medvisit.lk', $generated);
        $this->assertStringNotContainsString('evil.com', $generated);

        // Attempting to inject untrusted forwarded host from non-proxy cannot poison URL generator
        $poisonRequest = Request::create('http://cityhealth.medvisit.lk/login', 'GET', [], [], [], [
            'REMOTE_ADDR' => '203.0.113.50',
            'HTTP_HOST' => 'cityhealth.medvisit.lk',
            'HTTP_X_FORWARDED_HOST' => 'attacker.com',
        ]);

        app()->instance('request', $poisonRequest);

        $safeUrl = URL::to('/password-reset/sample-token');
        $this->assertStringNotContainsString('attacker.com', $safeUrl);
        $this->assertStringContainsString('cityhealth.medvisit.lk', $safeUrl);
    }
}
