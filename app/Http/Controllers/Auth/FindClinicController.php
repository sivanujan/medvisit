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

        $centralDomain = config('tenancy.central_domains.0', 'medvisit.test');
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
     * Look up clinics matching a work email and dispatch login links.
     * Never reveals whether matching clinics exist or not on screen.
     */
    public function searchEmail(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $email = Str::lower(trim($request->input('email')));

        $users = User::where('email', $email)
            ->whereNotNull('tenant_id')
            ->with('tenant')
            ->get();

        if ($users->isNotEmpty()) {
            $centralDomain = config('tenancy.central_domains.0', 'medvisit.test');
            $scheme = $request->getScheme();
            $port = $request->getPort();
            $portSuffix = ($port && ! in_array($port, [80, 443])) ? ":{$port}" : '';

            $clinics = $users->map(function ($u) use ($centralDomain, $scheme, $portSuffix) {
                $sub = (string) ($u->tenant?->subdomain ?? $u->tenant_id);
                $name = (string) ($u->tenant?->name ?? 'Clinic');

                return [
                    'name' => $name,
                    'subdomain' => $sub,
                    'login_url' => "{$scheme}://{$sub}.{$centralDomain}{$portSuffix}/login",
                ];
            })->values()->all();

            Mail::to($email)->queue(new FindClinicAccessMail($email, $clinics));
            Log::info("Dispatched clinic access email for [{$email}] covering ".count($clinics).' clinic(s)');
        }

        return back()->with('status', 'If your work email is registered with a clinic, we have sent your direct login link(s) to your inbox.');
    }
}
