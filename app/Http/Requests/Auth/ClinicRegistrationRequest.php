<?php

declare(strict_types=1);

namespace App\Http\Requests\Auth;

use App\Rules\NotDisposableEmail;
use App\Rules\SubdomainRule;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class ClinicRegistrationRequest extends FormRequest
{
    /**
     * The 25 administrative districts of Sri Lanka.
     *
     * @var list<string>
     */
    public const DISTRICTS = [
        'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
        'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
        'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
        'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
        'Monaragala', 'Ratnapura', 'Kegalle',
    ];

    /**
     * Supported clinic practice types.
     *
     * @var list<string>
     */
    public const CLINIC_TYPES = [
        'dispensary',
        'channeling centre',
        'medical centre',
        'specialist clinic',
    ];

    public function authorize(): bool
    {
        return true;
    }

    /**
     * Normalize a Sri Lankan mobile phone number to compact E.164 (+947XXXXXXXX).
     */
    public static function normalizeSriLankanMobile(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }

        $trimmed = trim($phone);
        if ($trimmed === '') {
            return '';
        }

        $digits = preg_replace('/\D/', '', $trimmed) ?? '';
        if ($digits === '') {
            return $trimmed;
        }

        if (str_starts_with($digits, '94') && strlen($digits) === 11) {
            return '+'.$digits;
        }

        if (str_starts_with($digits, '0') && strlen($digits) === 10) {
            return '+94'.substr($digits, 1);
        }

        if (strlen($digits) === 9 && str_starts_with($digits, '7')) {
            return '+94'.$digits;
        }

        return '+'.$digits;
    }

    /**
     * Normalize a general Sri Lankan phone number (+94 prefix, accepts and strips leading 0).
     */
    public static function normalizePhone(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }

        $trimmed = trim($phone);
        if ($trimmed === '') {
            return '';
        }

        $allDigits = preg_replace('/\D/', '', $trimmed) ?? '';
        if ($allDigits === '') {
            return $trimmed;
        }

        if (str_starts_with($trimmed, '+94')) {
            $localDigits = preg_replace('/\D/', '', substr($trimmed, 3)) ?? '';
        } elseif (str_starts_with($trimmed, '0094')) {
            $localDigits = preg_replace('/\D/', '', substr($trimmed, 4)) ?? '';
        } elseif (str_starts_with($allDigits, '94') && strlen($allDigits) >= 11) {
            $localDigits = substr($allDigits, 2);
        } else {
            $localDigits = $allDigits;
        }

        if (str_starts_with($localDigits, '0')) {
            $localDigits = substr($localDigits, 1);
        }

        if (strlen($localDigits) === 9) {
            return sprintf('+94 %s %s %s', substr($localDigits, 0, 2), substr($localDigits, 2, 3), substr($localDigits, 5, 4));
        }

        return '+94 '.$localDigits;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $merge = [];

        if ($this->has('clinic_phone')) {
            $merge['clinic_phone'] = self::normalizePhone((string) $this->input('clinic_phone'));
        }

        if ($this->has('mobile')) {
            $merge['mobile'] = self::normalizeSriLankanMobile((string) $this->input('mobile'));
        }

        if ($this->has('subdomain')) {
            $merge['subdomain'] = strtolower(trim((string) $this->input('subdomain')));
        }

        if (! empty($merge)) {
            $this->merge($merge);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            // Bot honeypot: must be empty
            'honeypot' => ['nullable', 'max:0'],

            // Step 1: Clinic details
            'clinic_name' => ['required', 'string', 'max:120'],
            'clinic_type' => ['required', 'string', 'in:'.implode(',', self::CLINIC_TYPES)],
            'district' => ['required', 'string', 'in:'.implode(',', self::DISTRICTS)],
            'city' => ['required', 'string', 'max:100'],
            'address' => ['required', 'string', 'max:255'],
            'clinic_phone' => ['required', 'string', 'max:30'],

            // Step 2: Subdomain / Web address
            'subdomain' => ['required', 'string', new SubdomainRule(
                clinicName: $this->input('clinic_name'),
                city: $this->input('city')
            )],

            // Step 3: Admin account
            'name' => ['required', 'string', 'max:120'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:255',
                'unique:users,email',
                new NotDisposableEmail,
            ],
            'mobile' => ['required', 'string', 'regex:/^\+947[0-9]{8}$/'],
            'password' => [
                'required',
                'confirmed',
                Password::min(8)->letters()->mixedCase()->numbers(),
            ],
            'terms' => ['accepted'],
            'agreement_authority' => ['accepted'],
            'registration_token' => ['required', 'string'],
            'phone_token' => ['required', 'string'],
            'invite_token' => ['nullable', 'string'],
        ];
    }

    /**
     * Custom error messages.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'honeypot.max' => 'Spam bot submission detected.',
            'terms.accepted' => 'You must agree to the Terms & Conditions, Privacy Policy, Refund Policy and Dispute Policy to register.',
            'agreement_authority.accepted' => 'You must confirm that you are authorised to register this clinic and responsible for its information and data.',
            'clinic_type.in' => 'Please select a valid clinic type.',
            'district.in' => 'Please select one of Sri Lanka’s 25 administrative districts.',
            'password.min' => 'Password must be at least 8 characters with uppercase, lowercase, and numbers.',
            'mobile.regex' => 'Please enter a valid Sri Lankan mobile number (e.g. 0771234567 or +94771234567).',
            'phone_token.required' => 'Your mobile phone number must be verified with an OTP code before launching.',
        ];
    }
}
