import React from 'react';
import { Sparkles } from 'lucide-react';
import { MEDICAL_ICONS, getMedicalSvg } from '@/Utils/medicalIcons';
import type { InspectorTabName, InspectorTabProps } from '../types';
import { describeComponent, setComponentContent } from './componentHelpers';
import HeadingContent from './content/HeadingContent';
import TextContent from './content/TextContent';
import ButtonContent from './content/ButtonContent';
import ImageContent from './content/ImageContent';
import type { ContentPanelProps } from './content/types';
import type { WidgetKind } from '../lib/widgetKinds';

interface ContentTabProps extends InspectorTabProps {
    inspectorTab: InspectorTabName;
    selectedTagName: string;
    onOpenMedia: (currentValue: string, onPick?: (url: string) => void) => void;
}

// Content panel for each widget kind; kinds without one show only the Element section.
const PANELS: Partial<Record<WidgetKind, React.ComponentType<ContentPanelProps>>> = {
    heading: HeadingContent,
    text: TextContent,
    button: ButtonContent,
    image: ImageContent,
};

export default function ContentTab({
    editor,
    selectedComponent,
    inspectorTab,
    setIsDirty,
    onOpenMedia,
}: ContentTabProps) {
    const { kind, label } = describeComponent(selectedComponent);
    const Panel = selectedComponent ? PANELS[kind] : undefined;
    const showIconPicker = selectedComponent && (kind === 'icon' || kind === 'generic');

    return (
        <div
            style={
                inspectorTab === 'content'
                    ? { display: 'block' }
                    : { height: 0, opacity: 0, overflow: 'hidden', position: 'absolute', pointerEvents: 'none' }
            }
            className="space-y-3"
        >
            {selectedComponent && (
                <div className="text-[11px] font-bold uppercase tracking-wide text-teal-400">Edit {label}</div>
            )}

            {Panel && editor && (
                <Panel
                    key={selectedComponent.cid}
                    editor={editor}
                    component={selectedComponent}
                    setIsDirty={setIsDirty}
                    onOpenMedia={onOpenMedia}
                />
            )}

            {showIconPicker && (
                <div className="pt-2 border-t border-white/10">
                    <label className="block text-[11px] font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                            <span>Medical Icon Picker</span>
                        </span>
                        <span className="text-[10px] text-teal-400 font-semibold">{MEDICAL_ICONS.length} icons</span>
                    </label>
                    <div className="grid grid-cols-5 gap-1.5 p-2 bg-slate-900 rounded-xl border border-white/10 max-h-44 overflow-y-auto">
                        {MEDICAL_ICONS.map((icon) => (
                            <button
                                key={icon.name}
                                type="button"
                                onClick={() => {
                                    const svgStr = getMedicalSvg(icon.name, { size: 28, color: '#0E9E8F' });
                                    setComponentContent(selectedComponent, svgStr);
                                    setIsDirty(true);
                                }}
                                className="p-1.5 rounded-lg bg-white/5 hover:bg-teal-500/20 hover:border-teal-500/50 border border-transparent flex flex-col items-center justify-center text-slate-300 hover:text-teal-300 transition-all group"
                                title={`${icon.label} (Click to insert)`}
                            >
                                <span dangerouslySetInnerHTML={{ __html: getMedicalSvg(icon.name, { size: 18 }) }} />
                                <span className="text-[8px] text-slate-400 mt-1 truncate max-w-[40px] text-center group-hover:text-teal-200">
                                    {icon.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Element section: GrapesJS traits (ID, Title) — container must stay mounted for GrapesJS. */}
            <details className="pt-2 border-t border-white/10 group" open={!Panel}>
                <summary className="text-[11px] font-bold text-slate-400 cursor-pointer select-none">Element</summary>
                <div id="builder-traits-container" className="space-y-2 text-xs mt-2" />
            </details>
        </div>
    );
}
