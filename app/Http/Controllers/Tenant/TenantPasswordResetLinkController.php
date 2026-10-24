<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;
use Inertia\Response;

class TenantPasswordResetLinkController extends Controller
{
    /**
     * Display the password reset link request view for the clinic tenant.
     */
    public function create(): Response
    {
        $tenant = tenant();

        return Inertia::render('Auth/ForgotPassword', [
            'status' => session('status'),
            'tenant' => $tenant->authBranding(),
        ]);
    }

    /**
     * Handle an incoming password reset link request scoped to this tenant.
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ]);

        $tenant = tenant();
        $user = User::where('tenant_id', $tenant->id)
            ->where('email', strtolower($request->email))
            ->first();

        if ($user) {
            $token = Password::broker()->createToken($user);
            $user->sendPasswordResetNotification($token);
        }

        return back()->with('status', trans(Password::RESET_LINK_SENT));
    }
}
