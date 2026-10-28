<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Support\SiteKit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Validator;

class SiteKitController extends Controller
{
    public function show(): JsonResponse
    {
        return response()->json(['kit' => SiteKit::resolveFor(tenant())]);
    }

    public function update(Request $request): JsonResponse
    {
        $validator = validator($request->all(), SiteKit::rules());

        $validator->after(function (Validator $validator) use ($request): void {
            $ids = array_column((array) $request->input('colors', []), 'id');
            $missing = array_diff(SiteKit::SYSTEM_IDS, $ids);
            if ($missing !== []) {
                $validator->errors()->add('colors', 'Missing required colors: '.implode(', ', $missing).'.');
            }
            $custom = array_filter($ids, static fn ($id) => is_string($id) && str_starts_with($id, 'custom-'));
            if (count($custom) > SiteKit::MAX_CUSTOM_COLORS) {
                $validator->errors()->add('colors', 'A kit can have at most '.SiteKit::MAX_CUSTOM_COLORS.' custom colors.');
            }
        });

        $validated = $validator->validate();

        $tenant = tenant();
        $kit = SiteKit::normalize($validated, SiteKit::resolveFor($tenant));
        $tenant->website_kit = $kit;
        $tenant->save();

        return response()->json(['kit' => $kit]);
    }
}
