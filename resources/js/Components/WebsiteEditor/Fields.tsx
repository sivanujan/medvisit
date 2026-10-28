import React, { ReactNode, useId, useRef, useState } from 'react';
import axios from 'axios';
import { ImagePlus, Link2, Loader2, Trash2 } from 'lucide-react';

const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500';

export function FieldLabel({ htmlFor, children, aside }: { htmlFor?: string; children: ReactNode; aside?: ReactNode }) {
    return (
        <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor={htmlFor} className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {children}
            </label>
            {aside}
        </div>
    );
}

function Counter({ value, max }: { value: string; max: number }) {
    const n = value.length;
    return (
        <span className={`text-xs tabular-nums ${n > max ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {n}/{max}
        </span>
    );
}

export function Hint({ children }: { children: ReactNode }) {
    return <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{children}</p>;
}

interface TextProps {
    label: string;
    value: string;
    onChange: (v: string) => void;
    max?: number;
    placeholder?: string;
    hint?: ReactNode;
    type?: string;
    multiline?: boolean;
    rows?: number;
}

export function TextField({ label, value, onChange, max, placeholder, hint, type = 'text', multiline, rows = 4 }: TextProps) {
    const id = useId();
    const v = value ?? '';
    return (
        <div>
            <FieldLabel htmlFor={id} aside={max ? <Counter value={v} max={max} /> : undefined}>
                {label}
            </FieldLabel>
            {multiline ? (
                <textarea
                    id={id}
                    rows={rows}
                    value={v}
                    maxLength={max ? max + 50 : undefined}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    className={`${inputClass} resize-y leading-relaxed`}
                />
            ) : (
                <input
                    id={id}
                    type={type}
                    value={v}
                    maxLength={max ? max + 20 : undefined}
                    placeholder={placeholder}
                    onChange={(e) => onChange(e.target.value)}
                    className={inputClass}
                />
            )}
            {hint && <Hint>{hint}</Hint>}
        </div>
    );
}

export function Toggle({ label, checked, onChange, description }: { label: string; checked: boolean; onChange: (v: boolean) => void; description?: string }) {
    const id = useId();
    return (
        <div className="flex items-start justify-between gap-4">
            <div>
                <label htmlFor={id} className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    {label}
                </label>
                {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
            </div>
            <button
                id={id}
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/30 ${
                    checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'
                }`}
            >
                <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none ${
                        checked ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                />
            </button>
        </div>
    );
}

export function Segmented<T extends string>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (v: T) => void;
}) {
    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap rounded-xl border border-slate-300 bg-white p-1 dark:border-slate-600 dark:bg-slate-900">
                {options.map((o) => (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={value === o.value}
                        onClick={() => onChange(o.value)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                            value === o.value
                                ? 'bg-primary text-white'
                                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                        }`}
                    >
                        {o.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/** Image from the device (uploaded to the clinic's media library) or from a link. */
export function ImageField({ label, value, onChange, hint }: { label: string; value: string; onChange: (url: string) => void; hint?: string }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const [mode, setMode] = useState<'upload' | 'link'>('upload');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [link, setLink] = useState('');

    const upload = async (file: File) => {
        setBusy(true);
        setError(null);
        try {
            const form = new FormData();
            form.append('file', file);
            const { data } = await axios.post('/website/builder/media/upload', form, { headers: { Accept: 'application/json' } });
            const url = data?.data?.[0];
            if (url) onChange(url);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'The image could not be uploaded. Use a JPG, PNG or WebP under 5 MB.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div>
            <FieldLabel>{label}</FieldLabel>
            {value ? (
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-2 dark:border-slate-700">
                    <img src={value} alt="" className="h-16 w-24 rounded-lg object-cover" />
                    <div className="flex flex-1 flex-wrap gap-2">
                        <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium hover:border-primary dark:border-slate-600">
                            Replace
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                        >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            Remove
                        </button>
                    </div>
                </div>
            ) : mode === 'upload' ? (
                <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-5 text-sm font-medium text-slate-600 transition hover:border-primary hover:text-primary dark:border-slate-600 dark:text-slate-300"
                >
                    {busy ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <ImagePlus className="h-5 w-5" aria-hidden="true" />}
                    {busy ? 'Uploading…' : 'Upload from device'}
                </button>
            ) : (
                <div className="flex gap-2">
                    <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className={inputClass} aria-label={`${label} link`} />
                    <button
                        type="button"
                        onClick={() => link.trim() && onChange(link.trim())}
                        className="shrink-0 rounded-xl bg-primary px-3 text-sm font-semibold text-white"
                    >
                        Use
                    </button>
                </div>
            )}
            {!value && (
                <button
                    type="button"
                    onClick={() => setMode(mode === 'upload' ? 'link' : 'upload')}
                    className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline dark:text-primary-300"
                >
                    <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {mode === 'upload' ? 'Use a link instead' : 'Upload from device instead'}
                </button>
            )}
            <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f);
                    e.target.value = '';
                }}
            />
            {error && <p className="mt-1.5 text-xs text-red-700 dark:text-red-300">{error}</p>}
            {hint && <Hint>{hint}</Hint>}
        </div>
    );
}
