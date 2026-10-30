<?php

namespace Tests\Feature;

use Tests\TestCase;

class ErrorPagesTest extends TestCase
{
    public function test_404_error_page_renders_custom_template(): void
    {
        $response = $this->get('/non-existent-route-for-testing-404');

        $response->assertStatus(404);
        $response->assertSeeText('Looks like this page skipped its turn.');
        $response->assertSeeText('Token 404');
        $response->assertSeeText("This page isn't in today's queue.");
        $response->assertSeeText('Go to homepage');
    }

    public function test_unknown_subdomain_shows_unregistered_clinic_message(): void
    {
        $response = $this->get('/dev/preview/errors/404?test_unknown=unregisteredclinic');

        $response->assertStatus(404);
        $response->assertSeeText("This clinic address isn't registered on MedVisit");
        $response->assertSeeText('Go to medvisit.lk');
        $response->assertSeeText('Find a clinic');
    }

    public function test_500_error_page_renders_with_appropriate_message(): void
    {
        $response = $this->get('/dev/preview/errors/500');

        $response->assertStatus(500);
        $response->assertSeeText('Something went wrong on our side.');
        $response->assertSeeText('Token 500');
    }

    public function test_403_and_419_error_pages_render_expected_copy(): void
    {
        $res403 = $this->get('/dev/preview/errors/403');
        $res403->assertStatus(403);
        $res403->assertSeeText('This consultation is private.');

        $res419 = $this->get('/dev/preview/errors/419');
        $res419->assertStatus(419);
        $res419->assertSeeText('Your session ticket has expired.');
    }
}
