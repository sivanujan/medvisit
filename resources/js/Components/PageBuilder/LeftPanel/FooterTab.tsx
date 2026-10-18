import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import type { FooterConfig, PageSummary, TabBaseProps } from '../types';
import MenuLinkField from './MenuLinkField';

interface FooterTabProps extends TabBaseProps {
    isActive: boolean;
    footerConfig: FooterConfig;
    setFooterConfig: React.Dispatch<React.SetStateAction<FooterConfig>>;
    setIsDirty: (dirty: boolean) => void;
    pages: PageSummary[];
}

export default function FooterTab({ isActive, footerConfig, setFooterConfig, setIsDirty, pages }: FooterTabProps) {
    return (
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 text-xs ${isActive ? '' : 'hidden'}`}>
            <div>
                <h4 className="font-bold text-sm text-white mb-1">Shared Public Footer</h4>
                <p className="text-[11px] text-slate-400">
                    Unified footer applied across every public page and channeling portal view.
                </p>
            </div>

            {/* Quick links */}
            <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300">Quick Links</label>
                    <button
                        type="button"
                        onClick={() => {
                            setFooterConfig((prev) => ({
                                ...prev,
                                quick_links: [...(prev.quick_links || []), { label: 'New Link', url: '/' }],
                            }));
                            setIsDirty(true);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-400 hover:text-teal-300"
                    >
                        <Plus className="w-3 h-3" /> Add Link
                    </button>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {(footerConfig.quick_links || []).map((link, idx) => (
                        <div key={idx} className="p-2 rounded-xl bg-slate-900 border border-white/10 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                                <input
                                    type="text"
                                    value={link.label}
                                    onChange={(e) => {
                                        const links = [...(footerConfig.quick_links || [])];
                                        links[idx] = { ...links[idx], label: e.target.value };
                                        setFooterConfig((prev) => ({ ...prev, quick_links: links }));
                                        setIsDirty(true);
                                    }}
                                    placeholder="Link Label"
                                    className="flex-1 text-xs rounded-lg bg-slate-950 border border-white/10 text-white px-2 py-1 focus:border-teal-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => {
                                        const links = (footerConfig.quick_links || []).filter((_, i) => i !== idx);
                                        setFooterConfig((prev) => ({ ...prev, quick_links: links }));
                                        setIsDirty(true);
                                    }}
                                    className="p-1 text-rose-400 hover:text-rose-300"
                                    title="Remove link"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <MenuLinkField
                                item={link}
                                pages={pages}
                                onChange={(next) => {
                                    const links = [...(footerConfig.quick_links || [])];
                                    links[idx] = { ...links[idx], ...next };
                                    if (next.page_id === undefined) delete links[idx].page_id;
                                    setFooterConfig((prev) => ({ ...prev, quick_links: links }));
                                    setIsDirty(true);
                                }}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {/* About clinic summary */}
            <div className="space-y-1.5 pt-2 border-t border-white/10">
                <label className="block text-[11px] font-bold text-slate-300">About Clinic Summary</label>
                <textarea
                    rows={3}
                    value={footerConfig.about_text || ''}
                    onChange={(e) => {
                        setFooterConfig((prev) => ({ ...prev, about_text: e.target.value }));
                        setIsDirty(true);
                    }}
                    placeholder="Short clinic description appearing under footer logo..."
                    className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                />
            </div>

            {/* Address & Phone */}
            <div className="space-y-2 pt-2 border-t border-white/10">
                <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Physical Address</label>
                    <input
                        type="text"
                        value={footerConfig.address || ''}
                        onChange={(e) => {
                            setFooterConfig((prev) => ({ ...prev, address: e.target.value }));
                            setIsDirty(true);
                        }}
                        placeholder="123 Hospital Road, Colombo"
                        className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Clinic Hotline Phone</label>
                    <input
                        type="text"
                        value={footerConfig.phone || ''}
                        onChange={(e) => {
                            setFooterConfig((prev) => ({ ...prev, phone: e.target.value }));
                            setIsDirty(true);
                        }}
                        placeholder="+94 11 234 5678"
                        className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Support Email</label>
                    <input
                        type="text"
                        value={footerConfig.email || ''}
                        onChange={(e) => {
                            setFooterConfig((prev) => ({ ...prev, email: e.target.value }));
                            setIsDirty(true);
                        }}
                        placeholder="info@clinic.lk"
                        className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">WhatsApp Hotline</label>
                    <input
                        type="text"
                        value={footerConfig.whatsapp_number || ''}
                        onChange={(e) => {
                            setFooterConfig((prev) => ({ ...prev, whatsapp_number: e.target.value }));
                            setIsDirty(true);
                        }}
                        placeholder="+94 77 123 4567"
                        className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                    />
                </div>
            </div>

            {/* Opening Hours */}
            <div className="space-y-1.5 pt-2 border-t border-white/10">
                <label className="block text-[11px] font-bold text-slate-300">Clinical Opening Hours</label>
                <textarea
                    rows={2}
                    value={footerConfig.opening_hours || ''}
                    onChange={(e) => {
                        setFooterConfig((prev) => ({ ...prev, opening_hours: e.target.value }));
                        setIsDirty(true);
                    }}
                    placeholder="Mon – Sat: 8:00 AM – 9:00 PM | Sun: 8:00 AM – 2:00 PM"
                    className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                />
            </div>

            {/* Social Links */}
            <div className="space-y-2 pt-2 border-t border-white/10">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300">Show Social Media Links</label>
                    <input
                        type="checkbox"
                        checked={footerConfig.show_social ?? true}
                        onChange={(e) => {
                            setFooterConfig((prev) => ({ ...prev, show_social: e.target.checked }));
                            setIsDirty(true);
                        }}
                        className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-slate-900 border-white/20"
                    />
                </div>
                {(footerConfig.show_social ?? true) && (
                    <div className="space-y-2">
                        <input
                            type="text"
                            value={footerConfig.facebook_url || ''}
                            onChange={(e) => {
                                setFooterConfig((prev) => ({ ...prev, facebook_url: e.target.value }));
                                setIsDirty(true);
                            }}
                            placeholder="Facebook page URL"
                            className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                        />
                        <input
                            type="text"
                            value={footerConfig.instagram_url || ''}
                            onChange={(e) => {
                                setFooterConfig((prev) => ({ ...prev, instagram_url: e.target.value }));
                                setIsDirty(true);
                            }}
                            placeholder="Instagram profile URL"
                            className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                        />
                    </div>
                )}
            </div>

            {/* Powered by */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <div>
                    <label className="text-[11px] font-bold text-slate-300 block">Powered by MedVisit</label>
                    <span className="text-[10px] text-slate-400">Displays "Powered by MedVisit" link to medvisit.lk</span>
                </div>
                <input
                    type="checkbox"
                    checked={footerConfig.show_powered_by ?? true}
                    onChange={(e) => {
                        setFooterConfig((prev) => ({ ...prev, show_powered_by: e.target.checked }));
                        setIsDirty(true);
                    }}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 bg-slate-900 border-white/20"
                />
            </div>
        </div>
    );
}
