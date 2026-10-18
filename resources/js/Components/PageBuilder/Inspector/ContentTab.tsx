import React from 'react';
import { Sparkles, Image as ImageIcon } from 'lucide-react';
import { MEDICAL_ICONS, getMedicalSvg } from '@/Utils/medicalIcons';
import type { InspectorTabName, InspectorTabProps } from '../types';
import { getComponentAttribute, getComponentContent, setComponentContent } from './componentHelpers';

interface ContentTabProps extends InspectorTabProps {
    inspectorTab: InspectorTabName;
    selectedTagName: string;
    onOpenMedia: (currentValue: string) => void;
}

export default function ContentTab({
    selectedComponent,
    inspectorTab,
    selectedTagName,
    setIsDirty,
    onOpenMedia,
}: ContentTabProps) {
    return (
        <div
            style={
                inspectorTab === 'content'
                    ? { display: 'block' }
                    : { height: 0, opacity: 0, overflow: 'hidden', position: 'absolute', pointerEvents: 'none' }
            }
            className="space-y-3"
        >
            {/* Image source chooser if image */}
            {selectedTagName === 'IMG' && selectedComponent && (
                <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Image Source
                    </label>
                    <div className="flex gap-1.5">
                        <input
                            type="text"
                            value={selectedComponent.get ? selectedComponent.get('src') || '' : ''}
                            onChange={(e) => {
                                selectedComponent.set?.('src', e.target.value);
                                setIsDirty(true);
                            }}
                            className="flex-1 text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-2.5 py-1.5"
                        />
                        <button
                            type="button"
                            onClick={() => {
                                onOpenMedia(selectedComponent.get ? selectedComponent.get('src') || '' : '');
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold"
                            title="Open Media Library"
                        >
                            <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            )}

            {/* GrapesJS Traits - Always mounted */}
            <div id="builder-traits-container" className="space-y-2 text-xs" />

            {/* Text content quick editor */}
            {['H1', 'H2', 'H3', 'H4', 'P', 'SPAN', 'A', 'BUTTON', 'LI'].includes(
                selectedTagName
            ) && selectedComponent && (
                <div key={`text-edit-${selectedComponent.cid || 'text'}`}>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Text Content
                    </label>
                    <textarea
                        rows={3}
                        defaultValue={getComponentContent(selectedComponent)}
                        onChange={(e) => {
                            setComponentContent(selectedComponent, e.target.value);
                            setIsDirty(true);
                        }}
                        className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-2.5 py-1.5 focus:border-teal-500"
                    />
                </div>
            )}

            {/* Link URL if anchor or button */}
            {(selectedTagName === 'A' || selectedTagName === 'BUTTON') && selectedComponent && (
                <div key={`link-edit-${selectedComponent.cid || 'link'}`}>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Link Destination (href)
                    </label>
                    <input
                        type="text"
                        defaultValue={getComponentAttribute(selectedComponent, 'href')}
                        onChange={(e) => {
                            try {
                                selectedComponent.addAttributes?.({ href: e.target.value });
                                setIsDirty(true);
                            } catch (err) {
                                console.warn('Error setting href', err);
                            }
                        }}
                        placeholder="/book or https://..."
                        className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-2.5 py-1.5 focus:border-teal-500"
                    />
                </div>
            )}

            {/* Medical Icon Picker */}
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
                                if (!selectedComponent) return;
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
                <p className="text-[10px] text-slate-500 mt-1">Click any icon to embed high-res Lucide SVG into the selected element.</p>
            </div>
        </div>
    );
}
