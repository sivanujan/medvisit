<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\DirectoryDoctor;
use App\Models\DirectoryListing;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class PublicDirectoryController extends Controller
{
    /**
     * Search & Browse Public Directory (/find).
     */
    public function index(Request $request): Response
    {
        $query = trim((string) $request->input('q', ''));
        $district = $request->input('district');
        $specialty = $request->input('specialty');
        $day = $request->input('day');
        $service = $request->input('service');
        $tab = $request->input('tab', 'doctors'); // 'doctors' | 'clinics'
        $lat = $request->filled('lat') ? (float) $request->input('lat') : null;
        $lng = $request->filled('lng') ? (float) $request->input('lng') : null;

        // Base active listings
        $listingsQuery = DirectoryListing::active()->with(['activeDoctors']);

        if (! empty($district)) {
            $listingsQuery->where('district', $district);
        }

        if (! empty($service)) {
            $listingsQuery->whereJsonContains('services', $service);
        }

        $listings = $listingsQuery->get();

        // Base active doctors
        $doctorsQuery = DirectoryDoctor::active()->with(['listing']);

        if (! empty($district)) {
            $doctorsQuery->whereHas('listing', function ($q) use ($district) {
                $q->where('district', $district)->where('is_active', true);
            });
        }

        if (! empty($specialty)) {
            $doctorsQuery->where('specialty', $specialty);
        }

        if (! empty($service)) {
            $doctorsQuery->whereHas('listing', function ($q) use ($service) {
                $q->whereJsonContains('services', $service)->where('is_active', true);
            });
        }

        $doctors = $doctorsQuery->get();

        // Filter by day of week if specified (0-6)
        if ($day !== null && $day !== '') {
            $dayInt = (int) $day;
            $doctors = $doctors->filter(function (DirectoryDoctor $doc) use ($dayInt) {
                $schedules = $doc->session_schedules ?? [];
                foreach ($schedules as $sched) {
                    if (isset($sched['day_of_week']) && (int) $sched['day_of_week'] === $dayInt) {
                        return true;
                    }
                }

                return false;
            })->values();

            $matchingListingIds = $doctors->pluck('directory_listing_id')->unique()->all();
            $listings = $listings->filter(fn (DirectoryListing $l) => in_array($l->id, $matchingListingIds, true))->values();
        }

        // Filter by text search query (q) across name, city, address, specialty
        if (! empty($query)) {
            $qLower = mb_strtolower($query);

            $listings = $listings->filter(function (DirectoryListing $item) use ($qLower) {
                if (str_contains(mb_strtolower($item->clinic_name), $qLower)) {
                    return true;
                }
                if (str_contains(mb_strtolower($item->city), $qLower)) {
                    return true;
                }
                if (str_contains(mb_strtolower($item->district), $qLower)) {
                    return true;
                }
                if ($item->address && str_contains(mb_strtolower($item->address), $qLower)) {
                    return true;
                }
                foreach ($item->activeDoctors as $doc) {
                    if (str_contains(mb_strtolower($doc->name), $qLower) || str_contains(mb_strtolower($doc->specialty), $qLower)) {
                        return true;
                    }
                }

                return false;
            })->values();

            $doctors = $doctors->filter(function (DirectoryDoctor $doc) use ($qLower) {
                if (str_contains(mb_strtolower($doc->name), $qLower)) {
                    return true;
                }
                if (str_contains(mb_strtolower($doc->specialty), $qLower)) {
                    return true;
                }
                if ($doc->listing) {
                    if (str_contains(mb_strtolower($doc->listing->clinic_name), $qLower)) {
                        return true;
                    }
                    if (str_contains(mb_strtolower($doc->listing->city), $qLower)) {
                        return true;
                    }
                    if (str_contains(mb_strtolower($doc->listing->district), $qLower)) {
                        return true;
                    }
                }

                return false;
            })->values();
        }

        // Calculate distance if lat/lng are supplied ("Near me")
        if ($lat !== null && $lng !== null) {
            $listings = $listings->map(function (DirectoryListing $listing) use ($lat, $lng) {
                $dist = $this->calculateHaversineDistance($lat, $lng, $listing->latitude, $listing->longitude);
                $listing->distance_km = $dist;

                return $listing;
            })->sortBy('distance_km')->values();

            $doctors = $doctors->map(function (DirectoryDoctor $doc) use ($lat, $lng) {
                if ($doc->listing) {
                    $dist = $this->calculateHaversineDistance($lat, $lng, $doc->listing->latitude, $doc->listing->longitude);
                    $doc->distance_km = $dist;
                } else {
                    $doc->distance_km = 9999;
                }

                return $doc;
            })->sortBy('distance_km')->values();
        } else {
            $listings = $listings->sortBy('clinic_name')->values();
            $doctors = $doctors->sortBy('name')->values();
        }

        // Distinct specialties for dropdown filter
        $availableSpecialties = DirectoryDoctor::active()
            ->whereNotNull('specialty')
            ->distinct()
            ->orderBy('specialty')
            ->pluck('specialty')
            ->all();

        // Format doctors for frontend
        $formattedDoctors = $doctors->map(function (DirectoryDoctor $doc) {
            return [
                'id' => $doc->id,
                'name' => $doc->name,
                'title' => $doc->title,
                'full_title' => $doc->full_title,
                'specialty' => $doc->specialty,
                'slug' => $doc->slug,
                'photo_url' => $doc->photo_url,
                'min_fee_cents' => $doc->min_fee_cents,
                'formatted_fee' => $doc->formatted_fee,
                'session_schedules' => $doc->session_schedules ?? [],
                'booking_url' => $doc->booking_url,
                'distance_km' => $doc->distance_km ?? null,
                'clinic' => $doc->listing ? [
                    'id' => $doc->listing->id,
                    'name' => $doc->listing->clinic_name,
                    'slug' => $doc->listing->slug,
                    'district' => $doc->listing->district,
                    'city' => $doc->listing->city,
                    'phone' => $doc->listing->phone,
                    'whatsapp' => $doc->listing->whatsapp,
                    'online_booking_enabled' => $doc->listing->online_booking_enabled,
                    'subdomain_url' => $doc->listing->subdomain_url,
                    'latitude' => $doc->listing->latitude,
                    'longitude' => $doc->listing->longitude,
                ] : null,
            ];
        });

        // Format listings for frontend
        $formattedListings = $listings->map(function (DirectoryListing $listing) {
            return [
                'id' => $listing->id,
                'name' => $listing->clinic_name,
                'slug' => $listing->slug,
                'district' => $listing->district,
                'city' => $listing->city,
                'address' => $listing->address,
                'latitude' => $listing->latitude,
                'longitude' => $listing->longitude,
                'phone' => $listing->phone,
                'whatsapp' => $listing->whatsapp,
                'logo_url' => $listing->logo_url,
                'description' => $listing->description,
                'services' => $listing->services ?? [],
                'online_booking_enabled' => $listing->online_booking_enabled,
                'subdomain_url' => $listing->subdomain_url,
                'doctor_count' => $listing->doctor_count,
                'distance_km' => $listing->distance_km ?? null,
                'doctors' => $listing->activeDoctors->map(function ($doc) {
                    return [
                        'id' => $doc->id,
                        'name' => $doc->name,
                        'title' => $doc->title,
                        'specialty' => $doc->specialty,
                        'slug' => $doc->slug,
                        'photo_url' => $doc->photo_url,
                        'formatted_fee' => $doc->formatted_fee,
                        'booking_url' => $doc->booking_url,
                    ];
                }),
            ];
        });

        return Inertia::render('Directory/Find', [
            'doctors' => $formattedDoctors,
            'listings' => $formattedListings,
            'filters' => [
                'q' => $query,
                'district' => $district ?? '',
                'specialty' => $specialty ?? '',
                'day' => $day !== null && $day !== '' ? (int) $day : '',
                'service' => $service ?? '',
                'tab' => in_array($tab, ['doctors', 'clinics'], true) ? $tab : 'doctors',
                'lat' => $lat,
                'lng' => $lng,
            ],
            'districts' => config('medvisit_public.directory.districts', []),
            'specialties' => $availableSpecialties,
            'fixedServices' => config('medvisit_public.directory.fixed_services', []),
        ]);
    }

    /**
     * View Clinic Public Directory Profile (/clinics/{slug}).
     */
    public function showClinic(Request $request): Response
    {
        $slug = (string) $request->route('slug');

        $listing = DirectoryListing::active()
            ->where('slug', $slug)
            ->with(['activeDoctors'])
            ->firstOrFail();

        $doctors = $listing->activeDoctors->map(function (DirectoryDoctor $doc) {
            return [
                'id' => $doc->id,
                'name' => $doc->name,
                'title' => $doc->title,
                'full_title' => $doc->full_title,
                'specialty' => $doc->specialty,
                'slug' => $doc->slug,
                'photo_url' => $doc->photo_url,
                'min_fee_cents' => $doc->min_fee_cents,
                'formatted_fee' => $doc->formatted_fee,
                'session_schedules' => $doc->session_schedules ?? [],
                'booking_url' => $doc->booking_url,
            ];
        });

        return Inertia::render('Directory/ClinicProfile', [
            'listing' => [
                'id' => $listing->id,
                'name' => $listing->clinic_name,
                'slug' => $listing->slug,
                'district' => $listing->district,
                'city' => $listing->city,
                'address' => $listing->address,
                'latitude' => $listing->latitude,
                'longitude' => $listing->longitude,
                'phone' => $listing->phone,
                'whatsapp' => $listing->whatsapp,
                'logo_url' => $listing->logo_url,
                'description' => $listing->description,
                'services' => $listing->services ?? [],
                'online_booking_enabled' => $listing->online_booking_enabled,
                'subdomain_url' => $listing->subdomain_url,
                'doctor_count' => $listing->doctor_count,
            ],
            'doctors' => $doctors,
        ]);
    }

    /**
     * View Doctor Public Directory Profile (/doctors/{clinicSlug}/{doctorSlug}).
     */
    public function showDoctor(Request $request): Response
    {
        $clinicSlug = (string) $request->route('clinicSlug');
        $doctorSlug = (string) $request->route('doctorSlug');

        $listing = DirectoryListing::active()
            ->where('slug', $clinicSlug)
            ->firstOrFail();

        $normalizedDocSlug = preg_replace('/^(dr-)+/', '', $doctorSlug);

        $doctor = DirectoryDoctor::active()
            ->where('directory_listing_id', $listing->id)
            ->where(function ($query) use ($doctorSlug, $normalizedDocSlug) {
                $query->where('slug', $doctorSlug)
                    ->orWhere('slug', 'dr-'.$doctorSlug)
                    ->orWhere('slug', 'dr-'.$normalizedDocSlug)
                    ->orWhere('slug', 'dr-dr-'.$normalizedDocSlug)
                    ->orWhere('slug', $normalizedDocSlug);
            })
            ->firstOrFail();

        return Inertia::render('Directory/DoctorProfile', [
            'listing' => [
                'id' => $listing->id,
                'name' => $listing->clinic_name,
                'slug' => $listing->slug,
                'district' => $listing->district,
                'city' => $listing->city,
                'address' => $listing->address,
                'latitude' => $listing->latitude,
                'longitude' => $listing->longitude,
                'phone' => $listing->phone,
                'whatsapp' => $listing->whatsapp,
                'online_booking_enabled' => $listing->online_booking_enabled,
                'subdomain_url' => $listing->subdomain_url,
            ],
            'doctor' => [
                'id' => $doctor->id,
                'name' => $doctor->name,
                'title' => $doctor->title,
                'full_title' => $doctor->full_title,
                'specialty' => $doctor->specialty,
                'slug' => $doctor->slug,
                'photo_url' => $doctor->photo_url,
                'formatted_fee' => $doctor->formatted_fee,
                'session_schedules' => $doctor->session_schedules ?? [],
                'booking_url' => $doctor->booking_url,
            ],
        ]);
    }

    /**
     * Dynamic Sitemap (/sitemap.xml).
     */
    public function sitemap(): HttpResponse
    {
        $baseUrl = rtrim(config('app.url', 'https://medvisit.lk'), '/');

        $staticPages = [
            '',
            '/find',
            '/pricing',
            '/terms',
            '/refund-policy',
            '/dispute-policy',
            '/privacy-policy',
        ];

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'."\n";
        $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'."\n";

        // Static routes
        foreach ($staticPages as $path) {
            $xml .= "  <url>\n";
            $xml .= "    <loc>{$baseUrl}{$path}</loc>\n";
            $xml .= "    <changefreq>daily</changefreq>\n";
            $xml .= '    <priority>'.($path === '' ? '1.0' : '0.8')."</priority>\n";
            $xml .= "  </url>\n";
        }

        // Active clinic listings
        $listings = DirectoryListing::active()->with(['activeDoctors'])->get();

        foreach ($listings as $listing) {
            $updated = $listing->updated_at->toAtomString();
            $xml .= "  <url>\n";
            $xml .= "    <loc>{$baseUrl}/clinics/{$listing->slug}</loc>\n";
            $xml .= "    <lastmod>{$updated}</lastmod>\n";
            $xml .= "    <changefreq>weekly</changefreq>\n";
            $xml .= "    <priority>0.7</priority>\n";
            $xml .= "  </url>\n";

            foreach ($listing->activeDoctors as $doctor) {
                $docUpdated = $doctor->updated_at->toAtomString();
                $xml .= "  <url>\n";
                $xml .= "    <loc>{$baseUrl}/doctors/{$listing->slug}/{$doctor->slug}</loc>\n";
                $xml .= "    <lastmod>{$docUpdated}</lastmod>\n";
                $xml .= "    <changefreq>weekly</changefreq>\n";
                $xml .= "    <priority>0.6</priority>\n";
                $xml .= "  </url>\n";
            }
        }

        $xml .= '</urlset>';

        return response($xml, 200, [
            'Content-Type' => 'application/xml',
        ]);
    }

    /**
     * Compute Haversine distance in kilometers between two GPS coordinates.
     */
    private function calculateHaversineDistance(float $lat1, float $lon1, float $lat2, float $lon2): float
    {
        $earthRadiusKm = 6371.0;

        $dLat = deg2rad($lat2 - $lat1);
        $dLon = deg2rad($lon2 - $lon1);

        $a = sin($dLat / 2) * sin($dLat / 2) +
            cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
            sin($dLon / 2) * sin($dLon / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round($earthRadiusKm * $c, 1);
    }
}
