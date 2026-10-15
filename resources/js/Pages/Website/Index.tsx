import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import {
    Globe,
    Eye,
    Save,
    ChevronUp,
    ChevronDown,
    CheckCircle2,
    XCircle,
    Smartphone,
    Monitor,
    Sparkles,
    Sliders,
    Layers,
    Share2,
    Calendar,
    Stethoscope,
    Phone,
    MapPin,
    Clock,
} from 'lucide-react';

interface Section {
    id: string;
    name: string;
    enabled: boolean;
    title?: string;
    subtitle?: string;
    description?: string;
    cta_text?: string;
    cta_link?: string;
    badge?: string;
    notice?: string;
    [key: string]: any;
}

interface DoctorPreview {
    id: number;
    name: string;
    specialty: string;
    slmc_number?: string;
}

interface SessionPreview {
    id: number;
    session_date: string;
    start_time: string;
    doctor?: {
        name: string;
        specialty: string;
    };
}

interface Props {
    sections: Section[];
    theme: string;
    isPublished: boolean;
    seo: {
        title: string;
        description: string;
    };
    clinic: {
        name: string;
        subdomain: string;
        phone?: string;
        address?: string;
    };
    doctors: DoctorPreview[];
    upcomingSessions: SessionPreview[];
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function WebsiteIndex({
    sections: initialSections,
    theme: initialTheme,
    isPublished: initialPublished,
    seo: initialSeo,
    clinic,
    doctors,
    upcomingSessions,
}: Props) {
    const [sections, setSections] = useState<Section[]>(initialSections);
    const [selectedTheme, setSelectedTheme] = useState(initialTheme);
    const [seo, setSeo] = useState(initialSeo);
    const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
    const [saving, setSaving] = useState(false);
    const [publishing, setPublishing] = useState(false);

    const themeColors: Record<string, { primary: string; bg: string; label: string }> = {
        'medvisit-teal': { primary: '#0E9E8F', bg: 'from-teal-600 to-cyan-700', label: 'MedVisit Teal (Default)' },
        'ocean-blue': { primary: '#1E6FD9', bg: 'from-blue-600 to-indigo-700', label: 'Ocean Blue' },
        'emerald-health': { primary: '#059669', bg: 'from-emerald-600 to-teal-800', label: 'Emerald Health' },
        'royal-purple': { primary: '#7C3AED', bg: 'from-purple-600 to-indigo-800', label: 'Royal Specialist' },
        'slate-luxury': { primary: '#334155', bg: 'from-slate-700 to-slate-900', label: 'Slate Executive' },
    };

    const toggleSection = (index: number) => {
        const next = [...sections];
        next[index].enabled = !next[index].enabled;
        setSections(next);
    };

    const moveSection = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= sections.length) return;
        const next = [...sections];
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);
        setSections(next);
    };

    const updateSectionField = (index: number, field: string, value: string) => {
        const next = [...sections];
        next[index] = { ...next[index], [field]: value };
        setSections(next);
    };

    const handleSaveSections = (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        router.put(
            '/website/sections',
            { sections },
            {
                onFinish: () => setSaving(false),
            }
        );
    };

    const handleSaveTheme = (e: React.FormEvent) => {
        e.preventDefault();
        router.put(
            '/website/theme',
            {
                theme: selectedTheme,
                seo_title: seo.title,
                seo_description: seo.description,
            },
            {
                preserveScroll: true,
            }
        );
    };

    const handleTogglePublish = (publish: boolean) => {
        setPublishing(true);
        router.post(
            '/website/publish',
            { published: publish },
            {
                onFinish: () => setPublishing(false),
            }
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Clinic Website Builder - MedVisit" />

            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Clinic Workspace', href: '/dashboard' },
                        { label: 'Website & Public Booking' },
                    ]}
                    title="Clinic Website & Public Booking"
                    subtitle="Customize your public patient landing portal, doctor channeling directory, and online token booking."
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <span
                                className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                    initialPublished
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                }`}
                            >
                                {initialPublished ? 'Live & Published' : 'Draft Mode'}
                            </span>

                            <a
                                href="/website/builder"
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 text-white shadow-md shadow-teal-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Visual Page Builder (Elementor)</span>
                            </a>

                            <a
                                href="/"
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-850 text-slate-700 dark:text-slate-200 hover:bg-slate-50 shadow-xs transition-colors"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Open Live Site</span>
                            </a>

                            {initialPublished ? (
                                <button
                                    type="button"
                                    disabled={publishing}
                                    onClick={() => handleTogglePublish(false)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-red-200/80 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 hover:bg-red-100 shadow-xs transition-colors"
                                >
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>Unpublish</span>
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    disabled={publishing}
                                    onClick={() => handleTogglePublish(true)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
                                >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Publish Live</span>
                                </button>
                            )}
                        </div>
                    }
                />

                {/* Banner Introducing Elementor-Style Page Builder */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-transparent border border-teal-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-teal-600/30">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                Elementor-Style Visual Page Builder
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">
                                    New
                                </span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Design full custom clinic landing pages with live drag-and-drop sections, MedVisit live doctors &amp; sessions widgets, responsive desktop/tablet/mobile simulator, revision history, and media library.
                            </p>
                        </div>
                    </div>

                    <a
                        href="/website/builder"
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shrink-0 shadow-sm transition-all"
                    >
                        Launch Visual Builder →
                    </a>
                </div>
                {/* Main 2-Column Grid: Builder on Left, Live Preview on Right */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Left Column: Sections & Controls (5 Cols) */}
                    <div className="xl:col-span-5 space-y-6">
                        {/* Theme Preset & SEO Meta Card */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Theme Preset & Branding
                                </h2>
                            </div>

                            <form onSubmit={handleSaveTheme} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                                        Color Palette
                                    </label>
                                    <div className="grid grid-cols-1 gap-2">
                                        {Object.entries(themeColors).map(([key, item]) => (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => setSelectedTheme(key)}
                                                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
                                                    selectedTheme === key
                                                        ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20 text-primary-900 dark:text-primary-100'
                                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <span
                                                        className={`w-4 h-4 rounded-full bg-gradient-to-tr ${item.bg} shadow-sm`}
                                                    />
                                                    <span>{item.label}</span>
                                                </div>
                                                {selectedTheme === key && (
                                                    <CheckCircle2 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        SEO Page Title
                                    </label>
                                    <input
                                        type="text"
                                        value={seo.title}
                                        onChange={(e) => setSeo({ ...seo, title: e.target.value })}
                                        className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                        placeholder="Clinic Name - Doctor Channeling & Outpatient Care"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Meta Description
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={seo.description}
                                        onChange={(e) => setSeo({ ...seo, description: e.target.value })}
                                        className="w-full text-xs rounded-xl border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                                        placeholder="Book specialist channeling appointments online. Instant digital queue numbers."
                                    />
                                </div>

                                <div className="flex justify-end pt-2">
                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 dark:hover:bg-slate-600"
                                    >
                                        <Save className="w-3.5 h-3.5" />
                                        Save Theme & SEO
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Section Order & Visibility Builder */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                                    <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Section Organizer & Content
                                    </h2>
                                </div>
                                <span className="text-[11px] text-slate-400 font-mono">
                                    {sections.filter((s) => s.enabled).length} Active Sections
                                </span>
                            </div>

                            <div className="space-y-3">
                                {sections.map((section, idx) => (
                                    <div
                                        key={section.id}
                                        className={`p-3 rounded-xl border transition-all ${
                                            section.enabled
                                                ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850'
                                                : 'border-dashed border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 opacity-60'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <input
                                                    type="checkbox"
                                                    checked={section.enabled}
                                                    onChange={() => toggleSection(idx)}
                                                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                                    {section.name}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    disabled={idx === 0}
                                                    onClick={() => moveSection(idx, 'up')}
                                                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                                                    title="Move Up"
                                                >
                                                    <ChevronUp className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={idx === sections.length - 1}
                                                    onClick={() => moveSection(idx, 'down')}
                                                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                                                    title="Move Down"
                                                >
                                                    <ChevronDown className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Inline inputs for key text fields */}
                                        {section.enabled && (
                                            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                                {section.title !== undefined && (
                                                    <div>
                                                        <label className="text-[10px] uppercase font-bold text-slate-400">
                                                            Headline
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={section.title}
                                                            onChange={(e) =>
                                                                updateSectionField(idx, 'title', e.target.value)
                                                            }
                                                            className="w-full text-xs py-1 px-2 rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                                        />
                                                    </div>
                                                )}
                                                {section.subtitle !== undefined && (
                                                    <div>
                                                        <label className="text-[10px] uppercase font-bold text-slate-400">
                                                            Subheadline
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={section.subtitle}
                                                            onChange={(e) =>
                                                                updateSectionField(idx, 'subtitle', e.target.value)
                                                            }
                                                            className="w-full text-xs py-1 px-2 rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                type="button"
                                disabled={saving}
                                onClick={handleSaveSections}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-semibold text-xs shadow-md shadow-primary-600/30"
                            >
                                <Save className="w-3.5 h-3.5" />
                                {saving ? 'Saving...' : 'Save Website Sections Layout'}
                            </button>
                        </div>
                    </div>

                    {/* Right Column: Live Interactive Preview Frame (7 Cols) */}
                    <div className="xl:col-span-7 space-y-4">
                        {/* Device Frame Bar */}
                        <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm">
                            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <Monitor className="w-4 h-4 text-slate-400" />
                                <span>Live Responsive Preview</span>
                            </div>

                            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('desktop')}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                        previewDevice === 'desktop'
                                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <Monitor className="w-3.5 h-3.5" />
                                    Desktop
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewDevice('mobile')}
                                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                        previewDevice === 'mobile'
                                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    <Smartphone className="w-3.5 h-3.5" />
                                    Mobile
                                </button>
                            </div>
                        </div>

                        {/* Preview Frame Wrapper */}
                        <div className="flex justify-center bg-slate-100 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 min-h-[700px] overflow-hidden">
                            <div
                                className={`transition-all duration-300 bg-white text-slate-900 rounded-2xl shadow-xl overflow-hidden border border-slate-300 flex flex-col ${
                                    previewDevice === 'mobile'
                                        ? 'w-[375px] max-w-full rounded-[32px] border-4 border-slate-800'
                                        : 'w-full'
                                }`}
                            >
                                {/* Browser mock titlebar */}
                                <div className="h-8 bg-slate-100 border-b border-slate-200 px-3 flex items-center gap-2 shrink-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono mx-auto">
                                        https://{clinic.subdomain}.medvisit.lk
                                    </span>
                                </div>

                                {/* Simulated Clinic Website Content */}
                                <div className="overflow-y-auto max-h-[650px] p-4 space-y-6">
                                    {/* Mock Navigation */}
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                                                {clinic.name.charAt(0)}
                                            </div>
                                            <span className="font-bold text-xs text-slate-900 truncate">
                                                {clinic.name}
                                            </span>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-lg bg-teal-600 text-white text-[10px] font-bold">
                                            Book Token
                                        </span>
                                    </div>

                                    {/* Render enabled sections */}
                                    {sections
                                        .filter((s) => s.enabled)
                                        .map((s) => {
                                            if (s.id === 'hero') {
                                                return (
                                                    <div
                                                        key="hero"
                                                        className="p-5 rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 text-center space-y-2"
                                                    >
                                                        <span className="inline-block px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
                                                            {s.badge || 'Open Daily'}
                                                        </span>
                                                        <h3 className="text-sm font-extrabold text-slate-900">
                                                            {s.title}
                                                        </h3>
                                                        <p className="text-[11px] text-slate-600 line-clamp-2">
                                                            {s.subtitle}
                                                        </p>
                                                        <div className="pt-2">
                                                            <span className="inline-block px-4 py-1.5 rounded-xl bg-teal-600 text-white text-[11px] font-bold shadow-sm">
                                                                {s.cta_text || 'Book Appointment Online'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            if (s.id === 'about') {
                                                return (
                                                    <div key="about" className="space-y-2 p-3 bg-slate-50 rounded-xl">
                                                        <h4 className="text-xs font-bold text-slate-900">{s.title}</h4>
                                                        <p className="text-[10px] text-slate-600">{s.description}</p>
                                                        <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                                                            <div className="p-2 bg-white rounded-lg border border-slate-100">
                                                                <div className="font-bold text-teal-700 text-xs">
                                                                    {s.stat_1_number}
                                                                </div>
                                                                <div className="text-[9px] text-slate-500">
                                                                    {s.stat_1_label}
                                                                </div>
                                                            </div>
                                                            <div className="p-2 bg-white rounded-lg border border-slate-100">
                                                                <div className="font-bold text-teal-700 text-xs">
                                                                    {s.stat_2_number}
                                                                </div>
                                                                <div className="text-[9px] text-slate-500">
                                                                    {s.stat_2_label}
                                                                </div>
                                                            </div>
                                                            <div className="p-2 bg-white rounded-lg border border-slate-100">
                                                                <div className="font-bold text-teal-700 text-xs">
                                                                    {s.stat_3_number}
                                                                </div>
                                                                <div className="text-[9px] text-slate-500">
                                                                    {s.stat_3_label}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            if (s.id === 'doctors') {
                                                return (
                                                    <div key="doctors" className="space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <h4 className="text-xs font-bold text-slate-900">{s.title}</h4>
                                                            <span className="text-[10px] text-teal-600 font-semibold">
                                                                {doctors.length} Doctors
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {doctors.slice(0, 4).map((d) => (
                                                                <div
                                                                    key={d.id}
                                                                    className="p-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2"
                                                                >
                                                                    <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-[10px] shrink-0">
                                                                        Dr
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <div className="text-[10px] font-bold text-slate-900 truncate">
                                                                            {d.name}
                                                                        </div>
                                                                        <div className="text-[9px] text-slate-500 truncate">
                                                                            {d.specialty}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            if (s.id === 'sessions') {
                                                return (
                                                    <div key="sessions" className="space-y-2">
                                                        <h4 className="text-xs font-bold text-slate-900">{s.title}</h4>
                                                        <div className="space-y-1.5">
                                                            {upcomingSessions.slice(0, 3).map((sess) => (
                                                                <div
                                                                    key={sess.id}
                                                                    className="p-2 rounded-lg bg-teal-50/50 border border-teal-100 flex items-center justify-between text-[10px]"
                                                                >
                                                                    <div>
                                                                        <span className="font-bold text-slate-900">
                                                                            {sess.doctor?.name || 'Dr. Specialist'}
                                                                        </span>
                                                                        <span className="text-slate-500 ml-1">
                                                                            • {sess.doctor?.specialty}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-teal-700 font-semibold font-mono">
                                                                        {sess.start_time}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div
                                                    key={s.id}
                                                    className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-[10px] text-slate-600"
                                                >
                                                    <span className="font-bold text-slate-800">{s.title || s.name}</span>
                                                    {s.subtitle && <p className="text-[9px] mt-0.5">{s.subtitle}</p>}
                                                </div>
                                            );
                                        })}

                                    {/* Mock Footer */}
                                    <div className="pt-4 border-t border-slate-100 text-center text-[9px] text-slate-400">
                                        Powered by MedVisit Sri Lanka • Channeling Platform
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
