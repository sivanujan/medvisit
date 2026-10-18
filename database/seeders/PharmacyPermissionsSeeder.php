<?php

declare(strict_types=1);

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PharmacyPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
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

        foreach ($permissions as $permissionName) {
            Permission::firstOrCreate(['name' => $permissionName, 'guard_name' => 'web']);
        }

        // Roles
        $superAdmin = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $clinicAdmin = Role::firstOrCreate(['name' => 'clinic_admin', 'guard_name' => 'web']);
        $pharmacist = Role::firstOrCreate(['name' => 'pharmacist', 'guard_name' => 'web']);
        $doctor = Role::firstOrCreate(['name' => 'doctor', 'guard_name' => 'web']);
        $receptionist = Role::firstOrCreate(['name' => 'receptionist', 'guard_name' => 'web']);

        $pharmacyPermissions = [
            'pharmacy.view',
            'pharmacy.manage_medicines',
            'pharmacy.receive_stock',
            'pharmacy.adjust_stock',
            'pharmacy.manage_suppliers',
            'pharmacy.import',
            'pharmacy.dispense',
            'prescriptions.view',
        ];

        $doctorPermissions = [
            'pharmacy.view',
            'prescriptions.create',
            'prescriptions.view',
            'prescriptions.view_history',
        ];

        $clinicAdminPermissions = [
            ...$pharmacyPermissions,
            'prescriptions.create',
            'prescriptions.view',
            'prescriptions.view_history',
            'templates.manage_shared',
        ];

        $superAdmin->givePermissionTo(Permission::all());
        $clinicAdmin->givePermissionTo($clinicAdminPermissions);
        $pharmacist->givePermissionTo($pharmacyPermissions);
        $doctor->givePermissionTo($doctorPermissions);
        $receptionist->givePermissionTo('pharmacy.view');
    }
}
