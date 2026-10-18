import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import GlassCard from '@/Components/UI/GlassCard';
import GlassModal from '@/Components/UI/GlassModal';
import { GlassInput, GlassLabel, GlassError, GlassTextarea, GlassCheckbox } from '@/Components/UI/FormControls';
import { useDebounce } from '@/Hooks/useDebounce';
import {
    Truck,
    Search,
    Plus,
    Edit2,
    Phone,
    Mail,
    MapPin,
    Package,
    Receipt,
    CheckCircle2,
    XCircle,
    ArrowLeft,
    Power,
} from 'lucide-react';

interface SupplierItem {
    id: number;
    name: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    notes?: string | null;
    is_active: boolean;
    receipts_count: number;
    batches_count: number;
}

interface Props {
    suppliers: {
        data: SupplierItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    filters: {
        search: string;
    };
}

export default function SuppliersIndex({ suppliers, filters }: Props) {
    const [search, setSearch] = useState(filters.search || '');
    const debouncedSearch = useDebounce(search, 300);

    // Modal state for Add/Edit
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);

    // Form inputs
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    const [isActive, setIsActive] = useState(true);

    const [submitting, setSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Filter effect
    React.useEffect(() => {
        if (debouncedSearch !== (filters.search || '')) {
            router.get(
                route('tenant.pharmacy.suppliers'),
                { search: debouncedSearch },
                { preserveState: true, replace: true }
            );
        }
    }, [debouncedSearch]);

    const handleOpenCreate = () => {
        setEditingSupplier(null);
        setName('');
        setPhone('');
        setEmail('');
        setAddress('');
        setNotes('');
        setIsActive(true);
        setErrors({});
        setModalOpen(true);
    };

    const handleOpenEdit = (sup: SupplierItem) => {
        setEditingSupplier(sup);
        setName(sup.name);
        setPhone(sup.phone || '');
        setEmail(sup.email || '');
        setAddress(sup.address || '');
        setNotes(sup.notes || '');
        setIsActive(sup.is_active);
        setErrors({});
        setModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});

        const payload = {
            name: name.trim(),
            phone: phone.trim() || null,
            email: email.trim() || null,
            address: address.trim() || null,
            notes: notes.trim() || null,
            is_active: isActive,
        };

        if (editingSupplier) {
            router.put(
                route('tenant.pharmacy.suppliers.update', editingSupplier.id),
                payload,
                {
                    preserveScroll: true,
                    onSuccess: () => setModalOpen(false),
                    onError: (errs) => setErrors(errs),
                    onFinish: () => setSubmitting(false),
                }
            );
        } else {
            router.post(
                route('tenant.pharmacy.suppliers.store'),
                payload,
                {
                    preserveScroll: true,
                    onSuccess: () => setModalOpen(false),
                    onError: (errs) => setErrors(errs),
                    onFinish: () => setSubmitting(false),
                }
            );
        }
    };

    const handleToggleActive = (sup: SupplierItem) => {
        router.patch(
            route('tenant.pharmacy.suppliers.toggle', sup.id),
            {},
            { preserveScroll: true }
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title="Suppliers — Pharmacy" />

            <div className="max-w-6xl mx-auto space-y-6 pb-20">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link
                            href={route('tenant.pharmacy.medicines')}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Truck className="w-6 h-6 text-primary" />
                                Pharmacy Suppliers
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Manage pharmaceutical distributors, contact details, and procurement history
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium text-sm flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Add Supplier
                    </button>
                </div>

                {/* Filter Bar */}
                <GlassCard className="p-4 flex items-center justify-between gap-4">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search suppliers by name, phone, email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm bg-white/80 dark:bg-slate-900/60 border border-slate-200/90 dark:border-white/10 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-primary outline-none"
                        />
                    </div>

                    <div className="text-xs text-slate-500">
                        Total {suppliers.total} supplier{suppliers.total === 1 ? '' : 's'}
                    </div>
                </GlassCard>

                {/* Suppliers Table */}
                <GlassCard className="p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200/70 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-slate-500">
                                    <th className="px-5 py-3.5">Supplier Name</th>
                                    <th className="px-5 py-3.5">Contact Details</th>
                                    <th className="px-5 py-3.5">Procurement Stats</th>
                                    <th className="px-5 py-3.5 text-center">Status</th>
                                    <th className="px-5 py-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/50 dark:divide-white/5 text-sm">
                                {suppliers.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-500">
                                            <Truck className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                            No suppliers found. Click "Add Supplier" to create one.
                                        </td>
                                    </tr>
                                ) : (
                                    suppliers.data.map((sup) => (
                                        <tr
                                            key={sup.id}
                                            className="hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="font-bold text-slate-900 dark:text-white">
                                                    {sup.name}
                                                </div>
                                                {sup.address && (
                                                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                        <MapPin className="w-3 h-3 shrink-0" />
                                                        <span className="truncate max-w-xs">{sup.address}</span>
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="space-y-1 text-xs">
                                                    {sup.phone ? (
                                                        <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                                            <span>{sup.phone}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-400">No phone</span>
                                                    )}
                                                    {sup.email && (
                                                        <div className="flex items-center gap-1.5 text-slate-500">
                                                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                                                            <span>{sup.email}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <Receipt className="w-3.5 h-3.5 text-primary" />
                                                        <span>{sup.receipts_count} GRNs</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Package className="w-3.5 h-3.5 text-emerald-500" />
                                                        <span>{sup.batches_count} Batches</span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="px-5 py-4 text-center">
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                                                        sup.is_active
                                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                            : 'bg-slate-200 dark:bg-white/10 text-slate-500'
                                                    }`}
                                                >
                                                    {sup.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>

                                            <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEdit(sup)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                                        title="Edit Supplier"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleActive(sup)}
                                                        className={`p-1.5 rounded-lg transition-colors ${
                                                            sup.is_active
                                                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10'
                                                                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10'
                                                        }`}
                                                        title={sup.is_active ? 'Deactivate' : 'Activate'}
                                                    >
                                                        <Power className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {suppliers.last_page > 1 && (
                        <div className="p-4 border-t border-slate-200/70 dark:border-white/5 flex items-center justify-between text-xs text-slate-500">
                            <div>
                                Page {suppliers.current_page} of {suppliers.last_page}
                            </div>
                            <div className="flex items-center gap-1">
                                {suppliers.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        preserveScroll
                                        className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                                            link.active
                                                ? 'bg-primary text-white'
                                                : link.url
                                                ? 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'
                                                : 'text-slate-300 dark:text-slate-600 pointer-events-none'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </GlassCard>
            </div>

            {/* Add / Edit Supplier Modal */}
            <GlassModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Add New Supplier'}
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <GlassLabel htmlFor="supName" required>
                            Supplier / Company Name
                        </GlassLabel>
                        <GlassInput
                            id="supName"
                            placeholder="e.g. Astron Limited, Hemas Pharmaceuticals"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                        {errors.name && <GlassError message={errors.name} />}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <GlassLabel htmlFor="supPhone">Phone Number</GlassLabel>
                            <GlassInput
                                id="supPhone"
                                placeholder="+94 11 234 5678"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                            {errors.phone && <GlassError message={errors.phone} />}
                        </div>

                        <div>
                            <GlassLabel htmlFor="supEmail">Email Address</GlassLabel>
                            <GlassInput
                                id="supEmail"
                                type="email"
                                placeholder="orders@distributor.lk"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            {errors.email && <GlassError message={errors.email} />}
                        </div>
                    </div>

                    <div>
                        <GlassLabel htmlFor="supAddress">Address</GlassLabel>
                        <GlassInput
                            id="supAddress"
                            placeholder="123 Galle Road, Colombo 03"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                        />
                        {errors.address && <GlassError message={errors.address} />}
                    </div>

                    <div>
                        <GlassLabel htmlFor="supNotes">Internal Notes</GlassLabel>
                        <GlassTextarea
                            id="supNotes"
                            placeholder="Payment terms, contact person, delivery notes..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                        />
                        {errors.notes && <GlassError message={errors.notes} />}
                    </div>

                    {editingSupplier && (
                        <div className="pt-2">
                            <GlassCheckbox
                                id="supIsActive"
                                label="Active supplier (can receive new stock)"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                            />
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/70 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !name.trim()}
                            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-semibold shadow-lg shadow-primary/25 disabled:opacity-50 transition-all"
                        >
                            {submitting ? 'Saving...' : editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                        </button>
                    </div>
                </form>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
