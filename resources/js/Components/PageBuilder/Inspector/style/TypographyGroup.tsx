import React from 'react';
import type { Editor } from '../../types';
import { CURATED_FONTS } from '../../lib/fonts';
import { useKit } from '../../controls/KitContext';
import Group from './Group';
import { SelectField, UnitField, opts } from './fields';

const CURATED_OPTIONS = CURATED_FONTS.map((f) => ({ value: `'${f.family}', sans-serif`, label: f.family }));

export default function TypographyGroup({ editor }: { editor: Editor }) {
    const kit = useKit();
    const fontOptions = [
        { value: 'var(--mv-font-heading)', label: `Heading font${kit ? ` (${kit.fonts.heading})` : ''}` },
        { value: 'var(--mv-font-body)', label: `Body font${kit ? ` (${kit.fonts.body})` : ''}` },
        ...CURATED_OPTIONS,
    ];
    return (
        <Group title="Typography" editor={editor}>
            <SelectField editor={editor} prop="font-family" label="Font family" options={fontOptions} />
            <UnitField editor={editor} prop="font-size" label="Size" units={['px', 'rem', 'em', 'vw']} />
            <SelectField
                editor={editor}
                prop="font-weight"
                label="Weight"
                options={['300', '400', '500', '600', '700', '800'].map((w) => ({ value: w, label: w }))}
            />
            <UnitField editor={editor} prop="line-height" label="Line height" units={['', 'px', 'em', 'rem']} placeholder="normal" />
            <UnitField editor={editor} prop="letter-spacing" label="Letter spacing" units={['px', 'em', 'rem']} placeholder="normal" />
            <SelectField editor={editor} prop="text-transform" label="Transform" options={opts('none', 'uppercase', 'lowercase', 'capitalize')} />
            <SelectField editor={editor} prop="font-style" label="Style" options={opts('normal', 'italic')} />
            <SelectField editor={editor} prop="text-decoration" label="Decoration" options={opts('none', 'underline', 'line-through')} />
        </Group>
    );
}
