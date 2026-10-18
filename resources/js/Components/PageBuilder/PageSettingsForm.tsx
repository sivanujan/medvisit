import React, { useState } from 'react';
import axios from 'axios';
import { isValidSlug } from './lib/slug';
import type { PageSummary } from './types';

interface Props {
    page: PageSummary;
    onSaved: (page: PageSummary) => void;
    onCancel?: () => void;
    /** 'dialog' follows the light/dark admin styling; 'panel' matches the dark builder panels. */
    tone?: 'dialog' | 'panel';
}

type Errors = Record<string, string[]>;

export default function PageSettingsForm({ page, onSaved, onCancel, tone = 'dialog' }: Props) {
    const [title, setTitle] = useState(page.title);
    const [slug, setSlug] = useState(page.slug);
    const [seoTitle, setSeoTitle] = useState(page.seo_title ?? '');
    const [seoDescription, setSeoDescription] = useState(page.seo_description ?? '');
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
            const res = await axios.patch<PageSummary>(`/website/pages/${page.id}`, {
                title: title.trim(),
                slug,
                seo_title: seoTitle.trim() || null,
                seo_description: seoDescription.trim() || null,
            });
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

    const panel = tone === 'panel';
    const inputClass = panel
        ? 'w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500'
        : 'w-full rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-850 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500';
    const labelClass = panel
        ? 'block text-[11px] font-bold text-slate-300 mb-1'
        : 'block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1';
    const cancelClass = panel
        ? 'px-3 py-2 text-xs font-semibold rounded-xl border border-white/10 text-slate-200'
        : 'px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200';

    return (
        <form onSubmit={submit} className="space-y-4">
            <div>
                <label className={labelClass}>Title</label>
                <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} />
                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title[0]}</p>}
            </div>

            <div>
                <label className={labelClass}>Slug</label>
                <input
                    className={inputClass}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                />
                {(slugError || errors.slug) && (
                    <p className="mt-1 text-xs text-red-500">{slugError ?? errors.slug[0]}</p>
                )}
            </div>

            <div>
                <label className={labelClass}>SEO title</label>
                <input className={inputClass} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
                {errors.seo_title && <p className="mt-1 text-xs text-red-500">{errors.seo_title[0]}</p>}
            </div>

            <div>
                <label className={labelClass}>Meta description</label>
                <textarea
                    className={inputClass}
                    rows={3}
                    value={seoDescription}
                    onChange={(e) => setSeoDescription(e.target.value)}
                />
                {errors.seo_description && (
                    <p className="mt-1 text-xs text-red-500">{errors.seo_description[0]}</p>
                )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
                {onCancel && (
                    <button type="button" onClick={onCancel} className={cancelClass}>
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={!canSubmit}
                    className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white"
                >
                    {saving ? 'Saving...' : 'Save settings'}
                </button>
            </div>
        </form>
    );
}
