import React from 'react';
import { Building2, Phone, Hash, MapPin, Receipt, Ticket, Sparkles } from 'lucide-react';
import { PhoneInput } from '@/Components/UI/PhoneInput';
import GlassSelect from '@/Components/UI/GlassSelect';
import LivePreviewPanel from '../Components/LivePreviewPanel';
import { ClinicProfileData, FormInstance } from '../types';

interface Props {
    form: FormInstance<{
        name: string;
        phone: string;
        address_line: string;
        city: string;
        district: string;
        postal_code: string;
        registration_number: string;
        logo_url: string;
    }>;
    profile: ClinicProfileData;
    districts: string[];
}

export default function ProfileSection({ form, profile, districts }: Props) {
    const { data, setData, errors } = form;

    const formattedAddress = [data.address_line, data.city, data.district, data.postal_code]
        .filter(Boolean)
        .join(', ');

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column */}
            <div className="lg:col-span-7 space-y-6">
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Clinic profile
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Configure your practice identity, contact numbers and physical location for patients and receipts.
                    </p>
                </div>

                {/* Identity & Registration Card */}
                <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/5">
                        <Building2 className="w-4 h-4 text-[#1E6FD9]" />
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Clinic identity
                        </h3>
                    </div>

                    <div className="space-y-4">
                        {/* Clinic Name */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Clinic name <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="e.g. Suwasetha Medical Centre"
                                className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 transition-all font-medium"
                                required
                            />
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Displayed exactly as typed across your queue slips, invoices, public site and header.
                            </p>
                            {errors.name && (
                                <p className="text-xs text-rose-500 font-semibold mt-1">{errors.name}</p>
                            )}
                        </div>

                        {/* Phone & PHSRC License in 2 columns */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Clinic phone
                                </label>
                                <PhoneInput
                                    value={data.phone}
                                    onChange={(val) => setData('phone', val)}
                                    placeholder="+94 77 123 4567"
                                    error={errors.phone}
                                />
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                    Primary contact shown on receipts and SMS confirmations.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    PHSRC registration no. <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.registration_number}
                                    onChange={(e) => setData('registration_number', e.target.value)}
                                    placeholder="e.g. PHSRC/MED/2026/042"
                                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400/60 placeholder:italic focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 transition-all font-mono"
                                />
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                    Private Health Services Regulatory Council license number.
                                </p>
                                {errors.registration_number && (
                                    <p className="text-xs text-rose-500 font-semibold mt-1">{errors.registration_number}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Structured Address Card */}
                <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2.5">
                            <MapPin className="w-4 h-4 text-[#0E9E8F]" />
                            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                Clinic address
                            </h3>
                        </div>
                        {profile.legacy_address && (
                            <span className="text-[10px] text-slate-400 font-mono">
                                Structured format
                            </span>
                        )}
                    </div>

                    <div className="space-y-4">
                        {/* Street Address Line */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Address line (street / building)
                            </label>
                            <input
                                type="text"
                                value={data.address_line}
                                onChange={(e) => setData('address_line', e.target.value)}
                                placeholder="e.g. No. 45, Hospital Road"
                                className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 transition-all"
                            />
                            {errors.address_line && (
                                <p className="text-xs text-rose-500 font-semibold mt-1">{errors.address_line}</p>
                            )}
                        </div>

                        {/* City & District & Postal Code */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    City / Town
                                </label>
                                <input
                                    type="text"
                                    value={data.city}
                                    onChange={(e) => setData('city', e.target.value)}
                                    placeholder="e.g. Jaffna"
                                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 transition-all"
                                />
                                {errors.city && (
                                    <p className="text-xs text-rose-500 font-semibold mt-1">{errors.city}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    District (25 SL)
                                </label>
                                <GlassSelect
                                    value={data.district}
                                    onValueChange={(val) => setData('district', val)}
                                    placeholder="Select district"
                                    options={districts.map((d) => ({ value: d, label: d }))}
                                />
                                {errors.district && (
                                    <p className="text-xs text-rose-500 font-semibold mt-1">{errors.district}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Postal code <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={data.postal_code}
                                    onChange={(e) => setData('postal_code', e.target.value)}
                                    placeholder="e.g. 40000"
                                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 transition-all font-mono"
                                />
                                {errors.postal_code && (
                                    <p className="text-xs text-rose-500 font-semibold mt-1">{errors.postal_code}</p>
                                )}
                            </div>
                        </div>

                        {profile.legacy_address && (
                            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                                <span className="font-semibold text-slate-600 dark:text-slate-300 shrink-0">Original address:</span>
                                <span className="italic truncate">{profile.legacy_address}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Live Preview Column */}
            <div className="lg:col-span-5 space-y-4">
                <LivePreviewPanel
                    title="80mm receipt & token slip header"
                    subtitle="Where your clinic name, registration and address appear"
                >
                    <div className="space-y-4">
                        {/* Thermal Slip Simulation */}
                        <div className="w-full max-w-[320px] mx-auto bg-white text-slate-900 p-5 rounded-2xl border-2 border-dashed border-slate-300 shadow-md font-mono text-center text-xs space-y-2.5">
                            {/* Logo / Initial */}
                            <div className="flex justify-center">
                                {data.logo_url ? (
                                    <img
                                        src={data.logo_url}
                                        alt={data.name || 'Logo'}
                                        className="h-10 w-10 object-contain mx-auto"
                                    />
                                ) : (
                                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-white font-extrabold flex items-center justify-center text-sm">
                                        {(data.name || 'M').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>

                            {/* Clinic Title */}
                            <div>
                                <h4 className="font-extrabold text-sm tracking-wide uppercase text-slate-950">
                                    {data.name || 'Your Clinic Name'}
                                </h4>
                                <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                                    {formattedAddress || 'Clinic Address Line, City, District'}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {data.phone ? `Tel: ${data.phone}` : 'Tel: +94 -- --- ----'}
                                    {data.registration_number && ` • Reg: ${data.registration_number}`}
                                </p>
                            </div>

                            <div className="border-t border-b border-dashed border-slate-300 py-1.5 text-center">
                                <span className="text-[10px] font-bold tracking-widest uppercase block text-slate-600">
                                    TOKEN SLIP
                                </span>
                                <div className="text-xl font-black text-slate-900 my-0.5">#07</div>
                                <span className="text-[9px] text-slate-400 block">
                                    Dr. K. Sivalingam • Today 05:30 PM
                                </span>
                            </div>

                            <p className="text-[9px] text-slate-400 italic">
                                Thank you for visiting. Please listen for your token call.
                            </p>
                        </div>

                        {/* Tip info badge */}
                        <div className="p-3.5 rounded-2xl bg-primary-50/70 dark:bg-primary-950/20 border border-primary-200/60 dark:border-primary-900/40 text-xs text-primary-800 dark:text-primary-300 flex items-center gap-2.5">
                            <Sparkles className="w-4 h-4 text-primary shrink-0" />
                            <span>
                                Live header updates automatically as you type clinic name, address and phone.
                            </span>
                        </div>
                    </div>
                </LivePreviewPanel>
            </div>
        </div>
    );
}
