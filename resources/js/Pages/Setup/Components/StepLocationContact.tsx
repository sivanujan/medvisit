import React from 'react';
import {
    MapPin,
    Phone,
    Mail,
    MessageCircle,
    Info,
    ArrowRight,
    ArrowLeft,
    CheckCircle2,
    Navigation,
} from 'lucide-react';
import { SetupFormData, SetupTenantInfo } from '../types';
import MapPinPicker from '@/Components/WebsiteEditor/MapPinPicker';

interface Props {
    tenant: SetupTenantInfo;
    form: SetupFormData;
    districts: string[];
    onChange: <K extends keyof SetupFormData>(field: K, value: SetupFormData[K]) => void;
    onContinue: () => void;
    onBack: () => void;
    saving: boolean;
    errors?: Record<string, string>;
}

export default function StepLocationContact({
    tenant,
    form,
    districts,
    onChange,
    onContinue,
    onBack,
    saving,
    errors = {},
}: Props) {
    const isSameAsPhone = form.whatsapp === form.phone && form.phone.length > 0;

    const handleSameAsPhoneToggle = (checked: boolean) => {
        if (checked) {
            onChange('whatsapp', form.phone);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6FD9] dark:text-[#5c9df4]">
                    Step 3 of 9
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                    Location & contact
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Help patients find your clinic easily via GPS directions, WhatsApp, and telephone.
                </p>
            </div>

            {/* "What this means" bullet explanation */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                    <Info className="w-4 h-4 text-[#1E6FD9] shrink-0" />
                    <span>How patients use this info:</span>
                </div>
                <ul className="text-[11px] text-blue-800/80 dark:text-blue-300/80 space-y-1 list-disc list-inside">
                    <li>Google Maps pin coordinates give patients 1-tap driving directions.</li>
                    <li>WhatsApp number powers the &quot;Chat with reception&quot; button on your site.</li>
                    <li>Printed onto patient 80mm thermal queue slips and official invoices.</li>
                </ul>
            </div>

            {/* Physical Address Fields */}
            <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-[#1E6FD9]" />
                    <span>Physical Clinic Address</span>
                </h3>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Street address <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.address_line}
                            onChange={(e) => onChange('address_line', e.target.value)}
                            placeholder="e.g. 42 Hospital Road, 2nd Floor"
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                            required
                        />
                        {errors.address_line && (
                            <p className="text-xs text-rose-500 mt-1">{errors.address_line}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                City / Town <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.city}
                                onChange={(e) => onChange('city', e.target.value)}
                                placeholder="e.g. Jaffna"
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                                required
                            />
                            {errors.city && <p className="text-xs text-rose-500 mt-1">{errors.city}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                District <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={form.district}
                                onChange={(e) => onChange('district', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                                required
                            >
                                <option value="">Select district</option>
                                {districts.map((d) => (
                                    <option key={d} value={d}>
                                        {d}
                                    </option>
                                ))}
                            </select>
                            {errors.district && (
                                <p className="text-xs text-rose-500 mt-1">{errors.district}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Postal code
                            </label>
                            <input
                                type="text"
                                value={form.postal_code}
                                onChange={(e) => onChange('postal_code', e.target.value)}
                                placeholder="e.g. 40000"
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 font-mono"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Interactive Sri Lanka Map Pin */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        GPS Map Pin (Sri Lanka)
                    </label>
                    <span className="text-[11px] font-mono text-slate-400">
                        {form.latitude?.toFixed(4)}, {form.longitude?.toFixed(4)}
                    </span>
                </div>

                <MapPinPicker
                    latitude={form.latitude}
                    longitude={form.longitude}
                    district={form.district}
                    city={form.city}
                    onChange={(lat, lng) => {
                        if (lat !== null && lng !== null) {
                            onChange('latitude', lat);
                            onChange('longitude', lng);
                            onChange('has_pinned', true);
                        }
                    }}
                />

                {(errors.latitude || errors.longitude) && (
                    <p className="text-xs text-rose-500 mt-1">
                        {errors.latitude || errors.longitude}
                    </p>
                )}
            </div>

            {/* Direct Patient Contact Details */}
            <div className="space-y-4 pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-[#0E9E8F]" />
                    <span>Patient Contact Channels</span>
                </h3>

                <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Clinic phone number <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={(e) => {
                                    onChange('phone', e.target.value);
                                    if (isSameAsPhone) {
                                        onChange('whatsapp', e.target.value);
                                    }
                                }}
                                placeholder="021 222 3344"
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                                required
                            />
                            {errors.phone && <p className="text-xs text-rose-500 mt-1">{errors.phone}</p>}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    WhatsApp number
                                </label>
                                <label className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isSameAsPhone}
                                        onChange={(e) => handleSameAsPhoneToggle(e.target.checked)}
                                        className="rounded border-slate-300 text-[#0E9E8F] focus:ring-[#0E9E8F]"
                                    />
                                    <span>Same as phone</span>
                                </label>
                            </div>
                            <input
                                type="tel"
                                value={form.whatsapp}
                                onChange={(e) => onChange('whatsapp', e.target.value)}
                                placeholder="077 123 4567"
                                className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                            />
                            {errors.whatsapp && (
                                <p className="text-xs text-rose-500 mt-1">{errors.whatsapp}</p>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Public email address
                        </label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => onChange('email', e.target.value)}
                            placeholder="info@yourclinic.lk"
                            className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                        />
                        {errors.email && <p className="text-xs text-rose-500 mt-1">{errors.email}</p>}
                    </div>
                </div>
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
