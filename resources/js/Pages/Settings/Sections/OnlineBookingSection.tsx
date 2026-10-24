import React from 'react';
import { Globe, ShieldCheck, Check, Smartphone, MessageSquare, AlertCircle } from 'lucide-react';
import LivePreviewPanel from '../Components/LivePreviewPanel';
import { OnlineBookingSettingsData, FormInstance } from '../types';

interface Props {
    form: FormInstance<{
        online_booking_enabled: boolean;
        max_active_tokens_per_phone: number;
        require_staff_approval: boolean;
        require_phone_verification: boolean;
        phone_verification_methods: string[];
    }>;
    onlineBookingSettings: OnlineBookingSettingsData;
}

export default function OnlineBookingSection({ form, onlineBookingSettings }: Props) {
    const { data, setData, errors } = form;

    const toggleChannel = (channel: string) => {
        const current = data.phone_verification_methods || [];
        const exists = current.includes(channel);
        if (exists && current.length === 1) return; // Keep at least 1 method
        const next = exists ? current.filter((m: string) => m !== channel) : [...current, channel];
        setData('phone_verification_methods', next);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Online booking
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Control how patients reserve channeling tokens on your dedicated web portal.
                    </p>
                </div>

                {/* Master Switch Card */}
                <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2.5">
                            <Globe className="w-4 h-4 text-[#1E6FD9]" />
                            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                Public portal availability
                            </h3>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                        <div className="min-w-0 pr-4">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Enable online appointment bookings
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Allow patients to view doctors and book tokens from your clinic web link.
                            </p>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={data.online_booking_enabled}
                                onChange={(e) => setData('online_booking_enabled', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0E9E8F]" />
                        </label>
                    </div>

                    <div className="space-y-4 pt-2">
                        {/* Token Cap Per Phone */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Maximum active tokens per phone number
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                value={data.max_active_tokens_per_phone}
                                onChange={(e) =>
                                    setData('max_active_tokens_per_phone', parseInt(e.target.value) || 1)
                                }
                                className="w-full sm:w-48 px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 font-semibold"
                                required
                            />
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Prevents token hoarding and bulk reservations from a single mobile device.
                            </p>
                            {errors.max_active_tokens_per_phone && (
                                <p className="text-xs text-rose-500 font-semibold mt-1">
                                    {errors.max_active_tokens_per_phone}
                                </p>
                            )}
                        </div>

                        {/* Staff Approval */}
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                            <div className="min-w-0 pr-4">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Require receptionist approval
                                </h4>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                    Online bookings start as provisional until confirmed by clinic reception.
                                </p>
                            </div>

                            <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                <input
                                    type="checkbox"
                                    checked={data.require_staff_approval}
                                    onChange={(e) => setData('require_staff_approval', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1E6FD9]" />
                            </label>
                        </div>
                    </div>
                </div>

                {/* Phone Verification Card */}
                <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2.5">
                            <ShieldCheck className="w-4 h-4 text-[#0E9E8F]" />
                            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                Patient phone verification (OTP)
                            </h3>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5">
                        <div className="min-w-0 pr-4">
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Require 6-digit OTP verification
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Ensures patients enter a valid Sri Lankan mobile number before securing a token.
                            </p>
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                                type="checkbox"
                                checked={data.require_phone_verification}
                                onChange={(e) => setData('require_phone_verification', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0E9E8F]" />
                        </label>
                    </div>

                    {data.require_phone_verification && (
                        <div className="space-y-3 pt-2">
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Allowed verification channels
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => toggleChannel('whatsapp')}
                                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                                        data.phone_verification_methods?.includes('whatsapp')
                                            ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500/40 text-emerald-900 dark:text-emerald-300 shadow-xs'
                                            : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-500'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <MessageSquare className="w-4 h-4 text-emerald-500" />
                                        <div>
                                            <div className="text-xs font-bold">WhatsApp OTP</div>
                                            <div className="text-[10px] text-slate-500">Fast delivery, high open rate</div>
                                        </div>
                                    </div>
                                    {data.phone_verification_methods?.includes('whatsapp') && (
                                        <Check className="w-4 h-4 text-emerald-600" />
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => toggleChannel('textlk')}
                                    className={`p-3.5 rounded-2xl border text-left transition-all flex items-center justify-between ${
                                        data.phone_verification_methods?.includes('textlk')
                                            ? 'bg-primary-50/60 dark:bg-primary-950/20 border-primary-500/40 text-primary-900 dark:text-primary-300 shadow-xs'
                                            : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-500'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Smartphone className="w-4 h-4 text-primary" />
                                        <div>
                                            <div className="text-xs font-bold">SMS text OTP</div>
                                            <div className="text-[10px] text-slate-500">Universal fallback for any phone</div>
                                        </div>
                                    </div>
                                    {data.phone_verification_methods?.includes('textlk') && (
                                        <Check className="w-4 h-4 text-primary" />
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Live Preview Column */}
            <div className="lg:col-span-5 space-y-4">
                <LivePreviewPanel
                    title="Public booking state"
                    subtitle="How patient button & verification appear"
                >
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-white/10 shadow-sm space-y-4 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-[#1E6FD9]/10 text-[#1E6FD9] flex items-center justify-center mx-auto">
                            <Globe className="w-6 h-6" />
                        </div>

                        <div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold mb-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                {data.online_booking_enabled ? 'Booking portal active' : 'Online booking paused'}
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                Public Channeling Portal
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {data.online_booking_enabled
                                    ? `Patients can book up to ${data.max_active_tokens_per_phone} tokens per mobile.`
                                    : 'Public appointments are currently paused. Receptionists can still issue tokens.'}
                            </p>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 text-left text-xs space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Security Gate:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {data.require_phone_verification ? '6-Digit OTP Required' : 'Instant Reservation'}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Approval Workflow:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                    {data.require_staff_approval ? 'Staff Confirmation' : 'Auto-Confirmed'}
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            disabled={!data.online_booking_enabled}
                            className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                                data.online_booking_enabled
                                    ? 'bg-[#1E6FD9] text-white hover:bg-blue-600 shadow-[#1E6FD9]/25'
                                    : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                            }`}
                        >
                            {data.online_booking_enabled ? 'Book Channeling Token' : 'Bookings Unavailable'}
                        </button>
                    </div>
                </LivePreviewPanel>
            </div>
        </div>
    );
}
