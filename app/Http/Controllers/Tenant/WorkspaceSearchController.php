<?php

declare(strict_types=1);

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\BookingToken;
use App\Models\Doctor;
use App\Models\Patient;
use App\Support\TokenHelper;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkspaceSearchController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $query = trim((string) $request->input('q', ''));
        $today = Carbon::today('Asia/Colombo')->toDateString();

        if ($query === '' || strlen($query) < 2) {
            return response()->json([
                'query' => $query,
                'patients' => [],
                'doctors' => [],
                'tokens' => [],
                'navigation' => $this->filterNavigation(''),
            ]);
        }

        // 1. Search Patients
        $patients = Patient::where(function ($q) use ($query) {
            $q->where('name', 'ilike', "%{$query}%")
                ->orWhere('phone', 'like', "%{$query}%")
                ->orWhere('nic', 'like', "%{$query}%");
        })
            ->limit(5)
            ->get()
            ->map(fn ($p) => [
                'id' => $p->id,
                'title' => $p->name,
                'subtitle' => trim(($p->nic ? "NIC: {$p->nic} • " : '').$p->phone),
                'url' => "/patients?patient_id={$p->id}",
                'category' => 'Patient',
            ]);

        // 2. Search Doctors
        $doctors = Doctor::where(function ($q) use ($query) {
            $q->where('name', 'ilike', "%{$query}%")
                ->orWhere('specialty', 'ilike', "%{$query}%")
                ->orWhere('slmc_number', 'like', "%{$query}%");
        })
            ->limit(5)
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'title' => "{$d->title} {$d->name}",
                'subtitle' => "{$d->specialty} • {$d->slmc_number}",
                'url' => "/doctors?doctor_id={$d->id}",
                'category' => 'Doctor',
            ]);

        // 3. Search Today's Tokens
        $parsed = TokenHelper::parseSearchTerm($query);
        $tokens = BookingToken::with(['patient', 'session.doctor'])
            ->whereHas('session', fn ($q) => $q->where('session_date', $today))
            ->where(function ($q) use ($query, $parsed) {
                if ($parsed !== null) {
                    $q->where(function ($tq) use ($parsed) {
                        $tq->where('token_number', $parsed['number']);
                        if ($parsed['code'] !== null) {
                            $tq->whereHas('session', fn ($sq) => $sq->where('doctor_token_code', $parsed['code']));
                        }
                    });
                } else {
                    $q->whereRaw('1=0');
                }

                $q->orWhereHas('patient', function ($pq) use ($query) {
                    $pq->where('name', 'ilike', "%{$query}%")
                        ->orWhere('phone', 'like', "%{$query}%");
                });
            })
            ->limit(10)
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'title' => "Token #{$t->display_token} - ".($t->patient?->name ?? 'Patient'),
                'subtitle' => ($t->session?->doctor?->name ?? 'Doctor').' • Status: '.ucfirst(str_replace('_', ' ', $t->status)),
                'url' => "/bookings?token_id={$t->id}",
                'category' => 'Token',
            ]);

        // 4. Navigation
        $navigation = $this->filterNavigation($query);

        return response()->json([
            'query' => $query,
            'patients' => $patients,
            'doctors' => $doctors,
            'tokens' => $tokens,
            'navigation' => $navigation,
        ]);
    }

    /**
     * @return array<int, array<string, string>>
     */
    private function filterNavigation(string $query): array
    {
        $pages = [
            ['title' => 'Overview Dashboard', 'subtitle' => 'Live clinic stats, revenue, and queue monitor', 'url' => '/dashboard', 'keywords' => ['dashboard', 'home', 'overview', 'stats', 'analytics']],
            ['title' => "Today's Sessions & Queue", 'subtitle' => 'Real-time channeling token caller & waiting room', 'url' => '/sessions/today', 'keywords' => ['today', 'sessions', 'queue', 'calling', 'tokens', 'waiting']],
            ['title' => 'Channeling Calendar', 'subtitle' => 'Day, week, and month doctor clinic schedules', 'url' => '/calendar', 'keywords' => ['calendar', 'schedule', 'doctor dates', 'sessions']],
            ['title' => 'Issue Token / Bookings', 'subtitle' => 'Reception desk channeling booking & token slip', 'url' => '/bookings', 'keywords' => ['bookings', 'issue token', 'reception desk', 'channeling']],
            ['title' => 'Patients Directory', 'subtitle' => 'Registered clinic patients and visit records', 'url' => '/patients', 'keywords' => ['patients', 'records', 'clients', 'nic', 'phone']],
            ['title' => 'Doctors & Specialists', 'subtitle' => 'Practitioner profiles, consultation fees, and SLMC info', 'url' => '/doctors', 'keywords' => ['doctors', 'specialists', 'physicians', 'fees', 'slmc']],
            ['title' => 'Billing & Collections', 'subtitle' => 'Receipt generation, daily collections, and fee split', 'url' => '/billing', 'keywords' => ['billing', 'receipts', 'collections', 'money', 'revenue', 'cash']],
            ['title' => 'Clinic Public Website', 'subtitle' => 'Landing page builder and public booking portal', 'url' => '/website', 'keywords' => ['website', 'builder', 'public site', 'landing page', 'subdomain']],
            ['title' => 'Staff & User Access', 'subtitle' => 'Manage clinic administrators, doctors, and receptionists', 'url' => '/staff', 'keywords' => ['staff', 'team', 'invitations', 'roles', 'receptionists']],
            ['title' => 'Clinic Settings & Audit Trail', 'subtitle' => 'Branding, contact info, and activity log', 'url' => '/settings', 'keywords' => ['settings', 'clinic info', 'audit', 'logs', 'security']],
        ];

        if ($query === '') {
            return array_slice($pages, 0, 4);
        }

        $lower = strtolower($query);
        $matches = [];
        foreach ($pages as $p) {
            $inTitle = str_contains(strtolower($p['title']), $lower);
            $inSub = str_contains(strtolower($p['subtitle']), $lower);
            $inKw = collect($p['keywords'])->contains(fn ($k) => str_contains(strtolower($k), $lower));

            if ($inTitle || $inSub || $inKw) {
                $matches[] = [
                    'title' => $p['title'],
                    'subtitle' => $p['subtitle'],
                    'url' => $p['url'],
                    'category' => 'Navigation',
                ];
            }
        }

        return $matches;
    }
}
