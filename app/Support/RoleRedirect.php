<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\User;
use Illuminate\Http\Request;

class RoleRedirect
{
    /**
     * Resolve the landing route for an authenticated user based on role and tenant context.
     */
    public static function path(Request $request, ?User $user = null): string
    {
        $user = $user ?? $request->user();

        if (! $user) {
            return route('login', absolute: false);
        }

        if ($user->hasRole('super_admin')) {
            return route('super_admin.dashboard', absolute: false);
        }

        if ($user->hasRole('clinic_admin')) {
            return route('dashboard', absolute: false);
        }

        if ($user->hasRole('receptionist')) {
            return route('reception.index', absolute: false);
        }

        if ($user->hasRole('doctor')) {
            return route('doctor.index', absolute: false);
        }

        return route('dashboard', absolute: false);
    }
}
