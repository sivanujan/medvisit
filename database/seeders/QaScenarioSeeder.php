<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\ClinicMedicine;
use App\Models\DirectoryDoctor;
use App\Models\DirectoryListing;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Medicine;
use App\Models\MedicineBrand;
use App\Models\MedicineVariant;
use App\Models\Patient;
use App\Models\Plan;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\SessionTemplate;
use App\Models\StockBatch;
use App\Models\StockReceipt;
use App\Models\Subscription;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class QaScenarioSeeder extends Seeder
{
    public function run(): void
    {
        $tz = 'Asia/Colombo';
        $now = Carbon::now($tz);
        $baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));

        // -------------------------------------------------------------
        // 1. Roles & Permissions setup
        // -------------------------------------------------------------
        $superAdminRole = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $clinicAdminRole = Role::firstOrCreate(['name' => 'clinic_admin', 'guard_name' => 'web']);
        $doctorRole = Role::firstOrCreate(['name' => 'doctor', 'guard_name' => 'web']);
        $receptionistRole = Role::firstOrCreate(['name' => 'receptionist', 'guard_name' => 'web']);
        $pharmacistRole = Role::firstOrCreate(['name' => 'pharmacist', 'guard_name' => 'web']);

        $permissions = [
            'pharmacy.view',
            'pharmacy.manage_medicines',
            'pharmacy.receive_stock',
            'pharmacy.adjust_stock',
            'pharmacy.manage_suppliers',
            'pharmacy.import',
            'catalog.manage',
            'prescriptions.create',
            'prescriptions.view',
            'prescriptions.view_history',
            'pharmacy.dispense',
            'templates.manage_shared',
        ];

        foreach ($permissions as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        $superAdminRole->givePermissionTo(Permission::all());
        $clinicAdminRole->givePermissionTo(Permission::all());
        $doctorRole->givePermissionTo(['pharmacy.view', 'prescriptions.create', 'prescriptions.view', 'prescriptions.view_history']);
        $pharmacistRole->givePermissionTo(['pharmacy.view', 'pharmacy.manage_medicines', 'pharmacy.receive_stock', 'pharmacy.adjust_stock', 'pharmacy.manage_suppliers', 'pharmacy.import', 'pharmacy.dispense', 'prescriptions.view']);

        // -------------------------------------------------------------
        // 2. Central Super Admin
        // -------------------------------------------------------------
        $superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@medvisit.test'],
            [
                'tenant_id' => null,
                'name' => 'Super Administrator',
                'password' => Hash::make('Password123!'),
                'email_verified_at' => $now,
            ]
        );
        $superAdmin->syncRoles([$superAdminRole]);

        // -------------------------------------------------------------
        // 3. Plans
        // -------------------------------------------------------------
        $basicPlan = Plan::firstOrCreate(
            ['slug' => 'basic'],
            [
                'name' => 'Basic',
                'price_cents' => 700000,
                'billing_interval' => 'monthly',
                'features' => ['token_management', 'patient_records', 'queue_display'],
                'is_active' => true,
            ]
        );

        $proPlan = Plan::firstOrCreate(
            ['slug' => 'pro'],
            [
                'name' => 'Pro',
                'price_cents' => 900000,
                'billing_interval' => 'monthly',
                'features' => ['token_management', 'patient_records', 'queue_display', 'pharmacy', 'online_booking', 'directory'],
                'is_active' => true,
            ]
        );

        // -------------------------------------------------------------
        // 4. Global Medicine Catalog
        // -------------------------------------------------------------
        $paracetamol = Medicine::firstOrCreate(
            ['generic_name' => 'Paracetamol'],
            [
                'normalized_name' => 'paracetamol',
                'route' => 'oral',
                'is_combination' => false,
                'source' => Medicine::SOURCE_ADMIN,
                'status' => Medicine::STATUS_APPROVED,
            ]
        );

        $amoxicillin = Medicine::firstOrCreate(
            ['generic_name' => 'Amoxicillin'],
            [
                'normalized_name' => 'amoxicillin',
                'route' => 'oral',
                'is_combination' => false,
                'source' => Medicine::SOURCE_ADMIN,
                'status' => Medicine::STATUS_APPROVED,
            ]
        );

        $paracetamolVariant = MedicineVariant::firstOrCreate(
            ['medicine_id' => $paracetamol->id, 'strength_text' => '500mg'],
            [
                'dosage_form' => 'tablet',
                'source' => MedicineVariant::SOURCE_RXTERMS,
                'status' => MedicineVariant::STATUS_APPROVED,
            ]
        );

        $amoxicillinVariant = MedicineVariant::firstOrCreate(
            ['medicine_id' => $amoxicillin->id, 'strength_text' => '250mg'],
            [
                'dosage_form' => 'capsule',
                'source' => MedicineVariant::SOURCE_RXTERMS,
                'status' => MedicineVariant::STATUS_APPROVED,
            ]
        );

        $panadolBrand = MedicineBrand::firstOrCreate(
            ['medicine_variant_id' => $paracetamolVariant->id, 'brand_name' => 'Panadol'],
            ['manufacturer' => 'GSK Sri Lanka', 'status' => 'approved']
        );

        $amoxilBrand = MedicineBrand::firstOrCreate(
            ['medicine_variant_id' => $amoxicillinVariant->id, 'brand_name' => 'Amoxil'],
            ['manufacturer' => 'Glaxo Wellcome', 'status' => 'approved']
        );

        // -------------------------------------------------------------
        // 5. Tenants Configuration
        // -------------------------------------------------------------
        $tenantsData = [
            'a' => [
                'id' => 'cityhealth',
                'name' => 'City Health Family Practice',
                'subdomain' => 'cityhealth',
                'plan' => 'pro',
                'status' => 'active',
                'setup_completed' => true,
                'pharmacy_enabled' => true,
                'directory_enabled' => true,
                'online_booking_enabled' => true,
                'address' => '45 Dharmapala Mawatha, Colombo 07',
                'phone' => '+94112345678',
                'city' => 'Colombo',
                'district' => 'Colombo',
            ],
            'b' => [
                'id' => 'apexcare',
                'name' => 'Apex Care Medical Centre',
                'subdomain' => 'apexcare',
                'plan' => 'basic',
                'status' => 'active',
                'setup_completed' => true,
                'pharmacy_enabled' => false,
                'directory_enabled' => false,
                'online_booking_enabled' => false,
                'address' => '12 Kandy Road, Kadawatha',
                'phone' => '+94112998877',
                'city' => 'Kadawatha',
                'district' => 'Gampaha',
            ],
            'c' => [
                'id' => 'novaclinic',
                'name' => 'Nova Health Clinic (Trial)',
                'subdomain' => 'novaclinic',
                'plan' => 'trial',
                'status' => 'active',
                'setup_completed' => false,
                'setup_grace_until' => $now->copy()->addDays(5),
                'pharmacy_enabled' => false,
                'directory_enabled' => false,
                'online_booking_enabled' => false,
                'address' => '88 Galle Road, Dehiwala',
                'phone' => '+94112776655',
                'city' => 'Dehiwala',
                'district' => 'Colombo',
            ],
            'd' => [
                'id' => 'lankamed',
                'name' => 'LankaMed Diagnostic & Care',
                'subdomain' => 'lankamed',
                'plan' => 'pro',
                'status' => 'active',
                'setup_completed' => false,
                'setup_grace_until' => null, // Gated immediately
                'pharmacy_enabled' => true,
                'directory_enabled' => true,
                'online_booking_enabled' => true,
                'address' => '104 Peradeniya Road, Kandy',
                'phone' => '+94812233445',
                'city' => 'Kandy',
                'district' => 'Kandy',
            ],
        ];

        foreach ($tenantsData as $key => $tData) {
            $tenant = Tenant::firstOrCreate(
                ['id' => $tData['id']],
                [
                    'name' => $tData['name'],
                    'subdomain' => $tData['subdomain'],
                    'phone' => $tData['phone'],
                    'address' => $tData['address'],
                    'address_line' => $tData['address'],
                    'city' => $tData['city'],
                    'district' => $tData['district'],
                    'plan' => $tData['plan'],
                    'status' => $tData['status'],
                    'setup_completed_at' => $tData['setup_completed'] ? $now : null,
                    'setup_grace_until' => $tData['setup_grace_until'] ?? null,
                ]
            );

            $tenant->online_booking_enabled = $tData['online_booking_enabled'];
            $tenant->pharmacy_enabled = $tData['pharmacy_enabled'];
            $tenant->directory_consented = $tData['directory_enabled'];
            $tenant->save();

            // Subdomain routing mapping
            if (! $tenant->domains()->where('domain', $tData['subdomain'])->exists()) {
                $tenant->domains()->create(['domain' => $tData['subdomain']]);
            }
            if (! $tenant->domains()->where('domain', "{$tData['subdomain']}.{$baseDomain}")->exists()) {
                $tenant->domains()->create(['domain' => "{$tData['subdomain']}.{$baseDomain}"]);
            }

            // Subscription record
            Subscription::firstOrCreate(
                ['tenant_id' => $tenant->id],
                [
                    'plan_id' => $tData['plan'] === 'basic' ? $basicPlan->id : $proPlan->id,
                    'status' => Subscription::STATUS_ACTIVE,
                    'current_period_start' => $now->copy()->subDays(15),
                    'current_period_end' => $now->copy()->addDays(15),
                ]
            );

            // Staff per tenant
            $adminUser = User::firstOrCreate(
                ['email' => "admin@{$tData['subdomain']}.test"],
                [
                    'tenant_id' => $tenant->id,
                    'name' => "{$tData['name']} Admin",
                    'password' => Hash::make('Password123!'),
                    'email_verified_at' => $now,
                ]
            );
            $adminUser->syncRoles([$clinicAdminRole]);

            $receptionistUser = User::firstOrCreate(
                ['email' => "receptionist@{$tData['subdomain']}.test"],
                [
                    'tenant_id' => $tenant->id,
                    'name' => "Receptionist ({$tData['subdomain']})",
                    'password' => Hash::make('Password123!'),
                    'email_verified_at' => $now,
                ]
            );
            $receptionistUser->syncRoles([$receptionistRole]);

            $pharmacistUser = User::firstOrCreate(
                ['email' => "pharmacist@{$tData['subdomain']}.test"],
                [
                    'tenant_id' => $tenant->id,
                    'name' => "Pharmacist ({$tData['subdomain']})",
                    'password' => Hash::make('Password123!'),
                    'email_verified_at' => $now,
                ]
            );
            $pharmacistUser->syncRoles([$pharmacistRole]);

            // 2 Doctors: Doctor 1 linked to user, Doctor 2 unlinked
            $docUser1 = User::firstOrCreate(
                ['email' => "dr.rohantha@{$tData['subdomain']}.test"],
                [
                    'tenant_id' => $tenant->id,
                    'name' => 'Dr. Rohantha Senanayake',
                    'password' => Hash::make('Password123!'),
                    'email_verified_at' => $now,
                ]
            );
            $docUser1->syncRoles([$doctorRole]);

            $payoutRules = [
                'full_doctor_fee' => ['type' => 'full_doctor_fee', 'value' => 0],
                'fixed_per_patient' => ['type' => 'fixed_per_patient', 'value' => 200000],
                'percentage_of_total' => ['type' => 'percentage_of_total', 'value' => 70],
                'fixed_per_session' => ['type' => 'fixed_per_session', 'value' => 1000000],
                'salaried' => ['type' => 'salaried', 'value' => 25000000],
                'none' => ['type' => 'none', 'value' => 0],
            ];

            $ruleKeys = array_keys($payoutRules);

            $doctor1 = Doctor::firstOrCreate(
                ['tenant_id' => $tenant->id, 'slmc_number' => "28491-{$key}"],
                [
                    'user_id' => $docUser1->id,
                    'name' => 'Dr. Rohantha Senanayake',
                    'title' => 'Dr.',
                    'specialty' => 'Consultant Cardiologist',
                    'phone' => '+94772345678',
                    'email' => "dr.rohantha@{$tData['subdomain']}.test",
                    'doctor_fee' => 250000,
                    'clinic_fee' => 60000,
                    'payout_rule' => $payoutRules[$ruleKeys[0]],
                    'avg_consultation_minutes' => 12,
                    'is_active' => true,
                ]
            );

            $doctor2 = Doctor::firstOrCreate(
                ['tenant_id' => $tenant->id, 'slmc_number' => "31820-{$key}"],
                [
                    'user_id' => null, // Not linked
                    'name' => 'Dr. Anoma Wijesinghe',
                    'title' => 'Dr.',
                    'specialty' => 'Pediatrician',
                    'phone' => '+94718765432',
                    'email' => "anoma@{$tData['subdomain']}.test",
                    'doctor_fee' => 200000,
                    'clinic_fee' => 50000,
                    'payout_rule' => $payoutRules[$ruleKeys[1]],
                    'avg_consultation_minutes' => 10,
                    'is_active' => true,
                ]
            );

            // Templates for each doctor
            SessionTemplate::firstOrCreate(
                ['tenant_id' => $tenant->id, 'doctor_id' => $doctor1->id, 'day_of_week' => 1],
                [
                    'title' => 'Monday Morning Cardiology Clinic',
                    'start_time' => '08:30:00',
                    'end_time' => '12:00:00',
                    'max_patients' => 25,
                    'mode' => 'token',
                    'room_number' => 'Suite 1',
                    'doctor_fee' => $doctor1->doctor_fee,
                    'clinic_fee' => $doctor1->clinic_fee,
                    'payout_rule_override' => $payoutRules['percentage_of_total'],
                    'is_active' => true,
                ]
            );

            SessionTemplate::firstOrCreate(
                ['tenant_id' => $tenant->id, 'doctor_id' => $doctor2->id, 'day_of_week' => 3],
                [
                    'title' => 'Wednesday Pediatrics OPD',
                    'start_time' => '14:00:00',
                    'end_time' => '17:00:00',
                    'max_patients' => 20,
                    'mode' => 'token',
                    'room_number' => 'Suite 2',
                    'doctor_fee' => $doctor2->doctor_fee,
                    'clinic_fee' => $doctor2->clinic_fee,
                    'payout_rule_override' => $payoutRules['fixed_per_session'],
                    'is_active' => true,
                ]
            );

            // Sessions across past 2 weeks, today, and next 2 weeks
            $dates = [
                $now->copy()->subDays(10)->toDateString() => 'completed',
                $now->copy()->subDays(5)->toDateString() => 'completed',
                $now->copy()->toDateString() => 'in_progress', // Today
                $now->copy()->addDays(2)->toDateString() => 'scheduled',
                $now->copy()->addDays(7)->toDateString() => 'scheduled',
            ];

            foreach ($dates as $sDate => $status) {
                DoctorSession::firstOrCreate(
                    ['tenant_id' => $tenant->id, 'doctor_id' => $doctor1->id, 'session_date' => $sDate],
                    [
                        'start_time' => '08:30:00',
                        'end_time' => '12:00:00',
                        'max_tokens' => 20,
                        'mode' => 'token',
                        'status' => $status,
                        'room_number' => 'Suite 1',
                        'doctor_fee' => $doctor1->doctor_fee,
                        'clinic_fee' => $doctor1->clinic_fee,
                        'current_token_number' => $status === 'in_progress' ? 3 : 10,
                    ]
                );
            }

            // Cancelled session edge case
            DoctorSession::firstOrCreate(
                ['tenant_id' => $tenant->id, 'doctor_id' => $doctor2->id, 'session_date' => $now->copy()->subDays(2)->toDateString()],
                [
                    'start_time' => '14:00:00',
                    'end_time' => '17:00:00',
                    'max_tokens' => 15,
                    'mode' => 'token',
                    'status' => 'cancelled',
                    'room_number' => 'Suite 2',
                    'cancellation_reason' => 'Doctor on emergency hospital rounds',
                    'doctor_fee' => $doctor2->doctor_fee,
                    'clinic_fee' => $doctor2->clinic_fee,
                ]
            );

            // Directory listing for opted-in clinics
            if ($tData['directory_enabled']) {
                $dir = DirectoryListing::firstOrCreate(
                    ['tenant_id' => $tenant->id],
                    [
                        'clinic_name' => $tData['name'],
                        'slug' => $tData['subdomain'],
                        'district' => $tData['district'],
                        'city' => $tData['city'],
                        'address' => $tData['address'],
                        'latitude' => 6.9271,
                        'longitude' => 79.8612,
                        'phone' => $tData['phone'],
                        'whatsapp' => $tData['phone'],
                        'online_booking_enabled' => $tData['online_booking_enabled'],
                        'is_active' => true,
                        'consented_at' => $now,
                        'doctor_count' => 2,
                        'services' => ['General OPD', 'Cardiology', 'Pediatrics'],
                    ]
                );

                DirectoryDoctor::firstOrCreate(
                    ['directory_listing_id' => $dir->id, 'doctor_id' => $doctor1->id],
                    [
                        'tenant_id' => $tenant->id,
                        'name' => $doctor1->name,
                        'title' => 'Dr.',
                        'specialty' => $doctor1->specialty,
                        'slug' => Str::slug($doctor1->name),
                        'min_fee_cents' => $doctor1->doctor_fee + $doctor1->clinic_fee,
                        'is_active' => true,
                    ]
                );
            }
        }

        // -------------------------------------------------------------
        // 6. 60 Patients with mixed phone formats and duplicates
        // -------------------------------------------------------------
        $tenantA = Tenant::find('cityhealth');
        $sinhalaFirstNames = ['Kamal', 'Nimal', 'Sunil', 'Chandrani', 'Anula', 'Priyantha', 'Saman', 'Rohana', 'Kusum', 'Manel', 'Dinesh', 'Asanka', 'Ruwan', 'Suranga', 'Dilani'];
        $tamilFirstNames = ['Suresh', 'Karthik', 'Priya', 'Ravi', 'Murugan', 'Meena', 'Tharani', 'Kavitha', 'Vijay', 'Shankar'];
        $muslimFirstNames = ['Mohamed', 'Fathima', 'Ahmed', 'Ayesha', 'Rizwan', 'Zainab', 'Farhan', 'Shabnam'];
        $lastNames = ['Perera', 'Silva', 'Fernando', 'De Silva', 'Jayawardena', 'Gunaratne', 'Bandara', 'Herath', 'Dissanayake', 'Senanayake', 'Sivalingam', 'Rajaratnam', 'Kanagasabai', 'Ibrahim', 'Farook'];

        $phoneFormats = [
            fn ($num) => '+9477'.str_pad((string) $num, 7, '0', STR_PAD_LEFT),
            fn ($num) => '077'.str_pad((string) $num, 7, '0', STR_PAD_LEFT),
            fn ($num) => '77'.str_pad((string) $num, 7, '0', STR_PAD_LEFT),
            fn ($num) => '071'.str_pad((string) $num, 7, '0', STR_PAD_LEFT),
            fn ($num) => '+94 76 '.substr((string) $num, 0, 3).' '.substr((string) $num, 3, 4),
        ];

        $namesPool = [];
        foreach ($sinhalaFirstNames as $f) {
            foreach ($lastNames as $l) {
                $namesPool[] = "{$f} {$l}";
            }
        }
        foreach ($tamilFirstNames as $f) {
            foreach ($lastNames as $l) {
                $namesPool[] = "{$f} {$l}";
            }
        }
        foreach ($muslimFirstNames as $f) {
            foreach ($lastNames as $l) {
                $namesPool[] = "{$f} {$l}";
            }
        }

        $allPatients = [];
        for ($i = 1; $i <= 60; $i++) {
            $name = $namesPool[$i % count($namesPool)];
            $formatter = $phoneFormats[$i % count($phoneFormats)];

            // Patients 58, 59, 60 share the same underlying phone (0771239999) with different formatting
            if ($i === 58) {
                $rawPhone = '0771239999';
            } elseif ($i === 59) {
                $rawPhone = '+94 77 123 9999';
            } elseif ($i === 60) {
                $rawPhone = '771239999';
            } else {
                $rawPhone = $formatter(1000000 + $i);
            }

            $patient = Patient::create([
                'tenant_id' => $tenantA->id,
                'name' => $name,
                'phone' => $rawPhone,
                'phone_normalized' => Patient::normalizePhone($rawPhone),
                'nic' => (1970 + ($i % 30)).str_pad((string) $i, 8, '0', STR_PAD_LEFT),
                'city' => ($i % 2 === 0) ? 'Colombo' : 'Dehiwala',
                'district' => 'Colombo',
                'gender' => ($i % 2 === 0) ? 'male' : 'female',
            ]);
            $allPatients[] = $patient;
        }

        // -------------------------------------------------------------
        // 7. Tokens & Bills (Paid, Unpaid, Partly paid, Discounts, Refunds)
        // -------------------------------------------------------------
        $todaySessionA = DoctorSession::where('tenant_id', $tenantA->id)
            ->where('session_date', $now->toDateString())
            ->first();

        $doctorA = Doctor::where('tenant_id', $tenantA->id)->first();

        if ($todaySessionA && $doctorA) {
            for ($k = 0; $k < 15; $k++) {
                $p = $allPatients[$k];
                $tokenNum = $k + 1;
                $token = BookingToken::create([
                    'tenant_id' => $tenantA->id,
                    'doctor_session_id' => $todaySessionA->id,
                    'patient_id' => $p->id,
                    'token_number' => $tokenNum,
                    'status' => $k < 5 ? BookingToken::STATUS_COMPLETED : ($k === 5 ? BookingToken::STATUS_IN_CONSULTATION : BookingToken::STATUS_BOOKED),
                    'booked_via' => 'reception',
                ]);

                // Create bills with various statuses
                $billStatus = match ($k % 5) {
                    0 => Bill::STATUS_PAID,
                    1 => Bill::STATUS_PAID,
                    2 => Bill::STATUS_PENDING, // Unpaid
                    3 => Bill::STATUS_REFUNDED,
                    4 => Bill::STATUS_PAID, // With discount
                };

                $discountCents = ($k % 5 === 4) ? 50000 : 0; // Rs. 500 discount
                $totalCents = ($todaySessionA->doctor_fee + $todaySessionA->clinic_fee) - $discountCents;

                Bill::create([
                    'tenant_id' => $tenantA->id,
                    'booking_token_id' => $token->id,
                    'patient_id' => $p->id,
                    'doctor_id' => $doctorA->id,
                    'receipt_number' => sprintf('REC-QA-%05d', $k + 1),
                    'doctor_fee' => $todaySessionA->doctor_fee,
                    'clinic_fee' => $todaySessionA->clinic_fee,
                    'discount' => $discountCents,
                    'discount_reason' => $discountCents > 0 ? 'Senior Citizen Waiver' : null,
                    'total_amount' => $totalCents,
                    'payment_method' => ($k % 2 === 0) ? Bill::METHOD_CASH : Bill::METHOD_CARD,
                    'payment_status' => $billStatus,
                    'paid_at' => in_array($billStatus, [Bill::STATUS_PAID, Bill::STATUS_REFUNDED]) ? $now->copy()->subHours(2) : null,
                    'refunded_at' => ($billStatus === Bill::STATUS_REFUNDED) ? $now->copy()->subMinutes(30) : null,
                    'refund_reason' => ($billStatus === Bill::STATUS_REFUNDED) ? 'Patient called away on emergency' : null,
                ]);
            }
        }

        // -------------------------------------------------------------
        // 8. Pharmacy Setup for Tenant A
        // -------------------------------------------------------------
        $supplier = Supplier::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'name' => 'Lanka Pharma Distributors (Pvt) Ltd'],
            [
                'contact_person' => 'Roshan Wickremasinghe',
                'phone' => '+94771234567',
                'email' => 'orders@lankapharma.lk',
                'city' => 'Colombo',
                'is_active' => true,
            ]
        );

        $clinicMed1 = ClinicMedicine::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'medicine_variant_id' => $paracetamolVariant->id],
            [
                'medicine_brand_id' => $panadolBrand->id,
                'display_name' => 'Panadol 500mg Tablet',
                'base_unit' => 'tablet',
                'selling_price_cents' => 600, // Rs. 6.00
                'reorder_level' => 100,
                'shelf_location' => 'Shelf A-1',
                'is_active' => true,
            ]
        );

        $clinicMed2 = ClinicMedicine::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'medicine_variant_id' => $amoxicillinVariant->id],
            [
                'medicine_brand_id' => $amoxilBrand->id,
                'display_name' => 'Amoxil 250mg Capsule',
                'base_unit' => 'capsule',
                'selling_price_cents' => 2500, // Rs. 25.00
                'reorder_level' => 50,
                'shelf_location' => 'Shelf B-3',
                'is_active' => true,
            ]
        );

        $grn = StockReceipt::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'receipt_number' => 'GRN-QA-0001'],
            [
                'supplier_id' => $supplier->id,
                'invoice_number' => 'INV-LP-8849',
                'received_date' => $now->copy()->subDays(10)->toDateString(),
                'total_cost_cents' => 500000,
                'status' => StockReceipt::STATUS_RECEIVED,
            ]
        );

        // Near-expiry batch (expires in 12 days)
        StockBatch::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'batch_number' => 'BATCH-NEAR-EXP'],
            [
                'clinic_medicine_id' => $clinicMed1->id,
                'supplier_id' => $supplier->id,
                'stock_receipt_id' => $grn->id,
                'expiry_date' => $now->copy()->addDays(12)->toDateString(),
                'quantity_received' => 500,
                'quantity_remaining' => 350,
                'cost_price_cents' => 350,
                'received_at' => $now->copy()->subDays(10),
            ]
        );

        // Expired batch (expired 20 days ago)
        StockBatch::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'batch_number' => 'BATCH-EXPIRED-99'],
            [
                'clinic_medicine_id' => $clinicMed1->id,
                'supplier_id' => $supplier->id,
                'stock_receipt_id' => $grn->id,
                'expiry_date' => $now->copy()->subDays(20)->toDateString(),
                'quantity_received' => 200,
                'quantity_remaining' => 45,
                'cost_price_cents' => 350,
                'received_at' => $now->copy()->subMonths(6),
            ]
        );

        // Fresh batch (expires in 18 months)
        StockBatch::firstOrCreate(
            ['tenant_id' => $tenantA->id, 'batch_number' => 'BATCH-FRESH-2027'],
            [
                'clinic_medicine_id' => $clinicMed2->id,
                'supplier_id' => $supplier->id,
                'stock_receipt_id' => $grn->id,
                'expiry_date' => $now->copy()->addMonths(18)->toDateString(),
                'quantity_received' => 300,
                'quantity_remaining' => 280,
                'cost_price_cents' => 1500,
                'received_at' => $now->copy()->subDays(10),
            ]
        );

        // Prescription for patient 1
        $p1 = $allPatients[0];
        $rx = Prescription::create([
            'tenant_id' => $tenantA->id,
            'prescription_number' => 'RX-QA-0001',
            'patient_id' => $p1->id,
            'doctor_id' => $doctorA->id,
            'status' => Prescription::STATUS_FINALIZED,
            'chief_complaint' => 'Fever and body aches for 2 days',
            'diagnosis' => 'Viral upper respiratory tract infection',
            'clinical_notes' => 'Advised plenty of fluids and bed rest.',
            'finalized_at' => $now->copy()->subHours(1),
        ]);

        PrescriptionItem::create([
            'tenant_id' => $tenantA->id,
            'prescription_id' => $rx->id,
            'clinic_medicine_id' => $clinicMed1->id,
            'display_name' => 'Panadol 500mg Tablet',
            'generic_name' => 'Paracetamol',
            'dose_amount' => 2,
            'dose_unit' => 'tablets',
            'frequency' => 'TDS',
            'duration_days' => 3,
            'quantity' => 18,
            'instructions' => 'Take after meals for fever',
            'source' => PrescriptionItem::SOURCE_CLINIC,
        ]);
    }
}
