import React from 'react';
import { Info, AlertCircle, CheckCircle2 } from 'lucide-react';

export type CalloutVariant = 'info' | 'coral' | 'success';

interface CalloutProps {
    variant?: CalloutVariant;
    title?: string;
    children: React.ReactNode;
    className?: string;
}

export default function Callout({
    variant = 'info',
    title,
    children,
    className = '',
}: CalloutProps) {
    if (variant === 'coral') {
        return (
            <div
                role="note"
                className={`my-4 p-4 sm:p-4.5 rounded-xl border-l-4 border-accent bg-accent-50/80 dark:bg-accent-950/30 text-accent-950 dark:text-accent-100 border-r border-t border-b border-accent-200/60 dark:border-accent-900/40 backdrop-blur-xs ${className}`}
            >
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-accent shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="text-xs sm:text-sm leading-relaxed">
                        {title && <p className="font-bold text-accent-900 dark:text-accent-200 mb-1">{title}</p>}
                        <div className="text-slate-800 dark:text-slate-200">{children}</div>
                    </div>
                </div>
            </div>
        );
    }

    if (variant === 'success') {
        return (
            <div
                role="note"
                className={`my-4 p-4 sm:p-4.5 rounded-xl border-l-4 border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-100 border-r border-t border-b border-emerald-200/60 dark:border-emerald-900/40 backdrop-blur-xs ${className}`}
            >
                <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="text-xs sm:text-sm leading-relaxed">
                        {title && <p className="font-bold text-emerald-900 dark:text-emerald-200 mb-1">{title}</p>}
                        <div className="text-slate-800 dark:text-slate-200">{children}</div>
                    </div>
                </div>
            </div>
        );
    }

    // Default: 'info' (teal / secondary)
    return (
        <div
            role="note"
            className={`my-4 p-4 sm:p-4.5 rounded-xl border-l-4 border-secondary bg-secondary-50/80 dark:bg-secondary-950/30 text-secondary-950 dark:text-secondary-100 border-r border-t border-b border-secondary-200/60 dark:border-secondary-900/40 backdrop-blur-xs ${className}`}
        >
            <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-xs sm:text-sm leading-relaxed">
                    {title && <p className="font-bold text-secondary-900 dark:text-secondary-200 mb-1">{title}</p>}
                    <div className="text-slate-800 dark:text-slate-200">{children}</div>
                </div>
            </div>
        </div>
    );
}
