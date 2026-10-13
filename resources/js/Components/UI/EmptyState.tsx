import React, { ComponentType, ReactNode } from 'react';
import { Sparkles } from 'lucide-react';

export interface EmptyStateProps {
    icon?: ComponentType<{ className?: string }>;
    title?: string;
    description?: string;
    action?: ReactNode;
    className?: string;
}

export function EmptyState({
    icon: Icon = Sparkles,
    title = 'No records found',
    description = 'Get started by creating your first entry.',
    action = null,
    className = '',
}: EmptyStateProps) {
    return (
        <div className={`py-12 px-4 flex flex-col items-center justify-center text-center ${className}`}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary-50 dark:bg-primary-950/40 text-primary dark:text-primary-300 mb-3.5 border border-primary-200/60 dark:border-primary-800/30 shadow-xs">
                <Icon className="w-6 h-6" />
            </div>
            <h4 className="text-base font-semibold text-slate-900 dark:text-white tracking-tight">
                {title}
            </h4>
            {description && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                    {description}
                </p>
            )}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export default EmptyState;
