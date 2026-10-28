import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import {
    Layout,
    Sparkles,
    Edit3,
    Check,
    DollarSign,
    Sliders,
    TrendingUp,
    Shield,
    AlertCircle,
    Download,
    Eye,
} from 'lucide-react';

interface WebsiteTemplateItem {
    id: number;
    slug: string;
    name: string;
    tagline: string;
    description: string;
    tier: 'free' | 'premium';
    price_cents: number;
    is_active: boolean;
    sort_order: number;
    version: string;
    tags: string[];
    purchases_count?: number;
}

interface Props {
    templates: WebsiteTemplateItem[];
    settings: {
        free_templates_included_with_advanced: number;
    };
}

export default function TemplatesIndex({ templates, settings }: Props) {
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<WebsiteTemplateItem | null>(null);

    // Edit state
    const [name, setName] = useState('');
    const [tagline, setTagline] = useState('');
    const [description, setDescription] = useState('');
    const [priceLkr, setPriceLkr] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [sortOrder, setSortOrder] = useState('0');
    const [tagsText, setTagsText] = useState('');

    // Settings state
    const [freeIncluded, setFreeIncluded] = useState(settings.free_templates_included_with_advanced.toString());
    const [settingsSaving, setSettingsSaving] = useState(false);

    // Override State
    const [overrideClinicSubdomain, setOverrideClinicSubdomain] = useState('');
    const [overrideTemplateId, setOverrideTemplateId] = useState(templates[0]?.id?.toString() || '1');
    const [overrideAction, setOverrideAction] = useState<'grant' | 'revoke'>('grant');
    const [overrideReason, setOverrideReason] = useState('');
    const [overrideSubmitting, setOverrideSubmitting] = useState(false);

    const openEdit = (t: WebsiteTemplateItem) => {
        setSelectedTemplate(t);
        setName(t.name);
        setTagline(t.tagline || '');
        setDescription(t.description || '');
        setPriceLkr((t.price_cents / 100).toString());
        setIsActive(t.is_active);
        setSortOrder(t.sort_order.toString());
        setTagsText((t.tags || []).join(', '));
        setEditModalOpen(true);
    };

    const handleSaveTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTemplate) return;

        const priceCents = Math.round(parseFloat(priceLkr || '0') * 100);
        const tags = tagsText
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);

        router.put(
            `/super-admin/templates/${selectedTemplate.id}`,
            {
                name,
                tagline,
                description,
                price_cents: priceCents,
                is_active: isActive,
                sort_order: parseInt(sortOrder, 10) || 0,
                tags,
            },
            {
                onSuccess: () => setEditModalOpen(false),
            }
        );
    };

    const handleSaveSettings = (e: React.FormEvent) => {
        e.preventDefault();
        setSettingsSaving(true);
        router.put(
            '/super-admin/templates/settings',
            {
                free_templates_included_with_advanced: parseInt(freeIncluded, 10) || 0,
            },
            {
                onFinish: () => setSettingsSaving(false),
            }
        );
    };

    const handleOverrideSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!overrideClinicSubdomain.trim() || !overrideReason.trim()) {
            alert('Please specify the clinic subdomain and required justification reason.');
            return;
        }

        setOverrideSubmitting(true);
        router.post(
            `/super-admin/clinics/${overrideClinicSubdomain.trim()}/template-entitlement`,
            {
                template_id: parseInt(overrideTemplateId, 10),
                action: overrideAction,
                reason: overrideReason.trim(),
            },
            {
                onFinish: () => {
                    setOverrideSubmitting(false);
                    setOverrideReason('');
                },
            }
        );
    };

    const premiumCount = templates.filter((t) => t.tier === 'premium').length;
    const freeCount = templates.filter((t) => t.tier === 'free').length;

    return (
        <PlatformLayout>
            <Head title="Website Templates — Super Admin" />

            <div className="space-y-8 max-w-7xl mx-auto py-6">
                <PageHeader
                    title="Website Templates Marketplace"
                    subtitle="Manage animated clinic website designs, per-template LKR pricing, and Advanced plan entitlements."
                    action={
                        <div className="flex items-center gap-3">
                            <Link
                                href="/super-admin/template-sales"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-600 transition"
                            >
                                <TrendingUp className="w-4 h-4" />
                                <span>Sales Report & CSV Export</span>
                            </Link>
                        </div>
                    }
                />

                {/* Top Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between text-slate-500 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Total Templates</span>
                            <Layout className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {templates.length}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Available across all clinics</p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between text-slate-500 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Premium Designs</span>
                            <Sparkles className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {premiumCount}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Default Rs. 3,500 one-time</p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between text-slate-500 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Free Themes</span>
                            <Check className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {freeCount}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Free tier presets</p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between text-slate-500 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Advanced Included</span>
                            <Shield className="w-4 h-4 text-teal-500" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {settings.free_templates_included_with_advanced} free
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Included per Advanced clinic</p>
                    </GlassCard>
                </div>

                {/* Platform Rule Settings Bar */}
                <GlassCard className="p-6">
                    <form onSubmit={handleSaveSettings} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-primary" />
                                <span>Advanced Plan Template Allowance Setting</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Set how many premium templates clinics on the Advanced tier receive free (default: 1, 0 = disabled).
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min="0"
                                max="10"
                                value={freeIncluded}
                                onChange={(e) => setFreeIncluded(e.target.value)}
                                className="w-24 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm font-bold text-center"
                            />
                            <button
                                type="submit"
                                disabled={settingsSaving}
                                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-600 transition disabled:opacity-50"
                            >
                                {settingsSaving ? 'Saving…' : 'Save Setting'}
                            </button>
                        </div>
                    </form>
                </GlassCard>

                {/* Templates Table */}
                <GlassCard className="overflow-hidden">
                    <div className="p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                            Template Catalog & Pricing
                        </h3>
                        <span className="text-xs text-slate-500">
                            Prices stored dynamically in database (No hardcoding)
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="py-3 px-4">Order</th>
                                    <th className="py-3 px-4">Template Name</th>
                                    <th className="py-3 px-4">Slug</th>
                                    <th className="py-3 px-4">Tier</th>
                                    <th className="py-3 px-4">Price (LKR)</th>
                                    <th className="py-3 px-4">Sales / Claims</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                                {templates.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                        <td className="py-3 px-4 font-mono font-bold text-slate-400">
                                            #{t.sort_order}
                                        </td>
                                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                            <div>{t.name}</div>
                                            <div className="text-[11px] font-normal text-slate-500 truncate max-w-xs">
                                                {t.tagline}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 font-mono text-slate-500">{t.slug}</td>
                                        <td className="py-3 px-4">
                                            {t.tier === 'premium' ? (
                                                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase">
                                                    Premium
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-bold uppercase">
                                                    Free
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                            {t.tier === 'free' || t.price_cents === 0
                                                ? 'Free'
                                                : `Rs. ${(t.price_cents / 100).toLocaleString()}`}
                                        </td>
                                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                            {t.purchases_count || 0} active
                                        </td>
                                        <td className="py-3 px-4">
                                            {t.is_active ? (
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase">
                                                    Disabled
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(t)}
                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold transition"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                                <span>Edit</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </GlassCard>

                {/* Per-Clinic Entitlement Override & Audit Log Section */}
                <GlassCard className="p-6">
                    <div className="mb-4">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" />
                            <span>Per-Clinic Entitlement Override & Audit</span>
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Grant or revoke a premium template entitlement for a specific clinic with mandatory justification logging.
                        </p>
                    </div>

                    <form onSubmit={handleOverrideSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Clinic Subdomain
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. suwa-shanthi"
                                value={overrideClinicSubdomain}
                                onChange={(e) => setOverrideClinicSubdomain(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Template
                            </label>
                            <select
                                value={overrideTemplateId}
                                onChange={(e) => setOverrideTemplateId(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                            >
                                {templates.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.name} ({t.slug})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Action
                            </label>
                            <select
                                value={overrideAction}
                                onChange={(e) => setOverrideAction(e.target.value as 'grant' | 'revoke')}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                            >
                                <option value="grant">Grant Entitlement</option>
                                <option value="revoke">Revoke Entitlement</option>
                            </select>
                        </div>

                        <div className="sm:col-span-3">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Justification Reason (Required for Audit Log)
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Promotional pilot for high-volume specialist center"
                                value={overrideReason}
                                onChange={(e) => setOverrideReason(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                required
                            />
                        </div>

                        <div className="sm:col-span-1">
                            <button
                                type="submit"
                                disabled={overrideSubmitting}
                                className="w-full px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50"
                            >
                                {overrideSubmitting ? 'Processing…' : 'Apply Override'}
                            </button>
                        </div>
                    </form>
                </GlassCard>

                {/* Edit Modal */}
                <GlassModal
                    isOpen={editModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    title={`Edit Template: ${selectedTemplate?.name}`}
                >
                    <form onSubmit={handleSaveTemplate} className="space-y-4 text-xs">
                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Tagline
                            </label>
                            <input
                                type="text"
                                value={tagline}
                                onChange={(e) => setTagline(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                required
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Description
                            </label>
                            <textarea
                                rows={3}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Price in LKR (0 for free)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="100"
                                    value={priceLkr}
                                    onChange={(e) => setPriceLkr(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Sort Order
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Tags (comma-separated)
                            </label>
                            <input
                                type="text"
                                value={tagsText}
                                onChange={(e) => setTagsText(e.target.value)}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="is_active"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="rounded border-slate-300 text-primary"
                            />
                            <label htmlFor="is_active" className="font-semibold text-slate-700 dark:text-slate-300">
                                Template Active & Visible in Gallery
                            </label>
                        </div>

                        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setEditModalOpen(false)}
                                className="px-4 py-2 rounded-xl font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-5 py-2 rounded-xl bg-primary text-white font-bold hover:bg-primary-600"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                </GlassModal>
            </div>
        </PlatformLayout>
    );
}
