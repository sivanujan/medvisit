<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Doctor;
use App\Models\PrescriptionTemplate;
use App\Models\Tenant;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DemoPrescriptionTemplatesSeeder extends Seeder
{
    /**
     * Run the demo template seeder.
     * All templates are clearly prefixed with [Demo] and can be safely wiped.
     */
    public function run(): void
    {
        $tenant = Tenant::first() ?? Tenant::create([
            'id' => 'sivacli',
            'name' => 'Sivaclinq Care',
            'subdomain' => 'sivacli',
        ]);

        $doctorUser = User::where('tenant_id', $tenant->id)->first() ?? User::factory()->create([
            'tenant_id' => $tenant->id,
            'name' => 'Dr. Thanarasan Sivanujan',
            'email' => 'thanarasansivanujan@gmail.com',
        ]);

        $doctor = Doctor::where('tenant_id', $tenant->id)->first() ?? Doctor::create([
            'tenant_id' => $tenant->id,
            'user_id' => $doctorUser->id,
            'title' => 'Dr.',
            'name' => 'Thanarasan Sivanujan',
            'specialty' => 'Consultant Physician',
            'slmc_number' => 'SLMC-99881',
            'doctor_fee' => 150000,
            'clinic_fee' => 50000,
            'avg_consultation_minutes' => 10,
            'is_active' => true,
        ]);

        // Clean out existing [Demo] templates for this tenant to allow clean re-seeding
        PrescriptionTemplate::where('tenant_id', $tenant->id)
            ->where('name', 'LIKE', '[Demo]%')
            ->delete();

        // 1. [Demo] Acid Reflux & Gastritis Regimen
        $t1 = PrescriptionTemplate::create([
            'tenant_id' => $tenant->id,
            'doctor_id' => null, // Shared
            'name' => '[Demo] Acid Reflux & Gastritis Regimen',
            'description' => 'Standard dual therapy for uncomplicated acute gastritis and GERD symptoms. Avoid spicy foods and coffee.',
            'condition_tags' => ['Gastritis', 'Dyspepsia', 'GERD'],
            'is_shared' => true,
            'usage_count' => 48,
            'last_used_at' => Carbon::now('Asia/Colombo')->subHours(3),
            'created_by' => $doctorUser->id,
        ]);

        $t1->items()->createMany([
            [
                'tenant_id' => $tenant->id,
                'display_name' => 'Omeprazole 20 mg Capsule',
                'generic_name' => 'Omeprazole',
                'strength_text' => '20 mg',
                'dosage_form' => 'Capsule',
                'brand_name' => 'Omez',
                'source' => 'clinic',
                'dose_amount' => 1.0,
                'dose_unit' => 'capsule',
                'dose_display' => '1',
                'frequency' => 'twice_daily',
                'frequency_text' => 'Twice daily',
                'timing' => 'before_meals',
                'route' => 'oral',
                'duration_days' => 14,
                'quantity' => 28,
                'instructions' => 'Take 30 minutes before breakfast and dinner',
                'sort_order' => 0,
            ],
            [
                'tenant_id' => $tenant->id,
                'display_name' => 'Domperidone 10 mg Tablet',
                'generic_name' => 'Domperidone',
                'strength_text' => '10 mg',
                'dosage_form' => 'Tablet',
                'brand_name' => 'Motilium',
                'source' => 'clinic',
                'dose_amount' => 1.0,
                'dose_unit' => 'tablet',
                'dose_display' => '1',
                'frequency' => 'thrice_daily',
                'frequency_text' => '3 times daily',
                'timing' => 'before_meals',
                'route' => 'oral',
                'duration_days' => 7,
                'quantity' => 21,
                'instructions' => 'Take before meals for nausea and bloating',
                'sort_order' => 1,
            ],
            [
                'tenant_id' => $tenant->id,
                'display_name' => 'Antacid Suspension 200 ml',
                'generic_name' => 'Aluminium & Magnesium Hydroxide',
                'strength_text' => '200 ml',
                'dosage_form' => 'Suspension',
                'brand_name' => 'Mucaine',
                'source' => 'clinic',
                'dose_amount' => 10.0,
                'dose_unit' => 'ml',
                'dose_display' => '10 ml',
                'frequency' => 'sos',
                'frequency_text' => 'When needed (SOS)',
                'timing' => 'after_meals',
                'route' => 'oral',
                'duration_days' => 5,
                'quantity' => 1,
                'instructions' => 'Take 10ml as needed for breakthrough burning sensation',
                'sort_order' => 2,
            ],
        ]);

        // 2. [Demo] Oral Rehydration & Zinc Regimen
        $t2 = PrescriptionTemplate::create([
            'tenant_id' => $tenant->id,
            'doctor_id' => null, // Shared
            'name' => '[Demo] Oral Rehydration & Zinc Regimen',
            'description' => 'Acute gastroenteritis fluid maintenance and gut barrier support. Drink plenty of clean boiled water.',
            'condition_tags' => ['Dehydration', 'Diarrhea', 'Pediatric Care'],
            'is_shared' => true,
            'usage_count' => 32,
            'last_used_at' => Carbon::now('Asia/Colombo')->subDays(1),
            'created_by' => $doctorUser->id,
        ]);

        $t2->items()->createMany([
            [
                'tenant_id' => $tenant->id,
                'display_name' => 'Oral Rehydration Salts (ORS) Sachet',
                'generic_name' => 'Electrolyte Powder',
                'strength_text' => '20.5 g',
                'dosage_form' => 'Powder',
                'brand_name' => 'Jeevani',
                'source' => 'clinic',
                'dose_amount' => 1.0,
                'dose_unit' => 'sachet',
                'dose_display' => '1 sachet',
                'frequency' => 'sos',
                'frequency_text' => 'When needed (SOS)',
                'timing' => 'any_time',
                'route' => 'oral',
                'duration_days' => 3,
                'quantity' => 6,
                'instructions' => 'Dissolve 1 sachet in 1 liter of boiled cooled water. Sip continuously.',
                'sort_order' => 0,
            ],
            [
                'tenant_id' => $tenant->id,
                'display_name' => 'Zinc Sulfate 20 mg Dispersible Tablet',
                'generic_name' => 'Zinc Sulfate',
                'strength_text' => '20 mg',
                'dosage_form' => 'Tablet',
                'brand_name' => 'Zinconia',
                'source' => 'clinic',
                'dose_amount' => 1.0,
                'dose_unit' => 'tablet',
                'dose_display' => '1',
                'frequency' => 'once_daily',
                'frequency_text' => 'Once daily',
                'timing' => 'after_meals',
                'route' => 'oral',
                'duration_days' => 14,
                'quantity' => 14,
                'instructions' => 'Complete the full 14 days course even after symptoms resolve.',
                'sort_order' => 1,
            ],
        ]);

        // 3. [Demo] Simple Analgesic & Antipyretic
        $t3 = PrescriptionTemplate::create([
            'tenant_id' => $tenant->id,
            'doctor_id' => $doctor->id, // Personal
            'name' => '[Demo] Simple Analgesic & Antipyretic',
            'description' => 'For acute mild-to-moderate pyrexia and headache relief. Maintain oral hydration.',
            'condition_tags' => ['Fever', 'Pain Relief', 'Headache'],
            'is_shared' => false,
            'usage_count' => 15,
            'last_used_at' => Carbon::now('Asia/Colombo')->subDays(4),
            'created_by' => $doctorUser->id,
        ]);

        $t3->items()->createMany([
            [
                'tenant_id' => $tenant->id,
                'display_name' => 'Paracetamol 500 mg Tablet',
                'generic_name' => 'Paracetamol',
                'strength_text' => '500 mg',
                'dosage_form' => 'Tablet',
                'brand_name' => 'Panadol',
                'source' => 'clinic',
                'dose_amount' => 2.0,
                'dose_unit' => 'tablet',
                'dose_display' => '2',
                'frequency' => 'every_6_hours',
                'frequency_text' => 'Every 6 hours',
                'timing' => 'after_meals',
                'route' => 'oral',
                'duration_days' => 3,
                'quantity' => 24,
                'instructions' => 'Do not exceed 8 tablets in 24 hours. Drink warm fluids.',
                'sort_order' => 0,
            ],
            [
                'tenant_id' => $tenant->id,
                'display_name' => 'Vitamin C 500 mg Chewable Tablet',
                'generic_name' => 'Ascorbic Acid',
                'strength_text' => '500 mg',
                'dosage_form' => 'Tablet',
                'brand_name' => 'Celin',
                'source' => 'clinic',
                'dose_amount' => 1.0,
                'dose_unit' => 'tablet',
                'dose_display' => '1',
                'frequency' => 'once_daily',
                'frequency_text' => 'Once daily',
                'timing' => 'after_meals',
                'route' => 'oral',
                'duration_days' => 10,
                'quantity' => 10,
                'instructions' => 'Chew or dissolve in mouth once daily.',
                'sort_order' => 1,
            ],
        ]);

        // 4. [Demo] Allergic Rhinitis & Cold Regimen
        $t4 = PrescriptionTemplate::create([
            'tenant_id' => $tenant->id,
            'doctor_id' => $doctor->id, // Personal
            'name' => '[Demo] Allergic Rhinitis & Cold Regimen',
            'description' => 'For seasonal allergic symptoms, sneezing, rhinorrhea, and nasal congestion.',
            'condition_tags' => ['Allergies', 'Cold', 'Rhinitis'],
            'is_shared' => false,
            'usage_count' => 9,
            'last_used_at' => Carbon::now('Asia/Colombo')->subDays(8),
            'created_by' => $doctorUser->id,
        ]);

        $t4->items()->createMany([
            [
                'tenant_id' => $tenant->id,
                'display_name' => 'Cetirizine 10 mg Tablet',
                'generic_name' => 'Cetirizine Hydrochloride',
                'strength_text' => '10 mg',
                'dosage_form' => 'Tablet',
                'brand_name' => 'Zyrtec',
                'source' => 'clinic',
                'dose_amount' => 1.0,
                'dose_unit' => 'tablet',
                'dose_display' => '1',
                'frequency' => 'once_daily',
                'frequency_text' => 'Once daily (at night)',
                'timing' => 'bedtime',
                'route' => 'oral',
                'duration_days' => 7,
                'quantity' => 7,
                'instructions' => 'May cause mild drowsiness; take at bedtime.',
                'sort_order' => 0,
            ],
            [
                'tenant_id' => $tenant->id,
                'display_name' => 'Normal Saline Nasal Spray 15 ml',
                'generic_name' => 'Sodium Chloride 0.65%',
                'strength_text' => '15 ml',
                'dosage_form' => 'Spray',
                'brand_name' => 'Salinex',
                'source' => 'clinic',
                'dose_amount' => 2.0,
                'dose_unit' => 'spray',
                'dose_display' => '2 sprays',
                'frequency' => 'twice_daily',
                'frequency_text' => 'Twice daily',
                'timing' => 'any_time',
                'route' => 'inhalation',
                'duration_days' => 5,
                'quantity' => 1,
                'instructions' => 'Spray 2 puffs into each nostril morning and night.',
                'sort_order' => 1,
            ],
        ]);
    }
}
