/**
 * Unified subscription status mapping for all MedVisit clinic billing UI.
 *
 * Mappings:
 * - pending_payment -> "Payment due" (amber)
 * - past_due -> "Past due" (rose)
 * - expired -> "Expired" (rose)
 * - cancelled / canceled -> "Cancelled" (rose)
 * - trial / trialing -> "Trial: Xd left" or "Trial" (amber)
 * - cancelling -> "Cancels on DD/MM/YYYY" (amber)
 * - active -> "Active" (emerald)
 * - comp / complimentary -> "Complimentary" (emerald)
 */

export interface SubscriptionStatusDescriptor {
    label: string;
    tone: 'emerald' | 'amber' | 'rose' | 'slate' | 'blue';
    bgClass: string;
    textClass: string;
    borderClass: string;
}

export function getSubscriptionStatusDescriptor(
    status?: string | null,
    periodEnd?: string | null,
    trialDaysLeft?: number | null
): SubscriptionStatusDescriptor {
    const normalized = (status || 'active').toLowerCase().trim();

    // Format periodEnd date if available (DD/MM/YYYY)
    let formattedDate = '';
    if (periodEnd) {
        try {
            const date = new Date(periodEnd);
            if (!isNaN(date.getTime())) {
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                formattedDate = `${day}/${month}/${year}`;
            }
        } catch {
            // ignore date parsing error
        }
    }

    switch (normalized) {
        case 'active':
            return {
                label: 'Active',
                tone: 'emerald',
                bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
                textClass: 'text-emerald-700 dark:text-emerald-400',
                borderClass: 'border-emerald-200/80 dark:border-emerald-800/50',
            };

        case 'comp':
        case 'complimentary':
            return {
                label: 'Complimentary',
                tone: 'emerald',
                bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
                textClass: 'text-emerald-700 dark:text-emerald-400',
                borderClass: 'border-emerald-200/80 dark:border-emerald-800/50',
            };

        case 'trial':
        case 'trialing':
            const trialLabel =
                trialDaysLeft !== null && trialDaysLeft !== undefined
                    ? trialDaysLeft > 0
                        ? `Trial: ${trialDaysLeft}d left`
                        : 'Trial Expired'
                    : 'Trial';
            return {
                label: trialLabel,
                tone: 'amber',
                bgClass: 'bg-amber-50 dark:bg-amber-950/40',
                textClass: 'text-amber-800 dark:text-amber-300',
                borderClass: 'border-amber-200/80 dark:border-amber-800/50',
            };

        case 'pending_payment':
            return {
                label: 'Payment due',
                tone: 'amber',
                bgClass: 'bg-amber-50 dark:bg-amber-950/40',
                textClass: 'text-amber-800 dark:text-amber-300',
                borderClass: 'border-amber-200/80 dark:border-amber-800/50',
            };

        case 'cancelling':
        case 'canceling':
            return {
                label: formattedDate ? `Cancels on ${formattedDate}` : 'Cancelling',
                tone: 'amber',
                bgClass: 'bg-amber-50 dark:bg-amber-950/40',
                textClass: 'text-amber-800 dark:text-amber-300',
                borderClass: 'border-amber-200/80 dark:border-amber-800/50',
            };

        case 'past_due':
            return {
                label: 'Past due',
                tone: 'rose',
                bgClass: 'bg-rose-50 dark:bg-rose-950/40',
                textClass: 'text-rose-700 dark:text-rose-400',
                borderClass: 'border-rose-200/80 dark:border-rose-800/50',
            };

        case 'unpaid':
            return {
                label: 'Payment overdue',
                tone: 'rose',
                bgClass: 'bg-rose-50 dark:bg-rose-950/40',
                textClass: 'text-rose-700 dark:text-rose-400',
                borderClass: 'border-rose-200/80 dark:border-rose-800/50',
            };

        case 'expired':
            return {
                label: 'Expired',
                tone: 'rose',
                bgClass: 'bg-rose-50 dark:bg-rose-950/40',
                textClass: 'text-rose-700 dark:text-rose-400',
                borderClass: 'border-rose-200/80 dark:border-rose-800/50',
            };

        case 'cancelled':
        case 'canceled':
            return {
                label: 'Cancelled',
                tone: 'rose',
                bgClass: 'bg-rose-50 dark:bg-rose-950/40',
                textClass: 'text-rose-700 dark:text-rose-400',
                borderClass: 'border-rose-200/80 dark:border-rose-800/50',
            };

        default:
            return {
                label: normalized.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
                tone: 'slate',
                bgClass: 'bg-slate-50 dark:bg-slate-800/50',
                textClass: 'text-slate-700 dark:text-slate-300',
                borderClass: 'border-slate-200/80 dark:border-slate-700/50',
            };
    }
}
