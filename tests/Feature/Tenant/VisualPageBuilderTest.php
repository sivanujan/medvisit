<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\ClinicMediaAsset;
use App\Models\ClinicPage;
use App\Models\Tenant;
use App\Models\User;
use App\Support\HtmlSanitizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VisualPageBuilderTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;

    protected Tenant $tenantB;

    protected User $adminA;

    protected User $adminB;

    protected User $doctorA;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

        $this->tenantA = Tenant::factory()->active()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Medical Center',
            'subdomain' => 'suwasetha',
            'website_published' => true,
        ]);

        $this->tenantB = Tenant::factory()->active()->create([
            'id' => 'asiri',
            'name' => 'Asiri Central Clinic',
            'subdomain' => 'asiri',
            'website_published' => true,
        ]);

        $this->adminA = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Admin Suwasetha',
            'email' => 'admin@suwasetha.lk',
        ]);

        $this->adminB = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Admin Asiri',
            'email' => 'admin@asiri.lk',
        ]);

        $this->doctorA = User::factory()->doctor()->create([
            'tenant_id' => $this->tenantA->id,
            'name' => 'Dr. Perera',
            'email' => 'perera@suwasetha.lk',
        ]);
    }

    private function homepageA(): ClinicPage
    {
        return ClinicPage::homepageFor($this->tenantA->id)
            ?? ClinicPage::create([
                'tenant_id' => $this->tenantA->id,
                'slug' => 'home',
                'title' => 'Home',
                'is_homepage' => true,
            ]);
    }

    private function builderUrl(string $path = ''): string
    {
        return "http://{$this->tenantA->subdomain}.{$this->baseDomain}/website/builder{$path}";
    }

    public function test_clinic_admin_can_access_page_builder(): void
    {
        $response = $this->actingAs($this->adminA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/website/builder");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Website/PageBuilder')
            ->has('tenant')
            ->has('page')
            ->has('revisions')
            ->has('mediaAssets')
            ->has('doctors')
            ->has('upcomingSessions')
        );

        $this->assertDatabaseHas('clinic_pages', [
            'tenant_id' => $this->tenantA->id,
            'slug' => 'home',
            'schema_version' => 2,
        ]);
    }

    public function test_doctor_and_receptionist_cannot_access_page_builder(): void
    {
        $response = $this->actingAs($this->doctorA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/website/builder");

        $response->assertForbidden();
    }

    public function test_admin_can_save_builder_draft_and_creates_revision(): void
    {
        $payload = [
            'content_json' => ['version' => 2, 'components' => [['type' => 'text', 'content' => 'Hello World']]],
            'html' => '<section><h1>Welcome to Suwasetha</h1><p>Premier healthcare.</p></section>',
            'css' => 'h1 { color: #0E9E8F; }',
            'theme_preset' => 'medvisit-teal',
            'seo_title' => 'Suwasetha Medical Center - Channeling',
            'seo_description' => 'Book doctor appointments online.',
        ];

        $response = $this->actingAs($this->adminA)
            ->postJson($this->builderUrl("/{$this->homepageA()->id}/save"), $payload);

        $response->assertOk();
        $response->assertJson([
            'ok' => true,
            'version_number' => 1,
        ]);

        $this->assertDatabaseHas('clinic_pages', [
            'tenant_id' => $this->tenantA->id,
            'slug' => 'home',
            'theme_preset' => 'medvisit-teal',
            'seo_title' => 'Suwasetha Medical Center - Channeling',
        ]);

        $this->assertDatabaseHas('clinic_page_revisions', [
            'tenant_id' => $this->tenantA->id,
            'version_number' => 1,
            'summary' => 'Autosaved Draft',
        ]);
    }

    public function test_admin_can_publish_builder_layout(): void
    {
        $payload = [
            'content_json' => ['version' => 2, 'components' => []],
            'html' => '<section><h2>Published Clinic Layout</h2></section>',
            'css' => 'h2 { font-weight: bold; }',
            'theme_preset' => 'ocean-blue',
            'seo_title' => 'Live Suwasetha Clinic',
            'seo_description' => 'Now live with real-time tokens.',
        ];

        $response = $this->actingAs($this->adminA)
            ->postJson($this->builderUrl("/{$this->homepageA()->id}/publish"), $payload);

        $response->assertOk();
        $response->assertJson([
            'ok' => true,
        ]);

        $page = ClinicPage::where('tenant_id', $this->tenantA->id)->where('slug', 'home')->first();
        $this->assertNotNull($page);
        $this->assertTrue($page->is_published);
        $this->assertNotNull($page->published_at);
        $this->assertStringContainsString('Published Clinic Layout', $page->published_html);
    }

    public function test_html_sanitization_strips_scripts_and_malicious_handlers(): void
    {
        $maliciousHtml = '<div><h1>Safe Title</h1><script>alert("XSS")</script><img src="x" onerror="alert(1)" /><a href="javascript:stealCookie()">Click me</a></div>';
        $maliciousCss = 'body { color: red; } @import url("https://evil.com/evil.css"); h1 { background: url(javascript:alert(1)); }';

        $cleanHtml = HtmlSanitizer::sanitize($maliciousHtml);
        $cleanCss = HtmlSanitizer::sanitizeCss($maliciousCss);

        // Assert script tag stripped
        $this->assertStringNotContainsString('<script', $cleanHtml);
        $this->assertStringNotContainsString('alert("XSS")', $cleanHtml);

        // Assert onerror handler stripped
        $this->assertStringNotContainsString('onerror', $cleanHtml);

        // Assert javascript: link stripped
        $this->assertStringNotContainsString('javascript:stealCookie()', $cleanHtml);

        // Assert safe tags preserved
        $this->assertStringContainsString('<h1>Safe Title</h1>', $cleanHtml);

        // Assert malicious CSS stripped
        $this->assertStringNotContainsString('@import', $cleanCss);
        $this->assertStringNotContainsString('javascript:', $cleanCss);
        $this->assertStringContainsString('color: red;', $cleanCss);
    }

    public function test_multi_tenant_isolation_clinic_a_cannot_touch_clinic_b(): void
    {
        // 1. Create page and revision for Clinic A
        $pageA = ClinicPage::create([
            'tenant_id' => $this->tenantA->id,
            'slug' => 'home',
            'title' => 'Home',
            'is_homepage' => true,
            'html' => '<p>Clinic A Content</p>',
        ]);

        $revA = $pageA->createRevision(userId: $this->adminA->id, summary: 'A Rev 1');

        // 2. Admin B tries to revert Clinic A's revision
        $response = $this->actingAs($this->adminB)
            ->postJson("http://{$this->tenantB->subdomain}.{$this->baseDomain}/website/builder/{$pageA->id}/revert/{$revA->id}");

        $response->assertNotFound();

        // 3. Create media asset for Clinic A
        $assetA = ClinicMediaAsset::create([
            'tenant_id' => $this->tenantA->id,
            'filename' => 'clinic-a.jpg',
            'original_name' => 'clinic-a.jpg',
            'disk' => 'public',
            'path' => 'media/suwasetha/clinic-a.jpg',
            'url' => '/storage/media/suwasetha/clinic-a.jpg',
            'size' => 1024,
        ]);

        // 4. Admin B tries to delete Clinic A's asset
        $deleteResponse = $this->actingAs($this->adminB)
            ->deleteJson("http://{$this->tenantB->subdomain}.{$this->baseDomain}/website/builder/media/{$assetA->id}");

        $deleteResponse->assertForbidden();
        $this->assertDatabaseHas('clinic_media_assets', ['id' => $assetA->id]);
    }

    public function test_admin_can_revert_page_to_historical_revision(): void
    {
        // 1. Save Initial Version
        $this->actingAs($this->adminA)
            ->postJson($this->builderUrl("/{$this->homepageA()->id}/save"), [
                'content_json' => ['v' => 1],
                'html' => '<div>Initial Draft Version 1</div>',
                'css' => 'div { color: blue; }',
            ]);

        $page = ClinicPage::where('tenant_id', $this->tenantA->id)->where('slug', 'home')->first();
        $rev1 = $page->revisions()->where('version_number', 1)->first();
        $this->assertNotNull($rev1);

        // 2. Save Updated Version 2
        $this->actingAs($this->adminA)
            ->postJson($this->builderUrl("/{$this->homepageA()->id}/save"), [
                'content_json' => ['v' => 2],
                'html' => '<div>Updated Draft Version 2</div>',
                'css' => 'div { color: green; }',
            ]);

        $page->refresh();
        $this->assertStringContainsString('Updated Draft Version 2', $page->html);

        // 3. Revert to Revision 1
        $revertResponse = $this->actingAs($this->adminA)
            ->postJson($this->builderUrl("/{$page->id}/revert/{$rev1->id}"));

        $revertResponse->assertOk();

        $page->refresh();
        $this->assertStringContainsString('Initial Draft Version 1', $page->html);
    }

    public function test_publish_only_affects_target_page(): void
    {
        $page1 = $this->homepageA();
        $page1->update(['published_html' => '<p>Page one live</p>']);
        $page2 = ClinicPage::create(['tenant_id' => $this->tenantA->id, 'slug' => 'about', 'title' => 'About']);

        $this->actingAs($this->adminA)
            ->postJson($this->builderUrl("/{$page2->id}/publish"), [
                'html' => '<section>About live</section>',
                'css' => '',
            ])->assertOk();

        $this->assertStringContainsString('About live', $page2->refresh()->published_html);
        $this->assertTrue($page2->is_published);
        $this->assertSame('<p>Page one live</p>', $page1->refresh()->published_html);
    }

    public function test_publish_strips_style_breakout_from_css(): void
    {
        $page = $this->homepageA();

        $this->actingAs($this->adminA)
            ->postJson($this->builderUrl("/{$page->id}/publish"), [
                'html' => '<p>x</p>',
                'css' => '#a{color:red}</style><script>alert(1)</script>',
            ])
            ->assertOk();

        $page->refresh();
        $this->assertStringContainsString('#a{color:red}', $page->published_css);
        $this->assertStringNotContainsString('</style', $page->published_css);
        $this->assertStringNotContainsString('<script', $page->published_css);
        $this->assertStringNotContainsString('</style', $page->css);
        $this->assertStringNotContainsString('<script', $page->css);
    }

    public function test_draft_save_strips_style_breakout_from_css(): void
    {
        $page = $this->homepageA();

        $this->actingAs($this->adminA)
            ->postJson($this->builderUrl("/{$page->id}/save"), [
                'html' => '<p>x</p>',
                'css' => '#a{color:red}< / STYLE ><ScRipt>alert(1)</ScRipt><!-- x -->#b{background:url(javascript:alert(1))}',
            ])
            ->assertOk();

        $css = $page->refresh()->css;
        $this->assertStringContainsString('#a{color:red}', $css);
        $this->assertDoesNotMatchRegularExpression('/<\s*\/?\s*(style|script)|<!--|-->|javascript:/i', $css);
    }

    public function test_css_sanitizer_is_not_bypassed_by_spliced_tokens(): void
    {
        $page = $this->homepageA();

        foreach ([
            '@im<script>port url(//evil/x.css);',
            'a{width:expr<script>ession(alert(1))}',
            '@im<!--port url(//evil/x.css);',
            'a{width:expr<!---->ession(alert(1))}',
            'a{x:-moz-bin<!--ding:url(x);}',
        ] as $input) {
            $this->actingAs($this->adminA)
                ->postJson($this->builderUrl("/{$page->id}/save"), ['html' => '<p>x</p>', 'css' => $input])
                ->assertOk();

            $css = $page->refresh()->css;
            $this->assertStringNotContainsStringIgnoringCase('@import', $css, $input);
            $this->assertStringNotContainsStringIgnoringCase('expression(', $css, $input);
            $this->assertStringNotContainsStringIgnoringCase('-moz-binding', $css, $input);
        }
    }

    public function test_draft_save_keeps_published_at(): void
    {
        $page = $this->homepageA();

        $this->actingAs($this->adminA)
            ->postJson($this->builderUrl("/{$page->id}/publish"), ['html' => '<p>v1</p>', 'css' => ''])
            ->assertOk();
        $publishedAt = $page->refresh()->published_at;
        $this->assertNotNull($publishedAt);

        $this->travel(1)->minutes();

        $this->actingAs($this->adminA)
            ->postJson($this->builderUrl("/{$page->id}/save"), ['html' => '<p>v2</p>', 'css' => ''])
            ->assertOk();

        $page->refresh();
        $this->assertTrue($page->published_at->equalTo($publishedAt));
        $this->assertTrue($page->is_published);
        $this->assertTrue($page->hasUnpublishedChanges());
    }

    public function test_revert_rejects_revision_from_other_page(): void
    {
        $page1 = $this->homepageA();
        $page2 = ClinicPage::create(['tenant_id' => $this->tenantA->id, 'slug' => 'about', 'title' => 'About']);
        $rev = $page2->createRevision(userId: $this->adminA->id, summary: 'About rev');

        $this->actingAs($this->adminA)
            ->postJson($this->builderUrl("/{$page1->id}/revert/{$rev->id}"))
            ->assertNotFound();
    }

    public function test_sanitizer_preserves_mv_attributes_and_still_strips_event_handlers(): void
    {
        $html = '<div id="a1" data-mv-animation="slide-up" data-mv-duration="800" data-mv-delay="200" '
            .'data-mv-custom-css="selector{border:2px solid red}" data-mv-hidden-desktop="1" '
            .'data-mv-hidden-tablet="1" data-mv-hidden-mobile="1" data-x="keep" onclick="alert(1)">Hi</div>';

        $clean = HtmlSanitizer::sanitize($html);

        $this->assertStringContainsString('data-mv-animation="slide-up"', $clean);
        $this->assertStringContainsString('data-mv-duration="800"', $clean);
        $this->assertStringContainsString('data-mv-delay="200"', $clean);
        $this->assertStringContainsString('data-mv-custom-css="selector{border:2px solid red}"', $clean);
        $this->assertStringContainsString('data-mv-hidden-desktop="1"', $clean);
        $this->assertStringContainsString('data-mv-hidden-tablet="1"', $clean);
        $this->assertStringContainsString('data-mv-hidden-mobile="1"', $clean);
        // Unchanged behaviour: other data-* attributes are kept, event handlers are stripped.
        $this->assertStringContainsString('data-x="keep"', $clean);
        $this->assertStringNotContainsString('onclick', $clean);
    }

    public function test_mv_attributes_survive_publish(): void
    {
        $page = $this->homepageA();
        $html = '<section id="s1" data-mv-animation="fade-in" data-mv-duration="500" data-mv-hidden-mobile="1" onclick="x()">Hello</section>';

        $this->actingAs($this->adminA)
            ->postJson($this->builderUrl("/{$page->id}/publish"), [
                'content_json' => ['v' => 1],
                'html' => $html,
                'css' => '#s1{display:none}',
            ])->assertOk();

        $published = (string) $page->fresh()->published_html;
        $this->assertStringContainsString('data-mv-animation="fade-in"', $published);
        $this->assertStringContainsString('data-mv-duration="500"', $published);
        $this->assertStringContainsString('data-mv-hidden-mobile="1"', $published);
        $this->assertStringNotContainsString('onclick', $published);
    }

    public function test_builder_without_page_opens_homepage(): void
    {
        $home = $this->homepageA();
        ClinicPage::create(['tenant_id' => $this->tenantA->id, 'slug' => 'about', 'title' => 'About']);

        $this->actingAs($this->adminA)
            ->get($this->builderUrl())
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Website/PageBuilder')
                ->where('page.id', $home->id)
                ->where('page.is_homepage', true)
                ->where('page.public_url', '/')
                ->has('pages', 2)
                ->has('siteKit.colors', 4)
            );
    }

    public function test_builder_page_of_another_tenant_is_not_found(): void
    {
        $other = ClinicPage::create(['tenant_id' => $this->tenantB->id, 'slug' => 'home', 'title' => 'Home', 'is_homepage' => true]);

        $this->actingAs($this->adminA)->get($this->builderUrl("/{$other->id}"))->assertNotFound();
        $this->actingAs($this->adminA)->postJson($this->builderUrl("/{$other->id}/save"), ['html' => ''])->assertNotFound();
    }

    public function test_media_library_upload_and_delete(): void
    {
        Storage::fake('public');

        $file = UploadedFile::fake()->create('reception.jpg', 500, 'image/jpeg');

        $uploadResponse = $this->actingAs($this->adminA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/website/builder/media/upload", [
                'files' => [$file],
            ]);

        $uploadResponse->assertOk();
        $uploadResponse->assertJson(['ok' => true]);

        $asset = ClinicMediaAsset::where('tenant_id', $this->tenantA->id)->first();
        $this->assertNotNull($asset);
        $this->assertEquals('reception.jpg', $asset->original_name);
        Storage::disk('public')->assertExists($asset->path);

        // Delete asset
        $deleteResponse = $this->actingAs($this->adminA)
            ->deleteJson("http://{$this->tenantA->subdomain}.{$this->baseDomain}/website/builder/media/{$asset->id}");

        $deleteResponse->assertOk();
        $this->assertDatabaseMissing('clinic_media_assets', ['id' => $asset->id]);
        Storage::disk('public')->assertMissing($asset->path);
    }

    public function test_public_landing_renders_published_builder_page(): void
    {
        ClinicPage::create([
            'tenant_id' => $this->tenantA->id,
            'slug' => 'home',
            'title' => 'Home',
            'is_homepage' => true,
            'is_published' => true,
            'published_at' => now(),
            'published_html' => '<div class="custom-hero"><h1>Welcome to Our Live Custom Website</h1></div>',
            'published_css' => '.custom-hero { background: #0E9E8F; }',
            'theme_preset' => 'medvisit-teal',
        ]);

        $response = $this->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/");

        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Public/ClinicLanding')
            ->has('customPage')
            ->where('customPage.html', fn ($html) => str_contains($html, 'Welcome to Our Live Custom Website'))
        );
    }
}
