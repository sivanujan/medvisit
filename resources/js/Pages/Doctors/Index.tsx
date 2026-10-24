import React, { useState, useMemo } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import { Tabs } from '@/Components/UI/Tabs';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import { EmptyState } from '@/Components/UI/EmptyState';
import GlassSelect from '@/Components/UI/GlassSelect';
import { PhoneInput } from '@/Components/UI/PhoneInput';
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
    Layers,
    Info,
    ChevronDown,
    LayoutGrid,
    List,
    Building,
    Copy,
    Check,
    Upload,
    Camera,
    MoreVertical,
    MoreHorizontal,
    ExternalLink,
    Filter,
    ShieldAlert,
    Power,
    MapPin,
    ArrowUpDown,
    CheckCircle,
} from 'lucide-react';
import ImageUploaderModal from '@/Components/Media/ImageUploaderModal';
import {
    DOCTOR_PALETTE,
    getDoctorColor,
    cleanSlmcNumber,
    formatSlmcDisplay,
} from '@/Utils/doctorColors';

// Sub-modals
import GenerateSessionsModal from './Components/GenerateSessionsModal';
import LogLeaveModal from './Components/LogLeaveModal';
import DuplicateTemplateModal from './Components/DuplicateTemplateModal';
import DeleteTemplateModal from './Components/DeleteTemplateModal';
import DeleteDoctorModal from './Components/DeleteDoctorModal';

interface DoctorData {
    id: number;
    name: string;
    title: string;
    full_title: string;
    specialty: string;
    slmc_number: string;
    slmc_clean?: string;
    slmc_display?: string;
    slug?: string;
    booking_url?: string;
    phone: string | null;
    email: string | null;
    photo_url: string | null;
    bio: string | null;
    color?: {
        id: number;
        bg: string;
        border: string;
        text: string;
        badge: string;
        hex: string;
        name: string;
        gradient: string;
    };
    doctor_fee_lkr: number;
    clinic_fee_lkr: number;
    total_fee_lkr: number;
    total_fee_formatted: string;
    use_clinic_default_fees?: boolean;
    pricing_mode?: 'split' | 'single';
    payout_rule?: {
        type: string;
        value: number;
        min_patients?: number;
    };
    visit_type_overrides?: Record<string, any>;
    avg_consultation_minutes: number;
    is_active: boolean;
    user_id: number | null;
    user: { id: number; name: string; email: string } | null;
    templates_count: number;
    upcoming_sessions_count: number;
    next_session?: string | null;
    template_days?: number[];
    has_history?: boolean;
}

interface TemplateData {
    id: number;
    doctor_id: number;
    doctor_name: string;
    doctor_specialty: string;
    doctor_color?: {
        id: number;
        bg: string;
        border: string;
        text: string;
        badge: string;
        hex: string;
        name: string;
        gradient: string;
    };
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
    fee_override_type?: 'inherit' | 'custom';
    custom_doctor_fee_lkr?: number | null;
    custom_clinic_fee_lkr?: number | null;
    is_active: boolean;
    future_sessions_count?: number;
}

interface LeaveData {
    id: number;
    doctor_id: number;
    doctor_name: string;
    doctor_specialty: string;
    doctor_color?: {
        id: number;
        bg: string;
        border: string;
        text: string;
        badge: string;
        hex: string;
        name: string;
        gradient: string;
    };
    start_date: string;
    end_date: string;
    start_date_formatted: string;
    end_date_formatted: string;
    days_count?: number;
    reason: string;
    affected_sessions_count?: number;
    affected_tokens_count?: number;
    is_upcoming?: boolean;
}

interface UserOption {
    id: number;
    name: string;
    email: string;
}

interface VisitTypeItem {
    id: number;
    name: string;
    code: string;
    pricing_type: string;
    percentage_value: number;
    fixed_fee_cents: number;
    is_default: boolean;
}

interface LastGeneratedInfo {
    last_generated_at: string | null;
    last_generated_formatted: string | null;
    furthest_date: string | null;
    furthest_date_formatted: string | null;
    has_scheduled_job: boolean;
    scheduled_job_note: string;
}

interface Props {
    doctors: DoctorData[];
    templates: TemplateData[];
    leaves: LeaveData[];
    eligibleUsers: UserOption[];
    specialties: string[];
    feeSettings?: {
        pricing_mode: 'split' | 'single';
        default_doctor_fee_lkr: number;
        default_clinic_fee_lkr: number;
        default_total_fee_lkr: number;
        default_payout_rule: {
            type: string;
            value: number;
            min_patients?: number;
        };
    };
    visitTypes?: VisitTypeItem[];
    lastGeneratedInfo?: LastGeneratedInfo;
}

interface DoctorFormData {
    title: string;
    name: string;
    specialty: string;
    slmc_number: string;
    phone: string;
    email: string;
    bio: string;
    use_clinic_default_fees: boolean;
    pricing_mode: string;
    doctor_fee_lkr: number;
    clinic_fee_lkr: number;
    total_fee_lkr: number;
    payout_rule: {
        type: string;
        value: number;
        min_patients?: number;
    };
    visit_type_overrides: Record<string, any>;
    avg_consultation_minutes: number;
    is_active: boolean;
    user_id: string | number;
}

const WEEK_DAYS = [
    { id: 1, label: 'Monday', short: 'Mon', dot: 'M' },
    { id: 2, label: 'Tuesday', short: 'Tue', dot: 'T' },
    { id: 3, label: 'Wednesday', short: 'Wed', dot: 'W' },
    { id: 4, label: 'Thursday', short: 'Thu', dot: 'T' },
    { id: 5, label: 'Friday', short: 'Fri', dot: 'F' },
    { id: 6, label: 'Saturday', short: 'Sat', dot: 'S' },
    { id: 0, label: 'Sunday', short: 'Sun', dot: 'S' },
];

export default function DoctorsIndex({
    doctors,
    templates,
    leaves,
    eligibleUsers,
    specialties,
    feeSettings,
    visitTypes = [],
    lastGeneratedInfo,
}: Props) {
    const [activeTab, setActiveTab] = useState<'doctors' | 'templates' | 'leaves'>('doctors');

    // Tab 1 filters & view state
    const [searchQuery, setSearchQuery] = useState('');
    const [specialtyFilter, setSpecialtyFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
    const [doctorViewMode, setDoctorViewMode] = useState<'grid' | 'table'>('grid');
    const [doctorSortKey, setDoctorSortKey] = useState<'name' | 'specialty' | 'fee'>('name');
    const [doctorSortOrder, setDoctorSortOrder] = useState<'asc' | 'desc'>('asc');
    const [copiedDoctorId, setCopiedDoctorId] = useState<number | null>(null);

    // Tab 2 view state
    const [templateViewMode, setTemplateViewMode] = useState<'calendar' | 'table'>('calendar');
    const [templateDoctorFilter, setTemplateDoctorFilter] = useState<string>('all');

    // Header More dropdown state
    const [isHeaderMoreOpen, setIsHeaderMoreOpen] = useState(false);
    const [activeActionMenuDoctorId, setActiveActionMenuDoctorId] = useState<number | null>(null);

    // Modals
    const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState<DoctorData | null>(null);
    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null);
    const [isOneOffModalOpen, setIsOneOffModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
    const [selectedTemplateForDuplicate, setSelectedTemplateForDuplicate] = useState<TemplateData | null>(null);
    const [isDeleteTemplateModalOpen, setIsDeleteTemplateModalOpen] = useState(false);
    const [selectedTemplateForDelete, setSelectedTemplateForDelete] = useState<TemplateData | null>(null);
    const [isDeleteDoctorModalOpen, setIsDeleteDoctorModalOpen] = useState(false);
    const [selectedDoctorForDelete, setSelectedDoctorForDelete] = useState<DoctorData | null>(null);
    const [isDoctorPhotoModalOpen, setIsDoctorPhotoModalOpen] = useState(false);
    const [selectedDoctorForPhoto, setSelectedDoctorForPhoto] = useState<DoctorData | null>(null);

    // Toast feedback state
    const [toast, setToast] = useState<{ type: 'success' | 'amber' | 'error'; message: string } | null>(null);

    const showToast = (message: string, type: 'success' | 'amber' | 'error' = 'success') => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 4000);
    };

    const defaultMode = feeSettings?.pricing_mode || 'split';
    const defDoc = feeSettings?.default_doctor_fee_lkr ?? 2000;
    const defClinic = feeSettings?.default_clinic_fee_lkr ?? 800;
    const defTotal = feeSettings?.default_total_fee_lkr ?? (defDoc + defClinic);

    // Specialties ONLY in use with counts
    const inUseSpecialties = useMemo(() => {
        const counts: Record<string, number> = {};
        doctors.forEach((doc) => {
            if (doc.specialty) {
                counts[doc.specialty] = (counts[doc.specialty] || 0) + 1;
            }
        });
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [doctors]);

    // Doctor Form
    const doctorForm = useForm<DoctorFormData>({
        title: 'Dr.',
        name: '',
        specialty: specialties[0] || 'General Physician',
        slmc_number: '',
        phone: '',
        email: '',
        bio: '',
        use_clinic_default_fees: true,
        pricing_mode: defaultMode,
        doctor_fee_lkr: defDoc,
        clinic_fee_lkr: defClinic,
        total_fee_lkr: defTotal,
        payout_rule: {
            type: 'use_clinic_default',
            value: 0,
            min_patients: 0,
        },
        visit_type_overrides: {} as Record<string, any>,
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
        fee_override_type: 'inherit' as 'inherit' | 'custom',
        custom_doctor_fee_lkr: '',
        custom_clinic_fee_lkr: '',
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
        fee_override_type: 'inherit' as 'inherit' | 'custom',
        custom_doctor_fee_lkr: '',
        custom_clinic_fee_lkr: '',
    });

    // Handlers
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
            use_clinic_default_fees: true,
            pricing_mode: defaultMode,
            doctor_fee_lkr: defDoc,
            clinic_fee_lkr: defClinic,
            total_fee_lkr: defTotal,
            payout_rule: {
                type: 'use_clinic_default',
                value: 0,
                min_patients: 0,
            },
            visit_type_overrides: {},
            avg_consultation_minutes: 15,
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
            slmc_number: cleanSlmcNumber(doc.slmc_number),
            phone: doc.phone || '',
            email: doc.email || '',
            bio: doc.bio || '',
            use_clinic_default_fees: doc.use_clinic_default_fees ?? true,
            pricing_mode: (doc.pricing_mode as any) || defaultMode,
            doctor_fee_lkr: doc.doctor_fee_lkr ?? defDoc,
            clinic_fee_lkr: doc.clinic_fee_lkr ?? defClinic,
            total_fee_lkr: doc.total_fee_lkr ?? ((doc.doctor_fee_lkr ?? defDoc) + (doc.clinic_fee_lkr ?? defClinic)),
            payout_rule: doc.payout_rule
                ? {
                      type: doc.payout_rule.type || 'use_clinic_default',
                      value: doc.payout_rule.value || 0,
                      min_patients: doc.payout_rule.min_patients ?? 0,
                  }
                : { type: 'use_clinic_default', value: 0, min_patients: 0 },
            visit_type_overrides: (doc.visit_type_overrides as any) || {},
            avg_consultation_minutes: doc.avg_consultation_minutes || 15,
            is_active: doc.is_active,
            user_id: doc.user_id ? String(doc.user_id) : '',
        });
        setIsDoctorModalOpen(true);
    };

    const handleDoctorSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingDoctor) {
            doctorForm.put(`/doctors/${editingDoctor.id}`, {
                onSuccess: () => {
                    setIsDoctorModalOpen(false);
                    showToast(`Dr. ${doctorForm.data.name} updated successfully.`);
                },
            });
        } else {
            doctorForm.post('/doctors', {
                onSuccess: () => {
                    setIsDoctorModalOpen(false);
                    showToast(`Dr. ${doctorForm.data.name} added to directory.`);
                },
            });
        }
    };

    const openAddTemplate = () => {
        setEditingTemplate(null);
        templateForm.reset();
        templateForm.setData({
            doctor_id: templateDoctorFilter !== 'all' ? templateDoctorFilter : doctors[0]?.id ? String(doctors[0].id) : '',
            title: 'Regular Channeling Session',
            day_of_week: 1,
            start_time: '17:00',
            end_time: '20:00',
            max_patients: 25,
            room_number: 'Consultation Suite 1',
            mode: 'token',
            fee_override_type: 'inherit',
            custom_doctor_fee_lkr: '',
            custom_clinic_fee_lkr: '',
        });
        setIsTemplateModalOpen(true);
    };

    const openAddTemplateForDay = (dayOfWeek: number) => {
        setEditingTemplate(null);
        templateForm.reset();
        templateForm.setData({
            doctor_id: templateDoctorFilter !== 'all' ? templateDoctorFilter : doctors[0]?.id ? String(doctors[0].id) : '',
            title: 'Regular Channeling Session',
            day_of_week: dayOfWeek,
            start_time: '17:00',
            end_time: '20:00',
            max_patients: 25,
            room_number: 'Consultation Suite 1',
            mode: 'token',
            fee_override_type: 'inherit',
            custom_doctor_fee_lkr: '',
            custom_clinic_fee_lkr: '',
        });
        setIsTemplateModalOpen(true);
    };

    const openEditTemplate = (tpl: TemplateData) => {
        setEditingTemplate(tpl);
        templateForm.setData({
            doctor_id: String(tpl.doctor_id),
            title: tpl.title,
            day_of_week: tpl.day_of_week,
            start_time: tpl.start_time_raw,
            end_time: tpl.end_time_raw,
            max_patients: tpl.max_patients,
            room_number: tpl.room_number,
            mode: tpl.mode,
            fee_override_type: tpl.fee_override_type || 'inherit',
            custom_doctor_fee_lkr: tpl.custom_doctor_fee_lkr ? String(tpl.custom_doctor_fee_lkr) : '',
            custom_clinic_fee_lkr: tpl.custom_clinic_fee_lkr ? String(tpl.custom_clinic_fee_lkr) : '',
        });
        setIsTemplateModalOpen(true);
    };

    const handleTemplateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingTemplate) {
            templateForm.put(`/doctors/templates/${editingTemplate.id}`, {
                onSuccess: () => {
                    setIsTemplateModalOpen(false);
                    showToast('Template updated successfully.');
                },
            });
        } else {
            templateForm.post('/doctors/templates', {
                onSuccess: () => {
                    setIsTemplateModalOpen(false);
                    showToast('Weekly template created successfully.');
                },
            });
        }
    };

    const handleOneOffSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        oneOffForm.post('/doctors/sessions/one-off', {
            onSuccess: () => {
                setIsOneOffModalOpen(false);
                showToast('One-off channeling session scheduled.');
            },
        });
    };

    const toggleDoctorActive = (doc: DoctorData) => {
        router.patch(`/doctors/${doc.id}/toggle`, {}, {
            preserveScroll: true,
            onSuccess: () => {
                showToast(
                    doc.is_active
                        ? `Dr. ${doc.name} deactivated.`
                        : `Dr. ${doc.name} activated.`
                );
            },
        });
    };

    const copyDoctorBookingLink = (doc: DoctorData) => {
        const url = doc.booking_url || `${window.location.origin}/book/${doc.slug || doc.id}`;
        navigator.clipboard.writeText(url);
        setCopiedDoctorId(doc.id);
        setTimeout(() => setCopiedDoctorId(null), 2500);
    };

    const deleteLeave = (leaveId: number) => {
        if (confirm('Delete this doctor leave record?')) {
            router.delete(`/doctors/leaves/${leaveId}`, {
                preserveScroll: true,
                onSuccess: () => showToast('Leave record removed.'),
            });
        }
    };

    // Filter & sort doctors
    const filteredDoctors = useMemo(() => {
        return doctors
            .filter((doc) => {
                const search = searchQuery.toLowerCase().trim();
                const cleanSlmc = cleanSlmcNumber(doc.slmc_number).toLowerCase();
                const matchesSearch =
                    !search ||
                    doc.name.toLowerCase().includes(search) ||
                    doc.specialty.toLowerCase().includes(search) ||
                    cleanSlmc.includes(search);

                const matchesSpecialty = !specialtyFilter || doc.specialty === specialtyFilter;

                const matchesStatus =
                    statusFilter === 'all' ||
                    (statusFilter === 'active' && doc.is_active) ||
                    (statusFilter === 'inactive' && !doc.is_active);

                return matchesSearch && matchesSpecialty && matchesStatus;
            })
            .sort((a, b) => {
                if (doctorSortKey === 'name') {
                    return doctorSortOrder === 'asc'
                        ? a.name.localeCompare(b.name)
                        : b.name.localeCompare(a.name);
                }
                if (doctorSortKey === 'specialty') {
                    return doctorSortOrder === 'asc'
                        ? a.specialty.localeCompare(b.specialty)
                        : b.specialty.localeCompare(a.specialty);
                }
                if (doctorSortKey === 'fee') {
                    return doctorSortOrder === 'asc'
                        ? a.total_fee_lkr - b.total_fee_lkr
                        : b.total_fee_lkr - a.total_fee_lkr;
                }
                return 0;
            });
    }, [doctors, searchQuery, specialtyFilter, statusFilter, doctorSortKey, doctorSortOrder]);

    // Templates filtered by doctor
    const filteredTemplates = useMemo(() => {
        if (templateDoctorFilter === 'all') return templates;
        return templates.filter((tpl) => String(tpl.doctor_id) === templateDoctorFilter);
    }, [templates, templateDoctorFilter]);

    // Templates by day of week (0=Sun, 1=Mon, ..., 6=Sat)
    const templatesByDay = useMemo(() => {
        const map: Record<number, TemplateData[]> = {
            0: [],
            1: [],
            2: [],
            3: [],
            4: [],
            5: [],
            6: [],
        };
        filteredTemplates.forEach((tpl) => {
            if (map[tpl.day_of_week]) {
                map[tpl.day_of_week].push(tpl);
            }
        });
        return map;
    }, [filteredTemplates]);

    return (
        <AuthenticatedLayout>
            <Head title="Doctors & schedules" />

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-slate-900/90 dark:bg-slate-100/90 text-white dark:text-slate-900 shadow-2xl backdrop-blur-md border border-white/10 dark:border-slate-800/20 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <CheckCircle className="w-4 h-4 text-[#0E9E8F] shrink-0" />
                    <span>{toast.message}</span>
                </div>
            )}

            <div className="space-y-6">
                {/* Header */}
                <PageHeader
                    breadcrumbs={[
                        { label: 'Workspace', href: '/dashboard' },
                        { label: 'Doctors & schedules' },
                    ]}
                    title="Doctors & schedules"
                    subtitle="Your doctors, their fees and weekly channeling times."
                    actions={
                        <div className="relative flex items-center gap-2">
                            {/* TAB 1: Doctor directory primary action */}
                            {activeTab === 'doctors' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={openAddDoctor}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1E6FD9] hover:bg-blue-600 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Add doctor</span>
                                    </button>
                                </>
                            )}

                            {/* TAB 2: Weekly templates primary action + More */}
                            {activeTab === 'templates' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={openAddTemplate}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1E6FD9] hover:bg-blue-600 shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span>Add template</span>
                                    </button>

                                    {/* More menu */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsHeaderMoreOpen((prev) => !prev)}
                                            className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                            title="More schedule options"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>

                                        {isHeaderMoreOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-20"
                                                    onClick={() => setIsHeaderMoreOpen(false)}
                                                />
                                                <div className="absolute right-0 mt-1.5 w-56 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200/80 dark:border-white/10 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsHeaderMoreOpen(false);
                                                            setIsGenerateModalOpen(true);
                                                        }}
                                                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#1E6FD9]/10 hover:text-[#1E6FD9] transition-colors text-left"
                                                    >
                                                        <Sparkles className="w-4 h-4 text-[#1E6FD9]" />
                                                        <span>Generate sessions…</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsHeaderMoreOpen(false);
                                                            setIsOneOffModalOpen(true);
                                                        }}
                                                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#0E9E8F]/10 hover:text-[#0E9E8F] transition-colors text-left"
                                                    >
                                                        <CalendarPlus className="w-4 h-4 text-[#0E9E8F]" />
                                                        <span>One-off session</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* TAB 3: Doctor leave primary action + More */}
                            {activeTab === 'leaves' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setIsLeaveModalOpen(true)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#FF7A59] hover:bg-[#e06848] shadow-md shadow-orange-500/20 transition-all cursor-pointer"
                                    >
                                        <CalendarX2 className="w-4 h-4" />
                                        <span>Log leave</span>
                                    </button>

                                    {/* More menu */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setIsHeaderMoreOpen((prev) => !prev)}
                                            className="p-2 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                                            title="More options"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>

                                        {isHeaderMoreOpen && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-20"
                                                    onClick={() => setIsHeaderMoreOpen(false)}
                                                />
                                                <div className="absolute right-0 mt-1.5 w-52 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200/80 dark:border-white/10 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsHeaderMoreOpen(false);
                                                            setIsOneOffModalOpen(true);
                                                        }}
                                                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-[#0E9E8F]/10 hover:text-[#0E9E8F] transition-colors text-left"
                                                    >
                                                        <CalendarPlus className="w-4 h-4 text-[#0E9E8F]" />
                                                        <span>One-off session</span>
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    }
                />

                {/* Tabs Segmented Control */}
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-4">
                    <Tabs
                        tabs={[
                            { id: 'doctors', label: 'Doctor directory', count: doctors.length, icon: Stethoscope },
                            { id: 'templates', label: 'Weekly templates', count: templates.length, icon: Calendar },
                            { id: 'leaves', label: 'Doctor leave', count: leaves.length, icon: CalendarX2 },
                        ]}
                        activeTab={activeTab}
                        onChange={(id) => setActiveTab(id as any)}
                    />
                </div>

                {/* ========================================================= */}
                {/* TAB 1: DOCTOR DIRECTORY                                  */}
                {/* ========================================================= */}
                {activeTab === 'doctors' && (
                    <div className="space-y-4">
                        {/* Toolbar: Search, in-use specialties filter, status filter, grid/table view toggle */}
                        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-3 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 backdrop-blur-md">
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
                                {/* Search input */}
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search by name, specialty, or SLMC number..."
                                        className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/60 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]"
                                    />
                                </div>

                                {/* Specialty filter: ONLY specialties IN USE with counts */}
                                <div className="w-full sm:w-60">
                                    <GlassSelect
                                        value={specialtyFilter}
                                        onChange={(e) => setSpecialtyFilter(e.target.value)}
                                        placeholder={`All specialties (${doctors.length})`}
                                        searchable={true}
                                        options={[
                                            { value: '', label: `All specialties (${doctors.length})` },
                                            ...inUseSpecialties.map((s) => ({
                                                value: s.name,
                                                label: `${s.name} (${s.count})`,
                                            })),
                                        ]}
                                    />
                                </div>

                                {/* Status filter (Active / Inactive) */}
                                <div className="w-full sm:w-36">
                                    <GlassSelect
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as any)}
                                        options={[
                                            { value: 'all', label: 'All status' },
                                            { value: 'active', label: 'Active only' },
                                            { value: 'inactive', label: 'Inactive only' },
                                        ]}
                                    />
                                </div>
                            </div>

                            {/* View toggle (Grid / Table) */}
                            <div className="flex items-center justify-end gap-1.5 self-end lg:self-auto">
                                <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setDoctorViewMode('grid')}
                                        className={`p-1.5 rounded-lg transition-all ${
                                            doctorViewMode === 'grid'
                                                ? 'bg-white dark:bg-slate-800 text-[#1E6FD9] shadow-xs'
                                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                        title="Grid view"
                                    >
                                        <LayoutGrid className="w-4 h-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDoctorViewMode('table')}
                                        className={`p-1.5 rounded-lg transition-all ${
                                            doctorViewMode === 'table'
                                                ? 'bg-white dark:bg-slate-800 text-[#1E6FD9] shadow-xs'
                                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                        title="Table view"
                                    >
                                        <List className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* DOCTOR CARDS (Grid view): 3 per row on ≥1440px, 2 on laptop, 1 on mobile */}
                        {doctorViewMode === 'grid' && (
                            <>
                                {filteredDoctors.length === 0 ? (
                                    <EmptyState
                                        icon={Stethoscope}
                                        title="No doctors found"
                                        description={
                                            searchQuery || specialtyFilter || statusFilter !== 'all'
                                                ? 'Try adjusting your search query or filters to find doctors.'
                                                : 'Add your first doctor to begin scheduling channeling appointments.'
                                        }
                                        action={
                                            <button
                                                type="button"
                                                onClick={openAddDoctor}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1E6FD9] hover:bg-blue-600 shadow-sm transition-all"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>Add your first doctor</span>
                                            </button>
                                        }
                                    />
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 min-[1440px]:grid-cols-3 gap-5">
                                        {filteredDoctors.map((doc) => {
                                            const docColor = doc.color || getDoctorColor(doc.id);
                                            const slmcDisplay = doc.slmc_display || formatSlmcDisplay(doc.slmc_number);
                                            const cleanSlmc = doc.slmc_clean || cleanSlmcNumber(doc.slmc_number);

                                            // Two-tone fee split bar calculation
                                            const docFee = doc.doctor_fee_lkr || 0;
                                            const clinicFee = doc.clinic_fee_lkr || 0;
                                            const totalFee = doc.total_fee_lkr || (docFee + clinicFee) || 1;
                                            const docPct = Math.min(100, Math.max(10, Math.round((docFee / totalFee) * 100)));
                                            const clinicPct = 100 - docPct;

                                            // Mini weekly pattern lit dots (M T W T F S S)
                                            const activeDays = doc.template_days || [];

                                            return (
                                                <GlassCard
                                                    key={doc.id}
                                                    className="flex flex-col justify-between p-5 hover:shadow-lg transition-all duration-200 border-slate-200/80 dark:border-white/10"
                                                >
                                                    <div className="space-y-4">
                                                        {/* Header: Photo / initial avatar, name, specialty, verified SLMC */}
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                {/* Avatar */}
                                                                <div className="relative shrink-0">
                                                                    {doc.photo_url ? (
                                                                        <img
                                                                            src={doc.photo_url}
                                                                            alt={doc.full_title}
                                                                            className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-200 dark:ring-white/10 shadow-xs"
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-base shadow-xs"
                                                                            style={{ backgroundColor: docColor.hex }}
                                                                        >
                                                                            {doc.name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="min-w-0">
                                                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                                        {doc.full_title}
                                                                    </h3>
                                                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                                                                        {doc.specialty}
                                                                    </p>
                                                                    {cleanSlmc && (
                                                                        <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-[#0E9E8F] dark:text-teal-400">
                                                                            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                                                                            <span>{slmcDisplay}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Status badge pill */}
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                    doc.is_active
                                                                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                                                        : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                                                                }`}
                                                            >
                                                                {doc.is_active ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </div>

                                                        {/* Fee Block: Total large, split bar, override tag */}
                                                        <div className="p-3 rounded-2xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-2">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                                                                        Consultation fee
                                                                    </span>
                                                                    <div className="text-base font-extrabold text-slate-900 dark:text-white">
                                                                        {doc.total_fee_formatted}
                                                                    </div>
                                                                </div>

                                                                {!doc.use_clinic_default_fees && (
                                                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1E6FD9]/10 text-[#1E6FD9] dark:bg-blue-500/20 dark:text-blue-300 border border-[#1E6FD9]/30 uppercase tracking-wide">
                                                                        Override
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Two-tone split bar */}
                                                            <div className="space-y-1">
                                                                <div className="h-1.5 w-full rounded-full flex overflow-hidden bg-slate-200 dark:bg-white/10">
                                                                    <div
                                                                        className="bg-[#1E6FD9] transition-all"
                                                                        style={{ width: `${docPct}%` }}
                                                                        title={`Doctor: Rs. ${docFee.toLocaleString()}`}
                                                                    />
                                                                    <div
                                                                        className="bg-[#0E9E8F] transition-all"
                                                                        style={{ width: `${clinicPct}%` }}
                                                                        title={`Clinic: Rs. ${clinicFee.toLocaleString()}`}
                                                                    />
                                                                </div>
                                                                <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                                                    <span>Doctor {docFee.toLocaleString()}</span>
                                                                    <span>Clinic {clinicFee.toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Stats row: Average consult, upcoming sessions, next session */}
                                                        <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                                                            <div className="p-2 rounded-xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5">
                                                                <span className="text-[10px] font-semibold text-slate-400 block truncate">
                                                                    Avg consult
                                                                </span>
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                                    {doc.avg_consultation_minutes || 15} min
                                                                </span>
                                                            </div>
                                                            <div className="p-2 rounded-xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5">
                                                                <span className="text-[10px] font-semibold text-slate-400 block truncate">
                                                                    Next 30 days
                                                                </span>
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                                                    {doc.upcoming_sessions_count || 0} sess
                                                                </span>
                                                            </div>
                                                            <div className="p-2 rounded-xl bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200/50 dark:border-white/5">
                                                                <span className="text-[10px] font-semibold text-slate-400 block truncate">
                                                                    Next session
                                                                </span>
                                                                <span
                                                                    className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate block"
                                                                    title={doc.next_session || 'None'}
                                                                >
                                                                    {doc.next_session ? doc.next_session.split('·')[0].trim() : 'None'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Mini weekly pattern: 7 small day dots (M T W T F S S) */}
                                                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/50 dark:border-white/5">
                                                            <span className="text-[10px] font-semibold text-slate-400">
                                                                Weekly roster:
                                                            </span>
                                                            <div className="flex items-center gap-1.5">
                                                                {WEEK_DAYS.map((d) => {
                                                                    const isLit = activeDays.includes(d.id);
                                                                    return (
                                                                        <div
                                                                            key={d.id}
                                                                            className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold transition-all ${
                                                                                isLit
                                                                                    ? 'text-white shadow-2xs font-extrabold'
                                                                                    : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600'
                                                                            }`}
                                                                            style={isLit ? { backgroundColor: docColor.hex } : undefined}
                                                                            title={`${d.label}: ${isLit ? 'Active template' : 'No templates'}`}
                                                                        >
                                                                            {d.dot}
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Footer actions: Copy booking link, Edit, "…" menu */}
                                                    <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-200/80 dark:border-white/10">
                                                        <button
                                                            type="button"
                                                            onClick={() => copyDoctorBookingLink(doc)}
                                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                                                copiedDoctorId === doc.id
                                                                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                                                                    : 'bg-white/80 dark:bg-white/5 border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10'
                                                            }`}
                                                        >
                                                            {copiedDoctorId === doc.id ? (
                                                                <>
                                                                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                                    <span>Copied</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                                                                    <span>Copy booking link</span>
                                                                </>
                                                            )}
                                                        </button>

                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditDoctor(doc)}
                                                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                                                            >
                                                                Edit
                                                            </button>

                                                            {/* Doctor "…" Action Menu */}
                                                            <div className="relative">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setActiveActionMenuDoctorId(
                                                                            activeActionMenuDoctorId === doc.id ? null : doc.id
                                                                        )
                                                                    }
                                                                    className="p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors"
                                                                >
                                                                    <MoreVertical className="w-4 h-4" />
                                                                </button>

                                                                {activeActionMenuDoctorId === doc.id && (
                                                                    <>
                                                                        <div
                                                                            className="fixed inset-0 z-20"
                                                                            onClick={() => setActiveActionMenuDoctorId(null)}
                                                                        />
                                                                        <div className="absolute right-0 bottom-full mb-1 w-48 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200/80 dark:border-white/10 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setActiveActionMenuDoctorId(null);
                                                                                    toggleDoctorActive(doc);
                                                                                }}
                                                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 text-left"
                                                                            >
                                                                                <Power className="w-3.5 h-3.5 text-slate-400" />
                                                                                <span>{doc.is_active ? 'Deactivate doctor' : 'Activate doctor'}</span>
                                                                            </button>
                                                                            <a
                                                                                href={`/calendar?doctor=${doc.id}`}
                                                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 text-left"
                                                                            >
                                                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                                                <span>View schedule in calendar</span>
                                                                            </a>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setActiveActionMenuDoctorId(null);
                                                                                    setSelectedDoctorForPhoto(doc);
                                                                                    setIsDoctorPhotoModalOpen(true);
                                                                                }}
                                                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 text-left"
                                                                            >
                                                                                <Camera className="w-3.5 h-3.5 text-slate-400" />
                                                                                <span>Update portrait photo</span>
                                                                            </button>
                                                                            <div className="border-t border-slate-100 dark:border-white/5 my-1" />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setActiveActionMenuDoctorId(null);
                                                                                    setSelectedDoctorForDelete(doc);
                                                                                    setIsDeleteDoctorModalOpen(true);
                                                                                }}
                                                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-left"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                                                                <span>Delete doctor</span>
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </GlassCard>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        )}

                        {/* DOCTOR TABLE VIEW */}
                        {doctorViewMode === 'table' && (
                            <GlassCard className="overflow-hidden p-0 border-slate-200/80 dark:border-white/10">
                                {filteredDoctors.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <EmptyState
                                            icon={Stethoscope}
                                            title="No doctors match criteria"
                                            description="Try clearing search filters or add a new doctor profile."
                                            action={
                                                <button
                                                    type="button"
                                                    onClick={openAddDoctor}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#1E6FD9] hover:bg-blue-600 shadow-sm transition-all"
                                                >
                                                    <Plus className="w-3.5 h-3.5" />
                                                    <span>Add your first doctor</span>
                                                </button>
                                            }
                                        />
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                                                    <th className="py-3 px-4">Doctor & SLMC</th>
                                                    <th className="py-3 px-4">Specialty</th>
                                                    <th className="py-3 px-4">Fee split</th>
                                                    <th className="py-3 px-4">Next session</th>
                                                    <th className="py-3 px-4">Weekly schedule</th>
                                                    <th className="py-3 px-4">Status</th>
                                                    <th className="py-3 px-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                                                {filteredDoctors.map((doc) => {
                                                    const docColor = doc.color || getDoctorColor(doc.id);
                                                    const slmcDisplay = doc.slmc_display || formatSlmcDisplay(doc.slmc_number);
                                                    const activeDays = doc.template_days || [];

                                                    return (
                                                        <tr
                                                            key={doc.id}
                                                            className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                                                        >
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-2.5">
                                                                    {doc.photo_url ? (
                                                                        <img
                                                                            src={doc.photo_url}
                                                                            alt={doc.full_title}
                                                                            className="w-8 h-8 rounded-xl object-cover shrink-0"
                                                                        />
                                                                    ) : (
                                                                        <div
                                                                            className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0"
                                                                            style={{ backgroundColor: docColor.hex }}
                                                                        >
                                                                            {doc.name.charAt(0).toUpperCase()}
                                                                        </div>
                                                                    )}
                                                                    <div>
                                                                        <div className="font-bold text-slate-900 dark:text-white">
                                                                            {doc.full_title}
                                                                        </div>
                                                                        {slmcDisplay && (
                                                                            <span className="text-[10px] text-[#0E9E8F] font-semibold flex items-center gap-1">
                                                                                <ShieldCheck className="w-3 h-3" />
                                                                                {slmcDisplay}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                                                                {doc.specialty}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <div className="font-extrabold text-slate-900 dark:text-white">
                                                                    {doc.total_fee_formatted}
                                                                </div>
                                                                <div className="text-[10px] text-slate-400">
                                                                    Dr. {(doc.doctor_fee_lkr || 0).toLocaleString()} · Clinic {(doc.clinic_fee_lkr || 0).toLocaleString()}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                                                                {doc.next_session || 'No upcoming'}
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <div className="flex items-center gap-1">
                                                                    {WEEK_DAYS.map((d) => {
                                                                        const isLit = activeDays.includes(d.id);
                                                                        return (
                                                                            <span
                                                                                key={d.id}
                                                                                className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center ${
                                                                                    isLit
                                                                                        ? 'text-white'
                                                                                        : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                                                                                }`}
                                                                                style={isLit ? { backgroundColor: docColor.hex } : undefined}
                                                                            >
                                                                                {d.dot}
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <span
                                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                                        doc.is_active
                                                                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                                                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                                                                    }`}
                                                                >
                                                                    {doc.is_active ? 'Active' : 'Inactive'}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-4 text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => copyDoctorBookingLink(doc)}
                                                                        className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors"
                                                                        title="Copy booking link"
                                                                    >
                                                                        {copiedDoctorId === doc.id ? (
                                                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                                        ) : (
                                                                            <Copy className="w-3.5 h-3.5" />
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openEditDoctor(doc)}
                                                                        className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors"
                                                                        title="Edit doctor"
                                                                    >
                                                                        <Edit2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedDoctorForDelete(doc);
                                                                            setIsDeleteDoctorModalOpen(true);
                                                                        }}
                                                                        className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-600 dark:text-rose-400 transition-colors"
                                                                        title="Delete doctor"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </GlassCard>
                        )}
                    </div>
                )}

                {/* ========================================================= */}
                {/* TAB 2: WEEKLY TEMPLATES                                  */}
                {/* ========================================================= */}
                {activeTab === 'templates' && (
                    <div className="space-y-4">
                        {/* Generation status banner & filter bar */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-teal-500/5 to-transparent dark:from-blue-500/15 dark:via-teal-500/10 border border-[#1E6FD9]/20">
                            <div className="space-y-0.5">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                                    <Sparkles className="w-3.5 h-3.5 text-[#1E6FD9]" />
                                    <span>
                                        {lastGeneratedInfo?.last_generated_formatted
                                            ? `Last generated: ${lastGeneratedInfo.last_generated_formatted}, sessions until ${lastGeneratedInfo.furthest_date_formatted || 'next 30 days'}`
                                            : 'Sessions generated for the next 30 days'}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {lastGeneratedInfo?.scheduled_job_note ||
                                        'Automatic generator runs daily at midnight for 30 days ahead.'}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setIsGenerateModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#1E6FD9] hover:bg-blue-600 text-white shadow-xs transition-all cursor-pointer"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Generate sessions…</span>
                            </button>
                        </div>

                        {/* Doctor Filter and Calendar/Table Toggle */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10">
                            <div className="flex items-center gap-2 w-full sm:w-72">
                                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                                <GlassSelect
                                    value={templateDoctorFilter}
                                    onChange={(e) => setTemplateDoctorFilter(e.target.value)}
                                    placeholder="All doctors"
                                    options={[
                                        { value: 'all', label: `All doctors (${templates.length} templates)` },
                                        ...doctors.map((d) => ({
                                            value: String(d.id),
                                            label: `${d.full_title} (${d.templates_count})`,
                                        })),
                                    ]}
                                />
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setTemplateViewMode('calendar')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                            templateViewMode === 'calendar'
                                                ? 'bg-white dark:bg-slate-800 text-[#1E6FD9] shadow-xs'
                                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                    >
                                        Weekly calendar
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setTemplateViewMode('table')}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                            templateViewMode === 'table'
                                                ? 'bg-white dark:bg-slate-800 text-[#1E6FD9] shadow-xs'
                                                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                        }`}
                                    >
                                        Table list
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* WEEKLY CALENDAR VIEW: 7 full-width columns, no text truncation */}
                        {templateViewMode === 'calendar' && (
                            <div className="space-y-4">
                                {/* Desktop 7-column layout (min-width: 1024px) */}
                                <div className="hidden lg:grid lg:grid-cols-7 gap-3 items-start">
                                    {WEEK_DAYS.map((day) => {
                                        const dayTemplates = templatesByDay[day.id] || [];

                                        return (
                                            <div
                                                key={day.id}
                                                className="flex flex-col min-w-0 rounded-2xl bg-white/60 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 p-2.5 space-y-2.5 min-h-[460px]"
                                            >
                                                {/* Day Column Header */}
                                                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-white/5">
                                                    <div>
                                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">
                                                            {day.short}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {dayTemplates.length} {dayTemplates.length === 1 ? 'session' : 'sessions'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => openAddTemplateForDay(day.id)}
                                                        className="p-1 rounded-lg text-slate-400 hover:text-[#1E6FD9] hover:bg-[#1E6FD9]/10 transition-colors"
                                                        title={`Add template on ${day.label}`}
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>

                                                {/* Templates for this day */}
                                                <div className="space-y-2.5 flex-1">
                                                    {dayTemplates.map((tpl) => {
                                                        const docColor = tpl.doctor_color || getDoctorColor(tpl.doctor_id);

                                                        return (
                                                            <div
                                                                key={tpl.id}
                                                                className="group relative rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900/80 p-2.5 shadow-xs hover:shadow-md transition-all space-y-2"
                                                                title={`Template: ${tpl.title}`}
                                                            >
                                                                {/* Doctor colour bar + full short name (wrapping to 2 lines) */}
                                                                <div className="flex items-start gap-2">
                                                                    <div
                                                                        className="w-1.5 self-stretch rounded-full shrink-0 mt-0.5"
                                                                        style={{ backgroundColor: docColor.hex }}
                                                                    />
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-xs font-bold text-slate-900 dark:text-white leading-tight break-words">
                                                                            {tpl.doctor_name}
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                                                            {tpl.doctor_specialty}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Time range in full ("9:00 – 12:00 AM") */}
                                                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                                                                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                                                    <span>
                                                                        {tpl.start_time} – {tpl.end_time}
                                                                    </span>
                                                                </div>

                                                                {/* Room & Token limit */}
                                                                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-white/5">
                                                                    <span className="flex items-center gap-1 truncate">
                                                                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                                                        {tpl.room_number}
                                                                    </span>
                                                                    <span className="font-semibold text-slate-700 dark:text-slate-300 shrink-0">
                                                                        {tpl.max_patients} tokens
                                                                    </span>
                                                                </div>

                                                                {/* Card actions: edit, duplicate to other days, delete */}
                                                                <div className="flex items-center justify-end gap-1 pt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => openEditTemplate(tpl)}
                                                                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                                                        title="Edit template"
                                                                    >
                                                                        <Edit2 className="w-3 h-3" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedTemplateForDuplicate(tpl);
                                                                            setIsDuplicateModalOpen(true);
                                                                        }}
                                                                        className="p-1 rounded-md text-slate-400 hover:text-[#1E6FD9] hover:bg-[#1E6FD9]/10 transition-colors"
                                                                        title="Duplicate to other days"
                                                                    >
                                                                        <Copy className="w-3 h-3" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            setSelectedTemplateForDelete(tpl);
                                                                            setIsDeleteTemplateModalOpen(true);
                                                                        }}
                                                                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                                                                        title="Delete template"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Compact dashed empty day slot */}
                                                    {dayTemplates.length === 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => openAddTemplateForDay(day.id)}
                                                            className="w-full py-4 px-2 rounded-xl border border-dashed border-slate-300/80 dark:border-white/10 hover:border-[#1E6FD9]/50 text-slate-400 hover:text-[#1E6FD9] text-[11px] font-medium transition-all flex flex-col items-center justify-center gap-1 group"
                                                        >
                                                            <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                                            <span>No sessions · Add</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Mobile/tablet vertical day-by-day list (< 1024px) */}
                                <div className="lg:hidden space-y-3">
                                    {WEEK_DAYS.map((day) => {
                                        const dayTemplates = templatesByDay[day.id] || [];

                                        return (
                                            <div
                                                key={day.id}
                                                className="p-3.5 rounded-2xl bg-white/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-3"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                                                            {day.label}
                                                        </span>
                                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 font-semibold text-slate-500">
                                                            {dayTemplates.length} {dayTemplates.length === 1 ? 'session' : 'sessions'}
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => openAddTemplateForDay(day.id)}
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#1E6FD9] hover:bg-[#1E6FD9]/10"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        <span>Add</span>
                                                    </button>
                                                </div>

                                                {dayTemplates.length === 0 ? (
                                                    <div className="py-2.5 text-center text-xs text-slate-400">
                                                        No sessions scheduled for {day.label}
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {dayTemplates.map((tpl) => {
                                                            const docColor = tpl.doctor_color || getDoctorColor(tpl.doctor_id);

                                                            return (
                                                                <div
                                                                    key={tpl.id}
                                                                    className="p-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 space-y-2"
                                                                >
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex items-center gap-2">
                                                                            <div
                                                                                className="w-2.5 h-2.5 rounded-full"
                                                                                style={{ backgroundColor: docColor.hex }}
                                                                            />
                                                                            <div>
                                                                                <div className="text-xs font-bold text-slate-900 dark:text-white">
                                                                                    {tpl.doctor_name}
                                                                                </div>
                                                                                <div className="text-[10px] text-slate-500">
                                                                                    {tpl.doctor_specialty}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => openEditTemplate(tpl)}
                                                                                className="p-1 text-slate-400 hover:text-slate-700"
                                                                            >
                                                                                <Edit2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSelectedTemplateForDuplicate(tpl);
                                                                                    setIsDuplicateModalOpen(true);
                                                                                }}
                                                                                className="p-1 text-slate-400 hover:text-[#1E6FD9]"
                                                                            >
                                                                                <Copy className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSelectedTemplateForDelete(tpl);
                                                                                    setIsDeleteTemplateModalOpen(true);
                                                                                }}
                                                                                className="p-1 text-slate-400 hover:text-rose-600"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                                                                        <span>
                                                                            {tpl.start_time} – {tpl.end_time}
                                                                        </span>
                                                                        <span>
                                                                            {tpl.room_number} · {tpl.max_patients} tokens
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* TEMPLATES TABLE LIST VIEW */}
                        {templateViewMode === 'table' && (
                            <GlassCard className="overflow-hidden p-0 border-slate-200/80 dark:border-white/10">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02] text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                                                <th className="py-3 px-4">Doctor</th>
                                                <th className="py-3 px-4">Day</th>
                                                <th className="py-3 px-4">Time window</th>
                                                <th className="py-3 px-4">Room & tokens</th>
                                                <th className="py-3 px-4">Template title</th>
                                                <th className="py-3 px-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                                            {filteredTemplates.map((tpl) => {
                                                const docColor = tpl.doctor_color || getDoctorColor(tpl.doctor_id);

                                                return (
                                                    <tr key={tpl.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                <div
                                                                    className="w-2.5 h-2.5 rounded-full"
                                                                    style={{ backgroundColor: docColor.hex }}
                                                                />
                                                                <div>
                                                                    <span className="font-bold text-slate-900 dark:text-white block">
                                                                        {tpl.doctor_name}
                                                                    </span>
                                                                    <span className="text-[10px] text-slate-400">
                                                                        {tpl.doctor_specialty}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                                            {tpl.day_name}
                                                        </td>
                                                        <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                                                            {tpl.start_time} – {tpl.end_time}
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                                            {tpl.room_number} · {tpl.max_patients} tokens
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                                            {tpl.title}
                                                        </td>
                                                        <td className="py-3 px-4 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openEditTemplate(tpl)}
                                                                    className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 hover:bg-slate-100 text-slate-600 dark:text-slate-300"
                                                                    title="Edit template"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedTemplateForDuplicate(tpl);
                                                                        setIsDuplicateModalOpen(true);
                                                                    }}
                                                                    className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 hover:bg-[#1E6FD9]/10 text-slate-600 dark:text-slate-300 hover:text-[#1E6FD9]"
                                                                    title="Duplicate"
                                                                >
                                                                    <Copy className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedTemplateForDelete(tpl);
                                                                        setIsDeleteTemplateModalOpen(true);
                                                                    }}
                                                                    className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 hover:bg-rose-50 text-rose-600"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </GlassCard>
                        )}
                    </div>
                )}

                {/* ========================================================= */}
                {/* TAB 3: DOCTOR LEAVE                                      */}
                {/* ========================================================= */}
                {activeTab === 'leaves' && (
                    <div className="space-y-4">
                        {leaves.length === 0 ? (
                            <EmptyState
                                icon={CalendarX2}
                                title="No scheduled leaves recorded"
                                description="Doctors are currently available on all scheduled weekly template days. Log upcoming leaves to block channeling bookings."
                                action={
                                    <button
                                        type="button"
                                        onClick={() => setIsLeaveModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#FF7A59] hover:bg-[#e06848] shadow-sm transition-all"
                                    >
                                        <CalendarX2 className="w-3.5 h-3.5" />
                                        <span>Log leave</span>
                                    </button>
                                }
                            />
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {leaves.map((leave) => {
                                    const docColor = leave.doctor_color || getDoctorColor(leave.doctor_id);

                                    return (
                                        <GlassCard
                                            key={leave.id}
                                            className="p-4 border-slate-200/80 dark:border-white/10 space-y-3"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-white text-sm"
                                                        style={{ backgroundColor: docColor.hex }}
                                                    >
                                                        {leave.doctor_name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                                            {leave.doctor_name}
                                                        </h3>
                                                        <span className="text-xs text-slate-500">
                                                            {leave.doctor_specialty}
                                                        </span>
                                                    </div>
                                                </div>

                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                        leave.is_upcoming
                                                            ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                                            : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                                                    }`}
                                                >
                                                    {leave.is_upcoming ? 'Upcoming' : 'Past'}
                                                </span>
                                            </div>

                                            {/* Date range & duration */}
                                            <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/5 space-y-1 text-xs">
                                                <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
                                                    <span>
                                                        {leave.start_date_formatted} – {leave.end_date_formatted}
                                                    </span>
                                                    <span className="text-[11px] text-[#FF7A59]">
                                                        {leave.days_count} {leave.days_count === 1 ? 'day' : 'days'}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    Reason: {leave.reason}
                                                </p>
                                            </div>

                                            {/* Affected sessions badge & delete action */}
                                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/5">
                                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400">
                                                    {leave.affected_sessions_count || 0} sessions affected
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => deleteLeave(leave.id)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                    <span>Remove</span>
                                                </button>
                                            </div>
                                        </GlassCard>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ========================================================= */}
            {/* MODALS                                                    */}
            {/* ========================================================= */}

            {/* 1. Generate sessions modal */}
            <GenerateSessionsModal
                isOpen={isGenerateModalOpen}
                onClose={() => setIsGenerateModalOpen(false)}
                doctors={doctors}
                onSuccess={(msg) => showToast(msg)}
            />

            {/* 2. Log leave modal */}
            <LogLeaveModal
                isOpen={isLeaveModalOpen}
                onClose={() => setIsLeaveModalOpen(false)}
                doctors={doctors}
                onSuccess={(msg) => showToast(msg)}
            />

            {/* 3. Duplicate template modal */}
            <DuplicateTemplateModal
                isOpen={isDuplicateModalOpen}
                onClose={() => {
                    setIsDuplicateModalOpen(false);
                    setSelectedTemplateForDuplicate(null);
                }}
                template={selectedTemplateForDuplicate}
                onSuccess={(msg) => showToast(msg)}
            />

            {/* 4. Delete template modal */}
            <DeleteTemplateModal
                isOpen={isDeleteTemplateModalOpen}
                onClose={() => {
                    setIsDeleteTemplateModalOpen(false);
                    setSelectedTemplateForDelete(null);
                }}
                template={selectedTemplateForDelete}
                onSuccess={(msg) => showToast(msg)}
            />

            {/* 5. Delete doctor modal */}
            <DeleteDoctorModal
                isOpen={isDeleteDoctorModalOpen}
                onClose={() => {
                    setIsDeleteDoctorModalOpen(false);
                    setSelectedDoctorForDelete(null);
                }}
                doctor={selectedDoctorForDelete}
                onSuccess={(msg) => showToast(msg)}
            />

            {/* 6. Create / Edit Doctor Modal */}
            <GlassModal
                isOpen={isDoctorModalOpen}
                onClose={() => setIsDoctorModalOpen(false)}
                title={editingDoctor ? `Edit ${editingDoctor.full_title}` : 'Add New Doctor'}
                subtitle="Configure doctor credentials, SLMC number, fee split, and payout preferences"
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleDoctorSubmit} className="space-y-4">
                    {/* Basic details */}
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-1">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Title *
                            </label>
                            <input
                                type="text"
                                required
                                value={doctorForm.data.title}
                                onChange={(e) => doctorForm.setData('title', e.target.value)}
                                placeholder="Dr. / Prof."
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
                            />
                        </div>

                        <div className="sm:col-span-3">
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Full Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={doctorForm.data.name}
                                onChange={(e) => doctorForm.setData('name', e.target.value)}
                                placeholder="e.g. Sivakumar"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Medical Specialty *
                            </label>
                            <GlassSelect
                                value={doctorForm.data.specialty}
                                onChange={(e) => doctorForm.setData('specialty', e.target.value)}
                                placeholder="Select Specialty"
                                searchable={true}
                                options={specialties.map((s) => ({ value: s, label: s }))}
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                SLMC Registration Number
                            </label>
                            <input
                                type="text"
                                value={doctorForm.data.slmc_number}
                                onChange={(e) => doctorForm.setData('slmc_number', e.target.value)}
                                placeholder="e.g. 18429"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
                            />
                            <span className="text-[10px] text-slate-400 mt-0.5 block">
                                Enter registration number only (duplicate "SLMC" prefixes are automatically stripped).
                            </span>
                        </div>
                    </div>

                    {/* Fee Configuration Block */}
                    <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/80 dark:border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Consultation Fee & Payout Configuration
                            </span>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={doctorForm.data.use_clinic_default_fees}
                                    onChange={(e) => doctorForm.setData('use_clinic_default_fees', e.target.checked)}
                                    className="rounded border-slate-300 text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                />
                                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    Use clinic default fee settings
                                </span>
                            </label>
                        </div>

                        {!doctorForm.data.use_clinic_default_fees && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        Doctor Fee (LKR)
                                    </label>
                                    <input
                                        type="number"
                                        step="50"
                                        value={doctorForm.data.doctor_fee_lkr}
                                        onChange={(e) => {
                                            const docVal = parseFloat(e.target.value) || 0;
                                            doctorForm.setData({
                                                ...doctorForm.data,
                                                doctor_fee_lkr: docVal,
                                                total_fee_lkr: docVal + doctorForm.data.clinic_fee_lkr,
                                            });
                                        }}
                                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        Clinic Fee (LKR)
                                    </label>
                                    <input
                                        type="number"
                                        step="50"
                                        value={doctorForm.data.clinic_fee_lkr}
                                        onChange={(e) => {
                                            const clnVal = parseFloat(e.target.value) || 0;
                                            doctorForm.setData({
                                                ...doctorForm.data,
                                                clinic_fee_lkr: clnVal,
                                                total_fee_lkr: doctorForm.data.doctor_fee_lkr + clnVal,
                                            });
                                        }}
                                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                        Total Patient Fee (LKR)
                                    </label>
                                    <input
                                        type="number"
                                        readOnly
                                        value={doctorForm.data.total_fee_lkr}
                                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-800 py-1.5 px-3 text-slate-600 dark:text-slate-400 font-bold"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Average Consultation Time (Minutes) *
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="120"
                                    required
                                    value={doctorForm.data.avg_consultation_minutes}
                                    onChange={(e) => doctorForm.setData('avg_consultation_minutes', parseInt(e.target.value) || 15)}
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                    Link to Clinic Portal User
                                </label>
                                <GlassSelect
                                    value={doctorForm.data.user_id ? String(doctorForm.data.user_id) : ''}
                                    onChange={(e) => doctorForm.setData('user_id', e.target.value)}
                                    placeholder="-- No Portal User Linked --"
                                    options={[
                                        { value: '', label: '-- No Portal User Linked --' },
                                        ...eligibleUsers.map((u) => ({
                                            value: String(u.id),
                                            label: `${u.name} (${u.email})`,
                                        })),
                                    ]}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Doctor Bio / Qualifications
                        </label>
                        <textarea
                            rows={2}
                            value={doctorForm.data.bio}
                            onChange={(e) => doctorForm.setData('bio', e.target.value)}
                            placeholder="e.g. MBBS (Colombo), MD (Cardiology), FRCP (UK) - Senior Consultant"
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                        <input
                            type="checkbox"
                            id="is_active_checkbox"
                            checked={doctorForm.data.is_active}
                            onChange={(e) => doctorForm.setData('is_active', e.target.checked)}
                            className="rounded border-slate-300 text-[#1E6FD9] focus:ring-[#1E6FD9]"
                        />
                        <label htmlFor="is_active_checkbox" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Doctor is active and accepting channeled appointments
                        </label>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-white/10">
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
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1E6FD9] hover:bg-blue-600 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                        >
                            {doctorForm.processing ? 'Saving...' : editingDoctor ? 'Update doctor' : 'Save doctor'}
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* 7. Create / Edit Weekly Template Modal */}
            <GlassModal
                isOpen={isTemplateModalOpen}
                onClose={() => setIsTemplateModalOpen(false)}
                title={editingTemplate ? 'Edit Weekly Template' : 'Add Weekly Template'}
                subtitle="Configure recurring session times, doctor, room, and patient token limit"
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleTemplateSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Doctor *
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
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
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
                                options={WEEK_DAYS.map((d) => ({
                                    value: d.id,
                                    label: d.label,
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
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
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
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Room / Suite
                            </label>
                            <input
                                type="text"
                                value={templateForm.data.room_number}
                                onChange={(e) => templateForm.setData('room_number', e.target.value)}
                                placeholder="Suite 1"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Max Patients / Tokens *
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                required
                                value={templateForm.data.max_patients}
                                onChange={(e) => templateForm.setData('max_patients', parseInt(e.target.value) || 20)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#1E6FD9] outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-white/10">
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
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#1E6FD9] hover:bg-blue-600 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                        >
                            {templateForm.processing ? 'Saving...' : editingTemplate ? 'Update template' : 'Create template'}
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* 8. One-Off Session Modal */}
            <GlassModal
                isOpen={isOneOffModalOpen}
                onClose={() => setIsOneOffModalOpen(false)}
                title="Schedule One-Off Session"
                subtitle="Create a single ad-hoc channeling session outside the regular weekly templates"
                maxWidth="max-w-md"
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

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Session Date *
                        </label>
                        <input
                            type="date"
                            required
                            value={oneOffForm.data.session_date}
                            onChange={(e) => oneOffForm.setData('session_date', e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#0E9E8F] outline-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Start Time *
                            </label>
                            <input
                                type="time"
                                required
                                value={oneOffForm.data.start_time}
                                onChange={(e) => oneOffForm.setData('start_time', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#0E9E8F] outline-none"
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
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#0E9E8F] outline-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Room / Suite
                            </label>
                            <input
                                type="text"
                                value={oneOffForm.data.room_number}
                                onChange={(e) => oneOffForm.setData('room_number', e.target.value)}
                                placeholder="Consultation Suite 1"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#0E9E8F] outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Max Tokens *
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                required
                                value={oneOffForm.data.max_tokens}
                                onChange={(e) => oneOffForm.setData('max_tokens', parseInt(e.target.value) || 20)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#0E9E8F] outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200 dark:border-white/10">
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
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#0E9E8F] hover:bg-teal-600 shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all cursor-pointer"
                        >
                            {oneOffForm.processing ? 'Creating...' : 'Create session'}
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* 9. Doctor Photo Upload Modal */}
            {selectedDoctorForPhoto && (
                <ImageUploaderModal
                    isOpen={isDoctorPhotoModalOpen}
                    onClose={() => {
                        setIsDoctorPhotoModalOpen(false);
                        setSelectedDoctorForPhoto(null);
                    }}
                    type="doctor"
                    currentImageUrl={selectedDoctorForPhoto.photo_url}
                    uploadEndpoint={`/doctors/${selectedDoctorForPhoto.id}/photo`}
                    deleteEndpoint={`/doctors/${selectedDoctorForPhoto.id}/photo`}
                    title={`Doctor Photo — ${selectedDoctorForPhoto.full_title}`}
                    subtitle="Upload portrait from device or paste an image link. Circle-cropped and optimized as WebP for patient channeling portals."
                    fallbackInitial={selectedDoctorForPhoto.name.charAt(0)}
                    onSuccess={() => {
                        router.reload({ only: ['doctors'] });
                        showToast('Doctor portrait updated.');
                    }}
                    onRemove={() => {
                        router.reload({ only: ['doctors'] });
                        showToast('Doctor portrait removed.');
                    }}
                />
            )}
        </AuthenticatedLayout>
    );
}
