<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\ClinicPage;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicPagesTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $admin;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Medical Center',
            'subdomain' => 'suwasetha',
            'website_published' => true,
        ]);

        $this->admin = User::factory()->clinicAdmin()->create(['tenant_id' => $this->tenant->id]);
    }

    private function url(string $path): string
    {
        return "http://{$this->tenant->subdomain}.{$this->baseDomain}{$path}";
    }

    private function makePage(string $slug, array $attrs = []): ClinicPage
    {
        return ClinicPage::create(array_merge([
            'tenant_id' => $this->tenant->id,
            'slug' => $slug,
            'title' => ucfirst($slug),
            'html' => "<p>draft {$slug}</p>",
            'css' => '',
            'published_html' => "<p>live {$slug}</p>",
            'published_css' => '',
            'is_published' => true,
            'published_at' => now(),
        ], $attrs));
    }

    public function test_published_page_renders_at_p_slug(): void
    {
        $this->makePage('about', ['seo_title' => 'About Us']);

        $this->get($this->url('/p/about'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Public/ClinicLanding')
                ->where('customPage.html', '<p>live about</p>')
                ->where('customPage.isPreview', false)
                ->where('seo.title', 'About Us'));
    }

    public function test_draft_page_returns_404(): void
    {
        $this->makePage('about', ['is_published' => false]);

        $this->get($this->url('/p/about'))->assertNotFound();
    }

    public function test_trashed_page_returns_404(): void
    {
        $this->makePage('about')->delete();

        $this->get($this->url('/p/about'))->assertNotFound();
    }

    public function test_homepage_slug_redirects_to_root(): void
    {
        $this->makePage('home', ['is_homepage' => true]);

        $this->get($this->url('/p/home'))->assertStatus(301)->assertRedirect('/');
    }

    public function test_preview_requires_login(): void
    {
        $this->makePage('about');

        $this->get($this->url('/preview/p/about'))->assertRedirect();
        $this->get($this->url('/preview'))->assertRedirect();

        $this->actingAs($this->admin)
            ->get($this->url('/preview/p/about'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->where('customPage.html', '<p>draft about</p>')
                ->where('customPage.isPreview', true));
    }

    public function test_preview_of_trashed_page_returns_404(): void
    {
        $this->makePage('about')->delete();

        $this->actingAs($this->admin)->get($this->url('/preview/p/about'))->assertNotFound();
    }

    public function test_menu_omits_links_to_unpublished_pages(): void
    {
        $about = $this->makePage('about', ['is_published' => false]);
        $this->tenant->website_header = ['menu_items' => [
            ['label' => 'About', 'page_id' => $about->id],
            ['label' => 'Book', 'url' => '/book'],
        ]];
        $this->tenant->website_footer = ['quick_links' => [
            ['label' => 'About', 'page_id' => $about->id],
            ['label' => 'Book', 'url' => '/book'],
        ]];
        $this->tenant->save();
        $this->makePage('other');

        $this->get($this->url('/p/other'))
            ->assertInertia(fn ($page) => $page
                ->has('headerConfig.menu_items', 1)
                ->where('headerConfig.menu_items.0.url', '/book')
                ->has('footerConfig.quick_links', 1));

        $this->actingAs($this->admin)->get($this->url('/preview/p/other'))
            ->assertInertia(fn ($page) => $page
                ->has('headerConfig.menu_items', 2)
                ->where('headerConfig.menu_items.0.url', '/p/about'));

        $about->update(['is_published' => true]);

        $this->get($this->url('/p/other'))
            ->assertInertia(fn ($page) => $page
                ->has('headerConfig.menu_items', 2)
                ->where('headerConfig.menu_items.0.url', '/p/about')
                ->where('footerConfig.quick_links.0.url', '/p/about'));
    }
}
