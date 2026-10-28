import React, { useRef, useState } from 'react';
import {
    Camera,
    Upload,
    Trash2,
    Info,
    ArrowRight,
    ArrowLeft,
    AlertCircle,
    CheckCircle2,
} from 'lucide-react';
import { SetupFormData, SetupTenantInfo } from '../types';

interface Props {
    tenant: SetupTenantInfo;
    form: SetupFormData;
    onChange: <K extends keyof SetupFormData>(field: K, value: SetupFormData[K]) => void;
    onContinue: (skipped?: boolean) => void;
    onBack: () => void;
    saving: boolean;
    errors?: Record<string, string>;
}

export default function StepCoverPhoto({
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

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadError(null);

        try {
            const formData = new FormData();
            formData.append('type', 'cover');
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
                setUploadError(data.message || data.errors?.file?.[0] || 'Failed to upload photo.');
            } else if (data.url) {
                onChange('cover_photo_url', data.url);
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
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6FD9] dark:text-[#5c9df4]">
                        Step 2 of 9
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500">
                        Optional
                    </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                    Clinic cover photo
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                    A welcoming wide photo of your clinic entrance, reception, or consulting room.
                </p>
            </div>

            {/* "What this means" bullet explanation */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                    <Info className="w-4 h-4 text-[#1E6FD9] shrink-0" />
                    <span>How this image is used:</span>
                </div>
                <ul className="text-[11px] text-blue-800/80 dark:text-blue-300/80 space-y-1 list-disc list-inside">
                    <li>Forms the high-resolution hero background of your public website.</li>
                    <li>Featured preview card on the MedVisit Directory (medvisit.lk/find).</li>
                    <li>If skipped, your clinic website uses a clean, elegant brand color gradient.</li>
                </ul>
            </div>

            {/* Photo Upload Area */}
            <div className="space-y-3">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                />

                {form.cover_photo_url ? (
                    <div className="space-y-3">
                        <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 aspect-video max-h-56 w-full shadow-sm group">
                            <img
                                src={form.cover_photo_url}
                                alt="Cover preview"
                                className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-900 shadow-md flex items-center gap-1 cursor-pointer"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Replace photo</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => onChange('cover_photo_url', '')}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 text-white shadow-md flex items-center gap-1 cursor-pointer"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>Remove</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Cover photo uploaded</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => onChange('cover_photo_url', '')}
                                className="text-rose-500 hover:underline cursor-pointer"
                            >
                                Remove photo
                            </button>
                        </div>
                    </div>
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-[#1E6FD9] dark:hover:border-[#5c9df4] bg-slate-50/60 dark:bg-slate-800/20 p-8 text-center cursor-pointer transition-all space-y-3"
                    >
                        <div className="h-12 w-12 rounded-2xl bg-[#1E6FD9]/10 text-[#1E6FD9] dark:text-[#5c9df4] mx-auto flex items-center justify-center shadow-xs">
                            <Camera className="w-6 h-6" />
                        </div>

                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {uploading ? 'Uploading your photo...' : 'Click to upload a clinic photo'}
                            </p>
                            <p className="text-[11px] text-slate-400">
                                16:9 landscape aspect ratio recommended (PNG, JPEG, WebP, max 5MB).
                            </p>
                        </div>
                    </div>
                )}

                {uploadError && (
                    <p className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{uploadError}</span>
                    </p>
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

                <div className="flex items-center gap-2">
                    {!form.cover_photo_url && (
                        <button
                            type="button"
                            onClick={() => onContinue(true)}
                            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                            Skip for now
                        </button>
                    )}

                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => onContinue(false)}
                        className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                        style={{
                            background: `linear-gradient(135deg, #1E6FD9 0%, ${form.brand_color || '#0E9E8F'} 100%)`,
                        }}
                    >
                        <span>{saving ? 'Saving...' : form.cover_photo_url ? 'Save & continue' : 'Continue'}</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
