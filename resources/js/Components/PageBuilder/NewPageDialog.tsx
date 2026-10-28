import React, { useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import { isValidSlug, slugify } from './lib/slug';
import { PAGE_TEMPLATES, getTemplateHtml, type TemplateTenant } from './templates';
import type { PageSummary } from './types';

interface Props {
    templates: string[];
    pages: PageSummary[];
    clinic: TemplateTenant;
    onClose: () => void;
    onCreated: (page: PageSummary) => void;
}

type Errors = Record<string, string[]>;

export default function NewPageDialog({ templates, pages, clinic, onClose, onCreated }: Props) {
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);
    const [source, setSource] = useState('blank');
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Errors>({});

    const slugError =
        slug !== '' && !isValidSlug(slug)
            ? 'Use lowercase letters, numbers and single hyphens (max 60 characters).'
            : null;
    const canSubmit = title.trim() !== '' && slug !== '' && !slugError && !saving;

    const handleTitle = (value: string) => {
        setTitle(value);
        if (!slugTouched) setSlug(slugify(value));
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSaving(true);
        setErrors({});
        try {
            const payload: Record<string, string> = { title: title.trim(), slug, source };
            if (source.startsWith('template:')) {
                payload.html = getTemplateHtml(source.slice('template:'.length), clinic);
            }
            const res = await axios.post<PageSummary>('/website/pages', payload);
            onCreated(res.data);
        } catch (err: any) {
            if (err?.response?.status === 422) {
                setErrors(err.response.data?.errors ?? { title: [err.response.data?.message ?? 'Invalid input.'] });
            } else {
                setErrors({ title: ['Could not create the page. Please try again.'] });
            }
        } finally {
            setSaving(false);
        }
    };

    const inputClass =
        'w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-850 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500';
    const labelClass = 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1';

    return (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <form
                onSubmit={submit}
                className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-2xl space-y-4"
            >
                <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">New page</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div>
                    <label className={labelClass}>Title</label>
                    <input className={inputClass} value={title} onChange={(e) => handleTitle(e.target.value)} autoFocus />
                    {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title[0]}</p>}
                </div>

                <div>
                    <label className={labelClass}>Slug</label>
                    <input
                        className={inputClass}
                        value={slug}
                        onChange={(e) => {
                            setSlugTouched(true);
                            setSlug(e.target.value);
                        }}
                    />
                    {(slugError || errors.slug) && (
                        <p className="mt-1 text-xs text-red-600">{slugError ?? errors.slug[0]}</p>
                    )}
                </div>

                <div>
                    <label className={labelClass}>Start from</label>
                    <select className={inputClass} value={source} onChange={(e) => setSource(e.target.value)}>
                        <option value="blank">Blank page</option>
                        <optgroup label="✨ Premium Templates (Under Development · Free Preview)">
                            {PAGE_TEMPLATES.filter((t) => t.tier === 'premium').map((t) => (
                                <option key={t.key} value={`template:${t.key}`}>
                                    {t.label} — {t.price_lkr}
                                </option>
                            ))}
                        </optgroup>
                        <optgroup label="Free Starter Presets">
                            {PAGE_TEMPLATES.filter((t) => t.tier === 'free').map((t) => (
                                <option key={t.key} value={`template:${t.key}`}>
                                    {t.label} (Free)
                                </option>
                            ))}
                        </optgroup>
                        {pages.length > 0 && (
                            <optgroup label="Copy of existing page">
                                {pages.map((p) => (
                                    <option key={p.id} value={`copy:${p.id}`}>
                                        {p.title}
                                    </option>
                                ))}
                            </optgroup>
                        )}
                    </select>
                    {errors.source && <p className="mt-1 text-xs text-red-600">{errors.source[0]}</p>}
                </div>

                <div className="flex justify-end gap-2 pt-1">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white"
                    >
                        {saving ? 'Creating...' : 'Create page'}
                    </button>
                </div>
            </form>
        </div>
    );
}
