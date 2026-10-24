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
use Symfony\Component\HttpFoundation\Response;

/**
 * "Sign in to your clinic" on the central domain: find a clinic by staff email or by
 * clinic address and send the visitor to that clinic's own login page.
 *
 * Both lookups are rate limited (routes/auth.php) and padded to the same minimum
 * duration so found and not-found answers can't be told apart by timing.
 */
class FindClinicController extends Controller
{
    private const MIN_RESPONSE_MS = 350;

    public const NOT_FOUND_EMAIL = "We couldn't find a clinic for that email. Check the address or enter your clinic address instead.";

    public const NOT_FOUND_ADDRESS = "We couldn't find a clinic at that address. Check the spelling or use your email instead.";

    /**
     * Find clinic by subdomain and send the visitor to its login page.
     */
    public function searchSubdomain(Request $request): Response|RedirectResponse
    {
        $startedAt = microtime(true);

        $request->merge(['subdomain' => Str::lower(trim((string) $request->input('subdomain')))]);
        $request->validate([
            'subdomain' => ['required', 'string', 'max:63', 'regex:/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/'],
        ], [
            'subdomain.regex' => 'Use lowercase letters, numbers and hyphens only.',
        ]);

        $subdomain = (string) $request->input('subdomain');
        $tenant = Tenant::where('subdomain', $subdomain)
            ->orWhere('id', $subdomain)
            ->first();

        if (! $tenant) {
            return $this->afterMinimumTime($startedAt, back()->withErrors(['subdomain' => self::NOT_FOUND_ADDRESS, 'lookup' => 'not_found']));
        }

        return $this->afterMinimumTime($startedAt, $this->goToClinic($request, $tenant, $tenant->url('/login')));
    }

    /**
     * Look up the clinic(s) a staff email belongs to.
     */
    public function searchEmail(Request $request): Response|RedirectResponse
    {
        $startedAt = microtime(true);

        $request->validate([
            'email' => ['required', 'string', 'email'],
        ]);

        $email = Str::lower(trim($request->input('email')));

        $users = User::where('email', $email)
            ->whereNotNull('tenant_id')
            ->with('tenant')
            ->get()
            ->filter(fn (User $u) => $u->tenant !== null)
            ->values();

        // Same answer for unknown emails and platform accounts: nothing here says which.
        if ($users->isEmpty()) {
            return $this->afterMinimumTime($startedAt, back()->withErrors(['email' => self::NOT_FOUND_EMAIL, 'lookup' => 'not_found']));
        }

        $loginPath = '/login?email='.urlencode($email);
        $clinics = $users->map(fn (User $u) => $this->clinicCard($u->tenant, $u->tenant->url($loginPath)))->all();

        try {
            Mail::to($email)->queue(new FindClinicAccessMail($email, array_map(
                fn (array $c) => ['name' => $c['name'], 'subdomain' => $c['subdomain'], 'login_url' => $c['login_url']],
                $clinics,
            )));
        } catch (\Throwable $e) {
            Log::warning("Could not dispatch clinic access email: {$e->getMessage()}");
        }

        if (count($clinics) === 1) {
            session()->flash('status', 'Opening your clinic sign-in page…');

            return $this->afterMinimumTime($startedAt, $this->goToClinic($request, $users->first()->tenant, $clinics[0]['login_url']));
        }

        return $this->afterMinimumTime($startedAt, back()->with([
            'matchedClinics' => $clinics,
            'lookupEmail' => $email,
        ]));
    }

    /**
     * Inertia visits get the clinic back so the page can remember it before navigating
     * (localStorage on the central domain); plain requests are redirected directly.
     */
    private function goToClinic(Request $request, Tenant $tenant, string $loginUrl): RedirectResponse
    {
        if ($request->header('X-Inertia')) {
            return back()->with('clinicRedirect', $this->clinicCard($tenant, $loginUrl));
        }

        return redirect()->away($loginUrl);
    }

    /**
     * @return array{name: string, subdomain: string, logo_url: ?string, login_url: string, home_login_url: string}
     */
    private function clinicCard(Tenant $tenant, string $loginUrl): array
    {
        return [
            'name' => (string) ($tenant->name ?? 'Clinic'),
            'subdomain' => (string) ($tenant->subdomain ?? $tenant->id),
            'logo_url' => $tenant->logo_url,
            'login_url' => $loginUrl,
            // Without the email, for the "Continue to {clinic}" shortcut stored in the browser.
            'home_login_url' => $tenant->url('/login'),
        ];
    }

    private function afterMinimumTime(float $startedAt, RedirectResponse $response): RedirectResponse
    {
        $minMs = app()->runningUnitTests() ? 0 : self::MIN_RESPONSE_MS;
        $elapsedMs = (microtime(true) - $startedAt) * 1000;
        if ($elapsedMs < $minMs) {
            usleep((int) (($minMs - $elapsedMs) * 1000));
        }

        return $response;
    }
}
