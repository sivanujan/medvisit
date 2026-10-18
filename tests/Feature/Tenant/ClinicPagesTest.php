<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\ClinicPage;
use App\Models\Tenant;
use App\Models\User;
use App\Support\PageSlug;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ClinicPagesTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenantA;

    protected Tenant $tenantB;

    protected User $adminA;

    protected User $adminB;

    protected User $receptionistA;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

        $this->tenantA = Tenant::factory()->active()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Medical Center',
            'subdomain' => 'suwasetha',
        ]);

        $this->tenantB = Tenant::factory()->active()->create([
            'id' => 'asiri',
            'name' => 'Asiri Central Clinic',
            'subdomain' => 'asiri',
        ]);

        $this->adminA = User::factory()->clinicAdmin()->create(['tenant_id' => $this->tenantA->id, 'email' => 'admin@suwasetha.lk']);
        $this->adminB = User::factory()->clinicAdmin()->create(['tenant_id' => $this->tenantB->id, 'email' => 'admin@asiri.lk']);
        $this->receptionistA = User::factory()->receptionist()->create(['tenant_id' => $this->tenantA->id, 'email' => 'rec@suwasetha.lk']);
    }

    private function urlA(string $path): string
    {
        return "http://{$this->tenantA->subdomain}.{$this->baseDomain}{$path}";
    }

    private function urlB(string $path): string
    {
        return "http://{$this->tenantB->subdomain}.{$this->baseDomain}{$path}";
    }

    private function makePage(string $slug, array $extra = []): ClinicPage
    {
        return ClinicPage::create(array_merge([
            'tenant_id' => $this->tenantA->id,
            'slug' => $slug,
            'title' => ucfirst($slug),
        ], $extra));
    }

    public function test_admin_can_create_blank_page(): void
    {
        $response = $this->actingAs($this->adminA)
            ->postJson($this->urlA('/website/pages'), ['title' => 'About Us', 'slug' => 'about-us', 'source' => 'blank']);

        $response->assertCreated();
        $response->assertJson(['slug' => 'about-us', 'title' => 'About Us', 'url' => '/p/about-us', 'is_homepage' => false, 'is_published' => false]);

        $this->assertDatabaseHas('clinic_pages', [
            'tenant_id' => $this->tenantA->id,
            'slug' => 'about-us',
            'is_published' => false,
            'is_homepage' => false,
        ]);
    }

    public function test_admin_can_create_page_from_template_and_copy(): void
    {
        $this->actingAs($this->adminA)
            ->postJson($this->urlA('/website/pages'), [
                'title' => 'Tpl', 'slug' => 'tpl', 'source' => 'template:modern-clinic',
                'html' => '<section>Hi</section><script>alert(1)</script>',
            ])->assertCreated();

        $html = ClinicPage::where('slug', 'tpl')->value('html');
        $this->assertStringContainsString('Hi', $html);
        $this->assertStringNotContainsString('<script', $html);

        $this->actingAs($this->adminA)
            ->postJson($this->urlA('/website/pages'), ['title' => 'Bad', 'slug' => 'bad', 'source' => 'template:nope'])
            ->assertStatus(422)->assertJsonValidationErrors('source');

        $original = $this->makePage('orig', ['html' => '<p>copied</p>', 'css' => 'p{color:red}']);
        $this->actingAs($this->adminA)
            ->postJson($this->urlA('/website/pages'), ['title' => 'C', 'slug' => 'c', 'source' => "copy:{$original->id}"])
            ->assertCreated();
        $this->assertSame('<p>copied</p>', ClinicPage::where('slug', 'c')->value('html'));
    }

    public function test_invalid_slug_is_rejected(): void
    {
        $this->actingAs($this->adminA)
            ->postJson($this->urlA('/website/pages'), ['title' => 'About Us', 'slug' => 'About Us', 'source' => 'blank'])
            ->assertStatus(422)
            ->assertJsonValidationErrors('slug');
    }

    public function test_slug_taken_by_trashed_page_is_rejected(): void
    {
        $payload = ['title' => 'About', 'slug' => 'about', 'source' => 'blank'];

        $id = $this->actingAs($this->adminA)->postJson($this->urlA('/website/pages'), $payload)->assertCreated()->json('id');
        $this->actingAs($this->adminA)->deleteJson($this->urlA("/website/pages/{$id}"))->assertOk();

        $this->actingAs($this->adminA)
            ->postJson($this->urlA('/website/pages'), $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors('slug');
    }

    public function test_duplicate_creates_copy_slug(): void
    {
        $about = $this->makePage('about', ['html' => '<p>About</p>', 'is_published' => true, 'published_at' => now()]);

        $first = $this->actingAs($this->adminA)->postJson($this->urlA("/website/pages/{$about->id}/duplicate"))
            ->assertCreated()->assertJson(['slug' => 'about-copy', 'is_published' => false]);
        $this->actingAs($this->adminA)->postJson($this->urlA("/website/pages/{$about->id}/duplicate"))
            ->assertCreated()->assertJson(['slug' => 'about-copy-2']);

        $copy = ClinicPage::find($first->json('id'));
        $this->assertSame('<p>About</p>', $copy->html);
        $this->assertFalse($copy->is_published);
    }

    public function test_homepage_cannot_be_deleted(): void
    {
        $home = $this->makePage('home', ['is_homepage' => true]);

        $this->actingAs($this->adminA)->deleteJson($this->urlA("/website/pages/{$home->id}"))->assertStatus(422);

        $this->assertDatabaseHas('clinic_pages', ['id' => $home->id, 'deleted_at' => null]);
    }

    public function test_setting_homepage_leaves_exactly_one(): void
    {
        $home = $this->makePage('home', ['is_homepage' => true]);
        $about = $this->makePage('about');
        $other = ClinicPage::create(['tenant_id' => $this->tenantB->id, 'slug' => 'home', 'title' => 'B', 'is_homepage' => true]);

        $this->actingAs($this->adminA)->postJson($this->urlA("/website/pages/{$about->id}/homepage"))
            ->assertOk()->assertJson(['is_homepage' => true, 'url' => '/']);
        $this->actingAs($this->adminA)->postJson($this->urlA("/website/pages/{$home->id}/homepage"))->assertOk();

        $this->assertSame(1, ClinicPage::where('tenant_id', $this->tenantA->id)->where('is_homepage', true)->count());
        $this->assertSame($home->id, ClinicPage::homepageFor($this->tenantA->id)->id);
        $this->assertTrue($other->fresh()->is_homepage);
    }

    public function test_soft_delete_and_restore(): void
    {
        $about = $this->makePage('about');

        $this->actingAs($this->adminA)->deleteJson($this->urlA("/website/pages/{$about->id}"))->assertOk();
        $this->assertSoftDeleted('clinic_pages', ['id' => $about->id]);

        $this->actingAs($this->adminA)->getJson($this->urlA('/website/pages'))->assertOk()->assertJsonCount(0, 'pages');
        $this->actingAs($this->adminA)->getJson($this->urlA('/website/pages/trash'))->assertOk()->assertJsonCount(1, 'pages');

        $this->actingAs($this->adminA)->postJson($this->urlA("/website/pages/{$about->id}/restore"))->assertOk();
        $this->assertNotSoftDeleted('clinic_pages', ['id' => $about->id]);
    }

    public function test_index_returns_list_shape(): void
    {
        $this->makePage('home', ['is_homepage' => true, 'is_published' => true, 'published_at' => now()->subHour()]);

        $this->actingAs($this->adminA)->getJson($this->urlA('/website/pages'))
            ->assertOk()
            ->assertJsonPath('pages.0.slug', 'home')
            ->assertJsonPath('pages.0.url', '/')
            ->assertJsonPath('pages.0.has_unpublished_changes', true)
            ->assertJsonStructure(['pages' => [['id', 'title', 'slug', 'url', 'is_homepage', 'is_published', 'has_unpublished_changes', 'updated_at', 'sort_order']]]);
    }

    public function test_admin_can_update_page(): void
    {
        $about = $this->makePage('about');
        $this->makePage('taken');

        $this->actingAs($this->adminA)
            ->patchJson($this->urlA("/website/pages/{$about->id}"), ['title' => 'About Us', 'slug' => 'about', 'seo_title' => 'S', 'sort_order' => 3])
            ->assertOk()->assertJson(['title' => 'About Us', 'sort_order' => 3]);

        $this->actingAs($this->adminA)
            ->patchJson($this->urlA("/website/pages/{$about->id}"), ['slug' => 'taken'])
            ->assertStatus(422)->assertJsonValidationErrors('slug');
    }

    public function test_receptionist_cannot_manage_pages(): void
    {
        $about = $this->makePage('about');

        $this->actingAs($this->receptionistA)->getJson($this->urlA('/website/pages'))->assertForbidden();
        $this->actingAs($this->receptionistA)
            ->postJson($this->urlA('/website/pages'), ['title' => 'X', 'slug' => 'x', 'source' => 'blank'])->assertForbidden();
        $this->actingAs($this->receptionistA)->deleteJson($this->urlA("/website/pages/{$about->id}"))->assertForbidden();
    }

    public function test_tenant_b_cannot_touch_tenant_a_pages(): void
    {
        $about = $this->makePage('about');
        $this->actingAs($this->adminB);

        $this->patchJson($this->urlB("/website/pages/{$about->id}"), ['title' => 'Hacked'])->assertNotFound();
        $this->deleteJson($this->urlB("/website/pages/{$about->id}"))->assertNotFound();
        $this->postJson($this->urlB("/website/pages/{$about->id}/homepage"))->assertNotFound();
        $this->postJson($this->urlB("/website/pages/{$about->id}/duplicate"))->assertNotFound();

        $about->delete();
        $this->postJson($this->urlB("/website/pages/{$about->id}/restore"))->assertNotFound();

        $this->assertSame('About', ClinicPage::withTrashed()->find($about->id)->title);
    }

    public function test_migration_marks_existing_home_as_homepage(): void
    {
        $migration = require database_path('migrations/2026_10_18_100000_add_multipage_columns_to_clinic_pages.php');

        // Roll back to the pre-flag schema, seed legacy rows, then re-run the migration.
        $migration->down();
        DB::table('clinic_pages')->insert([
            ['tenant_id' => $this->tenantA->id, 'slug' => 'home', 'title' => 'Home', 'created_at' => now(), 'updated_at' => now()],
            ['tenant_id' => $this->tenantA->id, 'slug' => 'about', 'title' => 'About', 'created_at' => now(), 'updated_at' => now()],
        ]);
        $migration->up();

        $this->assertSame('home', ClinicPage::homepageFor($this->tenantA->id)->slug);
        $this->assertSame(1, ClinicPage::where('is_homepage', true)->count());
    }

    public function test_slug_longer_than_60_chars_is_rejected(): void
    {
        $this->actingAs($this->adminA)
            ->postJson($this->urlA('/website/pages'), ['title' => 'X', 'slug' => str_repeat('a', 61), 'source' => 'blank'])
            ->assertStatus(422)->assertJsonValidationErrors('slug');

        $this->actingAs($this->adminA)
            ->postJson($this->urlA('/website/pages'), ['title' => 'X', 'slug' => str_repeat('a', 60), 'source' => 'blank'])
            ->assertCreated();
    }

    public function test_duplicating_max_length_slug_stays_within_limit(): void
    {
        $page = $this->makePage(str_repeat('a', 59).'-b');

        for ($i = 0; $i < 2; $i++) {
            $slug = $this->actingAs($this->adminA)->postJson($this->urlA("/website/pages/{$page->id}/duplicate"))
                ->assertCreated()->json('slug');

            $this->assertLessThanOrEqual(60, strlen($slug));
            $this->assertMatchesRegularExpression(PageSlug::PATTERN, $slug);
        }
    }

    public function test_database_rejects_second_homepage_for_same_tenant(): void
    {
        $this->makePage('home', ['is_homepage' => true]);

        $this->expectException(QueryException::class);
        $this->makePage('other', ['is_homepage' => true]);
    }
}
