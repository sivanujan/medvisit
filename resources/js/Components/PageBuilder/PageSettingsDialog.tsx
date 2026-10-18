import React from 'react';
import { X } from 'lucide-react';
import PageSettingsForm from './PageSettingsForm';
import type { PageSummary } from './types';

interface Props {
    page: PageSummary;
    onClose: () => void;
    onSaved: (page: PageSummary) => void;
}

export default function PageSettingsDialog({ page, onClose, onSaved }: Props) {
    return (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-2xl space-y-4">
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
                <PageSettingsForm page={page} onSaved={onSaved} onCancel={onClose} />
            </div>
        </div>
    );
}
