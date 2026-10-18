import React from 'react';
import type { Editor, Component } from '../../types';
import { isLayoutContainer as isContainer } from '../../lib/cssValues';
import { useStyleProp } from '../../controls/useStyleProp';
import Group from './Group';
import { SelectField, UnitField, opts } from './fields';

// Layout controls apply to sections and to div wrappers with children (columns / rows).
export function isLayoutContainer(component: Component | null): boolean {
    if (!component) return false;
    const tag = String(component.get?.('tagName') ?? 'div');
    const children = component.components?.()?.length ?? 0;
    return isContainer(tag, children);
}

export default function LayoutGroup({ editor }: { editor: Editor }) {
    const display = useStyleProp(editor, 'display');
    const isFlex = display.value === 'flex';
    return (
        <Group title="Layout" editor={editor}>
            <SelectField editor={editor} prop="display" label="Display" options={[{ value: 'block', label: 'Block' }, { value: 'flex', label: 'Flex' }]} />
            {!isFlex && <p className="text-[10px] text-amber-300">Set Display to Flex to use these options.</p>}
            <div className={isFlex ? 'space-y-3' : 'space-y-3 opacity-40 pointer-events-none'} aria-disabled={!isFlex}>
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
            </div>
        </Group>
    );
}
