<?php

declare(strict_types=1);

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMXPath;

class HtmlSanitizer
{
    /**
     * Allowed HTML tag names.
     */
    protected static array $allowedTags = [
        'div', 'section', 'header', 'footer', 'nav', 'article', 'aside', 'main',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'a', 'img', 'button',
        'ul', 'ol', 'li', 'blockquote', 'hr', 'br', 'table', 'thead', 'tbody',
        'tr', 'th', 'td', 'b', 'strong', 'i', 'em', 'u', 'mark', 'small',
        'sub', 'sup', 'code', 'pre', 'figure', 'figcaption', 'iframe',
        'svg', 'path', 'g', 'circle', 'rect', 'polyline', 'polygon', 'line', 'use',
    ];

    /**
     * Allowed attribute names.
     */
    protected static array $allowedAttributes = [
        'id', 'class', 'style', 'title', 'alt', 'href', 'src', 'target', 'rel',
        'width', 'height', 'data-gjs-type', 'data-gjs-name', 'data-gjs-draggable',
        'data-gjs-custom-name', 'data-gjs-droppable', 'data-widget',
        'viewbox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin',
        'd', 'cx', 'cy', 'r', 'x', 'y', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'points',
        'allow', 'allowfullscreen', 'frameborder', 'loading', 'referrerpolicy',
        'role', 'aria-label', 'aria-hidden', 'aria-expanded',
    ];

    /**
     * Allowed iframe hostnames (e.g. YouTube, Vimeo, Google Maps).
     */
    protected static array $allowedIframeHosts = [
        'www.youtube.com',
        'youtube.com',
        'www.youtube-nocookie.com',
        'player.vimeo.com',
        'vimeo.com',
        'www.google.com',
        'maps.google.com',
    ];

    /**
     * Sanitize HTML string by stripping unsafe tags, attributes, and scripts.
     */
    public static function sanitize(?string $html): string
    {
        if (empty($html)) {
            return '';
        }

        try {
            $previousState = libxml_use_internal_errors(true);

            $doc = new DOMDocument;
            // Load with UTF-8 encoding wrapper
            $loaded = $doc->loadHTML(
                '<?xml encoding="utf-8" ?><div>'.$html.'</div>',
                LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD
            );

            libxml_clear_errors();
            libxml_use_internal_errors($previousState);

            if (! $loaded) {
                return '';
            }

            $xpath = new DOMXPath($doc);

            // 1. Remove disallowed elements and comments
            $nodes = $xpath->query('//*');
            if ($nodes) {
                for ($i = $nodes->length - 1; $i >= 0; $i--) {
                    $node = $nodes->item($i);
                    if (! $node instanceof DOMElement) {
                        continue;
                    }

                    $tagName = strtolower($node->tagName);

                    // Skip the outer wrapper div
                    if ($tagName === 'html' || $tagName === 'body') {
                        continue;
                    }

                    if (! in_array($tagName, static::$allowedTags, true)) {
                        $node->parentNode?->removeChild($node);

                        continue;
                    }

                    // Special inspection for iframe sources (only allowed embedding domains)
                    if ($tagName === 'iframe') {
                        $src = $node->getAttribute('src');
                        if (! static::isAllowedIframeSrc($src)) {
                            $node->parentNode?->removeChild($node);

                            continue;
                        }
                    }

                    // Clean attributes
                    static::sanitizeAttributes($node);
                }
            }

            // Extract inner HTML of wrapper
            $wrapper = $doc->getElementsByTagName('div')->item(0);
            if (! $wrapper) {
                return '';
            }

            $cleanHtml = '';
            foreach ($wrapper->childNodes as $child) {
                $cleanHtml .= $doc->saveHTML($child);
            }

            return trim($cleanHtml);
        } catch (\Throwable) {
            return '';
        }
    }

    /**
     * Remove event attributes (on*) and dangerous URIs (javascript:).
     */
    protected static function sanitizeAttributes(DOMElement $element): void
    {
        $attributesToRemove = [];

        foreach ($element->attributes as $attr) {
            $name = strtolower($attr->name);
            $value = trim(strtolower($attr->value));

            // Strip all event handlers (onload, onerror, onclick, onmouseover, etc.)
            if (str_starts_with($name, 'on')) {
                $attributesToRemove[] = $attr->name;

                continue;
            }

            // Check URI safety for href and src
            if (($name === 'href' || $name === 'src') && ! empty($value)) {
                if (
                    str_starts_with($value, 'javascript:') ||
                    str_starts_with($value, 'vbscript:') ||
                    str_starts_with($value, 'data:text/html') ||
                    str_starts_with($value, 'data:text/javascript')
                ) {
                    $attributesToRemove[] = $attr->name;

                    continue;
                }
            }

            // Check if attribute is in allowed list or starts with data-
            if (! in_array($name, static::$allowedAttributes, true) && ! str_starts_with($name, 'data-')) {
                $attributesToRemove[] = $attr->name;
            }
        }

        foreach ($attributesToRemove as $name) {
            $element->removeAttribute($name);
        }
    }

    /**
     * Check if iframe src belongs to safe embed providers.
     */
    protected static function isAllowedIframeSrc(string $src): bool
    {
        if (empty($src)) {
            return false;
        }

        $host = parse_url($src, PHP_URL_HOST);
        if (! $host) {
            return false;
        }

        $host = strtolower($host);

        foreach (static::$allowedIframeHosts as $allowedHost) {
            if ($host === $allowedHost || str_ends_with($host, '.'.$allowedHost)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Sanitize CSS rules (strip @import, behavior, binding, url(javascript:)).
     */
    public static function sanitizeCss(?string $css): string
    {
        if (empty($css)) {
            return '';
        }

        // Strip @import directives
        $css = preg_replace('/@import\s+[^;]+;/i', '', $css) ?? '';
        // Strip javascript: urls
        $css = preg_replace('/url\s*\(\s*["\']?\s*javascript:[^)]+\)/i', '', $css) ?? '';
        // Strip expression() or behavior in IE
        $css = preg_replace('/expression\s*\([^)]+\)/i', '', $css) ?? '';
        $css = preg_replace('/-moz-binding\s*:[^;]+;/i', '', $css) ?? '';

        return trim($css);
    }
}
