import React from 'react';
import {
    Globe,
    Info,
    ArrowRight,
    ArrowLeft,
    ShieldCheck,
    Smartphone,
    UserCheck,
    CheckCircle2,
} from 'lucide-react';
import { SetupFormData, SetupTenantInfo } from '../types';

interface Props {
    tenant: SetupTenantInfo;
    form: SetupFormData;
    onChange: <K extends keyof SetupFormData>(field: K, value: SetupFormData[K]) => void;
    onContinue: () => void;
    onBack: () => void;
    saving: boolean;
    errors?: Record<string, string>;
}

export default function StepOnlineBooking({
    tenant,
    form,
    onChange,
    onContinue,
    onBack,
    saving,
    errors = {},
}: Props) {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6FD9] dark:text-[#5c9df4]">
                    Step 6 of 9
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                    Online patient booking
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Allow patients to issue queue tokens online or restrict access to in-person walk-ins.
                </p>
            </div>

            {/* "What this means" bullet explanation */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                    <Info className="w-4 h-4 text-[#1E6FD9] shrink-0" />
                    <span>How online booking works:</span>
                </div>
                <ul className="text-[11px] text-blue-800/80 dark:text-blue-300/80 space-y-1 list-disc list-inside">
                    <li>Patients visit {tenant.subdomain}.medvisit.lk/book to get a live numbered token.</li>
                    <li>Patients see their real-time estimated wait time and live TV queue counter.</li>
                    <li>Reception desk receives incoming bookings instantly on the live session dashboard.</li>
                </ul>
            </div>

            {/* Main Toggle Card */}
            <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5 pr-4">
                        <label className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                            Enable online token booking
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            When disabled, your website informs patients to call or walk-in.
                        </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                            type="checkbox"
                            checked={form.online_booking_enabled}
                            onChange={(e) => onChange('online_booking_enabled', e.target.checked)}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0E9E8F]" />
                    </label>
                </div>

                {/* Sub-settings if enabled */}
                {form.online_booking_enabled && (
                    <div className="pt-4 border-t border-slate-200/60 dark:border-white/5 space-y-4">
                        {/* Token Limit */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Max active tokens per phone number
                                </label>
                                <p className="text-[11px] text-slate-400">
                                    Prevents token hoards while allowing booking for family members.
                                </p>
                            </div>

                            <select
                                value={form.max_active_tokens_per_phone}
                                onChange={(e) =>
                                    onChange('max_active_tokens_per_phone', parseInt(e.target.value, 10))
                                }
                                className="w-24 px-3 py-1.5 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono font-bold"
                            >
                                {[1, 2, 3, 4, 5, 8, 10].map((num) => (
                                    <option key={num} value={num}>
                                        {num} {num === 1 ? 'token' : 'tokens'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Phone Verification */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/40 dark:border-white/5">
                            <div className="flex items-center gap-2.5">
                                <Smartphone className="w-4 h-4 text-[#1E6FD9] shrink-0" />
                                <div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Require phone number verification
                                    </span>
                                    <p className="text-[11px] text-slate-400">
                                        Sends SMS or WhatsApp OTP before booking confirmation.
                                    </p>
                                </div>
                            </div>

                            <input
                                type="checkbox"
                                checked={form.require_phone_verification}
                                onChange={(e) =>
                                    onChange('require_phone_verification', e.target.checked)
                                }
                                className="h-4 w-4 rounded border-slate-300 text-[#1E6FD9] focus:ring-[#1E6FD9]"
                            />
                        </div>

                        {/* Staff Approval */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/40 dark:border-white/5">
                            <div className="flex items-center gap-2.5">
                                <UserCheck className="w-4 h-4 text-[#0E9E8F] shrink-0" />
                                <div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Require reception approval
                                    </span>
                                    <p className="text-[11px] text-slate-400">
                                        Tokens enter a &quot;Pending&quot; state until staff confirms.
                                    </p>
                                </div>
                            </div>

                            <input
                                type="checkbox"
                                checked={form.require_staff_approval}
                                onChange={(e) => onChange('require_staff_approval', e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-[#0E9E8F] focus:ring-[#0E9E8F]"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Navigation buttons */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>

                <button
                    type="button"
                    disabled={saving}
                    onClick={onContinue}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    style={{
                        background: `linear-gradient(135deg, #1E6FD9 0%, ${form.brand_color || '#0E9E8F'} 100%)`,
                    }}
                >
                    <span>{saving ? 'Saving...' : 'Save & continue'}</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
