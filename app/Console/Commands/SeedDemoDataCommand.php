<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Doctor;
use App\Models\Patient;
use App\Models\SessionTemplate;
use App\Models\Tenant;
use App\Services\SessionGeneratorService;
use Illuminate\Console\Command;

class SeedDemoDataCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'medvisit:demo-data {tenant : The tenant ID or subdomain}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Seed 3 doctors with templates, generated sessions, and 10 patients for quick manual and end-to-end testing.';

    /**
     * Execute the console command.
     */
    public function handle(SessionGeneratorService $generator): int
    {
        $tenantId = (string) $this->argument('tenant');
        $tenant = Tenant::where('id', $tenantId)->orWhere('subdomain', $tenantId)->first();

        if (! $tenant) {
            $this->error("Tenant '{$tenantId}' not found.");

            return self::FAILURE;
        }

        tenancy()->initialize($tenant);

        $this->info("Seeding demo channeling data for tenant '{$tenant->id}' ({$tenant->name})...");

        // 1. Create or update 3 Doctors
        $doctorsData = [
            [
                'title' => 'Dr.',
                'name' => 'K. Sivalingam',
                'specialty' => 'Cardiologist',
                'slmc_number' => 'SLMC-18429',
                'phone' => '+94 77 123 4567',
                'email' => 'sivalingam@example.com',
                'use_clinic_default_fees' => false,
                'pricing_mode' => 'split',
                'doctor_fee' => 250000, // Rs. 2,500
                'clinic_fee' => 80000,  // Rs. 800
                'custom_doctor_fee' => 250000,
                'custom_clinic_fee' => 80000,
                'custom_total_fee' => 330000,
                'avg_consultation_minutes' => 15,
                'is_active' => true,
                'templates' => [
                    // Monday, Wednesday, Friday, Saturday
                    ['title' => 'Morning Cardiac Clinic', 'day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '12:00', 'max_patients' => 20, 'room_number' => 'Consulting Room 1'],
                    ['title' => 'Evening Cardiology Channeling', 'day_of_week' => 3, 'start_time' => '17:00', 'end_time' => '20:00', 'max_patients' => 25, 'room_number' => 'Consulting Room 1'],
                    ['title' => 'Friday Cardiac Channeling', 'day_of_week' => 5, 'start_time' => '16:00', 'end_time' => '19:00', 'max_patients' => 20, 'room_number' => 'Consulting Room 1'],
                    ['title' => 'Weekend Special Clinic', 'day_of_week' => 6, 'start_time' => '10:00', 'end_time' => '13:00', 'max_patients' => 15, 'room_number' => 'Suite A'],
                ],
            ],
            [
                'title' => 'Dr.',
                'name' => 'Priya Ramanathan',
                'specialty' => 'Paediatrician',
                'slmc_number' => 'SLMC-24108',
                'phone' => '+94 71 987 6543',
                'email' => 'priya.ramanathan@example.com',
                'use_clinic_default_fees' => false,
                'pricing_mode' => 'split',
                'doctor_fee' => 220000, // Rs. 2,200
                'clinic_fee' => 80000,  // Rs. 800
                'custom_doctor_fee' => 220000,
                'custom_clinic_fee' => 80000,
                'custom_total_fee' => 300000,
                'avg_consultation_minutes' => 12,
                'is_active' => true,
                'templates' => [
                    // Tuesday, Thursday, Saturday, Sunday
                    ['title' => 'Child Health & Immunization Clinic', 'day_of_week' => 2, 'start_time' => '16:00', 'end_time' => '19:00', 'max_patients' => 20, 'room_number' => 'Paediatric Suite'],
                    ['title' => 'Afternoon Paediatric Channeling', 'day_of_week' => 4, 'start_time' => '15:00', 'end_time' => '18:00', 'max_patients' => 20, 'room_number' => 'Paediatric Suite'],
                    ['title' => 'Saturday Paediatric Consultation', 'day_of_week' => 6, 'start_time' => '15:00', 'end_time' => '18:00', 'max_patients' => 20, 'room_number' => 'Paediatric Suite'],
                    ['title' => 'Sunday Well-Baby Clinic', 'day_of_week' => 0, 'start_time' => '09:00', 'end_time' => '12:00', 'max_patients' => 15, 'room_number' => 'Paediatric Suite'],
                ],
            ],
            [
                'title' => 'Dr.',
                'name' => 'Anura Wickramasinghe',
                'specialty' => 'General Physician',
                'slmc_number' => 'SLMC-12095',
                'phone' => '+94 76 555 4321',
                'email' => 'anura.w@example.com',
                'use_clinic_default_fees' => true,
                'pricing_mode' => 'split',
                'doctor_fee' => 180000, // Rs. 1,800
                'clinic_fee' => 70000,  // Rs. 700
                'avg_consultation_minutes' => 10,
                'is_active' => true,
                'templates' => [
                    // Monday to Friday every weekday evening
                    ['title' => 'Daily Evening Channeling', 'day_of_week' => 1, 'start_time' => '17:30', 'end_time' => '20:30', 'max_patients' => 30, 'room_number' => 'Room 3'],
                    ['title' => 'Daily Evening Channeling', 'day_of_week' => 2, 'start_time' => '17:30', 'end_time' => '20:30', 'max_patients' => 30, 'room_number' => 'Room 3'],
                    ['title' => 'Daily Evening Channeling', 'day_of_week' => 3, 'start_time' => '17:30', 'end_time' => '20:30', 'max_patients' => 30, 'room_number' => 'Room 3'],
                    ['title' => 'Daily Evening Channeling', 'day_of_week' => 4, 'start_time' => '17:30', 'end_time' => '20:30', 'max_patients' => 30, 'room_number' => 'Room 3'],
                    ['title' => 'Daily Evening Channeling', 'day_of_week' => 5, 'start_time' => '17:30', 'end_time' => '20:30', 'max_patients' => 30, 'room_number' => 'Room 3'],
                ],
            ],
        ];

        foreach ($doctorsData as $dData) {
            $templatesData = $dData['templates'];
            unset($dData['templates']);

            $doctor = Doctor::updateOrCreate(
                ['tenant_id' => $tenant->id, 'slmc_number' => $dData['slmc_number']],
                array_merge($dData, ['tenant_id' => $tenant->id])
            );

            foreach ($templatesData as $t) {
                SessionTemplate::firstOrCreate(
                    [
                        'tenant_id' => $tenant->id,
                        'doctor_id' => $doctor->id,
                        'day_of_week' => $t['day_of_week'],
                        'start_time' => $t['start_time'],
                    ],
                    [
                        'title' => $t['title'],
                        'end_time' => $t['end_time'],
                        'max_patients' => $t['max_patients'],
                        'room_number' => $t['room_number'],
                        'mode' => 'token',
                        'doctor_fee' => $doctor->doctor_fee,
                        'clinic_fee' => $doctor->clinic_fee,
                        'fee_override_type' => 'inherit',
                        'is_active' => true,
                    ]
                );
            }
        }

        // 2. Generate concrete sessions for the next 30 days
        $sessionCount = $generator->generateForTenant($tenant, 30);
        $this->info("Created/verified 3 doctors and generated {$sessionCount} session(s) across the next 30 days.");

        // 3. Seed 10 sample Patients
        $samplePatients = [
            ['name' => 'Sunil Perera', 'phone' => '+94 77 111 2233', 'nic' => '198512345678', 'gender' => 'male', 'city' => 'Colombo 03'],
            ['name' => 'Kamal Jayawardena', 'phone' => '+94 71 222 3344', 'nic' => '199023456789', 'gender' => 'male', 'city' => 'Nugegoda'],
            ['name' => 'Nirmala Fernando', 'phone' => '+94 76 333 4455', 'nic' => '197834567890', 'gender' => 'female', 'city' => 'Dehiwala'],
            ['name' => 'Mohamed Rizwan', 'phone' => '+94 75 444 5566', 'nic' => '199245678901', 'gender' => 'male', 'city' => 'Colombo 06'],
            ['name' => 'Fatima Shamla', 'phone' => '+94 77 555 6677', 'nic' => '198856789012', 'gender' => 'female', 'city' => 'Mount Lavinia'],
            ['name' => 'Tharindu Silva', 'phone' => '+94 70 666 7788', 'nic' => '199567890123', 'gender' => 'male', 'city' => 'Kotte'],
            ['name' => 'Anoma Gunasekara', 'phone' => '+94 78 777 8899', 'nic' => '196778901234', 'gender' => 'female', 'city' => 'Battaramulla'],
            ['name' => 'Ravi Chandran', 'phone' => '+94 77 888 9900', 'nic' => '198289012345', 'gender' => 'male', 'city' => 'Wellawatte'],
            ['name' => 'Dilini Bandara', 'phone' => '+94 71 999 0011', 'nic' => '199890123456', 'gender' => 'female', 'city' => 'Moratuwa'],
            ['name' => 'Sujith Weerasinghe', 'phone' => '+94 76 000 1122', 'nic' => '197501234567', 'gender' => 'male', 'city' => 'Rajagiriya'],
        ];

        $patientCount = 0;
        foreach ($samplePatients as $p) {
            Patient::firstOrCreate(
                ['tenant_id' => $tenant->id, 'phone' => $p['phone']],
                array_merge($p, ['tenant_id' => $tenant->id])
            );
            $patientCount++;
        }

        $this->info("Seeded {$patientCount} patient(s).");
        $this->info("Demo data setup completed successfully for tenant '{$tenant->id}'.");

        tenancy()->end();

        return self::SUCCESS;
    }
}
