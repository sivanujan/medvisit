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

