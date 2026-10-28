export interface DoctorColor {
    id: number;
    bg: string;
    border: string;
    text: string;
    badge: string;
    hex: string;
    name: string;
    gradient: string;
}

export const DOCTOR_PALETTE: DoctorColor[] = [
    {
        id: 0,
        bg: 'bg-blue-500/10 dark:bg-blue-500/20',
        border: 'border-blue-500/40 dark:border-blue-400/40',
        text: 'text-blue-700 dark:text-blue-300',
        badge: 'bg-[#1E6FD9]',
        hex: '#1E6FD9',
        name: 'Blue',
        gradient: 'from-[#1E6FD9] to-blue-600',
    },
    {
        id: 1,
        bg: 'bg-teal-500/10 dark:bg-teal-500/20',
        border: 'border-teal-500/40 dark:border-teal-400/40',
        text: 'text-teal-700 dark:text-teal-300',
        badge: 'bg-[#0E9E8F]',
        hex: '#0E9E8F',
        name: 'Teal',
        gradient: 'from-[#0E9E8F] to-emerald-600',
    },
    {
        id: 2,
        bg: 'bg-orange-500/10 dark:bg-orange-500/20',
        border: 'border-orange-500/40 dark:border-orange-400/40',
        text: 'text-orange-700 dark:text-orange-300',
        badge: 'bg-[#FF7A59]',
        hex: '#FF7A59',
        name: 'Coral',
        gradient: 'from-[#FF7A59] to-amber-600',
    },
    {
        id: 3,
        bg: 'bg-purple-500/10 dark:bg-purple-500/20',
        border: 'border-purple-500/40 dark:border-purple-400/40',
        text: 'text-purple-700 dark:text-purple-300',
        badge: 'bg-[#7C3AED]',
        hex: '#7C3AED',
        name: 'Purple',
        gradient: 'from-[#7C3AED] to-violet-600',
    },
    {
        id: 4,
        bg: 'bg-rose-500/10 dark:bg-rose-500/20',
        border: 'border-rose-500/40 dark:border-rose-400/40',
        text: 'text-rose-700 dark:text-rose-300',
        badge: 'bg-[#E11D48]',
        hex: '#E11D48',
        name: 'Rose',
        gradient: 'from-[#E11D48] to-pink-600',
    },
    {
        id: 5,
        bg: 'bg-cyan-500/10 dark:bg-cyan-500/20',
        border: 'border-cyan-500/40 dark:border-cyan-400/40',
        text: 'text-cyan-700 dark:text-cyan-300',
        badge: 'bg-[#0891B2]',
        hex: '#0891B2',
        name: 'Cyan',
        gradient: 'from-[#0891B2] to-teal-600',
    },
    {
        id: 6,
        bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
        border: 'border-indigo-500/40 dark:border-indigo-400/40',
        text: 'text-indigo-700 dark:text-indigo-300',
        badge: 'bg-[#4F46E5]',
        hex: '#4F46E5',
        name: 'Indigo',
        gradient: 'from-[#4F46E5] to-blue-700',
    },
    {
        id: 7,
        bg: 'bg-amber-500/10 dark:bg-amber-500/20',
        border: 'border-amber-500/40 dark:border-amber-400/40',
        text: 'text-amber-800 dark:text-amber-300',
        badge: 'bg-[#D97706]',
        hex: '#D97706',
        name: 'Amber',
        gradient: 'from-[#D97706] to-yellow-600',
    },
];

/**
 * Get the deterministic palette color for a doctor ID (matching calendar).
 */
export function getDoctorColor(doctorId: number): DoctorColor {
    const index = Math.abs(doctorId) % DOCTOR_PALETTE.length;
    return DOCTOR_PALETTE[index];
}

/**
 * Strip duplicate "SLMC", "SLMC-", "SLMC: " prefixes.
 * Returns only the clean numeric/alphanumeric registration number.
 */
export function cleanSlmcNumber(raw?: string | null): string {
    if (!raw) return '';
    return raw.trim().replace(/^(slmc[-:\s]*)+/i, '').trim();
}

/**
 * Format SLMC for display with a single clean prefix: "SLMC 18429".
 */
export function formatSlmcDisplay(raw?: string | null): string {
    const clean = cleanSlmcNumber(raw);
    return clean ? `SLMC ${clean}` : '';
}
