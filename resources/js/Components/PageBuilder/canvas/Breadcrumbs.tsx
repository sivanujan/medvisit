import React from 'react';
import { ChevronRight, Settings } from 'lucide-react';
import { breadcrumbPath } from '../lib/canvasHelpers';
import { describeComponent } from '../Inspector/componentHelpers';
import type { Component, Editor } from '../types';

interface BreadcrumbsProps {
    editor: Editor | null;
    selectedComponent: Component | null;
    pageTitle: string;
    pageSettingsOpen: boolean;
    onTogglePageSettings: () => void;
}

// Page › Section › Container › Widget for the selected element; each crumb selects that level.
export default function Breadcrumbs({ editor, selectedComponent, pageTitle, pageSettingsOpen, onTogglePageSettings }: BreadcrumbsProps) {
    const chain: Component[] = [];
    for (let c = selectedComponent; c && c.get?.('type') !== 'wrapper'; c = c.parent?.()) chain.unshift(c);
    const byId = new Map(chain.map((c) => [String(c.cid), c]));
    const crumbs = breadcrumbPath(
        chain.map((c) => ({ id: String(c.cid), kind: describeComponent(c).kind, customName: c.get('custom-name') || undefined })),
    );

    return (
        <div className="relative z-10 h-8 bg-slate-900 border-b border-white/10 px-3 flex items-center justify-between gap-2 flex-shrink-0">
            <nav aria-label="Selected element path" className="flex items-center gap-1 min-w-0 overflow-hidden text-[11px]">
                <button
                    type="button"
                    onClick={() => editor?.select?.(null)}
                    className="font-bold text-slate-300 hover:text-white truncate max-w-[160px]"
                    title="Page"
                >
                    {pageTitle}
                </button>
                {crumbs.map((crumb, i) => (
                    <React.Fragment key={`${crumb.id}-${i}`}>
                        <ChevronRight className="w-3 h-3 text-slate-600 flex-shrink-0" />
                        {crumb.id ? (
                            <button
                                type="button"
                                onClick={() => editor?.select?.(byId.get(crumb.id))}
                                className={`truncate max-w-[120px] ${
                                    i === crumbs.length - 1 ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                {crumb.label}
                            </button>
                        ) : (
                            <span className="text-slate-500">{crumb.label}</span>
                        )}
                    </React.Fragment>
                ))}
            </nav>
            <button
                type="button"
                onClick={onTogglePageSettings}
                className={`inline-flex items-center gap-1.5 text-[11px] font-bold flex-shrink-0 transition-colors ${
                    pageSettingsOpen ? 'text-teal-400' : 'text-slate-400 hover:text-white'
                }`}
                title="Page settings"
            >
                <Settings className="w-3.5 h-3.5" />
                <span>Page settings</span>
            </button>
        </div>
    );
}
