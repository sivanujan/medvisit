import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ShieldAlert, Check, Layers } from 'lucide-react';

export interface BatchItemOption {
    id: number;
    batch_number: string;
    expiry_date: string;
    expiry_date_iso?: string;
    quantity_remaining: number;
    cost_price_cents: number;
    is_near_expiry?: boolean;
}

export interface BatchAllocationEntry {
    batch_id: number;
    batch_number: string;
    expiry_date: string;
    quantity: number;
    is_near_expiry?: boolean;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    medicineName: string;
    prescribedQuantity: number;
    availableBatches: BatchItemOption[];
    currentAllocations: BatchAllocationEntry[];
    onSave: (newAllocations: BatchAllocationEntry[]) => void;
}

export default function BatchChangeModal({
    isOpen,
    onClose,
    medicineName,
    prescribedQuantity,
    availableBatches,
    currentAllocations,
    onSave,
}: Props) {
    if (!isOpen) return null;

    // Track qty allocated per batch ID
    const [allocations, setAllocations] = useState<Record<number, number>>({});

    useEffect(() => {
        const initial: Record<number, number> = {};
        currentAllocations.forEach((alloc) => {
            if (alloc.batch_id) {
                initial[alloc.batch_id] = alloc.quantity;
            }
        });
        setAllocations(initial);
    }, [currentAllocations]);

    const handleQtyChange = (batchId: number, qty: number, maxQty: number) => {
        const safeQty = Math.max(0, Math.min(qty, maxQty));
        setAllocations((prev) => ({
            ...prev,
            [batchId]: safeQty,
        }));
    };

    const totalAllocated = Object.values(allocations).reduce((sum, val) => sum + (val || 0), 0);

    const handleApply = () => {
        const result: BatchAllocationEntry[] = [];
        availableBatches.forEach((b) => {
            const qty = allocations[b.id] || 0;
            if (qty > 0) {
                result.push({
                    batch_id: b.id,
                    batch_number: b.batch_number,
                    expiry_date: b.expiry_date,
                    quantity: qty,
                    is_near_expiry: b.is_near_expiry,
                });
            }
        });
        onSave(result);
        onClose();
    };

    const todayDate = new Date().toISOString().split('T')[0];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-lg w-full p-6 space-y-5 my-8">
                {/* Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                            <Layers className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Change Batch Allocation
                            </h3>
                            <p className="text-xs text-slate-500">
                                {medicineName} · Prescribed: {prescribedQuantity} units
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Instructions */}
                <p className="text-xs text-slate-500">
                    Batches are sorted in FEFO order (earliest expiry first). Expired batches are blocked from dispensing.
                </p>

                {/* Batch list */}
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {availableBatches.length === 0 ? (
                        <div className="p-6 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                            No batches available in inventory for this medicine.
                        </div>
                    ) : (
                        availableBatches.map((batch) => {
                            const isExpired = batch.expiry_date_iso && batch.expiry_date_iso < todayDate;
                            const isNearExpiry = batch.is_near_expiry && !isExpired;
                            const currentQty = allocations[batch.id] || 0;

                            return (
                                <div
                                    key={batch.id}
                                    className={`p-3.5 rounded-2xl border transition-all ${
                                        isExpired
                                            ? 'border-rose-200/80 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20 opacity-60'
                                            : currentQty > 0
                                            ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/40'
                                    }`}
                                >
                                    <div className="flex items-center justify-between gap-3 mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                                Batch: {batch.batch_number}
                                            </span>

                                            {isExpired && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200 flex items-center gap-1">
                                                    <ShieldAlert className="w-3 h-3" />
                                                    Expired (Blocked)
                                                </span>
                                            )}

                                            {isNearExpiry && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    Near expiry (&lt; 90d)
                                                </span>
                                            )}
                                        </div>

                                        <span className="text-[11px] text-slate-500 font-medium">
                                            Available: <strong>{batch.quantity_remaining}</strong>
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-[11px] text-slate-500">
                                            Expires: <strong className={isNearExpiry ? 'text-amber-600 dark:text-amber-400' : isExpired ? 'text-rose-600' : ''}>{batch.expiry_date}</strong>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                                Qty to take:
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={batch.quantity_remaining}
                                                disabled={Boolean(isExpired)}
                                                value={currentQty}
                                                onChange={(e) =>
                                                    handleQtyChange(
                                                        batch.id,
                                                        parseInt(e.target.value) || 0,
                                                        batch.quantity_remaining
                                                    )
                                                }
                                                className="w-20 px-2 py-1 text-xs font-bold text-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 disabled:opacity-40"
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Total Tally */}
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/60 flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-600 dark:text-slate-400">Total Allocated:</span>
                    <span
                        className={`font-black ${
                            totalAllocated === prescribedQuantity
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : totalAllocated < prescribedQuantity
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-primary'
                        }`}
                    >
                        {totalAllocated} / {prescribedQuantity} units
                    </span>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleApply}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 flex items-center gap-1.5"
                    >
                        <Check className="w-4 h-4" />
                        <span>Apply Batches</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
