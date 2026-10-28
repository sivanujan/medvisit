import React, { useState } from 'react';
import { telHref, whatsappHref } from '../../lib/moreWidgets';
import { SelectField, TextField, ToggleField } from './fields';
import { getAttr, plainText, setOwnText } from './componentOps';
import type { ContentPanelProps } from './types';

type Mode = 'whatsapp' | 'call';

function numberFromHref(href: string): string {
    const m = href.match(/wa\.me\/(\d+)/) || href.match(/^tel:\+?(\d+)/);
    return m ? `+${m[1]}` : '';
}

export default function WhatsappContent({ component, setIsDirty }: ContentPanelProps) {
    const label = component.find?.('[data-mv-field="label"]')?.[0] ?? null;
    const href = getAttr(component, 'href');
    const [mode, setMode] = useState<Mode>(getAttr(component, 'data-mv-mode') === 'call' ? 'call' : 'whatsapp');
    const [number, setNumber] = useState(numberFromHref(href));
    const [message, setMessage] = useState(() => {
        try {
            return new URL(href).searchParams.get('text') || '';
        } catch {
            return '';
        }
    });
    const [text, setText] = useState(label ? plainText(label) : '');
    const [floating, setFloating] = useState(String(component.getStyle?.()?.position || '') === 'fixed');

    const applyLink = (m: Mode, num: string, msg: string) => {
        if (!num.replace(/\D/g, '')) return;
        component.removeAttributes?.(['target', 'rel']);
        component.addAttributes(
            m === 'whatsapp'
                ? { href: whatsappHref(num, msg), target: '_blank', rel: 'noopener', 'data-mv-mode': 'whatsapp' }
                : { href: telHref(num), 'data-mv-mode': 'call' },
        );
        component.addStyle({ background: m === 'whatsapp' ? '#25d366' : '#0E9E8F' }, { mediaText: '' });
        setIsDirty(true);
    };

    return (
        <div className="space-y-3">
            <SelectField
                label="Button action"
                value={mode}
                options={[
                    { value: 'whatsapp', label: 'Open WhatsApp chat' },
                    { value: 'call', label: 'Call phone number' },
                ]}
                onChange={(v) => {
                    const m = v as Mode;
                    setMode(m);
                    applyLink(m, number, message);
                }}
            />
            <TextField label="Phone number" value={number} placeholder="077 123 4567" onChange={(v) => { setNumber(v); applyLink(mode, v, message); }} />
            {mode === 'whatsapp' && (
                <TextField label="Pre-filled message" value={message} multiline onChange={(v) => { setMessage(v); applyLink(mode, number, v); }} />
            )}
            {label && (
                <TextField label="Button text" value={text} onChange={(v) => { setText(v); setOwnText(label, v); setIsDirty(true); }} />
            )}
            <ToggleField
                label="Float in the bottom-right corner"
                checked={floating}
                onChange={(on) => {
                    setFloating(on);
                    component.addStyle(
                        on
                            ? { position: 'fixed', right: '20px', bottom: '20px', 'z-index': '50', 'box-shadow': '0 10px 25px rgba(0,0,0,0.25)' }
                            : { position: '', right: '', bottom: '', 'z-index': '', 'box-shadow': '' },
                        { mediaText: '' },
                    );
                    setIsDirty(true);
                }}
            />
        </div>
    );
}
