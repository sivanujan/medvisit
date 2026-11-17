<?php

declare(strict_types=1);

namespace Tests\Unit\Support;

use App\Support\SvgSanitizer;
use PHPUnit\Framework\TestCase;

class SvgSanitizerTest extends TestCase
{
    public function test_it_cleans_or_strips_script_tags(): void
    {
        $maliciousSvg = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="40" fill="red" />
    <script type="text/javascript">
        alert('XSS Script Tag');
    </script>
</svg>
SVG;

        $cleaned = SvgSanitizer::sanitize($maliciousSvg);

        $this->assertNotNull($cleaned);
        $this->assertStringNotContainsString('<script', strtolower($cleaned));
        $this->assertStringNotContainsString('alert', $cleaned);
        $this->assertStringContainsString('<circle', $cleaned);
    }

    public function test_it_cleans_or_strips_onload_attributes(): void
    {
        $maliciousSvg = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" onload="alert('XSS OnLoad')">
    <rect width="100" height="100" fill="blue" onload="stealCookies()" />
</svg>
SVG;

        $cleaned = SvgSanitizer::sanitize($maliciousSvg);

        $this->assertNotNull($cleaned);
        $this->assertStringNotContainsString('onload', strtolower($cleaned));
        $this->assertStringNotContainsString('stealCookies', $cleaned);
        $this->assertStringContainsString('<rect', $cleaned);
    }

    public function test_it_cleans_or_strips_javascript_href_attributes(): void
    {
        $maliciousSvg = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">
    <a href="javascript:alert('XSS Href')">
        <text x="10" y="20">Click me</text>
    </a>
    <a xlink:href="javascript:evilCode()">
        <circle cx="20" cy="20" r="10" />
    </a>
</svg>
SVG;

        $cleaned = SvgSanitizer::sanitize($maliciousSvg);

        $this->assertNotNull($cleaned);
        $this->assertStringNotContainsString('javascript:', strtolower($cleaned));
        $this->assertStringNotContainsString('evilCode', $cleaned);
    }

    public function test_it_preserves_clean_valid_svg(): void
    {
        $validSvg = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect width="200" height="200" rx="20" fill="#0E9E8F" />
    <circle cx="100" cy="100" r="50" fill="#FFFFFF" />
    <path d="M 50 100 L 150 100" stroke="#000000" stroke-width="4" />
</svg>
SVG;

        $cleaned = SvgSanitizer::sanitize($validSvg);

        $this->assertNotNull($cleaned);
        $this->assertStringContainsString('<rect', $cleaned);
        $this->assertStringContainsString('<circle', $cleaned);
        $this->assertStringContainsString('<path', $cleaned);
        $this->assertStringContainsString('#0E9E8F', $cleaned);
    }

    public function test_it_rejects_non_svg_xml_or_corrupt_content(): void
    {
        $this->assertNull(SvgSanitizer::sanitize('<html><body>Not an SVG</body></html>'));
        $this->assertNull(SvgSanitizer::sanitize('<?xml version="1.0"?><note><to>User</to></note>'));
        $this->assertNull(SvgSanitizer::sanitize('Plain text string'));
        $this->assertNull(SvgSanitizer::sanitize(''));
    }

    public function test_it_rejects_svg_with_doctype(): void
    {
        $svg = <<<'SVG'
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
    <circle cx="50" cy="50" r="40" fill="blue" />
</svg>
SVG;

        $this->assertNull(SvgSanitizer::sanitize($svg));
    }

    public function test_it_rejects_svg_with_external_entity_reading_local_file(): void
    {
        $xxeSvg = <<<'SVG'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg [
    <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
    <text>&xxe;</text>
</svg>
SVG;

        $this->assertNull(SvgSanitizer::sanitize($xxeSvg));

        $envXxeSvg = <<<'SVG'
<!DOCTYPE svg [
    <!ENTITY file SYSTEM "file:///c:/Users/Sivanujan_PC/Desktop/medvisit/.env">
]>
<svg xmlns="http://www.w3.org/2000/svg">
    <text>&file;</text>
</svg>
SVG;

        $this->assertNull(SvgSanitizer::sanitize($envXxeSvg));
    }

    public function test_it_removes_external_use_href_and_image_href(): void
    {
        $svg = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="200" height="200">
    <defs>
        <g id="local-shape">
            <rect width="20" height="20" fill="green" />
        </g>
    </defs>
    <!-- External use must be removed -->
    <use href="https://evil.com/payload.svg#icon" />
    <use xlink:href="http://attacker.com/sprite.svg#test" />
    <image href="https://evil.com/tracker.png" width="10" height="10" />
    <!-- Local internal fragment must be preserved -->
    <use href="#local-shape" />
</svg>
SVG;

        $cleaned = SvgSanitizer::sanitize($svg);

        $this->assertNotNull($cleaned);
        $this->assertStringNotContainsString('evil.com', $cleaned);
        $this->assertStringNotContainsString('attacker.com', $cleaned);
        $this->assertStringNotContainsString('<image', $cleaned);
        $this->assertStringContainsString('href="#local-shape"', $cleaned);
        $this->assertStringContainsString('<rect', $cleaned);
    }

    public function test_it_removes_css_url_and_at_import(): void
    {
        $svg = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
    <style>
        @import url('https://evil.com/styles.css');
        .box {
            background-image: url('https://evil.com/leak.png');
            color: red;
        }
    </style>
    <rect width="100" height="100" style="background: url('https://evil.com/track.svg'); fill: blue;" />
</svg>
SVG;

        $cleaned = SvgSanitizer::sanitize($svg);

        $this->assertNotNull($cleaned);
        $this->assertStringNotContainsString('@import', $cleaned);
        $this->assertStringNotContainsString('url(', $cleaned);
        $this->assertStringNotContainsString('evil.com', $cleaned);
        $this->assertStringContainsString('fill: blue;', $cleaned);
        $this->assertStringContainsString('color: red;', $cleaned);
    }
}
