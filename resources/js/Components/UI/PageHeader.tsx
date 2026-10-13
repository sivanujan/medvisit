import React, { ComponentType, ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

export interface PageHeaderProps {
    eyebrow?: string;
    title: ReactNode;
    subtitle?: ReactNode;
    action?: ReactNode;
    actions?: ReactNode;
    icon?: ComponentType<{ className?: string }>;
    className?: string;
}

export function PageHeader({
    eyebrow = '',
    title,
    subtitle,
    action,
    actions,
    icon: Icon = Sparkles,
    className = '',
}: PageHeaderProps) {
    const displayActions = actions || action;

    return (
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200/70 dark:border-white/10 ${className}`}>
            <div>
                {eyebrow && (
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        <span>{eyebrow}</span>
                    </div>
                )}
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl font-normal leading-relaxed">
                        {subtitle}
                    </p>
                )}
            </div>

            {displayActions && (
                <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    {displayActions}
                </div>
            )}
        </div>
    );
}

export default PageHeader;
