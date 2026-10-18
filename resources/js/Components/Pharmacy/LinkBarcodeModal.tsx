import React, { useState, useEffect } from 'react';
import GlassModal from '@/Components/UI/GlassModal';
import { GlassLabel, GlassInput, GlassError } from '@/Components/UI/FormControls';
import {
    Barcode,
    Search,
    Package,
    Plus,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Building2,
    X,
} from 'lucide-react';

export interface LinkedBarcodeResult {
    barcode: string;
    pack_size: number;
    clinic_medicine_id?: number | null;
    brand_id: number;
    brand_name: string;
    variant_id: number;
    variant_display: string;
    generic_name: string;
    base_unit: string;
    status: 'pending' | 'approved' | string;
    message?: string;
}

interface BrandOption {
    id: number;
    brand_name: string;
    manufacturer: string | null;
    status: string;
}

interface CatalogSearchResult {
    source: string;
    in_stock: boolean;
    clinic_medicine_id: number | null;
    variant_id: number;
    brand_id: number | null;
    display_name: string;
    generic_name: string;
    strength_form: string;
    brand_name: string | null;
    base_unit: string;
}

interface LinkBarcodeModalProps {
    isOpen: boolean;
    barcode: string;
    onClose: () => void;
    onSuccess: (data: LinkedBarcodeResult) => void;
    title?: string;
    submitLabel?: string;
}

export default function LinkBarcodeModal({
    isOpen,
    barcode,
    onClose,
    onSuccess,
    title,
    submitLabel = 'Link Barcode',
}: LinkBarcodeModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<CatalogSearchResult[]>([]);
    const [searching, setSearching] = useState(false);

    // Selected medicine variant
    const [selectedVariant, setSelectedVariant] = useState<{
        variant_id: number;
        generic_name: string;
        strength_form: string;
        base_unit: string;
    } | null>(null);

    // Brands for the selected variant
    const [brands, setBrands] = useState<BrandOption[]>([]);
    const [loadingBrands, setLoadingBrands] = useState(false);
    const [brandMode, setBrandMode] = useState<'existing' | 'new'>('existing');
    const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
    const [newBrandName, setNewBrandName] = useState('');
    const [newManufacturer, setNewManufacturer] = useState('');

    // Pack size (default 1)
    const [packSize, setPackSize] = useState<number>(1);

    // UI state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset when modal opens with a new barcode
    useEffect(() => {
        if (isOpen) {
            setSearchQuery('');
            setSearchResults([]);
            setSelectedVariant(null);
            setBrands([]);
            setBrandMode('existing');
            setSelectedBrandId(null);
            setNewBrandName('');
            setNewManufacturer('');
            setPackSize(1);
            setError(null);
        }
    }, [isOpen, barcode]);

    // Debounced search to catalog
    useEffect(() => {
        if (!isOpen || selectedVariant) return;
        const q = searchQuery.trim();
        if (q.length < 2) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(() => {
            setSearching(true);
            fetch(`/pharmacy/catalog/search?q=${encodeURIComponent(q)}`)
                .then((res) => res.json())
                .then((data) => {
                    setSearchResults(data.results || []);
                })
                .catch(() => {
                    setSearchResults([]);
                })
                .finally(() => setSearching(false));
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, isOpen, selectedVariant]);

    // When variant is picked, fetch its existing brands
    const handleSelectVariant = (item: CatalogSearchResult) => {
        setSelectedVariant({
            variant_id: item.variant_id,
            generic_name: item.generic_name,
            strength_form: item.strength_form,
            base_unit: item.base_unit || 'tablet',
        });
        setSearchResults([]);
        setError(null);

        setLoadingBrands(true);
        fetch(`/pharmacy/variants/${item.variant_id}/brands`)
            .then((res) => res.json())
            .then((data) => {
                const list: BrandOption[] = data.brands || [];
                setBrands(list);

                // If user selected an item from search that already had a brand, auto-select it
                if (item.brand_id && list.some((b) => b.id === item.brand_id)) {
                    setBrandMode('existing');
                    setSelectedBrandId(item.brand_id);
                } else if (list.length > 0) {
                    setBrandMode('existing');
                    setSelectedBrandId(list[0].id);
                } else {
                    setBrandMode('new');
                    setSelectedBrandId(null);
                    if (item.brand_name) {
                        setNewBrandName(item.brand_name);
                    }
                }
            })
            .catch(() => {
                setBrands([]);
                setBrandMode('new');
            })
            .finally(() => setLoadingBrands(false));
    };

    // Submit linking
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedVariant) {
            setError('Please search the catalog and select a medicine variant.');
            return;
        }

        if (brandMode === 'existing' && !selectedBrandId) {
            setError('Please select an existing brand or choose "Add new brand".');
            return;
        }

        if (brandMode === 'new' && !newBrandName.trim()) {
            setError('Please enter the brand name.');
            return;
        }

        if (!packSize || packSize < 1) {
            setError('Pack size must be at least 1 base unit.');
            return;
        }

        setSubmitting(true);
        const csrfToken =
            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

        try {
            const payload: any = {
                barcode: barcode.trim(),
                pack_size: Number(packSize),
            };

            if (brandMode === 'existing' && selectedBrandId) {
                payload.medicine_brand_id = selectedBrandId;
            } else {
                payload.medicine_variant_id = selectedVariant.variant_id;
                payload.brand_name = newBrandName.trim();
                payload.manufacturer = newManufacturer.trim() || null;
            }

            const response = await fetch('/pharmacy/barcodes/link', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to link barcode.');
            }

            onSuccess(data);
            onClose();
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred while linking barcode.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={onClose}
            maxWidth="max-w-xl"
            title={
                <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                    <Barcode className="w-5 h-5 shrink-0" />
                    <span>{title || `Link Barcode ${barcode}`}</span>
                </div>
            }
            subtitle="Link this barcode to a medicine brand so it can be scanned into stock and GRNs"
        >
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                {/* Info / Amber Banner */}
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                        Barcode <strong className="font-mono text-amber-900 dark:text-amber-200">{barcode}</strong> is not yet linked to any brand in the catalog. Link it below to use it immediately in your clinic.
                    </div>
                </div>

                {error && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                {/* Step 1: Catalog Variant Search */}
                <div className="space-y-2">
                    <GlassLabel className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        1. Medicine & Dosage Variant *
                    </GlassLabel>

                    {selectedVariant ? (
                        <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <Package className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                                <div>
                                    <div className="text-sm font-bold text-teal-900 dark:text-teal-200">
                                        {selectedVariant.generic_name}
                                    </div>
                                    <div className="text-xs text-teal-700 dark:text-teal-400">
                                        {selectedVariant.strength_form} • Base unit: {selectedVariant.base_unit}
                                    </div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedVariant(null);
                                    setBrands([]);
                                    setSelectedBrandId(null);
                                }}
                                className="text-xs font-bold text-teal-700 dark:text-teal-300 hover:underline px-2 py-1 rounded"
                            >
                                Change
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search catalog (generic name, brand, synonym)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    autoFocus
                                    className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-amber-500 outline-none"
                                />
                                {searching && (
                                    <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 animate-spin" />
                                )}
                            </div>

                            {/* Dropdown Results */}
                            {searchResults.length > 0 && (
                                <div className="absolute top-full mt-1.5 left-0 right-0 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                                    {searchResults.map((item, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => handleSelectVariant(item)}
                                            className="w-full text-left px-3.5 py-2.5 hover:bg-amber-500/5 dark:hover:bg-amber-500/10 transition-colors flex items-center justify-between"
                                        >
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                                                    {item.display_name}
                                                </div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">
                                                    {item.generic_name} • {item.strength_form}
                                                    {item.brand_name ? ` • Brand: ${item.brand_name}` : ''}
                                                </div>
                                            </div>
                                            <Plus className="w-4 h-4 text-amber-500 shrink-0" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {searchQuery.trim().length >= 2 && !searching && searchResults.length === 0 && (
                                <div className="mt-1.5 p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 text-xs text-slate-500 text-center">
                                    No medicines found matching "{searchQuery}". Try generic name or active ingredient.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Step 2: Brand Selection (Barcodes must link to a brand) */}
                {selectedVariant && (
                    <div className="space-y-2.5 pt-1 border-t border-slate-200/70 dark:border-white/5">
                        <div className="flex items-center justify-between">
                            <GlassLabel className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-0">
                                2. Medicine Brand *
                            </GlassLabel>
                            <span className="text-[11px] text-slate-400">
                                Barcodes must link to a specific brand
                            </span>
                        </div>

                        {loadingBrands ? (
                            <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                                <span>Loading brands for {selectedVariant.generic_name}...</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {brands.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-4 text-xs font-medium text-slate-700 dark:text-slate-300">
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="brandMode"
                                                    checked={brandMode === 'existing'}
                                                    onChange={() => setBrandMode('existing')}
                                                    className="text-amber-500 focus:ring-amber-500"
                                                />
                                                <span>Choose existing brand ({brands.length})</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="brandMode"
                                                    checked={brandMode === 'new'}
                                                    onChange={() => setBrandMode('new')}
                                                    className="text-amber-500 focus:ring-amber-500"
                                                />
                                                <span>+ Add new brand</span>
                                            </label>
                                        </div>

                                        {brandMode === 'existing' && (
                                            <select
                                                value={selectedBrandId || ''}
                                                onChange={(e) => setSelectedBrandId(Number(e.target.value) || null)}
                                                className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:border-amber-500 outline-none"
                                            >
                                                <option value="">Select a brand...</option>
                                                {brands.map((b) => (
                                                    <option key={b.id} value={b.id}>
                                                        {b.brand_name} {b.manufacturer ? `(${b.manufacturer})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}

                                {(brandMode === 'new' || brands.length === 0) && (
                                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/5 space-y-2.5">
                                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5 text-amber-500" />
                                            <span>New Brand Information</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            <div>
                                                <GlassLabel htmlFor="newBrandName" className="text-[11px] mb-1">
                                                    Brand Name *
                                                </GlassLabel>
                                                <input
                                                    id="newBrandName"
                                                    type="text"
                                                    placeholder="e.g. Glucophage, Panadol"
                                                    value={newBrandName}
                                                    onChange={(e) => setNewBrandName(e.target.value)}
                                                    required={brandMode === 'new'}
                                                    className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                                                />
                                            </div>
                                            <div>
                                                <GlassLabel htmlFor="newManufacturer" className="text-[11px] mb-1">
                                                    Manufacturer (Optional)
                                                </GlassLabel>
                                                <input
                                                    id="newManufacturer"
                                                    type="text"
                                                    placeholder="e.g. Merck, GSK"
                                                    value={newManufacturer}
                                                    onChange={(e) => setNewManufacturer(e.target.value)}
                                                    className="w-full px-3 py-2 rounded-lg text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Pack Size */}
                {selectedVariant && (
                    <div className="space-y-1.5 pt-1 border-t border-slate-200/70 dark:border-white/5">
                        <GlassLabel htmlFor="packSize" className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            3. Pack Size (Base units per pack) *
                        </GlassLabel>
                        <div className="flex items-center gap-3">
                            <input
                                id="packSize"
                                type="number"
                                min={1}
                                value={packSize}
                                onChange={(e) => setPackSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className="w-28 px-3.5 py-2 rounded-xl text-sm font-bold bg-white/80 dark:bg-slate-900/60 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:border-amber-500"
                            />
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                {selectedVariant.base_unit || 'units'} per pack (e.g. 100 tablets/box).
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                            When this barcode is scanned during GRN, 1 pack (+{packSize} {selectedVariant.base_unit || 'units'}) will be added automatically.
                        </p>
                    </div>
                )}

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/70 dark:border-white/5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || !selectedVariant}
                        className="bg-amber-600 hover:bg-amber-700 text-white shadow-md shadow-amber-600/20 text-xs px-5 py-2 font-bold rounded-xl transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2"
                    >
                        {submitting ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Linking Barcode...</span>
                            </span>
                        ) : (
                            <span>{submitLabel}</span>
                        )}
                    </button>
                </div>
            </form>
        </GlassModal>
    );
}
