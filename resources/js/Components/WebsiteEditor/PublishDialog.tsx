import React, { useState } from 'react';
import axios from 'axios';
import {
    CheckCircle2,
    XCircle,
    AlertTriangle,
    X,
    Loader2,
    Globe,
    ExternalLink,
    Power,
    Check,
} from 'lucide-react';
import type { ChecklistItem, SiteStatus } from './useWebsiteDraft';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    status: SiteStatus;
    onStatusChange: (status: SiteStatus) => void;
    siteUrl: string;
}

export default function PublishDialog({ isOpen, onClose, status, onStatusChange, siteUrl }: Props) {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const blockingItems = status.checklist.filter((i) => i.blocking);
    const warningItems = status.checklist.filter((i) => !i.blocking);
    const hasBlockingError = blockingItems.some((i) => !i.ok);

    const handlePublish = async (publish: boolean) => {
        setSubmitting(true);
        setError(null);
        try {
            const { data } = await axios.post(
                '/website/publish',
                { published: publish },
                { headers: { Accept: 'application/json' } },
            );
            if (data.status) {
                onStatusChange(data.status);
            }
            onClose();
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Could not complete the publishing request. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div
                className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="publish-dialog-title"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    aria-label="Close"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Globe className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 id="publish-dialog-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            Publish website to live
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {status.change_count > 0
                                ? `${status.change_count} unpublished changes will be made live to patients.`
                                : 'All changes are up to date.'}
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 text-xs text-red-700 dark:text-red-300">
                        {error}
                    </div>
                )}

                {/* Pre-publish checklist */}
                <div className="space-y-4 my-4 max-h-[60vh] overflow-y-auto pr-1">
                    {/* Required checks */}
                    <div>
                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Required before publishing
                        </h4>
                        <div className="space-y-2">
                            {blockingItems.map((item) => (
                                <div
                                    key={item.key}
                                    className={`flex items-start gap-3 rounded-xl border p-3 text-xs transition ${
                                        item.ok
                                            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                                            : 'border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-950/30'
                                    }`}
                                >
                                    {item.ok ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    ) : (
                                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                        <div className="font-semibold text-slate-900 dark:text-slate-100">{item.label}</div>
                                        {!item.ok && <p className="text-red-700 dark:text-red-300 mt-0.5">{item.hint}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recommended checks (warnings) */}
                    <div>
                        <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                            Recommended for a great patient experience
                        </h4>
                        <div className="space-y-2">
                            {warningItems.map((item) => (
                                <div
                                    key={item.key}
                                    className={`flex items-start gap-3 rounded-xl border p-3 text-xs transition ${
                                        item.ok
                                            ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                                            : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/20'
                                    }`}
                                >
                                    {item.ok ? (
                                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                        <div className="font-medium text-slate-800 dark:text-slate-200">{item.label}</div>
                                        {!item.ok && <p className="text-amber-700 dark:text-amber-300 mt-0.5">{item.hint}</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {hasBlockingError && (
                    <p className="text-xs text-red-600 dark:text-red-400 mb-4 font-medium">
                        Complete all required items before publishing your website.
                    </p>
                )}

                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                    {status.is_published ? (
                        <button
                            type="button"
                            onClick={() => handlePublish(false)}
                            disabled={submitting}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition"
                        >
                            <Power className="h-3.5 w-3.5" />
                            Take site offline
                        </button>
                    ) : (
                        <div />
                    )}

                    <div className="flex items-center gap-2 self-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePublish(true)}
                            disabled={hasBlockingError || submitting}
                            className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-primary text-xs font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    Publishing…
                                </>
                            ) : (
                                <>
                                    <Globe className="h-3.5 w-3.5" />
                                    Publish website
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
