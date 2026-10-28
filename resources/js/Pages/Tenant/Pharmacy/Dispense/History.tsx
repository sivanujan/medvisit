import React, { useState } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { EmptyState } from '@/Components/UI/EmptyState';
import {
    History,
    Search,
    RotateCcw,
    CheckCircle2,
    Lock,
    Pill,
    Phone,
    User,
    ArrowLeft,
    AlertCircle,
} from 'lucide-react';

interface DispensedItem {
    id: number;
    display_name: string;
    dispensed_quantity: number;
    source: string;
}

interface DispensedRecord {
    id: number;
    prescription_number: string;
    status: string;
    patient_name: string;
    patient_phone: string;
    doctor_name: string;
    dispensed_at: string;
    is_paid: boolean;
    payment_status: string;
    total_amount_formatted: string;
    items_count: number;
    items: DispensedItem[];
}

interface Props {
    dispensed: {
        data: DispensedRecord[];
        links: any[];
        total: number;
    };
    filters: {
        search: string;
    };
}

export default function DispenseHistory({ dispensed, filters }: Props) {
    const [searchTerm, setSearchTerm] = useState(filters.search || '');
    const [undoRx, setUndoRx] = useState<DispensedRecord | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [undoReason, setUndoReason] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/pharmacy/dispense/history', { search: searchTerm }, { preserveState: true });
    };

    const handleUndoSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!undoRx || isSubmitting) return;

        setIsSubmitting(true);
        router.post(
            `/pharmacy/dispense/${undoRx.id}/undo`,
            { reason: undoReason || 'Dispense reversed by pharmacy' },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setUndoRx(null);
                    setUndoReason('');
                    setIsSubmitting(false);
                },
                onError: (errs) => {
                    setIsSubmitting(false);
                    alert(Object.values(errs)[0] as string || 'Failed to undo dispense.');
                },
            }
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Dispensed Prescriptions History" />

            <div className="space-y-6">
                <PageHeader
                    breadcrumbs={[
                        { label: 'Pharmacy', href: '/pharmacy/medicines' },
                        { label: 'Dispense Counter', href: '/pharmacy/dispense' },
                        { label: 'History' },
                    ]}
                    title="Dispensed Prescriptions History"
                    subtitle="Audit trail of all dispensed medicines, batch reversals, and billing line items."
                    actions={
                        <Link
                            href="/pharmacy/dispense"
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span>Dispense Queue</span>
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
                            placeholder="Search by Rx number, patient name, or doctor..."
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

                {/* Dispensed List */}
                {dispensed.data.length === 0 ? (
                    <GlassCard className="py-16 text-center">
                        <EmptyState
                            icon={History}
                            title="No dispensed prescriptions found"
                            description="Prescriptions dispensed by the pharmacy counter will appear here with batch details and undo capability."
                        />
                    </GlassCard>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 shadow-sm">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200/70 dark:border-white/10 text-slate-500 uppercase tracking-wider text-[10px]">
                                <tr>
                                    <th className="py-3 px-4">Rx Number</th>
                                    <th className="py-3 px-4">Patient</th>
                                    <th className="py-3 px-4">Doctor</th>
                                    <th className="py-3 px-4">Dispensed At</th>
                                    <th className="py-3 px-4">Medicines Dispensed</th>
                                    <th className="py-3 px-4">Bill Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {dispensed.data.map((rx) => (
                                    <tr key={rx.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                            {rx.prescription_number}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className="font-bold text-slate-900 dark:text-white block">
                                                {rx.patient_name}
                                            </span>
                                            <span className="text-[11px] text-slate-400">
                                                {rx.patient_phone}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                                            {rx.doctor_name}
                                        </td>
                                        <td className="py-3 px-4 text-slate-500">
                                            {rx.dispensed_at}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="space-y-0.5">
                                                {rx.items.map((it) => (
                                                    <span
                                                        key={it.id}
                                                        className="text-[11px] text-slate-600 dark:text-slate-300 block"
                                                    >
                                                        • {it.display_name} ({it.dispensed_quantity} units)
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                    rx.is_paid
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                                }`}
                                            >
                                                {rx.payment_status}: {rx.total_amount_formatted}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            {rx.is_paid ? (
                                                <span
                                                    className="inline-flex items-center gap-1 text-[11px] text-slate-400"
                                                    title="Cannot undo after patient bill is paid"
                                                >
                                                    <Lock className="w-3.5 h-3.5" />
                                                    <span>Bill Paid</span>
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setUndoRx(rx)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 transition-colors"
                                                    title="Undo Dispense and Return Stock to Batches"
                                                >
                                                    <RotateCcw className="w-3 h-3" />
                                                    <span>Undo</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* UNDO DISPENSE MODAL */}
                {undoRx && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6 max-w-md w-full shadow-2xl space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-500" />
                                <span>Undo Dispense: {undoRx.prescription_number}</span>
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                This will return all deducted stock directly back into their original FEFO batches, remove the medicine lines from the patient’s bill, and reset the prescription back to finalized.
                            </p>

                            <form onSubmit={handleUndoSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Reason for Reversal
                                    </label>
                                    <input
                                        type="text"
                                        value={undoReason}
                                        onChange={(e) => setUndoReason(e.target.value)}
                                        placeholder="e.g. Patient declined medicines, incorrect dosage entered"
                                        className="w-full text-xs p-2.5 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        required
                                    />
                                </div>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setUndoRx(null)}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm"
                                    >
                                        {isSubmitting ? 'Reversing...' : 'Confirm Reversal'}
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
