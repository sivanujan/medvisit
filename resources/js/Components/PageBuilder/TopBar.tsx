import React from 'react';
import { Save, Eye, ExternalLink, Undo, Redo, Smartphone, Tablet, Monitor, Check, AlertCircle, Sparkles, ArrowLeft, History, RefreshCw } from 'lucide-react';
import PageSwitcher from './PageSwitcher';
import type { TemplateTenant } from './templates';
import type { Editor, DeviceName, SaveState, PageSummary } from './types';

interface TopBarProps {
    editor: Editor | null;
    tenant: { name: string; logo_url?: string | null };
    isDirty: boolean;
    lastSavedTime: string | null;
    currentDevice: DeviceName;
    saving: boolean;
    saveState: SaveState;
    onExit: () => void;
    onSetDevice: (device: DeviceName) => void;
    onOpenTemplates: () => void;
    onOpenRevisions: () => void;
    onSave: (isPublish: boolean) => void;
    pages: PageSummary[];
    page: { id: number; title: string };
    previewHref: string;
    onSaveDraft: () => Promise<boolean>;
    onWillNavigate: () => void;
    clinic: TemplateTenant;
}

export default function TopBar({
    editor,
    tenant,
    isDirty,
    lastSavedTime,
    currentDevice,
    saving,
    saveState,
    onExit,
    onSetDevice,
    onOpenTemplates,
    onOpenRevisions,
    onSave,
    pages,
    page,
    previewHref,
    onSaveDraft,
    onWillNavigate,
    clinic,
}: TopBarProps) {
    return (
        <header className="h-14 bg-slate-950 border-b border-white/10 px-4 flex items-center justify-between z-30 flex-shrink-0">
            {/* Left: Exit button, Clinic Identity & Status */}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onExit}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    title="Return to website settings"
                >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Exit</span>
                </button>

                <div className="h-4 w-px bg-white/10" />

                <div className="flex items-center gap-2">
                    {tenant.logo_url ? (
                        <img
                            src={tenant.logo_url}
                            alt={tenant.name}
                            className="w-6 h-6 rounded-md object-cover border border-white/10"
                        />
                    ) : (
                        <div className="w-6 h-6 rounded-md bg-teal-600 text-white flex items-center justify-center text-xs font-bold">
                            {tenant.name.charAt(0)}
                        </div>
                    )}
                    <span className="font-bold text-xs text-white max-w-[160px] truncate" title={tenant.name}>
                        {tenant.name}
                    </span>
                </div>

                <PageSwitcher
                    pages={pages}
                    current={page}
                    isDirty={isDirty}
                    onSaveDraft={onSaveDraft}
                    onWillNavigate={onWillNavigate}
                    clinic={clinic}
                />

                {isDirty ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Unsaved Changes
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <Check className="w-3 h-3" />
                        Published {lastSavedTime ? `(${lastSavedTime})` : ''}
                    </span>
                )}
            </div>

            {/* Center: Device Viewport Switcher */}
            <div className="flex items-center p-1 rounded-xl bg-white/5 border border-white/10">
                <button
                    type="button"
                    onClick={() => onSetDevice('Desktop')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        currentDevice === 'Desktop'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                    }`}
                    title="Desktop Canvas (Full Width)"
                >
                    <Monitor className="w-3.5 h-3.5" /> Desktop
                </button>
                <button
                    type="button"
                    onClick={() => onSetDevice('Tablet')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        currentDevice === 'Tablet'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                    }`}
                    title="Tablet Canvas (768px)"
                >
                    <Tablet className="w-3.5 h-3.5" /> Tablet
                </button>
                <button
                    type="button"
                    onClick={() => onSetDevice('Mobile')}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        currentDevice === 'Mobile'
                            ? 'bg-teal-600 text-white shadow-xs'
                            : 'text-slate-400 hover:text-white'
                    }`}
                    title="Mobile Canvas (375px)"
                >
                    <Smartphone className="w-3.5 h-3.5" /> Mobile
                </button>
            </div>

            {/* Right: Actions, History, Preview, Save & Publish */}
            <div className="flex items-center gap-2">
                {/* Undo / Redo */}
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                    <button
                        type="button"
                        onClick={() => editor?.UndoManager?.undo()}
                        className="p-1.5 rounded-lg text-slate-300 hover:bg-white/10 transition-colors"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => editor?.UndoManager?.redo()}
                        className="p-1.5 rounded-lg text-slate-300 hover:bg-white/10 transition-colors"
                        title="Redo (Ctrl+Y)"
                    >
                        <Redo className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Templates Button */}
                <button
                    type="button"
                    onClick={onOpenTemplates}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                >
                    <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                    <span>Templates</span>
                </button>

                {/* Revisions Button */}
                <button
                    type="button"
                    onClick={onOpenRevisions}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    title="View revision history"
                >
                    <History className="w-3.5 h-3.5" />
                    <span>History</span>
                </button>

                {/* Preview Page */}
                <a
                    href={previewHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    title="View live preview on clinic subdomain"
                >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                    <ExternalLink className="w-3 h-3 opacity-60" />
                </a>

                {/* Save Draft Button */}
                <button
                    type="button"
                    onClick={() => onSave(false)}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 border border-white/15 transition-all shadow-sm"
                >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Draft</span>
                </button>

                {/* Publish Button */}
                <button
                    type="button"
                    onClick={() => onSave(true)}
                    disabled={saving}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all shadow-md active:scale-95 ${
                        saveState === 'ok'
                            ? 'bg-emerald-600'
                            : saveState === 'error'
                            ? 'bg-rose-600'
                            : 'bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 shadow-teal-500/20'
                    }`}
                >
                    {saveState === 'ok' ? (
                        <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Published!</span>
                        </>
                    ) : saveState === 'error' ? (
                        <>
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Save Failed</span>
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Publish Live</span>
                        </>
                    )}
                </button>
            </div>
        </header>
    );
}
