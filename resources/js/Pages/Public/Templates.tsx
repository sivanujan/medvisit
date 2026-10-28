import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Sparkles,
    ArrowRight,
    Eye,
    Check,
    Shield,
    Layers,
    Sliders,
    Monitor,
    Smartphone,
    Tablet,
    HeartPulse,
    Stethoscope,
    Building2,
} from 'lucide-react';
import PublicLegalLayout from '@/Layouts/PublicLegalLayout';

interface TemplateItem {
    id: number;
    slug: string;
    name: string;
    tagline: string;
    description: string;
    tier: 'free' | 'premium';
    price_cents: number;
    price_formatted: string;
    version: string;
    tags: string[];
    preview_images: string[];
    supports: string[];
    is_free: boolean;
}

interface Props {
    templates: TemplateItem[];
    meta: {
        title: string;
        description: string;
    };
}

type FilterKey = 'all' | 'free' | 'premium';

export default function Templates({ templates, meta }: Props) {
    const [filter, setFilter] = useState<FilterKey>('all');

    const filtered = templates.filter((t) => {
        if (filter === 'free') return t.is_free;
        if (filter === 'premium') return !t.is_free;
        return true;
    });

    return (
        <PublicLegalLayout title={meta.title} description={meta.description} isWide={true}>
            <Head>
                <title>{meta.title}</title>
                <meta name="description" content={meta.description} />
            </Head>

            {/* Hero Section */}
            <div className="relative text-center max-w-4xl mx-auto mb-12 sm:mb-16 pt-4">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary-700 dark:text-primary-300 text-xs font-bold uppercase tracking-wider mb-4">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Clinic Website Templates</span>
                </div>

                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    Designer templates for Sri Lankan clinics
                </h1>

                <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
                    Beautiful, fast, mobile-first websites connected directly to your clinic queue, doctor channeling sessions, and online token booking. Preview free with your real data.
                </p>

                {/* Confirmed Pricing Callout */}
                <div className="mt-6 inline-block max-w-2xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-white to-secondary/10 dark:from-primary-950/40 dark:via-slate-900/60 dark:to-secondary-950/40 border border-primary/20 dark:border-primary/30 text-xs sm:text-sm text-slate-700 dark:text-slate-300 shadow-xs">
                    <strong>Optional premium website templates — one-time Rs. 3,500 each.</strong> Preview free with your clinic's real data. Buy once, use while your MedVisit subscription is active. Advanced plan includes 1 template free.
                </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex justify-center mb-10">
                <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                    <button
                        type="button"
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                            filter === 'all'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                    >
                        All Templates ({templates.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('free')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                            filter === 'free'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                    >
                        Free Themes (5)
                    </button>
                    <button
                        type="button"
                        onClick={() => setFilter('premium')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                            filter === 'premium'
                                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                    >
                        Premium Templates (5)
                    </button>
                </div>
            </div>

            {/* Templates Showcase Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                {filtered.map((t) => (
                    <div
                        key={t.id}
                        className="group relative rounded-3xl overflow-hidden bg-white/80 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/10 hover:border-primary/40 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                    >
                        {/* Preview Image / Visual Mockup */}
                        <div className="relative aspect-video bg-slate-950 overflow-hidden">
                            {t.preview_images && t.preview_images.length > 0 ? (
                                <img
                                    src={t.preview_images[0]}
                                    alt={t.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 text-slate-400">
                                    <Building2 className="w-12 h-12 opacity-30" />
                                </div>
                            )}

                            {/* Badge floating */}
                            <div className="absolute top-3 right-3">
                                {t.is_free ? (
                                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/90 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                                        Free Theme
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/95 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow-md">
                                        <Sparkles className="w-3 h-3 text-slate-950" />
                                        <span>{t.price_formatted}</span>
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 flex-1 flex flex-col justify-between">
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                        {t.name}
                                    </h2>
                                    <span className="text-[10px] font-mono text-slate-400">
                                        v{t.version}
                                    </span>
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                                    {t.tagline || t.description}
                                </p>

                                {t.tags && t.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-6">
                                        {t.tags.map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                                <Link
                                    href={`/templates/${t.slug}/demo-preview`}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                                >
                                    <Eye className="w-3.5 h-3.5 text-primary" />
                                    <span>Interactive Demo</span>
                                </Link>

                                <a
                                    href="/register"
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-600 transition shadow-xs active:scale-95"
                                >
                                    <span>Use Template</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </a>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bottom Callout */}
            <div className="max-w-4xl mx-auto rounded-3xl p-8 bg-gradient-to-r from-primary to-secondary text-white text-center shadow-xl shadow-primary/20 mb-12">
                <h3 className="text-xl sm:text-2xl font-black">
                    Ready to launch your clinic's modern digital presence?
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-white/90 max-w-xl mx-auto">
                    All templates include real-time patient queue displays, doctor channeling schedules, mobile token booking, and Google SEO optimizations.
                </p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <a
                        href="/register"
                        className="px-6 py-2.5 rounded-2xl bg-white text-primary text-xs font-bold shadow-md hover:bg-slate-50 transition"
                    >
                        Start 14-Day Free Trial
                    </a>
                    <Link
                        href="/pricing"
                        className="px-5 py-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition"
                    >
                        View Subscription Plans
                    </Link>
                </div>
            </div>
        </PublicLegalLayout>
    );
}
