/**
 * Standard formatters for MedVisit (Sri Lanka / LKR context).
 */

/**
 * Format currency in Sri Lankan Rupees (LKR).
 * Accepts integer cents (e.g. 150000 -> "Rs. 1,500.00") or float rupees.
 */
export function formatLKR(amountInCents: number | null | undefined, fromCents = true): string {
    if (amountInCents === null || amountInCents === undefined || isNaN(amountInCents)) {
        return 'Rs. 0.00';
    }

    const rupees = fromCents ? amountInCents / 100 : amountInCents;
    const formatted = new Intl.NumberFormat('en-LK', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(rupees);

    return `Rs. ${formatted}`;
}

/**
 * Format date in Asia/Colombo time.
 */
export function formatDate(
    date: string | Date | null | undefined,
    format: 'short' | 'medium' | 'long' = 'medium'
): string {
    if (!date) return '-';

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';

    const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
        short: { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'Asia/Colombo' },
        medium: { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' },
        long: { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Colombo' },
    };

    return new Intl.DateTimeFormat('en-LK', optionsMap[format]).format(d);
}

/**
 * Format date strictly as DD/MM/YYYY (Sri Lanka standard format).
 * Avoids timezone skew by parsing YYYY-MM-DD strings directly.
 */
export function formatDateDMY(date: string | Date | null | undefined): string {
    if (!date) return '-';

    if (typeof date === 'string') {
        const trimmed = date.trim();
        if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
            const [year, month, day] = trimmed.slice(0, 10).split('-');
            return `${day}/${month}/${year}`;
        }
    }

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Format clock time only (e.g. "09:30 AM") in Asia/Colombo.
 */
export function formatTime(date: string | Date | null | undefined): string {
    if (!date) return '-';

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '-';

    return new Intl.DateTimeFormat('en-LK', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Colombo',
    }).format(d);
}

/**
 * Format date for Sri Lanka UI: "23 Oct 2026"
 */
export function formatDateLK(date: string | Date | null | undefined): string {
    if (!date) return '—';

    let d: Date;
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}/.test(date.trim())) {
        const [y, m, day] = date.trim().slice(0, 10).split('-').map(Number);
        d = new Date(Date.UTC(y, m - 1, day, 12, 0, 0));
    } else {
        d = typeof date === 'string' ? new Date(date) : date;
    }
    if (isNaN(d.getTime())) return '—';

    return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Colombo',
    }).format(d);
}

/**
 * Format datetime for Sri Lanka UI: "23 Oct 2026, 09:30 AM"
 */
export function formatDateTimeLK(date: string | Date | null | undefined): string {
    if (!date) return '—';

    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '—';

    const datePart = new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Colombo',
    }).format(d);

    const timePart = new Intl.DateTimeFormat('en-LK', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: 'Asia/Colombo',
    }).format(d);

    return `${datePart}, ${timePart}`;
}

/**
 * Format count with correct English plurals: "1 line", "2 lines", "1 unit", "160 units"
 */
export function pluralize(count: number, singular: string, plural?: string): string {
    const word = count === 1 ? singular : (plural ?? `${singular}s`);
    return `${count} ${word}`;
}

/**
 * Normalise Sri Lankan and international phone numbers to E.164 (+94XXXXXXXXX).
 */
export function normalizePhone(phone: string | null | undefined): string | null {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (!digits) return null;

    if (digits.startsWith('94') && digits.length >= 11) {
        return `+94${digits.slice(2, 11)}`;
    }
    if (digits.startsWith('0') && digits.length >= 10) {
        return `+94${digits.slice(1, 10)}`;
    }
    if (digits.length === 9 && ['7', '1', '2', '3', '4', '5', '6', '8'].includes(digits[0])) {
        return `+94${digits}`;
    }
    return `+${digits}`;
}

/**
 * Format phone for display as "077 123 4567" or international formatted string.
 */
export function formatPhoneLK(phone: string | null | undefined): string {
    if (!phone) return '—';
    const digits = phone.replace(/\D/g, '');
    let local = digits;
    if (local.startsWith('94')) {
        local = local.slice(2);
    } else if (local.startsWith('0')) {
        local = local.slice(1);
    }

    if (local.length === 9) {
        return `0${local.slice(0, 2)} ${local.slice(2, 5)} ${local.slice(5, 9)}`;
    }
    if (local.length === 10 && digits.startsWith('0')) {
        return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 10)}`;
    }
    return phone;
}

/**
 * Build WhatsApp click-to-chat URL (https://wa.me/947XXXXXXXX).
 */
export function getWhatsAppUrl(phone: string | null | undefined): string | null {
    const normalized = normalizePhone(phone);
    if (!normalized) return null;
    const cleanDigits = normalized.replace(/\+/g, '');
    return `https://wa.me/${cleanDigits}`;
}



