import React, { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { retagPlan } from '../../lib/contentHelpers';
import ResponsiveField from '../../controls/ResponsiveField';
import UnitInput from '../../controls/UnitInput';
import { SelectField, TextField } from './fields';
import { childElements, retag } from './componentOps';
import type { ContentPanelProps } from './types';

const CONTAINER_TAGS = ['section', 'div', 'header', 'footer', 'article', 'aside'];

export default function ContainerContent({ editor, component, setIsDirty, onOpenStyle }: ContentPanelProps) {
    const tag = String(component.get('tagName') || 'div').toLowerCase();
    // Sections built from blocks hold an inner ".medvisit-container" that carries the boxed width.
    const kids = childElements(component);
    const inner = kids.find((c: any) => (c.getClasses?.() || []).some((k: any) => String(k?.name ?? k) === 'medvisit-container')) ?? null;
    const widthTarget = inner ?? component;
    const currentMax = String(widthTarget.getStyle?.()?.['max-width'] || '');
    const [boxed, setBoxed] = useState(currentMax !== '' && currentMax !== 'none');
    const [maxWidth, setMaxWidth] = useState(currentMax && currentMax !== 'none' ? parseInt(currentMax, 10) || 1200 : 1200);

    const applyWidth = (isBoxed: boolean, width: number) => {
        widthTarget.addStyle(
            isBoxed
                ? { 'max-width': `${width}px`, 'margin-left': 'auto', 'margin-right': 'auto' }
                : { 'max-width': 'none' },
        );
        setIsDirty(true);
    };

    return (
        <div className="space-y-3">
            <SelectField
                label="HTML tag"
                value={tag}
                options={CONTAINER_TAGS.map((t) => ({ value: t, label: t }))}
                onChange={(v) => {
                    const next = retagPlan(v, CONTAINER_TAGS);
                    if (next && next !== tag) {
                        retag(editor, component, next);
                        setIsDirty(true);
                    }
                }}
            />
            <SelectField
                label="Content width"
                value={boxed ? 'boxed' : 'full'}
                options={[
                    { value: 'full', label: 'Full width' },
                    { value: 'boxed', label: 'Boxed' },
                ]}
                onChange={(v) => {
                    const isBoxed = v === 'boxed';
                    setBoxed(isBoxed);
                    applyWidth(isBoxed, maxWidth);
                }}
            />
            {boxed && (
                <TextField
                    label="Boxed max width (px)"
                    value={String(maxWidth)}
                    onChange={(v) => {
                        const w = Math.max(320, Math.min(2400, parseInt(v, 10) || 0));
                        setMaxWidth(w);
                        if (parseInt(v, 10) >= 320) applyWidth(true, w);
                    }}
                />
            )}
            <ResponsiveField editor={editor} prop="min-height" label="Min height">
                {(p) => <UnitInput value={p.value} onChange={(v) => { p.set(v); setIsDirty(true); }} units={['px', 'vh', 'rem']} inherited={p.inherited} ariaLabel="Min height" />}
            </ResponsiveField>
            {onOpenStyle && (
                <button
                    type="button"
                    onClick={onOpenStyle}
                    className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 px-2.5 py-1.5"
                >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    Layout settings (direction, gap, alignment)
                </button>
            )}
        </div>
    );
}
