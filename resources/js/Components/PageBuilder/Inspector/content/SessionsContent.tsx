import React, { useState } from 'react';
import { renderSessionsHtml } from '../../lib/dynamicWidgets';
import { Note, SelectField } from './fields';
import { getAttr } from './componentOps';
import type { ContentPanelProps } from './types';

function localToday(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function SessionsContent({ component, setIsDirty, clinicData }: ContentPanelProps) {
    const [daysAhead, setDaysAhead] = useState<7 | 14>(() => (getAttr(component, 'data-mv-days') === '14' ? 14 : 7));
    const [max, setMax] = useState(() => Number(getAttr(component, 'data-mv-max')) || 10);

    const apply = (days: 7 | 14, limit: number) => {
        setDaysAhead(days);
        setMax(limit);
        component.addAttributes({ 'data-mv-days': String(days), 'data-mv-max': String(limit) });
        const tbody = component.find?.('tbody')?.[0];
        if (tbody) tbody.components(renderSessionsHtml(clinicData?.sessions ?? [], { daysAhead: days, max: limit, today: localToday() }));
        setIsDirty(true);
    };

    return (
        <div className="space-y-3">
            <SelectField
                label="Show sessions for"
                value={String(daysAhead)}
                options={[
                    { value: '7', label: 'Next 7 days' },
                    { value: '14', label: 'Next 14 days' },
                ]}
                onChange={(v) => apply(v === '14' ? 14 : 7, max)}
            />
            <SelectField
                label="Maximum sessions"
                value={String(max)}
                options={Array.from({ length: 20 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                onChange={(v) => apply(daysAhead, Number(v))}
            />
            <Note>The table is filled from your current channeling schedule when you change these settings.</Note>
        </div>
    );
}
