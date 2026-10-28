<?php

declare(strict_types=1);

use App\Models\Tenant;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sri Lanka's 25 administrative districts.
     */
    private const DISTRICTS = [
        'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo',
        'Galle', 'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara',
        'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar',
        'Matale', 'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya',
        'Polonnaruwa', 'Puttalam', 'Ratnapura', 'Trincomalee', 'Vavuniya',
    ];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            if (! Schema::hasColumn('tenants', 'address_line')) {
                $table->string('address_line', 255)->nullable()->after('address');
            }
            if (! Schema::hasColumn('tenants', 'city')) {
                $table->string('city', 100)->nullable()->after('address_line');
            }
            if (! Schema::hasColumn('tenants', 'district')) {
                $table->string('district', 100)->nullable()->after('city');
            }
            if (! Schema::hasColumn('tenants', 'postal_code')) {
                $table->string('postal_code', 20)->nullable()->after('district');
            }
            if (! Schema::hasColumn('tenants', 'legacy_address')) {
                $table->text('legacy_address')->nullable()->after('postal_code');
            }
        });

        // Backfill existing tenants from free-text address without losing original text
        $tenants = Tenant::all();
        foreach ($tenants as $tenant) {
            $rawAddress = trim((string) ($tenant->address ?? ''));
            if ($rawAddress === '') {
                continue;
            }

            $legacyAddress = $tenant->legacy_address ?: $rawAddress;

            // Check if district/city already exist in data JSON
            $data = is_array($tenant->data) ? $tenant->data : (json_decode((string) $tenant->data, true) ?: []);
            $existingDistrict = $data['district'] ?? ($tenant->directory_district ?? null);
            $existingCity = $data['city'] ?? ($tenant->directory_city ?? null);

            $matchedDistrict = null;
            if ($existingDistrict) {
                foreach (self::DISTRICTS as $d) {
                    if (strcasecmp($existingDistrict, $d) === 0) {
                        $matchedDistrict = $d;
                        break;
                    }
                }
            }

            // Split free text by comma
            $parts = array_values(array_filter(
                array_map('trim', explode(',', $rawAddress)),
                fn ($p) => $p !== '' && strcasecmp($p, 'Sri Lanka') !== 0
            ));

            $postalCode = null;
            // Check for 5-digit postal code in parts
            foreach ($parts as $idx => $part) {
                if (preg_match('/\b(\d{5})\b/', $part, $m)) {
                    $postalCode = $m[1];
                    $cleaned = trim(preg_replace('/\b\d{5}\b/', '', $part));
                    if ($cleaned === '') {
                        unset($parts[$idx]);
                    } else {
                        $parts[$idx] = $cleaned;
                    }
                }
            }
            $parts = array_values($parts);

            // Attempt to match district from the end if not already found
            if (! $matchedDistrict && ! empty($parts)) {
                $lastPart = end($parts);
                foreach (self::DISTRICTS as $d) {
                    if (strcasecmp($lastPart, $d) === 0) {
                        $matchedDistrict = $d;
                        array_pop($parts);
                        break;
                    }
                }
            }

            // If still no district, search all parts
            if (! $matchedDistrict) {
                foreach ($parts as $idx => $part) {
                    foreach (self::DISTRICTS as $d) {
                        if (stripos($part, $d) !== false) {
                            $matchedDistrict = $d;
                            break 2;
                        }
                    }
                }
            }

            $city = $existingCity ?: (! empty($parts) ? array_pop($parts) : null);
            $addressLine = ! empty($parts) ? implode(', ', $parts) : ($rawAddress);

            $tenant->address_line = $addressLine;
            $tenant->city = $city;
            $tenant->district = $matchedDistrict;
            $tenant->postal_code = $postalCode;
            $tenant->legacy_address = $legacyAddress;

            // Also synchronize directory_district and directory_city if empty
            if (empty($tenant->directory_district) && $matchedDistrict) {
                $tenant->directory_district = $matchedDistrict;
            }
            if (empty($tenant->directory_city) && $city) {
                $tenant->directory_city = $city;
            }

            $tenant->save();
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn([
                'address_line',
                'city',
                'district',
                'postal_code',
                'legacy_address',
            ]);
        });
    }
};
