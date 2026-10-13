import React, { ReactNode } from 'react';

export type BadgeStatus =
    | 'waiting'
    | 'called'
    | 'in_consultation'
    | 'completed'
    | 'no_show'
    | 'cancelled'
    | 'open'
    | 'closed'
    | 'active'
    | 'pending'
    | 'neutral'
    | string;

export interface StatusBadgeProps {
    status?: BadgeStatus;
    variant?: BadgeStatus;
    label?: string;
    children?: ReactNode;
    pulse?: boolean;
    className?: string;
}

export function StatusBadge({
    status = 'active',
    variant,
    label,
    children,
    pulse = false,
    className = '',
}: StatusBadgeProps) {
    const raw = variant || status;
    const norm = String(raw || '').toLowerCase().replace(/[\s-]/g, '_');

    let bgClass = 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
    let dotClass = 'bg-slate-400';
    let displayLabel = children || label;
    let shouldPulse = pulse;

    switch (norm) {
        case 'waiting':
            bgClass = 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30';
            dotClass = 'bg-amber-500';
            displayLabel = displayLabel || 'Waiting';
            break;
        case 'called':
            bgClass = 'bg-blue-500/15 text-primary-700 dark:text-primary-300 border-primary/30';
            dotClass = 'bg-primary';
            shouldPulse = true;
            displayLabel = displayLabel || 'Called';
            break;
        case 'in_consultation':
            bgClass = 'bg-secondary-500/15 text-secondary-800 dark:text-secondary-300 border-secondary/30';
            dotClass = 'bg-secondary';
            shouldPulse = true;
            displayLabel = displayLabel || 'In Consultation';
            break;
        case 'completed':
        case 'active':
        case 'open':
        case 'settled':
            bgClass = 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30';
            dotClass = 'bg-emerald-500';
            displayLabel = displayLabel || (norm === 'open' ? 'Open' : norm === 'completed' ? 'Completed' : 'Active');
            break;
        case 'no_show':
            bgClass = 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30';
            dotClass = 'bg-rose-500';
            displayLabel = displayLabel || 'No Show';
            break;
        case 'cancelled':
        case 'closed':
        case 'suspended':
            bgClass = 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-500/30';
            dotClass = 'bg-rose-500';
            displayLabel = displayLabel || (norm === 'closed' ? 'Closed' : 'Cancelled');
            break;
        case 'pending':
            bgClass = 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30';
            dotClass = 'bg-amber-500';
            displayLabel = displayLabel || 'Pending';
            break;
        default:
            bgClass = 'bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20';
            dotClass = 'bg-slate-400';
            displayLabel = displayLabel || raw;
    }

    return (
        <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors ${bgClass} ${className}`}
        >
            <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass} ${shouldPulse ? 'animate-pulse' : ''}`}
            />
            <span>{displayLabel}</span>
        </span>
    );
}

export default StatusBadge;
