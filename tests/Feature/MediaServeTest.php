<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaServeTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');
    }

    public function test_svg_is_served_with_strict_security_headers(): void
    {
        $tenantId = 'clinic-alpha';
        $filename = 'logo.svg';
        $svgContent = '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="teal"/></svg>';

        Storage::disk('public')->put("media/{$tenantId}/{$filename}", $svgContent);

        $response = $this->get("/storage/media/{$tenantId}/{$filename}");

        $response->assertStatus(200);
        $this->assertStringContainsString('image/svg+xml', (string) $response->headers->get('Content-Type'));
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
        $this->assertSame("default-src 'none'; style-src 'unsafe-inline'", $response->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString('<circle', file_get_contents($response->baseResponse->getFile()->getPathname()));
    }

    public function test_non_svg_media_is_served_safely(): void
    {
        $tenantId = 'clinic-alpha';
        $filename = 'photo.png';
        $fakePng = "\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\nIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82";

        Storage::disk('public')->put("media/{$tenantId}/{$filename}", $fakePng);

        $response = $this->get("/storage/media/{$tenantId}/{$filename}");

        $response->assertStatus(200);
        $this->assertSame('nosniff', $response->headers->get('X-Content-Type-Options'));
    }

    public function test_directory_traversal_is_blocked(): void
    {
        $response = $this->get('/storage/media/../secret.env');
        $response->assertStatus(404);
    }

    public function test_missing_media_returns_404(): void
    {
        $response = $this->get('/storage/media/clinic-alpha/does-not-exist.svg');
        $response->assertStatus(404);
    }
}
