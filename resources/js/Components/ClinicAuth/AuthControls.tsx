import React, { CSSProperties, InputHTMLAttributes, ReactNode, useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, LucideIcon } from 'lucide-react';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label: string;
    icon: LucideIcon;
    error?: string;
    /** Rendered at the right of the label row, e.g. a "Forgot password?" link. */
    labelAside?: ReactNode;
    revealable?: boolean;
    wrapperStyle?: CSSProperties;
}

export function AuthField({
    id,
    label,
    icon: Icon,
    error,
    labelAside,
    revealable = false,
    type = 'text',
    wrapperStyle,
    ...input
}: FieldProps) {
    const [revealed, setRevealed] = useState(false);
    const errorId = `${id}-error`;

    return (
        <div className="ca-in" style={wrapperStyle}>
            <div className="flex items-center justify-between gap-3">
                <label htmlFor={id} className="text-sm font-medium">
                    {label}
                </label>
                {labelAside}
            </div>
            <div className="relative mt-2">
                <Icon
                    className="ca-icon pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2"
                    aria-hidden="true"
                />
                <input
                    id={id}
                    type={revealable && revealed ? 'text' : type}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? errorId : undefined}
                    className={`ca-input ${revealable ? 'pr-12' : 'pr-4'}`}
                    {...input}
                />
                {revealable && (
                    <button
                        type="button"
                        onClick={() => setRevealed((r) => !r)}
                        aria-label={revealed ? 'Hide password' : 'Show password'}
                        aria-pressed={revealed}
                        className="ca-icon absolute right-1.5 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 hover:text-[color:var(--ca-ink)] dark:hover:bg-white/10"
                    >
                        {revealed ? (
                            <EyeOff className="h-5 w-5" aria-hidden="true" />
                        ) : (
                            <Eye className="h-5 w-5" aria-hidden="true" />
                        )}
                    </button>
                )}
            </div>
            {error && (
                <p id={errorId} className="mt-1.5 text-sm text-red-700 dark:text-red-300">
                    {error}
                </p>
            )}
        </div>
    );
}

export function AuthAlert({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
    const Icon = tone === 'error' ? AlertCircle : CheckCircle2;
    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                tone === 'error'
                    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
            }`}
        >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>{children}</div>
        </div>
    );
}

export function AuthSubmit({
    busy,
    disabled,
    busyLabel,
    children,
    style,
}: {
    busy: boolean;
    disabled?: boolean;
    busyLabel: string;
    children: ReactNode;
    style?: CSSProperties;
}) {
    return (
        <button
            type="submit"
            disabled={busy || disabled}
            aria-busy={busy}
            style={style}
            className="ca-in inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-5 text-base font-semibold text-white shadow-lg shadow-primary/25 transition hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        >
            {busy && (
                <span
                    aria-hidden="true"
                    className="ca-spinner h-5 w-5 rounded-full border-2 border-white/40 border-t-white"
                />
            )}
            {busy ? busyLabel : children}
        </button>
    );
}
