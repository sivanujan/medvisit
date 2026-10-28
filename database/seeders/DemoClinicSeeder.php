<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\ClinicMedicine;
use App\Models\ClinicPage;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\DoctorSettlement;
use App\Models\Medicine;
use App\Models\MedicineBrand;
use App\Models\MedicineVariant;
use App\Models\Patient;
use App\Models\Plan;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\PrescriptionTemplate;
use App\Models\PrescriptionTemplateItem;
use App\Models\StockBatch;
use App\Models\StockReceipt;
use App\Models\Subscription;
use App\Models\Supplier;
use App\Models\Tenant;
use App\Models\TvDevice;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class DemoClinicSeeder extends Seeder
{
    /**
     * Run the deterministic demo clinic seeder.
     */
    public function run(): void
    {
        $now = Carbon::now('Asia/Colombo');
        $today = $now->toDateString();
        $subdomain = (string) config('demo.subdomain', 'demo');
        $tenantId = (string) config('demo.tenant_id', 'demo');

        // 0. Safety cleanup: Only clean demo tenant data
        $this->cleanDemoTenant($tenantId);

        // 1. Roles
        $roles = [
            'clinic_admin' => Role::firstOrCreate(['name' => 'clinic_admin', 'guard_name' => 'web']),
            'receptionist' => Role::firstOrCreate(['name' => 'receptionist', 'guard_name' => 'web']),
            'doctor' => Role::firstOrCreate(['name' => 'doctor', 'guard_name' => 'web']),
            'pharmacist' => Role::firstOrCreate(['name' => 'pharmacist', 'guard_name' => 'web']),
        ];

        // 2. Demo Tenant
        $tenant = Tenant::updateOrCreate(
            ['id' => $tenantId],
            [
                'name' => 'MedVisit Demo Medical Centre',
                'subdomain' => $subdomain,
                'phone' => '+94 70 000 0000',
                'address' => '12 Demo Road, Jaffna (demo)',
                'address_line' => '12 Demo Road',
                'city' => 'Jaffna',
                'district' => 'Jaffna',
                'postal_code' => '40000',
                'legacy_address' => '12 Demo Road, Jaffna (demo)',
                'plan' => 'advanced',
                'status' => 'active',
                'is_demo' => true,
                'online_booking_enabled' => true,
                'require_phone_verification' => true,
                'tv_name_display_mode' => 'token_only',
                'trial_ends_at' => $now->copy()->addYear(),
                'setup_completed_at' => $now->copy()->subMonths(2),
                'setup_step' => 6,
                'pharmacy_enabled' => true,
                'prescription_print_enabled' => true,
                'token_number_format' => 'with_doctor_code',
                'fee_settings' => [
                    'pricing_mode' => 'split',
                    'default_doctor_fee' => 200000,
                    'default_clinic_fee' => 60000,
                    'default_total_fee' => 260000,
                    'online_booking_fee' => 0,
                    'rounding_step' => 0,
                    'default_payout_rule' => [
                        'type' => 'full_doctor_fee',
                        'value' => 0,
                        'min_patients' => 0,
                        'pay_no_shows' => false,
                        'pay_cancelled' => false,
                    ],
                    'receptionist_can_discount' => true,
                    'receptionist_max_discount_type' => 'percent',
                    'receptionist_max_discount_value' => 20,
                    'fee_setup_completed' => true,
                ],
            ]
        );

        // Bind domains
        $baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $demoDomains = [
            $subdomain,
            "{$subdomain}.{$baseDomain}",
            "{$subdomain}.localhost",
            "{$subdomain}.medvisit.test",
        ];

        foreach ($demoDomains as $dom) {
            if (! $tenant->domains()->where('domain', $dom)->exists()) {
                $tenant->domains()->create(['domain' => $dom]);
            }
        }

        // Active subscription for demo tenant
        $advancedPlan = Plan::where('slug', 'advanced')->first() ?? Plan::first();
        if ($advancedPlan) {
            Subscription::updateOrCreate(
                ['tenant_id' => $tenant->id],
                [
                    'plan_id' => $advancedPlan->id,
                    'status' => Subscription::STATUS_ACTIVE,
                    'current_period_start' => $now->copy()->subMonth(),
                    'current_period_end' => $now->copy()->addYear(),
                    'activated_at' => $now->copy()->subMonth(),
                ]
            );
        }

        // 3. Demo Staff Users (secure random passwords, authenticated via signed role links)
        $adminUser = User::updateOrCreate(
            ['email' => 'demo.admin@medvisit.lk'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Demo Admin (Dr. K. Nimalan)',
                'password' => Hash::make(Str::random(32)),
                'email_verified_at' => $now,
            ]
        );
        $adminUser->syncRoles([$roles['clinic_admin']]);

        $receptionistUser = User::updateOrCreate(
            ['email' => 'demo.reception@medvisit.lk'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Demo Reception (Sanduni Silva)',
                'password' => Hash::make(Str::random(32)),
                'email_verified_at' => $now,
            ]
        );
        $receptionistUser->syncRoles([$roles['receptionist']]);

        $doctorUser = User::updateOrCreate(
            ['email' => 'demo.doctor@medvisit.lk'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Dr. Nimal Senaratne',
                'password' => Hash::make(Str::random(32)),
                'email_verified_at' => $now,
            ]
        );
        $doctorUser->syncRoles([$roles['doctor']]);

        $pharmacistUser = User::updateOrCreate(
            ['email' => 'demo.pharmacy@medvisit.lk'],
            [
                'tenant_id' => $tenant->id,
                'name' => 'Demo Pharmacist (Rohan Perera)',
                'password' => Hash::make(Str::random(32)),
                'email_verified_at' => $now,
            ]
        );
        $pharmacistUser->syncRoles([$roles['pharmacist']]);

        // 4. Four Fictional Doctors
        $doctorsConfig = [
            [
                'user_id' => $doctorUser->id,
                'name' => 'Dr. Nimal Senaratne',
                'title' => 'Dr.',
                'specialty' => 'Consultant Physician',
                'token_code' => 'NS',
                'slmc_number' => 'DEMO-1001',
                'phone' => '+94 70 000 0901',
                'email' => 'demo.doctor@medvisit.lk',
                'bio' => 'Senior Consultant Physician specializing in adult internal medicine, hypertension, and diabetes management.',
                'doctor_fee' => 200000,
                'clinic_fee' => 50000,
                'avg_consultation_minutes' => 12,
                'payout_rule' => ['type' => 'full_doctor_fee', 'value' => 0],
                'room' => 'Room 01',
            ],
            [
                'user_id' => null,
                'name' => 'Dr. Arul Pragasam',
                'title' => 'Dr.',
                'specialty' => 'Consultant Pediatrician',
                'token_code' => 'AP',
                'slmc_number' => 'DEMO-1002',
                'phone' => '+94 70 000 0902',
                'email' => 'arul.pragasam@medvisit.test',
                'bio' => 'Pediatric specialist caring for infants, children, and adolescents with over 15 years clinical experience.',
                'doctor_fee' => 220000,
                'clinic_fee' => 60000,
                'avg_consultation_minutes' => 10,
                'payout_rule' => ['type' => 'percentage', 'value' => 80],
                'room' => 'Room 02',
            ],
            [
                'user_id' => null,
                'name' => 'Dr. Priyantha Jayawardena',
                'title' => 'Dr.',
                'specialty' => 'Consultant Cardiologist',
                'token_code' => 'PJ',
                'slmc_number' => 'DEMO-1003',
                'phone' => '+94 70 000 0903',
                'email' => 'priyantha.j@medvisit.test',
                'bio' => 'Cardiology consultant focusing on cardiovascular diagnostics, ECG, echocardiography, and preventive heart care.',
                'doctor_fee' => 300000,
                'clinic_fee' => 80000,
                'avg_consultation_minutes' => 15,
                'payout_rule' => ['type' => 'full_doctor_fee', 'value' => 0],
                'room' => 'Room 03',
            ],
            [
                'user_id' => null,
                'name' => 'Dr. Fathima Farook',
                'title' => 'Dr.',
                'specialty' => 'Family Medicine Specialist',
                'token_code' => 'FF',
                'slmc_number' => 'DEMO-1004',
                'phone' => '+94 70 000 0904',
                'email' => 'fathima.f@medvisit.test',
                'bio' => 'General practitioner and family wellness doctor providing comprehensive primary care and chronic disease follow-ups.',
                'doctor_fee' => 150000,
                'clinic_fee' => 50000,
                'avg_consultation_minutes' => 8,
                'payout_rule' => ['type' => 'split', 'value' => 0],
                'room' => 'Room 04',
            ],
        ];

        $doctors = [];
        foreach ($doctorsConfig as $cfg) {
            $doctors[$cfg['token_code']] = Doctor::updateOrCreate(
                ['tenant_id' => $tenant->id, 'token_code' => $cfg['token_code']],
                [
                    'user_id' => $cfg['user_id'],
                    'name' => $cfg['name'],
                    'title' => $cfg['title'],
                    'specialty' => $cfg['specialty'],
                    'slmc_number' => $cfg['slmc_number'],
                    'phone' => $cfg['phone'],
                    'email' => $cfg['email'],
                    'bio' => $cfg['bio'],
                    'doctor_fee' => $cfg['doctor_fee'],
                    'clinic_fee' => $cfg['clinic_fee'],
                    'avg_consultation_minutes' => $cfg['avg_consultation_minutes'],
                    'is_active' => true,
                ]
            );
        }

        // 5. 80 Sri Lankan Patients
        $firstNamesTamil = ['Sivanesan', 'Murugavel', 'Kavitha', 'Pratheepan', 'Tharsika', 'Ganeshan', 'Mayuri', 'Anand', 'Priyadharshini', 'Vasanth', 'Senthamil', 'Jeyakumar', 'Sharmila', 'Baskaran', 'Mathivathani', 'Uthayan', 'Ruban', 'Dharshini', 'Selvarani', 'Ragavan'];
        $firstNamesSinhala = ['Kasun', 'Nuwan', 'Dilrukshi', 'Chaminda', 'Samanthi', 'Isuru', 'Ruwani', 'Bandula', 'Maheshi', 'Chandana', 'Niluka', 'Anura', 'Thushari', 'Malinda', 'Supun', 'Kumudu', 'Asanka', 'Madushani', 'Chathurika', 'Dimuthu'];
        $firstNamesMuslim = ['Mohamed', 'Fathima', 'Rizwan', 'Ayesha', 'Farhan', 'Zainab', 'Nawaz', 'Shabnam', 'Ashik', 'Sumaiya', 'Irfan', 'Haseena', 'Rifaz', 'Nazriya', 'Imran', 'Safna', 'Junaid', 'Mariam', 'Bilal', 'Afra'];
        $lastNames = ['Perera', 'Silva', 'Fernando', 'de Silva', 'Thanabalasingam', 'Kanagaratnam', 'Sivapragasam', 'Rajapaksha', 'Dissanayake', 'Jayasinghe', 'Gunawardena', 'Ibrahim', 'Razzak', 'Lafir', 'Mansoor', 'Farook', 'Kumarasamy', 'Sivalingam', 'Jeyarajah', 'Wickramasinghe'];

        $allNames = [];
        foreach ($firstNamesTamil as $fn) {
            $allNames[] = $fn.' '.$lastNames[array_rand($lastNames)];
        }
        foreach ($firstNamesSinhala as $fn) {
            $allNames[] = $fn.' '.$lastNames[array_rand($lastNames)];
        }
        foreach ($firstNamesMuslim as $fn) {
            $allNames[] = $fn.' '.$lastNames[array_rand($lastNames)];
        }
        while (count($allNames) < 80) {
            $allNames[] = $firstNamesTamil[array_rand($firstNamesTamil)].' '.$lastNames[array_rand($lastNames)];
        }

        $cities = ['Jaffna', 'Nallur', 'Chavakachcheri', 'Point Pedro', 'Kopay', 'Manipay', 'Vaddukoddai', 'Karainagar'];

        $patientModels = [];
        foreach ($allNames as $idx => $pName) {
            $phone = sprintf('+94 70 000 %04d', $idx + 1);
            $gender = ($idx % 2 === 0) ? 'male' : 'female';
            $dobYear = 1960 + ($idx % 45);
            $nic = sprintf('DEMO-%06d', $idx + 1);

            $patientModels[] = Patient::create([
                'tenant_id' => $tenant->id,
                'name' => $pName,
                'phone' => $phone,
                'nic' => $nic,
                'gender' => $gender,
                'date_of_birth' => sprintf('%d-%02d-%02d', $dobYear, ($idx % 12) + 1, ($idx % 28) + 1),
                'district' => 'Jaffna',
                'city' => $cities[$idx % count($cities)],
                'address' => 'No. '.($idx + 1).', Demo Road, '.$cities[$idx % count($cities)].' (demo)',
            ]);
        }

        // 6. Doctor Sessions (Today Live, Past 30 Days, Future 14 Days)
        // Ensure AT LEAST 2 LIVE sessions in progress right now!
        $sess1Start = $now->copy()->subMinutes(90)->format('H:i:s');
        $sess1End = $now->copy()->addMinutes(150)->format('H:i:s');

        $sess2Start = $now->copy()->subMinutes(45)->format('H:i:s');
        $sess2End = $now->copy()->addMinutes(180)->format('H:i:s');

        $sess3Start = $now->copy()->addHours(3)->format('H:i:s');
        $sess3End = $now->copy()->addHours(6)->format('H:i:s');

        $todaySessionsConfig = [
            [
                'doctor' => $doctors['NS'],
                'start' => $sess1Start,
                'end' => $sess1End,
                'status' => 'in_progress',
                'current_token' => 3,
                'room' => 'Room 01',
                'tokens_count' => 12,
            ],
            [
                'doctor' => $doctors['AP'],
                'start' => $sess2Start,
                'end' => $sess2End,
                'status' => 'in_progress',
                'current_token' => 2,
                'room' => 'Room 02',
                'tokens_count' => 10,
            ],
            [
                'doctor' => $doctors['PJ'],
                'start' => $sess3Start,
                'end' => $sess3End,
                'status' => 'scheduled',
                'current_token' => 0,
                'room' => 'Room 03',
                'tokens_count' => 8,
            ],
        ];

        $patientCursor = 0;

        foreach ($todaySessionsConfig as $sCfg) {
            $doc = $sCfg['doctor'];
            $session = DoctorSession::create([
                'tenant_id' => $tenant->id,
                'doctor_id' => $doc->id,
                'session_date' => $today,
                'doctor_token_code' => $doc->token_code,
                'start_time' => $sCfg['start'],
                'end_time' => $sCfg['end'],
                'max_tokens' => 25,
                'mode' => 'token',
                'status' => $sCfg['status'],
                'room_number' => $sCfg['room'],
                'doctor_fee' => $doc->doctor_fee,
                'clinic_fee' => $doc->clinic_fee,
                'current_token_number' => $sCfg['current_token'],
            ]);

            // Generate tokens for today's session
            for ($tNum = 1; $tNum <= $sCfg['tokens_count']; $tNum++) {
                $patient = $patientModels[$patientCursor % count($patientModels)];
                $patientCursor++;

                $status = BookingToken::STATUS_BOOKED;
                $calledAt = null;

                if ($sCfg['status'] === 'in_progress') {
                    if ($tNum < $sCfg['current_token']) {
                        $status = BookingToken::STATUS_COMPLETED;
                        $calledAt = $now->copy()->subMinutes(30 * ($sCfg['current_token'] - $tNum));
                    } elseif ($tNum === $sCfg['current_token']) {
                        $status = BookingToken::STATUS_CALLED;
                        $calledAt = $now->copy()->subMinutes(5);
                    } elseif ($tNum === $sCfg['current_token'] + 1) {
                        $status = BookingToken::STATUS_CHECKED_IN;
                    } else {
                        $status = BookingToken::STATUS_BOOKED;
                    }
                }

                $token = BookingToken::create([
                    'tenant_id' => $tenant->id,
                    'doctor_session_id' => $session->id,
                    'patient_id' => $patient->id,
                    'token_number' => $tNum,
                    'status' => $status,
                    'called_at' => $calledAt,
                    'estimated_time' => $session->calculateEstimatedTime($tNum),
                    'booked_via' => ($tNum % 2 === 0) ? 'reception' : 'online',
                    'signed_cancel_token' => Str::random(40),
                ]);

                // Create bills for completed or called tokens
                if (in_array($status, [BookingToken::STATUS_COMPLETED, BookingToken::STATUS_CALLED, BookingToken::STATUS_IN_CONSULTATION])) {
                    Bill::create([
                        'tenant_id' => $tenant->id,
                        'booking_token_id' => $token->id,
                        'patient_id' => $patient->id,
                        'doctor_id' => $doc->id,
                        'receipt_number' => sprintf('DEMO-REC-%s%03d', $doc->token_code, $tNum),
                        'doctor_fee' => $session->doctor_fee,
                        'clinic_fee' => $session->clinic_fee,
                        'other_fee' => 0,
                        'discount' => 0,
                        'total_amount' => $session->doctor_fee + $session->clinic_fee,
                        'payment_method' => ($tNum % 2 === 0) ? 'card' : 'cash',
                        'payment_status' => 'paid',
                        'paid_at' => $now->copy()->subMinutes(10),
                    ]);
                }
            }
        }

        // 7. Future Sessions for the Next 14 Days
        for ($dayOffset = 1; $dayOffset <= 14; $dayOffset++) {
            $sessDate = $now->copy()->addDays($dayOffset)->toDateString();
            foreach ([$doctors['NS'], $doctors['AP'], $doctors['PJ'], $doctors['FF']] as $dIdx => $doc) {
                if (($dayOffset + $dIdx) % 2 === 0) {
                    $startH = 8 + ($dIdx * 3);
                    $fSession = DoctorSession::create([
                        'tenant_id' => $tenant->id,
                        'doctor_id' => $doc->id,
                        'session_date' => $sessDate,
                        'doctor_token_code' => $doc->token_code,
                        'start_time' => sprintf('%02d:00:00', $startH),
                        'end_time' => sprintf('%02d:30:00', $startH + 3),
                        'max_tokens' => 20,
                        'mode' => 'token',
                        'status' => 'scheduled',
                        'room_number' => 'Room 0'.($dIdx + 1),
                        'doctor_fee' => $doc->doctor_fee,
                        'clinic_fee' => $doc->clinic_fee,
                        'current_token_number' => 0,
                    ]);

                    // Pre-book 2-3 tokens for future sessions
                    for ($ft = 1; $ft <= 2; $ft++) {
                        $p = $patientModels[$patientCursor % count($patientModels)];
                        $patientCursor++;
                        BookingToken::create([
                            'tenant_id' => $tenant->id,
                            'doctor_session_id' => $fSession->id,
                            'patient_id' => $p->id,
                            'token_number' => $ft,
                            'status' => BookingToken::STATUS_BOOKED,
                            'estimated_time' => $fSession->calculateEstimatedTime($ft),
                            'booked_via' => 'online',
                            'signed_cancel_token' => Str::random(40),
                        ]);
                    }
                }
            }
        }

        // 8. Past 30 Days Data for Reports & Analytics
        for ($pastOffset = 1; $pastOffset <= 30; $pastOffset++) {
            $pastDate = $now->copy()->subDays($pastOffset)->toDateString();
            $doc = $doctorsConfig[$pastOffset % count($doctorsConfig)];
            $docModel = $doctors[$doc['token_code']];

            $pSession = DoctorSession::create([
                'tenant_id' => $tenant->id,
                'doctor_id' => $docModel->id,
                'session_date' => $pastDate,
                'doctor_token_code' => $docModel->token_code,
                'start_time' => '09:00:00',
                'end_time' => '12:00:00',
                'max_tokens' => 20,
                'mode' => 'token',
                'status' => 'completed',
                'room_number' => 'Room 01',
                'doctor_fee' => $docModel->doctor_fee,
                'clinic_fee' => $docModel->clinic_fee,
                'current_token_number' => 6,
            ]);

            for ($pt = 1; $pt <= 6; $pt++) {
                $p = $patientModels[($pastOffset * 2 + $pt) % count($patientModels)];
                $pToken = BookingToken::create([
                    'tenant_id' => $tenant->id,
                    'doctor_session_id' => $pSession->id,
                    'patient_id' => $p->id,
                    'token_number' => $pt,
                    'status' => BookingToken::STATUS_COMPLETED,
                    'booked_via' => ($pt % 2 === 0) ? 'reception' : 'online',
                    'created_at' => $now->copy()->subDays($pastOffset),
                    'updated_at' => $now->copy()->subDays($pastOffset),
                ]);

                Bill::create([
                    'tenant_id' => $tenant->id,
                    'booking_token_id' => $pToken->id,
                    'patient_id' => $p->id,
                    'doctor_id' => $docModel->id,
                    'receipt_number' => sprintf('DEMO-HIST-%02d%02d', $pastOffset, $pt),
                    'doctor_fee' => $docModel->doctor_fee,
                    'clinic_fee' => $docModel->clinic_fee,
                    'total_amount' => $docModel->doctor_fee + $docModel->clinic_fee,
                    'payment_method' => ($pt % 3 === 0) ? 'card' : 'cash',
                    'payment_status' => 'paid',
                    'paid_at' => $now->copy()->subDays($pastOffset),
                    'created_at' => $now->copy()->subDays($pastOffset),
                    'updated_at' => $now->copy()->subDays($pastOffset),
                ]);
            }
        }

        // 9. Suppliers & 20 Real Pharmacy Medicines
        $suppliersData = [
            ['name' => 'Lanka Pharma Distributors (Pvt) Ltd', 'contact' => 'Dharshan Silva', 'phone' => '+94 11 289 4567'],
            ['name' => 'Jaffna Healthcare Supplies', 'contact' => 'K. Thanabal', 'phone' => '+94 21 222 7890'],
            ['name' => 'City Medicom Pvt Ltd', 'contact' => 'Nawaz Farhan', 'phone' => '+94 77 345 6789'],
        ];

        $suppliers = [];
        foreach ($suppliersData as $sData) {
            $suppliers[] = Supplier::create([
                'tenant_id' => $tenant->id,
                'name' => $sData['name'],
                'contact_person' => $sData['contact'],
                'phone' => $sData['phone'],
                'email' => Str::slug($sData['name']).'@distributor.lk',
                'city' => 'Colombo',
                'is_active' => true,
            ]);
        }

        // Stock Receipt (GRN)
        $grn = StockReceipt::create([
            'tenant_id' => $tenant->id,
            'receipt_number' => 'GRN-DEMO-2026-001',
            'supplier_id' => $suppliers[0]->id,
            'invoice_number' => 'INV-LPD-8821',
            'received_date' => $now->copy()->subDays(5)->toDateString(),
            'total_cost_cents' => 3850000,
            'status' => StockReceipt::STATUS_RECEIVED,
        ]);

        $medicinesCatalog = [
            ['generic' => 'Paracetamol', 'strength' => '500mg', 'form' => 'tablet', 'brand' => 'Panadol 500mg', 'unit' => 'tablet', 'cost' => 350, 'sell' => 500],
            ['generic' => 'Amoxicillin', 'strength' => '500mg', 'form' => 'capsule', 'brand' => 'Amoxil 500mg', 'unit' => 'capsule', 'cost' => 1800, 'sell' => 2500],
            ['generic' => 'Metformin', 'strength' => '500mg', 'form' => 'tablet', 'brand' => 'Glucophage 500mg', 'unit' => 'tablet', 'cost' => 600, 'sell' => 900],
            ['generic' => 'Atorvastatin', 'strength' => '20mg', 'form' => 'tablet', 'brand' => 'Lipitor 20mg', 'unit' => 'tablet', 'cost' => 2500, 'sell' => 3500],
            ['generic' => 'Losartan Potassium', 'strength' => '50mg', 'form' => 'tablet', 'brand' => 'Cozaar 50mg', 'unit' => 'tablet', 'cost' => 1200, 'sell' => 1800],
            ['generic' => 'Omeprazole', 'strength' => '20mg', 'form' => 'capsule', 'brand' => 'Losec 20mg', 'unit' => 'capsule', 'cost' => 1100, 'sell' => 1600],
            ['generic' => 'Cetirizine', 'strength' => '10mg', 'form' => 'tablet', 'brand' => 'Zyrtec 10mg', 'unit' => 'tablet', 'cost' => 800, 'sell' => 1200],
            ['generic' => 'Salbutamol', 'strength' => '100mcg', 'form' => 'inhaler', 'brand' => 'Ventolin Inhaler', 'unit' => 'inhaler', 'cost' => 65000, 'sell' => 85000],
            ['generic' => 'Azithromycin', 'strength' => '500mg', 'form' => 'tablet', 'brand' => 'Zithromax 500mg', 'unit' => 'tablet', 'cost' => 4500, 'sell' => 6500],
            ['generic' => 'Ciprofloxacin', 'strength' => '500mg', 'form' => 'tablet', 'brand' => 'Ciprobay 500mg', 'unit' => 'tablet', 'cost' => 2200, 'sell' => 3200],
            ['generic' => 'Domperidone', 'strength' => '10mg', 'form' => 'tablet', 'brand' => 'Motilium 10mg', 'unit' => 'tablet', 'cost' => 650, 'sell' => 950],
            ['generic' => 'Pantoprazole', 'strength' => '40mg', 'form' => 'tablet', 'brand' => 'Pantocid 40mg', 'unit' => 'tablet', 'cost' => 1900, 'sell' => 2700],
            ['generic' => 'Gliclazide', 'strength' => '80mg', 'form' => 'tablet', 'brand' => 'Diamicron 80mg', 'unit' => 'tablet', 'cost' => 1400, 'sell' => 2000],
            ['generic' => 'Amlodipine', 'strength' => '5mg', 'form' => 'tablet', 'brand' => 'Norvasc 5mg', 'unit' => 'tablet', 'cost' => 900, 'sell' => 1400],
            ['generic' => 'Clopidogrel', 'strength' => '75mg', 'form' => 'tablet', 'brand' => 'Plavix 75mg', 'unit' => 'tablet', 'cost' => 3800, 'sell' => 5200],
            ['generic' => 'Ibuprofen', 'strength' => '400mg', 'form' => 'tablet', 'brand' => 'Brufen 400mg', 'unit' => 'tablet', 'cost' => 750, 'sell' => 1100],
            ['generic' => 'Mefenamic Acid', 'strength' => '500mg', 'form' => 'capsule', 'brand' => 'Ponstan 500mg', 'unit' => 'capsule', 'cost' => 1300, 'sell' => 1900],
            ['generic' => 'Doxycycline', 'strength' => '100mg', 'form' => 'capsule', 'brand' => 'Vibramycin 100mg', 'unit' => 'capsule', 'cost' => 1200, 'sell' => 1800],
            ['generic' => 'Cephalexin', 'strength' => '500mg', 'form' => 'capsule', 'brand' => 'Keflex 500mg', 'unit' => 'capsule', 'cost' => 2400, 'sell' => 3400],
            ['generic' => 'Montelukast', 'strength' => '10mg', 'form' => 'tablet', 'brand' => 'Singulair 10mg', 'unit' => 'tablet', 'cost' => 3200, 'sell' => 4500],
        ];

        $clinicMedicines = [];
        foreach ($medicinesCatalog as $mIdx => $mInfo) {
            $med = Medicine::firstOrCreate(
                ['generic_name' => $mInfo['generic']],
                [
                    'normalized_name' => strtolower($mInfo['generic']),
                    'route' => 'oral',
                    'is_combination' => false,
                    'source' => Medicine::SOURCE_ADMIN,
                    'status' => Medicine::STATUS_APPROVED,
                ]
            );

            $variant = MedicineVariant::firstOrCreate(
                ['medicine_id' => $med->id, 'strength_text' => $mInfo['strength']],
                [
                    'dosage_form' => $mInfo['form'],
                    'source' => MedicineVariant::SOURCE_RXTERMS,
                    'status' => MedicineVariant::STATUS_APPROVED,
                ]
            );

            $brand = MedicineBrand::firstOrCreate(
                ['medicine_variant_id' => $variant->id, 'brand_name' => $mInfo['brand']],
                ['manufacturer' => 'Standard Pharma Ltd', 'status' => 'approved']
            );

            $clinicMed = ClinicMedicine::create([
                'tenant_id' => $tenant->id,
                'medicine_variant_id' => $variant->id,
                'medicine_brand_id' => $brand->id,
                'display_name' => "{$mInfo['brand']} ({$mInfo['generic']})",
                'base_unit' => $mInfo['unit'],
                'selling_price_cents' => $mInfo['sell'],
                'reorder_level' => 25,
                'shelf_location' => 'Shelf '.chr(65 + ($mIdx % 6)).'-'.(($mIdx % 4) + 1),
                'is_active' => true,
            ]);

            $clinicMedicines[] = $clinicMed;

            // Create Stock Batch
            $isLow = ($mIdx === 2 || $mIdx === 5); // Low stock (e.g. 8 left)
            $isNearExpiry = ($mIdx === 3);         // Near expiry (+20 days)
            $isExpired = ($mIdx === 7);            // Expired (-15 days)

            $expiryDate = $now->copy()->addMonths(18)->toDateString();
            if ($isNearExpiry) {
                $expiryDate = $now->copy()->addDays(20)->toDateString();
            }
            if ($isExpired) {
                $expiryDate = $now->copy()->subDays(15)->toDateString();
            }

            $quantity = $isLow ? 8 : rand(60, 200);

            StockBatch::create([
                'tenant_id' => $tenant->id,
                'clinic_medicine_id' => $clinicMed->id,
                'supplier_id' => $suppliers[$mIdx % count($suppliers)]->id,
                'stock_receipt_id' => $grn->id,
                'batch_number' => sprintf('BAT-DEMO-%04d', $mIdx + 101),
                'expiry_date' => $expiryDate,
                'cost_price_cents' => $mInfo['cost'],
                'quantity_received' => $quantity + 20,
                'quantity_remaining' => $quantity,
                'received_at' => $now->copy()->subDays(5),
            ]);
        }

        // 10. Prescription Templates (6 clinical scenarios)
        $templatesConfig = [
            [
                'name' => 'Adult Hypertension Protocol',
                'doctor' => $doctors['NS'],
                'items' => [
                    ['drug' => 'Losartan Potassium 50mg', 'dose' => '1 tab', 'freq' => 'Once daily (morning)', 'dur' => 30],
                    ['drug' => 'Amlodipine 5mg', 'dose' => '1 tab', 'freq' => 'Once daily (night)', 'dur' => 30],
                ],
            ],
            [
                'name' => 'Type 2 Diabetes Routine',
                'doctor' => $doctors['NS'],
                'items' => [
                    ['drug' => 'Metformin 500mg', 'dose' => '1 tab', 'freq' => 'Twice daily after meals', 'dur' => 30],
                    ['drug' => 'Gliclazide 80mg', 'dose' => '1 tab', 'freq' => 'Once daily before breakfast', 'dur' => 30],
                ],
            ],
            [
                'name' => 'Pediatric URTI & Fever',
                'doctor' => $doctors['AP'],
                'items' => [
                    ['drug' => 'Paracetamol 500mg', 'dose' => '1/2 tab', 'freq' => 'Every 6 hours PRN', 'dur' => 3],
                    ['drug' => 'Cetirizine 10mg', 'dose' => '1/2 tab', 'freq' => 'Once at night', 'dur' => 5],
                ],
            ],
            [
                'name' => 'Acute Gastritis / Acid Reflux',
                'doctor' => $doctors['FF'],
                'items' => [
                    ['drug' => 'Omeprazole 20mg', 'dose' => '1 cap', 'freq' => 'Twice daily before meals', 'dur' => 14],
                    ['drug' => 'Domperidone 10mg', 'dose' => '1 tab', 'freq' => 'Three times daily before meals', 'dur' => 7],
                ],
            ],
            [
                'name' => 'Post-Viral Musculoskeletal Pain',
                'doctor' => $doctors['FF'],
                'items' => [
                    ['drug' => 'Paracetamol 500mg', 'dose' => '2 tabs', 'freq' => 'Three times daily after meals', 'dur' => 5],
                    ['drug' => 'Pantoprazole 40mg', 'dose' => '1 tab', 'freq' => 'Once daily morning', 'dur' => 7],
                ],
            ],
            [
                'name' => 'Preventive Cardiac Maintenance',
                'doctor' => $doctors['PJ'],
                'items' => [
                    ['drug' => 'Atorvastatin 20mg', 'dose' => '1 tab', 'freq' => 'Once at night', 'dur' => 30],
                    ['drug' => 'Clopidogrel 75mg', 'dose' => '1 tab', 'freq' => 'Once daily after breakfast', 'dur' => 30],
                ],
            ],
        ];

        foreach ($templatesConfig as $tCfg) {
            $tModel = PrescriptionTemplate::create([
                'tenant_id' => $tenant->id,
                'doctor_id' => $tCfg['doctor']->id,
                'name' => $tCfg['name'],
                'description' => 'Standard evidence-based guidance for follow-up outpatient care.',
                'is_shared' => true,
                'created_by' => $adminUser->id,
            ]);

            foreach ($tCfg['items'] as $seq => $item) {
                PrescriptionTemplateItem::create([
                    'tenant_id' => $tenant->id,
                    'prescription_template_id' => $tModel->id,
                    'display_name' => $item['drug'],
                    'dose_display' => $item['dose'],
                    'frequency' => $item['freq'],
                    'duration_days' => $item['dur'],
                    'instructions' => 'Follow prescribed timing carefully.',
                    'sort_order' => $seq + 1,
                ]);
            }
        }

        // 11. Prescriptions in English, Tamil, and Sinhala
        $langPrescriptions = [
            [
                'diag' => 'Hypertension Essential • Routine Review',
                'doctor' => $doctors['NS'],
                'patient' => $patientModels[0],
                'notes' => 'Maintain low sodium diet and daily 30-min walking. Repeat blood pressure in 2 weeks.',
                'items' => [
                    ['drug' => 'Losartan Potassium 50mg', 'dose' => '1 tab', 'freq' => 'Once daily (morning)', 'dur' => 14, 'inst' => 'Take with water every morning.'],
                ],
            ],
            [
                'diag' => 'உயர் இரத்த அழுத்தம் • சிறப்பு சிகிச்சை',
                'doctor' => $doctors['NS'],
                'patient' => $patientModels[1],
                'notes' => 'உப்பு உட்கொள்ளலைக் குறைக்கவும். தினமும் போதிய அளவு தண்ணீர் குடிக்கவும். இரண்டு வாரங்களுக்குப் பின் இரத்த அழுத்தத்தை மீண்டும் பரிசோதிக்கவும்.',
                'items' => [
                    ['drug' => 'Paracetamol 500mg', 'dose' => '1 மாத்திரை', 'freq' => 'தேவைப்படும் போது', 'dur' => 3, 'inst' => 'உணவுக்குப் பின் உட்கொள்ளவும்.'],
                ],
            ],
            [
                'diag' => 'උග්‍ර උණ සහ ශ්වසන ආසාදනය • විශේෂ ප්‍රතිකාර',
                'doctor' => $doctors['AP'],
                'patient' => $patientModels[2],
                'notes' => 'ලුණු භාවිතය සීමා කරන්න. දිනපතා සුවදායක ලෙස ව්‍යායාම කරන්න. සති දෙකකින් නැවත පරීක්ෂා කරගන්න.',
                'items' => [
                    ['drug' => 'Paracetamol 500mg', 'dose' => 'පෙති 1', 'freq' => 'පැය 6කට වරක්', 'dur' => 3, 'inst' => 'කෑමට පසු මඳ උණුසුම් වතුරෙන් ගන්න.'],
                ],
            ],
        ];

        foreach ($langPrescriptions as $pIdx => $lp) {
            $prescription = Prescription::create([
                'tenant_id' => $tenant->id,
                'prescription_number' => sprintf('RX-DEMO-%04d', $pIdx + 1),
                'doctor_id' => $lp['doctor']->id,
                'patient_id' => $lp['patient']->id,
                'diagnosis' => $lp['diag'],
                'clinical_notes' => $lp['notes'],
                'status' => Prescription::STATUS_FINALIZED,
                'finalized_at' => $now->copy()->subHours(2),
                'created_by' => $adminUser->id,
            ]);

            foreach ($lp['items'] as $sIndex => $item) {
                PrescriptionItem::create([
                    'tenant_id' => $tenant->id,
                    'prescription_id' => $prescription->id,
                    'display_name' => $item['drug'],
                    'dose_amount' => 1,
                    'dose_unit' => 'tablet',
                    'dose_display' => $item['dose'],
                    'frequency' => 'OD',
                    'frequency_text' => $item['freq'],
                    'duration_days' => $item['dur'],
                    'quantity' => 14,
                    'source' => 'clinic',
                    'instructions' => $item['inst'],
                    'sort_order' => $sIndex + 1,
                ]);
            }
        }

        // 12. Doctor Settlements
        DoctorSettlement::create([
            'tenant_id' => $tenant->id,
            'doctor_id' => $doctors['NS']->id,
            'settlement_number' => 'PAY-DEMO-NS-001',
            'period_start' => $now->copy()->subDays(14)->toDateString(),
            'period_end' => $now->copy()->subDays(7)->toDateString(),
            'sessions_count' => 4,
            'patients_seen' => 45,
            'gross_collected' => 9000000,
            'clinic_amount' => 1800000,
            'doctor_payout_amount' => 7200000,
            'paid_amount' => 7200000,
            'payment_status' => 'paid',
            'payment_method' => 'bank_transfer',
            'payment_reference' => 'TXN-BOC-992144',
            'paid_at' => $now->copy()->subDays(6),
        ]);

        // 13. Clinic Website & Custom Page
        ClinicPage::create([
            'tenant_id' => $tenant->id,
            'is_homepage' => true,
            'title' => 'Home',
            'slug' => 'home',
            'is_published' => true,
            'published_at' => $now->copy()->subMonths(1),
            'theme_preset' => 'medvisit-blue',
        ]);

        ClinicPage::create([
            'tenant_id' => $tenant->id,
            'is_homepage' => false,
            'title' => 'About Our Medical Centre',
            'slug' => 'about-us',
            'is_published' => true,
            'published_at' => $now->copy()->subMonths(1),
            'theme_preset' => 'medvisit-blue',
            'html' => '<div class="py-12 px-6 max-w-4xl mx-auto space-y-6"><h1 class="text-3xl font-black text-slate-900 dark:text-white">About MedVisit Demo Medical Centre</h1><p class="text-base text-slate-600 dark:text-slate-300">MedVisit Demo Medical Centre in Jaffna is equipped with high-efficiency outpatient channeling, comprehensive family healthcare, and fully integrated pharmacy services.</p><div class="p-6 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200"><p class="font-bold">Patient-Centric Care:</p><p class="text-sm mt-1">Our real-time token tracking guarantees you never wait in overcrowded rooms. Check your token live on waiting room screens or mobile.</p></div></div>',
            'published_html' => '<div class="py-12 px-6 max-w-4xl mx-auto space-y-6"><h1 class="text-3xl font-black text-slate-900 dark:text-white">About MedVisit Demo Medical Centre</h1><p class="text-base text-slate-600 dark:text-slate-300">MedVisit Demo Medical Centre in Jaffna is equipped with high-efficiency outpatient channeling, comprehensive family healthcare, and fully integrated pharmacy services.</p><div class="p-6 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200"><p class="font-bold">Patient-Centric Care:</p><p class="text-sm mt-1">Our real-time token tracking guarantees you never wait in overcrowded rooms. Check your token live on waiting room screens or mobile.</p></div></div>',
            'css' => '',
            'published_css' => '',
        ]);

        // 14. TV Display Pre-paired Device
        $deviceToken = 'demo-tv-display-token-key-2026';
        $deviceTokenHash = hash('sha256', $deviceToken);

        TvDevice::create([
            'tenant_id' => $tenant->id,
            'name' => 'Main Waiting Lounge TV',
            'device_token_hash' => $deviceTokenHash,
            'last_seen_at' => $now,
            'created_by' => $adminUser->id,
        ]);
    }

    /**
     * Delete previous records for the demo tenant only.
     */
    protected function cleanDemoTenant(string $tenantId): void
    {
        // Guard: only allow cleaning the configured demo tenant
        $expectedSubdomain = (string) config('demo.subdomain', 'demo');
        $tenant = Tenant::find($tenantId);

        if ($tenant && (! $tenant->is_demo || $tenant->subdomain !== $expectedSubdomain)) {
            throw new \RuntimeException("Abort! Tenant {$tenantId} is not a valid demo tenant.");
        }

        DB::table('audit_events')->where('tenant_id', $tenantId)->delete();
        DB::table('prescription_items')->where('tenant_id', $tenantId)->delete();
        DB::table('prescriptions')->where('tenant_id', $tenantId)->delete();
        DB::table('prescription_template_items')->whereIn('prescription_template_id', function ($q) use ($tenantId) {
            $q->select('id')->from('prescription_templates')->where('tenant_id', $tenantId);
        })->delete();
        DB::table('prescription_templates')->where('tenant_id', $tenantId)->delete();
        DB::table('stock_movements')->where('tenant_id', $tenantId)->delete();
        DB::table('stock_batches')->where('tenant_id', $tenantId)->delete();
        DB::table('stock_receipts')->where('tenant_id', $tenantId)->delete();
        DB::table('clinic_medicines')->where('tenant_id', $tenantId)->delete();
        DB::table('suppliers')->where('tenant_id', $tenantId)->delete();
        DB::table('bills')->where('tenant_id', $tenantId)->delete();
        DB::table('booking_tokens')->where('tenant_id', $tenantId)->delete();
        DB::table('doctor_sessions')->where('tenant_id', $tenantId)->delete();
        DB::table('doctor_settlements')->where('tenant_id', $tenantId)->delete();
        DB::table('clinic_pages')->where('tenant_id', $tenantId)->delete();
        DB::table('tv_devices')->where('tenant_id', $tenantId)->delete();
        DB::table('patients')->where('tenant_id', $tenantId)->delete();
        DB::table('doctors')->where('tenant_id', $tenantId)->delete();
    }
}
