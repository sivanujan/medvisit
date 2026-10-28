import React, { useState, useTransition } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import {
    Plus,
    FileText,
    Pill,
    Users,
    User,
    Search,
    X,
    LayoutGrid,
    LayoutList,
    MoreVertical,
    Copy,
    Share2,
    Trash2,
    Edit3,
    Clock,
    Sparkles,
    ArrowRight,
    CheckCircle2,
    Layers,
    History,
} from 'lucide-react';
import GlassSelect from '@/Components/UI/GlassSelect';
import { getDoctorColor } from '@/Utils/doctorColors';
import {
    TemplateBuilderModal,
    TemplateFormData,
    TemplateBuilderItem,
} from './Components/TemplateBuilderModal';
import {
    PastPrescriptionsPickerModal,
    RecentPrescription,
} from './Components/PastPrescriptionsPickerModal';

export interface TemplateItem {
    id: number;
    clinic_medicine_id?: number | null;
    medicine_variant_id?: number | null;
    display_name: string;
    generic_name?: string | null;
    brand_name?: string | null;
    strength_text?: string | null;
    dosage_form: string;
    dose: string;
    frequency: string;
    frequency_text?: string | null;
    timing: string;
    route: string;
    duration_days: number;
    quantity: number;
    instructions?: string | null;
    source: string;
}

export interface TemplateRecord {
    id: number;
    name: string;
    description?: string | null;
    condition_tags: string[];
    is_shared: boolean;
    doctor_id?: number | null;
    doctor_name: string;
    doctor_avatar_id: number;
    usage_count: number;
    last_used_at?: string | null;
    last_used_formatted: string;
    items_count: number;
    can_edit: boolean;
    can_delete: boolean;
    can_share: boolean;
    items: TemplateItem[];
}

interface Props {
    templates: TemplateRecord[];
    filters: {
        tab: 'all' | 'personal' | 'shared';
        search: string;
        sort: 'most_used' | 'recently_used' | 'name_asc';
    };
    counts: {
        total: number;
        personal: number;
        shared: number;
    };
    can_manage_shared: boolean;
    current_doctor_name: string;
    clinic_name: string;
    recent_prescriptions: RecentPrescription[];
    translations: {
        en: Record<string, any>;
        ta: Record<string, any>;
        si: Record<string, any>;
    };
}

const SORT_OPTIONS = [
    { value: 'most_used', label: 'Most used' },
    { value: 'recently_used', label: 'Recently used' },
    { value: 'name_asc', label: 'Name A–Z' },
];

export default function TemplatesIndex({
    templates,
    filters,
    counts,
    can_manage_shared,
    current_doctor_name,
    clinic_name,
    recent_prescriptions = [],
    translations,
}: Props) {
    const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedTab, setSelectedTab] = useState<'all' | 'personal' | 'shared'>(filters.tab || 'all');
    const [selectedSort, setSelectedSort] = useState(filters.sort || 'most_used');

    // Modals
    const [isBuilderOpen, setIsBuilderOpen] = useState(false);
    const [builderInitialData, setBuilderInitialData] = useState<TemplateFormData | null>(null);
    const [isPastPickerOpen, setIsPastPickerOpen] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateQuery = (newParams: Record<string, any>) => {
        const merged: Record<string, any> = {
            tab: selectedTab,
            search: searchQuery,
            sort: selectedSort,
            ...newParams,
        };

        // Clean up defaults
        if (!merged.search) delete merged.search;
        if (merged.tab === 'all') delete merged.tab;
        if (merged.sort === 'most_used') delete merged.sort;

        router.get('/doctor/templates', merged, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    const handleTabChange = (tab: 'all' | 'personal' | 'shared') => {
        setSelectedTab(tab);
        updateQuery({ tab });
    };

    const handleSortChange = (sort: string) => {
        setSelectedSort(sort as any);
        updateQuery({ sort });
    };

    const handleSearchChange = (query: string) => {
        setSearchQuery(query);
        updateQuery({ search: query });
    };

    // Open Builder for New Template
    const handleOpenNewBuilder = () => {
        setBuilderInitialData(null);
        setIsBuilderOpen(true);
    };

    // Open Builder for Edit Template
    const handleEditTemplate = (tpl: TemplateRecord) => {
        setActiveMenuId(null);
        setBuilderInitialData({
            id: tpl.id,
            name: tpl.name,
            description: tpl.description || '',
            condition_tags: tpl.condition_tags || [],
            is_shared: tpl.is_shared,
            items: tpl.items.map((it) => ({
                id: it.id,
                clinic_medicine_id: it.clinic_medicine_id,
                medicine_variant_id: it.medicine_variant_id,
                display_name: it.display_name,
                generic_name: it.generic_name,
                brand_name: it.brand_name,
                strength_text: it.strength_text,
                dosage_form: it.dosage_form || 'Tablet',
                dose: it.dose || '1',
                frequency: it.frequency,
                timing: it.timing,
                route: it.route || 'oral',
                duration_days: it.duration_days,
                quantity: it.quantity,
                instructions: it.instructions,
                source: it.source || 'clinic',
            })),
        });
        setIsBuilderOpen(true);
    };

    // Convert past prescription into template builder
    const handleSelectPastPrescription = (rx: RecentPrescription) => {
        setIsPastPickerOpen(false);
        setBuilderInitialData({
            name: `${rx.diagnosis || 'Clinical'} Regimen`,
            description: `Author regimen based on prescription ${rx.prescription_number}`,
            condition_tags: rx.diagnosis ? [rx.diagnosis] : [],
            is_shared: false,
            items: rx.items.map((it) => ({
                clinic_medicine_id: it.clinic_medicine_id,
                medicine_variant_id: it.medicine_variant_id,
                display_name: it.display_name,
                generic_name: it.generic_name,
                brand_name: it.brand_name,
                strength_text: it.strength_text,
                dosage_form: it.dosage_form || 'Tablet',
                dose: it.dose || '1',
                frequency: it.frequency || 'twice_daily',
                timing: it.timing || 'after_meals',
                route: it.route || 'oral',
                duration_days: it.duration_days || 5,
                quantity: it.quantity || 10,
                instructions: it.instructions || '',
                source: it.source || 'clinic',
            })),
        });
        setIsBuilderOpen(true);
    };

    // Save Template (Create or Update)
    const handleSaveTemplate = (formData: TemplateFormData) => {
        setIsSubmitting(true);
        if (formData.id) {
            router.put(`/doctor/templates/${formData.id}`, formData as any, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsBuilderOpen(false);
                    setIsSubmitting(false);
                },
                onError: () => setIsSubmitting(false),
            });
        } else {
            router.post('/doctor/templates', formData as any, {
                preserveScroll: true,
                onSuccess: () => {
                    setIsBuilderOpen(false);
                    setIsSubmitting(false);
                },
                onError: () => setIsSubmitting(false),
            });
        }
    };

    // Duplicate Template
    const handleDuplicateTemplate = (tpl: TemplateRecord) => {
        setActiveMenuId(null);
        router.post(`/doctor/templates/${tpl.id}/duplicate`, {}, {
            preserveScroll: true,
        });
    };

    // Toggle Share Status
    const handleToggleShare = (tpl: TemplateRecord) => {
        setActiveMenuId(null);
        router.post(`/doctor/templates/${tpl.id}/toggle-share`, {}, {
            preserveScroll: true,
        });
    };

    // Delete Template
    const handleDeleteTemplate = (tpl: TemplateRecord) => {
        setActiveMenuId(null);
        if (confirm(`Are you sure you want to delete template "${tpl.name}"? This cannot be undone.`)) {
            router.delete(`/doctor/templates/${tpl.id}`, {
                preserveScroll: true,
            });
        }
    };

    // Helper for compact preview line
    const formatMedicinePreview = (it: TemplateItem) => {
        const parts = [
            it.display_name,
            `${it.dose} ${it.dosage_form.toLowerCase()}`,
            it.frequency_text || it.frequency,
            it.timing.replace('_', ' '),
            it.duration_days ? `${it.duration_days} days` : '',
        ].filter(Boolean);

        return parts.join(' • ');
    };

    return (
        <AuthenticatedLayout>
            <Head title="Prescription templates - MedVisit" />

            <div className="space-y-6">
                {/* Header with Consistent Breadcrumb: Patients > Prescription templates */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <PageHeader
                            breadcrumbs={[
                                { label: 'Patients', href: '/patients' },
                                { label: 'Prescription templates' },
                            ]}
                            title="Prescription templates"
                            subtitle="Save the medicine combinations you prescribe often and apply them in one tap."
                        />
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                        {/* Save from past prescription button */}
                        {recent_prescriptions.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setIsPastPickerOpen(true)}
                                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white/80 dark:bg-slate-800/80 border border-slate-200/80 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-all"
                            >
                                <History className="w-4 h-4 text-primary" />
                                <span>Save from past prescription</span>
                            </button>
                        )}

                        {/* Primary: New template */}
                        <button
                            type="button"
                            onClick={handleOpenNewBuilder}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 transition-all hover:scale-[1.01]"
                        >
                            <Plus className="w-4 h-4" />
                            <span>New template</span>
                        </button>
                    </div>
                </div>

                {/* Toolbar: Tabs, Search, Sort, View Toggle */}
                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        {/* Tabs: All / My templates / Clinic shared */}
                        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 shrink-0 overflow-x-auto">
                            <button
                                type="button"
                                onClick={() => handleTabChange('all')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                    selectedTab === 'all'
                                        ? 'bg-white dark:bg-slate-800 text-primary shadow-xs'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                <span>All</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-white/10">
                                    {counts.total}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleTabChange('personal')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                    selectedTab === 'personal'
                                        ? 'bg-white dark:bg-slate-800 text-primary shadow-xs'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                <span>My templates</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-white/10">
                                    {counts.personal}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => handleTabChange('shared')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                                    selectedTab === 'shared'
                                        ? 'bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-xs'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                <span>Clinic shared</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/70 dark:bg-white/10">
                                    {counts.shared}
                                </span>
                            </button>
                        </div>

                        {/* Search, Sort, View Toggle */}
                        <div className="flex items-center gap-2.5 flex-1 md:justify-end">
                            {/* Search bar */}
                            <div className="relative flex-1 max-w-sm">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                    placeholder="Search by name, tag, or medicine..."
                                    className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                                />
                                {searchQuery && (
                                    <button
                                        type="button"
                                        onClick={() => handleSearchChange('')}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {/* Sort Dropdown */}
                            <div className="w-40 shrink-0">
                                <GlassSelect
                                    value={selectedSort}
                                    onChange={(e) => handleSortChange(e.target.value)}
                                    options={SORT_OPTIONS}
                                />
                            </div>

                            {/* View Switch: Cards vs List */}
                            <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('cards')}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                        viewMode === 'cards'
                                            ? 'bg-white dark:bg-slate-800 text-primary shadow-xs'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    }`}
                                    title="Cards view"
                                    aria-label="Cards view"
                                >
                                    <LayoutGrid className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setViewMode('list')}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                        viewMode === 'list'
                                            ? 'bg-white dark:bg-slate-800 text-primary shadow-xs'
                                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                    }`}
                                    title="List view"
                                    aria-label="List view"
                                >
                                    <LayoutList className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* TEMPLATES LIST / EMPTY STATE */}
                {templates.length === 0 ? (
                    /* EMPTY STATE */
                    <div className="py-12 sm:py-16 px-4 rounded-3xl border border-dashed border-slate-200 dark:border-white/10 bg-white/50 dark:bg-slate-900/40 text-center max-w-3xl mx-auto space-y-6">
                        {/* Prescription Pad Illustration */}
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-primary/10 via-teal-500/10 to-primary/20 dark:from-primary/20 dark:to-teal-500/20 text-primary flex items-center justify-center mx-auto shadow-inner relative">
                            <FileText className="w-10 h-10 text-primary" />
                            <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center shadow-md">
                                ℞
                            </span>
                        </div>

                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                                {searchQuery ? `No templates match "${searchQuery}"` : 'No prescription templates yet'}
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                                Save the standard medicine packs and dosages you prescribe daily. Then apply them in one tap during patient consultations.
                            </p>
                        </div>

                        {/* Two Options */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={handleOpenNewBuilder}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/25 transition-all hover:scale-[1.02]"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Create a template</span>
                            </button>

                            {recent_prescriptions.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setIsPastPickerOpen(true)}
                                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-xs"
                                >
                                    <History className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                    <span>Save from a past prescription</span>
                                </button>
                            )}
                        </div>

                        {/* 3-Step Explainer */}
                        <div className="pt-6 border-t border-slate-200/80 dark:border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
                            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-1">
                                <div className="text-xs font-black text-primary font-mono">01. CREATE</div>
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Pick medicines
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Search clinic stock or catalog and set dose, frequency & timing.
                                </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-1">
                                <div className="text-xs font-black text-teal-600 dark:text-teal-400 font-mono">02. NAME IT</div>
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    Add condition tags
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Tag with diagnoses like "Gastritis" or "Fever" for quick searching.
                                </div>
                            </div>

                            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5 space-y-1">
                                <div className="text-xs font-black text-amber-500 font-mono">03. APPLY</div>
                                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                    One tap in consultation
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Apply full prescription regimens instantly during doctor visits.
                                </div>
                            </div>
                        </div>
                    </div>
                ) : viewMode === 'cards' ? (
                    /* CARDS VIEW (3 per row on desktop) */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {templates.map((tpl) => {
                            const doctorColor = getDoctorColor(tpl.doctor_avatar_id);
                            return (
                                <div
                                    key={tpl.id}
                                    className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xs hover:shadow-lg transition-all flex flex-col justify-between overflow-hidden group hover:border-primary/40"
                                >
                                    {/* Card Header: Title, Tags, Shared Pill & Menu */}
                                    <div className="p-4 sm:p-5 space-y-2.5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-primary transition-colors">
                                                    {tpl.name}
                                                </h3>

                                                {/* Condition Tags */}
                                                {tpl.condition_tags && tpl.condition_tags.length > 0 && (
                                                    <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                                                        {tpl.condition_tags.map((tag, tIdx) => (
                                                            <span
                                                                key={tIdx}
                                                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-primary/10 dark:bg-primary/20 text-primary"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action Menu Toggle */}
                                            <div className="relative shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setActiveMenuId(activeMenuId === tpl.id ? null : tpl.id)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                                                    aria-label="Actions"
                                                >
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>

                                                {/* Dropdown Menu */}
                                                {activeMenuId === tpl.id && (
                                                    <div className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl z-20 p-1 text-xs space-y-0.5">
                                                        {tpl.can_edit && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditTemplate(tpl)}
                                                                className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2 font-medium"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                                                                <span>Edit template</span>
                                                            </button>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={() => handleDuplicateTemplate(tpl)}
                                                            className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2 font-medium"
                                                        >
                                                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                                                            <span>Duplicate</span>
                                                        </button>

                                                        {can_manage_shared && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleShare(tpl)}
                                                                className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 flex items-center gap-2 font-medium"
                                                            >
                                                                <Share2 className="w-3.5 h-3.5 text-teal-500" />
                                                                <span>{tpl.is_shared ? 'Make personal' : 'Share with clinic'}</span>
                                                            </button>
                                                        )}

                                                        {tpl.can_delete && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteTemplate(tpl)}
                                                                className="w-full px-2.5 py-1.5 rounded-lg text-left text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 font-medium"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                <span>Delete</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Owner Avatar + Visibility Pill */}
                                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-white/5 text-xs">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div
                                                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 bg-gradient-to-tr ${doctorColor.gradient}`}
                                                >
                                                    {tpl.doctor_name.charAt(0)}
                                                </div>
                                                <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
                                                    {tpl.doctor_name}
                                                </span>
                                            </div>

                                            {tpl.is_shared ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 shrink-0">
                                                    <Users className="w-3 h-3" />
                                                    <span>Clinic shared</span>
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 shrink-0">
                                                    <User className="w-3 h-3" />
                                                    <span>Personal</span>
                                                </span>
                                            )}
                                        </div>

                                        {/* Medicines Compact Preview (First 3 medicines) */}
                                        <div className="pt-2 space-y-1.5">
                                            {tpl.items.slice(0, 3).map((it, idx) => (
                                                <div
                                                    key={idx}
                                                    className="p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 text-[11px] text-slate-700 dark:text-slate-300 leading-snug flex items-start gap-1.5"
                                                >
                                                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                                                    <span className="truncate">
                                                        {formatMedicinePreview(it)}
                                                    </span>
                                                </div>
                                            ))}

                                            {tpl.items.length > 3 && (
                                                <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 pl-3">
                                                    +{tpl.items.length - 3} more medicines
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Footer: Usage Stats + Edit Trigger */}
                                    <div className="p-3.5 sm:px-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between text-xs">
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-slate-400" />
                                            <span>
                                                Used {tpl.usage_count} {tpl.usage_count === 1 ? 'time' : 'times'} • {tpl.last_used_formatted}
                                            </span>
                                        </div>

                                        {tpl.can_edit && (
                                            <button
                                                type="button"
                                                onClick={() => handleEditTemplate(tpl)}
                                                className="text-primary hover:text-primary-600 font-bold text-xs"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* LIST VIEW */
                    <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                                        <th className="py-3 px-4">Template & Conditions</th>
                                        <th className="py-3 px-4">Visibility & Owner</th>
                                        <th className="py-3 px-4">Medicines summary</th>
                                        <th className="py-3 px-4">Usage stats</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-200">
                                    {templates.map((tpl) => {
                                        const doctorColor = getDoctorColor(tpl.doctor_avatar_id);
                                        return (
                                            <tr key={tpl.id} className="hover:bg-slate-50/60 dark:hover:bg-white/5 transition-colors">
                                                <td className="py-3.5 px-4">
                                                    <div className="font-bold text-slate-900 dark:text-white">
                                                        {tpl.name}
                                                    </div>
                                                    {tpl.condition_tags && tpl.condition_tags.length > 0 && (
                                                        <div className="flex items-center gap-1 flex-wrap mt-1">
                                                            {tpl.condition_tags.map((t, idx) => (
                                                                <span
                                                                    key={idx}
                                                                    className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-primary/10 text-primary"
                                                                >
                                                                    {t}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>

                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] text-white shrink-0 bg-gradient-to-tr ${doctorColor.gradient}`}
                                                        >
                                                            {tpl.doctor_name.charAt(0)}
                                                        </div>
                                                        <span className="font-medium text-slate-700 dark:text-slate-300">
                                                            {tpl.doctor_name}
                                                        </span>
                                                    </div>
                                                    <div className="mt-1">
                                                        {tpl.is_shared ? (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-600 dark:text-teal-400">
                                                                <Users className="w-2.5 h-2.5" />
                                                                <span>Clinic shared</span>
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                                                                <User className="w-2.5 h-2.5" />
                                                                <span>Personal</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <div className="text-xs text-slate-800 dark:text-slate-200 font-medium">
                                                        {tpl.items.length} {tpl.items.length === 1 ? 'medicine' : 'medicines'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xs mt-0.5">
                                                        {tpl.items.map((it) => it.display_name).join(', ')}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 whitespace-nowrap">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200">
                                                        {tpl.usage_count} {tpl.usage_count === 1 ? 'time' : 'times'}
                                                    </div>
                                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                                        {tpl.last_used_formatted}
                                                    </div>
                                                </td>

                                                <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {tpl.can_edit && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditTemplate(tpl)}
                                                                className="px-2.5 py-1 rounded-lg text-primary font-bold hover:bg-primary/10 transition-colors"
                                                            >
                                                                Edit
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDuplicateTemplate(tpl)}
                                                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5"
                                                            title="Duplicate"
                                                        >
                                                            <Copy className="w-3.5 h-3.5" />
                                                        </button>
                                                        {tpl.can_delete && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteTemplate(tpl)}
                                                                className="p-1 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                                                                title="Delete"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* TEMPLATE BUILDER MODAL */}
            <TemplateBuilderModal
                isOpen={isBuilderOpen}
                onClose={() => setIsBuilderOpen(false)}
                onSave={handleSaveTemplate}
                initialData={builderInitialData}
                canManageShared={can_manage_shared}
                currentDoctorName={current_doctor_name}
                clinicName={clinic_name}
                translations={translations}
                isSubmitting={isSubmitting}
            />

            {/* PAST PRESCRIPTIONS PICKER MODAL */}
            <PastPrescriptionsPickerModal
                isOpen={isPastPickerOpen}
                onClose={() => setIsPastPickerOpen(false)}
                recentPrescriptions={recent_prescriptions}
                onSelectPrescription={handleSelectPastPrescription}
            />
        </AuthenticatedLayout>
    );
}
