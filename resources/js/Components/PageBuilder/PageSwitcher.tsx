import React, { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { ChevronDown, Home, Plus, ShieldAlert } from 'lucide-react';
import NewPageDialog from './NewPageDialog';
import { PAGE_TEMPLATES, type TemplateTenant } from './templates';
import type { PageSummary } from './types';

interface Props {
    pages: PageSummary[];
    current: { id: number; title: string };
    isDirty: boolean;
    /** Saves the current draft; resolves true when the save succeeded. */
    onSaveDraft: () => Promise<boolean>;
    /** Called right before an intentional navigation so the beforeunload guard can step aside. */
    onWillNavigate?: () => void;
    clinic: TemplateTenant;
}

export default function PageSwitcher({ pages, current, isDirty, onSaveDraft, onWillNavigate, clinic }: Props) {
    const [open, setOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [pendingUrl, setPendingUrl] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const visit = (url: string) => {
        onWillNavigate?.();
        router.visit(url);
    };

    // Navigate straight away when clean, otherwise ask what to do with the unsaved changes.
    const requestNavigate = (url: string) => {
        setOpen(false);
        if (isDirty) {
            setPendingUrl(url);
        } else {
            visit(url);
        }
    };

    const select = (page: PageSummary) => {
        if (page.id === current.id) {
            setOpen(false);
            return;
        }
        requestNavigate(`/website/builder/${page.id}`);
    };

    const saveAndGo = async () => {
        if (!pendingUrl) return;
        setBusy(true);
        try {
            const ok = await onSaveDraft();
            if (ok) {
                const url = pendingUrl;
                setPendingUrl(null);
                visit(url);
            }
        } finally {
            setBusy(false);
        }
    };

    const discardAndGo = () => {
        if (!pendingUrl) return;
        const url = pendingUrl;
        setPendingUrl(null);
        visit(url);
    };

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors max-w-[200px]"
                title="Switch page"
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className="truncate">{current.title}</span>
                <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
            </button>

            {open && (
                <div
                    role="listbox"
                    className="absolute left-0 top-full mt-1 w-64 max-h-80 overflow-y-auto rounded-xl bg-slate-900 border border-white/10 shadow-2xl z-50 py-1"
                >
                    {pages.map((p) => (
                        <button
                            key={p.id}
                            type="button"
                            role="option"
                            aria-selected={p.id === current.id}
                            onClick={() => select(p)}
                            className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-white/5 ${
                                p.id === current.id ? 'text-teal-400 font-bold' : 'text-slate-200'
                            }`}
                        >
                            {p.is_homepage ? (
                                <Home className="w-3 h-3 shrink-0" />
                            ) : (
                                <span className="w-3 shrink-0" />
                            )}
                            <span className="truncate flex-1">{p.title}</span>
                            {!p.is_published && (
                                <span className="text-[10px] font-semibold text-amber-400">Draft</span>
                            )}
                        </button>
                    ))}
                    <div className="border-t border-white/10 mt-1 pt-1">
                        <button
                            type="button"
                            onClick={() => {
                                setOpen(false);
                                setCreating(true);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-bold text-teal-400 hover:bg-white/5 flex items-center gap-2"
                        >
                            <Plus className="w-3 h-3" /> New page
                        </button>
                    </div>
                </div>
            )}

            {creating && (
                <NewPageDialog
                    templates={PAGE_TEMPLATES.map((t) => t.key)}
                    pages={pages}
                    clinic={clinic}
                    onClose={() => setCreating(false)}
                    onCreated={(page) => {
                        setCreating(false);
                        requestNavigate(`/website/builder/${page.id}`);
                    }}
                />
            )}

            {pendingUrl && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-white/10 p-6 shadow-2xl text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Unsaved changes</h3>
                            <p className="text-xs text-slate-400 mt-1">
                                Save your draft of "{current.title}" before switching pages?
                            </p>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setPendingUrl(null)}
                                disabled={busy}
                                className="flex-1 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:bg-white/5"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={discardAndGo}
                                disabled={busy}
                                className="flex-1 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:bg-white/5"
                            >
                                Discard
                            </button>
                            <button
                                type="button"
                                onClick={saveAndGo}
                                disabled={busy}
                                className="flex-1 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white disabled:opacity-60"
                            >
                                {busy ? 'Saving...' : 'Save draft'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
