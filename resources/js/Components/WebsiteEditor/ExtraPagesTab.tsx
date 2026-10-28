import React, { useState } from 'react';
import axios from 'axios';
import {
    FileText,
    Plus,
    Copy,
    Trash2,
    ExternalLink,
    Edit3,
    CheckCircle2,
    Clock,
    X,
    Loader2,
    AlertCircle,
    Layers,
    HelpCircle,
    Image,
    Sparkles,
    LayoutTemplate,
} from 'lucide-react';
import { getTemplateHtml } from '@/Components/PageBuilder/templates';
import type { PageSummary } from '@/Components/PageBuilder/types';

interface PageItem extends PageSummary {
    in_menu?: boolean;
}

interface Props {
    pages: PageItem[];
    clinic: {
        name: string;
        subdomain: string;
        site_url: string;
    };
    onPagesChange?: (pages: PageItem[]) => void;
}

const slugify = (text: string) =>
    text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);

const isValidSlug = (s: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 60;

const STARTER_LAYOUTS = [
    {
        key: 'blank',
        source: 'blank',
        title: 'Blank page',
        description: 'Start with an empty canvas to design custom layouts with drag-and-drop blocks.',
        icon: FileText,
        badge: 'Free',
        isPremium: false,
    },
    {
        key: 'text-image',
        source: 'template:text-image',
        title: 'Text + image',
        description: 'Structured informational layout with headings, body paragraphs, and image placeholders.',
        icon: Image,
        badge: 'Free',
        isPremium: false,
    },
    {
        key: 'faq',
        source: 'template:faq',
        title: 'FAQ questions',
        description: 'Interactive accordion layout answering common patient inquiries and policies.',
        icon: HelpCircle,
        badge: 'Free',
        isPremium: false,
    },
    {
        key: 'serene',
        source: 'template:serene',
        title: 'Serene Medical Center',
        description: 'Calm, airy elegance with floating cards and soft teal accents.',
        icon: Sparkles,
        badge: 'Premium (Rs. 3,500)',
        isPremium: true,
    },
    {
        key: 'specialist',
        source: 'template:specialist',
        title: 'Specialist Hospital Suite',
        description: 'Commanding dark hero with interactive doctor grid & chamber booking.',
        icon: Sparkles,
        badge: 'Premium (Rs. 3,500)',
        isPremium: true,
    },
    {
        key: 'family-care',
        source: 'template:family-care',
        title: 'Family Care & Pediatric',
        description: 'Friendly, community-first with warm honey accents & child health.',
        icon: Sparkles,
        badge: 'Premium (Rs. 3,500)',
        isPremium: true,
    },
    {
        key: 'heritage',
        source: 'template:heritage',
        title: 'Heritage Ayurvedic & Wellness',
        description: 'Botanical serenity with deep green and gold tones for holistic care.',
        icon: Sparkles,
        badge: 'Premium (Rs. 3,500)',
        isPremium: true,
    },
    {
        key: 'dental-eye',
        source: 'template:dental-eye',
        title: 'Dental & Vision Specialty',
        description: 'Crisp clinical precision with procedure comparison pricing.',
        icon: Sparkles,
        badge: 'Premium (Rs. 3,500)',
        isPremium: true,
    },
];

export default function ExtraPagesTab({ pages: initialPages, clinic, onPagesChange }: Props) {
    const [pages, setPages] = useState<PageItem[]>(initialPages);
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [selectedStarter, setSelectedStarter] = useState('blank');
    const [title, setTitle] = useState('');
    const [slug, setSlug] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [actionId, setActionId] = useState<number | null>(null);

    const updatePages = (newPages: PageItem[]) => {
        setPages(newPages);
        if (onPagesChange) onPagesChange(newPages);
    };

    const handleTitleChange = (val: string) => {
        setTitle(val);
        if (!slugTouched) {
            setSlug(slugify(val));
        }
    };

    const handleCreatePage = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedTitle = title.trim();
        const trimmedSlug = slug.trim();

        if (!trimmedTitle) {
            setError('Please enter a page title.');
            return;
        }

        if (!isValidSlug(trimmedSlug)) {
            setError('Slug must consist of lowercase letters, numbers, and single hyphens (max 60 chars).');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const starter = STARTER_LAYOUTS.find((s) => s.key === selectedStarter) || STARTER_LAYOUTS[0];
            const html = starter.source.startsWith('template:')
                ? getTemplateHtml(starter.key, { name: clinic.name })
                : '';

            const { data } = await axios.post<PageItem>('/website/pages', {
                title: trimmedTitle,
                slug: trimmedSlug,
                source: starter.source,
                html,
            });

            updatePages([...pages, { ...data, in_menu: false }]);
            setCreateModalOpen(false);
            setTitle('');
            setSlug('');
            setSlugTouched(false);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Could not create the page. Please check that the URL slug is unique.');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleMenu = async (page: PageItem) => {
        const nextInMenu = !page.in_menu;
        setActionId(page.id);
        try {
            await axios.post(`/website/pages/${page.id}/menu`, { in_menu: nextInMenu });
            updatePages(pages.map((p) => (p.id === page.id ? { ...p, in_menu: nextInMenu } : p)));
        } catch (err) {
            alert('Could not update header menu item.');
        } finally {
            setActionId(null);
        }
    };

    const handleDuplicate = async (page: PageItem) => {
        setActionId(page.id);
        try {
            const { data } = await axios.post<PageItem>(`/website/pages/${page.id}/duplicate`);
            updatePages([...pages, { ...data, in_menu: false }]);
        } catch (err) {
            alert('Could not duplicate page.');
        } finally {
            setActionId(null);
        }
    };

    const handleDelete = async (page: PageItem) => {
        if (!window.confirm(`Move "${page.title}" to trash? Patients will no longer be able to visit this page.`)) {
            return;
        }
        setActionId(page.id);
        try {
            await axios.delete(`/website/pages/${page.id}`);
            updatePages(pages.filter((p) => p.id !== page.id));
        } catch (err) {
            alert('Could not delete page.');
        } finally {
            setActionId(null);
        }
    };

    return (
        <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Extra Pages ({pages.length})
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Build dedicated clinic landing pages, patient guidance, and specialized services.
                    </p>
                </div>
                <div className="flex items-center gap-2 self-start">
                    <a
                        href="/website/builder"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-primary/30 dark:border-primary/40 bg-primary/10 dark:bg-primary/20 text-xs font-semibold text-primary dark:text-teal-300 hover:bg-primary/20 transition"
                        title="Open MedVisit visual drag-and-drop page builder"
                    >
                        <LayoutTemplate className="h-4 w-4" />
                        <span>MedVisit Page Builder</span>
                    </a>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedStarter('blank');
                            setCreateModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-xs font-semibold text-white shadow-sm hover:brightness-105 transition"
                    >
                        <Plus className="h-4 w-4" />
                        Create a page
                    </button>
                </div>
            </div>

            {/* Pages Grid or Empty State */}
            {pages.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pages.map((page) => (
                        <div
                            key={page.id}
                            className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                            page.is_published
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                        }`}
                                    >
                                        <span
                                            className={`h-1.5 w-1.5 rounded-full ${
                                                page.is_published ? 'bg-emerald-500' : 'bg-slate-400'
                                            }`}
                                        />
                                        {page.is_published ? 'Live' : 'Draft'}
                                    </span>

                                    <div className="text-[11px] text-slate-400">
                                        {page.updated_at ? `Updated ${page.updated_at.slice(0, 10)}` : ''}
                                    </div>
                                </div>

                                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                                    {page.title}
                                </h3>

                                <div className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                                    <span>/p/{page.slug}</span>
                                    {page.is_published && (
                                        <a
                                            href={`/p/${page.slug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-slate-400 hover:text-primary transition"
                                            title="View published page"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )}
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2.5">
                                {/* Show in menu toggle */}
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 dark:text-slate-400">Show in header menu</span>
                                    <button
                                        type="button"
                                        role="switch"
                                        aria-checked={page.in_menu}
                                        disabled={actionId === page.id}
                                        onClick={() => handleToggleMenu(page)}
                                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                                            page.in_menu ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                                page.in_menu ? 'translate-x-4' : 'translate-x-0.5'
                                            }`}
                                        />
                                    </button>
                                </div>

                                {/* Actions row */}
                                <div className="flex items-center justify-between gap-1 pt-1">
                                    <a
                                        href={`/website/builder/${page.id}`}
                                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                                    >
                                        <Edit3 className="h-3 w-3" />
                                        Edit page
                                    </a>

                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleDuplicate(page)}
                                            disabled={actionId === page.id}
                                            title="Duplicate page"
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(page)}
                                            disabled={actionId === page.id}
                                            title="Delete page to trash"
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Empty state with 3 starter layouts */
                <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-8 sm:p-12 text-center space-y-6">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <Layers className="h-7 w-7" />
                    </div>

                    <div className="max-w-md mx-auto">
                        <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                            No extra pages yet
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Create custom pages for health camps, clinical guidelines, or specialized laboratory services. Choose a starter layout below:
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
                        {STARTER_LAYOUTS.map((starter) => {
                            const StarterIcon = starter.icon;
                            return (
                                <button
                                    key={starter.key}
                                    type="button"
                                    onClick={() => {
                                        setSelectedStarter(starter.key);
                                        setTitle(starter.title);
                                        setSlug(slugify(starter.title));
                                        setCreateModalOpen(true);
                                    }}
                                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-slate-900 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition group"
                                >
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition">
                                            <StarterIcon className="h-5 w-5" />
                                        </div>
                                        <span
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                starter.isPremium
                                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                            }`}
                                        >
                                            {starter.badge}
                                        </span>
                                    </div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                        {starter.title}
                                    </div>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                        {starter.description}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Create Page Dialog */}
            {createModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
                    <div
                        className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl p-6"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="create-page-title"
                    >
                        <button
                            type="button"
                            onClick={() => setCreateModalOpen(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h3 id="create-page-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
                            Create a new page
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Add a page to your clinic site with a custom URL and layout template.
                        </p>

                        {error && (
                            <div className="mt-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 text-xs text-red-700 dark:text-red-300">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleCreatePage} className="mt-4 space-y-4">
                            {/* Starter choice */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Starter layout
                                </label>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                                    {STARTER_LAYOUTS.map((s) => (
                                        <button
                                            key={s.key}
                                            type="button"
                                            onClick={() => setSelectedStarter(s.key)}
                                            className={`p-2.5 rounded-xl border text-left text-xs transition flex flex-col justify-between ${
                                                selectedStarter === s.key
                                                    ? 'border-primary bg-primary/10 font-bold text-primary dark:text-white'
                                                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            <div className="font-semibold truncate">{s.title}</div>
                                            <div className="text-[10px] text-slate-400 mt-1">{s.badge}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Title */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Page title <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => handleTitleChange(e.target.value)}
                                    placeholder="e.g. Clinical Guidelines"
                                    className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                                    required
                                />
                            </div>

                            {/* Slug */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    URL Slug <span className="text-red-500">*</span>
                                </label>
                                <div className="flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-3 py-1.5 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
                                    <span className="text-xs text-slate-400 font-mono">/p/</span>
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={(e) => {
                                            setSlugTouched(true);
                                            setSlug(e.target.value.toLowerCase().trim());
                                        }}
                                        placeholder="clinical-guidelines"
                                        className="w-full bg-transparent border-0 p-0 pl-1 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-0"
                                        required
                                    />
                                </div>
                                <p className="mt-1 text-[11px] text-slate-400">
                                    Patients will visit this page at {clinic.site_url.replace(/\/$/, '')}/p/{slug || 'page-slug'}
                                </p>
                            </div>

                            {/* Submit buttons */}
                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setCreateModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !title.trim() || !slug.trim()}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-xs font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-50 transition"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                            Creating…
                                        </>
                                    ) : (
                                        'Create page'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
