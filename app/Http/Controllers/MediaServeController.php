<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class MediaServeController extends Controller
{
    /**
     * Serve tenant media assets with strict security headers (especially for SVGs).
     */
    public function show(string $tenantId, string $filename): Response|BinaryFileResponse
    {
        // Prevent directory traversal
        if (str_contains($tenantId, '..') || str_contains($filename, '..')) {
            abort(404);
        }

        $path = "media/{$tenantId}/{$filename}";

        if (! Storage::disk('public')->exists($path)) {
            abort(404, 'File not found');
        }

        $fullPath = Storage::disk('public')->path($path);
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        $headers = [
            'X-Content-Type-Options' => 'nosniff',
        ];

        if ($extension === 'svg') {
            $headers['Content-Type'] = 'image/svg+xml';
            $headers['Content-Security-Policy'] = "default-src 'none'; style-src 'unsafe-inline'";
        }

        return response()->file($fullPath, $headers);
    }
}
