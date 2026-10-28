import React, { useState } from 'react';
import { renderDoctorsHtml, type DoctorsOptions } from '../../lib/dynamicWidgets';
import { Note, SelectField, ToggleField } from './fields';
import { getAttr } from './componentOps';
import type { ContentPanelProps } from './types';

export default function DoctorsContent({ component, setIsDirty, clinicData }: ContentPanelProps) {
    const [opts, setOpts] = useState<DoctorsOptions>(() => ({
        limit: Number(getAttr(component, 'data-mv-limit')) || 3,
        layout: getAttr(component, 'data-mv-layout') === 'list' ? 'list' : 'grid',
        showFee: getAttr(component, 'data-mv-show-fee') === '1',
    }));
    const doctors = clinicData?.doctors ?? [];

    const apply = (next: DoctorsOptions) => {
        setOpts(next);
        component.addAttributes({
            'data-mv-limit': String(next.limit),
            'data-mv-layout': next.layout,
            'data-mv-show-fee': next.showFee ? '1' : '0',
        });
        const grid = component.find?.('.medvisit-doctors-grid, .medvisit-grid-3')?.[0];
        const html = renderDoctorsHtml(doctors, next);
        if (grid) grid.replaceWith(html);
        setIsDirty(true);
    };

    return (
        <div className="space-y-3">
            <SelectField
                label="Number of doctors"
                value={String(opts.limit)}
                options={Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                onChange={(v) => apply({ ...opts, limit: Number(v) })}
            />
            <SelectField
                label="Layout"
                value={opts.layout}
                options={[
                    { value: 'grid', label: 'Grid (3 columns)' },
                    { value: 'list', label: 'List' },
                ]}
                onChange={(v) => apply({ ...opts, layout: v === 'list' ? 'list' : 'grid' })}
            />
            <ToggleField label="Show consultation fee" checked={opts.showFee} onChange={(v) => apply({ ...opts, showFee: v })} />
            <Note>Shows {Math.min(opts.limit, doctors.length)} of your {doctors.length} active doctors as they are now. Re-open this panel after adding doctors to refresh.</Note>
        </div>
    );
}
