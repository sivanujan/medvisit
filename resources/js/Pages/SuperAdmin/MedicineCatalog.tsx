import React, { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import GlassCard from '@/Components/UI/GlassCard';
import GlassTable from '@/Components/UI/GlassTable';
import StatusBadge from '@/Components/UI/StatusBadge';
import GlassModal from '@/Components/UI/GlassModal';
import EmptyState from '@/Components/UI/EmptyState';
import {
    Pill,
    Search,
    Plus,
    Download,
    CheckCircle2,
    XCircle,
    GitMerge,
    ChevronDown,
    ChevronRight,
    Trash2,
    Layers,
    Barcode,
    Filter,
    Building2,
    AlertCircle,
    Sparkles,
} from 'lucide-react';

interface MedicineBarcodeItem {
    id: number;
    barcode: string;
    pack_size: number;
    status: string;
    created_by_tenant_id?: string | null;
}

interface MedicineBrandItem {
    id: number;
    brand_name: string;
    manufacturer?: string | null;
    country?: string | null;
    status: string;
    created_by_tenant_id?: string | null;
    barcodes?: MedicineBarcodeItem[];
}

interface MedicineVariantItem {
    id: number;
    strength_text: string;
    dosage_form: string;
    form_detail?: string | null;
    display_name?: string;
    rxcui?: string | null;
    source: string;
    status: string;
    created_by_tenant_id?: string | null;
    brands?: MedicineBrandItem[];
}

interface MedicineItem {
    id: number;
    generic_name: string;
    route: string;
    is_combination: boolean;
    source: string;
    status: string;
    rxterms_sxdg_rxcui?: string | null;
    created_by_tenant_id?: string | null;
    created_by_tenant?: { id: string; name: string } | null;
    variants?: MedicineVariantItem[];
}

interface Props {
    medicines: {
        data: MedicineItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    filters: {
        search: string;
        status: string;
        route: string;
        source: string;
    };
    reviewQueue: {
        medicines: any[];
        variants: any[];
        brands: any[];
        barcodes: any[];
        total_pending: number;
    };
}

export default function MedicineCatalog({
    medicines,
    filters,
    reviewQueue,
}: Props) {
    const [activeTab, setActiveTab] = useState<'catalog' | 'queue'>('catalog');
    const [queueCategory, setQueueCategory] = useState<'medicines' | 'variants' | 'brands' | 'barcodes'>('medicines');
    const [expandedMedicines, setExpandedMedicines] = useState<Record<number, boolean>>({});

    // RxTerms Import Modal State
    const [rxTermsModalOpen, setRxTermsModalOpen] = useState(false);
    const [rxTermsSearchTerm, setRxTermsSearchTerm] = useState('');
    const [rxTermsLoading, setRxTermsLoading] = useState(false);
    const [rxTermsResults, setRxTermsResults] = useState<any[]>([]);
    const [selectedRxItem, setSelectedRxItem] = useState<any | null>(null);
    const [selectedVariants, setSelectedVariants] = useState<Record<number, boolean>>({});

    // Rejection Modal State
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectItemData, setRejectItemData] = useState<{ type: string; id: number; name: string } | null>(null);
    const [rejectReason, setRejectReason] = useState('');

    // Merge Modal State
    const [mergeModalOpen, setMergeModalOpen] = useState(false);
    const [mergeData, setMergeData] = useState<{ type: 'medicine' | 'variant' | 'brand'; source_id: number; source_name: string } | null>(null);
    const [mergeTargetId, setMergeTargetId] = useState('');

    const toggleExpand = (id: number) => {
        setExpandedMedicines((prev) => ({ ...prev, [id]: !prev[id] }));
    };

    const handleFilterChange = (key: string, value: string) => {
        router.get(
            '/super-admin/medicines',
            { ...filters, [key]: value },
            { preserveState: true, replace: true }
        );
    };

    // RxTerms Search
    const handleRxTermsSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!rxTermsSearchTerm.trim()) return;

        setRxTermsLoading(true);
        try {
            const res = await fetch('/super-admin/medicines/rxterms/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ term: rxTermsSearchTerm }),
            });
            const data = await res.json();
            setRxTermsResults(data.results || []);
            setSelectedRxItem(null);
            setSelectedVariants({});
        } catch (err) {
            console.error('RxTerms search failed:', err);
        } finally {
            setRxTermsLoading(false);
        }
    };

    const handleImportSubmit = () => {
        if (!selectedRxItem) return;

        const variantsToImport = (selectedRxItem.variants || []).filter(
            (_: any, idx: number) => selectedVariants[idx] !== false
        );

        if (variantsToImport.length === 0) {
            alert('Please select at least one variant to import.');
            return;
        }

        router.post('/super-admin/medicines/rxterms/import', {
            generic_name: selectedRxItem.generic_name,
            route: selectedRxItem.route,
            is_combination: selectedRxItem.is_combination,
            sxdg_rxcui: selectedRxItem.sxdg_rxcui,
            variants: variantsToImport,
        }, {
            onSuccess: () => {
                setRxTermsModalOpen(false);
                setSelectedRxItem(null);
            },
        });
    };

    const handleApprove = (type: string, id: number) => {
        if (confirm(`Approve this ${type}?`)) {
            router.post(`/super-admin/medicines/review/${type}/${id}/approve`);
        }
    };

    const handleRejectSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!rejectItemData || !rejectReason.trim()) return;

        router.post(`/super-admin/medicines/review/${rejectItemData.type}/${rejectItemData.id}/reject`, {
            reason: rejectReason,
        }, {
            onSuccess: () => {
                setRejectModalOpen(false);
                setRejectItemData(null);
                setRejectReason('');
            },
        });
    };

    const handleMergeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!mergeData || !mergeTargetId.trim()) return;

        router.post('/super-admin/medicines/review/merge', {
            type: mergeData.type,
            source_id: mergeData.source_id,
            target_id: parseInt(mergeTargetId, 10),
        }, {
            onSuccess: () => {
                setMergeModalOpen(false);
                setMergeData(null);
                setMergeTargetId('');
            },
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Medicine Catalog & Review Queue - Super Admin" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header */}
                <PageHeader
                    title="Medicine Catalog & Review"
                    subtitle="Central standardized global medicines, strengths, dosage forms, brands and barcodes."
                    action={
                        <div className="flex gap-2.5">
                            <button
                                type="button"
                                onClick={() => setRxTermsModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all hover:scale-[1.01]"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>Import from RxTerms</span>
                            </button>
                        </div>
                    }
                />

                {/* Primary Tabs */}
                <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={() => setActiveTab('catalog')}
                        className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                            activeTab === 'catalog'
                                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                    >
                        <Pill className="w-4 h-4" />
                        <span>Global Catalog ({medicines.total})</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('queue')}
                        className={`pb-3 px-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${
                            activeTab === 'queue'
                                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400'
                        }`}
                    >
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        <span>Review Queue</span>
                        {reviewQueue.total_pending > 0 && (
                            <span className="px-2 py-0.5 text-xs font-extrabold rounded-full bg-amber-500 text-white">
                                {reviewQueue.total_pending}
                            </span>
                        )}
                    </button>
                </div>

                {activeTab === 'catalog' ? (
                    <div className="space-y-4">
                        {/* Filters Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white/70 dark:bg-slate-900/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    defaultValue={filters.search}
                                    placeholder="Search generic or brand..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleFilterChange('search', (e.target as HTMLInputElement).value);
                                        }
                                    }}
                                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 focus:ring-2 focus:ring-teal-500 outline-none"
                                />
                            </div>

                            <select
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                                className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 outline-none focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="all">All Statuses</option>
                                <option value="approved">Approved</option>
                                <option value="pending">Pending</option>
                                <option value="rejected">Rejected</option>
                            </select>

                            <select
                                value={filters.route}
                                onChange={(e) => handleFilterChange('route', e.target.value)}
                                className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 outline-none focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="all">All Routes</option>
                                <option value="Oral">Oral</option>
                                <option value="Topical">Topical</option>
                                <option value="Injection">Injection</option>
                                <option value="Ophthalmic">Ophthalmic</option>
                                <option value="Inhalation">Inhalation</option>
                                <option value="Nasal">Nasal</option>
                                <option value="Otic">Otic</option>
                                <option value="Rectal">Rectal</option>
                                <option value="Other">Other</option>
                            </select>

                            <select
                                value={filters.source}
                                onChange={(e) => handleFilterChange('source', e.target.value)}
                                className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 outline-none focus:ring-2 focus:ring-teal-500"
                            >
                                <option value="all">All Sources</option>
                                <option value="rxterms">RxTerms (NLM)</option>
                                <option value="admin">Super Admin</option>
                                <option value="clinic">Clinic Submitted</option>
                            </select>
                        </div>

                        {/* Catalog Table */}
                        <GlassCard className="overflow-hidden p-0">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-xs uppercase font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="py-3.5 px-4 w-10"></th>
                                        <th className="py-3.5 px-4">Generic Name</th>
                                        <th className="py-3.5 px-4">Route</th>
                                        <th className="py-3.5 px-4">Variants</th>
                                        <th className="py-3.5 px-4">Source</th>
                                        <th className="py-3.5 px-4">Status</th>
                                        <th className="py-3.5 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                                    {medicines.data.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-400">
                                                No medicines found matching the filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        medicines.data.map((med) => {
                                            const isExpanded = !!expandedMedicines[med.id];
                                            const variantCount = med.variants?.length || 0;

                                            return (
                                                <React.Fragment key={med.id}>
                                                    <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                                                        <td className="py-3.5 px-4">
                                                            {variantCount > 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleExpand(med.id)}
                                                                    className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                                                                >
                                                                    {isExpanded ? (
                                                                        <ChevronDown className="w-4 h-4" />
                                                                    ) : (
                                                                        <ChevronRight className="w-4 h-4" />
                                                                    )}
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                                                            <span>{med.generic_name}</span>
                                                            {med.is_combination && (
                                                                <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                                                                    Combo
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                                                            {med.route}
                                                        </td>
                                                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                                                            {variantCount} strengths/forms
                                                        </td>
                                                        <td className="py-3.5 px-4 text-xs font-semibold text-slate-500">
                                                            {med.source}
                                                        </td>
                                                        <td className="py-3.5 px-4">
                                                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                                                                med.status === 'approved'
                                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                                    : med.status === 'pending'
                                                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                                            }`}>
                                                                {med.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (confirm(`Archive ${med.generic_name}?`)) {
                                                                        router.delete(`/super-admin/medicines/${med.id}`);
                                                                    }
                                                                }}
                                                                className="text-slate-400 hover:text-rose-600 p-1.5 transition-colors"
                                                                title="Archive medicine"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded Variants & Brands Sub-Table */}
                                                    {isExpanded && (
                                                        <tr className="bg-slate-50/80 dark:bg-slate-900/80">
                                                            <td colSpan={7} className="p-4 pl-12">
                                                                <div className="space-y-3">
                                                                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                                                        Strengths, Forms & Brands
                                                                    </h4>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        {(med.variants || []).map((v) => (
                                                                            <div
                                                                                key={v.id}
                                                                                className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs space-y-2 shadow-sm"
                                                                            >
                                                                                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-white">
                                                                                    <span>
                                                                                        {v.strength_text} {v.dosage_form} {v.form_detail ? `(${v.form_detail})` : ''}
                                                                                    </span>
                                                                                    <span className="text-[10px] text-slate-400 font-mono">
                                                                                        RxCUI: {v.rxcui || '-'}
                                                                                    </span>
                                                                                </div>

                                                                                {/* Brands */}
                                                                                <div className="pt-1 border-t border-slate-100 dark:border-slate-700 space-y-1">
                                                                                    <span className="text-[11px] font-semibold text-slate-500 block">
                                                                                        Brands ({(v.brands || []).length}):
                                                                                    </span>
                                                                                    {(v.brands || []).length === 0 ? (
                                                                                        <span className="text-slate-400 italic">No brands linked</span>
                                                                                    ) : (
                                                                                        <div className="flex flex-wrap gap-1.5">
                                                                                            {v.brands?.map((b) => (
                                                                                                <span
                                                                                                    key={b.id}
                                                                                                    className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium inline-flex items-center gap-1"
                                                                                                >
                                                                                                    <span>{b.brand_name}</span>
                                                                                                    {(b.barcodes || []).length > 0 && (
                                                                                                        <Barcode className="w-3 h-3 text-teal-600" />
                                                                                                    )}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </GlassCard>
                    </div>
                ) : (
                    /* Review Queue Tab */
                    <div className="space-y-4">
                        {/* Queue Sub-tabs */}
                        <div className="flex gap-2">
                            {(['medicines', 'variants', 'brands', 'barcodes'] as const).map((cat) => {
                                const count = reviewQueue[cat]?.length || 0;
                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setQueueCategory(cat)}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all capitalize flex items-center gap-1.5 ${
                                            queueCategory === cat
                                                ? 'bg-teal-600 text-white shadow-sm'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                        }`}
                                    >
                                        <span>{cat}</span>
                                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/20">
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Review Items List */}
                        <GlassCard className="p-0 overflow-hidden">
                            <div className="divide-y divide-slate-200 dark:divide-slate-800">
                                {reviewQueue[queueCategory]?.length === 0 ? (
                                    <div className="py-12 text-center text-slate-400">
                                        No pending submissions in this category.
                                    </div>
                                ) : (
                                    reviewQueue[queueCategory].map((item: any) => (
                                        <div
                                            key={item.id}
                                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-900 dark:text-white text-base">
                                                        {item.generic_name || item.brand_name || item.display_name || item.barcode}
                                                    </span>
                                                    {item.route && (
                                                        <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-semibold">
                                                            {item.route}
                                                        </span>
                                                    )}
                                                    {item.strength_text && (
                                                        <span className="text-xs text-slate-500 font-medium">
                                                            {item.strength_text} {item.dosage_form}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="flex items-center gap-1">
                                                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>Submitted by: <strong>{item.created_by_tenant?.name || item.created_by_tenant_id || 'Unknown Clinic'}</strong></span>
                                                    </span>
                                                    <span>&bull;</span>
                                                    <span>ID #{item.id}</span>
                                                </div>
                                            </div>

                                            {/* Action Buttons: Approve, Merge, Reject */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleApprove(queueCategory.slice(0, -1), item.id)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shadow-emerald-600/30 transition-all"
                                                >
                                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                                    <span>Approve</span>
                                                </button>

                                                {queueCategory !== 'barcodes' && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setMergeData({
                                                                type: queueCategory.slice(0, -1) as any,
                                                                source_id: item.id,
                                                                source_name: item.generic_name || item.brand_name || item.display_name,
                                                            });
                                                            setMergeTargetId('');
                                                            setMergeModalOpen(true);
                                                        }}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm shadow-indigo-600/30 transition-all"
                                                    >
                                                        <GitMerge className="w-3.5 h-3.5" />
                                                        <span>Merge</span>
                                                    </button>
                                                )}

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setRejectItemData({
                                                            type: queueCategory.slice(0, -1),
                                                            id: item.id,
                                                            name: item.generic_name || item.brand_name || item.display_name || item.barcode,
                                                        });
                                                        setRejectReason('');
                                                        setRejectModalOpen(true);
                                                    }}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:hover:bg-rose-900 dark:text-rose-300 text-xs font-semibold transition-all border border-rose-200 dark:border-rose-800"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" />
                                                    <span>Reject</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </GlassCard>
                    </div>
                )}
            </div>

            {/* RxTerms Import Modal */}
            <GlassModal
                isOpen={rxTermsModalOpen}
                onClose={() => setRxTermsModalOpen(false)}
                title="Search & Import from NLM RxTerms"
                maxWidth="max-w-2xl"
            >
                <div className="space-y-4">
                    <form onSubmit={handleRxTermsSearch} className="flex gap-2">
                        <input
                            type="text"
                            value={rxTermsSearchTerm}
                            onChange={(e) => setRxTermsSearchTerm(e.target.value)}
                            placeholder="Type generic medicine name (e.g. Amlodipine, Metformin)..."
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                            type="submit"
                            disabled={rxTermsLoading || !rxTermsSearchTerm.trim()}
                            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-sm"
                        >
                            {rxTermsLoading ? 'Searching...' : 'Search'}
                        </button>
                    </form>

                    {/* Results List */}
                    <div className="max-h-96 overflow-y-auto space-y-3">
                        {rxTermsResults.map((item, idx) => {
                            const isSelected = selectedRxItem === item;
                            return (
                                <div
                                    key={idx}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                                        isSelected
                                            ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 shadow-sm'
                                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-slate-300'
                                    }`}
                                    onClick={() => {
                                        setSelectedRxItem(item);
                                        const initialSel: Record<number, boolean> = {};
                                        (item.variants || []).forEach((_: any, vIdx: number) => {
                                            initialSel[vIdx] = true;
                                        });
                                        setSelectedVariants(initialSel);
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="font-bold text-slate-900 dark:text-white text-sm">
                                            {item.generic_name}
                                            <span className="ml-2 text-xs font-normal text-slate-500">
                                                ({item.route})
                                            </span>
                                        </div>
                                        <span className="text-xs text-teal-600 font-semibold">
                                            {(item.variants || []).length} variants
                                        </span>
                                    </div>

                                    {isSelected && (
                                        <div className="mt-3 pt-3 border-t border-slate-200/80 dark:border-slate-700 space-y-2">
                                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                Select Variants to Import:
                                            </span>
                                            <div className="grid grid-cols-2 gap-2">
                                                {item.variants.map((v: any, vIdx: number) => (
                                                    <label
                                                        key={vIdx}
                                                        className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs cursor-pointer"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedVariants[vIdx] !== false}
                                                            onChange={(e) =>
                                                                setSelectedVariants((prev) => ({
                                                                    ...prev,
                                                                    [vIdx]: e.target.checked,
                                                                }))
                                                            }
                                                            className="rounded text-teal-600 focus:ring-teal-500"
                                                        />
                                                        <span className="font-medium text-slate-800 dark:text-slate-200">
                                                            {v.strength_text} {v.dosage_form}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {selectedRxItem && (
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setSelectedRxItem(null)}
                                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                            >
                                Clear Selection
                            </button>
                            <button
                                type="button"
                                onClick={handleImportSubmit}
                                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md"
                            >
                                Import Selected
                            </button>
                        </div>
                    )}
                </div>
            </GlassModal>

            {/* Rejection Modal with Mandatory Reason */}
            <GlassModal
                isOpen={rejectModalOpen}
                onClose={() => setRejectModalOpen(false)}
                title={`Reject ${rejectItemData?.type}: ${rejectItemData?.name}`}
                maxWidth="max-w-md"
            >
                <form onSubmit={handleRejectSubmit} className="space-y-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Please provide a feedback reason for this clinic submission. The submitting clinic will retain their copy for operations.
                    </p>
                    <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="e.g. Duplicate of approved generic, non-standard strength nomenclature..."
                        rows={3}
                        required
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 focus:ring-2 focus:ring-rose-500 outline-none"
                    />
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setRejectModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!rejectReason.trim()}
                            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-sm"
                        >
                            Confirm Rejection
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* Merge Modal */}
            <GlassModal
                isOpen={mergeModalOpen}
                onClose={() => setMergeModalOpen(false)}
                title={`Merge ${mergeData?.type}: ${mergeData?.source_name}`}
                maxWidth="max-w-md"
            >
                <form onSubmit={handleMergeSubmit} className="space-y-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        Enter the Target ID of the existing approved {mergeData?.type} to merge this into. All clinic stocks, batches and movements will be transferred safely.
                    </p>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Target {mergeData?.type} ID
                        </label>
                        <input
                            type="number"
                            value={mergeTargetId}
                            onChange={(e) => setMergeTargetId(e.target.value)}
                            placeholder="e.g. 42"
                            required
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setMergeModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!mergeTargetId.trim()}
                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm"
                        >
                            Execute Merge
                        </button>
                    </div>
                </form>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
