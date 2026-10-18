import React, { useState } from 'react';
import axios from 'axios';
import { Copy, ExternalLink, Home, Pencil, Plus, RotateCcw, Settings, Star, Trash2 } from 'lucide-react';
import NewPageDialog from './NewPageDialog';
import PageSettingsDialog from './PageSettingsDialog';
import { PAGE_TEMPLATES, type TemplateTenant } from './templates';
import type { PageSummary } from './types';

interface Props {
    pages: PageSummary[];
    clinic: TemplateTenant;
}

const btn =
    'inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold rounded-lg border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

function StatusBadges({ page }: { page: PageSummary }) {
    return (
        <div className="flex flex-wrap items-center gap-1">
            {page.is_published ? (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    Published
                </span>
            ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Draft
                </span>
            )}
            {page.has_unpublished_changes && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    Unpublished changes
                </span>
            )}
        </div>
    );
}

export default function PagesTable({ pages: initialPages, clinic }: Props) {
    const [pages, setPages] = useState<PageSummary[]>(initialPages);
    const [trash, setTrash] = useState<PageSummary[]>([]);
    const [showTrash, setShowTrash] = useState(false);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<PageSummary | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const refresh = async () => {
        const [list, trashed] = await Promise.all([
            axios.get<{ pages: PageSummary[] }>('/website/pages'),
            axios.get<{ pages: PageSummary[] }>('/website/pages/trash'),
        ]);
        setPages(list.data.pages);
        setTrash(trashed.data.pages);
    };

    const run = async (id: number, action: () => Promise<unknown>, fallback: string) => {
        setBusyId(id);
        setError(null);
        try {
            await action();
            await refresh();
        } catch (err: any) {
            setError(err?.response?.data?.message ?? fallback);
        } finally {
            setBusyId(null);
        }
    };

    const toggleTrash = async () => {
        if (!showTrash) {
            try {
                await refresh();
            } catch {
                setError('Could not load the trash.');
            }
        }
        setShowTrash((v) => !v);
    };

    const handleDelete = (page: PageSummary) => {
        if (!window.confirm(`Move "${page.title}" to the trash?`)) return;
        run(page.id, () => axios.delete(`/website/pages/${page.id}`), 'Could not delete the page.');
    };

    const rows = showTrash ? trash : pages;

    return (
        <div id="pages" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        MedVisit Page Builder
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        MedVisit Page Builder — design your clinic website with drag-and-drop sections, live doctor &amp;
                        session widgets, and responsive previews.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button type="button" onClick={toggleTrash} className={btn}>
                        <Trash2 className="w-3 h-3" />
                        {showTrash ? 'Back to pages' : 'Trash'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setCreating(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-sm transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        New page
                    </button>
                </div>
            </div>

            {error && (
                <p className="mx-4 sm:mx-5 mt-3 text-xs font-semibold text-red-600 dark:text-red-400" role="alert">
                    {error}
                </p>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-white/10">
                            <th className="px-4 sm:px-5 py-2.5 font-semibold">Page</th>
                            <th className="px-3 py-2.5 font-semibold">Status</th>
                            <th className="px-3 py-2.5 font-semibold">Updated</th>
                            <th className="px-4 sm:px-5 py-2.5 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-5 py-6 text-center text-slate-500 dark:text-slate-400">
                                    {showTrash ? 'The trash is empty.' : 'No pages yet. Create your first page.'}
                                </td>
                            </tr>
                        )}
                        {rows.map((page) => (
                            <tr key={page.id} className="border-b last:border-0 border-slate-100 dark:border-white/5">
                                <td className="px-4 sm:px-5 py-3">
                                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        {page.is_homepage && (
                                            <Star
                                                className="w-3.5 h-3.5 text-amber-500 fill-amber-500"
                                                aria-label="Homepage"
                                            />
                                        )}
                                        {page.title}
                                    </div>
                                    <div className="text-slate-500 dark:text-slate-400">/{page.slug}</div>
                                </td>
                                <td className="px-3 py-3">
                                    {showTrash ? (
                                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                            Deleted
                                        </span>
                                    ) : (
                                        <StatusBadges page={page} />
                                    )}
                                </td>
                                <td className="px-3 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                    {page.updated_at ? new Date(page.updated_at).toLocaleString() : '—'}
                                </td>
                                <td className="px-4 sm:px-5 py-3">
                                    <div className="flex flex-wrap justify-end gap-1.5">
                                        {showTrash ? (
                                            <button
                                                type="button"
                                                disabled={busyId === page.id}
                                                onClick={() =>
                                                    run(
                                                        page.id,
                                                        () => axios.post(`/website/pages/${page.id}/restore`),
                                                        'Could not restore the page.',
                                                    )
                                                }
                                                className={btn}
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                                Restore
                                            </button>
                                        ) : (
                                            <>
                                                <a href={`/website/builder/${page.id}`} className={btn}>
                                                    <Pencil className="w-3 h-3" />
                                                    Edit in builder
                                                </a>
                                                {page.is_published ? (
                                                    <a href={page.url} target="_blank" rel="noreferrer" className={btn}>
                                                        <ExternalLink className="w-3 h-3" />
                                                        View live
                                                    </a>
                                                ) : (
                                                    <button type="button" disabled className={btn}>
                                                        <ExternalLink className="w-3 h-3" />
                                                        View live
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={busyId === page.id}
                                                    onClick={() =>
                                                        run(
                                                            page.id,
                                                            () => axios.post(`/website/pages/${page.id}/duplicate`),
                                                            'Could not duplicate the page.',
                                                        )
                                                    }
                                                    className={btn}
                                                >
                                                    <Copy className="w-3 h-3" />
                                                    Duplicate
                                                </button>
                                                <button type="button" onClick={() => setEditing(page)} className={btn}>
                                                    <Settings className="w-3 h-3" />
                                                    Settings
                                                </button>
                                                {!page.is_homepage && (
                                                    <button
                                                        type="button"
                                                        disabled={busyId === page.id}
                                                        onClick={() =>
                                                            run(
                                                                page.id,
                                                                () => axios.post(`/website/pages/${page.id}/homepage`),
                                                                'Could not set the homepage.',
                                                            )
                                                        }
                                                        className={btn}
                                                    >
                                                        <Home className="w-3 h-3" />
                                                        Set as homepage
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={page.is_homepage || busyId === page.id}
                                                    title={page.is_homepage ? 'Set another page as homepage first' : undefined}
                                                    onClick={() => handleDelete(page)}
                                                    className={`${btn} !text-red-600 dark:!text-red-400`}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                    Delete
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {creating && (
                <NewPageDialog
                    templates={PAGE_TEMPLATES.map((t) => t.key)}
                    pages={pages}
                    clinic={clinic}
                    onClose={() => setCreating(false)}
                    onCreated={async () => {
                        setCreating(false);
                        try {
                            await refresh();
                        } catch {
                            setError('Page created, but the list could not be refreshed.');
                        }
                    }}
                />
            )}

            {editing && (
                <PageSettingsDialog
                    page={editing}
                    onClose={() => setEditing(null)}
                    onSaved={async () => {
                        setEditing(null);
                        try {
                            await refresh();
                        } catch {
                            setError('Settings saved, but the list could not be refreshed.');
                        }
                    }}
                />
            )}
        </div>
    );
}
