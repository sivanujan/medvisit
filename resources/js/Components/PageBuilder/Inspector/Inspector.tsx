import React from 'react';
import { Sliders, Copy, Trash2 } from 'lucide-react';
import type { InspectorTabName, TabBaseProps } from '../types';
import ContentTab from './ContentTab';
import StyleTab from './StyleTab';
import AdvancedTab from './AdvancedTab';

class BuilderErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean; error: Error | null }
> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, errorInfo: any) {
        console.error('Builder error caught by ErrorBoundary:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4 bg-rose-950/80 border border-rose-500/30 rounded-xl text-rose-200 text-xs m-4">
                    <p className="font-bold text-rose-300 mb-1">Inspector Notice</p>
                    <p className="text-[11px] opacity-80">{this.state.error?.message || 'Property read error'}</p>
                    <button
                        type="button"
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="mt-2 px-2.5 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold"
                    >
                        Reset Inspector
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

interface InspectorProps extends TabBaseProps {
    selectedTagName: string;
    selectedWidgetName: string;
    inspectorTab: InspectorTabName;
    setInspectorTab: (tab: InspectorTabName) => void;
    setSelectedComponent: (component: any) => void;
    setIsDirty: (dirty: boolean) => void;
    onOpenMedia: (currentValue: string, onPick?: (url: string) => void) => void;
}

export default function Inspector({
    editor,
    selectedComponent,
    selectedTagName,
    selectedWidgetName,
    inspectorTab,
    setInspectorTab,
    setSelectedComponent,
    setIsDirty,
    onOpenMedia,
}: InspectorProps) {
    return (
        <aside className="w-72 bg-slate-950 border-l border-white/10 flex flex-col flex-shrink-0 z-20">
            <div className="h-11 border-b border-white/10 bg-slate-900/50 px-4 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-teal-400" />
                    <span>Inspector</span>
                </span>

                {selectedComponent && (
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => {
                                try {
                                    const parent = selectedComponent.parent?.();
                                    if (parent) {
                                        const clone = selectedComponent.clone();
                                        const index = selectedComponent.index?.() ?? 0;
                                        parent.append(clone, { at: index + 1 });
                                        editor?.select(clone);
                                    } else {
                                        selectedComponent.clone();
                                    }
                                    setIsDirty(true);
                                } catch (err) {
                                    console.warn('Clone error', err);
                                }
                            }}
                            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded"
                            title="Duplicate element"
                        >
                            <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                try {
                                    selectedComponent.remove?.();
                                    setSelectedComponent(null);
                                    setIsDirty(true);
                                } catch (err) {
                                    console.warn('Remove error', err);
                                }
                            }}
                            className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded"
                            title="Delete element"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Subtabs: Content, Style, Advanced */}
            <div className="grid grid-cols-3 border-b border-white/10 text-xs text-center font-bold">
                <button
                    type="button"
                    onClick={() => setInspectorTab('content')}
                    className={`py-2 transition-colors ${
                        inspectorTab === 'content'
                            ? 'text-teal-400 border-b-2 border-teal-400 bg-white/5'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    Content
                </button>
                <button
                    type="button"
                    onClick={() => setInspectorTab('style')}
                    className={`py-2 transition-colors ${
                        inspectorTab === 'style'
                            ? 'text-teal-400 border-b-2 border-teal-400 bg-white/5'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    Style
                </button>
                <button
                    type="button"
                    onClick={() => setInspectorTab('advanced')}
                    className={`py-2 transition-colors ${
                        inspectorTab === 'advanced'
                            ? 'text-teal-400 border-b-2 border-teal-400 bg-white/5'
                            : 'text-slate-400 hover:text-white'
                    }`}
                >
                    Advanced
                </button>
            </div>

            {/* Inspector Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
                <BuilderErrorBoundary>
                    {/* Fallback prompt when no component selected */}
                    {!selectedComponent && (
                        <div className="text-center py-12 text-slate-500">
                            <Sliders className="w-8 h-8 stroke-1 mx-auto mb-2 opacity-50" />
                            <p className="text-xs font-bold text-slate-400">No element selected</p>
                            <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] mx-auto">
                                Click any section, heading, button, or widget on the canvas to configure its content &amp; styles.
                            </p>
                        </div>
                    )}

                    {/* Component Inspector Controls - Always mounted in DOM for GrapesJS appendTo */}
                    <div
                        style={
                            selectedComponent
                                ? { display: 'block' }
                                : { height: 0, opacity: 0, overflow: 'hidden', position: 'absolute', pointerEvents: 'none' }
                        }
                        className="space-y-4"
                    >
                        <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                            <div>
                                <span className="text-[10px] text-slate-400 block">Selected Target</span>
                                <span className="font-bold text-white text-xs">
                                    {selectedWidgetName || selectedTagName}
                                </span>
                            </div>
                            <span className="font-mono text-[10px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded">
                                &lt;{selectedTagName}&gt;
                            </span>
                        </div>

                        <ContentTab
                            editor={editor}
                            selectedComponent={selectedComponent}
                            setIsDirty={setIsDirty}
                            inspectorTab={inspectorTab}
                            selectedTagName={selectedTagName}
                            onOpenMedia={onOpenMedia}
                        />

                        <StyleTab
                            editor={editor}
                            selectedComponent={selectedComponent}
                            setIsDirty={setIsDirty}
                            inspectorTab={inspectorTab}
                            onOpenMedia={onOpenMedia}
                        />

                        <AdvancedTab
                            editor={editor}
                            selectedComponent={selectedComponent}
                            setIsDirty={setIsDirty}
                            inspectorTab={inspectorTab}
                        />
                    </div>
                </BuilderErrorBoundary>
            </div>
        </aside>
    );
}
