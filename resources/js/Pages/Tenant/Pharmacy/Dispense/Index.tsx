import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { EmptyState } from '@/Components/UI/EmptyState';
import {
    Pill,
    Search,
    CheckCircle2,
    Clock,
    User,
    Phone,
    Stethoscope,
    History,
    AlertCircle,
    X,
    Boxes,
    ChevronRight,
    ArrowRightLeft,
    ShieldAlert,
} from 'lucide-react';
import { formatLKR } from '@/Utils/formatters';

interface PrescriptionRow {
    id: number;
    prescription_number: string;
    status: string;
    token_id?: number;
    token_number?: number;
    patient_name: string;
    patient_phone: string;
    doctor_name: string;
    finalized_at: string;
    finalized_date: string;
    items_count: number;
    clinic_items_count: number;
    outside_items_count: number;
}

interface BatchOption {
    id: number;
    batch_number: string;
    expiry_date: string;
    quantity_remaining: number;
    cost_price_cents: number;
}

interface SubstituteOption {
    id: number;
    display_name: string;
    total_quantity: number;
    selling_price_cents: number;
}

interface ReviewItem {
    id: number;
    display_name: string;
    clinic_medicine_id?: number | null;
    medicine_variant_id?: number | null;
    source: string;
    dose: string;
    frequency: string;
    timing: string;
    duration_days: number;
    quantity: number;
    dispensed_quantity: number;
    total_in_stock: number;
    batches: BatchOption[];
    substitute_options: SubstituteOption[];
    instructions?: string;
    // Client editable fields for dispense
    dispense_qty: number;
    selected_substitute_id?: number | null;
}

interface Props {
    prescriptions: {
        data: PrescriptionRow[];
        links: any[];
        total: number;
    };
    filters: {
        search: string;
    };
    mode: string;
}

export default function DispenseIndex({ prescriptions, filters, mode }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [selectedRx, setSelectedRx] = useState<PrescriptionRow | null>(null);
    const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
    const [isLoadingReview, setIsLoadingReview] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reviewError, setReviewError] = useState<string | null>(null);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/pharmacy/dispense', { search: searchTerm }, { preserveState: true });
    };

    const openDispenseModal = async (rx: PrescriptionRow) => {
        setSelectedRx(rx);
        setIsLoadingReview(true);
        setReviewError(null);

        try {
            const res = await fetch(`/pharmacy/dispense/${rx.id}`);
            if (!res.ok) throw new Error('Failed to load prescription details.');
            const data = await res.json();

            const items: ReviewItem[] = (data.items || []).map((it: any) => ({
                ...it,
                dispense_qty: it.source === 'clinic' ? Math.min(it.quantity, it.total_in_stock || it.quantity) : 0,
                selected_substitute_id: null,
            }));

            setReviewItems(items);
        } catch (err: any) {
            setReviewError(err.message || 'Error loading prescription review.');
        } finally {
            setIsLoadingReview(false);
        }
    };

    const updateDispenseQty = (idx: number, qty: number) => {
        const next = [...reviewItems];
        next[idx].dispense_qty = Math.max(0, qty);
        setReviewItems(next);
    };

    const selectSubstitute = (idx: number, subId: number | null) => {
        const next = [...reviewItems];
        next[idx].selected_substitute_id = subId;
        setReviewItems(next);
    };

    const confirmDispense = () => {
        if (!selectedRx || isSubmitting) return;

        setIsSubmitting(true);
        router.post(
            `/pharmacy/dispense/${selectedRx.id}/confirm`,
            {
                items: reviewItems.map((it) => ({
                    prescription_item_id: it.id,
                    quantity_to_dispense: it.source === 'clinic' ? Number(it.dispense_qty) : 0,
                    substitute_clinic_medicine_id: it.selected_substitute_id || null,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedRx(null);
                    setReviewItems([]);
                    setIsSubmitting(false);
                },
                onError: (errs) => {
                    setIsSubmitting(false);
                    setReviewError(Object.values(errs)[0] as string || 'Failed to complete dispensing.');
                },
            }
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Pharmacy Dispense Counter" />

            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Pharmacy', href: '/pharmacy/medicines' },
                        { label: 'Dispense Counter' },
                    ]}
                    title="Pharmacy Dispense Counter"
                    subtitle="Review finalized doctor prescriptions, allocate FEFO inventory batches, and update patient bill line items."
                    actions={
                        <Link
                            href="/pharmacy/dispense/history"
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 shadow-xs"
                        >
                            <History className="w-3.5 h-3.5 text-primary" />
                            <span>Dispense History</span>
                        </Link>
                    }
                />

                {/* Search Bar */}
                <form
                    onSubmit={handleSearch}
                    className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm flex items-center gap-3"
                >
                    <div className="flex-1 relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search pending prescriptions by patient name, phone, or Rx number..."
                            className="w-full text-xs pl-9 pr-3 py-2 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 text-slate-900 dark:text-white"
                        />
                    </div>
                    <button
                        type="submit"
                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                    >
                        Search
                    </button>
                </form>

                {/* Prescriptions List */}
                {prescriptions.data.length === 0 ? (
                    <GlassCard className="py-16 text-center">
                        <EmptyState
                            icon={CheckCircle2}
                            title="No prescriptions waiting in queue"
                            description="All finalized prescriptions have been dispensed or there are no pending doctor prescriptions right now."
                        />
                    </GlassCard>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {prescriptions.data.map((rx) => (
                            <GlassCard
                                key={rx.id}
                                className="p-4 sm:p-5 space-y-4 hover:border-primary/40 transition-all hover:-translate-y-0.5 cursor-pointer"
                                onClick={() => openDispenseModal(rx)}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        {rx.token_number ? (
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm shadow-inner shrink-0">
                                                #{rx.token_number}
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                                                <Pill className="w-5 h-5" />
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                                                {rx.patient_name}
                                            </h3>
                                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                                <Phone className="w-3 h-3 text-slate-400" />
                                                {rx.patient_phone}
                                            </p>
                                        </div>
                                    </div>

                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            rx.status === 'partially_dispensed'
                                                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                        }`}
                                    >
                                        {rx.status.replace('_', ' ')}
                                    </span>
                                </div>

                                <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                                    <div>
                                        <span className="font-mono font-bold block text-slate-900 dark:text-white">
                                            {rx.prescription_number}
                                        </span>
                                        <span className="text-[11px] text-slate-400">By {rx.doctor_name}</span>
                                    </div>

                                    <div className="text-right">
                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                                            {rx.clinic_items_count} clinic / {rx.outside_items_count} outside
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {rx.finalized_at}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openDispenseModal(rx);
                                    }}
                                    className="w-full py-2 rounded-xl text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 flex items-center justify-center gap-1 transition-colors"
                                >
                                    <span>Review & Dispense</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </GlassCard>
                        ))}
                    </div>
                )}

                {/* REVIEW & DISPENSE MODAL */}
                {selectedRx && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6 max-w-3xl w-full shadow-2xl space-y-5 my-8">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Pill className="w-5 h-5 text-primary" />
                                        <span>Dispense Prescription {selectedRx.prescription_number}</span>
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Patient: {selectedRx.patient_name} ({selectedRx.patient_phone}) • Dr. {selectedRx.doctor_name}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSelectedRx(null)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {reviewError && (
                                <div className="p-3.5 rounded-xl bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 text-xs flex items-center gap-2 border border-rose-200">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{reviewError}</span>
                                </div>
                            )}

                            {isLoadingReview ? (
                                <div className="py-16 text-center">
                                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                    <span className="text-xs text-slate-500">Checking FEFO batches and inventory...</span>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                                    {reviewItems.map((item, idx) => {
                                        const isOutOfStock = item.source === 'clinic' && item.total_in_stock < item.quantity;
                                        return (
                                            <div
                                                key={item.id}
                                                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40 space-y-3"
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-950 dark:text-white">
                                                            {idx + 1}. {item.display_name}
                                                        </span>
                                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                                            {item.dose} ({item.frequency}) • {item.timing.replace('_', ' ')} • {item.duration_days} days [Prescribed: {item.quantity} units]
                                                        </p>
                                                    </div>

                                                    <span
                                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase self-start sm:self-auto ${
                                                            item.source === 'clinic'
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                        }`}
                                                    >
                                                        {item.source === 'clinic' ? 'Clinic Pharmacy' : 'Buy Outside'}
                                                    </span>
                                                </div>

                                                {/* Batches and Quantity allocation for Clinic Stock */}
                                                {item.source === 'clinic' ? (
                                                    <div className="space-y-2.5 pt-2 border-t border-slate-200/60 dark:border-white/5">
                                                        {/* Available Batches Pills */}
                                                        <div>
                                                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                                                                FEFO Allocation ({item.total_in_stock} available in stock)
                                                            </span>
                                                            {item.batches.length === 0 ? (
                                                                <span className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                                                                    <ShieldAlert className="w-3.5 h-3.5" />
                                                                    No valid in-stock batches (Stock is 0 or expired)
                                                                </span>
                                                            ) : (
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {item.batches.map((b) => (
                                                                        <span
                                                                            key={b.id}
                                                                            className="px-2 py-0.5 rounded-lg text-[10px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                                                                        >
                                                                            Batch: {b.batch_number} • Exp: {b.expiry_date} • Rem: {b.quantity_remaining}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Dispense Quantity Input */}
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-36">
                                                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                                                    Qty to Dispense
                                                                </label>
                                                                <input
                                                                    type="number"
                                                                    min={0}
                                                                    max={item.total_in_stock}
                                                                    value={item.dispense_qty}
                                                                    onChange={(e) =>
                                                                        updateDispenseQty(idx, Number(e.target.value))
                                                                    }
                                                                    className="w-full text-xs font-black p-1.5 rounded-lg border-primary/50 text-primary bg-white dark:bg-slate-900"
                                                                />
                                                            </div>

                                                            {/* Brand Substitution Selector (Strict Same Variant Only) */}
                                                            {item.substitute_options.length > 0 && (
                                                                <div className="flex-1">
                                                                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                                                                        Brand Substitution (Same Variant)
                                                                    </label>
                                                                    <select
                                                                        value={item.selected_substitute_id || ''}
                                                                        onChange={(e) =>
                                                                            selectSubstitute(
                                                                                idx,
                                                                                e.target.value ? Number(e.target.value) : null
                                                                            )
                                                                        }
                                                                        className="w-full text-xs p-1.5 rounded-lg border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                                                    >
                                                                        <option value="">Dispense prescribed brand</option>
                                                                        {item.substitute_options.map((sub) => (
                                                                            <option key={sub.id} value={sub.id}>
                                                                                Substitute: {sub.display_name} ({sub.total_quantity} in stock)
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-[11px] text-slate-500 italic">
                                                        Prescribed for patient to purchase at an outside pharmacy. No stock will be deducted.
                                                    </p>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <span className="text-xs text-slate-500">
                                    Deducts stock FEFO and updates patient bill in one transaction.
                                </span>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRx(null)}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmDispense}
                                        disabled={isSubmitting || isLoadingReview}
                                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 disabled:opacity-50"
                                    >
                                        {isSubmitting ? 'Dispensing...' : 'Confirm & Dispense'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
