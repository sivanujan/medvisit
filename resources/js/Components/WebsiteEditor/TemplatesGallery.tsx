import React, { useState, useEffect } from 'react';
import {
    Sparkles,
    Check,
    CheckCircle2,
    Eye,
    Lock,
    Undo2,
    ChevronRight,
    X,
    ChevronLeft,
    Shield,
    Layers,
    Sliders,
    Tag,
    Loader2,
    AlertCircle,
    AlertTriangle,
} from 'lucide-react';

export interface GalleryTemplate {
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
    preview_video_url?: string | null;
    supports: string[];
    is_active: boolean;
    is_free: boolean;
    is_paid: boolean;
    is_pending: boolean;
    is_plan_included: boolean;
    is_applied: boolean;
    can_claim_free: boolean;
    definition?: any;
}

export interface PlanInfo {
    plan: string;
    is_advanced: boolean;
    free_limit: number;
    free_claimed_id: number | null;
    can_claim_free: boolean;
    can_change_free_choice: boolean;
    days_until_can_change: number;
}

export interface GalleryData {
    templates: GalleryTemplate[];
    plan_info: PlanInfo;
    applied_template_id: number | null;
    can_revert: boolean;
}

interface Props {
    onTemplateApplied?: (look: any, sections: any) => void;
}

type FilterKey = 'all' | 'free' | 'premium' | 'purchased';

export default function TemplatesGallery({ onTemplateApplied }: Props) {
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [gallery, setGallery] = useState<GalleryData | null>(null);
    const [filter, setFilter] = useState<FilterKey>('all');
    const [selectedTemplate, setSelectedTemplate] = useState<GalleryTemplate | null>(null);
    const [carouselIdx, setCarouselIdx] = useState(0);
    const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    const fetchGallery = () => {
        setLoading(true);
        fetch('/website/templates', {
            headers: {
                Accept: 'application/json',
            },
        })
            .then((res) => res.json())
            .then((data: GalleryData) => {
                setGallery(data);
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchGallery();
    }, []);

    const handleApply = (template: GalleryTemplate) => {
        if (actionLoading) return;
        setActionLoading(true);
        fetch(`/website/templates/${template.slug}/apply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setActionLoading(false);
                if (data.ok) {
                    alert(data.message || (template.tier === 'premium' ? `⚠️ Notice: "${template.name}" is currently under development. Applied to your website draft for free preview and testing!` : `${template.name} applied to draft!`));
                    if (onTemplateApplied) {
                        onTemplateApplied(data.look, data.sections);
                    }
                    fetchGallery();
                } else {
                    alert(data.message || 'Could not apply template.');
                }
            })
            .catch(() => {
                setActionLoading(false);
                alert('Could not apply template.');
            });
    };

    const handleRevert = () => {
        if (actionLoading) return;
        if (!confirm('Revert your website draft to the previous design snapshot?')) {
            return;
        }
        setActionLoading(true);
        fetch('/website/templates/revert', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setActionLoading(false);
                if (data.ok) {
                    alert(data.message || 'Reverted to previous design!');
                    if (onTemplateApplied) {
                        onTemplateApplied(data.look, data.sections);
                    }
                    fetchGallery();
                } else {
                    alert(data.message || 'Could not revert design.');
                }
            })
            .catch(() => {
                setActionLoading(false);
                alert('Could not revert design.');
            });
    };

    const handleClaimFree = (template: GalleryTemplate) => {
        if (actionLoading) return;
        if (!confirm(`Claim ${template.name} as your 1 free template choice included with your Advanced plan?`)) {
            return;
        }
        setActionLoading(true);
        fetch(`/website/templates/${template.slug}/claim-free`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                setActionLoading(false);
                if (data.ok) {
                    alert(data.message || 'Free template claimed successfully!');
                    fetchGallery();
                } else {
                    alert(data.message || 'Could not claim free template.');
                }
            })
            .catch(() => {
                setActionLoading(false);
                alert('Could not claim free template.');
            });
    };

    const handleStartCheckout = () => {
        if (!selectedTemplate || !termsAccepted) return;
        setActionLoading(true);
        fetch(`/website/templates/${selectedTemplate.slug}/checkout`, {
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
                setActionLoading(false);
                if (data.payment_url) {
                    window.location.href = data.payment_url;
                } else {
                    alert(data.message || 'Unable to start checkout.');
                }
            })
            .catch(() => {
                setActionLoading(false);
                alert('Checkout failed.');
            });
    };

    if (loading) {
        return (
            <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-xs">Loading website templates gallery…</p>
            </div>
        );
    }

    if (!gallery) {
        return (
            <div className="p-6 text-center text-slate-500 text-xs">
                Unable to load templates at this time.
            </div>
        );
    }

    const { templates, plan_info, can_revert, applied_template_id } = gallery;

    const filtered = templates.filter((t) => {
        if (filter === 'free') return t.is_free;
        if (filter === 'premium') return !t.is_free;
        if (filter === 'purchased') return t.is_paid || t.is_plan_included;
        return true;
    });

    const hasAdvancedEntitlement = plan_info.is_advanced || plan_info.free_limit > 0;

    return (
        <div className="space-y-6">
            {/* Templates Under Development Banner */}
            <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-500/10 via-teal-500/5 to-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <span>Templates Under Development — Free Testing</span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-wider">
                                Unlocked
                            </span>
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5">
                            All premium clinic templates are currently available for <strong>free preview, testing, and draft application</strong> without requiring any purchase.
                        </p>
                    </div>
                </div>
                {can_revert && (
                    <button
                        type="button"
                        onClick={handleRevert}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 transition shrink-0"
                    >
                        <Undo2 className="w-3.5 h-3.5 text-primary" />
                        <span>Revert to Previous Design</span>
                    </button>
                )}
            </div>

            {/* Filter Bar & Revert */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80">
                    {[
                        { key: 'all', label: 'All Templates' },
                        { key: 'free', label: 'Free Themes (5)' },
                        { key: 'premium', label: 'Premium Templates (5)' },
                        { key: 'purchased', label: 'My Entitlements' },
                    ].map((btn) => (
                        <button
                            key={btn.key}
                            type="button"
                            onClick={() => setFilter(btn.key as FilterKey)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                                filter === btn.key
                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                            }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {can_revert && !hasAdvancedEntitlement && (
                    <button
                        type="button"
                        onClick={handleRevert}
                        disabled={actionLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        <Undo2 className="w-3.5 h-3.5 text-primary" />
                        <span>Revert to Previous Design</span>
                    </button>
                )}
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filtered.map((t) => {
                    const isApplied = t.is_applied || applied_template_id === t.id;
                    const isUnderDev = !t.is_free && !t.is_paid && !t.is_plan_included;
                    const canUse = true; // All templates unlocked for free testing while under development

                    return (
                        <div
                            key={t.id}
                            className={`group relative rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                                isApplied
                                    ? 'bg-white/95 dark:bg-slate-900/90 border-2 border-primary shadow-lg ring-4 ring-primary/10'
                                    : 'bg-white/80 dark:bg-slate-900/70 border-slate-200/90 dark:border-white/10 hover:border-primary/40 hover:shadow-md'
                            }`}
                        >
                            <div>
                                {/* Header / Tier Badge */}
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                            {t.name}
                                        </h3>
                                        {isApplied && (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-wider">
                                                Applied
                                            </span>
                                        )}
                                    </div>

                                    {t.is_plan_included ? (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                            Plan Included
                                        </span>
                                    ) : t.is_paid ? (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
                                            Purchased
                                        </span>
                                    ) : t.is_free ? (
                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                                            Free
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                                            <span>Under Dev · Free</span>
                                        </span>
                                    )}
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 min-h-[36px] line-clamp-2 mb-2">
                                    {t.tagline || t.description}
                                </p>

                                {isUnderDev && (
                                    <div className="mb-3 text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                                        <AlertTriangle className="w-3 h-3 shrink-0 text-amber-500" />
                                        <span>Under development · Free preview & testing</span>
                                    </div>
                                )}

                                {/* Tags */}
                                {t.tags && t.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {t.tags.slice(0, 3).map((tag, idx) => (
                                            <span
                                                key={idx}
                                                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Actions Footer */}
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                <a
                                    href={`/website/templates/${t.slug}/preview`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                >
                                    <Eye className="w-3.5 h-3.5 text-primary" />
                                    <span>Preview</span>
                                </a>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSelectedTemplate(t);
                                            setCarouselIdx(0);
                                        }}
                                        className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium underline"
                                    >
                                        Details
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleApply(t)}
                                        disabled={actionLoading || isApplied}
                                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                                            isApplied
                                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-default'
                                                : isUnderDev
                                                ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white shadow-xs'
                                                : 'bg-primary text-white hover:bg-primary-600 shadow-xs'
                                        }`}
                                    >
                                        {isApplied ? <Check className="w-3.5 h-3.5" /> : null}
                                        <span>{isApplied ? 'Active' : isUnderDev ? 'Apply (Free Test)' : 'Apply'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Template Detail Drawer / Modal */}
            {selectedTemplate && !checkoutModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-xl font-bold">{selectedTemplate.name}</h3>
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                                        v{selectedTemplate.version}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {selectedTemplate.tagline}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedTemplate(null)}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Image Carousel */}
                        {selectedTemplate.preview_images && selectedTemplate.preview_images.length > 0 && (
                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 aspect-video mb-6">
                                <img
                                    src={selectedTemplate.preview_images[carouselIdx]}
                                    alt={`${selectedTemplate.name} preview`}
                                    className="w-full h-full object-cover"
                                />
                                {selectedTemplate.preview_images.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCarouselIdx((prev) =>
                                                    prev === 0 ? selectedTemplate.preview_images.length - 1 : prev - 1
                                                )
                                            }
                                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setCarouselIdx((prev) =>
                                                    prev === selectedTemplate.preview_images.length - 1 ? 0 : prev + 1
                                                )
                                            }
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition"
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                                            {selectedTemplate.preview_images.map((_, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => setCarouselIdx(i)}
                                                    className={`w-2 h-2 rounded-full transition ${
                                                        carouselIdx === i ? 'bg-white w-4' : 'bg-white/40'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                            {selectedTemplate.description}
                        </p>

                        {/* Features Breakdown */}
                        <div className="rounded-2xl p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2 mb-6">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">What is included:</h4>
                            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-400">
                                <li className="flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5 text-secondary shrink-0" />
                                    <span>Optimized for desktop, tablet, and mobile</span>
                                </li>
                                <li className="flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5 text-secondary shrink-0" />
                                    <span>Tailored medical typography & palettes</span>
                                </li>
                                <li className="flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5 text-secondary shrink-0" />
                                    <span>Live OPD doctor roster & session timetable</span>
                                </li>
                                <li className="flex items-center gap-1.5">
                                    <Check className="w-3.5 h-3.5 text-secondary shrink-0" />
                                    <span>No recurring template charge (one-time fee)</span>
                                </li>
                            </ul>
                        </div>

                        {/* CTA Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <a
                                href={`/website/templates/${selectedTemplate.slug}/preview`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                <Eye className="w-4 h-4 text-primary" />
                                <span>Preview with Clinic Data</span>
                            </a>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        handleApply(selectedTemplate);
                                        setSelectedTemplate(null);
                                    }}
                                    disabled={actionLoading}
                                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md transition"
                                >
                                    <Check className="w-4 h-4" />
                                    <span>Apply to Draft {!selectedTemplate.is_free && !selectedTemplate.is_paid && !selectedTemplate.is_plan_included ? '(Free Dev Test)' : ''}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Checkout & Terms Modal */}
            {checkoutModalOpen && selectedTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">Purchase {selectedTemplate.name}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    One-time payment: {selectedTemplate.price_formatted} (Billed in LKR)
                                </p>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-xs space-y-2 mb-6 border border-slate-200/80 dark:border-slate-700/80">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                                Purchase terms & refund policy:
                            </p>
                            <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 list-disc pl-4">
                                <li>One-time fee: {selectedTemplate.price_formatted}. No recurring template charges.</li>
                                <li>Use while your MedVisit subscription remains active.</li>
                                <li>Full refund within 7 calendar days ONLY if the template has never been published live.</li>
                                <li>Includes all future updates and variants of this template.</li>
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
                                onClick={() => setCheckoutModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleStartCheckout}
                                disabled={!termsAccepted || actionLoading}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-600 transition disabled:opacity-50"
                            >
                                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Proceed to Checkout ({selectedTemplate.price_formatted})</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
