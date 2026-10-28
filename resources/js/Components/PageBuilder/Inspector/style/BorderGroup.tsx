import React from 'react';
import type { Editor } from '../../types';
import type { ColorSwatch } from '../../controls/ColorControl';
import BoxSidesControl from '../../controls/BoxSidesControl';
import Group from './Group';
import { ColorField, SelectField, opts } from './fields';

const WIDTHS = [
    { prop: 'border-top-width', label: 'Top' },
    { prop: 'border-right-width', label: 'Right' },
    { prop: 'border-bottom-width', label: 'Bottom' },
    { prop: 'border-left-width', label: 'Left' },
];
const RADII = [
    { prop: 'border-top-left-radius', label: 'Top left' },
    { prop: 'border-top-right-radius', label: 'Top right' },
    { prop: 'border-bottom-right-radius', label: 'Bottom right' },
    { prop: 'border-bottom-left-radius', label: 'Bottom left' },
];

export default function BorderGroup({ editor, swatches }: { editor: Editor; swatches?: ColorSwatch[] }) {
    return (
        <Group title="Border" editor={editor} stateAware>
            <SelectField editor={editor} prop="border-style" label="Style" options={opts('none', 'solid', 'dashed', 'dotted')} />
            <div>
                <p className="text-[11px] font-bold text-slate-300 mb-1">Width</p>
                <BoxSidesControl editor={editor} sides={WIDTHS} units={['px', 'em', 'rem']} />
            </div>
            <ColorField editor={editor} prop="border-color" label="Color" swatches={swatches} />
            <div>
                <p className="text-[11px] font-bold text-slate-300 mb-1">Radius</p>
                <BoxSidesControl editor={editor} sides={RADII} units={['px', 'rem', 'em', '%']} />
            </div>
        </Group>
    );
}
