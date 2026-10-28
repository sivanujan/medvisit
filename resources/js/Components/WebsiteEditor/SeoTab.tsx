import React, { useState } from 'react';
import axios from 'axios';
import {
    Search,
    Share2,
    CheckCircle2,
    Loader2,
    RotateCcw,
    Sparkles,
    Image as ImageIcon,
    Save,
    ExternalLink,
} from 'lucide-react';
import { TextField, ImageField } from './Fields';

interface Props {
    seo: {
        title: string;
        description: string;
        default_title: string;
        default_description: string;
        share_image_url: string | null;
        generated_share_image_url: string;
    };
    clinic: {
        name: string;
        display_host: string;
        site_url: string;
    };
}

export default function SeoTab({ seo, clinic }: Props) {
    const [title, setTitle] = useState(seo.title || seo.default_title);
    const [description, setDescription] = useState(seo.description || seo.default_description);
    const [useCustomImage, setUseCustomImage] = useState(!!seo.share_image_url);
    const [shareImageUrl, setShareImageUrl] = useState<string>(seo.share_image_url || '');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeShareImage = useCustomImage && shareImageUrl ? shareImageUrl : seo.generated_share_image_url;

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSaved(false);

        try {
            await axios.put(
                '/website/seo',
                {
                    seo_title: title.trim(),
                    seo_description: description.trim(),
                    share_image_url: useCustomImage && shareImageUrl.trim() ? shareImageUrl.trim() : null,
                },
                { headers: { Accept: 'application/json' } },
            );
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            setError(err?.response?.data?.message || 'Could not save SEO settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="max-w-4xl mx-auto py-6 px-4 sm:px-6 space-y-8 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Search className="h-5 w-5 text-primary" />
                        Search Engine & Social Sharing (SEO)
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Control how your clinic website appears on Google, WhatsApp, Facebook, and Twitter.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {saved && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                            <CheckCircle2 className="h-4 w-4" />
                            Saved successfully
                        </span>
                    )}
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-xs font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-50 transition"
                    >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save SEO settings
                    </button>
                </div>
            </div>

            {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 p-3 text-xs text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            {/* 1. Meta Title & Description */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            1. Search Engine Snippet
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Shown in Google search results and browser title bars.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setTitle(seo.default_title);
                            setDescription(seo.default_description);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-primary transition"
                    >
                        <RotateCcw className="h-3 w-3" />
                        Reset to defaults
                    </button>
                </div>

                <div className="space-y-4">
                    <TextField
                        label="Meta Title"
                        value={title}
                        onChange={setTitle}
                        max={70}
                        placeholder={seo.default_title}
                        hint="Recommended: Under 60 characters for optimal display across mobile and desktop searches."
                    />

                    <TextField
                        label="Meta Description"
                        value={description}
                        onChange={setDescription}
                        max={170}
                        multiline
                        rows={3}
                        placeholder={seo.default_description}
                        hint="A concise summary of your clinic specialties, channeling schedules, and location."
                    />
                </div>

                {/* Live Google Result Preview */}
                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        Live Google search result preview
                    </span>

                    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 sm:p-5 shadow-inner max-w-2xl">
                        <div className="flex items-center gap-2 mb-1.5">
                            <div className="h-4 w-4 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500">
                                G
                            </div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 font-sans truncate">
                                https://{clinic.display_host || 'clinic.medvisit.lk'}
                            </div>
                        </div>

                        <div className="text-base sm:text-lg font-medium text-[#1a0dab] dark:text-[#8ab4f8] hover:underline cursor-pointer leading-snug line-clamp-1">
                            {title || seo.default_title}
                        </div>

                        <p className="text-xs text-[#4d5156] dark:text-[#bdc1c6] mt-1 leading-relaxed line-clamp-2">
                            {description || seo.default_description}
                        </p>
                    </div>
                </div>
            </div>

            {/* 2. Social Sharing & Link Preview Image */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-5">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        2. Social Share Card & OpenGraph Image
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Shown when someone shares your clinic website on WhatsApp, Facebook, iMessage, or Twitter.
                    </p>
                </div>

                {/* Option to use generated vs custom */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setUseCustomImage(false)}
                        className={`rounded-xl border p-4 text-left transition ${
                            !useCustomImage
                                ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                                Automatically generated card
                            </span>
                            {!useCustomImage && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Dynamic high-resolution banner created with your clinic name, brand colors, and verified badge.
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setUseCustomImage(true)}
                        className={`rounded-xl border p-4 text-left transition ${
                            useCustomImage
                                ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <ImageIcon className="h-3.5 w-3.5 text-primary" />
                                Custom uploaded image
                            </span>
                            {useCustomImage && <CheckCircle2 className="h-4 w-4 text-primary" />}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Upload a custom 1200×630 banner photo of your clinic building or consulting team.
                        </p>
                    </button>
                </div>

                {useCustomImage && (
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                        <ImageField
                            label="Custom 1200×630 share image"
                            value={shareImageUrl}
                            onChange={setShareImageUrl}
                            hint="Recommended size: 1200 × 630 pixels (JPG or PNG under 5 MB)."
                        />
                    </div>
                )}

                {/* WhatsApp & Facebook Link Preview Mock */}
                <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                        WhatsApp &amp; Facebook link preview mock
                    </span>

                    <div className="max-w-md rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-md">
                        {/* Image Preview */}
                        <div className="w-full aspect-[1.91/1] bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                            <img
                                src={activeShareImage}
                                alt="Link share preview"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none';
                                }}
                            />
                        </div>

                        {/* Text Preview */}
                        <div className="p-3.5 space-y-1 bg-slate-50 dark:bg-slate-900/90">
                            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                                {clinic.display_host || 'medvisit.lk'}
                            </div>
                            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                                {title || seo.default_title}
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                {description || seo.default_description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    );
}
