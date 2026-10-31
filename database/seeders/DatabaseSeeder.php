<?php

namespace Database\Seeders;

use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Roles (Required in all environments)
        $superAdminRole = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $clinicAdminRole = Role::firstOrCreate(['name' => 'clinic_admin', 'guard_name' => 'web']);
        $doctorRole = Role::firstOrCreate(['name' => 'doctor', 'guard_name' => 'web']);
        $receptionistRole = Role::firstOrCreate(['name' => 'receptionist', 'guard_name' => 'web']);

        $this->call(PlanMatrixSeeder::class);

        // Demo / Development accounts must NEVER be created in production environments
        if (app()->environment('production')) {
            return;
        }

        // 2. Demo Tenant
        $demoTenant = Tenant::firstOrCreate(
            ['id' => 'demo'],
            [
                'name' => 'Demo Healthcare Clinic',
                'subdomain' => 'demo',
                'phone' => '+94 11 234 5678',
                'address' => '123 Galle Road, Colombo 03, Sri Lanka',
                'plan' => 'standard',
                'status' => 'active',
                'trial_ends_at' => now()->addDays(30),
            ]
        );

        // Map subdomains for Stancl Tenancy
        $baseDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        if (! $demoTenant->domains()->where('domain', 'demo')->exists()) {
            $demoTenant->domains()->create(['domain' => 'demo']);
        }
        if (! $demoTenant->domains()->where('domain', "demo.{$baseDomain}")->exists()) {
            $demoTenant->domains()->create(['domain' => "demo.{$baseDomain}"]);
        }

        // 3. Clinic Admin User (scoped to demo tenant)
        $clinicAdmin = User::firstOrCreate(
            ['email' => 'clinicadmin@medvisit.test'],
            [
                'tenant_id' => $demoTenant->id,
                'name' => 'Demo Clinic Admin',
                'password' => Hash::make('Password123!'),
                'email_verified_at' => now(),
            ]
        );
        $clinicAdmin->syncRoles([$clinicAdminRole]);

        // 4. Doctor User & Profile
        $doctorUser = User::firstOrCreate(
            ['email' => 'doctor@medvisit.test'],
            [
                'tenant_id' => $demoTenant->id,
                'name' => 'Dr. Rohantha Senanayake',
                'password' => Hash::make('Password123!'),
                'email_verified_at' => now(),
            ]
        );
        $doctorUser->syncRoles([$doctorRole]);

        $doctor1 = Doctor::firstOrCreate(
            ['tenant_id' => $demoTenant->id, 'slmc_number' => 'SLMC-28491'],
            [
                'user_id' => $doctorUser->id,
                'name' => 'Dr. Rohantha Senanayake',
                'title' => 'Dr.',
                'specialty' => 'Consultant Cardiologist',
                'phone' => '+94 77 234 5678',
                'email' => 'doctor@medvisit.test',
                'doctor_fee' => 250000, // Rs. 2,500.00
                'clinic_fee' => 60000,  // Rs. 600.00
                'avg_consultation_minutes' => 12,
                'is_active' => true,
            ]
        );

        $doctor2 = Doctor::firstOrCreate(
            ['tenant_id' => $demoTenant->id, 'slmc_number' => 'SLMC-31820'],
            [
                'name' => 'Dr. Anoma Wijesinghe',
                'title' => 'Dr.',
                'specialty' => 'Pediatrician',
                'phone' => '+94 71 876 5432',
                'email' => 'anoma@pediatrics.lk',
                'doctor_fee' => 200000, // Rs. 2,000.00
                'clinic_fee' => 50000,  // Rs. 500.00
                'avg_consultation_minutes' => 10,
                'is_active' => true,
            ]
        );

        // 5. Receptionist User
        $receptionist = User::firstOrCreate(
            ['email' => 'receptionist@medvisit.test'],
            [
                'tenant_id' => $demoTenant->id,
                'name' => 'Kumari Dissanayake',
                'password' => Hash::make('Password123!'),
                'email_verified_at' => now(),
            ]
        );
        $receptionist->syncRoles([$receptionistRole]);

        // 6. Central Super Admin User (tenant_id = null)
        $superAdmin = User::firstOrCreate(
            ['email' => 'superadmin@medvisit.test'],
            [
                'tenant_id' => null,
                'name' => 'Super Admin',
                'password' => Hash::make('Password123!'),
                'email_verified_at' => now(),
            ]
        );
        $superAdmin->syncRoles([$superAdminRole]);

        // 7. Today's Channeling Session
        $todaySession = DoctorSession::firstOrCreate(
            [
                'tenant_id' => $demoTenant->id,
                'doctor_id' => $doctor1->id,
                'session_date' => now()->toDateString(),
            ],
            [
                'start_time' => '08:30:00',
                'end_time' => '11:30:00',
                'max_tokens' => 25,
                'mode' => 'token',
                'status' => 'in_progress',
                'room_number' => 'Room 02',
                'doctor_fee' => $doctor1->doctor_fee,
                'clinic_fee' => $doctor1->clinic_fee,
                'current_token_number' => 3,
            ]
        );

        // 8. Sample Patients & Tokens
        $patientsData = [
            ['name' => 'Kamal Perera', 'phone' => '+94 77 123 4567', 'nic' => '198512304910', 'city' => 'Colombo 03'],
            ['name' => 'Chandrani Silva', 'phone' => '+94 71 234 5678', 'nic' => '199056701234', 'city' => 'Dehiwala'],
            ['name' => 'Sunil Jayasinghe', 'phone' => '+94 76 345 6789', 'nic' => '197823405678', 'city' => 'Mount Lavinia'],
            ['name' => 'Fathima Rizvi', 'phone' => '+94 77 456 7890', 'nic' => '199578901234', 'city' => 'Wellawatte'],
            ['name' => 'Niroshan Bandara', 'phone' => '+94 72 567 8901', 'nic' => '198834506789', 'city' => 'Nugegoda'],
        ];

        $tokenStatuses = [
            BookingToken::STATUS_COMPLETED,
            BookingToken::STATUS_IN_CONSULTATION,
            BookingToken::STATUS_CALLED,
            BookingToken::STATUS_CHECKED_IN,
            BookingToken::STATUS_BOOKED,
        ];

        foreach ($patientsData as $idx => $pData) {
            $patient = Patient::firstOrCreate(
                ['tenant_id' => $demoTenant->id, 'phone' => $pData['phone']],
                [
                    'name' => $pData['name'],
                    'nic' => $pData['nic'],
                    'district' => 'Colombo',
                    'city' => $pData['city'],
                ]
            );

            $tokenNumber = $idx + 1;
            $token = BookingToken::firstOrCreate(
                ['doctor_session_id' => $todaySession->id, 'token_number' => $tokenNumber],
                [
                    'tenant_id' => $demoTenant->id,
                    'patient_id' => $patient->id,
                    'status' => $tokenStatuses[$idx] ?? BookingToken::STATUS_BOOKED,
                    'estimated_time' => $todaySession->calculateEstimatedTime($tokenNumber),
                    'booked_via' => $idx % 2 === 0 ? 'reception' : 'online',
                    'signed_cancel_token' => Str::random(40),
                ]
            );

            // Record Bill for checked-in or completed tokens
            if (in_array($token->status, [BookingToken::STATUS_COMPLETED, BookingToken::STATUS_IN_CONSULTATION, BookingToken::STATUS_CALLED])) {
                Bill::firstOrCreate(
                    ['tenant_id' => $demoTenant->id, 'booking_token_id' => $token->id],
                    [
                        'patient_id' => $patient->id,
                        'doctor_id' => $doctor1->id,
                        'receipt_number' => sprintf('DEMO-%06d', $tokenNumber + 100),
                        'doctor_fee' => $todaySession->doctor_fee,
                        'clinic_fee' => $todaySession->clinic_fee,
                        'other_fee' => 0,
                        'discount' => 0,
                        'total_amount' => $todaySession->doctor_fee + $todaySession->clinic_fee,
                        'payment_method' => $idx === 0 ? 'card' : 'cash',
                        'payment_status' => 'paid',
                    ]
                );
            }
        }
    }
}
