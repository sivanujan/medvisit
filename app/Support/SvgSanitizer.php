<?php

declare(strict_types=1);

namespace App\Support;

use DOMDocument;
use DOMElement;
use DOMXPath;
use enshrined\svgSanitize\Sanitizer;

/**
 * Built-in SVG Sanitizer for MedVisit.
 *
 * Combines enshrined/svg-sanitize with strict pre-parse rejection of DOCTYPE / ENTITY
 * declarations (preventing XXE and local file disclosures) and strips external/data:
 * <use>/<image> references as well as CSS url()/@import directives.
 */
class SvgSanitizer
{
    /**
     * Tags forbidden inside safe SVG files.
     */
    protected static array $forbiddenTags = [
        'script',
        'foreignobject',
        'iframe',
        'frame',
        'embed',
        'object',
        'applet',
        'meta',
        'link',
        'audio',
        'video',
        'source',
        'animate',
        'set',
        'handler',
        'listener',
    ];

    /**
     * Sanitize an SVG string by stripping dangerous tags, attributes, and styles.
     *
     * Returns the cleaned SVG XML string, or null if invalid, malicious, or cannot be made safe.
     */
    public static function sanitize(?string $svg): ?string
    {
        if (empty($svg) || ! is_string($svg)) {
            return null;
        }

        $trimmed = trim($svg);

        // 1. Strict pre-parse rejection: Reject DOCTYPE or ENTITY declarations immediately
        // (prevents XXE e.g. <!ENTITY x SYSTEM "file:///..."> without even touching XML parsers)
        if (
            preg_match('/<!\s*(?:DOCTYPE|ENTITY)\b/i', $trimmed) ||
            preg_match('/%(?:[a-zA-Z0-9_\.-]+);/', $trimmed) ||
            preg_match('/\bSYSTEM\s+["\']/i', $trimmed) ||
            preg_match('/\bPUBLIC\s+["\']/i', $trimmed)
        ) {
            return null;
        }

        if (! str_contains($trimmed, '<svg')) {
            return null;
        }

        // Pre-strip CSS url() and @import from style="..." attributes so legitimate styling
        // (like fill, stroke, width) is preserved while eliminating all remote fetches
        $preCleaned = preg_replace_callback(
            '/\bstyle\s*=\s*(["\'])(.*?)\1/is',
            fn ($m) => 'style='.$m[1].static::sanitizeSvgCss($m[2]).$m[1],
            $trimmed
        ) ?? $trimmed;

        // 2. Pass through enshrined/svg-sanitize with remote references removed
        $sanitizer = new Sanitizer;
        $sanitizer->removeRemoteReferences(true);
        $sanitizer->minify(false);

        $cleanSvg = $sanitizer->sanitize($preCleaned);
        if (! $cleanSvg || ! is_string($cleanSvg)) {
            return null;
        }

        // 3. Secondary defense-in-depth pass:
        // Parse with LIBXML_NONET (strictly NO LIBXML_NOENT) to enforce MedVisit rules:
        // - Strip <use> / <image> with external or data: hrefs
        // - Strip url() and @import from <style> blocks and style attributes
        try {
            $previousState = libxml_use_internal_errors(true);

            $doc = new DOMDocument;
            // LIBXML_NONET disables network access; LIBXML_NOENT is deliberately omitted
            $options = LIBXML_NONET;
            if (defined('LIBXML_NOERROR')) {
                $options |= LIBXML_NOERROR;
            }
            if (defined('LIBXML_NOWARNING')) {
                $options |= LIBXML_NOWARNING;
            }

            $loaded = $doc->loadXML($cleanSvg, $options);

            libxml_clear_errors();
            libxml_use_internal_errors($previousState);

            if (! $loaded || ! $doc->documentElement) {
                return null;
            }

            if (strtolower($doc->documentElement->localName ?: $doc->documentElement->nodeName) !== 'svg') {
                return null;
            }

            $xpath = new DOMXPath($doc);

            // Strip forbidden elements
            $allElements = $xpath->query('//*');
            if ($allElements) {
                for ($i = $allElements->length - 1; $i >= 0; $i--) {
                    $node = $allElements->item($i);
                    if (! $node instanceof DOMElement) {
                        continue;
                    }

                    $tag = strtolower($node->localName ?: $node->nodeName);
                    if (in_array($tag, static::$forbiddenTags, true)) {
                        $node->parentNode?->removeChild($node);

                        continue;
                    }

                    // Handle <use> and <image> elements: remove if referencing external/data: URIs or missing valid internal fragment href
                    if ($tag === 'use' || $tag === 'image') {
                        if (! static::hasValidInternalHref($node)) {
                            $node->parentNode?->removeChild($node);

                            continue;
                        }
                    }

                    // Sanitize <style> elements: strip url() and @import
                    if ($tag === 'style') {
                        $cleanedCss = static::sanitizeSvgCss($node->textContent);
                        $node->textContent = $cleanedCss;
                    }

                    // Clean element attributes
                    static::cleanAttributes($node);
                }
            }

            // Clean root <svg> element attributes as well
            static::cleanAttributes($doc->documentElement);

            $finalSvg = $doc->saveXML($doc->documentElement);

            return ! empty($finalSvg) ? $finalSvg : null;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * Check if a <use> or <image> element has a valid internal fragment href (#id).
     */
    protected static function hasValidInternalHref(DOMElement $element): bool
    {
        $hrefAttrs = ['href', 'xlink:href'];

        foreach ($hrefAttrs as $attrName) {
            $val = '';
            if ($element->hasAttribute($attrName)) {
                $val = trim($element->getAttribute($attrName));
            } elseif ($element->hasAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
                $val = trim($element->getAttributeNS('http://www.w3.org/1999/xlink', 'href'));
            }

            if (! empty($val)) {
                $valLower = strtolower($val);

                // Allow only internal fragment IDs (e.g. #my-symbol, #gradient)
                return str_starts_with($valLower, '#');
            }
        }

        // If it has no href at all, it's invalid or had an unsafe href stripped
        return false;
    }

    /**
     * Remove event attributes (on*), dangerous URIs (javascript:), and clean inline style attributes.
     */
    protected static function cleanAttributes(DOMElement $element): void
    {
        $toRemove = [];

        foreach ($element->attributes as $attr) {
            $name = strtolower($attr->localName ?: $attr->name);
            $fullName = strtolower($attr->name);
            $value = trim(strtolower($attr->value));

            // Strip any on* event handler (onload, onerror, onclick, etc.)
            if (str_starts_with($name, 'on') || str_starts_with($fullName, 'on') || str_contains($fullName, ':on')) {
                $toRemove[] = [$attr->name, $attr->namespaceURI, $attr->localName];

                continue;
            }

            // Strip dangerous schemes from URI attributes
            if (in_array($name, ['href', 'src', 'action'], true) || in_array($fullName, ['href', 'xlink:href', 'src', 'action'], true)) {
                if (
                    str_starts_with($value, 'javascript:') ||
                    str_starts_with($value, 'vbscript:') ||
                    str_starts_with($value, 'data:text/html') ||
                    str_starts_with($value, 'data:text/javascript') ||
                    preg_match('/^[\s\x00-\x1f]*javascript\s*:/i', $value)
                ) {
                    $toRemove[] = [$attr->name, $attr->namespaceURI, $attr->localName];

                    continue;
                }
            }

            // Clean inline style attribute: remove url() and @import
            if ($name === 'style') {
                $cleanedStyle = static::sanitizeSvgCss($attr->value);
                if (empty($cleanedStyle)) {
                    $toRemove[] = [$attr->name, $attr->namespaceURI, $attr->localName];
                } else {
                    $element->setAttribute($attr->name, $cleanedStyle);
                }
            }
        }

        foreach ($toRemove as [$attrName, $nsUri, $localName]) {
            if ($nsUri && $localName) {
                $element->removeAttributeNS($nsUri, $localName);
            }
            $element->removeAttribute($attrName);
        }
    }

    /**
     * Sanitize CSS inside <style> elements and style attributes:
     * Removes url(), @import, and expression/behavior constructs.
     */
    public static function sanitizeSvgCss(?string $css): string
    {
        if (empty($css)) {
            return '';
        }

        // Strip @import directives
        $css = preg_replace('/@import\s+[^;]+;?/i', '', $css) ?? '';

        // Strip any url(...) construct (external, data, or local)
        $css = preg_replace('/url\s*\([^)]*\)/i', '', $css) ?? '';

        // Strip expression() or behavior
        $css = preg_replace('/expression\s*\([^)]*\)/i', '', $css) ?? '';
        $css = preg_replace('/-moz-binding\s*:[^;]+;?/i', '', $css) ?? '';

        // Strip HTML-like tags
        $css = preg_replace('/<\s*\/?\s*(?:style|script)|<!--|-->/i', '', $css) ?? '';

        return trim($css);
    }
}
