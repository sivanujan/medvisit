<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\ReservedSubdomain;
use App\Models\Tenant;
use App\Models\User;
use App\Rules\SubdomainRule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SubdomainReservationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->app['url']->defaults(['central_domain' => config('medvisit.base_domain', 'medvisit.localhost')]);
    }

    /**
     * Helper to validate a subdomain through SubdomainRule.
     */
    protected function validateSubdomain(string $subdomain, ?string $clinicName = null, ?string $city = null, bool $allowOverride = false): bool
    {
        $validator = Validator::make(
            ['subdomain' => $subdomain],
            ['subdomain' => [new SubdomainRule(null, $allowOverride, $clinicName, $city)]]
        );

        return ! $validator->fails();
    }

    public function test_format_rules_length_bounds(): void
    {
        $this->assertFalse($this->validateSubdomain('ab')); // 2 chars (too short)
        $this->assertTrue($this->validateSubdomain('abc')); // 3 chars (valid)
        $this->assertTrue($this->validateSubdomain(str_repeat('a', 30))); // 30 chars (valid)
        $this->assertFalse($this->validateSubdomain(str_repeat('a', 31))); // 31 chars (too long)
    }

    public function test_format_rules_character_and_hyphen_boundaries(): void
    {
        $this->assertFalse($this->validateSubdomain('-invalid')); // starts with hyphen
        $this->assertFalse($this->validateSubdomain('invalid-')); // ends with hyphen
        $this->assertFalse($this->validateSubdomain('-invalid-'));
        $this->assertFalse($this->validateSubdomain('invalid_char')); // underscore not allowed
        $this->assertFalse($this->validateSubdomain('in.valid')); // dot not allowed
        $this->assertTrue($this->validateSubdomain('valid-subdomain-123'));
    }

    public function test_format_rules_consecutive_hyphens_punycode_and_numbers_only(): void
    {
        $this->assertFalse($this->validateSubdomain('test--clinic')); // consecutive hyphens
        $this->assertFalse($this->validateSubdomain('xn--clinic')); // punycode prefix
        $this->assertFalse($this->validateSubdomain('123456')); // numbers only
        $this->assertTrue($this->validateSubdomain('clinic123')); // numbers with letters
    }

    public function test_exact_reserved_names_across_categories(): void
    {
        $reservedSamples = [
            // Infra / System
            'www', 'api', 'admin', 'sys', 'cdn', 'redis', 'portal', 'dashboard',
            // Brand
            'medvisit', 'med-visit', 'official', 'team', 'ceo',
            // Accounts / Billing
            'login', 'billing', 'checkout', 'pricing', 'subscribe', 'verify',
            // Support / Legal
            'support', 'help', 'privacy', 'terms', 'legal',
            // Features / Product
            'doctor', 'token', 'queue', 'pharmacy', 'display', 'patient',
            // Health bodies
            'moh', 'slmc', 'nmra', 'who', 'hospital',
            // Mail / DNS
            'postmaster', 'noreply', 'resend', 'assets', 'send', 'rsend',
        ];

        foreach ($reservedSamples as $reserved) {
            $this->assertTrue(
                SubdomainRule::isReserved($reserved),
                "Expected '{$reserved}' to be recognized as reserved."
            );
            $this->assertFalse(
                $this->validateSubdomain($reserved),
                "Validation should fail for reserved subdomain '{$reserved}'."
            );
        }
    }

    public function test_contains_pattern_for_medvisit_brand(): void
    {
        $blocked = ['medvisit-care', 'care-medvisit', 'my-medvisit-clinic', 'med-visit-team'];

        foreach ($blocked as $candidate) {
            $this->assertTrue(SubdomainRule::isReserved($candidate), "'{$candidate}' must be blocked.");
            $this->assertFalse($this->validateSubdomain($candidate), "'{$candidate}' should fail validation.");
        }
    }

    public function test_segment_blocks_vs_scunthorpe_sri_lankan_names(): void
    {
        // 1. Hyphen-separated segments must be blocked
        $segmentBlocked = [
            'jaffna-admin',
            'admin-clinic',
            'gov-hospital',
            'colombo-support',
            'official-centre',
            'billing-desk',
            'clinic-login',
            'security-care',
            'verify-clinic',
        ];

        foreach ($segmentBlocked as $candidate) {
            $this->assertTrue(SubdomainRule::isReserved($candidate), "'{$candidate}' should be blocked as a reserved segment.");
            $this->assertFalse($this->validateSubdomain($candidate), "'{$candidate}' should fail validation.");
        }

        // 2. Sri Lankan personal and clinic names must PASS (Scunthorpe problem guard)
        $mustPass = [
            'padmini',     // contains "admin"
            'govinda',     // contains "gov"
            'govindan',    // contains "gov"
            'supuni',      // contains "pun"
            'nimal',
            'kamala',
            'suresh',
            'thushara',
            'saman',
            'padmini-care', // padmini followed by care
        ];

        foreach ($mustPass as $allowed) {
            $this->assertFalse(SubdomainRule::isReserved($allowed), "'{$allowed}' should NOT be reserved.");
            $this->assertTrue($this->validateSubdomain($allowed), "'{$allowed}' should pass validation.");
        }
    }

    public function test_offensive_words_rules(): void
    {
        // Words >= 5 characters are blocked as substring
        $this->assertTrue(SubdomainRule::isReserved('best-pussycat-clinic'));
        $this->assertFalse($this->validateSubdomain('best-pussycat-clinic'));

        // Short words (< 5 characters) are blocked only as whole segment
        $this->assertTrue(SubdomainRule::isReserved('colombo-sex-clinic'));
        $this->assertFalse($this->validateSubdomain('colombo-sex-clinic'));

        // Suffix/infix of short offensive word that forms benign word passes
        $this->assertFalse(SubdomainRule::isReserved('sussex-clinic'));
    }

    public function test_soft_deleted_tenant_blocks_subdomain_during_restore_window(): void
    {
        $tenant = Tenant::factory()->create([
            'id' => 'suwasetha',
            'subdomain' => 'suwasetha',
        ]);

        // Soft delete tenant
        $tenant->delete();

        $this->assertSoftDeleted('tenants', ['id' => 'suwasetha']);

        // Availability check must report unavailable
        $this->assertFalse(SubdomainRule::isAvailable('suwasetha'));

        // Registration attempt should fail
        $this->assertFalse($this->validateSubdomain('suwasetha'));

        $response = $this->postJson('/check-subdomain', ['subdomain' => 'suwasetha']);
        $response->assertStatus(200);
        $response->assertJson([
            'available' => false,
        ]);
        $this->assertStringContainsString('already taken', $response->json('reason'));
    }

    public function test_force_deleted_tenant_creates_90_day_hold_record(): void
    {
        $tenant = Tenant::factory()->create([
            'id' => 'abandoned-clinic',
            'subdomain' => 'abandoned-clinic',
        ]);

        // Force delete
        $tenant->forceDelete();

        $this->assertDatabaseMissing('tenants', ['id' => 'abandoned-clinic']);

        // Assert hold record exists in reserved_subdomains table
        $hold = ReservedSubdomain::where('subdomain', 'abandoned-clinic')->first();
        $this->assertNotNull($hold);
        $this->assertSame(90, (int) round(now()->diffInDays($hold->held_until)));
        $this->assertTrue($hold->isActive());

        // Subdomain is blocked
        $this->assertTrue(SubdomainRule::isReserved('abandoned-clinic'));
        $this->assertFalse($this->validateSubdomain('abandoned-clinic'));
    }

    public function test_super_admin_can_manage_database_reserved_subdomains(): void
    {
        Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $superAdmin = User::factory()->create([
            'tenant_id' => null,
        ]);
        $superAdmin->assignRole('super_admin');

        // Create reserved subdomain via Super Admin controller
        $response = $this->actingAs($superAdmin)
            ->post('/super-admin/reserved-subdomains', [
                'subdomain' => 'vip-care',
                'reason' => 'Reserved for upcoming corporate clinic',
                'notes' => 'Hold until Q4 launch',
            ]);

        $response->assertRedirect(route('super_admin.reserved_subdomains.index'));

        $this->assertDatabaseHas('reserved_subdomains', [
            'subdomain' => 'vip-care',
            'reason' => 'Reserved for upcoming corporate clinic',
        ]);

        $this->assertTrue(SubdomainRule::isReserved('vip-care'));

        // Delete reserved subdomain
        $record = ReservedSubdomain::where('subdomain', 'vip-care')->firstOrFail();
        $deleteResponse = $this->actingAs($superAdmin)
            ->delete("/super-admin/reserved-subdomains/{$record->id}");

        $deleteResponse->assertRedirect(route('super_admin.reserved_subdomains.index'));
        $this->assertDatabaseMissing('reserved_subdomains', ['id' => $record->id]);
        $this->assertFalse(SubdomainRule::isReserved('vip-care'));
    }

    public function test_lead_conversion_with_reserved_override(): void
    {
        Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $superAdmin = User::factory()->create([
            'tenant_id' => null,
        ]);
        $superAdmin->assignRole('super_admin');

        $lead = Lead::create([
            'clinic_name' => 'Gov Health Lead',
            'contact_name' => 'Dr. Perera',
            'email' => 'contact@govhealth.lk',
            'phone' => '+94771122334',
            'city' => 'Colombo',
            'source' => 'website_form',
            'stage' => Lead::STAGE_NEW,
        ]);

        // Attempting to convert using reserved name without override fails
        $failResponse = $this->actingAs($superAdmin)
            ->post("/super-admin/leads/{$lead->id}/convert", [
                'subdomain' => 'gov-hospital',
                'clinic_name' => 'Gov Health Lead',
                'phone' => '+94771122334',
                'plan' => 'pro',
            ]);

        $failResponse->assertSessionHasErrors(['subdomain']);

        // Attempting with override checkbox + reason succeeds and logs audit events
        $successResponse = $this->actingAs($superAdmin)
            ->post("/super-admin/leads/{$lead->id}/convert", [
                'subdomain' => 'gov-hospital',
                'clinic_name' => 'Gov Health Lead',
                'phone' => '+94771122334',
                'plan' => 'pro',
                'override_reserved' => true,
                'override_reason' => 'Official government MOH partnership pilot',
            ]);

        $successResponse->assertSessionHasNoErrors();
        $this->assertDatabaseHas('tenants', ['id' => 'gov-hospital']);

        // Check audit log
        $this->assertDatabaseHas('audit_events', [
            'action' => 'superadmin.subdomain.reserved_override',
            'tenant_id' => 'gov-hospital',
        ]);
    }

    public function test_contextual_suggestions_are_valid_and_available(): void
    {
        $suggestions = SubdomainRule::generateSuggestions('admin', 'Apex Medical Care', 'Colombo');

        $this->assertNotEmpty($suggestions);
        $this->assertLessThanOrEqual(3, count($suggestions));

        foreach ($suggestions as $suggestion) {
            $this->assertTrue(
                SubdomainRule::isAvailable($suggestion),
                "Suggestion '{$suggestion}' must be available."
            );
            $this->assertFalse(
                SubdomainRule::isReserved($suggestion),
                "Suggestion '{$suggestion}' must not be reserved."
            );
        }
    }

    public function test_existing_tenants_remain_unaffected(): void
    {
        // Even though 'demo' is in config reserved words, existing demo tenant is untouched
        $demoTenant = Tenant::factory()->create([
            'id' => 'demo',
            'subdomain' => 'demo',
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('tenants', [
            'id' => 'demo',
            'status' => 'active',
        ]);

        // It is considered reserved for new registrations
        $this->assertTrue(SubdomainRule::isReserved('demo'));
        $this->assertFalse($this->validateSubdomain('demo'));
    }
}
