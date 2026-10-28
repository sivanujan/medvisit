import React, { useState } from 'react';
import { toMapEmbedUrl } from '../../lib/contentHelpers';
import { FieldLabel, Note, TextField } from './fields';
import { findChild, getAttr } from './componentOps';
import type { ContentPanelProps } from './types';

function readQuery(src: string): { query: string; zoom: number } {
    try {
        const u = new URL(src);
        return { query: u.searchParams.get('q') || '', zoom: Number(u.searchParams.get('z')) || 14 };
    } catch {
        return { query: '', zoom: 14 };
    }
}

export default function MapContent({ component, setIsDirty }: ContentPanelProps) {
    const iframe = String(component.get('tagName')).toLowerCase() === 'iframe' ? component : findChild(component, 'iframe');
    const initial = readQuery(iframe ? getAttr(iframe, 'src') : '');
    const [query, setQuery] = useState(initial.query);
    const [zoom, setZoom] = useState(initial.zoom);
    const [height, setHeight] = useState(() => parseInt(iframe?.getStyle?.()?.height || '320', 10) || 320);

    if (!iframe) return <Note>This map block has no map inside it.</Note>;

    const applySrc = (q: string, z: number) => {
        if (!q.trim()) return;
        iframe.addAttributes({ src: toMapEmbedUrl(q, z) });
        setIsDirty(true);
    };

    return (
        <div className="space-y-3">
            <TextField
                label="Address or place"
                value={query}
                placeholder="e.g. Sivacli Clinic, Colombo 07"
                onChange={(v) => {
                    setQuery(v);
                    applySrc(v, zoom);
                }}
            />
            <div>
                <FieldLabel>Zoom ({zoom})</FieldLabel>
                <input
                    type="range"
                    min={1}
                    max={20}
                    value={zoom}
                    onChange={(e) => {
                        const z = Number(e.target.value);
                        setZoom(z);
                        applySrc(query, z);
                    }}
                    className="w-full accent-teal-500"
                />
            </div>
            <div>
                <FieldLabel>Height ({height}px)</FieldLabel>
                <input
                    type="range"
                    min={150}
                    max={800}
                    step={10}
                    value={height}
                    onChange={(e) => {
                        const h = Number(e.target.value);
                        setHeight(h);
                        iframe.addStyle({ height: `${h}px` });
                        setIsDirty(true);
                    }}
                    className="w-full accent-teal-500"
                />
            </div>
        </div>
    );
}
