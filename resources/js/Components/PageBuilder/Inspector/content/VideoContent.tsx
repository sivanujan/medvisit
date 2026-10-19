import React, { useState } from 'react';
import { toVideoEmbedUrl, type VideoOptions } from '../../lib/contentHelpers';
import { Note, TextField, ToggleField } from './fields';
import { findChild, getAttr } from './componentOps';
import type { ContentPanelProps } from './types';

function readOptions(src: string): VideoOptions {
    const has = (k: string) => new RegExp(`[?&]${k}=1`).test(src);
    return { autoplay: has('autoplay'), mute: has('mute') || has('muted'), loop: has('loop'), controls: !/[?&]controls=0/.test(src) };
}

export default function VideoContent({ component, setIsDirty }: ContentPanelProps) {
    const iframe = String(component.get('tagName')).toLowerCase() === 'iframe' ? component : findChild(component, 'iframe');
    const initialSrc = iframe ? getAttr(iframe, 'src') : '';
    const [url, setUrl] = useState(initialSrc);
    const [opts, setOpts] = useState<VideoOptions>(() => readOptions(initialSrc));
    const [error, setError] = useState('');

    if (!iframe) return <Note>This video block has no player inside it.</Note>;

    const apply = (nextUrl: string, nextOpts: VideoOptions) => {
        const embed = toVideoEmbedUrl(nextUrl, nextOpts);
        if (!embed) {
            setError('Paste a YouTube or Vimeo link.');
            return;
        }
        setError('');
        iframe.addAttributes({ src: embed, allow: 'autoplay; fullscreen; picture-in-picture' });
        setIsDirty(true);
    };

    const toggle = (key: keyof VideoOptions) => (on: boolean) => {
        const next = { ...opts, [key]: on };
        setOpts(next);
        apply(url, next);
    };

    return (
        <div className="space-y-3">
            <TextField
                label="YouTube or Vimeo link"
                value={url}
                placeholder="https://www.youtube.com/watch?v=…"
                onChange={(v) => {
                    setUrl(v);
                    apply(v, opts);
                }}
            />
            {error && <p className="text-[11px] text-rose-300">{error}</p>}
            <ToggleField label="Autoplay" checked={opts.autoplay} onChange={toggle('autoplay')} />
            <ToggleField label="Mute" checked={opts.mute} onChange={toggle('mute')} />
            <ToggleField label="Loop" checked={opts.loop} onChange={toggle('loop')} />
            <ToggleField label="Show controls" checked={opts.controls} onChange={toggle('controls')} />
            {opts.autoplay && !opts.mute && <Note>Most browsers only autoplay videos that are muted.</Note>}
        </div>
    );
}
