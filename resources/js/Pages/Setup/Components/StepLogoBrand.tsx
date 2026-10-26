import React, { useRef, useState } from 'react';
import {
    Palette,
    Upload,
    Check,
    AlertCircle,
    Info,
    ArrowRight,
    ArrowLeft,
    Sparkles,
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

const BRAND_PALETTES = [
    { label: 'MedVisit Teal', hex: '#0E9E8F', theme: 'medvisit-teal' },
    { label: 'Ocean Blue', hex: '#1E6FD9', theme: 'ocean-blue' },
    { label: 'Coral Health', hex: '#FF7A59', theme: 'coral-health' },
    { label: 'Emerald Health', hex: '#10B981', theme: 'emerald-care' },
    { label: 'Royal Violet', hex: '#7C3AED', theme: 'royal-purple' },
    { label: 'Clean Slate', hex: '#334155', theme: 'slate-clean' },
];

export default function StepLogoBrand({
    tenant,
    form,
    onChange,
    onContinue,
    onBack,
    saving,
    errors = {},
}: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const initial = (tenant.name.trim().charAt(0) || 'C').toUpperCase();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('type', 'logo');
            formData.append('file', file);

            const token = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content;
            const res = await fetch('/setup/upload-photo', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': token || '',
                },
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) {
                setUploadError(data.message || data.errors?.file?.[0] || 'Failed to upload logo.');
            } else if (data.url) {
                onChange('logo_url', data.url);
                onChange('use_initials', false);
            }
        } catch (err: unknown) {
            setUploadError('Network error uploading file. Please try again.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6FD9] dark:text-[#5c9df4]">
                    Step 1 of 9
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                    Logo & brand colors
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Establish your clinic&apos;s visual identity across your public booking page, waiting-room TV,
                    and patient receipts.
                </p>
            </div>

            {/* "What this means" bullet explanation */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                    <Info className="w-4 h-4 text-[#1E6FD9] shrink-0" />
                    <span>Where these settings appear:</span>
                </div>
                <ul className="text-[11px] text-blue-800/80 dark:text-blue-300/80 space-y-1 list-disc list-inside">
                    <li>Top navigation and mobile header on {tenant.subdomain}.medvisit.lk</li>
                    <li>Waiting-room queue TV token cards and live callout sounds</li>
                    <li>Printed thermal 80mm patient slips and receipt header</li>
                </ul>
            </div>

            {/* Logo Section */}
            <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Clinic Logo
                </label>

                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-white/10">
                    {/* Logo Preview Avatar */}
                    <div className="relative shrink-0">
                        {form.logo_url && !form.use_initials ? (
                            <div className="h-20 w-20 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 bg-white p-2 shadow-sm flex items-center justify-center">
                                <img
                                    src={form.logo_url}
                                    alt="Logo preview"
                                    className="max-h-full max-w-full object-contain"
                                />
                            </div>
                        ) : (
                            <div
                                className="h-20 w-20 rounded-2xl shadow-md flex items-center justify-center text-3xl font-black text-white"
                                style={{
                                    background: `linear-gradient(135deg, #1E6FD9 0%, ${form.brand_color || '#0E9E8F'} 100%)`,
                                }}
                            >
                                {initial}
                            </div>
                        )}
                    </div>

                    {/* Upload / Option Buttons */}
                    <div className="space-y-2 flex-1 text-center sm:text-left">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={handleFileChange}
                        />

                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                            <button
                                type="button"
                                disabled={uploading}
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 hover:border-[#1E6FD9] dark:hover:border-[#5c9df4] text-slate-800 dark:text-slate-200 shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                                <Upload className="w-3.5 h-3.5 text-[#1E6FD9]" />
                                <span>{uploading ? 'Uploading...' : 'Upload logo image'}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    onChange('use_initials', true);
                                    onChange('logo_url', null);
                                }}
                                className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                    form.use_initials
                                        ? 'bg-[#0E9E8F]/10 text-[#0E9E8F] border-[#0E9E8F]/30'
                                        : 'bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5'
                                }`}
                            >
                                Use &quot;{initial}&quot; monogram initials
                            </button>
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Square PNG, WebP or JPEG recommended (max 5MB).
                        </p>
                    </div>
                </div>

                {(uploadError || errors.logo) && (
                    <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{uploadError || errors.logo}</span>
                    </p>
                )}
            </div>

            {/* Brand Color Palette */}
            <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Primary Brand Color
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {BRAND_PALETTES.map((palette) => {
                        const isSelected = form.brand_color.toUpperCase() === palette.hex.toUpperCase();

                        return (
                            <button
                                key={palette.hex}
                                type="button"
                                onClick={() => {
                                    onChange('brand_color', palette.hex);
                                    onChange('theme', palette.theme);
                                }}
                                className={`p-3 rounded-2xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                                    isSelected
                                        ? 'border-slate-900 dark:border-white ring-2 ring-slate-900/10 dark:ring-white/20 bg-slate-50 dark:bg-white/5'
                                        : 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                                }`}
                            >
                                <span
                                    className="h-6 w-6 rounded-full shrink-0 shadow-xs flex items-center justify-center"
                                    style={{ backgroundColor: palette.hex }}
                                >
                                    {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                                </span>
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                        {palette.label}
                                    </div>
                                    <div className="text-[10px] font-mono text-slate-400 uppercase">
                                        {palette.hex}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Custom Hex Color Picker */}
                <div className="flex items-center gap-3 pt-1">
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Or enter custom hex:
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="color"
                            value={form.brand_color}
                            onChange={(e) => onChange('brand_color', e.target.value.toUpperCase())}
                            className="h-8 w-8 rounded-lg cursor-pointer border border-slate-200 dark:border-white/10 p-0.5 bg-transparent"
                        />
                        <input
                            type="text"
                            maxLength={7}
                            value={form.brand_color}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val.startsWith('#') || val === '') {
                                    onChange('brand_color', val);
                                } else {
                                    onChange('brand_color', '#' + val);
                                }
                            }}
                            className="w-24 px-2 py-1.5 rounded-lg text-xs font-mono uppercase bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white"
                        />
                    </div>
                </div>

                {errors.brand_color && (
                    <p className="text-xs text-rose-500 font-semibold">{errors.brand_color}</p>
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
