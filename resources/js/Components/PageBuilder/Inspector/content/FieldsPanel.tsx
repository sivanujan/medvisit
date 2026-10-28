import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { MEDICAL_ICONS, getMedicalSvg } from '@/Utils/medicalIcons';
import { starsHtml } from '../../lib/moreWidgets';
import ResponsiveField from '../../controls/ResponsiveField';
import UnitInput from '../../controls/UnitInput';
import type { WidgetKind } from '../../lib/widgetKinds';
import { FieldLabel, SelectField, TextField } from './fields';
import { getAttr, plainText, setLinkAttributes, setOwnText } from './componentOps';
import type { ContentPanelProps } from './types';

// One Content panel for the simple Batch A widgets: each field edits a [data-mv-field] part in place.
type Field =
    | { type: 'text' | 'textarea'; key: string; label: string }
    | { type: 'link'; key: string; label: string }
    | { type: 'image'; key: string; label: string }
    | { type: 'icon'; key: string; label: string }
    | { type: 'stars'; key: string; label: string }
    | { type: 'count'; key: string; label: string }
    | { type: 'percent'; label: string }
    | { type: 'tone'; label: string }
    | { type: 'divider'; label: string }
    | { type: 'height'; label: string };

export const FIELD_CONFIGS: Partial<Record<WidgetKind, Field[]>> = {
    'icon-box': [
        { type: 'icon', key: 'icon', label: 'Icon' },
        { type: 'text', key: 'title', label: 'Title' },
        { type: 'textarea', key: 'text', label: 'Text' },
    ],
    'image-box': [
        { type: 'image', key: 'image', label: 'Image' },
        { type: 'text', key: 'title', label: 'Title' },
        { type: 'textarea', key: 'text', label: 'Text' },
    ],
    alert: [
        { type: 'tone', label: 'Type' },
        { type: 'text', key: 'title', label: 'Title' },
        { type: 'textarea', key: 'text', label: 'Message' },
    ],
    'star-rating': [
        { type: 'stars', key: 'stars', label: 'Rating' },
        { type: 'text', key: 'label', label: 'Label' },
    ],
    counter: [
        { type: 'count', key: 'number', label: 'Number' },
        { type: 'text', key: 'suffix', label: 'Suffix (e.g. + or %)' },
        { type: 'text', key: 'label', label: 'Label' },
    ],
    'progress-bar': [
        { type: 'text', key: 'label', label: 'Label' },
        { type: 'percent', label: 'Percentage' },
    ],
    testimonial: [
        { type: 'textarea', key: 'quote', label: 'Quote' },
        { type: 'text', key: 'name', label: 'Name' },
        { type: 'text', key: 'role', label: 'Role / place' },
        { type: 'image', key: 'image', label: 'Photo' },
        { type: 'stars', key: 'stars', label: 'Rating' },
    ],
    cta: [
        { type: 'text', key: 'title', label: 'Title' },
        { type: 'textarea', key: 'text', label: 'Text' },
        { type: 'link', key: 'button', label: 'Button' },
    ],
    divider: [{ type: 'divider', label: 'Line' }],
    spacer: [{ type: 'height', label: 'Height' }],
};

const TONES: Record<string, { background: string; border: string; color: string }> = {
    info: { background: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
    success: { background: '#ecfdf5', border: '#a7f3d0', color: '#065f46' },
    warning: { background: '#fffbeb', border: '#fde68a', color: '#92400e' },
    danger: { background: '#fef2f2', border: '#fecaca', color: '#991b1b' },
};

function part(component: any, key: string): any | null {
    return component.find?.(`[data-mv-field="${key}"]`)?.[0] ?? null;
}

function TextPart({ component, field, setIsDirty }: { component: any; field: { key: string; label: string; type: string }; setIsDirty: (d: boolean) => void }) {
    const target = part(component, field.key);
    const [value, setValue] = useState(() => (target ? plainText(target) : ''));
    if (!target) return null;
    return (
        <TextField
            label={field.label}
            value={value}
            multiline={field.type === 'textarea'}
            onChange={(v) => {
                setValue(v);
                setOwnText(target, v);
                setIsDirty(true);
            }}
        />
    );
}

function LinkPart({ component, field, setIsDirty }: { component: any; field: { key: string; label: string }; setIsDirty: (d: boolean) => void }) {
    const target = part(component, field.key);
    const [text, setText] = useState(() => (target ? plainText(target) : ''));
    const [href, setHref] = useState(() => (target ? getAttr(target, 'href') : ''));
    if (!target) return null;
    return (
        <div className="space-y-2">
            <TextField label={`${field.label} text`} value={text} onChange={(v) => { setText(v); setOwnText(target, v); setIsDirty(true); }} />
            <TextField label={`${field.label} link`} value={href} placeholder="/book or https://…" onChange={(v) => { setHref(v); setLinkAttributes(target, v, false); setIsDirty(true); }} />
        </div>
    );
}

function ImagePart({ component, field, setIsDirty, onOpenMedia }: { component: any; field: { key: string; label: string }; setIsDirty: (d: boolean) => void; onOpenMedia: ContentPanelProps['onOpenMedia'] }) {
    const target = part(component, field.key);
    const [src, setSrc] = useState(() => (target ? getAttr(target, 'src') : ''));
    if (!target) return null;
    return (
        <div>
            <FieldLabel>{field.label}</FieldLabel>
            {src && <img src={src} alt="" className="w-full h-24 object-cover rounded-xl border border-white/10 mb-2" />}
            <button
                type="button"
                onClick={() => onOpenMedia(src, (url) => { setSrc(url); target.addAttributes({ src: url }); setIsDirty(true); })}
                className="w-full inline-flex items-center justify-center gap-1.5 text-[11px] font-bold rounded-xl bg-teal-600 hover:bg-teal-500 text-white px-2.5 py-1.5"
            >
                <ImageIcon className="w-3.5 h-3.5" />
                Choose image
            </button>
        </div>
    );
}

function IconPart({ component, field, setIsDirty }: { component: any; field: { key: string; label: string }; setIsDirty: (d: boolean) => void }) {
    const target = part(component, field.key);
    if (!target) return null;
    return (
        <div>
            <FieldLabel>{field.label}</FieldLabel>
            <div className="grid grid-cols-5 gap-1.5 p-2 bg-slate-900 rounded-xl border border-white/10 max-h-40 overflow-y-auto">
                {MEDICAL_ICONS.map((icon) => (
                    <button
                        key={icon.name}
                        type="button"
                        title={icon.label}
                        onClick={() => { target.components(getMedicalSvg(icon.name, { size: 32, color: 'currentColor' })); setIsDirty(true); }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-teal-500/20 flex items-center justify-center text-slate-300"
                    >
                        <span dangerouslySetInnerHTML={{ __html: getMedicalSvg(icon.name, { size: 18 }) }} />
                    </button>
                ))}
            </div>
        </div>
    );
}

function StarsPart({ component, field, setIsDirty }: { component: any; field: { key: string; label: string }; setIsDirty: (d: boolean) => void }) {
    const target = part(component, field.key);
    const [rating, setRating] = useState(() => Number(getAttr(component, 'data-mv-rating')) || (target ? (plainText(target).match(/★/g) || []).length : 5) || 5);
    if (!target) return null;
    return (
        <SelectField
            label={field.label}
            value={String(rating)}
            options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? 's' : ''}` }))}
            onChange={(v) => {
                const n = Number(v);
                setRating(n);
                component.addAttributes({ 'data-mv-rating': String(n) });
                target.components(starsHtml(n));
                setIsDirty(true);
            }}
        />
    );
}

function CountPart({ component, field, setIsDirty }: { component: any; field: { key: string; label: string }; setIsDirty: (d: boolean) => void }) {
    const target = part(component, field.key);
    const [value, setValue] = useState(() => (target ? getAttr(target, 'data-mv-count') || plainText(target) : ''));
    if (!target) return null;
    return (
        <TextField
            label={field.label}
            value={value}
            onChange={(v) => {
                const digits = v.replace(/[^\d]/g, '');
                setValue(digits);
                target.addAttributes({ 'data-mv-count': digits || '0' });
                setOwnText(target, digits || '0');
                setIsDirty(true);
            }}
        />
    );
}

function PercentPart({ component, setIsDirty }: { component: any; setIsDirty: (d: boolean) => void }) {
    const bar = part(component, 'bar');
    const text = part(component, 'percent-text');
    const [percent, setPercent] = useState(() => Number(getAttr(component, 'data-mv-percent')) || 50);
    return (
        <div>
            <FieldLabel>Percentage ({percent}%)</FieldLabel>
            <input
                type="range"
                min={0}
                max={100}
                value={percent}
                onChange={(e) => {
                    const p = Number(e.target.value);
                    setPercent(p);
                    component.addAttributes({ 'data-mv-percent': String(p) });
                    bar?.addStyle({ width: `${p}%` }, { mediaText: '' });
                    if (text) setOwnText(text, `${p}%`);
                    setIsDirty(true);
                }}
                className="w-full accent-teal-500"
            />
        </div>
    );
}

function TonePart({ component, setIsDirty }: { component: any; setIsDirty: (d: boolean) => void }) {
    const [tone, setTone] = useState(() => getAttr(component, 'data-mv-tone') || 'info');
    return (
        <SelectField
            label="Type"
            value={tone}
            options={[
                { value: 'info', label: 'Info (blue)' },
                { value: 'success', label: 'Success (green)' },
                { value: 'warning', label: 'Warning (amber)' },
                { value: 'danger', label: 'Danger (red)' },
            ]}
            onChange={(v) => {
                const t = TONES[v] ?? TONES.info;
                setTone(v);
                component.addAttributes({ 'data-mv-tone': v });
                component.addStyle({ background: t.background, border: `1px solid ${t.border}`, color: t.color }, { mediaText: '' });
                setIsDirty(true);
            }}
        />
    );
}

function DividerPart({ component, setIsDirty }: { component: any; setIsDirty: (d: boolean) => void }) {
    const line = part(component, 'line');
    const [style, setStyle] = useState('solid');
    const [thickness, setThickness] = useState(1);
    const [color, setColor] = useState('#e2e8f0');
    const [width, setWidth] = useState(100);
    if (!line) return null;
    const apply = (s: string, t: number, c: string, w: number) => {
        line.addStyle({ 'border-top': `${t}px ${s} ${c}`, width: `${w}%` }, { mediaText: '' });
        setIsDirty(true);
    };
    return (
        <div className="space-y-3">
            <SelectField label="Style" value={style} options={['solid', 'dashed', 'dotted', 'double'].map((s) => ({ value: s, label: s }))} onChange={(v) => { setStyle(v); apply(v, thickness, color, width); }} />
            <div>
                <FieldLabel>Thickness ({thickness}px)</FieldLabel>
                <input type="range" min={1} max={10} value={thickness} onChange={(e) => { const t = Number(e.target.value); setThickness(t); apply(style, t, color, width); }} className="w-full accent-teal-500" />
            </div>
            <div>
                <FieldLabel>Width ({width}%)</FieldLabel>
                <input type="range" min={10} max={100} value={width} onChange={(e) => { const w = Number(e.target.value); setWidth(w); apply(style, thickness, color, w); }} className="w-full accent-teal-500" />
            </div>
            <div>
                <FieldLabel>Color</FieldLabel>
                <input type="color" value={color} onChange={(e) => { setColor(e.target.value); apply(style, thickness, e.target.value, width); }} className="w-full h-8 rounded-lg bg-slate-900 border border-white/10" />
            </div>
        </div>
    );
}

export function makeFieldsPanel(kind: WidgetKind): React.ComponentType<ContentPanelProps> {
    const fields = FIELD_CONFIGS[kind] ?? [];
    return function KindFieldsPanel({ editor, component, setIsDirty, onOpenMedia }: ContentPanelProps) {
        return (
            <div className="space-y-3">
                {fields.map((field, i) => {
                    const key = `${field.type}-${i}`;
                    switch (field.type) {
                        case 'text':
                        case 'textarea':
                            return <TextPart key={key} component={component} field={field} setIsDirty={setIsDirty} />;
                        case 'link':
                            return <LinkPart key={key} component={component} field={field} setIsDirty={setIsDirty} />;
                        case 'image':
                            return <ImagePart key={key} component={component} field={field} setIsDirty={setIsDirty} onOpenMedia={onOpenMedia} />;
                        case 'icon':
                            return <IconPart key={key} component={component} field={field} setIsDirty={setIsDirty} />;
                        case 'stars':
                            return <StarsPart key={key} component={component} field={field} setIsDirty={setIsDirty} />;
                        case 'count':
                            return <CountPart key={key} component={component} field={field} setIsDirty={setIsDirty} />;
                        case 'percent':
                            return <PercentPart key={key} component={component} setIsDirty={setIsDirty} />;
                        case 'tone':
                            return <TonePart key={key} component={component} setIsDirty={setIsDirty} />;
                        case 'divider':
                            return <DividerPart key={key} component={component} setIsDirty={setIsDirty} />;
                        case 'height':
                            return (
                                <ResponsiveField key={key} editor={editor} prop="height" label={field.label}>
                                    {(p) => <UnitInput value={p.value} onChange={(v) => { p.set(v); setIsDirty(true); }} units={['px', 'rem', 'vh']} inherited={p.inherited} ariaLabel="Spacer height" />}
                                </ResponsiveField>
                            );
                        default:
                            return null;
                    }
                })}
            </div>
        );
    };
}
