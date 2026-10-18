import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import GlassCard from '@/Components/UI/GlassCard';
import GlassModal from '@/Components/UI/GlassModal';
import { formatLKR, formatDateDMY } from '@/Utils/formatters';
import { usePermission } from '@/Hooks/usePermission';
import {
    Boxes,
    Plus,
    Search,
    Receipt,
    Calendar,
    Building2,
    FileText,
    AlertTriangle,
    CheckCircle2,
    X,
    XCircle,
    Ban,
    Loader2,
    ChevronRight,
    ArrowLeft,
    ShieldAlert,
} from 'lucide-react';

interface StockReceiptItem {
    id: number;
    receipt_number: string;
    status: 'received' | 'voided';
    received_date: string;
    supplier_name: string;
    supplier_id: number | null;
    invoice_number: string | null;
    notes: string | null;
    total_cost_cents: number;
    lines_count: number;
    total_units_received: number;
    created_by_name: string;
    created_at: string;
    voided_at: string | null;
    voided_by_name: string | null;
    void_reason: string | null;
}

interface Props {
    receipts: {
        data: StockReceiptItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    filters: {
        search: string;
        status: string;
    };
}

export default function StockReceiptsIndex({ receipts, filters }: Props) {
    const { can } = usePermission();
    const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [receiptDetails, setReceiptDetails] = useState<any | null>(null);

    // Void Modal
    const [voidModalOpen, setVoidModalOpen] = useState(false);
    const [voidReason, setVoidReason] = useState('');
    const [voidSubmitting, setVoidSubmitting] = useState(false);
    const [voidError, setVoidError] = useState<string | null>(null);

    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const { flash } = usePage<any>().props;
    React.useEffect(() => {
        if (flash?.success) {
            setToast({ type: 'success', message: flash.success });
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
        if (flash?.error) {
            setToast({ type: 'error', message: flash.error });
            const timer = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [flash]);

    const handleFilterChange = (key: string, value: string) => {
        router.get(
            route('tenant.pharmacy.receipts'),
            { ...filters, [key]: value },
            { preserveState: true, replace: true }
        );
    };

    const openReceiptDrawer = async (id: number) => {
        setSelectedReceiptId(id);
        setDrawerOpen(true);
        setDrawerLoading(true);
        try {
            const res = await fetch(`/pharmacy/receipts/${id}`);
            const data = await res.json();
            setReceiptDetails(data);
        } catch (err) {
            console.error('Failed to load receipt details:', err);
        } finally {
            setDrawerLoading(false);
        }
    };

    const handleVoidSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedReceiptId || !voidReason.trim()) return;

        setVoidSubmitting(true);
        setVoidError(null);

        router.post(
            route('tenant.pharmacy.receipts.void', selectedReceiptId),
            { reason: voidReason },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setVoidModalOpen(false);
                    setVoidReason('');
                    setToast({ type: 'success', message: 'GRN voided and batch stock reversed.' });
                    if (selectedReceiptId) openReceiptDrawer(selectedReceiptId);
                },
                onError: (errs) => {
                    setVoidError(Object.values(errs)[0] as string || 'Failed to void GRN.');
                },
                onFinish: () => setVoidSubmitting(false),
            }
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Stock Receipts (GRNs) - MedVisit" />

            {/* Floating Toast Notification */}
            {toast && (
                <div className="fixed top-5 right-5 z-50 max-w-md animate-in fade-in slide-in-from-top-3 duration-300">
                    <div
                        className={`p-4 rounded-2xl shadow-xl backdrop-blur-xl border flex items-center gap-3 ${
                            toast.type === 'success'
                                ? 'bg-emerald-600/95 text-white border-emerald-400/50 shadow-emerald-600/20'
                                : 'bg-rose-600/95 text-white border-rose-400/50 shadow-rose-600/20'
                        }`}
                    >
                        {toast.type === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                        ) : (
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                        )}
                        <span className="text-sm font-semibold">{toast.message}</span>
                        <button
                            type="button"
                            onClick={() => setToast(null)}
                            className="ml-auto p-1 hover:bg-white/20 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header */}
                <PageHeader
                    title="Stock Receipts (GRNs)"
                    subtitle="Audit trail of Goods Received Notes, batch deliveries and supplier shipments."
                    action={
                        <div className="flex flex-wrap gap-2.5">
                            <Link
                                href="/pharmacy/medicines"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-all shadow-sm"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back to Stock</span>
                            </Link>

                            {can('pharmacy.receive_stock') && (
                                <Link
                                    href="/pharmacy/receipts/create"
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all hover:scale-[1.01]"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>New GRN Receipt</span>
                                </Link>
                            )}
                        </div>
                    }
                />

                {/* Filter Tabs & Search Bar */}
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        {/* Tab Chips */}
                        <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 w-full sm:w-auto">
                            {[
                                { id: 'all', label: 'All Receipts' },
                                { id: 'received', label: 'Active (Received)' },
                                { id: 'voided', label: 'Voided' },
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => handleFilterChange('status', tab.id)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                        filters.status === tab.id
                                            ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-80">
                            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                            <input
                                type="text"
                                defaultValue={filters.search}
                                placeholder="Search GRN #, invoice or supplier..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleFilterChange('search', (e.target as HTMLInputElement).value);
                                    }
                                }}
                                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 outline-none focus:ring-2 focus:ring-teal-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Receipts Table */}
                <GlassCard className="p-0 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-xs uppercase font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                            <tr>
                                <th className="py-3.5 px-4">GRN No</th>
                                <th className="py-3.5 px-4">Received Date</th>
                                <th className="py-3.5 px-4">Supplier</th>
                                <th className="py-3.5 px-4">Invoice No</th>
                                <th className="py-3.5 px-4">Lines & Units</th>
                                <th className="py-3.5 px-4">Total Cost</th>
                                <th className="py-3.5 px-4">Status</th>
                                <th className="py-3.5 px-4">Created By</th>
                                <th className="py-3.5 px-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                            {receipts.data.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="py-14 text-center text-slate-400">
                                        No stock receipts found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                receipts.data.map((r) => {
                                    const isVoided = r.status === 'voided';

                                    return (
                                        <tr
                                            key={r.id}
                                            onClick={() => openReceiptDrawer(r.id)}
                                            className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                                        >
                                            <td className="py-3.5 px-4">
                                                <div className="font-mono font-bold text-teal-700 dark:text-teal-400">
                                                    {r.receipt_number}
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                                                {formatDateDMY(r.received_date)}
                                            </td>
                                            <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                                                {r.supplier_name}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                                                {r.invoice_number || '—'}
                                            </td>
                                            <td className="py-3.5 px-4 text-xs">
                                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                                    {r.lines_count} lines
                                                </span>
                                                <span className="text-slate-400 ml-1">
                                                    ({r.total_units_received} units)
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                                                {formatLKR(r.total_cost_cents)}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span
                                                    className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                                                        isVoided
                                                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                    }`}
                                                >
                                                    {isVoided ? 'Voided' : 'Received'}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 text-xs text-slate-500">
                                                {r.created_by_name}
                                            </td>
                                            <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    onClick={() => openReceiptDrawer(r.id)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                    title="View GRN details"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </GlassCard>
            </div>

            {/* DETAIL DRAWER */}
            {drawerOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
                    <div
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setDrawerOpen(false)}
                    />

                    <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl p-6 overflow-y-auto z-10 flex flex-col justify-between border-l border-slate-200 dark:border-slate-800">
                        <div className="space-y-6">
                            {/* Drawer Header */}
                            <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
                                <div>
                                    <div className="flex items-center gap-2.5">
                                        <h3 className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                                            {receiptDetails?.receipt?.receipt_number || 'GRN Details'}
                                        </h3>
                                        {receiptDetails?.receipt?.is_voided ? (
                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                                Voided
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                Active (Received)
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        Received on {formatDateDMY(receiptDetails?.receipt?.received_date)} by {receiptDetails?.receipt?.created_by_name}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setDrawerOpen(false)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {drawerLoading ? (
                                <div className="py-16 text-center text-slate-400">Loading GRN information...</div>
                            ) : (
                                <>
                                    {/* Voided Notice */}
                                    {receiptDetails?.receipt?.is_voided && (
                                        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 space-y-1">
                                            <div className="flex items-center gap-2 font-bold">
                                                <Ban className="w-4 h-4 text-rose-600 shrink-0" />
                                                <span>This GRN was VOIDED</span>
                                            </div>
                                            <p className="text-rose-700 dark:text-rose-300">
                                                Reason: {receiptDetails?.receipt?.void_reason || 'No reason provided'}
                                            </p>
                                            <p className="text-[11px] text-rose-500">
                                                Voided by {receiptDetails?.receipt?.voided_by_name || 'System'} on{' '}
                                                {formatDateDMY(receiptDetails?.receipt?.voided_at)}
                                            </p>
                                        </div>
                                    )}

                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Supplier</span>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                {receiptDetails?.receipt?.supplier_name || '—'}
                                            </span>
                                        </div>
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Invoice No</span>
                                            <span className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">
                                                {receiptDetails?.receipt?.invoice_number || '—'}
                                            </span>
                                        </div>
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold block">Total GRN Value</span>
                                            <span className="text-sm font-mono font-extrabold text-teal-600">
                                                {formatLKR(receiptDetails?.receipt?.total_cost_cents)}
                                            </span>
                                        </div>
                                    </div>

                                    {receiptDetails?.receipt?.notes && (
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs">
                                            <span className="text-[10px] text-slate-500 uppercase font-bold block mb-0.5">Notes</span>
                                            <p className="text-slate-700 dark:text-slate-300">{receiptDetails?.receipt?.notes}</p>
                                        </div>
                                    )}

                                    {/* Batches Table */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                            Received Items & Batches ({receiptDetails?.batches?.length || 0})
                                        </h4>

                                        <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-700">
                                                    <tr>
                                                        <th className="py-2.5 px-3">Medicine</th>
                                                        <th className="py-2.5 px-3">Batch No</th>
                                                        <th className="py-2.5 px-3">Expiry (DD/MM/YYYY)</th>
                                                        <th className="py-2.5 px-3">Qty (Rem/Rec)</th>
                                                        <th className="py-2.5 px-3">Cost/unit</th>
                                                        <th className="py-2.5 px-3">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                    {receiptDetails?.batches?.map((b: any) => (
                                                        <tr key={b.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                                                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                                                                {b.medicine_name}
                                                            </td>
                                                            <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                                                                {b.batch_number}
                                                            </td>
                                                            <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                                                                {formatDateDMY(b.expiry_date)}
                                                            </td>
                                                            <td className="py-2.5 px-3 font-mono">
                                                                <span className="font-bold text-slate-900 dark:text-white">
                                                                    {b.quantity_remaining}
                                                                </span>
                                                                <span className="text-slate-400">/{b.quantity_received}</span>
                                                            </td>
                                                            <td className="py-2.5 px-3 font-mono">
                                                                {formatLKR(b.cost_price_cents)}
                                                            </td>
                                                            <td className="py-2.5 px-3">
                                                                {b.is_voided ? (
                                                                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                                                        Voided
                                                                    </span>
                                                                ) : b.has_dispense ? (
                                                                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                                                                        Dispensed
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                                                        Active
                                                                    </span>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Void GRN Action Area */}
                                    {can('pharmacy.adjust_stock') && !receiptDetails?.receipt?.is_voided && (
                                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                            {receiptDetails?.receipt?.can_void ? (
                                                <div className="flex items-center justify-between p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900">
                                                    <div>
                                                        <span className="text-xs font-bold text-rose-900 dark:text-rose-200 block">
                                                            Void this GRN
                                                        </span>
                                                        <span className="text-[11px] text-rose-700 dark:text-rose-400">
                                                            Reverses remaining stock for all batches in this receipt and creates reversal movements.
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setVoidReason('');
                                                            setVoidError(null);
                                                            setVoidModalOpen(true);
                                                        }}
                                                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md transition-all inline-flex items-center gap-1.5 shrink-0 ml-3"
                                                    >
                                                        <Ban className="w-3.5 h-3.5" />
                                                        <span>Void GRN</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                                                    <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
                                                    <span>
                                                        This GRN cannot be voided because one or more batches have already been dispensed to patients.
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* VOID GRN MODAL */}
            <GlassModal
                isOpen={voidModalOpen}
                onClose={() => setVoidModalOpen(false)}
                title={`Void GRN: ${receiptDetails?.receipt?.receipt_number || ''}`}
                maxWidth="max-w-md"
            >
                <form onSubmit={handleVoidSubmit} className="space-y-4">
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
                        <strong>Warning:</strong> Voiding will set remaining quantities of all batches in this GRN to 0 and record reversal ledger movements. This action is irreversible.
                    </div>

                    <div>
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Mandatory Void Reason *
                        </label>
                        <textarea
                            value={voidReason}
                            onChange={(e) => setVoidReason(e.target.value)}
                            placeholder="e.g. Duplicate GRN entry, wrong delivery shipment returned to supplier..."
                            rows={3}
                            required
                            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                        />
                        {voidError && (
                            <p className="text-xs text-rose-600 mt-1 font-medium">{voidError}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setVoidModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={voidSubmitting || !voidReason.trim()}
                            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-sm shadow-md inline-flex items-center gap-1.5"
                        >
                            {voidSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            <span>Confirm Void GRN</span>
                        </button>
                    </div>
                </form>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
