<?php

declare(strict_types=1);

namespace App\Http\Requests\Tenant;

use App\Models\ClinicPage;
use App\Support\PageSlug;
use Illuminate\Foundation\Http\FormRequest;

class UpdateClinicPageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Route middleware enforces the clinic_admin|super_admin role.
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $page = $this->route('page');
        $ignoreId = $page instanceof ClinicPage ? $page->id : null;

        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'slug' => ['sometimes', ...PageSlug::rule((string) tenant('id'), $ignoreId)],
            'seo_title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'seo_description' => ['sometimes', 'nullable', 'string', 'max:500'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ];
    }
}
