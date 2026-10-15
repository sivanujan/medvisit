import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import { Tabs } from '@/Components/UI/Tabs';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import GlassSelect from '@/Components/UI/GlassSelect';
import {
    Stethoscope,
    Calendar,
    CalendarPlus,
    Clock,
    Plus,
    Search,
    UserCheck,
    AlertCircle,
    Trash2,
    Edit2,
    CalendarX2,
    Sparkles,
    ShieldCheck,
    DollarSign,
    RefreshCw,
    User,
    CheckCircle2,
} from 'lucide-react';

interface DoctorData {
    id: number;
    name: string;
    title: string;
    full_title: string;
    specialty: string;
    slmc_number: string;
    phone: string | null;
    email: string | null;
    photo_url: string | null;
    bio: string | null;
    doctor_fee_lkr: number;
    clinic_fee_lkr: number;
    total_fee_lkr: number;
    total_fee_formatted: string;
    avg_consultation_minutes: number;
    is_active: boolean;
    user_id: number | null;
    user: { id: number; name: string; email: string } | null;
    templates_count: number;
    upcoming_sessions_count: number;
}

interface TemplateData {
    id: number;
    doctor_id: number;
    doctor_name: string;
    doctor_specialty: string;
    title: string;
    day_of_week: number;
    day_name: string;
    start_time: string;
    end_time: string;
    start_time_raw: string;
    end_time_raw: string;
    max_patients: number;
    room_number: string;
    mode: string;
    doctor_fee_cents: number | null;
    clinic_fee_cents: number | null;
    is_active: boolean;
}

interface LeaveData {
    id: number;
    doctor_id: number;
    doctor_name: string;
    doctor_specialty: string;
    start_date: string;
    end_date: string;
    start_date_formatted: string;
    end_date_formatted: string;
    reason: string;
}

interface UserOption {
    id: number;
    name: string;
    email: string;
}

interface Props {
    doctors: DoctorData[];
    templates: TemplateData[];
    leaves: LeaveData[];
    eligibleUsers: UserOption[];
    specialties: string[];
}

export default function DoctorsIndex({
    doctors,
    templates,
    leaves,
    eligibleUsers,
    specialties,
}: Props) {
    const [activeTab, setActiveTab] = useState<'doctors' | 'templates' | 'leaves'>('doctors');
    const [searchQuery, setSearchQuery] = useState('');
    const [specialtyFilter, setSpecialtyFilter] = useState('');

    // Modals
    const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState<DoctorData | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [isOneOffModalOpen, setIsOneOffModalOpen] = useState(false);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // Doctor Form
    const doctorForm = useForm({
        title: 'Dr.',
        name: '',
        specialty: specialties[0] || 'General Physician',
        slmc_number: '',
        phone: '',
        email: '',
        bio: '',
        doctor_fee_lkr: 2000,
        clinic_fee_lkr: 800,
        avg_consultation_minutes: 10,
        is_active: true,
        user_id: '' as string | number,
    });

    // Template Form
    const templateForm = useForm({
        doctor_id: doctors[0]?.id ? String(doctors[0].id) : '',
        title: 'Regular Channeling Session',
        day_of_week: 1, // Monday
        start_time: '17:00',
        end_time: '20:00',
        max_patients: 25,
        room_number: 'Consultation Suite 1',
        mode: 'token',
    });

    // One-Off Session Form
    const oneOffForm = useForm({
        doctor_id: doctors[0]?.id ? String(doctors[0].id) : '',
        session_date: new Date().toISOString().split('T')[0],
        start_time: '16:00',
        end_time: '19:00',
        max_tokens: 20,
        room_number: 'Consultation Suite 1',
        notes: '',
    });

    // Leave Form
    const leaveForm = useForm({
        doctor_id: doctors[0]?.id ? String(doctors[0].id) : '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date().toISOString().split('T')[0],
        reason: 'Annual Leave / CME Conference',
    });

    const openAddDoctor = () => {
        setEditingDoctor(null);
        doctorForm.reset();
        doctorForm.setData({
            title: 'Dr.',
            name: '',
            specialty: specialties[0] || 'General Physician',
            slmc_number: '',
            phone: '',
            email: '',
            bio: '',
            doctor_fee_lkr: 2000,
            clinic_fee_lkr: 800,
            avg_consultation_minutes: 10,
            is_active: true,
            user_id: '',
        });
        setIsDoctorModalOpen(true);
    };

    const openEditDoctor = (doc: DoctorData) => {
        setEditingDoctor(doc);
        doctorForm.setData({
            title: doc.title,
            name: doc.name,
            specialty: doc.specialty,
            slmc_number: doc.slmc_number,
            phone: doc.phone || '',
            email: doc.email || '',
            bio: doc.bio || '',
            doctor_fee_lkr: doc.doctor_fee_lkr,
            clinic_fee_lkr: doc.clinic_fee_lkr,
            avg_consultation_minutes: doc.avg_consultation_minutes,
            is_active: doc.is_active,
            user_id: doc.user_id ? String(doc.user_id) : '',
        });
        setIsDoctorModalOpen(true);
    };

    const handleDoctorSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDoctor) {
            doctorForm.put(`/doctors/${editingDoctor.id}`, {
                onSuccess: () => setIsDoctorModalOpen(false),
            });
        } else {
            doctorForm.post('/doctors', {
                onSuccess: () => setIsDoctorModalOpen(false),
            });
        }
    };

    const handleTemplateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        templateForm.post('/doctors/templates', {
            onSuccess: () => setIsTemplateModalOpen(false),
        });
    };

    const handleOneOffSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        oneOffForm.post('/doctors/sessions/one-off', {
            onSuccess: () => setIsOneOffModalOpen(false),
        });
    };

    const handleLeaveSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        leaveForm.post('/doctors/leaves', {
            onSuccess: () => setIsLeaveModalOpen(false),
        });
    };

    const toggleDoctorActive = (doc: DoctorData) => {
        router.patch(`/doctors/${doc.id}/toggle`, {}, { preserveScroll: true });
    };

    const deleteDoctor = (doc: DoctorData) => {
        if (confirm(`Are you sure you want to remove Dr. ${doc.name}?`)) {
            router.delete(`/doctors/${doc.id}`, { preserveScroll: true });
        }
    };

    const deleteTemplate = (id: number) => {
        if (confirm('Delete this weekly session template?')) {
            router.delete(`/doctors/templates/${id}`, { preserveScroll: true });
        }
    };

    const deleteLeave = (id: number) => {
        if (confirm('Delete this doctor leave entry?')) {
            router.delete(`/doctors/leaves/${id}`, { preserveScroll: true });
        }
    };

    const triggerGenerateSessions = () => {
        setIsGenerating(true);
        router.post(
            '/doctors/generate-sessions',
            {},
            {
                onFinish: () => setIsGenerating(false),
            }
        );
    };

    const filteredDoctors = doctors.filter((doc) => {
        const matchesSearch =
            doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.specialty.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.slmc_number.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesSpecialty = !specialtyFilter || doc.specialty === specialtyFilter;
        return matchesSearch && matchesSpecialty;
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <AuthenticatedLayout>
            <Head title="Doctors & Schedules" />

            <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/40">
                                Phase 2 Medical Roster
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
                            Doctors & Channeling Schedules
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Manage medical practitioners, SLMC verification credentials, consultation fee splits, and weekly schedules.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            type="button"
                            onClick={triggerGenerateSessions}
                            disabled={isGenerating}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors border border-slate-200/80 dark:border-white/10"
                            title="Populate upcoming 30 days from active weekly templates"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                            <span>{isGenerating ? 'Generating...' : 'Generate 30 Days'}</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsLeaveModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 transition-colors border border-amber-200/60 dark:border-amber-800/40"
                        >
                            <CalendarX2 className="w-3.5 h-3.5" />
                            <span>Log Leave</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsOneOffModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/40 text-teal-700 dark:text-teal-300 transition-colors border border-teal-200/60 dark:border-teal-800/40"
                        >
                            <CalendarPlus className="w-3.5 h-3.5" />
                            <span>One-Off Session</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setIsTemplateModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 transition-colors border border-indigo-200/60 dark:border-indigo-800/40"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Weekly Template</span>
                        </button>

                        <button
                            type="button"
                            onClick={openAddDoctor}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Add Doctor</span>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-4">
                    <Tabs
                        tabs={[
                            { id: 'doctors', label: 'Doctor Directory', count: doctors.length, icon: Stethoscope },
                            { id: 'templates', label: 'Weekly Templates', count: templates.length, icon: Calendar },
                            { id: 'leaves', label: 'Doctor Leave', count: leaves.length, icon: CalendarX2 },
                        ]}
                        activeTab={activeTab}
                        onChange={(id) => setActiveTab(id as any)}
                    />
                </div>

                {/* TAB 1: DOCTORS DIRECTORY */}
                {activeTab === 'doctors' && (
                    <div className="space-y-4">
                        {/* Search & Filter Bar */}
                        <div className="flex flex-col sm:flex-row items-center gap-3">
                            <div className="relative flex-1 w-full">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by doctor name, specialty, or SLMC reg number..."
                                    className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div className="w-full sm:w-60">
                                <GlassSelect
                                    value={specialtyFilter}
                                    onChange={(e) => setSpecialtyFilter(e.target.value)}
                                    placeholder={`All Specialties (${specialties.length})`}
                                    searchable={true}
                                    options={[
                                        { value: '', label: `All Specialties (${specialties.length})` },
                                        ...specialties.map((s) => ({ value: s, label: s })),
                                    ]}
                                />
                            </div>
                        </div>

                        {filteredDoctors.length === 0 ? (
                            <GlassCard className="text-center py-12">
                                <Stethoscope className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                                    No doctors found
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                                    Get started by onboarding your first specialist or general physician with their SLMC number and consultation fees.
                                </p>
                                <button
                                    type="button"
                                    onClick={openAddDoctor}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add Doctor Now</span>
                                </button>
                            </GlassCard>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {filteredDoctors.map((doc) => (
                                    <GlassCard
                                        key={doc.id}
                                        hover
                                        className="flex flex-col justify-between border-slate-200/80 dark:border-white/10 relative overflow-hidden"
                                    >
                                        {!doc.is_active && (
                                            <div className="absolute top-0 right-0 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl border-l border-b border-rose-500/20">
                                                Inactive
                                            </div>
                                        )}

                                        <div>
                                            <div className="flex items-start gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/20 to-teal-500/20 text-primary dark:text-primary-300 font-extrabold flex items-center justify-center text-base border border-primary/20 shrink-0">
                                                    {doc.name.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0 pr-6">
                                                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                                        {doc.full_title}
                                                    </h3>
                                                    <p className="text-xs font-semibold text-primary dark:text-primary-400">
                                                        {doc.specialty}
                                                    </p>
                                                    <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                                        <ShieldCheck className="w-3 h-3 text-emerald-500" />
                                                        <span>SLMC #{doc.slmc_number}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Details */}
                                            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-white/5 text-xs">
                                                <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/5">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                                        Channeling Fee
                                                    </span>
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        {doc.total_fee_formatted}
                                                    </span>
                                                    <span className="block text-[10px] text-slate-400 mt-0.5">
                                                        Doc: Rs. {doc.doctor_fee_lkr} | Clinic: Rs. {doc.clinic_fee_lkr}
                                                    </span>
                                                </div>

                                                <div className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-white/5">
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                                                        Avg Consult
                                                    </span>
                                                    <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                        {doc.avg_consultation_minutes} mins / patient
                                                    </span>
                                                    <span className="block text-[10px] text-slate-400 mt-0.5">
                                                        {doc.upcoming_sessions_count} upcoming sessions
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Linked user status */}
                                            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                <User className="w-3.5 h-3.5" />
                                                <span>
                                                    Portal Account:{' '}
                                                    <strong className="text-slate-700 dark:text-slate-200">
                                                        {doc.user ? doc.user.name : 'Not Linked'}
                                                    </strong>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Card Actions */}
                                        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                                            <button
                                                type="button"
                                                onClick={() => toggleDoctorActive(doc)}
                                                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
                                                    doc.is_active
                                                        ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100'
                                                        : 'text-slate-500 bg-slate-100 dark:bg-white/10 hover:bg-slate-200'
                                                }`}
                                            >
                                                {doc.is_active ? 'Active' : 'Inactive'}
                                            </button>

                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditDoctor(doc)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary-50 dark:hover:bg-primary-950/40 transition-colors"
                                                    title="Edit Doctor"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteDoctor(doc)}
                                                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                    title="Remove Doctor"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </GlassCard>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: WEEKLY RECURRING TEMPLATES */}
                {activeTab === 'templates' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Weekly templates automatically materialize into dated sessions for the next 30 days via daily cron.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsTemplateModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Template</span>
                            </button>
                        </div>

                        {templates.length === 0 ? (
                            <GlassCard className="text-center py-12">
                                <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                                    No weekly templates configured
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                                    Define recurring day/time schedules for your doctors to automate monthly calendar booking blocks.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => setIsTemplateModalOpen(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Create Template</span>
                                </button>
                            </GlassCard>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="py-3 px-4">Doctor</th>
                                            <th className="py-3 px-4">Template Title</th>
                                            <th className="py-3 px-4">Day of Week</th>
                                            <th className="py-3 px-4">Timing</th>
                                            <th className="py-3 px-4">Max Patients</th>
                                            <th className="py-3 px-4">Room</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {templates.map((tpl) => (
                                            <tr key={tpl.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="py-3 px-4">
                                                    <span className="font-bold text-slate-900 dark:text-white block">
                                                        {tpl.doctor_name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {tpl.doctor_specialty}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                                    {tpl.title}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300">
                                                        {tpl.day_name}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                                                    {tpl.start_time} – {tpl.end_time}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                                    {tpl.max_patients} tokens
                                                </td>
                                                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                                                    {tpl.room_number}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteTemplate(tpl.id)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                        title="Delete Template"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: DOCTOR LEAVES */}
                {activeTab === 'leaves' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                When a doctor is on leave, unbooked template sessions are automatically cancelled and booking is blocked.
                            </p>
                            <button
                                type="button"
                                onClick={() => setIsLeaveModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Record Leave</span>
                            </button>
                        </div>

                        {leaves.length === 0 ? (
                            <GlassCard className="text-center py-12">
                                <CalendarX2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                                    No active doctor leave logged
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                                    All doctors are currently on active duty with standard weekly channeling availability.
                                </p>
                            </GlassCard>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="py-3 px-4">Doctor</th>
                                            <th className="py-3 px-4">Start Date</th>
                                            <th className="py-3 px-4">End Date</th>
                                            <th className="py-3 px-4">Reason</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {leaves.map((l) => (
                                            <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="py-3 px-4">
                                                    <span className="font-bold text-slate-900 dark:text-white block">
                                                        {l.doctor_name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">
                                                        {l.doctor_specialty}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                                    {l.start_date_formatted}
                                                </td>
                                                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                                    {l.end_date_formatted}
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                    {l.reason}
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteLeave(l.id)}
                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                        title="Delete Leave Record"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL 1: ADD / EDIT DOCTOR */}
            <GlassModal
                isOpen={isDoctorModalOpen}
                onClose={() => setIsDoctorModalOpen(false)}
                title={editingDoctor ? `Edit ${editingDoctor.full_title}` : 'Add New Doctor'}
                subtitle="Enter official SLMC registration details, consultation fees, and profile info"
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleDoctorSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Title
                            </label>
                            <GlassSelect
                                value={doctorForm.data.title}
                                onChange={(e) => doctorForm.setData('title', e.target.value)}
                                options={[
                                    { value: 'Dr.', label: 'Dr.' },
                                    { value: 'Prof.', label: 'Prof.' },
                                    { value: 'Dr. (Mrs)', label: 'Dr. (Mrs)' },
                                    { value: 'Dr. (Miss)', label: 'Dr. (Miss)' },
                                ]}
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Doctor's Full Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={doctorForm.data.name}
                                onChange={(e) => doctorForm.setData('name', e.target.value)}
                                placeholder="e.g. K. Sivakumar"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                            {doctorForm.errors.name && (
                                <p className="text-[11px] text-rose-500 mt-0.5">{doctorForm.errors.name}</p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Medical Specialty *
                            </label>
                            <input
                                list="specialty-suggestions"
                                required
                                value={doctorForm.data.specialty}
                                onChange={(e) => doctorForm.setData('specialty', e.target.value)}
                                placeholder="Select or type specialty..."
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                            <datalist id="specialty-suggestions">
                                {specialties.map((s) => (
                                    <option key={s} value={s} />
                                ))}
                            </datalist>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                SLMC Registration Number *
                            </label>
                            <input
                                type="text"
                                required
                                value={doctorForm.data.slmc_number}
                                onChange={(e) => doctorForm.setData('slmc_number', e.target.value)}
                                placeholder="e.g. 23849"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                            {doctorForm.errors.slmc_number && (
                                <p className="text-[11px] text-rose-500 mt-0.5">{doctorForm.errors.slmc_number}</p>
                            )}
                        </div>
                    </div>

                    {/* Fees & Time */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-primary" />
                            Consultation Fees & Time Allocation
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Doctor Fee (LKR) *
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    required
                                    value={doctorForm.data.doctor_fee_lkr}
                                    onChange={(e) => doctorForm.setData('doctor_fee_lkr', parseFloat(e.target.value) || 0)}
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Clinic Fee (LKR) *
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    required
                                    value={doctorForm.data.clinic_fee_lkr}
                                    onChange={(e) => doctorForm.setData('clinic_fee_lkr', parseFloat(e.target.value) || 0)}
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Avg Consult (Mins) *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="120"
                                    required
                                    value={doctorForm.data.avg_consultation_minutes}
                                    onChange={(e) => doctorForm.setData('avg_consultation_minutes', parseInt(e.target.value) || 10)}
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                />
                            </div>
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                            Total Channeling Fee to Patient:{' '}
                            <strong className="text-primary font-bold">
                                Rs. {(Number(doctorForm.data.doctor_fee_lkr) + Number(doctorForm.data.clinic_fee_lkr)).toFixed(2)}
                            </strong>
                        </div>
                    </div>

                    {/* Contact & Linkage */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Contact Phone
                            </label>
                            <input
                                type="text"
                                value={doctorForm.data.phone}
                                onChange={(e) => doctorForm.setData('phone', e.target.value)}
                                placeholder="+94 77 123 4567"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Link to Clinic User Account
                            </label>
                            <GlassSelect
                                value={doctorForm.data.user_id}
                                onChange={(e) => doctorForm.setData('user_id', e.target.value)}
                                placeholder="-- No User Account Linked --"
                                options={[
                                    { value: '', label: '-- No User Account Linked --' },
                                    ...eligibleUsers.map((u) => ({
                                        value: u.id,
                                        label: `${u.name} (${u.email})`,
                                    })),
                                ]}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Doctor Bio / Qualifications
                        </label>
                        <textarea
                            rows={2}
                            value={doctorForm.data.bio}
                            onChange={(e) => doctorForm.setData('bio', e.target.value)}
                            placeholder="e.g. MBBS (Colombo), MD (Cardiology), FRCP (UK) - Senior Consultant"
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="is_active_checkbox"
                            checked={doctorForm.data.is_active}
                            onChange={(e) => doctorForm.setData('is_active', e.target.checked)}
                            className="rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <label htmlFor="is_active_checkbox" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Doctor is active and accepting channeled appointments
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsDoctorModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={doctorForm.processing}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md disabled:opacity-50"
                        >
                            {doctorForm.processing ? 'Saving...' : editingDoctor ? 'Update Doctor' : 'Save Doctor'}
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* MODAL 2: ADD WEEKLY TEMPLATE */}
            <GlassModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                title="Create Weekly Recurring Template"
                subtitle="Populates channeling appointments automatically every week for the chosen day"
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleTemplateSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Select Doctor *
                        </label>
                        <GlassSelect
                            value={templateForm.data.doctor_id}
                            onChange={(e) => templateForm.setData('doctor_id', e.target.value)}
                            placeholder="Select Doctor"
                            options={doctors.map((d) => ({
                                value: d.id,
                                label: `${d.full_title} (${d.specialty})`,
                            }))}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Template Title *
                        </label>
                        <input
                            type="text"
                            required
                            value={templateForm.data.title}
                            onChange={(e) => templateForm.setData('title', e.target.value)}
                            placeholder="e.g. Evening Consultation"
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Day of Week *
                            </label>
                            <GlassSelect
                                value={templateForm.data.day_of_week}
                                onChange={(e) => templateForm.setData('day_of_week', parseInt(e.target.value))}
                                options={dayNames.map((day, idx) => ({
                                    value: idx,
                                    label: day,
                                }))}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Start Time *
                            </label>
                            <input
                                type="time"
                                required
                                value={templateForm.data.start_time}
                                onChange={(e) => templateForm.setData('start_time', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                End Time *
                            </label>
                            <input
                                type="time"
                                required
                                value={templateForm.data.end_time}
                                onChange={(e) => templateForm.setData('end_time', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Maximum Patients / Tokens *
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="200"
                                required
                                value={templateForm.data.max_patients}
                                onChange={(e) => templateForm.setData('max_patients', parseInt(e.target.value) || 25)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Room / Suite
                            </label>
                            <input
                                type="text"
                                value={templateForm.data.room_number}
                                onChange={(e) => templateForm.setData('room_number', e.target.value)}
                                placeholder="Suite 1"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsTemplateModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={templateForm.processing}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md disabled:opacity-50"
                        >
                            {templateForm.processing ? 'Saving...' : 'Save & Generate 30 Days'}
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* MODAL 3: ONE-OFF SESSION */}
            <GlassModal
                isOpen={isOneOffModalOpen}
                onClose={() => setIsOneOffModalOpen(false)}
                title="Create One-Off Channeling Session"
                subtitle="Schedule a special consultation session on a specific calendar date"
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleOneOffSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Doctor *
                        </label>
                        <GlassSelect
                            value={oneOffForm.data.doctor_id}
                            onChange={(e) => oneOffForm.setData('doctor_id', e.target.value)}
                            placeholder="Select Doctor"
                            options={doctors.map((d) => ({
                                value: d.id,
                                label: `${d.full_title} (${d.specialty})`,
                            }))}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Session Date *
                            </label>
                            <input
                                type="date"
                                required
                                value={oneOffForm.data.session_date}
                                onChange={(e) => oneOffForm.setData('session_date', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                            {oneOffForm.errors.session_date && (
                                <p className="text-[11px] text-rose-500 mt-0.5">{oneOffForm.errors.session_date}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Start Time *
                            </label>
                            <input
                                type="time"
                                required
                                value={oneOffForm.data.start_time}
                                onChange={(e) => oneOffForm.setData('start_time', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                End Time *
                            </label>
                            <input
                                type="time"
                                required
                                value={oneOffForm.data.end_time}
                                onChange={(e) => oneOffForm.setData('end_time', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Maximum Tokens *
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="200"
                                required
                                value={oneOffForm.data.max_tokens}
                                onChange={(e) => oneOffForm.setData('max_tokens', parseInt(e.target.value) || 20)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Room / Suite
                            </label>
                            <input
                                type="text"
                                value={oneOffForm.data.room_number}
                                onChange={(e) => oneOffForm.setData('room_number', e.target.value)}
                                placeholder="Consultation Suite 1"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Session Notes (Optional)
                        </label>
                        <input
                            type="text"
                            value={oneOffForm.data.notes}
                            onChange={(e) => oneOffForm.setData('notes', e.target.value)}
                            placeholder="e.g. Special weekend clinic"
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsOneOffModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={oneOffForm.processing}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-md disabled:opacity-50"
                        >
                            {oneOffForm.processing ? 'Creating...' : 'Create Session'}
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* MODAL 4: RECORD LEAVE */}
            <GlassModal
                isOpen={isLeaveModalOpen}
                onClose={() => setIsLeaveModalOpen(false)}
                title="Log Doctor Leave"
                subtitle="Block bookings and automatically cancel empty recurring sessions in this window"
                maxWidth="max-w-md"
            >
                <form onSubmit={handleLeaveSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Doctor *
                        </label>
                        <GlassSelect
                            value={leaveForm.data.doctor_id}
                            onChange={(e) => leaveForm.setData('doctor_id', e.target.value)}
                            placeholder="Select Doctor"
                            options={doctors.map((d) => ({
                                value: d.id,
                                label: `${d.full_title} (${d.specialty})`,
                            }))}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Start Date *
                            </label>
                            <input
                                type="date"
                                required
                                value={leaveForm.data.start_date}
                                onChange={(e) => leaveForm.setData('start_date', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                End Date *
                            </label>
                            <input
                                type="date"
                                required
                                value={leaveForm.data.end_date}
                                onChange={(e) => leaveForm.setData('end_date', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Reason / Description
                        </label>
                        <input
                            type="text"
                            value={leaveForm.data.reason}
                            onChange={(e) => leaveForm.setData('reason', e.target.value)}
                            placeholder="e.g. Overseas Conference / Medical Leave"
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setIsLeaveModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={leaveForm.processing}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md disabled:opacity-50"
                        >
                            {leaveForm.processing ? 'Saving...' : 'Record Leave'}
                        </button>
                    </div>
                </form>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
