<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use App\Services\AuditLogger;
use App\Services\Media\ImageProcessingService;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Display the user's profile form.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('Profile/Edit', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => session('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('profile.edit');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }

    /**
     * Upload or fetch user profile avatar.
     */
    public function uploadAvatar(
        Request $request,
        ImageProcessingService $imageService
    ): JsonResponse|RedirectResponse {
        $user = $request->user();

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
            $binary = $imageService->fetchSecurelyFromUrl(
                $request->input('source_url'),
                $user->id
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

        $result = $imageService->processUserAvatar($user, $binary, $cropData);

        AuditLogger::log('user.avatar_updated', [
            'resource' => $user,
            'metadata' => [
                'avatar_path' => $result['avatar_path'],
                'avatar_url' => $result['avatar_url'],
            ],
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Profile photo updated.',
                'avatar_url' => $result['avatar_url'],
            ]);
        }

        return back()->with('success', 'Profile photo updated.');
    }

    /**
     * Delete user profile avatar.
     */
    public function deleteAvatar(
        Request $request,
        ImageProcessingService $imageService
    ): JsonResponse|RedirectResponse {
        $user = $request->user();

        $imageService->deleteOldUserAvatar($user);

        $user->avatar_path = null;
        $user->avatar_url = null;
        $user->save();

        AuditLogger::log('user.avatar_removed', [
            'resource' => $user,
        ]);

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'message' => 'Profile photo removed.',
                'avatar_url' => null,
            ]);
        }

        return back()->with('success', 'Profile photo removed.');
    }
}
