<?php

namespace Database\Seeders;

use App\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Roles
        $superAdminRole = Role::firstOrCreate(['name' => 'super_admin', 'guard_name' => 'web']);
        $clinicAdminRole = Role::firstOrCreate(['name' => 'clinic_admin', 'guard_name' => 'web']);
        $doctorRole = Role::firstOrCreate(['name' => 'doctor', 'guard_name' => 'web']);
        $receptionistRole = Role::firstOrCreate(['name' => 'receptionist', 'guard_name' => 'web']);

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

        // 4. Central Super Admin User (tenant_id = null)
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
    }
}
