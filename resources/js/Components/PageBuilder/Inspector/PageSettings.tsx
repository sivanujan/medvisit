import React, { useState } from 'react';
import axios from 'axios';
import { ArrowLeft, Home, Settings } from 'lucide-react';
import PageSettingsForm from '../PageSettingsForm';
import type { PageSummary } from '../types';

interface Props {
    page: PageSummary;
    onClose: () => void;
    onSaved: (page: PageSummary) => void;
}

export default function PageSettings({ page, onClose, onSaved }: Props) {
    const [settingHome, setSettingHome] = useState(false);
    const [homeError, setHomeError] = useState<string | null>(null);

    const makeHomepage = async () => {
        setSettingHome(true);
        setHomeError(null);
        try {
            const res = await axios.post<PageSummary>(`/website/pages/${page.id}/homepage`);
            onSaved(res.data);
        } catch {
            setHomeError('Could not set the homepage.');
        } finally {
            setSettingHome(false);
        }
    };

    return (
        <aside className="w-72 bg-slate-950 border-l border-white/10 flex flex-col flex-shrink-0 z-20">
            <div className="h-11 border-b border-white/10 bg-slate-900/50 px-4 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-teal-400" />
                    <span>Page settings</span>
                </span>
                <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-white"
                    title="Back to the element inspector"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                <PageSettingsForm key={page.id} page={page} onSaved={onSaved} tone="panel" />

                <div className="pt-3 border-t border-white/10 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-300">Homepage</label>
                    {page.is_homepage ? (
                        <p className="text-[11px] text-teal-400 flex items-center gap-1">
                            <Home className="w-3 h-3" /> This page is the homepage.
                        </p>
                    ) : (
                        <button
                            type="button"
                            onClick={makeHomepage}
                            disabled={settingHome}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-200 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50"
                        >
                            <Home className="w-3.5 h-3.5" />
                            {settingHome ? 'Setting...' : 'Set as homepage'}
                        </button>
                    )}
                    {homeError && <p className="text-xs text-red-500">{homeError}</p>}
                </div>
            </div>
        </aside>
    );
}
