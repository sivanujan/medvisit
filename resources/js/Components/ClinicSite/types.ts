/** Shared shapes for the clinic's simple website (public renderer + editor). */

export type CoreSectionType = 'hero' | 'about' | 'doctors' | 'sessions' | 'services' | 'hours' | 'contact' | 'footer';
export type ExtraSectionType = 'gallery' | 'faq' | 'announcement' | 'text';
export type SectionType = CoreSectionType | ExtraSectionType;

export interface DayHours {
    day: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
    open: boolean;
    ranges: { from: string; to: string }[];
}

export interface SiteSection {
    id: string;
    type: SectionType;
    enabled: boolean;
    [key: string]: any;
}

export interface SiteLook {
    theme: string;
    hero_style: 'gradient' | 'photo' | 'split' | 'minimal';
    brand_color: string | null;
    font: 'poppins' | 'nunito' | 'serif';
    button_style: 'rounded' | 'pill';
    mode: 'light' | 'dark';
}

export interface SiteStat {
    key: string;
    value: number;
    label: string;
}

export interface SiteDoctor {
    id: number;
    name: string;
    specialty?: string | null;
    bio?: string | null;
    photo_url?: string | null;
    total_fee_formatted: string;
}

export interface SiteSession {
    id: number;
    doctor_name: string;
    doctor_specialty: string;
    session_date: string;
    start_time: string;
    room_number: string;
    available_tokens_count: number;
    is_full: boolean;
    total_fee_formatted: string;
}

export interface SiteClinic {
    name: string;
    subdomain: string;
    phone?: string | null;
    address?: string | null;
    email?: string | null;
    whatsapp_number?: string | null;
    logo_url?: string | null;
    latitude?: number | null;
    longitude?: number | null;
}

export const DAY_LABELS: Record<DayHours['day'], string> = {
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
    sun: 'Sunday',
};

const filled = (v: unknown) => typeof v === 'string' && v.trim() !== '';

/** Mirrors ClinicWebsite::visibleSectionIds(): does this section have anything to show? */
export function sectionHasContent(
    s: SiteSection,
    data: { doctors: number; sessions: number; stats: number; clinic: SiteClinic },
): boolean {
    switch (s.type) {
        case 'hero':
        case 'footer':
            return true;
        case 'about':
            return filled(s.description) || (s.show_stats !== false && data.stats > 0);
        case 'doctors':
            return data.doctors > 0;
        case 'sessions':
            return data.sessions > 0;
        case 'services':
            return (s.items ?? []).some((i: any) => filled(i?.name));
        case 'hours':
            return (s.days ?? []).some((d: DayHours) => d.open && d.ranges?.length > 0);
        case 'contact':
            return filled(s.phone) || filled(s.address) || filled(data.clinic.phone) || filled(data.clinic.address);
        case 'gallery':
            return (s.images ?? []).some((i: any) => filled(i?.url));
        case 'faq':
            return (s.items ?? []).some((i: any) => filled(i?.question));
        case 'announcement':
            return filled(s.message);
        case 'text':
            return filled(s.body);
        default:
            return false;
    }
}

/** Is the clinic open right now (Asia/Colombo)? null when no hours are set. */
export function openNow(days: DayHours[] | undefined, now = new Date()): boolean | null {
    if (!days || !days.some((d) => d.open && d.ranges.length)) return null;
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Colombo',
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(now);
    const weekday = (parts.find((p) => p.type === 'weekday')?.value ?? 'Mon').slice(0, 3).toLowerCase();
    const hhmm = `${parts.find((p) => p.type === 'hour')?.value ?? '00'}:${parts.find((p) => p.type === 'minute')?.value ?? '00'}`;
    const today = days.find((d) => d.day === weekday);
    return !!today?.open && today.ranges.some((r) => r.from <= hhmm && hhmm < r.to);
}

export function colomboWeekday(now = new Date()): DayHours['day'] {
    return new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', weekday: 'short' })
        .format(now)
        .slice(0, 3)
        .toLowerCase() as DayHours['day'];
}

export function formatTime(t: string): string {
    const [h, m] = t.split(':').map(Number);
    if (Number.isNaN(h)) return t;
    const suffix = h >= 12 ? 'PM' : 'AM';
    return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${suffix}`;
}
