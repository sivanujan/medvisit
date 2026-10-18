import React, { useState } from 'react';
import { Plus, Trash2, RefreshCw, Check } from 'lucide-react';
import type { Editor } from '../types';
import type { KitColor, SiteKit, TypographyKey } from '../lib/kit';
import { CURATED_FONTS } from '../lib/fonts';
import {
    MAX_CUSTOM_COLORS,
    SYSTEM_COLOR_IDS,
    THEME_COLORS,
    THEME_PRESET_LABELS,
    applyPreset,
    customColorCount,
    nextCustomColorId,
} from '../lib/kitEdit';
import DeviceToggle from '../controls/DeviceToggle';
import SelectControl from '../controls/SelectControl';
import UnitInput from '../controls/UnitInput';
import { useDevice } from '../controls/useStyleProp';

interface SiteSettingsTabProps {
    editor: Editor | null;
    isActive: boolean;
    // Working copy (applied live to the canvas) and the last saved kit from the server.
    kit: SiteKit;
    savedKit: SiteKit;
    onChange: (kit: SiteKit) => void;
    onSaved: (kit: SiteKit) => void;
}

type FieldErrors = Record<string, string[]>;

const TYPOGRAPHY_ROWS: { key: TypographyKey; label: string }[] = [
    { key: 'h1', label: 'Heading 1' },
    { key: 'h2', label: 'Heading 2' },
    { key: 'h3', label: 'Heading 3' },
    { key: 'h4', label: 'Heading 4' },
    { key: 'h5', label: 'Heading 5' },
    { key: 'h6', label: 'Heading 6' },
    { key: 'body', label: 'Body' },
    { key: 'button', label: 'Button' },
];
const WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900].map((w) => ({ value: String(w), label: String(w) }));
const FONT_OPTIONS = CURATED_FONTS.map((f) => ({ value: f.family, label: f.family }));
const HEX6 = /^#[0-9a-f]{6}$/i;

function FieldError({ errors, path }: { errors: FieldErrors; path: string }) {
    const messages = errors[path];
    if (!messages?.length) return null;
    return (
        <p role="alert" className="text-[10px] text-rose-400 mt-0.5">
            {messages.join(' ')}
        </p>
    );
}

function HexInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
    return (
        <>
            <input
                type="color"
                aria-label={`${label} picker`}
                value={HEX6.test(value) ? value : '#000000'}
                onChange={(e) => onChange(e.target.value.toUpperCase())}
                className="w-7 h-7 p-0 rounded-lg bg-transparent border border-white/10 cursor-pointer shrink-0"
            />
            <input
                type="text"
                aria-label={`${label} hex`}
                key={value}
                defaultValue={value}
                maxLength={7}
                onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v !== value) onChange(HEX6.test(v) ? v.toUpperCase() : v);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur();
                }}
                className="w-20 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white font-mono focus:outline-none focus:border-teal-500"
            />
        </>
    );
}

export default function SiteSettingsTab({ editor, isActive, kit, savedKit, onChange, onSaved }: SiteSettingsTabProps) {
    const device = useDevice(editor);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [message, setMessage] = useState<string | null>(null);

    const dirty = JSON.stringify(kit) !== JSON.stringify(savedKit);
    const customCount = customColorCount(kit.colors);

    const edit = (next: SiteKit) => {
        setSaved(false);
        onChange(next);
    };
    const setColor = (index: number, patch: Partial<KitColor>) =>
        edit({ ...kit, colors: kit.colors.map((c, i) => (i === index ? { ...c, ...patch } : c)) });

    const addColor = () => {
        if (customCount >= MAX_CUSTOM_COLORS) return;
        const id = nextCustomColorId(kit.colors, kit.retired);
        edit({ ...kit, colors: [...kit.colors, { id, name: `Custom ${id.replace('custom-', '')}`, value: '#6366F1' }] });
    };

    const removeColor = (index: number) => {
        const removed = kit.colors[index];
        // Kept as retired locally too, so elements still linked to it keep their color until the next save.
        edit({
            ...kit,
            colors: kit.colors.filter((_, i) => i !== index),
            retired: [...kit.retired.filter((c) => c.id !== removed.id), removed],
        });
    };

    const setTypography = (key: TypographyKey, patch: Partial<SiteKit['typography'][TypographyKey]>) =>
        edit({ ...kit, typography: { ...kit.typography, [key]: { ...kit.typography[key], ...patch } } });

    const setSize = (key: TypographyKey, value: string) => {
        const size = { ...kit.typography[key].size };
        if (value === '') delete size[device];
        else size[device] = value;
        setTypography(key, { size });
    };

    const save = async () => {
        setSaving(true);
        setErrors({});
        setMessage(null);
        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
        try {
            const res = await fetch('/website/kit', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken, Accept: 'application/json' },
                body: JSON.stringify({ colors: kit.colors, fonts: kit.fonts, typography: kit.typography }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.kit) {
                onSaved(data.kit as SiteKit);
                setSaved(true);
            } else if (res.status === 422 && data.errors) {
                setErrors(data.errors as FieldErrors);
                setMessage('Some values need fixing before the kit can be saved.');
            } else {
                setMessage(data.message || 'Could not save Site Settings. Please try again.');
            }
        } catch {
            setMessage('Could not save Site Settings. Check your connection and try again.');
        } finally {
            setSaving(false);
        }
    };

    // Server errors that are not shown next to a field (e.g. "colors": missing / too many).
    const shownPrefixes = /^(colors\.\d+\.(name|value)|fonts\.(heading|body)|typography\.)/;
    const otherErrors = Object.entries(errors)
        .filter(([path]) => !shownPrefixes.test(path))
        .flatMap(([, msgs]) => msgs);

    const inputClass =
        'w-full min-w-0 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white focus:outline-none focus:border-teal-500';

    return (
        <div className={`flex-1 overflow-y-auto p-4 space-y-5 text-xs ${isActive ? '' : 'hidden'}`}>
            <div>
                <h4 className="font-bold text-sm text-white mb-1">Site Settings</h4>
                <p className="text-[11px] text-slate-400">Global colors and fonts used by every page on your site.</p>
            </div>

            {/* Presets */}
            <section className="space-y-2">
                <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Color presets</h5>
                <div className="grid grid-cols-1 gap-1.5">
                    {Object.keys(THEME_COLORS).map((key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => edit({ ...kit, colors: applyPreset(kit.colors, key) })}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:border-white/20 text-left"
                        >
                            <span className="flex -space-x-1 shrink-0">
                                {SYSTEM_COLOR_IDS.map((id) => (
                                    <span
                                        key={id}
                                        className="w-3.5 h-3.5 rounded-full border border-slate-900"
                                        style={{ backgroundColor: THEME_COLORS[key][id] }}
                                    />
                                ))}
                            </span>
                            <span className="text-[11px] font-bold text-slate-200">{THEME_PRESET_LABELS[key] ?? key}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* Colors */}
            <section className="space-y-2 pt-3 border-t border-white/10">
                <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Colors</h5>
                <ul className="space-y-2">
                    {kit.colors.map((color, i) => {
                        const isCustom = color.id.startsWith('custom-');
                        return (
                            <li key={color.id}>
                                <div className="flex items-center gap-1.5">
                                    {isCustom ? (
                                        <input
                                            type="text"
                                            aria-label={`${color.name} name`}
                                            value={color.name}
                                            maxLength={40}
                                            onChange={(e) => setColor(i, { name: e.target.value })}
                                            className={`${inputClass} flex-1`}
                                        />
                                    ) : (
                                        <span className="flex-1 min-w-0 truncate text-[11px] font-bold text-slate-200">{color.name}</span>
                                    )}
                                    <HexInput label={color.name} value={color.value} onChange={(v) => setColor(i, { value: v })} />
                                    {isCustom && (
                                        <button
                                            type="button"
                                            onClick={() => removeColor(i)}
                                            aria-label={`Delete ${color.name}`}
                                            title="Delete color"
                                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <FieldError errors={errors} path={`colors.${i}.name`} />
                                <FieldError errors={errors} path={`colors.${i}.value`} />
                            </li>
                        );
                    })}
                </ul>
                <button
                    type="button"
                    onClick={addColor}
                    disabled={customCount >= MAX_CUSTOM_COLORS}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-teal-300 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <Plus className="w-3.5 h-3.5" />
                    Add color ({customCount}/{MAX_CUSTOM_COLORS})
                </button>
            </section>

            {/* Fonts */}
            <section className="space-y-2 pt-3 border-t border-white/10">
                <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Fonts</h5>
                {(['heading', 'body'] as const).map((role) => (
                    <div key={role}>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            {role === 'heading' ? 'Heading font' : 'Body font'}
                        </label>
                        <SelectControl
                            ariaLabel={role === 'heading' ? 'Heading font' : 'Body font'}
                            value={kit.fonts[role]}
                            options={FONT_OPTIONS}
                            onChange={(v) => v && edit({ ...kit, fonts: { ...kit.fonts, [role]: v } })}
                        />
                        <FieldError errors={errors} path={`fonts.${role}`} />
                    </div>
                ))}
            </section>

            {/* Typography */}
            <section className="space-y-2 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between">
                    <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Typography</h5>
                    <DeviceToggle editor={editor} variant="group" />
                </div>
                <p className="text-[10px] text-slate-400">
                    Sizes are set per device; an empty tablet or mobile size follows the larger device.
                </p>
                <ul className="space-y-3">
                    {TYPOGRAPHY_ROWS.map(({ key, label }) => {
                        const t = kit.typography[key];
                        return (
                            <li key={key} className="rounded-xl border border-white/10 bg-white/[0.03] p-2 space-y-1.5">
                                <p className="text-[11px] font-bold text-slate-200">{label}</p>
                                <div className="grid grid-cols-[1fr_auto] gap-x-2 gap-y-1.5 items-center">
                                    <UnitInput
                                        ariaLabel={`${label} size (${device})`}
                                        value={t.size[device] ?? ''}
                                        onChange={(v) => setSize(key, v)}
                                        units={['px', 'rem', 'em', 'vw']}
                                        allowKeywords={false}
                                        placeholder={device === 'desktop' ? '' : t.size.desktop ?? ''}
                                    />
                                    <span className="text-[10px] text-slate-400 capitalize">{device}</span>
                                    <SelectControl
                                        ariaLabel={`${label} weight`}
                                        value={String(t.weight)}
                                        options={WEIGHTS}
                                        onChange={(v) => v && setTypography(key, { weight: Number(v) })}
                                    />
                                    <span className="text-[10px] text-slate-400">Weight</span>
                                    <input
                                        type="number"
                                        aria-label={`${label} line height`}
                                        value={t.lineHeight}
                                        min={0.8}
                                        max={3}
                                        step={0.05}
                                        onChange={(e) => {
                                            const n = parseFloat(e.target.value);
                                            if (!Number.isNaN(n)) setTypography(key, { lineHeight: n });
                                        }}
                                        className={inputClass}
                                    />
                                    <span className="text-[10px] text-slate-400">Line height</span>
                                </div>
                                {['size.desktop', 'size.tablet', 'size.mobile', 'weight', 'lineHeight'].map((f) => (
                                    <FieldError key={f} errors={errors} path={`typography.${key}.${f}`} />
                                ))}
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* Save */}
            <section className="space-y-2 pt-3 border-t border-white/10 sticky bottom-0 bg-slate-950 pb-1">
                {message && (
                    <p role="alert" className="text-[11px] text-rose-400">
                        {message}
                    </p>
                )}
                {otherErrors.map((m, i) => (
                    <p key={i} role="alert" className="text-[10px] text-rose-400">
                        {m}
                    </p>
                ))}
                <button
                    type="button"
                    onClick={save}
                    disabled={saving || !dirty}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : saved && !dirty ? <Check className="w-3.5 h-3.5" /> : null}
                    {saving ? 'Saving...' : saved && !dirty ? 'Saved' : 'Save Site Settings'}
                </button>
                <p className="text-[10px] text-slate-400 text-center">Applies to all published pages immediately.</p>
                {dirty && <p className="text-[10px] text-amber-400 text-center">Unsaved Site Settings changes.</p>}
            </section>
        </div>
    );
}
