import React from 'react';
import type { Editor } from '../../types';
import ColorControl, { type ColorSwatch } from '../../controls/ColorControl';
import ResponsiveField from '../../controls/ResponsiveField';
import SelectControl from '../../controls/SelectControl';
import UnitInput, { DEFAULT_UNITS } from '../../controls/UnitInput';

interface BaseFieldProps {
    editor: Editor;
    prop: string;
    label: string;
}

export function UnitField({ editor, prop, label, units = DEFAULT_UNITS, placeholder }: BaseFieldProps & { units?: string[]; placeholder?: string }) {
    return (
        <ResponsiveField editor={editor} prop={prop} label={label}>
            {(p) => (
                <UnitInput
                    value={p.value}
                    onChange={p.set}
                    units={units}
                    inherited={p.inherited}
                    ariaLabel={label}
                    placeholder={placeholder ?? 'auto'}
                />
            )}
        </ResponsiveField>
    );
}

export function SelectField({
    editor,
    prop,
    label,
    options,
}: BaseFieldProps & { options: { value: string; label: string }[] }) {
    return (
        <ResponsiveField editor={editor} prop={prop} label={label}>
            {(p) => (
                <SelectControl value={p.value} onChange={p.set} options={options} inherited={p.inherited} ariaLabel={label} />
            )}
        </ResponsiveField>
    );
}

export function ColorField({ editor, prop, label, swatches }: BaseFieldProps & { swatches?: ColorSwatch[] }) {
    return (
        <ResponsiveField editor={editor} prop={prop} label={label}>
            {(p) => (
                <ColorControl value={p.value} onChange={p.set} inherited={p.inherited} ariaLabel={label} swatches={swatches} />
            )}
        </ResponsiveField>
    );
}

export const opts = (...values: string[]) => values.map((v) => ({ value: v, label: v }));
