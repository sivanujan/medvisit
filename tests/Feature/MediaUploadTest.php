<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Doctor;
use App\Models\Tenant;
use App\Models\User;
use App\Support\SubscriptionStatusHelper;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaUploadTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $tenant;

    protected User $adminUser;

    protected User $regularUser;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

        $this->tenant = Tenant::factory()->active()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Medical Center',
            'subdomain' => 'suwasetha',
        ]);

        $this->adminUser = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Admin User',
            'email' => 'admin@suwasetha.lk',
        ]);

        $this->regularUser = User::factory()->create([
            'tenant_id' => $this->tenant->id,
            'name' => 'Staff Member',
            'email' => 'staff@suwasetha.lk',
        ]);
    }

    /**
     * Helper to create a valid minimal 100x100 PNG file.
     */
    protected function createValidPngUploadedFile(string $name = 'test.png'): UploadedFile
    {
        return UploadedFile::fake()->image($name, 100, 100);
    }

    /**
     * Helper to get raw valid PNG bytes.
     */
    protected function getValidPngBytes(): string
    {
        $im = imagecreatetruecolor(50, 50);
        $blue = imagecolorallocate($im, 30, 111, 217);
        imagefilledrectangle($im, 0, 0, 50, 50, $blue);
        ob_start();
        imagepng($im);
        $bytes = ob_get_clean();
        imagedestroy($im);

        return $bytes;
    }

    public function test_user_can_upload_valid_avatar_file(): void
    {
        $file = $this->createValidPngUploadedFile('avatar.png');

        $response = $this->actingAs($this->regularUser)
            ->postJson('/profile/avatar', [
                'file' => $file,
            ]);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'message',
                'avatar_url',
            ]);

        $this->regularUser->refresh();
        $this->assertNotNull($this->regularUser->avatar_path);
        $this->assertNotNull($this->regularUser->avatar_url);

        // Check storage
        Storage::disk('public')->assertExists($this->regularUser->avatar_path);
    }

    public function test_avatar_upload_rejects_svg_gif_and_oversized_files(): void
    {
        // 1. SVG rejection
        $svgFile = UploadedFile::fake()->create('malicious.svg', 10, 'image/svg+xml');
        $response = $this->actingAs($this->regularUser)
            ->postJson('/profile/avatar', ['file' => $svgFile]);
        $response->assertStatus(422);

        // 2. GIF rejection
        $gifFile = UploadedFile::fake()->create('animation.gif', 20, 'image/gif');
        $response = $this->actingAs($this->regularUser)
            ->postJson('/profile/avatar', ['file' => $gifFile]);
        $response->assertStatus(422);

        // 3. Oversized file (> 5 MB)
        $hugeFile = UploadedFile::fake()->create('huge.png', 6000, 'image/png');
        $response = $this->actingAs($this->regularUser)
            ->postJson('/profile/avatar', ['file' => $hugeFile]);
        $response->assertStatus(422);

        // 4. Non-image disguised with .png
        $fakeFile = UploadedFile::fake()->createWithContent('fake.png', 'NOT_AN_IMAGE_CONTENT');
        $response = $this->actingAs($this->regularUser)
            ->postJson('/profile/avatar', ['file' => $fakeFile]);
        $response->assertStatus(422);
    }

    public function test_user_can_upload_avatar_from_public_url(): void
    {
        $imageBytes = $this->getValidPngBytes();

        Http::fake([
            'https://images.unsplash.com/photo-test' => Http::response($imageBytes, 200, ['Content-Type' => 'image/png']),
        ]);

        $response = $this->actingAs($this->regularUser)
            ->postJson('/profile/avatar', [
                'source_url' => 'https://images.unsplash.com/photo-test',
            ]);

        $response->assertOk();

        $this->regularUser->refresh();
        $this->assertNotNull($this->regularUser->avatar_path);
        Storage::disk('public')->assertExists($this->regularUser->avatar_path);
    }

    public function test_avatar_from_url_blocks_ssrf_attacks(): void
    {
        // 1. Loopback 127.0.0.1
        $response = $this->actingAs($this->regularUser)
            ->postJson('/profile/avatar', [
                'source_url' => 'http://127.0.0.1:8000/secret.png',
            ]);
        $response->assertStatus(422);

        // 2. Private range 10.x
        $response = $this->actingAs($this->regularUser)
            ->postJson('/profile/avatar', [
                'source_url' => 'http://10.0.0.1/photo.png',
            ]);
        $response->assertStatus(422);

        // 3. AWS / Cloud metadata service 169.254.169.254
        $response = $this->actingAs($this->regularUser)
            ->postJson('/profile/avatar', [
                'source_url' => 'http://169.254.169.254/latest/meta-data/',
            ]);
        $response->assertStatus(422);

        // 4. Localhost hostname
        $response = $this->actingAs($this->regularUser)
            ->postJson('/profile/avatar', [
                'source_url' => 'http://localhost/image.png',
            ]);
        $response->assertStatus(422);

        // 5. HTML content (e.g. Google Drive landing page)
        Http::fake([
            'https://drive.google.com/share/item' => Http::response('<html><body>Download page</body></html>', 200, ['Content-Type' => 'text/html']),
        ]);
        $response = $this->actingAs($this->regularUser)
            ->postJson('/profile/avatar', [
                'source_url' => 'https://drive.google.com/share/item',
            ]);
        $response->assertStatus(422);
    }

    public function test_user_can_delete_avatar_and_restores_fallback(): void
    {
        $file = $this->createValidPngUploadedFile('avatar.png');

        $this->actingAs($this->regularUser)
            ->postJson('/profile/avatar', ['file' => $file]);

        $this->regularUser->refresh();
        $oldPath = $this->regularUser->avatar_path;
        Storage::disk('public')->assertExists($oldPath);

        // Delete avatar
        $response = $this->actingAs($this->regularUser)
            ->deleteJson('/profile/avatar');

        $response->assertOk()
            ->assertJson(['success' => true]);

        $this->regularUser->refresh();
        $this->assertNull($this->regularUser->avatar_path);
        $this->assertNull($this->regularUser->avatar_url);
        Storage::disk('public')->assertMissing($oldPath);
    }

    public function test_clinic_admin_can_upload_logo_and_generates_webp_and_favicon(): void
    {
        $file = $this->createValidPngUploadedFile('clinic-logo.png');
        $url = "http://suwasetha.{$this->baseDomain}/settings/branding/logo";

        $response = $this->actingAs($this->adminUser)
            ->postJson($url, [
                'file' => $file,
            ]);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'logo_url',
                'favicon_url',
            ]);

        $this->tenant->refresh();
        $this->assertNotNull($this->tenant->logo_path);
        $this->assertNotNull($this->tenant->logo_png_path);
        $this->assertNotNull($this->tenant->favicon_path);

        Storage::disk('public')->assertExists($this->tenant->logo_path);
        Storage::disk('public')->assertExists($this->tenant->logo_png_path);
        Storage::disk('public')->assertExists($this->tenant->favicon_path);

        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $this->tenant->id,
            'action' => 'clinic.logo_updated',
        ]);
    }

    public function test_clinic_admin_can_delete_logo(): void
    {
        $file = $this->createValidPngUploadedFile('clinic-logo.png');
        $url = "http://suwasetha.{$this->baseDomain}/settings/branding/logo";

        $this->actingAs($this->adminUser)->postJson($url, ['file' => $file]);

        $this->tenant->refresh();
        $logoPath = $this->tenant->logo_path;
        Storage::disk('public')->assertExists($logoPath);

        // Delete logo
        $response = $this->actingAs($this->adminUser)->deleteJson($url);

        $response->assertOk();

        $this->tenant->refresh();
        $this->assertNull($this->tenant->logo_path);
        $this->assertNull($this->tenant->logo_png_path);
        $this->assertNull($this->tenant->favicon_path);
        Storage::disk('public')->assertMissing($logoPath);

        $this->assertDatabaseHas('audit_events', [
            'tenant_id' => $this->tenant->id,
            'action' => 'clinic.logo_removed',
        ]);
    }

    public function test_clinic_admin_can_upload_and_delete_doctor_photo(): void
    {
        $doctor = Doctor::create([
            'tenant_id' => $this->tenant->id,
            'name' => 'K. Sivakumar',
            'title' => 'Dr.',
            'specialty' => 'Cardiologist',
            'slmc_number' => '12345',
            'doctor_fee_lkr' => 2000,
            'clinic_fee_lkr' => 800,
            'total_fee_lkr' => 2800,
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ]);

        $file = $this->createValidPngUploadedFile('doctor.png');
        $uploadUrl = "http://suwasetha.{$this->baseDomain}/doctors/{$doctor->id}/photo";

        $response = $this->actingAs($this->adminUser)
            ->postJson($uploadUrl, [
                'file' => $file,
            ]);

        $response->assertOk()
            ->assertJsonStructure([
                'success',
                'photo_url',
            ]);

        $doctor->refresh();
        $this->assertNotNull($doctor->photo_path);
        $this->assertNotNull($doctor->photo_url);
        Storage::disk('public')->assertExists($doctor->photo_path);

        // Delete doctor photo
        $deleteResponse = $this->actingAs($this->adminUser)
            ->deleteJson($uploadUrl);

        $deleteResponse->assertOk();

        $doctor->refresh();
        $this->assertNull($doctor->photo_path);
        $this->assertNull($doctor->photo_url);
    }

    public function test_tenant_isolation_prevents_clinic_a_from_modifying_clinic_b_doctor_photo(): void
    {
        // Clinic B
        $clinicB = Tenant::factory()->active()->create([
            'id' => 'lanka-care',
            'name' => 'Lanka Care Clinic',
            'subdomain' => 'lanka-care',
        ]);

        $doctorB = Doctor::create([
            'tenant_id' => $clinicB->id,
            'name' => 'B. Perera',
            'title' => 'Dr.',
            'specialty' => 'Pediatrician',
            'slmc_number' => '99887',
            'doctor_fee_lkr' => 2000,
            'clinic_fee_lkr' => 800,
            'total_fee_lkr' => 2800,
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ]);

        $file = $this->createValidPngUploadedFile('intruder.png');
        $url = "http://suwasetha.{$this->baseDomain}/doctors/{$doctorB->id}/photo";

        // Clinic A admin attempts to upload photo for Clinic B's doctor
        $response = $this->actingAs($this->adminUser)
            ->postJson($url, [
                'file' => $file,
            ]);

        // Doctor does not belong to Clinic A -> 404 or 403
        $this->assertContains($response->status(), [403, 404]);
    }

    public function test_subscription_status_helper_maps_all_statuses(): void
    {
        // 1. pending_payment
        $desc = SubscriptionStatusHelper::getDescriptor('pending_payment');
        $this->assertSame('Payment due', $desc['label']);
        $this->assertSame('amber', $desc['tone']);

        // 2. past_due
        $desc = SubscriptionStatusHelper::getDescriptor('past_due');
        $this->assertSame('Past due', $desc['label']);
        $this->assertSame('rose', $desc['tone']);

        // 3. expired
        $desc = SubscriptionStatusHelper::getDescriptor('expired');
        $this->assertSame('Expired', $desc['label']);

        // 4. cancelled
        $desc = SubscriptionStatusHelper::getDescriptor('cancelled');
        $this->assertSame('Cancelled', $desc['label']);

        // 5. trial
        $desc = SubscriptionStatusHelper::getDescriptor('trial', null, 5);
        $this->assertSame('Trial: 5d left', $desc['label']);

        // 6. cancelling with period end
        $desc = SubscriptionStatusHelper::getDescriptor('cancelling', '2026-11-25 00:00:00');
        $this->assertSame('Cancels on 25/11/2026', $desc['label']);
        $this->assertSame('amber', $desc['tone']);

        // 7. active
        $desc = SubscriptionStatusHelper::getDescriptor('active');
        $this->assertSame('Active', $desc['label']);
        $this->assertSame('emerald', $desc['tone']);
    }
}
