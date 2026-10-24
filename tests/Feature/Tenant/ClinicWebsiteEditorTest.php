<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant;

use App\Models\ClinicPage;
use App\Models\Doctor;
use App\Models\Tenant;
use App\Models\User;
use App\Support\ClinicWebsite;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Tests\TestCase;

class ClinicWebsiteEditorTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $clinic;

    private Tenant $other;

    private User $admin;

    private User $otherAdmin;

    private string $baseDomain;

    /** Invented claims the old defaults showed to patients. */
    private const FAKE_CLAIMS = [
        '15+', '25,000+', 'Satisfied Patients', '100%', 'international safety protocols',
        'SLMC verified', 'wheelchair', 'parking', 'Zero waiting', 'leading medical practitioners',
        'SLMC Certified', 'Medical Council Verified', 'Specialist Medical Center',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

        $this->clinic = Tenant::factory()->active()->create([
            'id' => 'nallur', 'subdomain' => 'nallur', 'name' => 'Nallur Medical',
            'phone' => '+94 21 222 3333', 'address' => '12 Temple Road, Jaffna',
        ]);
        $this->other = Tenant::factory()->active()->create([
            'id' => 'kandy', 'subdomain' => 'kandy', 'name' => 'Kandy Family Care', 'phone' => '+94 81 111 2222',
        ]);
        $this->admin = User::factory()->clinicAdmin()->create(['tenant_id' => 'nallur', 'email' => 'admin@nallur.lk']);
        $this->otherAdmin = User::factory()->clinicAdmin()->create(['tenant_id' => 'kandy', 'email' => 'admin@kandy.lk']);
    }

    private function url(string $path, string $sub = 'nallur'): string
    {
        return "http://{$sub}.{$this->baseDomain}{$path}";
    }

    /** @return array<int, array<string, mixed>> */
    private function sectionsOf(string $tenantId, string $attr): array
    {
        return (array) Tenant::find($tenantId)->{$attr};
    }

    // ---- Part 1: no invented content ----

    public function test_default_site_shows_no_invented_claims_or_stats(): void
    {
        $response = $this->get($this->url('/'));

        $response->assertOk();
        foreach (self::FAKE_CLAIMS as $claim) {
            $response->assertDontSee($claim, false);
        }
        $response->assertInertia(fn ($page) => $page
            ->component('Public/ClinicLanding')
            ->where('stats', [])
            ->where('sections.0.title', 'Nallur Medical')
            ->where('sections.0.subtitle', 'Book your channeling token online')
        );
    }

    public function test_stats_are_real_counts_and_zero_values_are_hidden(): void
    {
        Doctor::factory()->count(2)->create(['tenant_id' => 'nallur', 'specialty' => 'Paediatrician']);
        Doctor::factory()->create(['tenant_id' => 'nallur', 'specialty' => 'Paediatrician', 'is_active' => false]);

        $this->get($this->url('/'))->assertInertia(fn ($page) => $page
            ->where('stats', [
                ['key' => 'doctors', 'value' => 2, 'label' => 'Doctors'],
                ['key' => 'specialties', 'value' => 1, 'label' => 'Specialty'],
            ]) // no sessions scheduled -> no sessions stat, and never a patient count
        );
    }

    public function test_empty_sections_are_hidden_on_the_live_site(): void
    {
        $this->get($this->url('/'))->assertInertia(fn ($page) => $page
            ->where('visibleSectionIds', fn ($ids) => collect($ids)->values()->all() === ['hero', 'contact', 'footer'])
        );

        $sections = ClinicWebsite::defaults($this->clinic);
        foreach ($sections as &$s) {
            if ($s['type'] === 'about') {
                $s['description'] = 'A family clinic near the temple.';
            }
            if ($s['type'] === 'services') {
                $s['items'] = [['name' => 'ECG', 'desc' => '']];
            }
        }
        $clinic = Tenant::find('nallur');
        $clinic->website_sections = $sections;
        $clinic->save();

        // Tenancy stays initialised between requests in one test; start fresh like a real request.
        tenancy()->end();

        $this->get($this->url('/'))->assertInertia(fn ($page) => $page
            ->where('visibleSectionIds', fn ($ids) => in_array('about', collect($ids)->all(), true)
                && in_array('services', collect($ids)->all(), true)
                && ! in_array('hours', collect($ids)->all(), true))
        );
    }

    // ---- Draft vs live ----

    public function test_autosave_changes_the_draft_only_until_published(): void
    {
        $draft = ClinicWebsite::defaults($this->clinic);
        $draft[0]['subtitle'] = 'Open for evening channeling';

        $this->actingAs($this->admin)
            ->putJson($this->url('/website/sections'), ['sections' => $draft])
            ->assertOk()
            ->assertJsonPath('status.change_count', 1);

        // Visitors still see the published copy; the editor preview sees the draft.
        $this->get($this->url('/'))->assertDontSee('Open for evening channeling');
        $this->actingAs($this->admin)->get($this->url('/preview'))->assertSee('Open for evening channeling');

        $this->actingAs($this->admin)->postJson($this->url('/website/publish'), ['published' => true])
            ->assertOk()
            ->assertJsonPath('status.change_count', 0);

        $this->get($this->url('/'))->assertSee('Open for evening channeling');
        $this->assertNull(Tenant::find('nallur')->website_sections_draft);
        $this->assertNotNull(Tenant::find('nallur')->website_published_at);
    }

    public function test_section_order_and_visibility_are_persisted(): void
    {
        $sections = ClinicWebsite::defaults($this->clinic);
        $faq = ClinicWebsite::defaultSection('faq', $this->clinic, 'faq-abc123');
        $faq['items'] = [['question' => 'Do you take walk-ins?', 'answer' => 'Yes.']];
        // Move contact to the top (after hero), hide services, add an FAQ.
        $byType = collect($sections)->keyBy('type')->all();
        $byType['services']['enabled'] = false;
        $ordered = [$byType['hero'], $byType['contact'], $faq, ...collect($byType)->except(['hero', 'contact'])->values()->all()];

        $this->actingAs($this->admin)->putJson($this->url('/website/sections'), ['sections' => $ordered])->assertOk();
        $this->actingAs($this->admin)->postJson($this->url('/website/publish'), ['published' => true])->assertOk();

        $live = $this->sectionsOf('nallur', 'website_sections');
        $this->assertSame(['hero', 'contact', 'faq-abc123'], array_slice(array_column($live, 'id'), 0, 3));
        $this->assertFalse(collect($live)->firstWhere('id', 'services')['enabled']);

        $this->get($this->url('/'))->assertInertia(fn ($page) => $page
            ->where('visibleSectionIds', fn ($ids) => in_array('faq-abc123', collect($ids)->all(), true)
                && ! in_array('services', collect($ids)->all(), true))
        );
    }

    // ---- Publish checklist ----

    public function test_publish_is_blocked_only_without_a_phone_or_name(): void
    {
        $this->clinic->phone = null;
        $this->clinic->save();

        $this->actingAs($this->admin)->postJson($this->url('/website/publish'), ['published' => true])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Add your phone number before publishing.');

        // A phone in Contact & map is enough; missing logo/hours/doctors/about only warn.
        $sections = ClinicWebsite::defaults($this->clinic);
        $sections[array_search('contact', array_column($sections, 'type'), true)]['phone'] = '+94 21 999 0000';
        $this->actingAs($this->admin)->putJson($this->url('/website/sections'), ['sections' => $sections])
            ->assertOk()
            ->assertJsonPath('status.checklist', fn ($list) => collect($list)->firstWhere('key', 'phone')['ok'] === true
                && collect($list)->firstWhere('key', 'logo')['ok'] === false
                && collect($list)->firstWhere('key', 'logo')['blocking'] === false);

        $this->actingAs($this->admin)->postJson($this->url('/website/publish'), ['published' => true])->assertOk();
        $this->assertTrue((bool) Tenant::find('nallur')->website_published);
    }

    // ---- Migration of old default copy ----

    public function test_old_default_claims_are_replaced_by_the_clean_up(): void
    {
        $legacy = [
            ['id' => 'hero', 'name' => 'Hero Banner', 'enabled' => true,
                'title' => ClinicWebsite::LEGACY_STRINGS['hero']['title'],
                'subtitle' => ClinicWebsite::LEGACY_STRINGS['hero']['subtitle']],
            ['id' => 'about', 'enabled' => true,
                'description' => ClinicWebsite::LEGACY_STRINGS['about']['description'],
                'stat_2_number' => '25,000+', 'stat_2_label' => 'Satisfied Patients'],
            ['id' => 'contact', 'enabled' => true, 'subtitle' => ClinicWebsite::LEGACY_STRINGS['contact']['subtitle']],
            ['id' => 'services', 'enabled' => true, 'items' => [
                ['name' => 'Specialist Doctor Channeling', 'desc' => 'x'],
                ['name' => 'Physiotherapy', 'desc' => 'Our own service'],
            ]],
        ];
        $this->clinic->website_sections = $legacy;
        $this->clinic->website_sections_draft = $legacy;
        $this->clinic->seo_description = 'Book doctor channeling sessions online at Nallur Medical'.ClinicWebsite::LEGACY_SEO_SUFFIX;
        $this->clinic->save();

        Artisan::call('website:clean-default-claims');
        $this->assertStringContainsString('1 clinic website(s) updated: nallur', Artisan::output());

        foreach (['website_sections', 'website_sections_draft'] as $attr) {
            $json = json_encode($this->sectionsOf('nallur', $attr));
            foreach (['25,000+', 'Satisfied Patients', 'international safety', 'wheelchair', 'leading medical', 'Specialist Doctor Channeling'] as $claim) {
                $this->assertStringNotContainsString($claim, $json, "{$attr} still contains {$claim}");
            }
            $this->assertStringContainsString('Physiotherapy', $json, 'Owner-written content must be kept');
            $this->assertStringContainsString('Book your channeling token online', $json);
        }
        $this->assertNull(Tenant::find('nallur')->seo_description);

        // Running it again changes nothing.
        Artisan::call('website:clean-default-claims');
        $this->assertStringContainsString('0 clinic website(s) updated', Artisan::output());
    }

    // ---- Tenant isolation ----

    public function test_clinics_cannot_touch_each_others_website(): void
    {
        $draft = ClinicWebsite::defaults($this->clinic);
        $draft[0]['title'] = 'Only for Nallur';
        $this->actingAs($this->admin)->putJson($this->url('/website/sections'), ['sections' => $draft])->assertOk();

        $this->assertNull(Tenant::find('kandy')->website_sections_draft);

        $page = ClinicPage::create(['tenant_id' => 'kandy', 'slug' => 'camps', 'title' => 'Health camps']);
        $this->actingAs($this->admin)
            ->postJson($this->url("/website/pages/{$page->id}/menu"), ['in_menu' => true])
            ->assertNotFound();

        // An admin of another clinic cannot use this clinic's editor.
        $this->actingAs($this->otherAdmin)->putJson($this->url('/website/sections'), ['sections' => $draft])
            ->assertStatus(403);
    }

    // ---- Part 2: SEO, Page menu & Starter pages ----

    public function test_seo_settings_can_be_saved(): void
    {
        $this->actingAs($this->admin)
            ->putJson($this->url('/website/seo'), [
                'seo_title' => 'Custom Clinic SEO Title',
                'seo_description' => 'Custom clinic description for Google search previews.',
                'share_image_url' => 'https://example.com/share.png',
            ])
            ->assertOk()
            ->assertJson(['ok' => true]);

        $tenant = Tenant::find('nallur');
        $this->assertSame('Custom Clinic SEO Title', $tenant->seo_title);
        $this->assertSame('Custom clinic description for Google search previews.', $tenant->seo_description);
        $this->assertSame('https://example.com/share.png', $tenant->website_share_image);

        // Other clinic admin cannot update Nallur SEO
        $this->actingAs($this->otherAdmin)
            ->putJson($this->url('/website/seo'), [
                'seo_title' => 'Hacked Title',
            ])
            ->assertStatus(403);
    }

    public function test_page_menu_toggle_and_tenant_isolation(): void
    {
        $page = ClinicPage::create([
            'tenant_id' => 'nallur',
            'slug' => 'health-camps',
            'title' => 'Health Camps',
            'is_published' => true,
        ]);

        // Toggle into menu
        $this->actingAs($this->admin)
            ->postJson($this->url("/website/pages/{$page->id}/menu"), ['in_menu' => true])
            ->assertOk()
            ->assertJson(['in_menu' => true]);

        $header = Tenant::find('nallur')->website_header;
        $this->assertNotEmpty($header['menu_items']);
        $this->assertSame('Health Camps', $header['menu_items'][0]['label']);
        $this->assertSame((string) $page->id, (string) $header['menu_items'][0]['page_id']);

        // Toggle out of menu
        $this->actingAs($this->admin)
            ->postJson($this->url("/website/pages/{$page->id}/menu"), ['in_menu' => false])
            ->assertOk()
            ->assertJson(['in_menu' => false]);

        $header = Tenant::find('nallur')->website_header;
        $this->assertEmpty($header['menu_items']);

        // Page from other tenant returns 404
        $otherPage = ClinicPage::create([
            'tenant_id' => 'kandy',
            'slug' => 'kandy-page',
            'title' => 'Kandy Page',
        ]);

        $this->actingAs($this->admin)
            ->postJson($this->url("/website/pages/{$otherPage->id}/menu"), ['in_menu' => true])
            ->assertNotFound();
    }

    public function test_starter_page_creation(): void
    {
        // 1. Blank starter
        $this->actingAs($this->admin)
            ->postJson($this->url('/website/pages'), [
                'title' => 'Blank Page',
                'slug' => 'blank-page',
                'source' => 'blank',
            ])
            ->assertStatus(201)
            ->assertJsonPath('slug', 'blank-page');

        // 2. Text + image starter
        $this->actingAs($this->admin)
            ->postJson($this->url('/website/pages'), [
                'title' => 'Patient Information',
                'slug' => 'patient-info',
                'source' => 'template:text-image',
                'html' => '<article><h1>Patient Information</h1><p>Guidance text</p></article>',
            ])
            ->assertStatus(201)
            ->assertJsonPath('slug', 'patient-info');

        $infoPage = ClinicPage::where('tenant_id', 'nallur')->where('slug', 'patient-info')->first();
        $this->assertNotNull($infoPage);
        $this->assertStringContainsString('Guidance text', $infoPage->html);

        // 3. FAQ starter
        $this->actingAs($this->admin)
            ->postJson($this->url('/website/pages'), [
                'title' => 'Patient Questions',
                'slug' => 'patient-questions',
                'source' => 'template:faq',
                'html' => '<section><h1>Patient Questions</h1><details><summary>Q</summary><p>A</p></details></section>',
            ])
            ->assertStatus(201)
            ->assertJsonPath('slug', 'patient-questions');

        $faqPage = ClinicPage::where('tenant_id', 'nallur')->where('slug', 'patient-questions')->first();
        $this->assertNotNull($faqPage);
        $this->assertStringContainsString('Patient Questions', $faqPage->html);
    }
}
