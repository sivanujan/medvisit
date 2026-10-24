<?php

declare(strict_types=1);

namespace App\Support;

use App\Models\Doctor;
use App\Models\DoctorSession;
use App\Models\Tenant;
use Carbon\Carbon;
use Illuminate\Support\Str;

/**
 * The clinic's simple website (home page sections + look & feel).
 *
 * Owns the neutral defaults (built only from the clinic's own data), the draft/live
 * split, the publish checklist, the real-number stats and the clean-up of the old
 * invented default copy.
 */
class ClinicWebsite
{
    /** Sections every home page has, in default order. "Auto" sections fill themselves from data. */
    public const CORE_SECTIONS = ['hero', 'about', 'doctors', 'sessions', 'services', 'hours', 'contact', 'footer'];

    /** Optional sections the owner can add (all have page-builder equivalents). */
    public const EXTRA_SECTIONS = ['gallery', 'faq', 'announcement', 'text'];

    public const THEMES = ['medvisit-teal', 'ocean-blue', 'emerald-health', 'royal-purple', 'slate-luxury'];

    public const HERO_STYLES = ['gradient', 'photo', 'split', 'minimal'];

    public const FONTS = ['poppins', 'nunito', 'serif'];

    public const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

    /**
     * Exact strings from the old built-in defaults that made claims about the clinic.
     * section id => field => old string. Replaced by {@see neutralFor()} (often empty).
     */
    public const LEGACY_STRINGS = [
        'hero' => [
            'title' => 'Compassionate Care, Specialist Excellence',
            'subtitle' => 'Book specialist channeling appointments with Sri Lanka’s leading medical practitioners. Zero waiting lounge delays with real-time digital queue updates.',
            'badge' => 'Open Daily • Specialist Channeling',
            'cta_text' => 'Book Appointment Online',
        ],
        'about' => [
            'title' => 'Your Family’s Trusted Medical Center',
            'description' => 'Providing premier outpatient healthcare, specialist channeling, and diagnostic medical services with international safety protocols and Sri Lankan warmth.',
        ],
        'doctors' => [
            'title' => 'Meet Our Medical Specialists',
            'subtitle' => 'SLMC verified consultants, surgeons, and physicians practicing at our modern medical center.',
        ],
        'sessions' => [
            'title' => 'Channeling Sessions This Week',
            'subtitle' => 'Live upcoming schedules with real-time token capacity and consultation suites.',
        ],
        'services' => [
            'title' => 'Comprehensive Medical Services',
            'subtitle' => 'From preventive healthcare to specialist consultation and diagnostic labs.',
        ],
        'hours' => [
            'title' => 'Clinical Hours & Availability',
            'emergency_note' => 'Channeling appointments operate according to individual doctor schedule suites.',
        ],
        'contact' => [
            'title' => 'Visit Our Medical Center',
            'subtitle' => 'Centrally located with dedicated parking and accessible wheelchair facilities.',
            'map_link' => 'https://maps.google.com',
        ],
    ];

    /** Old made-up stat fields; stats now come only from real data. */
    public const LEGACY_STAT_FIELDS = [
        'stat_1_number', 'stat_1_label', 'stat_2_number', 'stat_2_label', 'stat_3_number', 'stat_3_label',
    ];

    /** Old hard-coded hours; opening hours are now a weekly schedule the owner fills in. */
    public const LEGACY_HOURS = [
        'weekdays' => '07:30 AM – 10:00 PM',
        'saturday' => '07:30 AM – 10:00 PM',
        'sunday' => '08:00 AM – 08:00 PM',
    ];

    public const LEGACY_SERVICE_NAMES = [
        'Specialist Doctor Channeling',
        'Clinical Laboratory & Pathology',
        'Digital ECG & Vitals Lounge',
        'Pharmacy & Prescription Dispensing',
    ];

    public const LEGACY_SEO_SUFFIX = '. Live queue monitoring and SLMC verified specialists.';

    // ------------------------------------------------------------------
    // Defaults
    // ------------------------------------------------------------------

    /**
     * Neutral default sections: only the clinic's own facts, nothing invented.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function defaults(Tenant $tenant): array
    {
        return array_map(fn (string $id) => self::defaultSection($id, $tenant), self::CORE_SECTIONS);
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaultSection(string $type, Tenant $tenant, ?string $id = null): array
    {
        $base = ['id' => $id ?? $type, 'type' => $type, 'enabled' => true];

        return $base + match ($type) {
            'hero' => [
                'title' => self::clinicName($tenant),
                'subtitle' => 'Book your channeling token online',
                'badge' => self::city($tenant),
                'cta_text' => 'Book a token',
                'image_url' => '',
            ],
            'about' => ['title' => 'About '.self::clinicName($tenant), 'description' => '', 'image_url' => '', 'show_stats' => true],
            'doctors' => ['title' => 'Our doctors', 'subtitle' => '', 'layout' => 'grid', 'limit' => 6],
            'sessions' => ['title' => 'This week\'s sessions', 'subtitle' => 'Book a token for an upcoming session.', 'layout' => 'cards', 'limit' => 6],
            'services' => ['title' => 'Services', 'subtitle' => '', 'items' => []],
            'hours' => ['title' => 'Opening hours', 'days' => self::emptyWeek(), 'note' => ''],
            'contact' => [
                'title' => 'Contact us', 'subtitle' => '', 'phone' => '', 'whatsapp' => '', 'email' => '',
                'address' => '', 'latitude' => null, 'longitude' => null, 'show_map' => true,
            ],
            'footer' => ['notice' => 'Doctor schedules can change. Token times are approximate.'],
            'gallery' => ['title' => 'Gallery', 'images' => []],
            'faq' => ['title' => 'Questions', 'items' => []],
            'announcement' => ['title' => '', 'message' => '', 'tone' => 'info'],
            'text' => ['title' => '', 'body' => ''],
            default => [],
        };
    }

    /**
     * @return array<int, array{day: string, open: bool, ranges: array<int, array{from: string, to: string}>}>
     */
    public static function emptyWeek(): array
    {
        return array_map(fn (string $d) => ['day' => $d, 'open' => false, 'ranges' => []], self::DAYS);
    }

    /**
     * @return array<string, mixed>
     */
    public static function defaultLook(Tenant $tenant): array
    {
        $theme = in_array($tenant->website_theme, self::THEMES, true) ? $tenant->website_theme : 'medvisit-teal';

        return [
            'theme' => $theme,
            'hero_style' => 'gradient',
            'brand_color' => null,
            'font' => 'poppins',
            'button_style' => 'rounded',
            'mode' => 'light',
        ];
    }

    // ------------------------------------------------------------------
    // Normalising + draft/live
    // ------------------------------------------------------------------

    /**
     * Make stored sections safe to render and edit: known types only, every core section
     * present (missing ones appended), unknown fields dropped from typed lists.
     *
     * @param  array<int, mixed>|null  $sections
     * @return array<int, array<string, mixed>>
     */
    public static function normalize(?array $sections, Tenant $tenant): array
    {
        if (! is_array($sections) || $sections === []) {
            return self::defaults($tenant);
        }

        $out = [];
        $seen = [];
        foreach ($sections as $section) {
            if (! is_array($section) || empty($section['id'])) {
                continue;
            }
            $id = (string) $section['id'];
            $type = (string) ($section['type'] ?? $id);
            if (! in_array($type, [...self::CORE_SECTIONS, ...self::EXTRA_SECTIONS], true) || isset($seen[$id])) {
                continue;
            }
            $seen[$id] = true;
            $default = self::defaultSection($type, $tenant, $id);
            $merged = array_merge($default, $section, ['id' => $id, 'type' => $type]);
            // Requests turn "" into null; keep text fields as strings so drafts compare cleanly.
            foreach ($default as $key => $value) {
                if (is_string($value) && $merged[$key] === null) {
                    $merged[$key] = '';
                }
            }
            $merged['enabled'] = (bool) ($merged['enabled'] ?? true);
            unset($merged['name']);
            $out[] = $merged;
        }

        foreach (self::CORE_SECTIONS as $type) {
            if (! isset($seen[$type])) {
                $out[] = self::defaultSection($type, $tenant);
            }
        }

        return $out;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public static function liveSections(Tenant $tenant): array
    {
        return self::normalize($tenant->website_sections, $tenant);
    }

    /**
     * The draft falls back to the live sections until the owner first edits.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function draftSections(Tenant $tenant): array
    {
        return self::normalize($tenant->website_sections_draft ?? $tenant->website_sections, $tenant);
    }

    /**
     * @return array<string, mixed>
     */
    public static function liveLook(Tenant $tenant): array
    {
        return self::normalizeLook($tenant->website_look, $tenant);
    }

    /**
     * @return array<string, mixed>
     */
    public static function draftLook(Tenant $tenant): array
    {
        return self::normalizeLook($tenant->website_look_draft ?? $tenant->website_look, $tenant);
    }

    /**
     * @param  mixed  $look
     * @return array<string, mixed>
     */
    public static function normalizeLook($look, Tenant $tenant): array
    {
        $defaults = self::defaultLook($tenant);
        $look = is_array($look) ? $look : [];
        $out = array_merge($defaults, array_intersect_key($look, $defaults));

        $out['theme'] = in_array($out['theme'], self::THEMES, true) ? $out['theme'] : $defaults['theme'];
        $out['hero_style'] = in_array($out['hero_style'], self::HERO_STYLES, true) ? $out['hero_style'] : 'gradient';
        $out['font'] = in_array($out['font'], self::FONTS, true) ? $out['font'] : 'poppins';
        $out['button_style'] = $out['button_style'] === 'pill' ? 'pill' : 'rounded';
        $out['mode'] = $out['mode'] === 'dark' ? 'dark' : 'light';
        $out['brand_color'] = is_string($out['brand_color']) && preg_match('/^#[0-9a-fA-F]{6}$/', $out['brand_color'])
            ? strtoupper($out['brand_color'])
            : null;

        return $out;
    }

    /**
     * Number of differences between draft and live: one per changed, added or removed
     * section (order changes count once), plus one for look & feel.
     */
    public static function changeCount(Tenant $tenant): int
    {
        $draft = self::draftSections($tenant);
        $live = self::liveSections($tenant);
        $liveById = collect($live)->keyBy('id');
        $draftById = collect($draft)->keyBy('id');

        $count = 0;
        foreach ($draft as $section) {
            $old = $liveById->get($section['id']);
            if ($old === null || self::canonical($old) !== self::canonical($section)) {
                $count++;
            }
        }
        $count += $liveById->keys()->diff($draftById->keys())->count();

        $sameIds = $liveById->keys()->intersect($draftById->keys())->values();
        $liveOrder = collect($live)->pluck('id')->filter(fn ($id) => $sameIds->contains($id))->values();
        $draftOrder = collect($draft)->pluck('id')->filter(fn ($id) => $sameIds->contains($id))->values();
        if ($liveOrder->all() !== $draftOrder->all()) {
            $count++;
        }

        if (self::canonical(self::draftLook($tenant)) !== self::canonical(self::liveLook($tenant))) {
            $count++;
        }

        return $count;
    }

    /**
     * Copy the draft to the live site.
     */
    public static function publish(Tenant $tenant): void
    {
        $look = self::draftLook($tenant);
        $tenant->website_sections = self::draftSections($tenant);
        $tenant->website_sections_draft = null;
        $tenant->website_look = $look;
        $tenant->website_look_draft = null;
        $tenant->website_theme = $look['theme'];
        $tenant->website_published = true;
        $tenant->website_published_at = now()->toIso8601String();
        $tenant->save();
    }

    private static function canonical(mixed $value): string
    {
        if (is_array($value)) {
            if (! array_is_list($value)) {
                ksort($value);
            }
            $value = array_map(fn ($v) => is_array($v) ? json_decode(self::canonical($v), true) : $v, $value);
        }

        return (string) json_encode($value);
    }

    // ------------------------------------------------------------------
    // Real data
    // ------------------------------------------------------------------

    /**
     * Stats shown on the site: real counts only. Zero values are left out.
     *
     * @return array<int, array{key: string, value: int, label: string}>
     */
    public static function stats(): array
    {
        $doctors = Doctor::where('is_active', true);
        $doctorCount = (clone $doctors)->count();
        $specialties = (clone $doctors)->whereNotNull('specialty')->where('specialty', '!=', '')
            ->distinct()->count('specialty');
        $today = Carbon::today('Asia/Colombo');
        $sessions = DoctorSession::whereBetween('session_date', [$today->toDateString(), $today->copy()->addDays(6)->toDateString()])
            ->whereNotIn('status', ['cancelled'])
            ->count();

        $stats = [
            ['key' => 'doctors', 'value' => $doctorCount, 'label' => $doctorCount === 1 ? 'Doctor' : 'Doctors'],
            ['key' => 'specialties', 'value' => $specialties, 'label' => $specialties === 1 ? 'Specialty' : 'Specialties'],
            ['key' => 'sessions', 'value' => $sessions, 'label' => $sessions === 1 ? 'Session this week' : 'Sessions this week'],
        ];

        return array_values(array_filter($stats, fn (array $s) => $s['value'] > 0));
    }

    /**
     * Ids of sections that have something to show. Used to hide empty sections on the
     * live site; the editor preview shows them with a "Placeholder — edit this" hint.
     *
     * @param  array<int, array<string, mixed>>  $sections
     * @param  array{doctors: int, sessions: int, stats: array<int, mixed>}  $data
     * @return array<int, string>
     */
    public static function visibleSectionIds(array $sections, array $data, Tenant $tenant): array
    {
        $visible = [];
        foreach ($sections as $s) {
            if (! ($s['enabled'] ?? true)) {
                continue;
            }
            $has = match ($s['type']) {
                'hero', 'footer' => true,
                'about' => trim((string) ($s['description'] ?? '')) !== '' || (($s['show_stats'] ?? true) && $data['stats'] !== []),
                'doctors' => $data['doctors'] > 0,
                'sessions' => $data['sessions'] > 0,
                'services' => self::nonEmptyItems($s['items'] ?? [], 'name') > 0,
                'hours' => collect($s['days'] ?? [])->contains(fn ($d) => ($d['open'] ?? false) && ! empty($d['ranges'])),
                'contact' => self::contactValue($s, 'phone', $tenant) !== '' || self::contactValue($s, 'address', $tenant) !== '',
                'gallery' => collect($s['images'] ?? [])->filter(fn ($i) => ! empty($i['url']))->isNotEmpty(),
                'faq' => self::nonEmptyItems($s['items'] ?? [], 'question') > 0,
                'announcement' => trim((string) ($s['message'] ?? '')) !== '',
                'text' => trim((string) ($s['body'] ?? '')) !== '',
                default => false,
            };
            if ($has) {
                $visible[] = (string) $s['id'];
            }
        }

        return $visible;
    }

    /**
     * A contact field from the section, falling back to the clinic record.
     */
    public static function contactValue(array $section, string $field, Tenant $tenant): string
    {
        $own = trim((string) ($section[$field] ?? ''));
        if ($own !== '') {
            return $own;
        }

        return trim((string) match ($field) {
            'phone' => $tenant->phone ?? '',
            'address' => $tenant->address ?? '',
            'whatsapp' => $tenant->whatsapp_number ?? '',
            'email' => $tenant->email ?? '',
            default => '',
        });
    }

    private static function nonEmptyItems(mixed $items, string $key): int
    {
        return collect(is_array($items) ? $items : [])->filter(fn ($i) => is_array($i) && trim((string) ($i[$key] ?? '')) !== '')->count();
    }

    // ------------------------------------------------------------------
    // Publish checklist
    // ------------------------------------------------------------------

    /**
     * Pre-publish checks. Only "blocking" items stop publishing.
     *
     * @param  array<int, array<string, mixed>>  $sections
     * @return array<int, array{key: string, label: string, ok: bool, blocking: bool, hint: string}>
     */
    public static function checklist(Tenant $tenant, array $sections): array
    {
        $byType = collect($sections)->keyBy('type');
        $contact = $byType->get('contact', []);
        $about = $byType->get('about', []);
        $hours = $byType->get('hours', []);

        $hasHours = collect($hours['days'] ?? [])->contains(fn ($d) => ($d['open'] ?? false) && ! empty($d['ranges']));
        $aboutEdited = trim((string) ($about['description'] ?? '')) !== '';

        return [
            ['key' => 'name', 'label' => 'Clinic name', 'ok' => trim((string) $tenant->name) !== '', 'blocking' => true,
                'hint' => 'Add your clinic name in Settings.'],
            ['key' => 'phone', 'label' => 'Phone number', 'ok' => self::contactValue($contact, 'phone', $tenant) !== '', 'blocking' => true,
                'hint' => 'Patients need a number to call. Add it in Contact & map.'],
            ['key' => 'logo', 'label' => 'Logo', 'ok' => ! empty($tenant->logo_url), 'blocking' => false,
                'hint' => 'Upload your logo in Look & feel.'],
            ['key' => 'address', 'label' => 'Address', 'ok' => self::contactValue($contact, 'address', $tenant) !== '', 'blocking' => false,
                'hint' => 'Add your address in Contact & map.'],
            ['key' => 'hours', 'label' => 'Opening hours', 'ok' => $hasHours, 'blocking' => false,
                'hint' => 'Set your weekly hours in Opening hours.'],
            ['key' => 'doctors', 'label' => 'At least one doctor on the site', 'ok' => Doctor::where('is_active', true)->exists(), 'blocking' => false,
                'hint' => 'Add a doctor in Doctors so patients can book.'],
            ['key' => 'about', 'label' => 'About text written', 'ok' => $aboutEdited, 'blocking' => false,
                'hint' => 'Write a few lines about your clinic in About.'],
        ];
    }

    /**
     * @param  array<int, array{ok: bool, blocking: bool}>  $checklist
     */
    public static function canPublish(array $checklist): bool
    {
        return collect($checklist)->every(fn ($c) => $c['ok'] || ! $c['blocking']);
    }

    // ------------------------------------------------------------------
    // SEO
    // ------------------------------------------------------------------

    public static function defaultSeoTitle(Tenant $tenant): string
    {
        $city = self::city($tenant);

        return self::clinicName($tenant).($city !== '' ? ' — '.$city : '').' | Book a channeling token';
    }

    public static function defaultSeoDescription(Tenant $tenant): string
    {
        $specialties = Doctor::where('is_active', true)->whereNotNull('specialty')->where('specialty', '!=', '')
            ->distinct()->orderBy('specialty')->limit(3)->pluck('specialty')->all();
        $city = self::city($tenant);

        $text = 'Book a channeling token online at '.self::clinicName($tenant).($city !== '' ? ', '.$city : '').'.';
        if ($specialties !== []) {
            $text .= ' '.implode(', ', $specialties).'.';
        }

        return $text.' See this week\'s doctor sessions and opening hours.';
    }

    // ------------------------------------------------------------------
    // Legacy clean-up
    // ------------------------------------------------------------------

    /**
     * Replace the old invented default strings with neutral ones.
     *
     * @param  array<int, mixed>|null  $sections
     * @return array{0: array<int, mixed>|null, 1: int} the cleaned sections and the number of fields changed
     */
    public static function replaceLegacy(?array $sections, Tenant $tenant): array
    {
        if (! is_array($sections)) {
            return [$sections, 0];
        }

        $changed = 0;
        foreach ($sections as $i => $section) {
            if (! is_array($section)) {
                continue;
            }
            $type = (string) ($section['type'] ?? $section['id'] ?? '');

            foreach (self::LEGACY_STRINGS[$type] ?? [] as $field => $old) {
                if (($section[$field] ?? null) === $old) {
                    $section[$field] = self::neutralFor($type, $field, $tenant);
                    $changed++;
                }
            }

            foreach (self::LEGACY_STAT_FIELDS as $field) {
                if (array_key_exists($field, $section)) {
                    unset($section[$field]);
                    $changed++;
                }
            }

            if ($type === 'hours') {
                foreach (self::LEGACY_HOURS as $field => $old) {
                    if (($section[$field] ?? null) === $old) {
                        unset($section[$field]);
                        $changed++;
                    }
                }
            }

            if ($type === 'services' && is_array($section['items'] ?? null)) {
                $before = count($section['items']);
                $section['items'] = array_values(array_filter(
                    $section['items'],
                    fn ($item) => ! (is_array($item) && in_array($item['name'] ?? null, self::LEGACY_SERVICE_NAMES, true)),
                ));
                $changed += $before - count($section['items']);
            }

            $sections[$i] = $section;
        }

        return [$sections, $changed];
    }

    private static function neutralFor(string $type, string $field, Tenant $tenant): string
    {
        $default = self::defaultSection($type, $tenant);

        return match ("{$type}.{$field}") {
            // Claims become empty; titles become the neutral default title.
            'hero.badge' => self::city($tenant),
            default => is_string($default[$field] ?? null) ? $default[$field] : '',
        };
    }

    /**
     * Clean one clinic (live + draft + SEO). Returns true when anything changed.
     */
    public static function cleanLegacyFor(Tenant $tenant): bool
    {
        [$live, $a] = self::replaceLegacy($tenant->website_sections, $tenant);
        [$draft, $b] = self::replaceLegacy($tenant->website_sections_draft, $tenant);

        $seoChanged = is_string($tenant->seo_description) && str_ends_with($tenant->seo_description, self::LEGACY_SEO_SUFFIX);

        if ($a + $b === 0 && ! $seoChanged) {
            return false;
        }

        if ($a > 0) {
            $tenant->website_sections = $live;
        }
        if ($b > 0) {
            $tenant->website_sections_draft = $draft;
        }
        if ($seoChanged) {
            $tenant->seo_description = null;
        }
        $tenant->save();

        return true;
    }

    // ------------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------------

    public static function clinicName(Tenant $tenant): string
    {
        return trim((string) ($tenant->name ?? '')) ?: 'Our clinic';
    }

    public static function city(Tenant $tenant): string
    {
        $city = trim((string) ($tenant->directory_city ?? ''));

        return $city !== '' ? Str::title(Str::lower($city)) : (string) ($tenant->authBranding()['city'] ?? '');
    }

    public static function newSectionId(string $type): string
    {
        return $type.'-'.Str::lower(Str::random(6));
    }
}
