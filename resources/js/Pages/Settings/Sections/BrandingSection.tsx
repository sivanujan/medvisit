import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    Sparkles,
    Upload,
    ImageIcon,
    Trash2,
    CheckCircle2,
    Eye,
    Globe,
    Building2,
    ExternalLink,
} from 'lucide-react';
import ImageUploaderModal from '@/Components/Media/ImageUploaderModal';
import LivePreviewPanel from '../Components/LivePreviewPanel';
import { ClinicProfileData } from '../types';

interface Props {
    profile: ClinicProfileData;
    onLogoUpdated: (url: string | null) => void;
}

export default function BrandingSection({ profile, onLogoUpdated }: Props) {
    const [isUploaderOpen, setIsUploaderOpen] = useState(false);
    const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(profile.logo_url || null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [logoError, setLogoError] = useState(false);

    const handleLogoSuccess = (data: { logo_url?: string; avatar_url?: string; photo_url?: string }) => {
        const url = data.logo_url || data.avatar_url || data.photo_url;
        if (url) {
            setCurrentLogoUrl(url);
            setLogoError(false);
            onLogoUpdated(url);
        }
        setIsUploaderOpen(false);
    };

    const handleDeleteLogo = () => {
        if (!confirm('Remove clinic logo and restore the default clinic initial?')) return;

        setIsDeleting(true);
        router.delete('/settings/branding/logo', {
            preserveScroll: true,
            onSuccess: () => {
                setCurrentLogoUrl(null);
                setLogoError(false);
                onLogoUpdated(null);
                setIsDeleting(false);
            },
            onError: () => {
                setIsDeleting(false);
            },
        });
    };

    const clinicInitial = (profile.name || 'M').charAt(0).toUpperCase();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Form Column */}
            <div className="lg:col-span-7 space-y-6">
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Branding & logo
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Upload your clinic icon or emblem. It automatically scales for your dashboard, navigation, receipts and favicon.
                    </p>
                </div>

                <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-6">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/5">
                        <Sparkles className="w-4 h-4 text-[#1E6FD9]" />
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Official clinic logo
                        </h3>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 p-6 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-dashed border-slate-200 dark:border-white/10">
                        {/* Logo Preview Square */}
                        <div className="relative group shrink-0">
                            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-white/10 shadow-md flex items-center justify-center p-2">
                                {currentLogoUrl && !logoError ? (
                                    <img
                                        src={currentLogoUrl}
                                        alt={profile.name}
                                        className="w-full h-full object-contain"
                                        onError={() => setLogoError(true)}
                                    />
                                ) : (
                                    <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-[#1E6FD9] to-[#0E9E8F] text-white font-black text-3xl flex items-center justify-center shadow-inner">
                                        {clinicInitial}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex-1 space-y-3 text-center sm:text-left">
                            <div>
                                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                    {currentLogoUrl && !logoError ? 'Custom logo active' : 'Default initials active'}
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    PNG, JPG, or WEBP up to 5MB. We crop to a clean square and generate dark/light variations automatically.
                                </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setIsUploaderOpen(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#1E6FD9] hover:bg-blue-600 active:scale-95 text-white shadow-md shadow-[#1E6FD9]/20 transition-all cursor-pointer"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>{currentLogoUrl ? 'Replace logo' : 'Upload logo'}</span>
                                </button>

                                {currentLogoUrl && (
                                    <button
                                        type="button"
                                        onClick={handleDeleteLogo}
                                        disabled={isDeleting}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Remove</span>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
                        <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Automatic generation guidelines
                        </h4>
                        <ul className="text-xs text-slate-500 dark:text-slate-400 space-y-1.5 list-disc pl-5">
                            <li><strong>Sidebar rail (32px / 40px):</strong> Placed next to your clinic workspace title on desktop and mobile drawer.</li>
                            <li><strong>80mm thermal receipts:</strong> Formatted cleanly at the top of patient token slips.</li>
                            <li><strong>Browser favicon (32px):</strong> Displayed on browser tabs for patients and staff.</li>
                        </ul>
                    </div>
                </div>

                <ImageUploaderModal
                    isOpen={isUploaderOpen}
                    onClose={() => setIsUploaderOpen(false)}
                    type="logo"
                    currentImageUrl={currentLogoUrl}
                    uploadEndpoint="/settings/branding/logo"
                    deleteEndpoint="/settings/branding/logo"
                    title="Upload clinic logo"
                    subtitle="Square 1:1 format recommended. Cropping and live preview included."
                    clinicName={profile.name}
                    fallbackInitial={profile.name ? profile.name.charAt(0) : 'C'}
                    onSuccess={handleLogoSuccess}
                    onRemove={handleDeleteLogo}
                />
            </div>

            {/* Live Preview Column */}
            <div className="lg:col-span-5 space-y-4">
                <LivePreviewPanel
                    title="Logo in practice"
                    subtitle="Multi-surface display preview across MedVisit"
                >
                    <div className="space-y-4">
                        {/* 1. Sidebar Top Bar Preview */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 space-y-2">
                            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
                                1. Sidebar header (40px)
                            </span>
                            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/5 shadow-xs">
                                <div className="w-10 h-10 rounded-xl overflow-hidden bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 flex items-center justify-center p-1 shrink-0">
                                    {currentLogoUrl && !logoError ? (
                                        <img src={currentLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                                    ) : (
                                        <div className="w-full h-full rounded-lg bg-gradient-to-tr from-[#1E6FD9] to-[#0E9E8F] text-white font-bold text-sm flex items-center justify-center">
                                            {clinicInitial}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-800 dark:text-white truncate">
                                        {profile.name}
                                    </div>
                                    <div className="text-[10px] text-primary font-medium">View public site</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. 80mm Slip Header Preview */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 space-y-2">
                            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
                                2. Thermal slip header (compact)
                            </span>
                            <div className="p-3 rounded-xl bg-white text-slate-900 border border-dashed border-slate-300 shadow-xs font-mono text-center space-y-1">
                                {currentLogoUrl && !logoError ? (
                                    <img src={currentLogoUrl} alt="Logo" className="w-7 h-7 object-contain mx-auto" />
                                ) : (
                                    <div className="w-6 h-6 rounded bg-slate-900 text-white font-black text-xs mx-auto flex items-center justify-center">
                                        {clinicInitial}
                                    </div>
                                )}
                                <div className="text-[11px] font-black uppercase tracking-wider">{profile.name}</div>
                            </div>
                        </div>

                        {/* 3. Browser Tab / Favicon Preview */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 space-y-2">
                            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block">
                                3. Browser tab favicon
                            </span>
                            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium max-w-[200px] shadow-inner">
                                <div className="w-4 h-4 rounded overflow-hidden bg-white flex items-center justify-center shrink-0">
                                    {currentLogoUrl && !logoError ? (
                                        <img src={currentLogoUrl} alt="Favicon" className="w-full h-full object-contain" />
                                    ) : (
                                        <span className="text-[9px] font-black text-[#1E6FD9]">{clinicInitial}</span>
                                    )}
                                </div>
                                <span className="truncate text-[11px]">{profile.name}</span>
                            </div>
                        </div>
                    </div>
                </LivePreviewPanel>
            </div>
        </div>
    );
}
