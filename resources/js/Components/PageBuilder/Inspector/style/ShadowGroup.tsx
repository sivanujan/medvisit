import React from 'react';
import type { Editor } from '../../types';
import type { ColorSwatch } from '../../controls/ColorControl';
import ShadowControl from '../../controls/ShadowControl';
import Group from './Group';

export default function ShadowGroup({ editor, swatches }: { editor: Editor; swatches?: ColorSwatch[] }) {
    return (
        <Group title="Shadows" editor={editor} stateAware>
            <ShadowControl editor={editor} prop="box-shadow" label="Box shadow" swatches={swatches} />
            <ShadowControl editor={editor} prop="text-shadow" label="Text shadow" swatches={swatches} />
        </Group>
    );
}
