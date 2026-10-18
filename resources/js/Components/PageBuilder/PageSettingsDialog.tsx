import React, { useState } from 'react';
import axios from 'axios';
import { X } from 'lucide-react';
import { isValidSlug } from './lib/slug';
import type { PageSummary } from './types';

interface Props {
    page: PageSummary;
    onClose: () => void;
    onSaved: (page: PageSummary) => void;
}

type Errors = Record<string, string[]>;

export default function PageSettingsDialog({ page, onClose, onSaved }: Props) {
    const [title, setTitle] = useState(page.title);
    const [slug, setSlug] = useState(page.slug);
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');
    const [seoTouched, setSeoTouched] = useState({ title: false, description: false });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Errors>({});

    const slugError = !isValidSlug(slug)
        ? 'Use lowercase letters, numbers and single hyphens (max 60 characters).'
        : null;
    const canSubmit = title.trim() !== '' && !slugError && !saving;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmit) return;
        setSaving(true);
        setErrors({});
        try {
            // SEO fields are not part of the page summary, so only send what the admin typed.
            const payload: Record<string, string | null> = { title: title.trim(), slug };
            if (seoTouched.title) payload.seo_title = seoTitle.trim() || null;
            if (seoTouched.description) payload.seo_description = seoDescription.trim() || null;
            const res = await axios.patch<PageSummary>(`/website/pages/${page.id}`, payload);
            onSaved(res.data);
        } catch (err: any) {
            if (err?.response?.status === 422) {
                setErrors(err.response.data?.errors ?? { title: [err.response.data?.message ?? 'Invalid input.'] });
            } else {
                setErrors({ title: ['Could not save the settings. Please try again.'] });
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
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Page settings</h3>
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
                    <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
                    {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title[0]}</p>}
                </div>

                <div>
                    <label className={labelClass}>Slug</label>
                    <input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} />
                    {(slugError || errors.slug) && (
                        <p className="mt-1 text-xs text-red-600">{slugError ?? errors.slug[0]}</p>
                    )}
                </div>

                <div>
                    <label className={labelClass}>SEO title</label>
                    <input
                        className={inputClass}
                        value={seoTitle}
                        placeholder="Leave blank to keep the current value"
                        onChange={(e) => {
                            setSeoTitle(e.target.value);
                            setSeoTouched((t) => ({ ...t, title: true }));
                        }}
                    />
                    {errors.seo_title && <p className="mt-1 text-xs text-red-600">{errors.seo_title[0]}</p>}
                </div>

                <div>
                    <label className={labelClass}>Meta description</label>
                    <textarea
                        className={inputClass}
                        rows={3}
                        value={seoDescription}
                        placeholder="Leave blank to keep the current value"
                        onChange={(e) => {
                            setSeoDescription(e.target.value);
                            setSeoTouched((t) => ({ ...t, description: true }));
                        }}
                    />
                    {errors.seo_description && (
                        <p className="mt-1 text-xs text-red-600">{errors.seo_description[0]}</p>
                    )}
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
                        {saving ? 'Saving...' : 'Save settings'}
                    </button>
                </div>
            </form>
        </div>
    );
}
