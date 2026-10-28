import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    ArrowLeft,
    Monitor,
    Tablet,
    Smartphone,
    Sparkles,
    Check,
    CheckCircle2,
    Lock,
    ExternalLink,
    Shield,
    Loader2,
    AlertTriangle,
} from 'lucide-react';
import PublicSiteHeader, { HeaderConfig } from '@/Components/Public/PublicSiteHeader';
import PublicSiteFooter, { FooterConfig } from '@/Components/Public/PublicSiteFooter';
import ClinicSiteRenderer, { siteFontsHref } from '@/Components/ClinicSite/ClinicSiteRenderer';
import type {
    SiteClinic,
    SiteDoctor,
    SiteLook,
    SiteSection,
    SiteSession,
    SiteStat,
} from '@/Components/ClinicSite/types';
import type { SiteKit } from '@/Components/PageBuilder/lib/kit';

interface TemplateItem {
    id: number;
    slug: string;
    name: string;
    tagline: string;
    description: string;
    tier: 'free' | 'premium';
    price_cents: number;
    price_formatted: string;
    is_entitled: boolean;
    custom_css?: string;
    animation_preset?: any;
}

interface TemplateStub {
    id: number;
    slug: string;
    name: string;
    tier: string;
    price_cents: number;
}

interface Props {
    template: TemplateItem;
    availableTemplates: TemplateStub[];
    clinic: SiteClinic & { opening_hours?: string | null };
    headerConfig?: HeaderConfig;
    footerConfig?: FooterConfig;
    sections: SiteSection[];
    visibleSectionIds: string[];
    look: SiteLook;
    stats: SiteStat[];
    theme: string;
    doctors: SiteDoctor[];
    upcomingSessions: SiteSession[];
    siteKit?: SiteKit | null;
    seo: { title: string; description: string };
    canClaimFree?: boolean;
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export default function TemplatePreview({
    template,
    availableTemplates,
    clinic,
    headerConfig,
    footerConfig,
    sections,
    visibleSectionIds,
    look,
    stats,
    theme,
    doctors,
    upcomingSessions,
    siteKit,
    seo,
    canClaimFree = false,
}: Props) {
    const [device, setDevice] = useState<DeviceMode>('desktop');
    const [loading, setLoading] = useState(false);
    const [termsModalOpen, setTermsModalOpen] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const fontHref = siteFontsHref(look.font);

    const handleApply = () => {
        if (loading) return;
        setLoading(true);
        fetch(`/website/templates/${template.slug}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setLoading(false);
                if (data.ok) {
                    alert(data.message || (template.tier === 'premium' ? `⚠️ Notice: "${template.name}" is under development. Applied to your website draft for free preview and testing!` : 'Template applied to your website draft!'));
                    window.location.href = '/website';
                } else {
                    alert(data.message || 'Could not apply template.');
                }
            })
            .catch(() => {
                setLoading(false);
                alert('An unexpected error occurred while applying the template.');
            });
    };

    const handleClaimFree = () => {
        if (loading) return;
        if (!confirm(`Claim ${template.name} as your 1 free template choice included with your Advanced plan?`)) {
            return;
        }
        setLoading(true);
        fetch(`/website/templates/${template.slug}/claim-free`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setLoading(false);
                if (data.ok) {
                    alert(data.message || 'Claimed successfully!');
                    window.location.reload();
                } else {
                    alert(data.message || 'Could not claim template.');
                }
            })
            .catch(() => {
                setLoading(false);
                alert('Could not claim template.');
            });
    };

    const handleStartCheckout = () => {
        if (!termsAccepted) {
            alert('Please accept the template purchase terms before proceeding.');
            return;
        }
        setLoading(true);
        fetch(`/website/templates/${template.slug}/checkout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
            body: JSON.stringify({
                terms_accepted: true,
                terms_version: '2026-10-28',
            }),
        })
            .then((res) => res.json())
            .then((data) => {
                setLoading(false);
                if (data.payment_url) {
                    window.location.href = data.payment_url;
                } else {
                    alert(data.message || 'Unable to generate checkout payment session.');
                }
            })
            .catch(() => {
                setLoading(false);
                alert('Payment initiation failed.');
            });
    };

    const deviceWidthClass =
        device === 'mobile'
            ? 'max-w-[390px] my-6 rounded-3xl shadow-2xl border-8 border-slate-900 overflow-hidden'
            : device === 'tablet'
            ? 'max-w-[768px] my-6 rounded-2xl shadow-2xl border-4 border-slate-800 overflow-hidden'
            : 'w-full';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-text">
            <Head>
                <title>{seo.title}</title>
                <meta name="robots" content="noindex, nofollow" />
                {fontHref && <link rel="stylesheet" href={fontHref} />}
                {template.custom_css && <style>{template.custom_css}</style>}
            </Head>

            {/* Top Toolbar */}
            <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
                {/* Left: Back & Template Info */}
                <div className="flex items-center gap-3">
                    <a
                        href="/website"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Editor</span>
                    </a>

                    <div className="h-4 w-px bg-slate-700 hidden sm:block" />

                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                                {template.name}
                            </span>
                            {template.tier === 'premium' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                                    <span>Under Dev · Free Preview</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                                    <span>Free</span>
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-slate-400 hidden md:block">
                            Previewing with your clinic's live data
                        </p>
                    </div>
                </div>

                {/* Center: Device Viewport Switcher & Template Picker */}
                <div className="flex items-center gap-3">
                    {/* Device Buttons */}
                    <div className="inline-flex items-center p-1 rounded-xl bg-slate-800/80 border border-slate-700/80">
                        <button
                            type="button"
                            onClick={() => setDevice('desktop')}
                            title="Desktop View (100%)"
                            className={`p-1.5 rounded-lg text-xs font-medium transition ${
                                device === 'desktop'
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Monitor className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setDevice('tablet')}
                            title="Tablet View (768px)"
                            className={`p-1.5 rounded-lg text-xs font-medium transition ${
                                device === 'tablet'
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Tablet className="w-4 h-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setDevice('mobile')}
                            title="Mobile View (390px)"
                            className={`p-1.5 rounded-lg text-xs font-medium transition ${
                                device === 'mobile'
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            <Smartphone className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Switch Template Dropdown */}
                    <div className="hidden lg:block">
                        <select
                            value={template.slug}
                            onChange={(e) => {
                                window.location.href = `/website/templates/${e.target.value}/preview`;
                            }}
                            className="bg-slate-800 border border-slate-700 text-slate-200 rounded-xl text-xs py-1.5 px-3 focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                            {availableTemplates.map((t) => (
                                <option key={t.id} value={t.slug}>
                                    {t.name} {t.tier === 'premium' ? '(Under Dev · Free)' : '(Free)'}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleApply}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        <span>Apply to Draft</span>
                    </button>
                </div>
            </header>

            {/* Notice Banner */}
            {template.tier === 'premium' && (
                <div className="bg-gradient-to-r from-amber-950/80 via-slate-900/90 to-amber-950/80 border-b border-amber-500/30 text-center py-2.5 px-4 text-xs text-amber-200 flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                        <strong>Notice:</strong> <strong>{template.name}</strong> is currently under development. Available for <strong>free preview, testing, and draft application</strong> without purchase.
                    </span>
                </div>
            )}

            {/* Canvas Preview Container */}
            <main className="flex-1 flex justify-center items-start overflow-x-hidden bg-slate-950 p-0 sm:p-4">
                <div className={`transition-all duration-300 bg-white text-slate-900 ${deviceWidthClass}`}>
                    <PublicSiteHeader
                        clinic={Object.fromEntries(
                            Object.entries(clinic).map(([k, v]) => [k, v === null ? undefined : v])
                        ) as any}
                        headerConfig={headerConfig}
                        themePreset={look.theme || theme}
                    />

                    <ClinicSiteRenderer
                        sections={sections}
                        look={look}
                        stats={stats}
                        clinic={clinic}
                        doctors={doctors}
                        sessions={upcomingSessions}
                        visibleIds={visibleSectionIds}
                        preview={true}
                    />

                    <PublicSiteFooter
                        clinic={Object.fromEntries(
                            Object.entries(clinic).map(([k, v]) => [k, v === null ? undefined : v])
                        ) as any}
                        footerConfig={footerConfig}
                        themePreset={look.theme || theme}
                    />
                </div>
            </main>

            {/* Terms & Checkout Modal */}
            {termsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Purchase {template.name}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    One-time payment: {template.price_formatted} (Billed in LKR)
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-xs space-y-2 mb-6 border border-slate-200/80 dark:border-slate-700/80">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                                What's included:
                            </p>
                            <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 list-disc pl-4">
                                <li>One-time fee: {template.price_formatted}. No recurring template charges.</li>
                                <li>Use while your MedVisit subscription remains active.</li>
                                <li>Full refund within 7 calendar days ONLY if the template has never been published live.</li>
                                <li>Includes all responsive design variants, animations, and color palettes.</li>
                            </ul>
                        </div>

                        <div className="mb-6">
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={termsAccepted}
                                    onChange={(e) => setTermsAccepted(e.target.checked)}
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                    I agree to the{' '}
                                    <a href="/terms" target="_blank" className="text-primary underline font-medium">
                                        Terms & Conditions
                                    </a>{' '}
                                    and{' '}
                                    <a href="/refund-policy" target="_blank" className="text-primary underline font-medium">
                                        Refund Policy
                                    </a>{' '}
                                    (eligible for a full refund within 7 days only if never published live).
                                </span>
                            </label>
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setTermsModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleStartCheckout}
                                disabled={!termsAccepted || loading}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-600 transition disabled:opacity-50"
                            >
                                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Proceed to Checkout ({template.price_formatted})</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
