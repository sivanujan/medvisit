<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Services\AuditLogger;
use App\Services\Media\ImageProcessingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ClinicBrandingController extends Controller
{
    public function __construct(
        protected ImageProcessingService $imageService
    ) {}

    /**
     * Upload or fetch clinic logo from URL, process, and store.
     */
    public function uploadLogo(Request $request): JsonResponse|RedirectResponse
    {
        $tenant = tenant();
        if (! $tenant) {
            abort(404, 'Clinic workspace not found.');
        }

        $request->validate([
            'file' => ['nullable', 'file', 'max:5120', 'mimes:png,jpg,jpeg,webp'],
            'source_url' => ['nullable', 'string', 'max:2048'],
            'crop_x' => ['nullable', 'numeric'],
            'crop_y' => ['nullable', 'numeric'],
            'crop_width' => ['nullable', 'numeric'],
            'crop_height' => ['nullable', 'numeric'],
            'rotate' => ['nullable', 'numeric'],
        ]);

        $binary = null;
        if ($request->hasFile('file')) {
            $uploaded = $request->file('file');
            if (! $uploaded->isValid()) {
                throw ValidationException::withMessages([
                    'file' => ['The uploaded file is corrupt or invalid.'],
                ]);
            }
            $binary = $uploaded->get();
        } elseif ($request->filled('source_url')) {
            $binary = $this->imageService->fetchSecurelyFromUrl(
                $request->input('source_url'),
                $request->user()?->id
            );
        } else {
            throw ValidationException::withMessages([
                'file' => ['Please upload an image file or provide an image link.'],
            ]);
        }

        $cropData = [
            'crop_x' => $request->input('crop_x'),
            'crop_y' => $request->input('crop_y'),
            'crop_width' => $request->input('crop_width'),
            'crop_height' => $request->input('crop_height'),
            'rotate' => $request->input('rotate'),
        ];

        $result = $this->imageService->processClinicLogo($tenant, $binary, $cropData);

        AuditLogger::log('clinic.logo_updated', [
            'resource' => $tenant,
            'metadata' => [
                'logo_path' => $result['logo_path'],
                'logo_url' => $result['logo_url'],
            ],
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Clinic logo updated successfully.',
                'logo_url' => $result['logo_url'],
                'logo_png_url' => $result['logo_png_url'],
                'favicon_url' => $result['favicon_url'],
            ]);
        }

        return back()->with('success', 'Clinic logo updated successfully.');
    }

    /**
     * Remove clinic logo and restore default fallback.
     */
    public function deleteLogo(Request $request): JsonResponse|RedirectResponse
    {
        $tenant = tenant();
        if (! $tenant) {
            abort(404, 'Clinic workspace not found.');
        }

        $this->imageService->deleteOldClinicLogo($tenant);

        $tenant->logo_path = null;
        $tenant->logo_url = null;
        $tenant->logo_png_path = null;
        $tenant->favicon_path = null;
        $tenant->save();

        AuditLogger::log('clinic.logo_removed', [
            'resource' => $tenant,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Clinic logo removed.',
                'logo_url' => null,
                'logo_png_url' => null,
                'favicon_url' => '/favicon.ico',
            ]);
        }

        return back()->with('success', 'Clinic logo removed.');
    }
}
