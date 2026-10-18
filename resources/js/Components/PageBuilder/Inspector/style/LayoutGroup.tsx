import React from 'react';
import type { Editor, Component } from '../../types';
import Group from './Group';
import { SelectField, UnitField, opts } from './fields';

// Layout controls apply to section / column containers only.
export function isLayoutContainer(component: Component | null): boolean {
    if (!component) return false;
    const name = String(component.get?.('custom-name') ?? '');
    const tag = String(component.get?.('tagName') ?? '').toLowerCase();
    return name.startsWith('Section') || name.startsWith('Column') || tag === 'section';
}

export default function LayoutGroup({ editor }: { editor: Editor }) {
    return (
        <Group title="Layout" editor={editor}>
            <SelectField editor={editor} prop="flex-direction" label="Direction" options={opts('row', 'column', 'row-reverse', 'column-reverse')} />
            <SelectField
                editor={editor}
                prop="justify-content"
                label="Justify"
                options={opts('flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly')}
            />
            <SelectField editor={editor} prop="align-items" label="Align" options={opts('flex-start', 'center', 'flex-end', 'stretch', 'baseline')} />
            <UnitField editor={editor} prop="gap" label="Gap" units={['px', 'rem', 'em']} placeholder="0" />
            <SelectField editor={editor} prop="flex-wrap" label="Wrap" options={opts('nowrap', 'wrap', 'wrap-reverse')} />
        </Group>
    );
}
