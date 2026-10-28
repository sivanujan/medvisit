<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Stancl\Tenancy\Database\Concerns\BelongsToTenant;

class Patient extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'tenant_id',
        'name',
        'nic',
        'phone',
        'phone_normalized',
        'email',
        'gender',
        'date_of_birth',
        'district',
        'city',
        'address',
        'allergies',
        'notes',
        'emergency_contact_name',
        'emergency_contact_phone',
    ];

    protected function casts(): array
    {
        return [
            'date_of_birth' => 'date',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Patient $patient): void {
            if (! empty($patient->phone)) {
                $patient->phone_normalized = static::normalizePhone($patient->phone);
            } elseif (! empty($patient->phone_normalized)) {
                $patient->phone_normalized = static::normalizePhone($patient->phone_normalized);
            }
        });
    }

    /**
     * E.164 phone normalizer for Sri Lankan and international numbers.
     * Examples:
     *   "0771234567" -> "+94771234567"
     *   "+94 77 123 4567" -> "+94771234567"
     *   "771234567" -> "+94771234567"
     */
    public static function normalizePhone(?string $phone): ?string
    {
        if (! $phone) {
            return null;
        }

        $digits = preg_replace('/\D/', '', $phone);
        if (empty($digits)) {
            return null;
        }

        if (str_starts_with($digits, '94') && strlen($digits) >= 11) {
            return '+94'.substr($digits, 2, 9);
        }

        if (str_starts_with($digits, '0') && strlen($digits) >= 10) {
            return '+94'.substr($digits, 1, 9);
        }

        if (strlen($digits) === 9 && in_array($digits[0], ['7', '1', '2', '3', '4', '5', '6', '8'])) {
            return '+94'.$digits;
        }

        return '+'.$digits;
    }

    /**
     * Consistently format phone number for display as "077 123 4567".
     */
    public static function formatPhoneDisplay(?string $phone): string
    {
        if (! $phone) {
            return '—';
        }

        $digits = preg_replace('/\D/', '', $phone);
        if (str_starts_with($digits, '94')) {
            $digits = substr($digits, 2);
        } elseif (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        // If standard 9-digit Sri Lankan local number, format with leading 0 as "077 123 4567"
        if (strlen($digits) === 9) {
            return '0'.substr($digits, 0, 2).' '.substr($digits, 2, 3).' '.substr($digits, 5, 4);
        }

        if (strlen($digits) === 10 && str_starts_with($digits, '0')) {
            return substr($digits, 0, 3).' '.substr($digits, 3, 3).' '.substr($digits, 6, 4);
        }

        return $phone;
    }

    /**
     * Mask NIC for privacy: e.g. "•••••••• 1234" or "•••••••• 123V".
     */
    public static function maskNic(?string $nic): string
    {
        $clean = trim((string) $nic);
        if ($clean === '' || $clean === '—' || $clean === '-') {
            return '—';
        }

        $len = strlen($clean);
        if ($len <= 4) {
            return $clean;
        }

        $lastFour = substr($clean, -4);

        return '•••••••• '.$lastFour;
    }

    /**
     * Format location cleanly without missing city artifacts:
     * "Battaramulla, Colombo" or "Colombo" (never "–," or ", Colombo").
     */
    public static function formatLocation(?string $city, ?string $district): string
    {
        $cleanCity = trim((string) $city);
        $cleanDistrict = trim((string) $district);

        $isCityEmpty = $cleanCity === '' || $cleanCity === '—' || $cleanCity === '-';
        $isDistrictEmpty = $cleanDistrict === '' || $cleanDistrict === '—' || $cleanDistrict === '-';

        if ($isCityEmpty && $isDistrictEmpty) {
            return '—';
        }

        if ($isCityEmpty) {
            return $cleanDistrict;
        }

        if ($isDistrictEmpty) {
            return $cleanCity;
        }

        return "{$cleanCity}, {$cleanDistrict}";
    }

    /**
     * Formatted phone accessor ("077 123 4567").
     */
    protected function phoneDisplay(): Attribute
    {
        return Attribute::make(
            get: fn () => static::formatPhoneDisplay($this->phone_normalized ?: $this->phone)
        );
    }

    /**
     * Masked NIC accessor ("•••••••• 1234").
     */
    protected function maskedNic(): Attribute
    {
        return Attribute::make(
            get: fn () => static::maskNic($this->nic)
        );
    }

    /**
     * Location display accessor ("Battaramulla, Colombo" or "Colombo").
     */
    protected function locationDisplay(): Attribute
    {
        return Attribute::make(
            get: fn () => static::formatLocation($this->city, $this->district)
        );
    }

    public function tokens(): HasMany
    {
        return $this->hasMany(BookingToken::class);
    }

    public function bills(): HasMany
    {
        return $this->hasMany(Bill::class);
    }

    public function prescriptions(): HasMany
    {
        return $this->hasMany(Prescription::class)->latest('id');
    }
}
