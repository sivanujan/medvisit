import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import {
    Layers,
    Plus,
    Check,
    Edit3,
    Trash2,
    Users,
    Info,
    AlertCircle,
    ToggleLeft,
    ToggleRight,
    TrendingUp,
} from 'lucide-react';

interface PlanItem {
    id: number;
    name: string;
    slug: string;
    price_cents: number;
    price_lkr: number;
    billing_interval: string;
    features: string[];
    is_active: boolean;
    active_subscribers_count: number;
    total_subscribers_count: number;
}

interface IndexProps {
    plans: PlanItem[];
}

export default function PlansIndex({ plans }: IndexProps) {
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);

    // Create form state
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [priceLkr, setPriceLkr] = useState('');
    const [interval, setInterval] = useState('month');
    const [featuresText, setFeaturesText] = useState('');

    // Edit form state
    const [editName, setEditName] = useState('');
    const [editPriceLkr, setEditPriceLkr] = useState('');
    const [editFeaturesText, setEditFeaturesText] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        const featuresArray = featuresText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);

        router.post(
            '/super-admin/plans',
            {
                name,
                slug,
                price_lkr: parseFloat(priceLkr) || 0,
                billing_interval: interval,
                features: featuresArray,
            },
            {
                onSuccess: () => {
                    setCreateModalOpen(false);
                    setName('');
                    setSlug('');
                    setPriceLkr('');
                    setFeaturesText('');
                },
            }
        );
    };

    const openEdit = (plan: PlanItem) => {
        setSelectedPlan(plan);
        setEditName(plan.name);
        setEditPriceLkr(String(plan.price_lkr));
        setEditFeaturesText(plan.features?.join('\n') || '');
        setEditModalOpen(true);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlan) return;

        const featuresArray = editFeaturesText
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean);

        router.put(
            `/super-admin/plans/${selectedPlan.id}`,
            {
                name: editName,
                price_lkr: parseFloat(editPriceLkr) || 0,
                features: featuresArray,
            },
            {
                onSuccess: () => {
                    setEditModalOpen(false);
                    setSelectedPlan(null);
                },
            }
        );
    };

    const handleToggleActive = (plan: PlanItem) => {
        router.post(`/super-admin/plans/${plan.id}/toggle-active`);
    };

    const handleDelete = (plan: PlanItem) => {
        if (plan.total_subscribers_count > 0) {
            alert(`Cannot delete plan "${plan.name}" because it has ${plan.total_subscribers_count} subscribers. Please deactivate the plan instead.`);
            return;
        }

        if (confirm(`Delete plan "${plan.name}"?`)) {
            router.delete(`/super-admin/plans/${plan.id}`);
        }
    };

    return (
        <PlatformLayout>
            <Head title="Subscription Plans • MedVisit Platform" />

            <PageHeader
                eyebrow="Commercial Architecture"
                title="Subscription Plans & Tiers"
                subtitle="Configure SaaS subscription plans, pricing intervals, and feature inclusions for Sri Lankan clinics."
                actions={
                    <button
                        type="button"
                        onClick={() => setCreateModalOpen(true)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition shadow-sm shadow-indigo-600/25 cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create New Plan</span>
                    </button>
                }
            />

            {/* Info notice about renewal pricing */}
            <div className="mt-6 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-800 dark:text-indigo-300 flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                    <strong>Price Change Policy:</strong> When updating a plan's price, existing subscribers will retain their current billing rate until their next scheduled renewal. Plans with active or historical subscribers cannot be deleted; toggle them to <strong>Inactive</strong> to hide from new clinic signups.
                </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {plans.map((plan) => (
                    <GlassCard
                        key={plan.id}
                        className={`p-6 flex flex-col justify-between relative transition-all ${
                            !plan.is_active ? 'opacity-65 border-dashed' : ''
                        }`}
                    >
                        <div>
                            {/* Top badge row */}
                            <div className="flex items-center justify-between mb-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    plan.is_active
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-white/10'
                                }`}>
                                    {plan.is_active ? 'Active Tier' : 'Inactive / Grandfathered'}
                                </span>

                                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                                    <Users className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>{plan.active_subscribers_count} active clinics</span>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                {plan.name}
                            </h3>
                            <div className="text-xs font-mono text-slate-400 mt-0.5">
                                slug: {plan.slug}
                            </div>

                            {/* Price */}
                            <div className="mt-4 pb-4 border-b border-slate-100 dark:border-white/5">
                                <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                                    Rs. {plan.price_lkr.toLocaleString()}
                                </span>
                                <span className="text-xs text-slate-400 font-medium ml-1.5">
                                    / {plan.billing_interval}
                                </span>
                            </div>

                            {/* Features list */}
                            <div className="mt-4 space-y-2.5">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    Included Features
                                </div>
                                {plan.features && plan.features.length > 0 ? (
                                    plan.features.map((feat, idx) => (
                                        <div key={idx} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
                                            <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                                                <Check className="w-3 h-3" />
                                            </div>
                                            <span>{feat}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-xs text-slate-400 italic">No feature checklist specified.</div>
                                )}
                            </div>
                        </div>

                        {/* Bottom Actions */}
                        <div className="pt-6 border-t border-slate-100 dark:border-white/5 mt-6 flex items-center justify-between">
                            <button
                                type="button"
                                onClick={() => handleToggleActive(plan)}
                                className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition cursor-pointer flex items-center gap-1.5 ${
                                    plan.is_active
                                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20'
                                        : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20'
                                }`}
                            >
                                {plan.is_active ? 'Deactivate' : 'Activate'}
                            </button>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => openEdit(plan)}
                                    className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                    title="Edit Plan"
                                >
                                    <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleDelete(plan)}
                                    disabled={plan.total_subscribers_count > 0}
                                    className={`p-2 rounded-lg transition ${
                                        plan.total_subscribers_count > 0
                                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                            : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer'
                                    }`}
                                    title={plan.total_subscribers_count > 0 ? 'Cannot delete plan with subscribers' : 'Delete Plan'}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* Create Plan Modal */}
            <GlassModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                title="Create New Subscription Plan"
            >
                <form onSubmit={handleCreate} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Plan Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value);
                                if (!slug) {
                                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                                }
                            }}
                            placeholder="e.g. Enterprise Channeling"
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-900/80"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Unique Slug *
                            </label>
                            <input
                                type="text"
                                required
                                value={slug}
                                onChange={(e) => setSlug(e.target.value.toLowerCase())}
                                placeholder="enterprise-tier"
                                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                Price (LKR) *
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={priceLkr}
                                onChange={(e) => setPriceLkr(e.target.value)}
                                placeholder="10000.00"
                                className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Billing Interval
                        </label>
                        <select
                            value={interval}
                            onChange={(e) => setInterval(e.target.value)}
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-900/80"
                        >
                            <option value="month">Monthly</option>
                            <option value="year">Annual</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Included Features (One per line)
                        </label>
                        <textarea
                            rows={4}
                            value={featuresText}
                            onChange={(e) => setFeaturesText(e.target.value)}
                            placeholder="Unlimited doctors&#10;WhatsApp SMS alerts&#10;Pharmacy POS module..."
                            className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-900/80"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setCreateModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Create Plan
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* Edit Plan Modal */}
            <GlassModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title={`Edit Plan: ${selectedPlan?.name}`}
            >
                <form onSubmit={handleEdit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Plan Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-900/80"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Price (LKR) *
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            value={editPriceLkr}
                            onChange={(e) => setEditPriceLkr(e.target.value)}
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 font-mono"
                        />
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                            Note: Modifying this price applies to upcoming renewal cycles only. Existing active billing periods will not be prorated immediately.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Included Features (One per line)
                        </label>
                        <textarea
                            rows={4}
                            value={editFeaturesText}
                            onChange={(e) => setEditFeaturesText(e.target.value)}
                            className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-900/80"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setEditModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            Save Changes
                        </button>
                    </div>
                </form>
            </GlassModal>
        </PlatformLayout>
    );
}
