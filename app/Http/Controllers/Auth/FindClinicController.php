<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Mail\Auth\FindClinicAccessMail;
use App\Models\Tenant;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class FindClinicController extends Controller
{
    /**
     * Find clinic by subdomain and redirect to its login page.
     */
    public function searchSubdomain(Request $request): Response|RedirectResponse
    {
        $request->validate([
            'subdomain' => ['required', 'string'],
        ]);

        $raw = Str::lower(trim($request->input('subdomain')));
        // Clean leading protocols or full hosts if user pasted a URL
        $clean = preg_replace('#^https?://#i', '', $raw);
        $clean = explode('.', $clean)[0];
        $subdomain = Str::slug($clean);

        $tenant = Tenant::where('id', $subdomain)
            ->orWhere('subdomain', $subdomain)
            ->first();

        if (! $tenant) {
            return back()->withErrors([
                'subdomain' => "We could not find an active clinic with the address '{$subdomain}'. Please verify the spelling or search using your work email.",
            ]);
        }

        $centralDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $scheme = $request->getScheme();
        $port = $request->getPort();
        $portSuffix = ($port && ! in_array($port, [80, 443])) ? ":{$port}" : '';
        $clinicUrl = "{$scheme}://{$tenant->subdomain}.{$centralDomain}{$portSuffix}/login";

        if ($request->header('X-Inertia')) {
            return Inertia::location($clinicUrl);
        }

        return redirect()->away($clinicUrl);
    }

    /**
     * Look up clinic by work email and automatically redirect to its clinic login page.
     */
    public function searchEmail(Request $request): Response|RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $email = Str::lower(trim($request->input('email')));

        $users = User::where('email', $email)
            ->whereNotNull('tenant_id')
            ->with('tenant')
            ->get();

        if ($users->isEmpty()) {
            $superAdmin = User::where('email', $email)->whereNull('tenant_id')->first();
            if ($superAdmin) {
                return back()->withErrors([
                    'email' => 'This email belongs to a Platform Admin. Please sign in via the Platform Admin Sign In below.',
                ]);
            }

            return back()->withErrors([
                'email' => "We could not find a clinic associated with '{$email}'. Please verify your email or register a new clinic.",
            ]);
        }

        $centralDomain = config('medvisit.base_domain', config('tenancy.central_domains.0', 'medvisit.localhost'));
        $scheme = $request->getScheme();
        $port = $request->getPort();
        $portSuffix = ($port && ! in_array($port, [80, 443])) ? ":{$port}" : '';

        $clinicsForMail = $users->map(function ($u) use ($centralDomain, $scheme, $portSuffix) {
            $sub = (string) ($u->tenant?->subdomain ?? $u->tenant_id);
            $name = (string) ($u->tenant?->name ?? 'Clinic');

            return [
                'name' => $name,
                'subdomain' => $sub,
                'login_url' => "{$scheme}://{$sub}.{$centralDomain}{$portSuffix}/login",
            ];
        })->values()->all();

        try {
            Mail::to($email)->queue(new FindClinicAccessMail($email, $clinicsForMail));
        } catch (\Throwable $e) {
            Log::warning("Could not dispatch clinic access email: {$e->getMessage()}");
        }

        session()->flash('status', 'Redirecting to your clinic workspace...');

        // Single clinic match -> automatically redirect to clinic login
        if ($users->count() === 1) {
            $user = $users->first();
            $tenant = $user->tenant ?? Tenant::find($user->tenant_id);

            if (! $tenant) {
                return back()->withErrors([
                    'email' => "Could not locate an active clinic workspace for '{$email}'.",
                ]);
            }

            $clinicUrl = $tenant->url('/login?email='.urlencode($email));

            if ($request->header('X-Inertia')) {
                return Inertia::location($clinicUrl);
            }

            return redirect()->away($clinicUrl);
        }

        // Multiple clinic matches -> provide selection
        $clinics = $users->map(function ($u) use ($email) {
            $tenant = $u->tenant ?? Tenant::find($u->tenant_id);
            $sub = (string) ($tenant?->subdomain ?? $u->tenant_id);
            $name = (string) ($tenant?->name ?? 'Clinic');

            $url = $tenant
                ? $tenant->url('/login?email='.urlencode($email))
                : Tenant::urlForSubdomain($sub, '/login?email='.urlencode($email));

            return [
                'name' => $name,
                'subdomain' => $sub,
                'login_url' => $url,
            ];
        })->values()->all();

        return back()->with([
            'matchedClinics' => $clinics,
            'lookupEmail' => $email,
        ]);
    }
}
