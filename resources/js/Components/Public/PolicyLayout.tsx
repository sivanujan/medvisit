import React, { useState, useEffect } from 'react';
import { Sparkles, Check, ChevronDown, ListFilter, Clock, Calendar } from 'lucide-react';
import PublicLegalLayout from '@/Layouts/PublicLegalLayout';
import PolicyContactCard from '@/Components/Public/PolicyContactCard';
import { PolicyPageData } from '@/Pages/Public/Legal/data/types';
import { defaultPublicConfig, PublicConfig } from '@/Config/medvisitPublic';

interface Props {
    data: PolicyPageData;
    config?: PublicConfig;
}

export default function PolicyLayout({ data, config = defaultPublicConfig }: Props) {
    const business = config.business || defaultPublicConfig.business;
    const plans = config.plans || defaultPublicConfig.plans;

    const [activeId, setActiveId] = useState<string>(data.sections[0]?.id || '');
    const [mobileTocOpen, setMobileTocOpen] = useState(false);
    const [progress, setProgress] = useState(0);

    // Track scroll progress
    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            if (scrollHeight > 0) {
                const currentProgress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
                setProgress(currentProgress);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // IntersectionObserver for active section highlight in TOC
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries.filter((entry) => entry.isIntersecting);
                if (visibleEntries.length > 0) {
                    // Pick the entry closest to top of viewport
                    const sorted = visibleEntries.sort(
                        (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
                    );
                    setActiveId(sorted[0].target.id);
                }
            },
            {
                rootMargin: '-80px 0px -50% 0px',
                threshold: [0, 0.2, 0.5],
            }
        );

        data.sections.forEach((section) => {
            const el = document.getElementById(section.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [data.sections]);

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setActiveId(id);
            setMobileTocOpen(false);
        }
    };

    return (
        <PublicLegalLayout
            title={data.title}
            description={data.description}
            isWide={true}
            progressPercent={progress}
        >
            {/* Hero Section with Token Motif Background */}
            <header className="relative mb-8 sm:mb-12 overflow-hidden rounded-3xl p-6 sm:p-10 lg:p-12 bg-gradient-to-br from-white/95 via-primary-50/30 to-secondary-50/20 dark:from-slate-900/90 dark:via-primary-950/20 dark:to-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-sm backdrop-blur-xl">
                {/* Large Faded Token Background Watermark */}
                <div
                    aria-hidden="true"
                    className="absolute -right-8 -bottom-10 pointer-events-none select-none opacity-10 dark:opacity-5 text-primary"
                >
                    <svg
                        className="w-72 h-72 sm:w-88 sm:h-88"
                        viewBox="0 0 200 200"
                        fill="currentColor"
                    >
                        <rect x="20" y="30" width="160" height="140" rx="28" stroke="currentColor" strokeWidth="8" fill="none" />
                        <line x1="20" y1="90" x2="180" y2="90" stroke="currentColor" strokeWidth="6" strokeDasharray="10 8" />
                        <circle cx="20" cy="90" r="14" fill="currentColor" />
                        <circle cx="180" cy="90" r="14" fill="currentColor" />
                        <text
                            x="100"
                            y="145"
                            fontSize="36"
                            fontWeight="bold"
                            textAnchor="middle"
                            fontFamily="monospace"
                        >
                            {data.tokenMotif}
                        </text>
                    </svg>
                </div>

                <div className="relative z-10 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-4">
                        <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{data.eyebrow}</span>
                    </div>

                    <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        {data.title}
                    </h1>

                    <div className="mt-4 flex flex-wrap items-center gap-3 sm:gap-5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                            <span>Last updated: {data.lastUpdated}</span>
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                        <span className="inline-flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
                            <span>{data.readingTime}</span>
                        </span>
                        <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                            Token: {data.tokenMotif}
                        </span>
                    </div>
                </div>
            </header>

            {/* Mobile Collapsible "On this page" Dropdown */}
            <div className="lg:hidden mb-6 print:hidden">
                <button
                    type="button"
                    onClick={() => setMobileTocOpen(!mobileTocOpen)}
                    aria-expanded={mobileTocOpen}
                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/90 dark:border-white/10 shadow-xs text-xs font-bold text-slate-800 dark:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                    <span className="flex items-center gap-2">
                        <ListFilter className="w-4 h-4 text-primary" />
                        <span>On this page:</span>
                        <span className="text-primary font-medium truncate max-w-[180px]">
                            {data.sections.find((s) => s.id === activeId)?.title || 'Contents'}
                        </span>
                    </span>
                    <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${mobileTocOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                {mobileTocOpen && (
                    <nav
                        aria-label="Mobile table of contents"
                        className="mt-2 p-3 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200/90 dark:border-white/10 shadow-lg space-y-1 backdrop-blur-md"
                    >
                        {data.sections.map((sec, idx) => {
                            const num = String(idx + 1).padStart(2, '0');
                            const isActive = activeId === sec.id;
                            return (
                                <button
                                    key={sec.id}
                                    type="button"
                                    onClick={() => scrollToSection(sec.id)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                                        isActive
                                            ? 'bg-primary/10 dark:bg-primary/20 text-primary font-bold'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    <span className="font-mono text-[10px] opacity-70">{num}</span>
                                    <span className="truncate">{sec.title}</span>
                                </button>
                            );
                        })}
                    </nav>
                )}
            </div>

            {/* Desktop Two-Column Layout (TOC on Left + Content on Right) */}
            <div className="flex flex-col lg:flex-row items-start gap-8 xl:gap-12">
                {/* Left: Sticky Table of Contents (Desktop >= 1024px) */}
                <aside
                    aria-label="Table of contents"
                    className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-24 self-start max-h-[calc(100vh-7rem)] overflow-y-auto pr-3 print:hidden"
                >
                    <div className="p-5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/10 shadow-xs backdrop-blur-md">
                        <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-200/70 dark:border-slate-800">
                            <ListFilter className="w-4 h-4 text-primary" />
                            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                Table of Contents
                            </h2>
                        </div>

                        <nav className="space-y-1">
                            {data.sections.map((sec, idx) => {
                                const num = String(idx + 1).padStart(2, '0');
                                const isActive = activeId === sec.id;

                                return (
                                    <button
                                        key={sec.id}
                                        type="button"
                                        onClick={() => scrollToSection(sec.id)}
                                        className={`group w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                            isActive
                                                ? 'bg-gradient-to-r from-primary/15 to-secondary/10 dark:from-primary/25 dark:to-secondary/20 text-primary font-bold shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60'
                                        }`}
                                    >
                                        <span
                                            className={`font-mono text-[10px] w-5 h-5 rounded-md flex items-center justify-center font-bold transition-colors ${
                                                isActive
                                                    ? 'bg-primary text-white'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                                            }`}
                                        >
                                            {num}
                                        </span>
                                        <span className="truncate">{sec.title}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Right: Policy Content (Max ~720px) */}
                <main className="w-full lg:max-w-[720px] flex-1 min-w-0">
                    {/* Key Points First Box */}
                    <div className="mb-8 rounded-3xl p-6 sm:p-7 bg-gradient-to-br from-secondary-50/70 via-white to-primary-50/40 dark:from-secondary-950/30 dark:via-slate-900/90 dark:to-primary-950/20 border-2 border-secondary/30 dark:border-secondary/20 shadow-sm backdrop-blur-xl">
                        <div className="flex items-center gap-2.5 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-secondary/15 text-secondary flex items-center justify-center font-bold">
                                <Sparkles className="w-4 h-4" />
                            </div>
                            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                Key Points at a Glance
                            </h2>
                        </div>

                        <ul className="grid grid-cols-1 gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 mt-2">
                            {data.keyPoints.map((point, i) => (
                                <li key={i} className="flex items-start gap-2.5">
                                    <Check className="w-4 h-4 text-secondary shrink-0 mt-0.5" aria-hidden="true" />
                                    <span>{point}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Section Cards with Token Badges beside Heading */}
                    <div className="space-y-6">
                        {data.sections.map((section, idx) => {
                            const tokenNum = String(idx + 1).padStart(2, '0');

                            return (
                                <section
                                    key={section.id}
                                    id={section.id}
                                    className="scroll-mt-24 rounded-2xl sm:rounded-3xl p-6 sm:p-7 bg-white/85 dark:bg-slate-900/75 border border-slate-200/80 dark:border-white/10 shadow-xs hover:shadow-md transition-shadow duration-200 backdrop-blur-md"
                                >
                                    <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                                        {/* Token Chip Badge Beside Heading */}
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary text-white font-mono text-xs font-bold shadow-xs shrink-0 select-none">
                                            {tokenNum}
                                        </span>
                                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                            {section.title}
                                        </h2>
                                    </div>

                                    <div className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                                        {section.render({ business, plans })}
                                    </div>
                                </section>
                            );
                        })}
                    </div>

                    {/* Bottom Contact Card */}
                    <PolicyContactCard business={business} />
                </main>
            </div>
        </PublicLegalLayout>
    );
}
