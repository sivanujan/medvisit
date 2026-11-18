import React, { useState } from 'react';
import { Link, Head } from '@inertiajs/react';
import {
    Tv,
    Smartphone,
    Calendar,
    Users,
    FileText,
    Receipt,
    Coins,
    Pill,
    Globe,
    ShieldCheck,
    BarChart3,
    MapPin,
    Lock,
    ArrowRight,
    MessageCircle,
    ChevronDown,
    Building2,
    Stethoscope,
    UserCheck,
    Languages,
    Sparkles,
    CheckCircle2,
    Clock,
} from 'lucide-react';
import PublicLegalLayout from '@/Layouts/PublicLegalLayout';

interface Step {
    step: string;
    title: string;
    description: string;
}

interface FeatureItem {
    title: string;
    description: string;
    tier_badge: string;
}

interface AudienceItem {
    role: string;
    description: string;
}

interface FaqItem {
    question: string;
    answer: string;
}

interface FeaturesContent {
    meta?: {
        title?: string;
        description?: string;
    };
    notice?: {
        review_note?: string;
    };
    language_switcher?: {
        en?: string;
        ta?: string;
        si?: string;
    };
    hero?: {
        badge?: string;
        headline?: string;
        subheadline?: string;
        cta_pricing?: string;
        cta_whatsapp?: string;
        cta_prelaunch?: string;
    };
    workflow?: {
        badge?: string;
        title?: string;
        subtitle?: string;
        steps?: Step[];
    };
    features?: {
        badge?: string;
        title?: string;
        subtitle?: string;
        items?: Record<string, FeatureItem>;
    };
    audiences?: {
        badge?: string;
        title?: string;
        subtitle?: string;
        items?: AudienceItem[];
    };
    faq?: {
        badge?: string;
        title?: string;
        subtitle?: string;
        items?: FaqItem[];
    };
    cta?: {
        badge?: string;
        headline?: string;
        subheadline?: string;
        pricing_button?: string;
        whatsapp_button?: string;
    };
}

interface Props {
    currentLocale: 'en' | 'ta' | 'si';
    content: FeaturesContent;
    plans: Record<string, any>;
    prelaunchMode?: boolean;
    whatsapp?: {
        number?: string;
        display?: string;
        e164?: string;
        raw?: string;
        link?: string;
    };
}

export default function Features({
    currentLocale = 'en',
    content,
    plans = {},
    prelaunchMode = false,
    whatsapp,
}: Props) {
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    const whatsappLink = whatsapp?.link || 'https://wa.me/94755745341';
    const whatsappDisplay = whatsapp?.display || '075 574 5341';

    const hero = content.hero || {};
    const workflow = content.workflow || {};
    const featureSections = content.features || {};
    const featureItems = featureSections.items || {};
    const audiences = content.audiences || {};
    const faq = content.faq || {};
    const cta = content.cta || {};

    const toggleFaq = (index: number) => {
        setOpenFaq(openFaq === index ? null : index);
    };

    // Icons mapping for the 13 feature modules
    const featureIcons: Record<string, React.ReactNode> = {
        queue: <Tv className="w-5 h-5 text-[#1E6FD9]" />,
        booking: <Smartphone className="w-5 h-5 text-[#0E9E8F]" />,
        sessions: <Calendar className="w-5 h-5 text-indigo-500" />,
        patients: <Users className="w-5 h-5 text-blue-500" />,
        prescriptions: <FileText className="w-5 h-5 text-emerald-500" />,
        billing: <Receipt className="w-5 h-5 text-teal-600" />,
        payouts: <Coins className="w-5 h-5 text-amber-500" />,
        pharmacy: <Pill className="w-5 h-5 text-rose-500" />,
        website: <Globe className="w-5 h-5 text-cyan-500" />,
        roles: <UserCheck className="w-5 h-5 text-purple-500" />,
        reports: <BarChart3 className="w-5 h-5 text-sky-500" />,
        directory: <MapPin className="w-5 h-5 text-emerald-600" />,
        security: <ShieldCheck className="w-5 h-5 text-teal-500" />,
    };

    // Audience icons
    const audienceIcons = [
        <Building2 key="owner" className="w-6 h-6 text-[#1E6FD9]" />,
        <Stethoscope key="doc" className="w-6 h-6 text-[#0E9E8F]" />,
        <Clock key="rec" className="w-6 h-6 text-indigo-500" />,
        <Pill key="pharm" className="w-6 h-6 text-[#FF7A59]" />,
    ];

    const pageTitle = content.meta?.title || 'What MedVisit Does — Clinic Operating System';
    const pageDescription = content.meta?.description || 'Explore MedVisit clinic software for Sri Lankan medical practices.';

    return (
        <PublicLegalLayout
            title={pageTitle}
            description={pageDescription}
            isWide={true}
        >
            <div className="pt-24 pb-20">
                {/* 1. Top Bar: Language Switcher & Native Review Note */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
                        {/* Language Switcher Pill */}
                        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-white/5 w-fit">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-2 flex items-center gap-1">
                                <Languages className="w-3.5 h-3.5 text-primary" />
                                <span>Language:</span>
                            </span>
                            <Link
                                href="/features"
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    currentLocale === 'en'
                                        ? 'bg-white dark:bg-slate-700 text-primary shadow-xs'
                                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                English
                            </Link>
                            <Link
                                href="/ta/features"
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    currentLocale === 'ta'
                                        ? 'bg-white dark:bg-slate-700 text-primary shadow-xs'
                                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                தமிழ்
                            </Link>
                            <Link
                                href="/si/features"
                                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                                    currentLocale === 'si'
                                        ? 'bg-white dark:bg-slate-700 text-primary shadow-xs'
                                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                සිංහල
                            </Link>
                        </div>

                        {/* Review note */}
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span>{content.notice?.review_note || 'Tamil and Sinhala text to be reviewed by a native speaker'}</span>
                        </div>
                    </div>
                </div>

                {/* 2. Hero Section */}
                <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center pt-6 pb-16 sm:pb-20">
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1E6FD9]/10 dark:bg-[#1E6FD9]/20 border border-[#1E6FD9]/30 text-[#1E6FD9] dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{hero.badge || 'Sri Lankan Healthcare Platform'}</span>
                    </div>

                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15] max-w-4xl mx-auto">
                        {hero.headline || 'Everything your clinic needs, from token to receipt.'}
                    </h1>

                    <p className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
                        {hero.subheadline ||
                            'A complete clinic operating system built for private medical practices in Sri Lanka. Manage live queues on TV and phone, doctor channeling, multilingual electronic prescriptions, counter billing, and pharmacy stock in LKR.'}
                    </p>

                    {prelaunchMode && (
                        <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-semibold">
                            <span>🚀</span>
                            <span>{hero.cta_prelaunch || 'Launching soon — chat with us on WhatsApp for early onboarding.'}</span>
                        </div>
                    )}

                    <div className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-4">
                        <Link
                            href="/pricing"
                            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] text-white font-bold text-sm sm:text-base shadow-lg shadow-primary/25 hover:opacity-95 hover:shadow-xl transition-all"
                        >
                            <span>{hero.cta_pricing || 'View Pricing & Plans'}</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>

                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-300 dark:border-white/10 text-slate-800 dark:text-slate-200 font-bold text-sm sm:text-base hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs"
                        >
                            <MessageCircle className="w-4 h-4 text-emerald-500" />
                            <span>{hero.cta_whatsapp || 'Talk to Us on WhatsApp'}</span>
                        </a>
                    </div>
                </div>

                {/* 3. "How a Clinic Day Works" 5-Step Pipeline */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 border-t border-slate-200/70 dark:border-white/10">
                    <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                            {workflow.badge || 'Clinic Day Workflow'}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                            {workflow.title || 'How a clinic day runs with MedVisit'}
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                            {workflow.subtitle ||
                                'From patient arrival to pharmacy dispensing, every step is connected in one seamless workflow.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
                        {(workflow.steps || []).map((step, idx) => (
                            <div
                                key={idx}
                                className="relative rounded-2xl p-5 bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs hover:border-[#1E6FD9]/40 transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-black text-[#1E6FD9] dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md">
                                            {step.step}
                                        </span>
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                                        {step.title}
                                    </h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 4. Core Capabilities (13 Real Feature Modules) */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-200/70 dark:border-white/10">
                    <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#1E6FD9] dark:text-blue-400">
                            {featureSections.badge || 'Core Capabilities'}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                            {featureSections.title || 'Built for real clinic workflows in Sri Lanka'}
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                            {featureSections.subtitle ||
                                'No bloated corporate software. Every feature is practical, fast, and tested for daily outpatient practice.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.entries(featureItems).map(([key, item]) => (
                            <div
                                key={key}
                                className="group rounded-3xl p-6 bg-white/80 dark:bg-slate-900/70 border border-slate-200/90 dark:border-white/10 backdrop-blur-xl shadow-sm hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200/60 dark:border-white/5">
                                            {featureIcons[key] || <CheckCircle2 className="w-5 h-5 text-primary" />}
                                        </div>
                                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/70 dark:border-white/5">
                                            {item.tier_badge}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                                        {item.title}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 5. "Who It's For" (4 Clinic Personas) */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-200/70 dark:border-white/10">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#FF7A59]">
                            {audiences.badge || 'Clinic Roles'}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                            {audiences.title || 'Designed for your entire clinic team'}
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                            {audiences.subtitle ||
                                'Each member of your medical centre gets dedicated, clutter-free tools tailored to their daily job.'}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {(audiences.items || []).map((item, idx) => (
                            <div
                                key={idx}
                                className="rounded-3xl p-6 bg-white/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/10 backdrop-blur-md shadow-xs flex flex-col justify-between"
                            >
                                <div>
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center mb-4 border border-slate-200/60 dark:border-white/5">
                                        {audienceIcons[idx % audienceIcons.length]}
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                                        {item.role}
                                    </h3>
                                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                        {item.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 6. FAQ Section */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 border-t border-slate-200/70 dark:border-white/10">
                    <div className="text-center max-w-2xl mx-auto mb-12">
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                            {faq.badge || 'Common Questions'}
                        </span>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                            {faq.title || 'Frequently asked questions'}
                        </h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                            {faq.subtitle ||
                                'Everything you need to know about setting up and using MedVisit at your medical practice.'}
                        </p>
                    </div>

                    <div className="space-y-3">
                        {(faq.items || []).map((item, idx) => {
                            const isOpen = openFaq === idx;
                            return (
                                <div
                                    key={idx}
                                    className="rounded-2xl bg-white/80 dark:bg-slate-900/70 border border-slate-200/90 dark:border-white/10 backdrop-blur-md overflow-hidden transition-all"
                                >
                                    <button
                                        type="button"
                                        onClick={() => toggleFaq(idx)}
                                        className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-bold text-sm sm:text-base text-slate-900 dark:text-white hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    >
                                        <span>{item.question}</span>
                                        <ChevronDown
                                            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                                                isOpen ? 'rotate-180 text-primary' : ''
                                            }`}
                                        />
                                    </button>
                                    {isOpen && (
                                        <div className="px-6 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-white/5">
                                            {item.answer}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 7. Final Call to Action */}
                <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10">
                    <div className="rounded-3xl p-8 sm:p-12 bg-gradient-to-br from-[#1E6FD9]/15 via-[#0E9E8F]/10 to-transparent border border-[#1E6FD9]/30 dark:border-white/10 backdrop-blur-xl text-center relative overflow-hidden">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                            <span>{cta.badge || 'Get Started'}</span>
                        </div>
                        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight max-w-2xl mx-auto">
                            {cta.headline || 'Ready to modernize your clinic operations?'}
                        </h2>
                        <p className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
                            {cta.subheadline ||
                                'Join medical practices across Sri Lanka that manage patient queues, prescriptions, and billing seamlessly with MedVisit.'}
                        </p>

                        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                            <a
                                href={whatsappLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-600/25 transition-all"
                            >
                                <MessageCircle className="w-4 h-4" />
                                <span>{cta.whatsapp_button || 'Chat with Us on WhatsApp'}</span>
                            </a>
                            <Link
                                href="/pricing"
                                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-300 dark:border-white/15 text-slate-800 dark:text-slate-200 font-bold text-sm sm:text-base hover:bg-white dark:hover:bg-slate-800 transition-all shadow-xs"
                            >
                                <span>{cta.pricing_button || 'View Pricing & Plans'}</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </PublicLegalLayout>
    );
}
