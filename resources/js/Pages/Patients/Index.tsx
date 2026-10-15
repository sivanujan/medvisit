import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import { EmptyState } from '@/Components/UI/EmptyState';
import { PhoneInput } from '@/Components/UI/PhoneInput';
import GlassSelect from '@/Components/UI/GlassSelect';
import {
    Users,
    Search,
    UserPlus,
    Phone,
    MapPin,
    AlertTriangle,
    Clock,
    Calendar,
    FileText,
    History,
    Shield,
    Edit3,
    CheckCircle2,
    Eye,
} from 'lucide-react';

interface PatientItem {
    id: number;
    name: string;
    phone: string;
    nic: string;
    email: string | null;
    gender: string;
    date_of_birth: string | null;
    age: number | null;
    district: string;
    city: string;
    address: string | null;
    allergies: string | null;
    notes: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    tokens_count: number;
    last_visit: string;
}

interface VisitHistoryItem {
    id: number;
    token_number: number;
    doctor_name: string;
    doctor_specialty: string;
    session_date: string;
    room_number: string;
    status: string;
    booked_via: string;
    estimated_time: string;
    receipt_number: string | null;
    total_amount_formatted: string;
    payment_status: string;
    created_at_formatted: string;
}

interface Props {
    patients: {
        data: PatientItem[];
        links: any[];
        total: number;
    };
    filters: {
        search: string;
        district: string | null;
    };
    districts: string[];
}

export default function PatientsIndex({ patients, filters, districts }: Props) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedDistrict, setSelectedDistrict] = useState(filters.district || '');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState<PatientItem | null>(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [activeHistoryPatient, setActiveHistoryPatient] = useState<any | null>(null);
    const [activeVisits, setActiveVisits] = useState<VisitHistoryItem[]>([]);

    const form = useForm({
        name: '',
        phone: '+94 ',
        nic: '',
        email: '',
        gender: 'male',
        date_of_birth: '',
        district: 'Colombo',
        city: 'Colombo',
        address: '',
        allergies: '',
        notes: '',
        emergency_contact_name: '',
        emergency_contact_phone: '',
    });

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get(
            '/patients',
            { search: searchQuery, district: selectedDistrict || undefined },
            { preserveState: true }
        );
    };

    const handleDistrictChange = (dist: string) => {
        setSelectedDistrict(dist);
        router.get(
            '/patients',
            { search: searchQuery, district: dist || undefined },
            { preserveState: true }
        );
    };

    const openCreateModal = () => {
        setEditingPatient(null);
        form.reset();
        form.setData({
            name: '',
            phone: '+94 ',
            nic: '',
            email: '',
            gender: 'male',
            date_of_birth: '',
            district: 'Colombo',
            city: 'Colombo',
            address: '',
            allergies: '',
            notes: '',
            emergency_contact_name: '',
            emergency_contact_phone: '',
        });
        setIsCreateModalOpen(true);
    };

    const openEditModal = (p: PatientItem) => {
        setEditingPatient(p);
        form.setData({
            name: p.name,
            phone: p.phone,
            nic: p.nic !== '—' ? p.nic : '',
            email: p.email || '',
            gender: p.gender || 'male',
            date_of_birth: p.date_of_birth || '',
            district: p.district || 'Colombo',
            city: p.city !== '—' ? p.city : '',
            address: p.address || '',
            allergies: p.allergies || '',
            notes: p.notes || '',
            emergency_contact_name: p.emergency_contact_name || '',
            emergency_contact_phone: p.emergency_contact_phone || '',
        });
        setIsCreateModalOpen(true);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingPatient) {
            form.put(`/patients/${editingPatient.id}`, {
                onSuccess: () => setIsCreateModalOpen(false),
            });
        } else {
            form.post('/patients', {
                onSuccess: () => setIsCreateModalOpen(false),
            });
        }
    };

    const viewHistory = async (p: PatientItem) => {
        setHistoryModalOpen(true);
        setHistoryLoading(true);
        setActiveHistoryPatient(p);
        setActiveVisits([]);

        try {
            const res = await fetch(`/patients/${p.id}/history`);
            if (res.ok) {
                const data = await res.json();
                setActiveHistoryPatient(data.patient);
                setActiveVisits(data.visits || []);
            }
        } catch (err) {
            console.error('History fetch error', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Patient Directory" />

            <div className="space-y-6">
                {/* Header */}
                <PageHeader
                    breadcrumbs={[
                        { label: 'Clinic Workspace', href: '/dashboard' },
                        { label: 'Patient Directory' },
                    ]}
                    title="Patient Directory"
                    subtitle="Search patients by national identity (NIC), phone, or district to view clinical history and past appointments."
                    actions={
                        <button
                            type="button"
                            onClick={openCreateModal}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm transition-all"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>Register Patient</span>
                        </button>
                    }
                />

                {/* Search & District Filter Bar */}
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by patient name, phone (+94), Sri Lankan NIC, or city..."
                            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="w-full sm:w-60">
                        <GlassSelect
                            value={selectedDistrict}
                            onChange={(e) => handleDistrictChange(e.target.value)}
                            placeholder={`All Sri Lankan Districts (${districts.length})`}
                            searchable={true}
                            options={[
                                { value: '', label: `All Sri Lankan Districts (${districts.length})` },
                                ...districts.map((d) => ({ value: d, label: `${d} District` })),
                            ]}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 transition-colors"
                    >
                        Filter
                    </button>
                </form>

                {/* Patient Directory Grid */}
                {patients.data.length === 0 ? (
                    <GlassCard className="py-8">
                        <EmptyState
                            icon={Users}
                            title={searchQuery || selectedDistrict ? 'No matching patients found' : 'No patients registered yet'}
                            description={searchQuery || selectedDistrict ? 'Try clearing your search query or district filter to view all patients.' : 'Register walk-in and channeling patients to maintain visit timelines, allergy alerts, and billing receipts.'}
                            action={
                                <button
                                    type="button"
                                    onClick={openCreateModal}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    <span>Register Patient</span>
                                </button>
                            }
                            guide={[
                                {
                                    step: 1,
                                    title: 'Register Profile',
                                    description: 'Enter patient name, mobile phone (+94), and optional NIC.',
                                },
                                {
                                    step: 2,
                                    title: 'Issue Tokens',
                                    description: 'Assign doctor appointments and generate thermal slips.',
                                },
                                {
                                    step: 3,
                                    title: 'Track History',
                                    description: 'Review complete timelines of past consultations and receipts.',
                                },
                            ]}
                        />
                    </GlassCard>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {patients.data.map((p) => (
                            <GlassCard
                                key={p.id}
                                hover
                                className="flex flex-col justify-between border-slate-200/80 dark:border-white/10 relative overflow-hidden"
                            >
                                <div>
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary/20 to-teal-500/20 text-primary font-black flex items-center justify-center text-sm border border-primary/20 shrink-0">
                                                {p.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                    {p.name}
                                                </h3>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {p.phone} {p.nic !== '—' ? `• NIC: ${p.nic}` : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Location & Demographics */}
                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                                        <span className="flex items-center gap-1 truncate">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            {p.city}, {p.district}
                                        </span>
                                        {p.age && <span>{p.age} yrs • {p.gender}</span>}
                                    </div>

                                    {/* Allergy warning badge if present */}
                                    {p.allergies && (
                                        <div className="mt-2.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/40 text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                            <span className="font-semibold line-clamp-1">
                                                Allergies: {p.allergies}
                                            </span>
                                        </div>
                                    )}

                                    {/* Notes snippet */}
                                    {p.notes && (
                                        <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                                            "{p.notes}"
                                        </p>
                                    )}
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs">
                                    <span className="text-[11px] text-slate-400">
                                        {p.tokens_count} visits • Last: {p.last_visit}
                                    </span>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => viewHistory(p)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-primary bg-primary-50 dark:bg-primary-950/40 hover:bg-primary-100 transition-colors"
                                            title="View Clinical History"
                                        >
                                            <History className="w-3.5 h-3.5" />
                                            <span>History</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => openEditModal(p)}
                                            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                            title="Edit Patient"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL 1: REGISTER / EDIT PATIENT */}
            <GlassModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={editingPatient ? `Edit ${editingPatient.name}` : 'Register New Patient'}
                subtitle="Enter national identity, contact, location, and clinical safety allergies"
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Patient Full Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder="e.g. Sunil Shantha"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Mobile Phone (+94) *
                            </label>
                            <PhoneInput
                                value={form.data.phone}
                                onChange={(normalized) => form.setData('phone', normalized)}
                                placeholder="7X XXX XXXX"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Sri Lankan NIC No.
                            </label>
                            <input
                                type="text"
                                value={form.data.nic}
                                onChange={(e) => form.setData('nic', e.target.value)}
                                placeholder="199012345678 or 901234567V"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Gender
                            </label>
                            <GlassSelect
                                value={form.data.gender}
                                onChange={(e) => form.setData('gender', e.target.value)}
                                options={[
                                    { value: 'male', label: 'Male' },
                                    { value: 'female', label: 'Female' },
                                    { value: 'other', label: 'Other' },
                                ]}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Date of Birth
                            </label>
                            <input
                                type="date"
                                value={form.data.date_of_birth}
                                onChange={(e) => form.setData('date_of_birth', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Sri Lankan District
                            </label>
                            <GlassSelect
                                value={form.data.district}
                                onChange={(e) => form.setData('district', e.target.value)}
                                placeholder="Select District (25)"
                                searchable={true}
                                options={districts.map((d) => ({ value: d, label: d }))}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Town / City
                            </label>
                            <input
                                type="text"
                                value={form.data.city}
                                onChange={(e) => form.setData('city', e.target.value)}
                                placeholder="e.g. Nugegoda / Dehiwala"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    {/* Allergies & Notes */}
                    <div className="p-3.5 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-rose-700 dark:text-rose-300 mb-1 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                Known Allergies (Drugs / Foods)
                            </label>
                            <input
                                type="text"
                                value={form.data.allergies}
                                onChange={(e) => form.setData('allergies', e.target.value)}
                                placeholder="e.g. Penicillin, Aspirin, Sulfa drugs, Peanuts"
                                className="w-full text-xs rounded-xl border border-rose-200 dark:border-rose-800/40 bg-white dark:bg-slate-900 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-rose-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Clinical Notes / Chronic Conditions
                            </label>
                            <textarea
                                rows={2}
                                value={form.data.notes}
                                onChange={(e) => form.setData('notes', e.target.value)}
                                placeholder="e.g. Type 2 Diabetic, Hypertensive on medication"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={form.processing}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md disabled:opacity-50"
                        >
                            {form.processing ? 'Saving...' : editingPatient ? 'Update Patient' : 'Save Patient'}
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* MODAL 2: PATIENT VISIT HISTORY TIMELINE & AUDIT TRAIL */}
            <GlassModal
                isOpen={historyModalOpen}
                onClose={() => setHistoryModalOpen(false)}
                title={activeHistoryPatient ? `Visit History: ${activeHistoryPatient.name}` : 'Visit History'}
                subtitle="Complete consultation visits, channeling records, and payments"
                maxWidth="max-w-3xl"
            >
                {activeHistoryPatient && (
                    <div className="space-y-4">
                        {/* Audit banner */}
                        <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/40 flex items-center justify-between text-xs text-blue-700 dark:text-blue-300">
                            <span className="flex items-center gap-1.5">
                                <Shield className="w-4 h-4" />
                                Audit Log: Access to this patient medical file has been recorded (patient.viewed).
                            </span>
                            <span className="font-mono text-[10px]">{activeHistoryPatient.phone}</span>
                        </div>

                        {/* Visit Table */}
                        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-slate-500 uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="py-2.5 px-3">Date</th>
                                        <th className="py-2.5 px-3">Token #</th>
                                        <th className="py-2.5 px-3">Doctor & Specialty</th>
                                        <th className="py-2.5 px-3">Est. Time</th>
                                        <th className="py-2.5 px-3">Status</th>
                                        <th className="py-2.5 px-3">Receipt & Billing</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {historyLoading ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-400">
                                                Loading patient visit records...
                                            </td>
                                        </tr>
                                    ) : activeVisits.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                                                No previous channeling visits recorded for this patient.
                                            </td>
                                        </tr>
                                    ) : (
                                        activeVisits.map((v) => (
                                            <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5">
                                                <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                                                    {v.session_date}
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                                                        #{v.token_number}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className="font-bold text-slate-900 dark:text-white block">
                                                        {v.doctor_name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {v.doctor_specialty} • {v.room_number}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                                    {v.estimated_time}
                                                </td>
                                                <td className="py-2.5 px-3 capitalize">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                                                        {v.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 px-3">
                                                    <span className="font-bold text-slate-900 dark:text-white block">
                                                        {v.total_amount_formatted}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400">
                                                        {v.receipt_number || 'No receipt'} • {v.payment_status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </GlassModal>
        </AuthenticatedLayout>
    );
}
