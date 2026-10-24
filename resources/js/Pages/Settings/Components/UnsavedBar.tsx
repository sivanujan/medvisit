import React from 'react';
import { AlertCircle, RotateCcw, Check, Loader2 } from 'lucide-react';

interface Props {
    show: boolean;
    isSaving: boolean;
    onSave: () => void;
    onDiscard: () => void;
    message?: string;
}

export default function UnsavedBar({
    show,
    isSaving,
    onSave,
    onDiscard,
    message = 'You have unsaved changes in this section',
}: Props) {
    if (!show) return null;

    return (
        <div
            role="region"
            aria-live="polite"
            aria-label="Unsaved changes alert bar"
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
            <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-900/90 dark:bg-slate-800/95 text-white backdrop-blur-xl border border-white/15 shadow-2xl shadow-black/40">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <div className="flex items-center gap-1.5 min-w-0">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 hidden sm:block" />
                        <span className="text-xs font-semibold text-slate-100 truncate">
                            {message}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={onDiscard}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Discard</span>
                    </button>

                    <button
                        type="button"
                        onClick={onSave}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-[#1E6FD9] hover:bg-blue-600 active:scale-95 text-white shadow-md shadow-[#1E6FD9]/30 transition-all disabled:opacity-60 cursor-pointer"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving…</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Save</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
