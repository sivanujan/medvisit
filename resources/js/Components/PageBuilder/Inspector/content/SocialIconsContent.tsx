import React, { useState } from 'react';
import { SOCIAL_NETWORKS, socialLinkHtml } from '../../lib/moreWidgets';
import { TextField } from './fields';
import { getAttr, setLinkAttributes } from './componentOps';
import type { ContentPanelProps } from './types';

// One link field per network: filling it shows the icon, clearing it removes the icon.
export default function SocialIconsContent({ component, setIsDirty }: ContentPanelProps) {
    const linkFor = (id: string) => component.find?.(`[data-mv-social="${id}"]`)?.[0] ?? null;
    const [urls, setUrls] = useState<Record<string, string>>(() =>
        Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n.id, linkFor(n.id) ? getAttr(linkFor(n.id), 'href').replace(/^#$/, '') : ''])),
    );

    return (
        <div className="space-y-3">
            {SOCIAL_NETWORKS.map((network) => (
                <TextField
                    key={network.id}
                    label={network.label}
                    value={urls[network.id] ?? ''}
                    placeholder={`https://${network.id}.com/your-clinic`}
                    onChange={(url) => {
                        setUrls((prev) => ({ ...prev, [network.id]: url }));
                        const existing = linkFor(network.id);
                        if (url.trim()) {
                            if (existing) setLinkAttributes(existing, url, true);
                            else component.append(socialLinkHtml(network, url));
                        } else {
                            existing?.remove();
                        }
                        setIsDirty(true);
                    }}
                />
            ))}
            <p className="text-[10px] text-slate-500">Leave a field empty to hide that icon. Links open in a new tab.</p>
        </div>
    );
}
