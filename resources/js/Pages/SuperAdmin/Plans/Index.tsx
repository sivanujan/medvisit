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
    Shield,
    Tv,
    MessageSquare,
    FileText,
    Building2,
    Lock,
    Eye,
    EyeOff,
} from 'lucide-react';

interface PlanLimits {
    doctors?: number;
    staff?: number;
    tv_screens?: number;
    sms_monthly?: number;
    free_premium_templates?: number;
    [key: string]: any;
}

interface PlanFeatures {
    queue?: boolean;
    sessions?: boolean;
    booking?: boolean;
    prescriptions?: boolean;
    billing?: boolean;
    reports?: boolean;
    tv_multi_room?: boolean;
    pharmacy?: boolean;
    website_basic?: boolean;
    website_builder?: boolean;
    audit_export?: boolean;
    support?: string;
    [key: string]: any;
}

interface PlanItem {
    id: number;
    name: string;
    slug: string;
    price_cents: number;
    price_lkr: number;
    billing_interval: string;
    description?: string | null;
    features: PlanFeatures | string[];
    limits: PlanLimits;
    is_active: boolean;
    is_public: boolean;
    active_subscribers_count: number;
    total_subscribers_count: number;
}

interface IndexProps {
    plans: PlanItem[];
}

export default function PlansIndex({ plans }: IndexProps) {
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PlanItem | null>(null);

    // Edit form state
    const [editName, setEditName] = useState('');
    const [editPriceLkr, setEditPriceLkr] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editIsPublic, setEditIsPublic] = useState(true);

    // Limits state
    const [limitDoctors, setLimitDoctors] = useState<number>(-1);
    const [limitStaff, setLimitStaff] = useState<number>(-1);
    const [limitTvScreens, setLimitTvScreens] = useState<number>(-1);
    const [limitSmsMonthly, setLimitSmsMonthly] = useState<number>(300);
    const [limitFreeTemplates, setLimitFreeTemplates] = useState<number>(0);

    // Feature toggles
    const [featurePharmacy, setFeaturePharmacy] = useState(false);
    const [featureWebsiteBuilder, setFeatureWebsiteBuilder] = useState(false);
    const [featureTvMultiRoom, setFeatureTvMultiRoom] = useState(false);
    const [featureAuditExport, setFeatureAuditExport] = useState(false);
    const [featureSupport, setFeatureSupport] = useState('email');

    const openEdit = (plan: PlanItem) => {
        setSelectedPlan(plan);
        setEditName(plan.name);
        setEditPriceLkr(String(plan.price_lkr));
        setEditDescription(plan.description || '');
        setEditIsPublic(Boolean(plan.is_public));

        const limits = plan.limits || {};
        setLimitDoctors(limits.doctors !== undefined ? limits.doctors : -1);
        setLimitStaff(limits.staff !== undefined ? limits.staff : -1);
        setLimitTvScreens(limits.tv_screens !== undefined ? limits.tv_screens : -1);
        setLimitSmsMonthly(limits.sms_monthly !== undefined ? limits.sms_monthly : 300);
        setLimitFreeTemplates(limits.free_premium_templates !== undefined ? limits.free_premium_templates : 0);

        const feats: any = plan.features || {};
        setFeaturePharmacy(Boolean(feats.pharmacy));
        setFeatureWebsiteBuilder(Boolean(feats.website_builder));
        setFeatureTvMultiRoom(Boolean(feats.tv_multi_room));
        setFeatureAuditExport(Boolean(feats.audit_export));
        setFeatureSupport(typeof feats.support === 'string' ? feats.support : 'email');

        setEditModalOpen(true);
    };

    const handleEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPlan) return;

        const updatedLimits: PlanLimits = {
            doctors: Number(limitDoctors),
            staff: Number(limitStaff),
            tv_screens: Number(limitTvScreens),
            sms_monthly: Number(limitSmsMonthly),
            free_premium_templates: Number(limitFreeTemplates),
        };

        const existingFeats: any = typeof selectedPlan.features === 'object' ? selectedPlan.features : {};
        const updatedFeatures = {
            ...existingFeats,
            queue: true,
            sessions: true,
            booking: true,
            prescriptions: true,
            billing: true,
            reports: true,
            website_basic: true,
            pharmacy: featurePharmacy,
            website_builder: featureWebsiteBuilder,
            tv_multi_room: featureTvMultiRoom,
            audit_export: featureAuditExport,
            support: featureSupport,
        };

        router.put(
            `/super-admin/plans/${selectedPlan.id}`,
            {
                name: editName,
                price_lkr: parseFloat(editPriceLkr) || 0,
                description: editDescription,
                is_public: editIsPublic,
                limits: updatedLimits,
                features: updatedFeatures,
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

    return (
        <PlatformLayout>
            <Head title="Subscription Plans Matrix" />

            <PageHeader
                title="Subscription Plans & Gating Matrix"
                subtitle="Single source of truth for MedVisit tier pricing, resource quotas, and capability entitlements."
                eyebrow="Platform Matrix"
            />

            {/* Info notice about renewal pricing */}
            <div className="mt-6 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-300 flex items-start gap-3">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                    <strong>Single Source of Truth:</strong> Every plan limit and feature check reads directly from this database matrix. Updating a tier immediately updates the gating service for all assigned clinics.
                </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
                {plans.map((plan) => {
                    const limits = plan.limits || {};
                    const feats: any = plan.features || {};

                    return (
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
                                        {plan.is_active ? 'Active Tier' : 'Inactive'}
                                    </span>

                                    {!plan.is_public ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                            <Lock className="w-2.5 h-2.5" />
                                            <span>Super Admin Only</span>
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                            <Eye className="w-2.5 h-2.5" />
                                            <span>Public</span>
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {plan.name}
                                    </h3>
                                    <div className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                                        <Users className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>{plan.active_subscribers_count}</span>
                                    </div>
                                </div>

                                <div className="text-xs font-mono text-slate-400 mt-0.5">
                                    slug: {plan.slug}
                                </div>

                                {plan.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">
                                        {plan.description}
                                    </p>
                                )}

                                {/* Price */}
                                <div className="mt-4 pb-4 border-b border-slate-100 dark:border-white/5">
                                    <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">
                                        Rs. {plan.price_lkr.toLocaleString()}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium ml-1.5">
                                        / {plan.billing_interval}
                                    </span>
                                </div>

                                {/* Limits summary */}
                                <div className="mt-4 space-y-2">
                                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                        Tier Limits
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                                            <span className="text-slate-400 block text-[10px]">Doctors</span>
                                            <strong className="text-slate-700 dark:text-slate-200">
                                                {limits.doctors === -1 || limits.doctors === undefined ? 'Unlimited' : limits.doctors}
                                            </strong>
                                        </div>
                                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                                            <span className="text-slate-400 block text-[10px]">Staff</span>
                                            <strong className="text-slate-700 dark:text-slate-200">
                                                {limits.staff === -1 || limits.staff === undefined ? 'Unlimited' : limits.staff}
                                            </strong>
                                        </div>
                                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                                            <span className="text-slate-400 block text-[10px]">TV Screens</span>
                                            <strong className="text-slate-700 dark:text-slate-200">
                                                {limits.tv_screens === -1 || limits.tv_screens === undefined ? 'Unlimited' : limits.tv_screens}
                                            </strong>
                                        </div>
                                        <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                                            <span className="text-slate-400 block text-[10px]">SMS / Month</span>
                                            <strong className="text-slate-700 dark:text-slate-200">
                                                {limits.sms_monthly ?? 300}
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                {/* Feature entitlements */}
                                <div className="mt-4 space-y-1.5 pt-3 border-t border-slate-100 dark:border-white/5 text-xs">
                                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                        <span>Pharmacy</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${feats.pharmacy ? 'bg-emerald-500/15 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            {feats.pharmacy ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                        <span>Page Builder</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${feats.website_builder ? 'bg-emerald-500/15 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            {feats.website_builder ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                        <span>Multi-room TV</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${feats.tv_multi_room ? 'bg-emerald-500/15 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            {feats.tv_multi_room ? 'Yes' : 'No'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                        <span>Audit Export</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${feats.audit_export ? 'bg-emerald-500/15 text-emerald-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                            {feats.audit_export ? 'Yes' : 'No'}
                                        </span>
                                    </div>
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

                                <button
                                    type="button"
                                    onClick={() => openEdit(plan)}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1E6FD9] hover:bg-[#1557b0] text-white text-xs font-medium transition cursor-pointer shadow-sm"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit Tier</span>
                                </button>
                            </div>
                        </GlassCard>
                    );
                })}
            </div>

            {/* Edit Plan Modal */}
            <GlassModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title={`Edit Plan: ${selectedPlan?.name}`}
            >
                <form onSubmit={handleEdit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
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
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Short Description
                        </label>
                        <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Brief description shown on pricing cards"
                            className="w-full p-2.5 text-xs rounded-xl border border-slate-300 dark:border-white/10 bg-white/80 dark:bg-slate-900/80"
                        />
                    </div>

                    {/* Limits section */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 space-y-3">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                            Resource Limits (-1 = Unlimited)
                        </span>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] text-slate-500 mb-1">Active Doctors</label>
                                <input
                                    type="number"
                                    value={limitDoctors}
                                    onChange={(e) => setLimitDoctors(parseInt(e.target.value, 10))}
                                    className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-slate-500 mb-1">Staff Users</label>
                                <input
                                    type="number"
                                    value={limitStaff}
                                    onChange={(e) => setLimitStaff(parseInt(e.target.value, 10))}
                                    className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-slate-500 mb-1">TV Screens</label>
                                <input
                                    type="number"
                                    value={limitTvScreens}
                                    onChange={(e) => setLimitTvScreens(parseInt(e.target.value, 10))}
                                    className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                                <label className="block text-[11px] text-slate-500 mb-1">SMS Quota / Month</label>
                                <input
                                    type="number"
                                    value={limitSmsMonthly}
                                    onChange={(e) => setLimitSmsMonthly(parseInt(e.target.value, 10))}
                                    className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-slate-500 mb-1">Free Premium Templates</label>
                                <input
                                    type="number"
                                    value={limitFreeTemplates}
                                    onChange={(e) => setLimitFreeTemplates(parseInt(e.target.value, 10))}
                                    className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Feature Toggles */}
                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 space-y-2.5">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">
                            Feature Entitlements
                        </span>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                                <input
                                    type="checkbox"
                                    checked={featurePharmacy}
                                    onChange={(e) => setFeaturePharmacy(e.target.checked)}
                                    className="rounded border-slate-300 text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                />
                                <span className="text-slate-700 dark:text-slate-200">Pharmacy & Dispensing</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                                <input
                                    type="checkbox"
                                    checked={featureWebsiteBuilder}
                                    onChange={(e) => setFeatureWebsiteBuilder(e.target.checked)}
                                    className="rounded border-slate-300 text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                />
                                <span className="text-slate-700 dark:text-slate-200">Visual Page Builder</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                                <input
                                    type="checkbox"
                                    checked={featureTvMultiRoom}
                                    onChange={(e) => setFeatureTvMultiRoom(e.target.checked)}
                                    className="rounded border-slate-300 text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                />
                                <span className="text-slate-700 dark:text-slate-200">TV Multi-Room Filter</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800">
                                <input
                                    type="checkbox"
                                    checked={featureAuditExport}
                                    onChange={(e) => setFeatureAuditExport(e.target.checked)}
                                    className="rounded border-slate-300 text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                />
                                <span className="text-slate-700 dark:text-slate-200">Audit Log CSV Export</span>
                            </label>
                        </div>

                        <div className="pt-2">
                            <label className="block text-[11px] text-slate-500 mb-1">Support Tier</label>
                            <select
                                value={featureSupport}
                                onChange={(e) => setFeatureSupport(e.target.value)}
                                className="w-full p-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                            >
                                <option value="email">Email Support</option>
                                <option value="email_chat">Email + Chat Support</option>
                                <option value="priority">Priority (Email + Chat)</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                            <input
                                type="checkbox"
                                checked={editIsPublic}
                                onChange={(e) => setEditIsPublic(e.target.checked)}
                                className="rounded border-slate-300 text-[#1E6FD9] focus:ring-[#1E6FD9]"
                            />
                            <span className="text-slate-700 dark:text-slate-200 font-medium">
                                Show on public pricing page and signup (Uncheck for internal / complimentary plans)
                            </span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setEditModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#1E6FD9] hover:bg-[#1557b0] transition shadow-sm cursor-pointer"
                        >
                            Save Matrix Changes
                        </button>
                    </div>
                </form>
            </GlassModal>
        </PlatformLayout>
    );
}
