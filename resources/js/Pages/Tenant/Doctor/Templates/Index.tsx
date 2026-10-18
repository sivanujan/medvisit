import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { EmptyState } from '@/Components/UI/EmptyState';
import {
    ClipboardList,
    Plus,
    Trash2,
    Users,
    User,
    Pill,
    X,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

interface TemplateItem {
    id: number;
    display_name: string;
    dose: string;
    frequency: string;
    timing: string;
    duration_days: number;
    quantity: number;
    instructions?: string;
    source: string;
}

interface TemplateRecord {
    id: number;
    name: string;
    description?: string;
    is_shared: boolean;
    doctor_name: string;
    items_count: number;
    items: TemplateItem[];
}

interface Props {
    templates: TemplateRecord[];
    can_manage_shared: boolean;
}

export default function TemplatesIndex({ templates, can_manage_shared }: Props) {
    const [filter, setFilter] = useState<'all' | 'personal' | 'shared'>('all');
    const [expandedTemplateId, setExpandedTemplateId] = useState<number | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Create Modal Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isShared, setIsShared] = useState(false);
    const [items, setItems] = useState<
        Array<{
            display_name: string;
            dose: string;
            frequency: string;
            timing: string;
            duration_days: number;
            quantity: number;
            instructions?: string;
        }>
    >([
        {
            display_name: '',
            dose: '1',
            frequency: '1-0-1',
            timing: 'after_meals',
            duration_days: 3,
            quantity: 6,
        },
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const filteredTemplates = templates.filter((t) => {
        if (filter === 'personal') return !t.is_shared;
        if (filter === 'shared') return t.is_shared;
        return true;
    });

    const addModalItem = () => {
        setItems([
            ...items,
            {
                display_name: '',
                dose: '1',
                frequency: '1-0-1',
                timing: 'after_meals',
                duration_days: 3,
                quantity: 6,
            },
        ]);
    };

    const removeModalItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const updateModalItem = (index: number, field: string, val: any) => {
        const next = [...items];
        next[index] = { ...next[index], [field]: val };
        setItems(next);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        const validItems = items.filter((it) => it.display_name.trim().length > 0);
        if (validItems.length === 0) {
            alert('Please add at least one medicine item with a name.');
            return;
        }

        setIsSubmitting(true);
        router.post(
            '/doctor/templates',
            {
                name: name.trim(),
                description: description.trim() || null,
                is_shared: isShared,
                items: validItems.map((it) => ({
                    display_name: it.display_name,
                    source: 'clinic',
                    dose: it.dose,
                    frequency: it.frequency,
                    timing: it.timing,
                    duration_days: Number(it.duration_days) || 3,
                    quantity: Number(it.quantity) || 1,
                    instructions: it.instructions || null,
                })),
            },
            {
                onSuccess: () => {
                    setShowCreateModal(false);
                    setName('');
                    setDescription('');
                    setItems([
                        {
                            display_name: '',
                            dose: '1',
                            frequency: '1-0-1',
                            timing: 'after_meals',
                            duration_days: 3,
                            quantity: 6,
                        },
                    ]);
                    setIsSubmitting(false);
                },
                onError: () => setIsSubmitting(false),
            }
        );
    };

    const deleteTemplate = (tpl: TemplateRecord) => {
        if (confirm(`Are you sure you want to delete template "${tpl.name}"?`)) {
            router.delete(`/doctor/templates/${tpl.id}`, { preserveScroll: true });
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Prescription Templates" />

            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Doctor Hub', href: '/sessions/today' },
                        { label: 'Prescription Templates' },
                    ]}
                    title="Prescription Regimen Templates"
                    subtitle="Create reusable medicine combinations for standard diagnoses to speed up consultations."
                    actions={
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Create Template</span>
                        </button>
                    }
                />

                {/* Filter Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs w-fit">
                    {[
                        { id: 'all', label: `All (${templates.length})` },
                        {
                            id: 'personal',
                            label: `My Personal (${templates.filter((t) => !t.is_shared).length})`,
                        },
                        {
                            id: 'shared',
                            label: `Clinic Shared (${templates.filter((t) => t.is_shared).length})`,
                        },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setFilter(tab.id as any)}
                            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                                filter === tab.id
                                    ? 'bg-white dark:bg-slate-700 text-primary dark:text-white shadow-xs'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Templates Grid / List */}
                {filteredTemplates.length === 0 ? (
                    <GlassCard className="py-16 text-center">
                        <EmptyState
                            icon={ClipboardList}
                            title="No prescription templates found"
                            description="Create standard regimens (like URI, Gastritis, Asthma) to quickly autofill prescriptions with one tap."
                            action={
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(true)}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Create First Template</span>
                                </button>
                            }
                        />
                    </GlassCard>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredTemplates.map((tpl) => {
                            const isExpanded = expandedTemplateId === tpl.id;
                            return (
                                <GlassCard key={tpl.id} className="p-5 space-y-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                                    {tpl.name}
                                                </h3>
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                        tpl.is_shared
                                                            ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                                                            : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                    }`}
                                                >
                                                    {tpl.is_shared ? (
                                                        <>
                                                            <Users className="w-3 h-3" />
                                                            <span>Clinic Shared</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <User className="w-3 h-3" />
                                                            <span>Personal</span>
                                                        </>
                                                    )}
                                                </span>
                                            </div>
                                            {tpl.description && (
                                                <p className="text-xs text-slate-500 mt-1">
                                                    {tpl.description}
                                                </p>
                                            )}
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                By {tpl.doctor_name} • {tpl.items_count} medicines
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => deleteTemplate(tpl)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                            title="Delete Template"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Medicines Preview List */}
                                    <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
                                        {tpl.items.slice(0, isExpanded ? tpl.items.length : 3).map((it, idx) => (
                                            <div
                                                key={idx}
                                                className="text-xs flex items-center justify-between text-slate-700 dark:text-slate-300"
                                            >
                                                <span className="font-semibold flex items-center gap-1.5">
                                                    <Pill className="w-3 h-3 text-primary" />
                                                    {it.display_name}
                                                </span>
                                                <span className="text-[11px] text-slate-400 font-mono">
                                                    {it.dose} ({it.frequency}) × {it.duration_days}d [Qty: {it.quantity}]
                                                </span>
                                            </div>
                                        ))}

                                        {tpl.items.length > 3 && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setExpandedTemplateId(isExpanded ? null : tpl.id)
                                                }
                                                className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 pt-1"
                                            >
                                                {isExpanded ? (
                                                    <>
                                                        <ChevronUp className="w-3 h-3" />
                                                        <span>Show Less</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <ChevronDown className="w-3 h-3" />
                                                        <span>+ {tpl.items.length - 3} more medicines</span>
                                                    </>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                )}

                {/* CREATE TEMPLATE MODAL */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6 max-w-2xl w-full shadow-2xl space-y-4 my-8">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <ClipboardList className="w-4 h-4 text-primary" />
                                    <span>Create Prescription Template</span>
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="p-1 text-slate-400 hover:text-slate-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateSubmit} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Template Name
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="e.g. Adult URI Standard, Gastritis 5d"
                                            className="w-full text-xs p-2.5 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Description / Diagnosis Note
                                        </label>
                                        <input
                                            type="text"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="e.g. For acute pharyngitis and cough"
                                            className="w-full text-xs p-2.5 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                {can_manage_shared && (
                                    <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isShared}
                                            onChange={(e) => setIsShared(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                        />
                                        <span>Share with all doctors in this clinic</span>
                                    </label>
                                )}

                                {/* Medicine Items in Template */}
                                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-900 dark:text-white">
                                            Template Medicines ({items.length})
                                        </label>
                                        <button
                                            type="button"
                                            onClick={addModalItem}
                                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add Medicine</span>
                                        </button>
                                    </div>

                                    <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                                        {items.map((it, idx) => (
                                            <div
                                                key={idx}
                                                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2 text-xs"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <input
                                                        type="text"
                                                        value={it.display_name}
                                                        onChange={(e) =>
                                                            updateModalItem(idx, 'display_name', e.target.value)
                                                        }
                                                        placeholder="Medicine name (e.g. Paracetamol 500mg, Amoxicillin 500mg)"
                                                        className="flex-1 text-xs font-bold p-1.5 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                                        required
                                                    />
                                                    {items.length > 1 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeModalItem(idx)}
                                                            className="p-1 text-slate-400 hover:text-rose-600"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-4 gap-2">
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 block mb-0.5">Dose</label>
                                                        <input
                                                            type="text"
                                                            value={it.dose}
                                                            onChange={(e) => updateModalItem(idx, 'dose', e.target.value)}
                                                            className="w-full text-xs p-1 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 block mb-0.5">Freq</label>
                                                        <input
                                                            type="text"
                                                            value={it.frequency}
                                                            onChange={(e) => updateModalItem(idx, 'frequency', e.target.value)}
                                                            className="w-full text-xs p-1 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 block mb-0.5">Days</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={it.duration_days}
                                                            onChange={(e) => updateModalItem(idx, 'duration_days', e.target.value)}
                                                            className="w-full text-xs p-1 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-400 block mb-0.5">Qty</label>
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            value={it.quantity}
                                                            onChange={(e) => updateModalItem(idx, 'quantity', e.target.value)}
                                                            className="w-full text-xs p-1 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                                    >
                                        {isSubmitting ? 'Creating...' : 'Save Template'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
