<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Support\SeoMeta;
use Tests\TestCase;

class PublicFeaturesTest extends TestCase
{
    /**
     * Test English features page returns 200 with correct lang, canonical and hreflang tags.
     */
    public function test_english_features_page_renders_correctly(): void
    {
        $response = $this->get('/features');
        $response->assertOk();

        // Check HTML lang attribute
        $response->assertSee('<html lang="en">', false);

        // Check canonical
        $expectedCanonical = SeoMeta::centralUrl('/features');
        $response->assertSee('<link rel="canonical" href="'.$expectedCanonical.'" head-key="canonical">', false);

        // Check hreflang tags
        $response->assertSee('<link rel="alternate" hreflang="en" href="'.SeoMeta::centralUrl('/features').'" head-key="hreflang-en">', false);
        $response->assertSee('<link rel="alternate" hreflang="ta" href="'.SeoMeta::centralUrl('/ta/features').'" head-key="hreflang-ta">', false);
        $response->assertSee('<link rel="alternate" hreflang="si" href="'.SeoMeta::centralUrl('/si/features').'" head-key="hreflang-si">', false);
        $response->assertSee('<link rel="alternate" hreflang="x-default" href="'.SeoMeta::centralUrl('/features').'" head-key="hreflang-x-default">', false);

        // Check content & headings
        $response->assertSee('Everything your clinic needs, from token to receipt');
        $response->assertSee('How a clinic day runs with MedVisit');

        // Check WhatsApp contact
        $response->assertSee('https:\/\/wa.me\/94755745341', false);
        $response->assertSee('075 574 5341');
        $response->assertDontSee('wa.me/94701291688');

        // Check cookie queued
        $response->assertCookie('medvisit_locale', 'en');
    }

    /**
     * Test Tamil features page returns 200 with correct lang, canonical and hreflang tags.
     */
    public function test_tamil_features_page_renders_correctly(): void
    {
        $response = $this->get('/ta/features');
        $response->assertOk();

        // Check HTML lang attribute
        $response->assertSee('<html lang="ta">', false);

        // Check canonical
        $expectedCanonical = SeoMeta::centralUrl('/ta/features');
        $response->assertSee('<link rel="canonical" href="'.$expectedCanonical.'" head-key="canonical">', false);

        // Check hreflang tags
        $response->assertSee('<link rel="alternate" hreflang="en" href="'.SeoMeta::centralUrl('/features').'" head-key="hreflang-en">', false);
        $response->assertSee('<link rel="alternate" hreflang="ta" href="'.SeoMeta::centralUrl('/ta/features').'" head-key="hreflang-ta">', false);
        $response->assertSee('<link rel="alternate" hreflang="si" href="'.SeoMeta::centralUrl('/si/features').'" head-key="hreflang-si">', false);
        $response->assertSee('<link rel="alternate" hreflang="x-default" href="'.SeoMeta::centralUrl('/features').'" head-key="hreflang-x-default">', false);

        // Check content in Tamil
        $response->assertSee('டோக்கன் முதல் பற்றுச்சீட்டு வரை');
        $response->assertSee('நேரலை டோக்கன் வரிசை');

        // Check WhatsApp contact
        $response->assertSee('https:\/\/wa.me\/94755745341', false);
        $response->assertSee('075 574 5341');
        $response->assertDontSee('wa.me/94701291688');

        // Check cookie queued
        $response->assertCookie('medvisit_locale', 'ta');
    }

    /**
     * Test Sinhala features page returns 200 with correct lang, canonical and hreflang tags.
     */
    public function test_sinhala_features_page_renders_correctly(): void
    {
        $response = $this->get('/si/features');
        $response->assertOk();

        // Check HTML lang attribute
        $response->assertSee('<html lang="si">', false);

        // Check canonical
        $expectedCanonical = SeoMeta::centralUrl('/si/features');
        $response->assertSee('<link rel="canonical" href="'.$expectedCanonical.'" head-key="canonical">', false);

        // Check hreflang tags
        $response->assertSee('<link rel="alternate" hreflang="en" href="'.SeoMeta::centralUrl('/features').'" head-key="hreflang-en">', false);
        $response->assertSee('<link rel="alternate" hreflang="ta" href="'.SeoMeta::centralUrl('/ta/features').'" head-key="hreflang-ta">', false);
        $response->assertSee('<link rel="alternate" hreflang="si" href="'.SeoMeta::centralUrl('/si/features').'" head-key="hreflang-si">', false);
        $response->assertSee('<link rel="alternate" hreflang="x-default" href="'.SeoMeta::centralUrl('/features').'" head-key="hreflang-x-default">', false);

        // Check content in Sinhala
        $response->assertSee('ටෝකන් පතේ සිට රිසිට්පත දක්වා');
        $response->assertSee('සජීවී ටෝකන් පෝලිම');

        // Check WhatsApp contact
        $response->assertSee('https:\/\/wa.me\/94755745341', false);
        $response->assertSee('075 574 5341');
        $response->assertDontSee('wa.me/94701291688');

        // Check cookie queued
        $response->assertCookie('medvisit_locale', 'si');
    }

    /**
     * Test central sitemap includes /features, /ta/features, and /si/features.
     */
    public function test_sitemap_includes_all_three_feature_languages(): void
    {
        $response = $this->get('/sitemap.xml');
        $response->assertOk();

        $content = $response->getContent();
        $this->assertStringContainsString('/features</loc>', $content);
        $this->assertStringContainsString('/ta/features</loc>', $content);
        $this->assertStringContainsString('/si/features</loc>', $content);
    }

    /**
     * Test feature plan badges reflect plan matrix configuration.
     */
    public function test_features_page_passes_plan_matrix(): void
    {
        $response = $this->get('/features');
        $response->assertOk();

        // Check plan matrix passed in Inertia props
        $page = $response->viewData('page');
        $this->assertNotNull($page);
        $plans = $page['props']['plans'] ?? [];

        $this->assertArrayHasKey('basic', $plans);
        $this->assertArrayHasKey('pro', $plans);
        $this->assertArrayHasKey('advanced', $plans);

        // Verify tier capabilities match config
        $this->assertFalse($plans['basic']['features']['pharmacy']);
        $this->assertTrue($plans['pro']['features']['pharmacy']);
        $this->assertTrue($plans['advanced']['features']['pharmacy']);
    }

    /**
     * Test production canonicals and hreflangs use https and medvisit.lk with no localhost.
     */
    public function test_production_features_seo_urls_are_secure_and_canonical(): void
    {
        config(['app.env' => 'production']);
        config(['medvisit.public_domain' => 'medvisit.lk']);

        foreach (['en', 'ta', 'si'] as $lang) {
            $seo = SeoMeta::forFeatures($lang);

            $this->assertStringStartsWith('https://medvisit.lk/', $seo->canonical);
            $this->assertStringNotContainsString('localhost', $seo->canonical);
            $this->assertStringNotContainsString('http://', $seo->canonical);

            foreach ($seo->hreflangs as $hLang => $url) {
                $this->assertStringStartsWith('https://medvisit.lk/', $url);
                $this->assertStringNotContainsString('localhost', $url);
                $this->assertStringNotContainsString('http://', $url);
            }
        }
    }
}
