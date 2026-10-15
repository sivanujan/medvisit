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
            ->postJson("http://{$this->tenantA->subdomain}.{$this->baseDomain}/website/builder/save", $payload);

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
            ->postJson("http://{$this->tenantA->subdomain}.{$this->baseDomain}/website/builder/publish", $payload);

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
            'html' => '<p>Clinic A Content</p>',
        ]);

        $revA = $pageA->createRevision(userId: $this->adminA->id, summary: 'A Rev 1');

        // 2. Admin B tries to revert Clinic A's revision
        $response = $this->actingAs($this->adminB)
            ->postJson("http://{$this->tenantB->subdomain}.{$this->baseDomain}/website/builder/revert/{$revA->id}");

        $response->assertForbidden();

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
            ->postJson("http://{$this->tenantA->subdomain}.{$this->baseDomain}/website/builder/save", [
                'content_json' => ['v' => 1],
                'html' => '<div>Initial Draft Version 1</div>',
                'css' => 'div { color: blue; }',
            ]);

        $page = ClinicPage::where('tenant_id', $this->tenantA->id)->where('slug', 'home')->first();
        $rev1 = $page->revisions()->where('version_number', 1)->first();
        $this->assertNotNull($rev1);

        // 2. Save Updated Version 2
        $this->actingAs($this->adminA)
            ->postJson("http://{$this->tenantA->subdomain}.{$this->baseDomain}/website/builder/save", [
                'content_json' => ['v' => 2],
                'html' => '<div>Updated Draft Version 2</div>',
                'css' => 'div { color: green; }',
            ]);

        $page->refresh();
        $this->assertStringContainsString('Updated Draft Version 2', $page->html);

        // 3. Revert to Revision 1
        $revertResponse = $this->actingAs($this->adminA)
            ->postJson("http://{$this->tenantA->subdomain}.{$this->baseDomain}/website/builder/revert/{$rev1->id}");

        $revertResponse->assertOk();

        $page->refresh();
        $this->assertStringContainsString('Initial Draft Version 1', $page->html);
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
