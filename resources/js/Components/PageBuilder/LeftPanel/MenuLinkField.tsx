import React from 'react';
import type { MenuLink, PageSummary } from '../types';

interface Props {
    item: MenuLink;
    pages: PageSummary[];
    onChange: (item: MenuLink) => void;
}

const toggleClass = (active: boolean) =>
    `px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${
        active ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'
    }`;

/** "Link to: Page | Custom URL" editor shared by header menu items and footer quick links. */
export default function MenuLinkField({ item, pages, onChange }: Props) {
    const pageMode = item.page_id != null;

    const usePage = () => {
        const match = pages.find((p) => p.url === item.url) ?? pages[0];
        if (!match) return;
        onChange({ ...item, page_id: match.id, url: match.url });
    };

    const useCustomUrl = () => {
        const { page_id: _omit, ...rest } = item;
        onChange(rest);
    };

    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400">Link to:</span>
                <div className="flex items-center p-0.5 rounded-lg bg-slate-950 border border-white/10">
                    <button
                        type="button"
                        onClick={usePage}
                        disabled={pages.length === 0}
                        className={toggleClass(pageMode)}
                    >
                        Page
                    </button>
                    <button type="button" onClick={useCustomUrl} className={toggleClass(!pageMode)}>
                        Custom URL
                    </button>
                </div>
            </div>

            {pageMode ? (
                <select
                    value={item.page_id}
                    onChange={(e) => {
                        const page = pages.find((p) => p.id === Number(e.target.value));
                        if (page) onChange({ ...item, page_id: page.id, url: page.url });
                    }}
                    className="w-full text-[11px] rounded-lg bg-slate-950 border border-white/10 text-slate-300 px-2 py-1 focus:border-teal-500"
                >
                    {!pages.some((p) => p.id === item.page_id) && (
                        <option value={item.page_id}>(page no longer exists)</option>
                    )}
                    {pages.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.title}
                            {p.is_published ? '' : ' (draft)'}
                        </option>
                    ))}
                </select>
            ) : (
                <input
                    type="text"
                    value={item.url}
                    onChange={(e) => onChange({ ...item, url: e.target.value })}
                    placeholder="URL (e.g. /doctors)"
                    className="w-full text-[11px] rounded-lg bg-slate-950 border border-white/10 text-slate-300 px-2 py-1 focus:border-teal-500"
                />
            )}
        </div>
    );
}
