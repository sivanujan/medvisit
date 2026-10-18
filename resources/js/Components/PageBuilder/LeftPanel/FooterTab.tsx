import React from 'react';
import type { FooterConfig, TabBaseProps } from '../types';

interface FooterTabProps extends TabBaseProps {
    isActive: boolean;
    footerConfig: FooterConfig;
    setFooterConfig: React.Dispatch<React.SetStateAction<FooterConfig>>;
    setIsDirty: (dirty: boolean) => void;
}

export default function FooterTab({ isActive, footerConfig, setFooterConfig, setIsDirty }: FooterTabProps) {
    return (
        <div className={`flex-1 overflow-y-auto p-4 space-y-4 text-xs ${isActive ? '' : 'hidden'}`}>
            <div>
                <h4 className="font-bold text-sm text-white mb-1">Shared Public Footer</h4>
                <p className="text-[11px] text-slate-400">
                    Unified footer applied across every public page and channeling portal view.
                </p>
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
