import React, { useState } from 'react';
import {
    Undo2,
    ExternalLink,
    Globe,
    Copy,
    Check,
    QrCode,
    Loader2,
    AlertCircle,
    CheckCircle2,
    LayoutTemplate,
    Sparkles,
} from 'lucide-react';
import type { SiteStatus, SaveState } from './useWebsiteDraft';
import QrCodeModal from './QrCodeModal';
import PublishDialog from './PublishDialog';

interface Props {
    status: SiteStatus;
    onStatusChange: (status: SiteStatus) => void;
    saveState: SaveState;
    canUndo: boolean;
    onUndo: () => void;
    clinic: {
        name: string;
        subdomain: string;
        site_url: string;
        display_host: string;
    };
}

function formatPublishedAt(iso: string | null): string {
    if (!iso) return '';
    try {
        const d = new Date(iso);
        const day = d.getDate();
        const month = d.toLocaleString('en-US', { month: 'short' });
        const time = d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        return `${day} ${month}, ${time}`;
    } catch {
        return iso;
    }
}

export default function EditorTopBar({
    status,
    onStatusChange,
    saveState,
    canUndo,
    onUndo,
    clinic,
}: Props) {
    const [qrOpen, setQrOpen] = useState(false);
    const [publishOpen, setPublishOpen] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(clinic.site_url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const hasChanges = status.change_count > 0;
    const isLive = status.is_published && !hasChanges;

    return (
        <>
            <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-6 py-3 transition-colors">
                <div className="flex flex-wrap items-center justify-between gap-3 max-w-[1700px] mx-auto">
                    {/* Left: Status Pill + Site Address */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Status Pill */}
                        {hasChanges ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 px-3 py-1 text-xs font-semibold text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50">
                                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                                Draft · {status.change_count} unpublished {status.change_count === 1 ? 'change' : 'changes'}
                            </span>
                        ) : isLive ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Live · published {formatPublishedAt(status.published_at)}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                <span className="h-2 w-2 rounded-full bg-slate-400" />
                                Draft · Not published
                            </span>
                        )}

                        {/* Site Address with Copy & QR buttons */}
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 rounded-xl px-2.5 py-1">
                            <a
                                href={clinic.site_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-normal text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary transition"
                            >
                                {clinic.display_host || clinic.site_url}
                            </a>
                            <button
                                type="button"
                                onClick={handleCopy}
                                title="Copy website link"
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition"
                            >
                                {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => setQrOpen(true)}
                                title="Show QR code"
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition"
                            >
                                <QrCode className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Right: Undo, Saved indicator, Preview, Publish */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Undo button */}
                        <button
                            type="button"
                            onClick={onUndo}
                            disabled={!canUndo}
                            title="Undo last change"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                        >
                            <Undo2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Undo</span>
                        </button>

                        {/* Saved State Indicator */}
                        <div className="text-xs font-medium min-w-[70px] text-right">
                            {saveState === 'saving' && (
                                <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                    <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                                    Saving…
                                </span>
                            )}
                            {saveState === 'saved' && (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Saved
                                </span>
                            )}
                            {saveState === 'pending' && (
                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    Unsaved
                                </span>
                            )}
                            {saveState === 'error' && (
                                <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    Save error
                                </span>
                            )}
                        </div>

                        {/* MedVisit Page Builder button */}
                        <a
                            href="/website/builder"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 dark:border-primary/40 bg-primary/10 dark:bg-primary/20 text-xs font-semibold text-primary dark:text-teal-300 hover:bg-primary/20 dark:hover:bg-primary/30 transition shadow-xs"
                            title="Open MedVisit visual drag-and-drop page builder"
                        >
                            <LayoutTemplate className="h-3.5 w-3.5" />
                            <span className="hidden md:inline">MedVisit</span> Page Builder
                        </a>

                        {/* Premium Templates button */}
                        <a
                            href="/website/templates/serene/preview"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-500/30 dark:border-amber-500/40 bg-amber-500/10 dark:bg-amber-500/20 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition shadow-xs"
                            title="Browse premium website templates"
                        >
                            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                            <span>Templates</span>
                        </a>

                        {/* Preview button (opens /preview in new tab) */}
                        <a
                            href="/preview"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                        >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Preview
                        </a>

                        {/* Publish button */}
                        <button
                            type="button"
                            onClick={() => setPublishOpen(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-xs font-semibold text-white shadow-sm hover:brightness-105 transition"
                        >
                            <Globe className="h-3.5 w-3.5" />
                            <span>Publish</span>
                            {status.change_count > 0 && (
                                <span className="ml-0.5 rounded-full bg-white/25 px-1.5 py-0.2 text-[10px] font-bold">
                                    {status.change_count}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            <QrCodeModal
                isOpen={qrOpen}
                onClose={() => setQrOpen(false)}
                url={clinic.site_url}
                clinicName={clinic.name}
                subdomain={clinic.subdomain}
            />

            <PublishDialog
                isOpen={publishOpen}
                onClose={() => setPublishOpen(false)}
                status={status}
                onStatusChange={onStatusChange}
                siteUrl={clinic.site_url}
            />
        </>
    );
}
