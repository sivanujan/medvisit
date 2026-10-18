import React from 'react';
import { Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import type { HeaderConfig, PageSummary, TabBaseProps } from '../types';
import MenuLinkField from './MenuLinkField';

interface HeaderTabProps extends TabBaseProps {
    isActive: boolean;
    headerConfig: HeaderConfig;
    setHeaderConfig: React.Dispatch<React.SetStateAction<HeaderConfig>>;
    setIsDirty: (dirty: boolean) => void;
    onOpenMedia: (currentValue: string) => void;
    pages: PageSummary[];
}

export default function HeaderTab({ isActive, headerConfig, setHeaderConfig, setIsDirty, onOpenMedia, pages }: HeaderTabProps) {
    return (
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 text-xs ${isActive ? '' : 'hidden'}`}>
            <div>
                <h4 className="font-bold text-sm text-white mb-1">Shared Public Header</h4>
                <p className="text-[11px] text-slate-400">
                    Controls the persistent header displayed across all public clinic pages.
                </p>
            </div>

            {/* Clinic Logo */}
            <div className="space-y-1.5 pt-2 border-t border-white/10">
                <label className="block text-[11px] font-bold text-slate-300">Clinic Logo URL</label>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={headerConfig.logo_url || ''}
                        onChange={(e) => {
                            setHeaderConfig((prev) => ({ ...prev, logo_url: e.target.value }));
                            setIsDirty(true);
                        }}
                        placeholder="https://... or choose from media"
                        className="flex-1 text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                    />
                    <button
                        type="button"
                        onClick={() => {
                            onOpenMedia(headerConfig.logo_url || '');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold"
                        title="Choose from media library"
                    >
                        <ImageIcon className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Tagline */}
            <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300">Show Tagline</label>
                    <input
                        type="checkbox"
                        checked={headerConfig.show_tagline ?? true}
                        onChange={(e) => {
                            setHeaderConfig((prev) => ({ ...prev, show_tagline: e.target.checked }));
                            setIsDirty(true);
                        }}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-slate-900 border-white/20"
                    />
                </div>
                {(headerConfig.show_tagline ?? true) && (
                    <input
                        type="text"
                        value={headerConfig.tagline || ''}
                        onChange={(e) => {
                            setHeaderConfig((prev) => ({ ...prev, tagline: e.target.value }));
                            setIsDirty(true);
                        }}
                        placeholder="e.g. Compassionate, Modern Healthcare"
                        className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                    />
                )}
            </div>

            {/* Sticky & Transparent options */}
            <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                    <div>
                        <label className="text-[11px] font-bold text-slate-300 block">Sticky Header</label>
                        <span className="text-[10px] text-slate-400">Fixes to top with blur effect on scroll</span>
                    </div>
                    <input
                        type="checkbox"
                        checked={headerConfig.is_sticky ?? true}
                        onChange={(e) => {
                            setHeaderConfig((prev) => ({ ...prev, is_sticky: e.target.checked }));
                            setIsDirty(true);
                        }}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-slate-900 border-white/20"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <div>
                        <label className="text-[11px] font-bold text-slate-300 block">Transparent over hero</label>
                        <span className="text-[10px] text-slate-400">Blends over hero until scrolled</span>
                    </div>
                    <input
                        type="checkbox"
                        checked={headerConfig.is_transparent_over_hero ?? false}
                        onChange={(e) => {
                            setHeaderConfig((prev) => ({ ...prev, is_transparent_over_hero: e.target.checked }));
                            setIsDirty(true);
                        }}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-slate-900 border-white/20"
                    />
                </div>
            </div>

            {/* Phone Hotline */}
            <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300">Show Phone Number</label>
                    <input
                        type="checkbox"
                        checked={headerConfig.show_phone ?? true}
                        onChange={(e) => {
                            setHeaderConfig((prev) => ({ ...prev, show_phone: e.target.checked }));
                            setIsDirty(true);
                        }}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-slate-900 border-white/20"
                    />
                </div>
                {(headerConfig.show_phone ?? true) && (
                    <input
                        type="text"
                        value={headerConfig.phone || ''}
                        onChange={(e) => {
                            setHeaderConfig((prev) => ({ ...prev, phone: e.target.value }));
                            setIsDirty(true);
                        }}
                        placeholder="+94 77 204 6898"
                        className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                    />
                )}
            </div>

            {/* WhatsApp */}
            <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300">Show WhatsApp Button</label>
                    <input
                        type="checkbox"
                        checked={headerConfig.show_whatsapp ?? false}
                        onChange={(e) => {
                            setHeaderConfig((prev) => ({ ...prev, show_whatsapp: e.target.checked }));
                            setIsDirty(true);
                        }}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-slate-900 border-white/20"
                    />
                </div>
                {(headerConfig.show_whatsapp ?? false) && (
                    <input
                        type="text"
                        value={headerConfig.whatsapp_number || ''}
                        onChange={(e) => {
                            setHeaderConfig((prev) => ({ ...prev, whatsapp_number: e.target.value }));
                            setIsDirty(true);
                        }}
                        placeholder="+94 77 123 4567"
                        className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                    />
                )}
            </div>

            {/* Primary CTA */}
            <div className="space-y-2 pt-2 border-t border-white/10">
                <label className="block text-[11px] font-bold text-slate-300">Header CTA Button</label>
                <div className="grid grid-cols-2 gap-2">
                    <input
                        type="text"
                        value={headerConfig.cta_text || ''}
                        onChange={(e) => {
                            setHeaderConfig((prev) => ({ ...prev, cta_text: e.target.value }));
                            setIsDirty(true);
                        }}
                        placeholder="Button text (e.g. Book a token)"
                        className="text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                    />
                    <input
                        type="text"
                        value={headerConfig.cta_url || ''}
                        onChange={(e) => {
                            setHeaderConfig((prev) => ({ ...prev, cta_url: e.target.value }));
                            setIsDirty(true);
                        }}
                        placeholder="URL (e.g. /book)"
                        className="text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                    />
                </div>
            </div>

            {/* Menu Items Editor */}
            <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300">Navigation Menu Links</label>
                    <button
                        type="button"
                        onClick={() => {
                            setHeaderConfig((prev) => ({
                                ...prev,
                                menu_items: [...(prev.menu_items || []), { label: 'New Link', url: '/' }],
                            }));
                            setIsDirty(true);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-400 hover:text-teal-300"
                    >
                        <Plus className="w-3 h-3" /> Add Link
                    </button>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {(headerConfig.menu_items || []).map((item, idx) => (
                        <div key={idx} className="p-2 rounded-xl bg-slate-900 border border-white/10 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    value={item.label}
                                    onChange={(e) => {
                                        const newItems = [...(headerConfig.menu_items || [])];
                                        newItems[idx] = { ...newItems[idx], label: e.target.value };
                                        setHeaderConfig((prev) => ({ ...prev, menu_items: newItems }));
                                        setIsDirty(true);
                                    }}
                                    placeholder="Menu Label"
                                    className="flex-1 text-xs rounded-lg bg-slate-950 border border-white/10 text-white px-2 py-1 focus:border-teal-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newItems = (headerConfig.menu_items || []).filter((_, i) => i !== idx);
                                        setHeaderConfig((prev) => ({ ...prev, menu_items: newItems }));
                                        setIsDirty(true);
                                    }}
                                    className="p-1 text-rose-400 hover:text-rose-300"
                                    title="Remove menu link"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <MenuLinkField
                                item={item}
                                pages={pages}
                                onChange={(next) => {
                                    const newItems = [...(headerConfig.menu_items || [])];
                                    newItems[idx] = { ...newItems[idx], ...next };
                                    if (next.page_id === undefined) delete newItems[idx].page_id;
                                    setHeaderConfig((prev) => ({ ...prev, menu_items: newItems }));
                                    setIsDirty(true);
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
