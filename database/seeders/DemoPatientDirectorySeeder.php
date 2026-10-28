<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Bill;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Patient;
use App\Models\Tenant;
use App\Services\SequenceService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DemoPatientDirectorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tenant = Tenant::find('sivacli') ?: Tenant::first();
        if (! $tenant) {
            return;
        }

        $tenantId = $tenant->id;
        $doctors = Doctor::where('tenant_id', $tenantId)->get();
        if ($doctors->isEmpty()) {
            return;
        }

        $names = [
            ['name' => 'Kavindu Senanayake', 'gender' => 'male', 'district' => 'Colombo', 'city' => 'Battaramulla', 'dob' => '1989-05-14'],
            ['name' => 'Nadeesha Wickramasinghe', 'gender' => 'female', 'district' => 'Colombo', 'city' => 'Nugegoda', 'dob' => '1995-11-20'],
            ['name' => 'Mohamed Rizwan', 'gender' => 'male', 'district' => 'Colombo', 'city' => 'Dehiwala', 'dob' => '1982-03-12'],
            ['name' => 'Tharushi Perera', 'gender' => 'female', 'district' => 'Gampaha', 'city' => 'Negombo', 'dob' => '2001-08-04'],
            ['name' => 'Dinesh Kumara', 'gender' => 'male', 'district' => 'Kandy', 'city' => 'Peradeniya', 'dob' => '1976-12-28'],
            ['name' => 'Sachini Fernando', 'gender' => 'female', 'district' => 'Kalutara', 'city' => 'Panadura', 'dob' => '1998-07-19'],
            ['name' => 'Sivaguru Tharmalingam', 'gender' => 'male', 'district' => 'Jaffna', 'city' => 'Nallur', 'dob' => '1965-02-15'],
            ['name' => 'Priyani Jayasuriya', 'gender' => 'female', 'district' => 'Galle', 'city' => 'Karapitiya', 'dob' => '1970-09-30'],
            ['name' => 'Chamara Abeyratne', 'gender' => 'male', 'district' => 'Kurunegala', 'city' => 'Kurunegala', 'dob' => '1985-04-22'],
            ['name' => 'Fathima Nusra', 'gender' => 'female', 'district' => 'Kandy', 'city' => 'Katugastota', 'dob' => '1992-10-10'],
            ['name' => 'Lakshan Silva', 'gender' => 'male', 'district' => 'Colombo', 'city' => 'Moratuwa', 'dob' => '1990-06-15'],
            ['name' => 'Anoma Rathnayake', 'gender' => 'female', 'district' => 'Badulla', 'city' => 'Bandarawela', 'dob' => '1968-01-25'],
            ['name' => 'Ruwan Bandara', 'gender' => 'male', 'district' => 'Matale', 'city' => 'Dambulla', 'dob' => '1984-09-18'],
            ['name' => 'Sanduni Dissanayake', 'gender' => 'female', 'district' => 'Anuradhapura', 'city' => 'Anuradhapura', 'dob' => '1999-03-08'],
            ['name' => 'Kasun Mendis', 'gender' => 'male', 'district' => 'Galle', 'city' => 'Hikkaduwa', 'dob' => '1993-12-05'],
            ['name' => 'Ayesha Farook', 'gender' => 'female', 'district' => 'Colombo', 'city' => 'Borella', 'dob' => '1988-07-14'],
            ['name' => 'Nuwan Pradeep', 'gender' => 'male', 'district' => 'Gampaha', 'city' => 'Kelaniya', 'dob' => '1979-11-02'],
            ['name' => 'Dilhani Gunasekara', 'gender' => 'female', 'district' => 'Ratnapura', 'city' => 'Ratnapura', 'dob' => '1986-05-29'],
            ['name' => 'Gayan Karunaratne', 'gender' => 'male', 'district' => 'Colombo', 'city' => 'Maharagama', 'dob' => '1991-04-17'],
            ['name' => 'Uthpala Samarasinghe', 'gender' => 'female', 'district' => 'Kalutara', 'city' => 'Horana', 'dob' => '2005-02-11'],
            ['name' => 'Arumugam Rasiah', 'gender' => 'male', 'district' => 'Jaffna', 'city' => 'Chavakachcheri', 'dob' => '1958-08-20'],
            ['name' => 'Menaka Subasinghe', 'gender' => 'female', 'district' => 'Gampaha', 'city' => 'Kadawatha', 'dob' => '1994-06-30'],
            ['name' => 'Janaka Weerasinghe', 'gender' => 'male', 'district' => 'Colombo', 'city' => 'Kottawa', 'dob' => '1975-03-24'],
            ['name' => 'Rashmi Alwis', 'gender' => 'female', 'district' => 'Matara', 'city' => 'Matara', 'dob' => '1997-12-12'],
            ['name' => 'Mohomed Aslam', 'gender' => 'male', 'district' => 'Batticaloa', 'city' => 'Kattankudy', 'dob' => '1981-10-05'],
            ['name' => 'Harshani Gamage', 'gender' => 'female', 'district' => 'Hambantota', 'city' => 'Tangalle', 'dob' => '2000-09-16'],
            ['name' => 'Prabath Jayalath', 'gender' => 'male', 'district' => 'Kegalle', 'city' => 'Mawanella', 'dob' => '1987-01-09'],
            ['name' => 'Inoka Senaviratne', 'gender' => 'female', 'district' => 'Kandy', 'city' => 'Gampola', 'dob' => '1972-04-18'],
            ['name' => 'Sanjaya Liyanage', 'gender' => 'male', 'district' => 'Colombo', 'city' => 'Malabe', 'dob' => '1996-08-23'],
            ['name' => 'Nirosha Balasuriya', 'gender' => 'female', 'district' => 'Kurunegala', 'city' => 'Kuliyapitiya', 'dob' => '1983-05-15'],
            ['name' => 'Rohan De Silva', 'gender' => 'male', 'district' => 'Colombo', 'city' => 'Colombo 07', 'dob' => '1962-11-19'],
            ['name' => 'Shanthi Kulatunga', 'gender' => 'female', 'district' => 'Matale', 'city' => 'Matale', 'dob' => '1955-07-27'],
            ['name' => 'Ashen Warnakulasuriya', 'gender' => 'male', 'district' => 'Puttalam', 'city' => 'Chilaw', 'dob' => '2008-01-30'],
            ['name' => 'Malini Fonseka', 'gender' => 'female', 'district' => 'Gampaha', 'city' => 'Gampaha', 'dob' => '1978-02-14'],
            ['name' => 'Vigneshwaran Pillai', 'gender' => 'male', 'district' => 'Nuwara Eliya', 'city' => 'Hatton', 'dob' => '1973-10-09'],
            ['name' => 'Thilini Wijesekara', 'gender' => 'female', 'district' => 'Colombo', 'city' => 'Kaduwela', 'dob' => '2002-11-04'],
            ['name' => 'Mahesh Edirisinghe', 'gender' => 'male', 'district' => 'Monaragala', 'city' => 'Wellawaya', 'dob' => '1980-06-21'],
            ['name' => 'Pooja Sellathurai', 'gender' => 'female', 'district' => 'Vavuniya', 'city' => 'Vavuniya', 'dob' => '1993-04-03'],
            ['name' => 'Sunil Shantha', 'gender' => 'male', 'district' => 'Colombo', 'city' => 'Homagama', 'dob' => '1969-12-08'],
            ['name' => 'Kushani Hettiarachchi', 'gender' => 'female', 'district' => 'Polonnaruwa', 'city' => 'Kaduruwela', 'dob' => '1991-09-29'],
            ['name' => 'Buddhika Ranasinghe', 'gender' => 'male', 'district' => 'Galle', 'city' => 'Ambalangoda', 'dob' => '1985-08-11'],
            ['name' => 'Sithara Nawalage', 'gender' => 'female', 'district' => 'Colombo', 'city' => 'Piliyandala', 'dob' => '1998-01-19'],
            ['name' => 'Chinthaka Attanayake', 'gender' => 'male', 'district' => 'Kandy', 'city' => 'Pilimathalawa', 'dob' => '1977-03-31'],
            ['name' => 'Gayani Jayamaha', 'gender' => 'female', 'district' => 'Gampaha', 'city' => 'Wattala', 'dob' => '1984-10-26'],
            ['name' => 'Sarath Kumara', 'gender' => 'male', 'district' => 'Trincomalee', 'city' => 'Trincomalee', 'dob' => '1967-05-02'],
            ['name' => 'Devika Mallawarachchi', 'gender' => 'female', 'district' => 'Colombo', 'city' => 'Rajagiriya', 'dob' => '1974-08-14'],
            ['name' => 'Ashan Madushanka', 'gender' => 'male', 'district' => 'Matara', 'city' => 'Weligama', 'dob' => '2004-06-18'],
            ['name' => 'Surangi Peiris', 'gender' => 'female', 'district' => 'Kalutara', 'city' => 'Beruwala', 'dob' => '1989-12-01'],
            ['name' => 'Ravi Shankar', 'gender' => 'male', 'district' => 'Jaffna', 'city' => 'Point Pedro', 'dob' => '1983-07-22'],
            ['name' => 'Niluka Sandamali', 'gender' => 'female', 'district' => 'Ratnapura', 'city' => 'Balangoda', 'dob' => '1995-04-10'],
            ['name' => 'Isuru Udana', 'gender' => 'male', 'district' => 'Gampaha', 'city' => 'Ja-Ela', 'dob' => '1992-02-17'],
            ['name' => 'Nirasha Maduwanthi', 'gender' => 'female', 'district' => 'Kurunegala', 'city' => 'Wariyapola', 'dob' => '1999-10-15'],
            ['name' => 'Chandana Amarasinghe', 'gender' => 'male', 'district' => 'Colombo', 'city' => 'Kollupitiya', 'dob' => '1964-09-07'],
            ['name' => 'Amali Wickramatunga', 'gender' => 'female', 'district' => 'Kandy', 'city' => 'Kundasale', 'dob' => '1990-05-23'],
            ['name' => 'Yohan Bhashitha', 'gender' => 'male', 'district' => 'Hambantota', 'city' => 'Beliatta', 'dob' => '2006-03-14'],
            ['name' => 'Hasini Bogahawatta', 'gender' => 'female', 'district' => 'Badulla', 'city' => 'Badulla', 'dob' => '1988-11-11'],
            ['name' => 'Kamal Wijeratne', 'gender' => 'male', 'district' => 'Ampara', 'city' => 'Ampara', 'dob' => '1971-06-06'],
            ['name' => 'Subhashini Ekanayake', 'gender' => 'female', 'district' => 'Anuradhapura', 'city' => 'Medawachchiya', 'dob' => '1982-01-28'],
            // Intentional duplicates to demonstrate duplicate detection
            ['name' => 'Kavindu Senanayake', 'gender' => 'male', 'district' => 'Colombo', 'city' => 'Battaramulla', 'dob' => '1989-05-14', 'duplicate_of_first' => true],
            ['name' => 'Nadeesha W.', 'gender' => 'female', 'district' => 'Colombo', 'city' => '', 'dob' => '1995-11-20', 'duplicate_nic_of_second' => true],
        ];

        $today = Carbon::today('Asia/Colombo');
        $session = DoctorSession::where('tenant_id', $tenantId)->first();

        $nextTokenNumber = $session ? (int) (BookingToken::where('doctor_session_id', $session->id)->max('token_number') ?? 0) : 0;

        foreach ($names as $idx => $item) {
            $phoneNum = '07'.(($idx % 8) + 1).str_pad((string) (1000000 + $idx * 137), 7, '0', STR_PAD_LEFT);
            $nic = (1960 + ($idx % 40)).str_pad((string) (1000000 + $idx * 29), 8, '0', STR_PAD_LEFT);

            if (! empty($item['duplicate_of_first'])) {
                // Same normalized phone and name as first patient
                $phoneNum = '0711000000';
            } elseif (! empty($item['duplicate_nic_of_second'])) {
                // Same NIC as second patient
                $nic = '196110000290';
            } elseif ($idx === 0) {
                $phoneNum = '0711000000';
            } elseif ($idx === 1) {
                $nic = '196110000290';
            }

            $normalized = Patient::normalizePhone($phoneNum);

            $patient = Patient::create([
                'tenant_id' => $tenantId,
                'name' => $item['name'],
                'phone' => $phoneNum,
                'phone_normalized' => $normalized,
                'nic' => $nic,
                'email' => strtolower(str_replace(' ', '.', $item['name'])).'@example.lk',
                'gender' => $item['gender'],
                'date_of_birth' => $item['dob'],
                'district' => $item['district'],
                'city' => $item['city'],
                'address' => $item['city'] ? "No. {$idx}, Main Street, {$item['city']}" : "No. {$idx}, Station Road",
                'allergies' => $idx % 4 === 0 ? 'Penicillin, Sulfa drugs' : ($idx % 7 === 0 ? 'Aspirin' : null),
                'notes' => $idx % 5 === 0 ? 'Hypertension on regular medication' : null,
                'emergency_contact_name' => 'Family Contact',
                'emergency_contact_phone' => '0779998888',
                'created_at' => $today->copy()->subDays($idx * 2),
            ]);

            // Add visit tokens and bills for some patients
            if ($session && $idx % 2 === 0) {
                $nextTokenNumber++;
                $docFee = (int) ($session->doctor?->doctor_fee ?? 250000);
                $clinicFee = (int) ($session->doctor?->clinic_fee ?? 80000);
                $totalFee = $docFee + $clinicFee;

                $token = BookingToken::create([
                    'tenant_id' => $tenantId,
                    'doctor_session_id' => $session->id,
                    'patient_id' => $patient->id,
                    'token_number' => $nextTokenNumber,
                    'status' => $idx % 6 === 0 ? 'completed' : ($idx % 4 === 0 ? 'booked' : 'checked_in'),
                    'fee_snapshot' => [
                        'doctor_fee' => $docFee,
                        'clinic_fee' => $clinicFee,
                        'total_fee' => $totalFee,
                    ],
                    'booked_via' => 'reception',
                    'created_at' => $today->copy()->subDays($idx % 10),
                ]);

                $receiptNum = app(SequenceService::class)->nextReceiptNumber($tenantId);

                Bill::create([
                    'tenant_id' => $tenantId,
                    'patient_id' => $patient->id,
                    'doctor_id' => $session->doctor_id,
                    'booking_token_id' => $token->id,
                    'receipt_number' => $receiptNum,
                    'doctor_fee' => $docFee,
                    'clinic_fee' => $clinicFee,
                    'total_amount' => $totalFee,
                    'payment_status' => 'paid',
                    'payment_method' => $idx % 4 === 0 ? 'card' : ($idx % 6 === 0 ? 'bank_transfer' : 'cash'),
                    'created_at' => $token->created_at,
                ]);
            }
        }
    }
}
