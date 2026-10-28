import React from 'react';
import type { Editor } from '../../types';
import Group from './Group';
import { UnitField } from './fields';

const WIDTH_UNITS = ['px', '%', 'rem', 'em', 'vw'];
const HEIGHT_UNITS = ['px', '%', 'rem', 'em', 'vh'];

export default function SizeGroup({ editor }: { editor: Editor }) {
    return (
        <Group title="Size" editor={editor}>
            <UnitField editor={editor} prop="width" label="Width" units={WIDTH_UNITS} />
            <UnitField editor={editor} prop="max-width" label="Max width" units={WIDTH_UNITS} placeholder="none" />
            <UnitField editor={editor} prop="height" label="Height" units={HEIGHT_UNITS} />
            <UnitField editor={editor} prop="min-height" label="Min height" units={HEIGHT_UNITS} placeholder="0" />
        </Group>
    );
}
