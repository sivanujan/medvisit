<?php

declare(strict_types=1);

namespace Tests\Feature\Tenant\Pharmacy;

use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\PharmacyPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PharmacyPermissionsTest extends TestCase
{
    use RefreshDatabase;

    protected Tenant $enabledTenant;

    protected Tenant $disabledTenant;

    protected string $baseDomain;

    protected function setUp(): void
    {
        parent::setUp();

        $this->baseDomain = config('medvisit.base_domain', 'medvisit.localhost');

        $this->seed(PharmacyPermissionsSeeder::class);

        $this->enabledTenant = Tenant::factory()->active()->create([
            'id' => 'suwasetha',
            'name' => 'Suwasetha Clinic',
            'subdomain' => 'suwasetha',
            'pharmacy_enabled' => true,
        ]);

        $this->disabledTenant = Tenant::factory()->active()->create([
            'id' => 'helasetha',
            'name' => 'Helasetha Clinic',
            'subdomain' => 'helasetha',
            'pharmacy_enabled' => false,
        ]);
    }

    public function test_when_pharmacy_module_is_disabled_all_pharmacy_routes_return_403(): void
    {
        $admin = User::factory()->clinicAdmin()->create([
            'tenant_id' => $this->disabledTenant->id,
            'email' => 'admin@helasetha.lk',
        ]);

        // Accessing pharmacy index returns 403
        $response = $this->actingAs($admin)
            ->get("http://{$this->disabledTenant->subdomain}.{$this->baseDomain}/pharmacy/medicines");

        $response->assertStatus(403);

        // Accessing GRN create returns 403
        $responseReceipt = $this->actingAs($admin)
            ->get("http://{$this->disabledTenant->subdomain}.{$this->baseDomain}/pharmacy/receipts/create");

        $responseReceipt->assertStatus(403);
    }

    public function test_receptionist_can_view_stock_but_cannot_receive_or_adjust(): void
    {
        $receptionist = User::factory()->receptionist()->create([
            'tenant_id' => $this->enabledTenant->id,
            'email' => 'receptionist@suwasetha.lk',
        ]);

        // 1. Receptionist CAN view stock
        $responseView = $this->actingAs($receptionist)
            ->get("http://{$this->enabledTenant->subdomain}.{$this->baseDomain}/pharmacy/medicines");

        $responseView->assertStatus(200);

        // 2. Receptionist CANNOT access Receive Stock GRN page (403)
        $responseReceive = $this->actingAs($receptionist)
            ->get("http://{$this->enabledTenant->subdomain}.{$this->baseDomain}/pharmacy/receipts/create");

        $responseReceive->assertStatus(403);

        // 3. Receptionist CANNOT submit GRN (403)
        $responseStoreGRN = $this->actingAs($receptionist)
            ->post("http://{$this->enabledTenant->subdomain}.{$this->baseDomain}/pharmacy/receipts", [
                'received_date' => now()->toDateString(),
                'items' => [],
            ]);

        $responseStoreGRN->assertStatus(403);

        // 4. Receptionist CANNOT adjust stock (403)
        $responseAdjust = $this->actingAs($receptionist)
            ->post("http://{$this->enabledTenant->subdomain}.{$this->baseDomain}/pharmacy/stock/adjust", [
                'stock_batch_id' => 1,
                'quantity' => -5,
                'type' => 'adjustment_out',
            ]);

        $responseAdjust->assertStatus(403);

        // 5. Receptionist CANNOT access CSV Import (403)
        $responseImport = $this->actingAs($receptionist)
            ->get("http://{$this->enabledTenant->subdomain}.{$this->baseDomain}/pharmacy/import");

        $responseImport->assertStatus(403);

        // 6. Receptionist CANNOT access Suppliers management (403)
        $responseSuppliers = $this->actingAs($receptionist)
            ->get("http://{$this->enabledTenant->subdomain}.{$this->baseDomain}/pharmacy/suppliers");

        $responseSuppliers->assertStatus(403);
    }
}
