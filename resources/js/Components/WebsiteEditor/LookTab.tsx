import React, { useState } from 'react';
import {
    Palette,
    Upload,
    Check,
    AlertTriangle,
    CheckCircle2,
    Sun,
    Moon,
    Type,
    Sparkles,
    Trash2,
    Info,
    RefreshCw,
} from 'lucide-react';
import { brandTokens, THEME_PRIMARY } from '@/Components/ClinicSite/color';
import type { SiteLook } from '@/Components/ClinicSite/types';
import ImageUploaderModal from '@/Components/Media/ImageUploaderModal';
import TemplatesGallery from './TemplatesGallery';

interface Props {
    look: SiteLook;
    onChange: (updated: SiteLook) => void;
    clinic: {
        name: string;
        logo_url?: string | null;
    };
    onLogoUpdate?: (logoUrl: string | null) => void;
}

const THEMES = [
    {
        key: 'medvisit-teal',
        name: 'MedVisit Teal',
        color: '#0E9E8F',
        bg: 'bg-teal-500',
        gradient: 'from-teal-600 to-cyan-700',
        description: 'Trustworthy & clinical with fresh turquoise accents',
    },
    {
        key: 'ocean-blue',
        name: 'Ocean Blue',
        color: '#1E6FD9',
        bg: 'bg-blue-600',
        gradient: 'from-blue-600 to-indigo-700',
        description: 'Professional medical standard, calm & authoritative',
    },
    {
        key: 'coral-health',
        name: 'Coral Health',
        color: '#FF7A59',
        bg: 'bg-orange-500',
        gradient: 'from-[#FF7A59] to-rose-600',
        description: 'Warm & welcoming care for maternity, pediatric and family health',
    },
    {
        key: 'emerald-health',
        name: 'Emerald Health',
        color: '#059669',
        bg: 'bg-emerald-600',
        gradient: 'from-emerald-600 to-teal-800',
        description: 'Healing & natural vitality for family care and wellness',
    },
    {
        key: 'royal-purple',
        name: 'Royal Purple',
        color: '#7C3AED',
        bg: 'bg-purple-600',
        gradient: 'from-purple-600 to-violet-800',
        description: 'Specialist consultant suites and premium healthcare',
    },
    {
        key: 'slate-luxury',
        name: 'Slate Luxury',
        color: '#334155',
        bg: 'bg-slate-700',
        gradient: 'from-slate-700 to-zinc-900',
        description: 'Minimalist high-contrast aesthetic with sophisticated depth',
    },
];

const HERO_STYLES = [
    { key: 'gradient', label: 'Soft gradient', desc: 'Modern ambient color wash with radial glows' },
    { key: 'photo', label: 'Full photo', desc: 'Dark overlaid hero with high-impact clinic photography' },
    { key: 'split', label: 'Split hero', desc: 'Headline and action on the left with an image banner on the right' },
    { key: 'minimal', label: 'Minimalist', desc: 'Clean typography focus with an underlined headline accent' },
];

const FONTS = [
    { key: 'poppins', label: 'Poppins', desc: 'Modern geometric sans-serif (MedVisit standard)' },
    { key: 'nunito', label: 'Nunito', desc: 'Soft & friendly rounded letterforms' },
    { key: 'serif', label: 'Playfair & Georgia', desc: 'Classic editorial serif with clinical elegance' },
];

export default function LookTab({ look, onChange, clinic, onLogoUpdate }: Props) {
    const [logoModalOpen, setLogoModalOpen] = useState(false);
    const [logoUrl, setLogoUrl] = useState<string | null>(clinic.logo_url ?? null);
    const [activeSubTab, setActiveSubTab] = useState<'templates' | 'customize'>('templates');

    const activePrimary = look.brand_color || THEME_PRIMARY[look.theme] || '#0E9E8F';
    const tokens = brandTokens(activePrimary, look.mode);

    const updateLook = (partial: Partial<SiteLook>) => {
        onChange({ ...look, ...partial });
    };

    return (
        <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 space-y-6 animate-in fade-in duration-200">
            {/* Header & Sub-Tab Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-4">
                <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <Palette className="h-5 w-5 text-primary" />
                        Website Design & Templates
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Select an animated premium website template or customize your theme colors, fonts, and clinic emblem.
                    </p>
                </div>

                <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('templates')}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                            activeSubTab === 'templates'
                                ? 'bg-white dark:bg-slate-900 text-primary dark:text-teal-300 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Templates Gallery</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSubTab('customize')}
                        className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                            activeSubTab === 'customize'
                                ? 'bg-white dark:bg-slate-900 text-primary dark:text-teal-300 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                        }`}
                    >
                        <Palette className="w-3.5 h-3.5" />
                        <span>Theme Presets & Styles</span>
                    </button>
                </div>
            </div>

            {/* TAB 1: Templates Marketplace */}
            {activeSubTab === 'templates' && (
                <TemplatesGallery
                    onTemplateApplied={(newLook) => {
                        if (newLook) onChange(newLook);
                    }}
                />
            )}

            {/* TAB 2: Theme Presets & Detailed Customization */}
            {activeSubTab === 'customize' && (
                <div className="space-y-8">

            {/* 1. Theme Presets */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        1. Clinic Theme Presets
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Select a curated medical theme preset tailored for Sri Lankan clinics.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {THEMES.map((theme) => {
                        const isSelected = look.theme === theme.key && !look.brand_color;
                        return (
                            <button
                                key={theme.key}
                                type="button"
                                onClick={() => updateLook({ theme: theme.key, brand_color: null })}
                                className={`group relative rounded-xl border p-4 text-left transition ${
                                    isSelected
                                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div
                                        className="h-7 w-7 rounded-lg shadow-xs flex items-center justify-center text-white"
                                        style={{ backgroundColor: theme.color }}
                                    >
                                        {isSelected && <Check className="h-4 w-4" />}
                                    </div>
                                    <span
                                        className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full"
                                        style={{
                                            backgroundColor: `${theme.color}15`,
                                            color: theme.color,
                                        }}
                                    >
                                        {theme.color}
                                    </span>
                                </div>
                                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                    {theme.name}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                    {theme.description}
                                </p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 2. Custom Brand Colour */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                            2. Custom Brand Color
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Override the preset primary with your clinic's registered brand color.
                        </p>
                    </div>
                    {look.brand_color && (
                        <button
                            type="button"
                            onClick={() => updateLook({ brand_color: null })}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600 transition"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Reset to theme color
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div className="flex items-center gap-3">
                        <input
                            type="color"
                            value={activePrimary}
                            onChange={(e) => updateLook({ brand_color: e.target.value.toUpperCase() })}
                            className="h-12 w-14 cursor-pointer rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent p-1"
                            title="Pick brand color"
                        />
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                                Color Hex Code
                            </label>
                            <input
                                type="text"
                                value={look.brand_color || ''}
                                placeholder={THEME_PRIMARY[look.theme] || '#0E9E8F'}
                                onChange={(e) => {
                                    const val = e.target.value.trim().toUpperCase();
                                    updateLook({ brand_color: val.startsWith('#') ? val : `#${val}` });
                                }}
                                maxLength={7}
                                className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-2 text-xs font-mono uppercase text-slate-900 dark:text-slate-100"
                            />
                        </div>
                    </div>

                    {/* WCAG Contrast check badge */}
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-600 dark:text-slate-400">WCAG Contrast Check</span>
                            {tokens.meetsAA ? (
                                <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Passes AA ({tokens.buttonContrast.toFixed(1)}:1)
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                    Below AA ({tokens.buttonContrast.toFixed(1)}:1)
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <div
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs flex-1 text-center truncate"
                                style={{
                                    backgroundColor: tokens.primary,
                                    color: tokens.onPrimary,
                                }}
                            >
                                Button Label Sample
                            </div>
                        </div>

                        {!tokens.meetsAA && (
                            <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                Low contrast buttons may be difficult for patients with impaired vision to read.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Clinic Logo & Favicon */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        3. Clinic Logo & Favicon
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Your logo is displayed in the navigation header, footer, and automatically generates the browser favicon.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1 flex items-center justify-center overflow-hidden">
                            {logoUrl ? (
                                <img src={logoUrl} alt={clinic.name} className="h-full w-full object-contain" />
                            ) : (
                                <span className="text-lg font-bold text-slate-400">
                                    {clinic.name?.charAt(0) || 'C'}
                                </span>
                            )}
                        </div>
                        <div>
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 block">
                                {logoUrl ? 'Custom clinic logo active' : 'No logo uploaded'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                Square or landscape PNG, JPG, or WebP.
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setLogoModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        >
                            <Upload className="h-3.5 w-3.5 text-primary" />
                            {logoUrl ? 'Change logo' : 'Upload logo'}
                        </button>
                        {logoUrl && (
                            <button
                                type="button"
                                onClick={() => {
                                    setLogoUrl(null);
                                    if (onLogoUpdate) onLogoUpdate(null);
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition"
                                title="Remove logo"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <Info className="h-3.5 w-3.5 text-slate-400" />
                    <span>Your browser tab favicon will automatically sync with this logo.</span>
                </div>
            </div>

            {/* 4. Hero Style & Presentation */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        4. Hero Section Layout
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Choose the layout style of your clinic website's top headline section.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {HERO_STYLES.map((style) => {
                        const isSelected = look.hero_style === style.key;
                        return (
                            <button
                                key={style.key}
                                type="button"
                                onClick={() => updateLook({ hero_style: style.key as any })}
                                className={`rounded-xl border p-3.5 text-left transition ${
                                    isSelected
                                        ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                        {style.label}
                                    </span>
                                    {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">{style.desc}</p>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 5. Typography, Button Shape & Site Mode */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Font */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Typography
                    </h3>
                    <div className="space-y-2">
                        {FONTS.map((font) => (
                            <button
                                key={font.key}
                                type="button"
                                onClick={() => updateLook({ font: font.key as any })}
                                className={`w-full rounded-xl border p-2.5 text-left text-xs transition ${
                                    look.font === font.key
                                        ? 'border-primary bg-primary/5 dark:bg-primary/10 font-bold text-slate-900 dark:text-white'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span>{font.label}</span>
                                    {look.font === font.key && <Check className="h-3 w-3 text-primary" />}
                                </div>
                                <span className="text-[10px] text-slate-400 block mt-0.5">{font.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Button Style */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Button Shape
                    </h3>
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => updateLook({ button_style: 'rounded' })}
                            className={`w-full rounded-xl border p-2.5 text-left text-xs transition ${
                                look.button_style === 'rounded'
                                    ? 'border-primary bg-primary/5 dark:bg-primary/10 font-bold text-slate-900 dark:text-white'
                                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <span>Rounded corners</span>
                                {look.button_style === 'rounded' && <Check className="h-3 w-3 text-primary" />}
                            </div>
                            <div className="h-7 w-20 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-300 font-semibold">
                                Rounded
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => updateLook({ button_style: 'pill' })}
                            className={`w-full rounded-xl border p-2.5 text-left text-xs transition ${
                                look.button_style === 'pill'
                                    ? 'border-primary bg-primary/5 dark:bg-primary/10 font-bold text-slate-900 dark:text-white'
                                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-1.5">
                                <span>Pill shaped</span>
                                {look.button_style === 'pill' && <Check className="h-3 w-3 text-primary" />}
                            </div>
                            <div className="h-7 w-20 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-300 font-semibold">
                                Pill
                            </div>
                        </button>
                    </div>
                </div>

                {/* Site Mode */}
                <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-3">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                        Site Color Mode
                    </h3>
                    <div className="space-y-2">
                        <button
                            type="button"
                            onClick={() => updateLook({ mode: 'light' })}
                            className={`w-full rounded-xl border p-2.5 text-left text-xs transition flex items-center justify-between ${
                                look.mode === 'light'
                                    ? 'border-primary bg-primary/5 dark:bg-primary/10 font-bold text-slate-900 dark:text-white'
                                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Sun className="h-4 w-4 text-amber-500" />
                                <span>Light website</span>
                            </div>
                            {look.mode === 'light' && <Check className="h-3 w-3 text-primary" />}
                        </button>

                        <button
                            type="button"
                            onClick={() => updateLook({ mode: 'dark' })}
                            className={`w-full rounded-xl border p-2.5 text-left text-xs transition flex items-center justify-between ${
                                look.mode === 'dark'
                                    ? 'border-primary bg-primary/5 dark:bg-primary/10 font-bold text-slate-900 dark:text-white'
                                    : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Moon className="h-4 w-4 text-indigo-400" />
                                <span>Dark website</span>
                            </div>
                            {look.mode === 'dark' && <Check className="h-3 w-3 text-primary" />}
                        </button>
                    </div>
                </div>
            </div>
            </div>
            )}

            {/* Logo Uploader Modal */}
            <ImageUploaderModal
                isOpen={logoModalOpen}
                onClose={() => setLogoModalOpen(false)}
                type="logo"
                currentImageUrl={logoUrl}
                uploadEndpoint="/settings/branding/logo"
                deleteEndpoint="/settings/branding/logo"
                title="Clinic Logo & Favicon"
                subtitle="Upload your clinic emblem or crest. Automatically updates header, invoices, and browser favicons."
                clinicName={clinic.name}
                fallbackInitial={clinic.name?.charAt(0) || 'M'}
                onSuccess={(data) => {
                    if (data.logo_url) {
                        setLogoUrl(data.logo_url);
                        if (onLogoUpdate) onLogoUpdate(data.logo_url);
                    }
                }}
                onRemove={() => {
                    setLogoUrl(null);
                    if (onLogoUpdate) onLogoUpdate(null);
                }}
            />
        </div>
    );
}
