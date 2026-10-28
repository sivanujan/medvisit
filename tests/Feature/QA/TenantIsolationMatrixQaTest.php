<?php

declare(strict_types=1);

namespace Tests\Feature\QA;

use App\Models\Bill;
use App\Models\Doctor;
use App\Models\DoctorSettlement;
use App\Models\Patient;
use App\Models\Prescription;
use App\Models\Subscription;
use App\Models\SubscriptionInvoice;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use Database\Seeders\QaScenarioSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantIsolationMatrixQaTest extends TestCase
{
    use RefreshDatabase;

    private string $baseDomain;

    private Tenant $tenantA;

    private Tenant $tenantB;

    private User $adminA;

    private User $adminB;

    protected function setUp(): void
    {
        parent::setUp();
        $this->baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $this->seed(QaScenarioSeeder::class);

        $this->tenantA = Tenant::find('cityhealth');
        $this->tenantB = Tenant::find('apexcare');

        $this->adminA = User::where('email', 'admin@cityhealth.test')->first();
        $this->adminB = User::where('email', 'admin@apexcare.test')->first();
    }

    /**
     * 1. Patient isolation: Tenant A cannot view or edit Tenant B's patient.
     */
    public function test_tenant_a_cannot_access_tenant_b_patients(): void
    {
        // Create patient in Tenant B
        $patientB = Patient::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Secret Patient of ApexCare',
            'phone' => '+94770000001',
            'nic' => '199000000001',
        ]);

        // Tenant A admin requests patient B history on Tenant A subdomain
        $response = $this->actingAs($this->adminA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/patients/{$patientB->id}/history");

        $this->assertContains($response->getStatusCode(), [404, 403, 302], 'Patient history from Tenant B must not be accessible to Tenant A');

        // Search test: Patient B must not appear in Tenant A patient search
        $searchRes = $this->actingAs($this->adminA)
            ->getJson("http://{$this->tenantA->subdomain}.{$this->baseDomain}/api/patients/search?q=Secret");

        $searchRes->assertDontSee('Secret Patient of ApexCare');
    }

    /**
     * 2. Bill & Receipt isolation: Tenant A cannot view or refund Tenant B's bill.
     */
    public function test_tenant_a_cannot_access_tenant_b_bills(): void
    {
        $docB = Doctor::where('tenant_id', $this->tenantB->id)->first();
        $patientB = Patient::where('tenant_id', $this->tenantB->id)->first()
            ?? Patient::create(['tenant_id' => $this->tenantB->id, 'name' => 'P-B', 'phone' => '+94771111111']);

        $billB = Bill::create([
            'tenant_id' => $this->tenantB->id,
            'patient_id' => $patientB->id,
            'doctor_id' => $docB->id,
            'receipt_number' => 'REC-APEX-999',
            'doctor_fee' => 200000,
            'clinic_fee' => 50000,
            'total_amount' => 250000,
            'payment_status' => Bill::STATUS_PAID,
        ]);

        $response = $this->actingAs($this->adminA)
            ->post("http://{$this->tenantA->subdomain}.{$this->baseDomain}/billing/{$billB->id}/refund", [
                'refund_reason' => 'Cross-tenant illegal refund attempt',
            ]);

        $this->assertContains($response->getStatusCode(), [404, 403], 'Bill from Tenant B must not be mutable by Tenant A');
    }

    /**
     * 3. Prescription isolation: Tenant A doctor cannot view Tenant B's prescriptions.
     */
    public function test_tenant_a_cannot_access_tenant_b_prescriptions(): void
    {
        $patientB = Patient::where('tenant_id', $this->tenantB->id)->first()
            ?? Patient::create(['tenant_id' => $this->tenantB->id, 'name' => 'P-B2', 'phone' => '+94771111112']);
        $docB = Doctor::where('tenant_id', $this->tenantB->id)->first();

        $rxB = Prescription::create([
            'tenant_id' => $this->tenantB->id,
            'prescription_number' => 'RX-APEX-999',
            'patient_id' => $patientB->id,
            'doctor_id' => $docB->id,
            'status' => Prescription::STATUS_FINALIZED,
            'chief_complaint' => 'Confidential diagnosis',
        ]);

        $docUserA = User::where('email', 'dr.rohantha@cityhealth.test')->first();

        $response = $this->actingAs($docUserA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/doctor/prescriptions/{$rxB->id}/print");

        $this->assertContains($response->getStatusCode(), [404, 403, 302], 'Prescription of Tenant B must not leak to Tenant A');
    }

    /**
     * 4. Doctor Settlement isolation: Tenant A cannot access Tenant B's settlement slips.
     */
    public function test_tenant_a_cannot_access_tenant_b_payout_slips(): void
    {
        $docB = Doctor::where('tenant_id', $this->tenantB->id)->first();
        $settlementB = DoctorSettlement::create([
            'tenant_id' => $this->tenantB->id,
            'doctor_id' => $docB->id,
            'settlement_number' => 'PAY-APEX-0001',
            'period_start' => now()->subDays(7),
            'period_end' => now(),
            'gross_collected' => 500000,
            'doctor_payout_amount' => 350000,
            'clinic_amount' => 150000,
            'paid_amount' => 350000,
            'created_by' => $this->adminB->id,
        ]);

        $resSlip = $this->actingAs($this->adminA)
            ->getJson("http://{$this->tenantA->subdomain}.{$this->baseDomain}/billing/payouts/slip/{$settlementB->id}");

        $this->assertContains($resSlip->getStatusCode(), [404, 403], 'Settlement slip from Tenant B must not be accessible to Tenant A');
    }

    /**
     * 5. Pharmacy isolation: Tenant A cannot view Tenant B's suppliers or stock.
     */
    public function test_tenant_a_cannot_access_tenant_b_pharmacy_batches(): void
    {
        $supplierB = Supplier::create([
            'tenant_id' => $this->tenantB->id,
            'name' => 'Exclusive Supplier B',
            'phone' => '+94778888888',
        ]);

        $pharmacistA = User::where('email', 'pharmacist@cityhealth.test')->first();

        // Check supplier list on tenant A does not contain Exclusive Supplier B
        $resSuppliers = $this->actingAs($pharmacistA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/suppliers");

        $this->assertContains($resSuppliers->getStatusCode(), [200, 302]);
        $this->assertStringNotContainsString('Exclusive Supplier B', (string) $resSuppliers->getContent());

        // Attempting to directly view supplier B on tenant A subdomain
        $resSingleSupplier = $this->actingAs($pharmacistA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/pharmacy/suppliers/{$supplierB->id}");

        $this->assertContains($resSingleSupplier->getStatusCode(), [404, 403, 302]);
    }

    /**
     * 6. Staff isolation: Tenant A cannot deactivate Tenant B's staff.
     */
    public function test_tenant_a_cannot_modify_tenant_b_staff(): void
    {
        $resDeactivate = $this->actingAs($this->adminA)
            ->patch("http://{$this->tenantA->subdomain}.{$this->baseDomain}/staff/{$this->adminB->id}/toggle");

        $this->assertContains($resDeactivate->getStatusCode(), [404, 403], 'Cross-tenant staff modification must be rejected');
    }

    /**
     * 7. Subscription Invoice isolation: Tenant A cannot download Tenant B's invoice PDF.
     */
    public function test_tenant_a_cannot_download_tenant_b_subscription_invoice(): void
    {
        $subB = Subscription::where('tenant_id', $this->tenantB->id)->first();

        $invoiceB = SubscriptionInvoice::create([
            'tenant_id' => $this->tenantB->id,
            'subscription_id' => $subB->id,
            'invoice_number' => 'INV-APEX-000001',
            'amount_cents' => 700000,
            'period_start' => now(),
            'period_end' => now()->addMonth(),
            'due_date' => now(),
            'status' => SubscriptionInvoice::STATUS_PAID,
        ]);

        $resInvoice = $this->actingAs($this->adminA)
            ->get("http://{$this->tenantA->subdomain}.{$this->baseDomain}/settings/billing/invoices/{$invoiceB->id}/download");

        $this->assertContains($resInvoice->getStatusCode(), [404, 403], 'Cross-tenant invoice download must be blocked');
    }
}
