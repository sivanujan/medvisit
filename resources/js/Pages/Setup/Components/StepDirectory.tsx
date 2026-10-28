import React from 'react';
import {
    Compass,
    Info,
    ArrowRight,
    ArrowLeft,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    ExternalLink,
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

export default function StepDirectory({
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
                    Step 9 of 9
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                    Public directory listing
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Showcase your clinic on Sri Lanka&apos;s centralized healthcare directory at medvisit.lk/find.
                </p>
            </div>

            {/* "What this means" bullet explanation */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                    <Info className="w-4 h-4 text-[#1E6FD9] shrink-0" />
                    <span>Benefits of being listed:</span>
                </div>
                <ul className="text-[11px] text-blue-800/80 dark:text-blue-300/80 space-y-1 list-disc list-inside">
                    <li>Patients searching in {form.district || 'your district'} find your clinic by specialty or service.</li>
                    <li>Verified badge displayed alongside clinic operating hours and contact numbers.</li>
                    <li>Direct link for patients to take live tokens or initiate WhatsApp chats.</li>
                </ul>
            </div>

            {/* Directory Toggle Card */}
            <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5 pr-4">
                        <label className="text-sm font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                            Publish clinic on MedVisit Directory
                        </label>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Available to all Sri Lankan patients searching at medvisit.lk/find.
                        </p>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                            type="checkbox"
                            checked={form.directory_enabled}
                            onChange={(e) => {
                                onChange('directory_enabled', e.target.checked);
                                if (!e.target.checked) {
                                    onChange('directory_consented', false);
                                }
                            }}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0E9E8F]" />
                    </label>
                </div>

                {/* Consent Checkbox */}
                {form.directory_enabled && (
                    <div className="pt-4 border-t border-slate-200/60 dark:border-white/5 space-y-3">
                        <label className="flex items-start gap-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-white/10 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={form.directory_consented}
                                onChange={(e) => onChange('directory_consented', e.target.checked)}
                                className="mt-0.5 rounded border-slate-300 text-[#0E9E8F] focus:ring-[#0E9E8F]"
                            />
                            <div className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                                <strong>Legal consent:</strong> I confirm that{' '}
                                <strong className="text-slate-900 dark:text-white">{tenant.name}</strong> is a
                                registered medical clinic or healthcare practice in Sri Lanka, and I consent
                                to publish our address, contact numbers, and opening schedule on the public
                                directory.
                            </div>
                        </label>

                        {errors.consent && (
                            <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{errors.consent}</span>
                            </p>
                        )}
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
                    disabled={saving || (form.directory_enabled && !form.directory_consented)}
                    onClick={onContinue}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    style={{
                        background: `linear-gradient(135deg, #1E6FD9 0%, ${form.brand_color || '#0E9E8F'} 100%)`,
                    }}
                >
                    <span>{saving ? 'Saving...' : 'Review & launch'}</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
