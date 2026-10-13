import React, { ReactNode, ThHTMLAttributes, TdHTMLAttributes, HTMLAttributes } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

export function GlassTable({
    children,
    className = '',
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl shadow-xs">
            <table className={`w-full text-left border-collapse text-xs sm:text-sm ${className}`}>
                {children}
            </table>
        </div>
    );
}

export function GlassThead({
    children,
    className = '',
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <thead className={`border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.03] ${className}`}>
            {children}
        </thead>
    );
}

interface GlassThProps extends ThHTMLAttributes<HTMLTableCellElement> {
    align?: 'left' | 'center' | 'right';
    sortable?: boolean;
    sortDirection?: 'asc' | 'desc' | false;
    onSort?: () => void;
}

export function GlassTh({
    children,
    className = '',
    align = 'left',
    sortable = false,
    sortDirection = false,
    onSort,
    ...props
}: GlassThProps) {
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

    return (
        <th
            className={`py-3.5 px-4 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 select-none whitespace-nowrap ${alignClass} ${
                sortable ? 'cursor-pointer hover:text-primary dark:hover:text-primary-400' : ''
            } ${className}`}
            onClick={sortable ? onSort : undefined}
            {...props}
        >
            <div className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}`}>
                <span>{children}</span>
                {sortable && (
                    <span className="text-slate-400 dark:text-slate-500">
                        {sortDirection === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-primary" />
                        ) : sortDirection === 'desc' ? (
                            <ArrowDown className="w-3.5 h-3.5 text-primary" />
                        ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-50" />
                        )}
                    </span>
                )}
            </div>
        </th>
    );
}

export function GlassTbody({
    children,
    className = '',
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <tbody className={`divide-y divide-slate-100 dark:divide-white/[0.05] ${className}`}>
            {children}
        </tbody>
    );
}

interface GlassTrProps extends HTMLAttributes<HTMLTableRowElement> {
    clickable?: boolean;
}

export function GlassTr({
    children,
    className = '',
    clickable = false,
    onClick,
    ...props
}: GlassTrProps) {
    return (
        <tr
            onClick={onClick}
            className={`transition-colors duration-150 hover:bg-primary-50/40 dark:hover:bg-primary-950/20 ${
                clickable || onClick ? 'cursor-pointer' : ''
            } ${className}`}
            {...props}
        >
            {children}
        </tr>
    );
}

interface GlassTdProps extends TdHTMLAttributes<HTMLTableCellElement> {
    align?: 'left' | 'center' | 'right';
}

export function GlassTd({
    children,
    className = '',
    align = 'left',
    ...props
}: GlassTdProps) {
    const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

    return (
        <td
            className={`py-3.5 px-4 text-slate-800 dark:text-slate-200 ${alignClass} ${className}`}
            {...props}
        >
            {children}
        </td>
    );
}

export default GlassTable;
