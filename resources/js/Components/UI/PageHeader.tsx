import React, { ComponentType, ReactNode } from 'react';
import { Link } from '@inertiajs/react';
import { ChevronRight, Sparkles } from 'lucide-react';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

export interface PageHeaderProps {
    breadcrumbs?: BreadcrumbItem[];
    eyebrow?: string;
    title: ReactNode;
    subtitle?: ReactNode;
    action?: ReactNode;
    actions?: ReactNode;
    icon?: ComponentType<{ className?: string }>;
    className?: string;
}

export function PageHeader({
    breadcrumbs,
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
            <div className="space-y-1.5">
                {/* Breadcrumbs or Eyebrow */}
                {breadcrumbs && breadcrumbs.length > 0 ? (
                    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                        {breadcrumbs.map((crumb, idx) => {
                            const isLast = idx === breadcrumbs.length - 1;
                            return (
                                <React.Fragment key={idx}>
                                    {crumb.href && !isLast ? (
                                        <Link
                                            href={crumb.href}
                                            className="hover:text-primary transition-colors text-slate-500 dark:text-slate-400"
                                        >
                                            {crumb.label}
                                        </Link>
                                    ) : (
                                        <span className={isLast ? 'text-primary font-semibold' : 'text-slate-500 dark:text-slate-400'}>
                                            {crumb.label}
                                        </span>
                                    )}
                                    {!isLast && <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />}
                                </React.Fragment>
                            );
                        })}
                    </nav>
                ) : eyebrow ? (
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary">
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        <span>{eyebrow}</span>
                    </div>
                ) : null}

                {/* Standardized 28-30px title */}
                <h1 className="text-2xl sm:text-[28px] lg:text-[30px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                    {title}
                </h1>

                {/* Subtitle / one-line description */}
                {subtitle && (
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl font-normal leading-relaxed">
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
