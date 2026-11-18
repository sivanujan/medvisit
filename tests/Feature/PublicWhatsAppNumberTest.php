<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Support\Facades\View;
use Tests\TestCase;

class PublicWhatsAppNumberTest extends TestCase
{
    /**
     * Test single source of truth for WhatsApp contact in config.
     */
    public function test_whatsapp_config_is_single_source_of_truth(): void
    {
        $whatsapp = config('medvisit.contact.whatsapp');

        $this->assertIsArray($whatsapp);
        $this->assertSame('075 574 5341', $whatsapp['display']);
        $this->assertSame('+94755745341', $whatsapp['e164']);
        $this->assertSame('94755745341', $whatsapp['raw']);
        $this->assertSame('https://wa.me/94755745341', $whatsapp['link']);

        $phone = config('medvisit.contact.phone');
        $this->assertIsArray($phone);
        $this->assertSame('070 129 1688', $phone['display']);
        $this->assertSame('tel:+94701291688', $phone['link']);
    }

    /**
     * Test public pages render new WhatsApp number and link and do not contain old WhatsApp links.
     */
    public function test_public_pages_render_new_whatsapp_and_not_old_whatsapp(): void
    {
        $urls = [
            '/pricing',
            '/terms',
            '/privacy-policy',
            '/refund-policy',
            '/dispute-policy',
        ];

        foreach ($urls as $url) {
            $response = $this->get($url);
            $response->assertOk();

            // Must contain new WhatsApp link or display number in Inertia props / rendered page
            $response->assertSee('https:\/\/wa.me\/94755745341', false);
            $response->assertSee('075 574 5341');

            // Must NOT contain old WhatsApp link
            $response->assertDontSee('wa.me/94701291688');
            $response->assertDontSee('wa.me\/94701291688', false);
        }
    }

    /**
     * Test email footer components render new WhatsApp link and number.
     */
    public function test_email_footers_render_new_whatsapp(): void
    {
        $views = [
            'components.email.footer',
            'emails.components.footer',
        ];

        foreach ($views as $viewName) {
            $rendered = View::make($viewName, ['brandMode' => 'platform'])->render();

            $this->assertStringContainsString('https://wa.me/94755745341', $rendered);
            $this->assertStringContainsString('075 574 5341', $rendered);
            $this->assertStringNotContainsString('wa.me/94701291688', $rendered);
            $this->assertStringNotContainsString('wa.me/0755745341', $rendered);
        }
    }

    /**
     * Test static prelaunch /coming file has new WhatsApp number and no placeholder or old number.
     */
    public function test_prelaunch_file_has_new_whatsapp(): void
    {
        $prelaunchPath = resource_path('prelaunch/index.html');
        $this->assertFileExists($prelaunchPath);

        $content = file_get_contents($prelaunchPath);
        $this->assertStringContainsString('https://wa.me/94755745341', $content);
        $this->assertStringNotContainsString('94771234567', $content);
        $this->assertStringNotContainsString('94701291688', $content);
    }
}
