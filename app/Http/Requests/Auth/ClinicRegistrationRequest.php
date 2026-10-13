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
            'subdomain' => ['required', 'string', new SubdomainRule],

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
            'mobile' => ['required', 'string', 'max:30'],
            'password' => [
                'required',
                'confirmed',
                Password::min(8)->letters()->mixedCase()->numbers(),
            ],
            'terms' => ['accepted'],
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
            'terms.accepted' => 'You must agree to the Terms of Service and Privacy Policy to register.',
            'clinic_type.in' => 'Please select a valid clinic type.',
            'district.in' => 'Please select one of Sri Lanka’s 25 administrative districts.',
            'password.min' => 'Password must be at least 8 characters with uppercase, lowercase, and numbers.',
        ];
    }
}
