import React, { ComponentType, ReactNode } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

export interface EmptyGuideStep {
    step: number | string;
    title: string;
    description: string;
}

export interface EmptyStateProps {
    icon?: ComponentType<{ className?: string }>;
    title?: string;
    description?: string;
    action?: ReactNode;
    secondaryAction?: ReactNode;
    guide?: EmptyGuideStep[];
    className?: string;
}

export function EmptyState({
    icon: Icon = Sparkles,
    title = 'No records found',
    description = 'Get started by creating your first entry.',
    action = null,
    secondaryAction = null,
    guide,
    className = '',
}: EmptyStateProps) {
    return (
        <div className={`py-10 px-6 flex flex-col items-center justify-center text-center ${className}`}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-primary-50 dark:bg-primary-950/50 text-primary dark:text-primary-300 mb-4 border border-primary-200/60 dark:border-primary-800/40 shadow-xs">
                <Icon className="w-7 h-7" />
            </div>

            <h4 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {title}
            </h4>

            {description && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-md leading-relaxed">
                    {description}
                </p>
            )}

            {(action || secondaryAction) && (
                <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
                    {action}
                    {secondaryAction}
                </div>
            )}

            {guide && guide.length > 0 && (
                <div className="mt-8 pt-8 border-t border-slate-200/80 dark:border-white/10 w-full max-w-xl text-left">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 text-center sm:text-left">
                        How it works
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {guide.map((g, idx) => (
                            <div
                                key={idx}
                                className="p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5"
                            >
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[11px] flex items-center justify-center mb-1.5">
                                    {g.step}
                                </span>
                                <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {g.title}
                                </h5>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                    {g.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default EmptyState;
