<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\ClinicPage;
use App\Models\DirectoryDoctor;
use App\Models\DirectoryListing;
use App\Models\Doctor;
use App\Models\Plan;
use App\Models\Tenant;

class SeoMeta
{
    /**
     * @param  array<string, mixed>|array<int, array<string, mixed>>  $jsonLd
     */
    public function __construct(
        public string $title,
        public string $description,
        public ?string $canonical = null,
        public ?string $ogTitle = null,
        public ?string $ogDescription = null,
        public ?string $ogUrl = null,
        public string $ogType = 'website',
        public ?string $ogImage = null,
        public ?string $ogImageAlt = null,
        public string $twitterCard = 'summary_large_image',
        public ?string $robots = null,
        public array $jsonLd = [],
    ) {
        $this->ogTitle = $this->ogTitle ?: $this->title;
        $this->ogDescription = $this->ogDescription ?: $this->description;
        $this->ogUrl = $this->ogUrl ?: $this->canonical;
        $this->ogImage = $this->ogImage ?: self::defaultOgImage();
        $this->ogImageAlt = $this->ogImageAlt ?: $this->title;
    }

    public static function defaultOgImage(): string
    {
        return self::centralUrl('/og/medvisit-default.png');
    }

    /**
     * Resolve an absolute central platform URL.
     * In production (APP_ENV=production), always uses https and the configured public domain (e.g. medvisit.lk).
     * Root URLs always have a trailing slash (e.g. https://medvisit.lk/).
     */
    public static function centralUrl(string $path = ''): string
    {
        $isProduction = app()->environment('production') || config('app.env') === 'production';
        $cleanPath = ltrim($path, '/');

        if ($isProduction) {
            $baseDomain = config('medvisit.public_domain', 'medvisit.lk');

            return 'https://'.$baseDomain.($cleanPath !== '' ? "/{$cleanPath}" : '/');
        }

        $appUrl = config('app.url', 'http://localhost');

        return rtrim((string) $appUrl, '/').($cleanPath !== '' ? "/{$cleanPath}" : '/');
    }

    /**
     * Format a city and district, avoiding duplicate strings like "Colombo, Colombo".
     */
    public static function formatLocation(?string $city, ?string $district): string
    {
        $city = trim((string) $city);
        $district = trim((string) $district);

        if ($city === '') {
            return $district;
        }

        if ($district === '' || strcasecmp($city, $district) === 0) {
            return $city;
        }

        return "{$city}, {$district}";
    }

    /**
     * Map clinical specialties / titles to official schema.org MedicalSpecialty enums.
     * Returns null if unmapped so non-standard strings or titles are omitted from MedicalClinic.
     */
    public static function mapToSchemaMedicalSpecialty(string $specialty): ?string
    {
        $clean = preg_replace('/^(consultant|senior consultant|specialist|dr\.?|doctor|general)\s+/i', '', trim($specialty));
        $lower = strtolower((string) $clean);

        return match (true) {
            str_contains($lower, 'cardio') => 'Cardiovascular',
            str_contains($lower, 'pediatr') || str_contains($lower, 'child') => 'Pediatric',
            str_contains($lower, 'dermat') || str_contains($lower, 'skin') => 'Dermatology',
            str_contains($lower, 'general') || str_contains($lower, 'opd') || str_contains($lower, 'family') || str_contains($lower, 'primary') => 'PrimaryCare',
            str_contains($lower, 'gyn') || str_contains($lower, 'obs') => 'Gynecologic',
            str_contains($lower, 'neuro') => 'Neurologic',
            str_contains($lower, 'eye') || str_contains($lower, 'ophthalm') || str_contains($lower, 'optom') => 'Ophthalmic',
            str_contains($lower, 'ortho') => 'Orthopedic',
            str_contains($lower, 'psych') => 'Psychiatric',
            str_contains($lower, 'surg') => 'Surgical',
            str_contains($lower, 'dent') => 'Dentistry',
            str_contains($lower, 'ent') || str_contains($lower, 'otolar') => 'Otolaryngologic',
            str_contains($lower, 'gastro') => 'Gastroenterologic',
            str_contains($lower, 'endocrin') || str_contains($lower, 'diabet') => 'Endocrine',
            str_contains($lower, 'oncol') || str_contains($lower, 'cancer') => 'Oncologic',
            str_contains($lower, 'pulmon') || str_contains($lower, 'respirat') || str_contains($lower, 'chest') => 'Pulmonary',
            str_contains($lower, 'urolog') => 'Urologic',
            str_contains($lower, 'nephrol') || str_contains($lower, 'kidney') => 'Renal',
            str_contains($lower, 'rheumat') => 'Rheumatologic',
            default => null,
        };
    }

    /**
     * Central Homepage SEO
     */
    public static function forHome(): self
    {
        $title = 'MedVisit — Smart Clinic Management & Doctor Channeling for Sri Lanka';
        $description = 'Modern OPD clinic management software built for Sri Lankan clinics. Live queue TV display, doctor channeling tokens, digital prescriptions, inventory & billing.';
        $canonical = self::centralUrl('/');
        $ogImage = self::defaultOgImage();

        $plans = Plan::where('is_active', true)
            ->where('is_public', true)
            ->orderBy('price_cents', 'asc')
            ->get();

        $offers = $plans->map(function (Plan $plan) {
            $priceLkr = (int) round($plan->price_cents / 100);

            return [
                '@type' => 'Offer',
                'name' => $plan->name,
                'price' => (string) $priceLkr,
                'priceCurrency' => 'LKR',
                'priceSpecification' => [
                    '@type' => 'UnitPriceSpecification',
                    'price' => (string) $priceLkr,
                    'priceCurrency' => 'LKR',
                    'unitText' => 'MONTH',
                ],
                'description' => $plan->description ?: "{$plan->name} tier for Sri Lankan medical clinics",
            ];
        })->values()->all();

        $bizAddress = config('medvisit.organization.address', [
            'locality' => 'Kayts',
            'region' => 'Jaffna',
            'country' => 'LK',
        ]);

        $organization = [
            '@context' => 'https://schema.org',
            '@type' => 'Organization',
            'name' => 'MedVisit',
            'url' => $canonical,
            'logo' => self::centralUrl('/images/medvisit-logo.png'),
            'description' => 'Smart clinic management and online doctor channeling platform for Sri Lanka.',
            'address' => [
                '@type' => 'PostalAddress',
                'addressLocality' => (string) ($bizAddress['locality'] ?? 'Kayts'),
                'addressRegion' => (string) ($bizAddress['region'] ?? 'Jaffna'),
                'addressCountry' => (string) ($bizAddress['country'] ?? 'LK'),
            ],
            'contactPoint' => [
                '@type' => 'ContactPoint',
                'telephone' => (string) config('medvisit_public.business.phone_raw', '+94701291688'),
                'contactType' => 'customer support',
                'availableLanguage' => ['English', 'Sinhala', 'Tamil'],
            ],
        ];

        $softwareApp = [
            '@context' => 'https://schema.org',
            '@type' => 'SoftwareApplication',
            'name' => 'MedVisit',
            'applicationCategory' => 'HealthApplication',
            'operatingSystem' => 'Web Browser, Cloud',
            'url' => $canonical,
            'description' => $description,
            'offers' => $offers,
        ];

        return new self(
            title: $title,
            description: $description,
            canonical: $canonical,
            ogType: 'website',
            ogImage: $ogImage,
            jsonLd: [$organization, $softwareApp],
        );
    }

    /**
     * Pricing Page SEO
     */
    public static function forPricing(): self
    {
        $title = 'Pricing — MedVisit';
        $description = 'Transparent monthly plans for Sri Lankan medical practices and dispensaries. Free 3-month launch offer available. No lock-in contracts.';
        $canonical = self::centralUrl('/pricing');

        $plans = Plan::where('is_active', true)
            ->where('is_public', true)
            ->orderBy('price_cents', 'asc')
            ->get();

        $offers = $plans->map(function (Plan $plan) {
            $priceLkr = (int) round($plan->price_cents / 100);

            return [
                '@type' => 'Offer',
                'name' => $plan->name,
                'price' => (string) $priceLkr,
                'priceCurrency' => 'LKR',
                'priceSpecification' => [
                    '@type' => 'UnitPriceSpecification',
                    'price' => (string) $priceLkr,
                    'priceCurrency' => 'LKR',
                    'unitText' => 'MONTH',
                ],
                'description' => $plan->description ?: "{$plan->name} subscription tier",
            ];
        })->values()->all();

        $productSchema = [
            '@context' => 'https://schema.org',
            '@type' => 'SoftwareApplication',
            'name' => 'MedVisit Clinic Management Software',
            'applicationCategory' => 'HealthApplication',
            'operatingSystem' => 'Web Browser, Cloud',
            'url' => $canonical,
            'description' => $description,
            'offers' => $offers,
        ];

        return new self(
            title: $title,
            description: $description,
            canonical: $canonical,
            ogType: 'website',
            ogImage: self::defaultOgImage(),
            jsonLd: [$productSchema],
        );
    }

    /**
     * Directory Find Care (/find) SEO
     */
    public static function forFind(): self
    {
        $title = 'Find Doctors & Medical Clinics in Sri Lanka — MedVisit';
        $description = 'Search verified medical practitioners, OPD channeling sessions, and clinics across Sri Lanka. Check real-time doctor timetables and book appointment tokens instantly.';
        $canonical = self::centralUrl('/find');

        return new self(
            title: $title,
            description: $description,
            canonical: $canonical,
            ogType: 'website',
            ogImage: self::defaultOgImage(),
        );
    }

    /**
     * Templates Showcase (/templates) SEO
     */
    public static function forTemplates(): self
    {
        $title = 'Designer Clinic Website Templates — MedVisit';
        $description = 'Browse beautiful, high-converting animated website templates crafted specifically for Sri Lankan medical centers, specialist suites, family practices, and dental clinics.';
        $canonical = self::centralUrl('/templates');

        return new self(
            title: $title,
            description: $description,
            canonical: $canonical,
            ogType: 'website',
            ogImage: self::defaultOgImage(),
        );
    }

    /**
     * Legal Policies SEO
     */
    public static function forLegal(string $title, string $description, string $path): self
    {
        $canonical = str_starts_with($path, 'http') ? $path : self::centralUrl($path);

        return new self(
            title: "{$title} — MedVisit",
            description: $description,
            canonical: $canonical,
            ogType: 'article',
            ogImage: self::defaultOgImage(),
        );
    }

    /**
     * Directory Clinic Profile (/clinics/{slug}) SEO
     */
    public static function forDirectoryClinic(DirectoryListing $listing): self
    {
        $location = self::formatLocation($listing->city, $listing->district);
        $locationSuffix = $location !== '' ? " in {$location}" : '';
        $bookingAction = $listing->online_booking_enabled ? 'Book online tokens directly.' : 'Call the clinic directly to book.';

        $title = "{$listing->clinic_name} — Clinic Channeling & Doctor Schedule";
        $description = "View doctor appointment schedules, consultation fees, and channeling at {$listing->clinic_name}{$locationSuffix}. {$bookingAction}";
        $canonical = self::centralUrl('/clinics/'.$listing->slug);

        // Share image priority: clinic share image -> fallback to default
        $ogImage = null;
        if ($listing->tenant) {
            $ogImage = $listing->tenant->website_share_image ?: $listing->tenant->url('/share-image.png');
        } elseif (! empty($listing->slug)) {
            $ogImage = Tenant::urlForSubdomain((string) $listing->slug, '/share-image.png');
        }
        $ogImage = $ogImage ?: self::defaultOgImage();

        $schema = [
            '@context' => 'https://schema.org',
            '@type' => 'MedicalClinic',
            'name' => $listing->clinic_name,
            'description' => $listing->description ?: "Medical clinic{$locationSuffix}, Sri Lanka",
            'url' => $listing->subdomain_url ?: $canonical,
        ];

        if (! empty($listing->phone)) {
            $schema['telephone'] = $listing->phone;
        }

        if (! empty($ogImage)) {
            $schema['image'] = $ogImage;
        }

        $address = [
            '@type' => 'PostalAddress',
            'addressCountry' => 'LK',
        ];
        if (! empty($listing->city)) {
            $address['addressLocality'] = $listing->city;
        }
        if (! empty($listing->district)) {
            $address['addressRegion'] = $listing->district;
        }
        if (! empty($listing->address)) {
            $address['streetAddress'] = $listing->address;
        }
        $schema['address'] = $address;

        if ($listing->latitude !== null && $listing->longitude !== null) {
            $schema['geo'] = [
                '@type' => 'GeoCoordinates',
                'latitude' => (float) $listing->latitude,
                'longitude' => (float) $listing->longitude,
            ];
        }

        // Map doctors' specialties to valid Schema.org MedicalSpecialty enums (no doctor titles)
        $mappedSpecialties = $listing->activeDoctors
            ->pluck('specialty')
            ->filter()
            ->map(fn ($spec) => self::mapToSchemaMedicalSpecialty((string) $spec))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (! empty($mappedSpecialties)) {
            $schema['medicalSpecialty'] = count($mappedSpecialties) === 1 ? $mappedSpecialties[0] : $mappedSpecialties;
        }

        // Opening hours if available on associated tenant
        $tenant = $listing->tenant;
        if ($tenant && ! empty($tenant->opening_hours)) {
            $openingSpec = self::parseOpeningHoursSpecification($tenant->opening_hours);
            if (! empty($openingSpec)) {
                $schema['openingHoursSpecification'] = $openingSpec;
            } else {
                $schema['openingHours'] = (string) $tenant->opening_hours;
            }
        }

        return new self(
            title: $title,
            description: $description,
            canonical: $canonical,
            ogType: 'website',
            ogImage: $ogImage,
            jsonLd: [$schema],
        );
    }

    /**
     * Directory Doctor Profile (/doctors/{clinicSlug}/{doctorSlug}) SEO
     */
    public static function forDirectoryDoctor(DirectoryListing $listing, DirectoryDoctor $doctor): self
    {
        $location = self::formatLocation($listing->city, $listing->district);
        $locationSuffix = $location !== '' ? ", {$location}" : '';
        $bookingAction = $listing->online_booking_enabled ? 'Book online directly.' : 'Call the clinic to book.';

        $title = "{$doctor->full_title} ({$doctor->specialty}) — {$listing->clinic_name}{$locationSuffix}";
        $description = "Consultation schedules, channeling tokens, and appointments for {$doctor->full_title} at {$listing->clinic_name}{$locationSuffix}. {$bookingAction}";
        $canonical = self::centralUrl("/doctors/{$listing->slug}/{$doctor->slug}");
        $ogImage = $doctor->photo_url ?: ($listing->tenant ? ($listing->tenant->website_share_image ?: $listing->tenant->url('/share-image.png')) : self::defaultOgImage());

        $clinicAddress = [
            '@type' => 'PostalAddress',
            'addressCountry' => 'LK',
        ];
        if (! empty($listing->city)) {
            $clinicAddress['addressLocality'] = $listing->city;
        }
        if (! empty($listing->district)) {
            $clinicAddress['addressRegion'] = $listing->district;
        }
        if (! empty($listing->address)) {
            $clinicAddress['streetAddress'] = $listing->address;
        }

        $worksFor = [
            '@type' => 'MedicalClinic',
            'name' => $listing->clinic_name,
            'address' => $clinicAddress,
            'url' => $listing->subdomain_url ?: self::centralUrl('/clinics/'.$listing->slug),
        ];
        if (! empty($listing->phone)) {
            $worksFor['telephone'] = $listing->phone;
        }

        // Doctor title stays on Physician
        $physicianSchema = [
            '@context' => 'https://schema.org',
            '@type' => 'Physician',
            'name' => $doctor->full_title,
            'url' => $canonical,
            'worksFor' => $worksFor,
        ];

        if (! empty($doctor->specialty)) {
            $physicianSchema['medicalSpecialty'] = $doctor->specialty;
        }
        if (! empty($doctor->photo_url)) {
            $physicianSchema['image'] = $doctor->photo_url;
        }

        return new self(
            title: $title,
            description: $description,
            canonical: $canonical,
            ogType: 'profile',
            ogImage: $ogImage,
            jsonLd: [$physicianSchema],
        );
    }

    /**
     * Clinic Public Subdomain Home ({clinic}.medvisit.lk/) SEO
     */
    public static function forTenantHome(Tenant $tenant, ?ClinicPage $page = null): self
    {
        $clinicName = ClinicWebsite::clinicName($tenant);
        $location = self::formatLocation(ClinicWebsite::city($tenant), (string) ($tenant->district ?? ''));
        $locationSuffix = $location !== '' ? ", {$location}" : '';

        $title = $page?->seo_title ?: ($tenant->seo_title ?: ClinicWebsite::defaultSeoTitle($tenant));
        $description = $page?->seo_description ?: ($tenant->seo_description ?: ClinicWebsite::defaultSeoDescription($tenant));
        $canonical = $tenant->url('/');
        $ogImage = $tenant->website_share_image ?: $tenant->url('/share-image.png');

        $schema = [
            '@context' => 'https://schema.org',
            '@type' => 'MedicalClinic',
            'name' => $clinicName,
            'url' => $canonical,
            'description' => $description,
        ];

        if (! empty($tenant->phone)) {
            $schema['telephone'] = $tenant->phone;
        }

        $image = $ogImage ?: $tenant->logo_url;
        if (! empty($image)) {
            $schema['image'] = $image;
        }

        $address = [
            '@type' => 'PostalAddress',
            'addressCountry' => 'LK',
        ];
        $city = ClinicWebsite::city($tenant);
        if ($city !== '') {
            $address['addressLocality'] = $city;
        }
        if (! empty($tenant->district)) {
            $address['addressRegion'] = (string) $tenant->district;
        }
        if (! empty($tenant->address_line) || ! empty($tenant->address)) {
            $address['streetAddress'] = (string) ($tenant->address_line ?: $tenant->address);
        }
        $schema['address'] = $address;

        if ($tenant->directory_latitude !== null && $tenant->directory_longitude !== null) {
            $schema['geo'] = [
                '@type' => 'GeoCoordinates',
                'latitude' => (float) $tenant->directory_latitude,
                'longitude' => (float) $tenant->directory_longitude,
            ];
        }

        // Map specialties to Schema.org MedicalSpecialty enums (no doctor titles)
        $mappedSpecialties = Doctor::where('tenant_id', $tenant->id)
            ->where('is_active', true)
            ->whereNotNull('specialty')
            ->where('specialty', '!=', '')
            ->distinct()
            ->orderBy('specialty')
            ->pluck('specialty')
            ->map(fn ($spec) => self::mapToSchemaMedicalSpecialty((string) $spec))
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (! empty($mappedSpecialties)) {
            $schema['medicalSpecialty'] = count($mappedSpecialties) === 1 ? $mappedSpecialties[0] : $mappedSpecialties;
        }

        if (! empty($tenant->opening_hours)) {
            $openingSpec = self::parseOpeningHoursSpecification($tenant->opening_hours);
            if (! empty($openingSpec)) {
                $schema['openingHoursSpecification'] = $openingSpec;
            } else {
                $schema['openingHours'] = (string) $tenant->opening_hours;
            }
        }

        $robots = null;
        if ((bool) $tenant->is_demo || ! ($tenant->website_published ?? true) || $tenant->status !== 'active') {
            $robots = 'noindex, nofollow';
        }

        return new self(
            title: $title,
            description: $description,
            canonical: $canonical,
            ogType: 'website',
            ogImage: $ogImage,
            robots: $robots,
            jsonLd: [$schema],
        );
    }

    /**
     * Clinic Public Page ({clinic}.medvisit.lk/p/{slug}) SEO
     */
    public static function forTenantPage(Tenant $tenant, ClinicPage $page): self
    {
        $title = $page->seo_title ?: "{$page->title} — ".ClinicWebsite::clinicName($tenant);
        $description = $page->seo_description ?: ClinicWebsite::defaultSeoDescription($tenant);
        $canonical = $tenant->url($page->publicUrl());
        $ogImage = $tenant->website_share_image ?: $tenant->url('/share-image.png');

        $robots = null;
        if ((bool) $tenant->is_demo || ! $page->is_published || ! ($tenant->website_published ?? true) || $tenant->status !== 'active') {
            $robots = 'noindex, nofollow';
        }

        return new self(
            title: $title,
            description: $description,
            canonical: $canonical,
            ogType: 'article',
            ogImage: $ogImage,
            robots: $robots,
        );
    }

    /**
     * Clinic Public Booking ({clinic}.medvisit.lk/book) SEO
     */
    public static function forTenantBooking(Tenant $tenant, ?Doctor $doctor = null): self
    {
        $clinicName = ClinicWebsite::clinicName($tenant);
        $title = $doctor
            ? "Book Appointment with {$doctor->full_title} — {$clinicName}"
            : "Book a Doctor Channeling Token — {$clinicName}";
        $description = $doctor
            ? "Book a doctor channeling appointment with {$doctor->full_title} ({$doctor->specialty}) at {$clinicName}. Live queue status and instant token booking."
            : "Book OPD appointments and doctor channeling tokens online at {$clinicName}. View active sessions, consultation fees, and doctor timetables.";
        $canonical = $tenant->url('/book'.($doctor ? "/{$doctor->slug}" : ''));
        $ogImage = $doctor?->photo_url ?: ($tenant->website_share_image ?: $tenant->url('/share-image.png'));

        $isBookingEnabled = (bool) ($tenant->online_booking_enabled ?? true);
        $robots = null;
        if ((bool) $tenant->is_demo || ! ($tenant->website_published ?? true) || $tenant->status !== 'active' || ! $isBookingEnabled) {
            $robots = 'noindex, nofollow';
        }

        return new self(
            title: $title,
            description: $description,
            canonical: $canonical,
            ogType: 'website',
            ogImage: $ogImage,
            robots: $robots,
        );
    }

    /**
     * Clinic Live Queue ({clinic}.medvisit.lk/queue) SEO (Always noindex)
     */
    public static function forTenantQueue(Tenant $tenant): self
    {
        $clinicName = ClinicWebsite::clinicName($tenant);

        return new self(
            title: "Live Queue Status — {$clinicName}",
            description: "Live queue display and current token numbers at {$clinicName}.",
            canonical: $tenant->url('/queue'),
            ogType: 'website',
            ogImage: $tenant->website_share_image ?: $tenant->url('/share-image.png'),
            robots: 'noindex, nofollow',
        );
    }

    /**
     * Clinic Token Status ({clinic}.medvisit.lk/tokens/{token}/status) SEO (Always noindex)
     */
    public static function forTenantTokenStatus(Tenant $tenant): self
    {
        $clinicName = ClinicWebsite::clinicName($tenant);

        return new self(
            title: "Appointment Token Status — {$clinicName}",
            description: "Appointment token details and real-time status at {$clinicName}.",
            canonical: $tenant->url('/'),
            ogType: 'website',
            ogImage: $tenant->website_share_image ?: $tenant->url('/share-image.png'),
            robots: 'noindex, nofollow',
        );
    }

    /**
     * Parse text opening hours like "Mon – Sat: 08:00 AM – 08:00 PM | Sun: 08:00 AM – 02:00 PM"
     * into schema.org OpeningHoursSpecification array.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function parseOpeningHoursSpecification(string $hoursText): array
    {
        $specs = [];
        $parts = explode('|', $hoursText);

        $dayMap = [
            'mon' => 'Monday',
            'tue' => 'Tuesday',
            'wed' => 'Wednesday',
            'thu' => 'Thursday',
            'fri' => 'Friday',
            'sat' => 'Saturday',
            'sun' => 'Sunday',
        ];

        $allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

        foreach ($parts as $part) {
            $part = trim($part);
            if ($part === '' || ! str_contains($part, ':')) {
                continue;
            }

            [$daysPart, $timesPart] = explode(':', $part, 2);
            $daysPart = trim($daysPart);
            $timesPart = trim($timesPart);

            // Resolve days
            $selectedDays = [];
            if (preg_match('/(mon|tue|wed|thu|fri|sat|sun)\w*\s*[-–—to]+\s*(mon|tue|wed|thu|fri|sat|sun)\w*/i', $daysPart, $matches)) {
                $startDay = $dayMap[strtolower(substr($matches[1], 0, 3))] ?? null;
                $endDay = $dayMap[strtolower(substr($matches[2], 0, 3))] ?? null;

                if ($startDay && $endDay) {
                    $startIdx = array_search($startDay, $allDays, true);
                    $endIdx = array_search($endDay, $allDays, true);
                    if ($startIdx !== false && $endIdx !== false) {
                        if ($startIdx <= $endIdx) {
                            $selectedDays = array_slice($allDays, $startIdx, $endIdx - $startIdx + 1);
                        } else {
                            $selectedDays = array_merge(array_slice($allDays, $startIdx), array_slice($allDays, 0, $endIdx + 1));
                        }
                    }
                }
            } elseif (preg_match('/(mon|tue|wed|thu|fri|sat|sun)\w*/i', $daysPart, $matches)) {
                $singleDay = $dayMap[strtolower(substr($matches[1], 0, 3))] ?? null;
                if ($singleDay) {
                    $selectedDays = [$singleDay];
                }
            }

            // Resolve opens and closes
            $opens = null;
            $closes = null;
            if (preg_match('/(\d{1,2}:\d{2}\s*(?:AM|PM)?)\s*[-–—to]+\s*(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i', $timesPart, $timeMatches)) {
                $openTime = strtotime(trim($timeMatches[1]));
                $closeTime = strtotime(trim($timeMatches[2]));
                if ($openTime !== false && $closeTime !== false) {
                    $opens = date('H:i', $openTime);
                    $closes = date('H:i', $closeTime);
                }
            }

            if (! empty($selectedDays) && $opens && $closes) {
                $specs[] = [
                    '@type' => 'OpeningHoursSpecification',
                    'dayOfWeek' => count($selectedDays) === 1 ? $selectedDays[0] : $selectedDays,
                    'opens' => $opens,
                    'closes' => $closes,
                ];
            }
        }

        return $specs;
    }

    /**
     * Convert to array for Blade view data (->withViewData(['seo' => ...]))
     *
     * @return array<string, mixed>
     */
    public function toViewData(): array
    {
        return [
            'title' => $this->title,
            'description' => $this->description,
            'canonical' => $this->canonical,
            'og_title' => $this->ogTitle,
            'og_description' => $this->ogDescription,
            'og_url' => $this->ogUrl,
            'og_type' => $this->ogType,
            'og_image' => $this->ogImage,
            'og_image_alt' => $this->ogImageAlt,
            'twitter_card' => $this->twitterCard,
            'robots' => $this->robots,
            'json_ld' => $this->jsonLd,
        ];
    }

    /**
     * Convert to array for Inertia page props if needed
     *
     * @return array<string, mixed>
     */
    public function toProps(): array
    {
        return $this->toViewData();
    }
}
