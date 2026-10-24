<?php

declare(strict_types=1);

namespace App\Http\Requests\Tenant;

use App\Support\PageSlug;
use Illuminate\Foundation\Http\FormRequest;

class StoreClinicPageRequest extends FormRequest
{
    /**
     * Template keys; keep in sync with getTemplateHtml in
     * resources/js/Pages/Website/PageBuilder.tsx and the website editor starter layouts.
     */
    public const TEMPLATE_KEYS = ['modern-clinic', 'specialist-center', 'family-practice', 'blank', 'text-image', 'faq'];

    public function authorize(): bool
    {
        return true; // Route middleware enforces the clinic_admin|super_admin role.
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'slug' => PageSlug::rule((string) tenant('id')),
            'source' => [
                'required',
                'string',
                'regex:/^(blank|copy:\d+|template:('.implode('|', self::TEMPLATE_KEYS).'))$/',
            ],
            'html' => ['nullable', 'string'],
        ];
    }
}
