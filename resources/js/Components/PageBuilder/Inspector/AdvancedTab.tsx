import React, { useEffect, useReducer, useState } from 'react';
import { Link2, Unlink2 } from 'lucide-react';
import type { Component, Editor, InspectorTabName, InspectorTabProps } from '../types';
import BoxSidesControl from '../controls/BoxSidesControl';
import { mediaOpts, useEditorTick, toDeviceName } from '../controls/useStyleProp';
import { ANIMATIONS } from '../lib/animations';
import type { Device } from '../lib/responsive';
import CustomCssEditor, { applyCustomCss } from './CustomCssEditor';
import Group from './style/Group';
import { SelectField, UnitField } from './style/fields';
import { getComponentClasses } from './componentHelpers';

interface AdvancedTabProps extends InspectorTabProps {
    inspectorTab: InspectorTabName;
}

const MARGIN_SIDES = [
    { prop: 'margin-top', label: 'Top' },
    { prop: 'margin-right', label: 'Right' },
    { prop: 'margin-bottom', label: 'Bottom' },
    { prop: 'margin-left', label: 'Left' },
];
const PADDING_SIDES = MARGIN_SIDES.map((s) => ({ ...s, prop: s.prop.replace('margin', 'padding') }));
const DEVICES: Device[] = ['desktop', 'tablet', 'mobile'];
const POSITIONS = ['static', 'relative', 'absolute', 'sticky'].map((v) => ({ value: v, label: v }));
const ANIMATION_OPTIONS = [{ value: '', label: 'None' }, ...ANIMATIONS.map((a) => ({ value: a, label: a }))];

const inputClass =
    'w-full text-[11px] rounded-lg bg-white/5 border border-white/10 text-white px-2 py-1 focus:outline-none focus:border-teal-500';
const labelClass = 'block text-[11px] font-bold text-slate-300 mb-1';

function SpacingGroup({ editor }: { editor: Editor }) {
    const [linked, setLinked] = useState(false);
    return (
        <Group title="Spacing" editor={editor} defaultOpen>
            <button
                type="button"
                onClick={() => setLinked((l) => !l)}
                aria-pressed={linked}
                className={`flex items-center gap-1.5 text-[11px] font-bold ${linked ? 'text-teal-300' : 'text-slate-400'}`}
            >
                {linked ? <Link2 className="w-3.5 h-3.5" /> : <Unlink2 className="w-3.5 h-3.5" />}
                {linked ? 'Sides linked' : 'Link all sides'}
            </button>
            <div>
                <span className={labelClass}>Margin</span>
                <BoxSidesControl editor={editor} sides={MARGIN_SIDES} linked={linked} />
            </div>
            <div>
                <span className={labelClass}>Padding</span>
                <BoxSidesControl editor={editor} sides={PADDING_SIDES} linked={linked} />
            </div>
        </Group>
    );
}

function IdClassesGroup({ editor, component, onChange }: { editor: Editor; component: Component; onChange: () => void }) {
    const [id, setId] = useState<string>(component.getId?.() ?? '');
    const [classes, setClasses] = useState(getComponentClasses(component));

    useEffect(() => {
        setId(component.getId?.() ?? '');
        setClasses(getComponentClasses(component));
    }, [component]);

    const commitId = () => {
        const next = id.trim().replace(/[^A-Za-z0-9_-]/g, '');
        const prev: string = component.getId();
        if (!next || next === prev) {
            setId(prev);
            return;
        }
        const custom: string = component.getAttributes()?.['data-mv-custom-css'] ?? '';
        // Custom CSS rules reference the old id; clear them and re-add against the new one.
        if (custom) applyCustomCss(editor, component, '');
        component.setId(next);
        if (custom) applyCustomCss(editor, component, custom);
        setId(next);
        onChange();
    };

    const commitClasses = () => {
        const wanted = classes.split(/\s+/).filter(Boolean);
        const current = getComponentClasses(component).split(/\s+/).filter(Boolean);
        const removed = current.filter((c) => !wanted.includes(c));
        const added = wanted.filter((c) => !current.includes(c));
        if (removed.length) component.removeClass(removed);
        if (added.length) component.addClass(added);
        if (removed.length || added.length) onChange();
    };

    return (
        <Group title="CSS ID & classes" editor={editor}>
            <div>
                <label className={labelClass}>Element ID (#)</label>
                <input aria-label="Element ID" value={id} onChange={(e) => setId(e.target.value)} onBlur={commitId} className={inputClass} />
            </div>
            <div>
                <label className={labelClass}>CSS classes</label>
                <input
                    aria-label="CSS classes"
                    value={classes}
                    onChange={(e) => setClasses(e.target.value)}
                    onBlur={commitClasses}
                    placeholder="class-one class-two"
                    className={inputClass}
                />
            </div>
        </Group>
    );
}

function isHiddenOn(editor: Editor, component: Component, device: Device): boolean {
    const rule = editor.Css.getRule(`#${component.getId()}`, mediaOpts(editor, device));
    return rule?.getStyle?.()?.display === 'none';
}

function setHiddenOn(editor: Editor, component: Component, device: Device, hidden: boolean) {
    const selector = `#${component.getId()}`;
    const opts = mediaOpts(editor, device);
    const attr = `data-mv-hidden-${device}`;
    if (hidden) {
        editor.Css.setRule(selector, { display: 'none' }, { ...opts, addStyles: true });
        component.addAttributes({ id: component.getId(), [attr]: '1' });
    } else {
        const rule = editor.Css.getRule(selector, opts);
        if (rule) {
            const { display: _display, ...rest } = rule.getStyle();
            rule.setStyle(rest);
        }
        component.removeAttributes(attr);
    }
}

function VisibilityGroup({ editor, component, onChange }: { editor: Editor; component: Component; onChange: () => void }) {
    useEditorTick(editor);
    const [, bump] = useReducer((n: number) => n + 1, 0);
    return (
        <Group title="Responsive visibility" editor={editor}>
            {DEVICES.map((d) => (
                <label key={d} className="flex items-center gap-2 text-[11px] text-slate-200">
                    <input
                        type="checkbox"
                        checked={isHiddenOn(editor, component, d)}
                        onChange={(e) => {
                            setHiddenOn(editor, component, d, e.target.checked);
                            bump();
                            onChange();
                        }}
                    />
                    Hide on {toDeviceName(d)}
                </label>
            ))}
            <p className="text-[10px] text-slate-400">
                Hidden elements stay visible (faded) in the editor. Hiding on Desktop also applies to smaller devices
                unless shown again there.
            </p>
        </Group>
    );
}

function AnimationGroup({ editor, component, onChange }: { editor: Editor; component: Component; onChange: () => void }) {
    const [, bump] = useReducer((n: number) => n + 1, 0);
    const attrs = component.getAttributes() ?? {};
    const animation: string = attrs['data-mv-animation'] ?? '';

    const setAttr = (name: string, value: string) => {
        if (value === '') component.removeAttributes(name);
        else component.addAttributes({ [name]: value });
        bump();
        onChange();
    };
    const setAnimation = (value: string) => {
        if (value === '') {
            component.removeAttributes(['data-mv-animation', 'data-mv-duration', 'data-mv-delay']);
            bump();
            onChange();
        } else {
            setAttr('data-mv-animation', value);
        }
    };
    const num = (v: string) => (v === '' || Number.isNaN(Number(v)) || Number(v) < 0 ? '' : String(Math.round(Number(v))));

    return (
        <Group title="Entrance animation" editor={editor}>
            <div>
                <label className={labelClass}>Animation</label>
                <select
                    aria-label="Entrance animation"
                    value={animation}
                    onChange={(e) => setAnimation(e.target.value)}
                    className={inputClass}
                >
                    {ANIMATION_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value} className="bg-slate-900">
                            {o.label}
                        </option>
                    ))}
                </select>
            </div>
            {animation && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={labelClass}>Duration (ms)</label>
                        <input
                            aria-label="Animation duration"
                            type="number"
                            min={0}
                            step={100}
                            placeholder="600"
                            defaultValue={attrs['data-mv-duration'] ?? ''}
                            onBlur={(e) => setAttr('data-mv-duration', num(e.target.value))}
                            className={inputClass}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Delay (ms)</label>
                        <input
                            aria-label="Animation delay"
                            type="number"
                            min={0}
                            step={100}
                            placeholder="0"
                            defaultValue={attrs['data-mv-delay'] ?? ''}
                            onBlur={(e) => setAttr('data-mv-delay', num(e.target.value))}
                            className={inputClass}
                        />
                    </div>
                </div>
            )}
        </Group>
    );
}

export default function AdvancedTab({ editor, selectedComponent, inspectorTab, setIsDirty }: AdvancedTabProps) {
    const markDirty = () => setIsDirty(true);

    return (
        <div className={inspectorTab === 'advanced' ? 'space-y-3' : 'hidden'}>
            {editor && selectedComponent ? (
                // Re-key on the component instance so local field state resets when the selection changes.
                <div key={selectedComponent.cid ?? selectedComponent.getId?.() ?? 'sel'} className="space-y-3">
                    <SpacingGroup editor={editor} />
                    <IdClassesGroup editor={editor} component={selectedComponent} onChange={markDirty} />
                    <VisibilityGroup editor={editor} component={selectedComponent} onChange={markDirty} />
                    <AnimationGroup editor={editor} component={selectedComponent} onChange={markDirty} />
                    <Group title="Position & sticky" editor={editor}>
                        <SelectField editor={editor} prop="position" label="Position" options={POSITIONS} />
                        <UnitField editor={editor} prop="top" label="Top offset" placeholder="0" />
                        <UnitField editor={editor} prop="z-index" label="Z-index" units={['']} placeholder="auto" />
                    </Group>
                    <Group title="Custom CSS" editor={editor}>
                        <CustomCssEditor editor={editor} component={selectedComponent} onChange={markDirty} />
                    </Group>
                </div>
            ) : (
                <p className="text-[11px] text-slate-400">Select an element to edit advanced settings.</p>
            )}
        </div>
    );
}
