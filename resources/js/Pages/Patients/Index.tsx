import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import { EmptyState } from '@/Components/UI/EmptyState';
import { PhoneInput } from '@/Components/UI/PhoneInput';
import GlassSelect from '@/Components/UI/GlassSelect';
import { ActionsMenu } from '@/Components/UI/ActionsMenu';
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
    Ticket,
    ArrowRightLeft,
    LayoutList,
    LayoutGrid,
    SlidersHorizontal,
    X,
    Filter,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    Sparkles,
} from 'lucide-react';
import { AssignDoctorDrawer } from '@/Components/Bookings/AssignDoctorDrawer';
import { MoveTokenModal, TokenToMove } from '@/Components/Bookings/MoveTokenModal';
import { getDoctorColor } from '@/Utils/doctorColors';
import {
    PatientItem,
    InUseDistrict,
    DirectoryStats,
    UserPermissions,
    DirectoryFilters,
} from './types';
import { PatientDetailSlideOver } from './Components/PatientDetailSlideOver';

interface PaginatedData<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Props {
    patients: PaginatedData<PatientItem>;
    filters: DirectoryFilters;
    stats: DirectoryStats;
    inUseDistricts: InUseDistrict[];
    allDistricts: string[];
    doctors?: any[];
    visitTypes?: any[];
    userPermissions: UserPermissions;
}

export default function PatientsIndex({
    patients,
    filters,
    stats,
    inUseDistricts = [],
    allDistricts = [],
    doctors = [],
    visitTypes = [],
    userPermissions,
}: Props) {
    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedDistrict, setSelectedDistrict] = useState(filters.district || 'all');
    const [selectedGender, setSelectedGender] = useState(filters.gender || 'all');
    const [selectedAgeRange, setSelectedAgeRange] = useState(filters.age_range || 'all');
    const [selectedLastVisit, setSelectedLastVisit] = useState(filters.last_visit || 'all');
    const [selectedDoctorId, setSelectedDoctorId] = useState(filters.doctor_id || 'all');
    const [selectedSort, setSelectedSort] = useState(filters.sort || 'recently_visited');
    const [selectedPerPage, setSelectedPerPage] = useState(filters.per_page || 25);

    // View mode: 'list' or 'cards'
    const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');
    const [showFiltersBar, setShowFiltersBar] = useState(false);

    // Keyboard navigation highlight index for list view
    const [focusedRowIndex, setFocusedRowIndex] = useState<number>(-1);

    // Slide-over Side Panel State
    const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(null);
    const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

    // Modals & Drawers
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState<PatientItem | null>(null);

    const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);
    const [assignDrawerPatient, setAssignDrawerPatient] = useState<any | null>(null);

    const [moveModalOpen, setMoveModalOpen] = useState(false);
    const [tokenToMove, setTokenToMove] = useState<TokenToMove | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Patient Form
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

    // Count active filters (excluding default values)
    const activeFiltersCount = [
        selectedDistrict !== 'all',
        selectedGender !== 'all',
        selectedAgeRange !== 'all',
        selectedLastVisit !== 'all',
        selectedDoctorId !== 'all',
    ].filter(Boolean).length;

    // Trigger URL query update with debouncing or immediate change
    const updateQuery = useCallback(
        (overrides: Partial<DirectoryFilters> = {}) => {
            const params: Record<string, string | number | undefined> = {
                search: overrides.search !== undefined ? overrides.search : searchQuery || undefined,
                district: (overrides.district !== undefined ? overrides.district : selectedDistrict) !== 'all' ? (overrides.district ?? selectedDistrict) : undefined,
                gender: (overrides.gender !== undefined ? overrides.gender : selectedGender) !== 'all' ? (overrides.gender ?? selectedGender) : undefined,
                age_range: (overrides.age_range !== undefined ? overrides.age_range : selectedAgeRange) !== 'all' ? (overrides.age_range ?? selectedAgeRange) : undefined,
                last_visit: (overrides.last_visit !== undefined ? overrides.last_visit : selectedLastVisit) !== 'all' ? (overrides.last_visit ?? selectedLastVisit) : undefined,
                doctor_id: (overrides.doctor_id !== undefined ? overrides.doctor_id : selectedDoctorId) !== 'all' ? (overrides.doctor_id ?? selectedDoctorId) : undefined,
                sort: overrides.sort !== undefined ? overrides.sort : selectedSort,
                per_page: overrides.per_page !== undefined ? overrides.per_page : selectedPerPage,
            };

            // Remove empty keys
            Object.keys(params).forEach((key) => {
                if (params[key] === undefined || params[key] === '') {
                    delete params[key];
                }
            });

            router.get('/patients', params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        },
        [searchQuery, selectedDistrict, selectedGender, selectedAgeRange, selectedLastVisit, selectedDoctorId, selectedSort, selectedPerPage]
    );

    // Handle instant search with 250ms debounce
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
            updateQuery({ search: value });
        }, 250);
    };

    // Keyboard shortcut `/` to focus search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === '/' && !isSlideOverOpen && !isCreateModalOpen && !assignDrawerOpen && !moveModalOpen) {
                const target = e.target as HTMLElement;
                if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                    return;
                }
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            } else if (e.key === 'Escape') {
                if (isSlideOverOpen) setIsSlideOverOpen(false);
                else if (isCreateModalOpen) setIsCreateModalOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSlideOverOpen, isCreateModalOpen, assignDrawerOpen, moveModalOpen]);

    // Table keyboard navigation: ArrowUp, ArrowDown, Enter
    useEffect(() => {
        const handleTableKeys = (e: KeyboardEvent) => {
            if (isSlideOverOpen || isCreateModalOpen || assignDrawerOpen || moveModalOpen) return;
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;

            if (patients.data.length === 0) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setFocusedRowIndex((prev) => Math.min(prev + 1, patients.data.length - 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setFocusedRowIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === 'Enter' && focusedRowIndex >= 0 && focusedRowIndex < patients.data.length) {
                e.preventDefault();
                openPatientSlideOver(patients.data[focusedRowIndex]);
            }
        };

        window.addEventListener('keydown', handleTableKeys);
        return () => window.removeEventListener('keydown', handleTableKeys);
    }, [focusedRowIndex, patients.data, isSlideOverOpen, isCreateModalOpen, assignDrawerOpen, moveModalOpen]);

    // Clear all filters
    const handleClearFilters = () => {
        setSearchQuery('');
        setSelectedDistrict('all');
        setSelectedGender('all');
        setSelectedAgeRange('all');
        setSelectedLastVisit('all');
        setSelectedDoctorId('all');
        setSelectedSort('recently_visited');
        router.get(
            '/patients',
            { sort: 'recently_visited', per_page: selectedPerPage },
            { preserveState: true, replace: true }
        );
    };

    // Open Slide-Over side panel
    const openPatientSlideOver = (p: PatientItem) => {
        setSelectedPatient(p);
        setIsSlideOverOpen(true);
    };

    // Open Create Modal
    const openCreateModal = (prefillSearch?: string) => {
        setEditingPatient(null);
        form.reset();

        let initialPhone = '+94 ';
        let initialName = '';

        if (prefillSearch) {
            const digits = prefillSearch.replace(/\D/g, '');
            if (digits.length >= 7) {
                initialPhone = prefillSearch.startsWith('+') ? prefillSearch : `+94 ${digits.slice(-9)}`;
            } else {
                initialName = prefillSearch;
            }
        }

        form.setData({
            name: initialName,
            phone: initialPhone,
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

    // Open Edit Modal
    const openEditModal = (p: PatientItem) => {
        setEditingPatient(p);
        form.setData({
            name: p.name,
            phone: p.phone_raw || p.phone_normalized || '+94 ',
            nic: p.nic_masked && !p.nic_masked.includes('•') ? p.nic_masked : '',
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
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                    if (selectedPatient && selectedPatient.id === editingPatient.id) {
                        // Refresh side panel with updated info
                        router.reload();
                    }
                },
            });
        } else {
            form.post('/patients', {
                onSuccess: () => {
                    setIsCreateModalOpen(false);
                },
            });
        }
    };

    // Quick Token Issue
    const handleIssueToken = (p: PatientItem) => {
        setAssignDrawerPatient(p);
        setAssignDrawerOpen(true);
    };

    // Move Token Modal from Slide-Over
    const handleMoveTokenFromHistory = (v: any) => {
        if (!selectedPatient) return;
        setTokenToMove({
            id: v.id,
            token_number: v.token_number,
            patient_id: selectedPatient.id,
            patient_name: selectedPatient.name,
            patient_phone: selectedPatient.phone_display,
            doctor_name: v.doctor_name,
            doctor_specialty: v.doctor_specialty,
            session_date: v.session_date,
            start_time: v.estimated_time || v.start_time,
            room_number: v.room_number,
            total_fee_formatted: v.bill_amount_formatted || v.total_fee_formatted || '—',
            payment_status: v.payment_status,
        });
        setMoveModalOpen(true);
    };

    return (
        <AuthenticatedLayout>
            <Head title="Patients - Directory" />

            <div className="space-y-5">
                {/* Header with Stats & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <PageHeader
                            breadcrumbs={[
                                { label: 'Clinic Workspace', href: '/dashboard' },
                                { label: 'Patients' },
                            ]}
                            title="Patients"
                            subtitle="Find a patient by name, mobile or NIC."
                        />

                        {/* Small Stats Row */}
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/10 shadow-xs">
                                <span className="font-bold text-slate-800 dark:text-slate-200">Total patients:</span>
                                <span className="font-semibold text-primary">{stats.total_patients}</span>
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/10 shadow-xs">
                                <span className="font-bold text-slate-800 dark:text-slate-200">New this month:</span>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">+{stats.new_this_month}</span>
                            </span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-white/10 shadow-xs">
                                <span className="font-bold text-slate-800 dark:text-slate-200">Visited today:</span>
                                <span className="font-semibold text-teal-600 dark:text-teal-400">{stats.visited_today}</span>
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        {/* Register Patient Primary Button */}
                        <button
                            type="button"
                            onClick={() => openCreateModal()}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 transition-all hover:scale-[1.01]"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>Register patient</span>
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-3">
                    <div className="flex flex-col sm:flex-row items-center gap-2.5">
                        {/* Instant Search with "/" Shortcut & autofocus */}
                        <div className="relative flex-1 w-full">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                placeholder="Search by name, mobile (07X...), NIC, city, or ID (#12)..."
                                className="w-full pl-10 pr-16 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-white/5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-900 transition-all font-medium"
                            />
                            {/* Keyboard shortcut hint */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                                {searchQuery ? (
                                    <button
                                        type="button"
                                        onClick={() => handleSearchChange('')}
                                        className="pointer-events-auto p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-200/60 dark:bg-white/10 rounded border border-slate-300/60 dark:border-white/10">
                                        /
                                    </kbd>
                                )}
                            </div>
                        </div>

                        {/* District Filter (In-use only with counts) */}
                        <div className="w-full sm:w-56 shrink-0">
                            <GlassSelect
                                value={selectedDistrict}
                                onChange={(e) => {
                                    setSelectedDistrict(e.target.value);
                                    updateQuery({ district: e.target.value });
                                }}
                                searchable={true}
                                placeholder={`All districts (${stats.total_patients})`}
                                options={[
                                    { value: 'all', label: `All districts (${stats.total_patients})` },
                                    ...inUseDistricts.map((d) => ({
                                        value: d.name,
                                        label: `${d.name} (${d.count})`,
                                    })),
                                ]}
                            />
                        </div>

                        {/* Sort Dropdown */}
                        <div className="w-full sm:w-44 shrink-0">
                            <GlassSelect
                                value={selectedSort}
                                onChange={(e) => {
                                    setSelectedSort(e.target.value);
                                    updateQuery({ sort: e.target.value });
                                }}
                                options={[
                                    { value: 'recently_visited', label: 'Recently visited' },
                                    { value: 'name_asc', label: 'Name A–Z' },
                                    { value: 'newest_registered', label: 'Newest registered' },
                                    { value: 'most_visits', label: 'Most visits' },
                                ]}
                            />
                        </div>

                        {/* Filter Toggle Button */}
                        <button
                            type="button"
                            onClick={() => setShowFiltersBar((prev) => !prev)}
                            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 ${
                                showFiltersBar || activeFiltersCount > 0
                                    ? 'bg-primary/10 border-primary/30 text-primary'
                                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                            }`}
                            title="Toggle detailed filters"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            <span className="hidden sm:inline">Filters</span>
                            {activeFiltersCount > 0 && (
                                <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                                    {activeFiltersCount}
                                </span>
                            )}
                        </button>

                        {/* View Switch: List vs Cards */}
                        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 shrink-0">
                            <button
                                type="button"
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    viewMode === 'list'
                                        ? 'bg-white dark:bg-slate-800 text-primary shadow-xs'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                }`}
                                title="List view"
                                aria-label="List view"
                            >
                                <LayoutList className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('cards')}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    viewMode === 'cards'
                                        ? 'bg-white dark:bg-slate-800 text-primary shadow-xs'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                }`}
                                title="Cards view"
                                aria-label="Cards view"
                            >
                                <LayoutGrid className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Expandable Advanced Filters Row */}
                    {showFiltersBar && (
                        <div className="pt-3 border-t border-slate-200/60 dark:border-white/5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                            {/* Gender Filter */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                    Gender
                                </label>
                                <GlassSelect
                                    value={selectedGender}
                                    onChange={(e) => {
                                        setSelectedGender(e.target.value);
                                        updateQuery({ gender: e.target.value });
                                    }}
                                    options={[
                                        { value: 'all', label: 'All genders' },
                                        { value: 'male', label: 'Male' },
                                        { value: 'female', label: 'Female' },
                                        { value: 'other', label: 'Other' },
                                    ]}
                                />
                            </div>

                            {/* Age Range Filter */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                    Age range
                                </label>
                                <GlassSelect
                                    value={selectedAgeRange}
                                    onChange={(e) => {
                                        setSelectedAgeRange(e.target.value);
                                        updateQuery({ age_range: e.target.value });
                                    }}
                                    options={[
                                        { value: 'all', label: 'All ages' },
                                        { value: '<18', label: 'Under 18 (<18)' },
                                        { value: '18-35', label: '18 – 35 yrs' },
                                        { value: '36-55', label: '36 – 55 yrs' },
                                        { value: '55+', label: '55+ yrs' },
                                    ]}
                                />
                            </div>

                            {/* Last Visit Filter */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                    Last visit
                                </label>
                                <GlassSelect
                                    value={selectedLastVisit}
                                    onChange={(e) => {
                                        setSelectedLastVisit(e.target.value);
                                        updateQuery({ last_visit: e.target.value });
                                    }}
                                    options={[
                                        { value: 'all', label: 'Any time' },
                                        { value: 'today', label: 'Visited today' },
                                        { value: 'this_week', label: 'Visited this week' },
                                        { value: '30_days', label: 'Past 30 days' },
                                        { value: 'never', label: 'Never visited' },
                                    ]}
                                />
                            </div>

                            {/* Doctor Seen Filter */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                    Doctor seen
                                </label>
                                <GlassSelect
                                    value={selectedDoctorId}
                                    onChange={(e) => {
                                        setSelectedDoctorId(e.target.value);
                                        updateQuery({ doctor_id: e.target.value });
                                    }}
                                    searchable={true}
                                    options={[
                                        { value: 'all', label: 'All doctors' },
                                        ...doctors.map((doc) => ({
                                            value: String(doc.id),
                                            label: `${doc.name} (${doc.specialty})`,
                                        })),
                                    ]}
                                />
                            </div>
                        </div>
                    )}

                    {/* Active Filters Summary Pills */}
                    {activeFiltersCount > 0 && (
                        <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-xs text-slate-500">
                            <span className="flex items-center gap-1.5 font-medium">
                                <Filter className="w-3.5 h-3.5 text-primary" />
                                <span>{activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} applied</span>
                            </span>
                            <button
                                type="button"
                                onClick={handleClearFilters}
                                className="text-primary hover:underline font-bold text-[11px] inline-flex items-center gap-1"
                            >
                                <X className="w-3 h-3" />
                                <span>Reset all filters</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Patient Directory Content */}
                {patients.data.length === 0 ? (
                    <GlassCard className="py-12">
                        <EmptyState
                            icon={Users}
                            title={searchQuery ? `No patients match "${searchQuery}"` : 'No patients found'}
                            description={
                                searchQuery
                                    ? 'No records match this name, phone, or NIC. You can quickly register them as a new patient profile.'
                                    : 'Register walk-in and channeling patients to maintain visit records, allergy safety alerts, and billing receipts.'
                            }
                            action={
                                <button
                                    type="button"
                                    onClick={() => openCreateModal(searchQuery)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 transition-all"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    <span>Register as new patient</span>
                                </button>
                            }
                        />
                    </GlassCard>
                ) : viewMode === 'list' ? (
                    /* LIST VIEW: Sticky Header Table */
                    <div className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead className="sticky top-0 z-10 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="py-3 px-4 font-bold">Patient</th>
                                        <th className="py-3 px-4 font-bold">Demographics</th>
                                        <th className="py-3 px-4 font-bold">Mobile</th>
                                        <th className="py-3 px-4 font-bold">NIC</th>
                                        <th className="py-3 px-4 font-bold">Location</th>
                                        <th className="py-3 px-4 font-bold text-center">Visits</th>
                                        <th className="py-3 px-4 font-bold">Last visit</th>
                                        <th className="py-3 px-4 font-bold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {patients.data.map((p, index) => {
                                        const docColor = getDoctorColor(p.id);
                                        const isFocused = focusedRowIndex === index;
                                        const whatsappNumber = (p.phone_normalized || p.phone_raw || '').replace(/\D/g, '');

                                        return (
                                            <tr
                                                key={p.id}
                                                tabIndex={0}
                                                onClick={() => openPatientSlideOver(p)}
                                                className={`group cursor-pointer transition-colors ${
                                                    isFocused
                                                        ? 'bg-primary/10 dark:bg-primary/20 ring-1 ring-primary/40'
                                                        : 'hover:bg-slate-50/80 dark:hover:bg-white/[0.03]'
                                                }`}
                                            >
                                                {/* Patient Avatar & Name */}
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-xs shrink-0 bg-gradient-to-tr ${docColor.gradient}`}
                                                        >
                                                            {p.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-slate-900 dark:text-white truncate block group-hover:text-primary transition-colors">
                                                                    {p.name}
                                                                </span>
                                                                {p.is_possible_duplicate && (
                                                                    <span
                                                                        className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800/40 shrink-0"
                                                                        title={p.duplicate_reason || 'Possible duplicate patient'}
                                                                    >
                                                                        Possible duplicate
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] font-mono text-slate-400">
                                                                {p.formatted_id}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Demographics: Age · Gender */}
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                    <span className="capitalize">
                                                        {p.age !== null ? `${p.age} yrs` : '—'} • {p.gender}
                                                    </span>
                                                </td>

                                                {/* Formatted Mobile with tel: link */}
                                                <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                                                    <a
                                                        href={`tel:${p.phone_normalized || p.phone_raw}`}
                                                        className="font-mono text-slate-800 dark:text-slate-200 hover:text-primary hover:underline font-semibold"
                                                    >
                                                        {p.phone_display}
                                                    </a>
                                                </td>

                                                {/* Masked NIC */}
                                                <td className="py-3 px-4 font-mono text-slate-500 dark:text-slate-400">
                                                    {p.nic_masked}
                                                </td>

                                                {/* Clean Location (never "–,") */}
                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                    <span className="truncate block max-w-[160px]">
                                                        {p.location_display}
                                                    </span>
                                                </td>

                                                {/* Visits Count */}
                                                <td className="py-3 px-4 text-center">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                                            p.tokens_count > 0
                                                                ? 'bg-teal-50 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/40'
                                                                : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        {p.visits_formatted}
                                                    </span>
                                                </td>

                                                {/* Last Visit */}
                                                <td className="py-3 px-4">
                                                    <span
                                                        className={`text-xs ${
                                                            p.has_visits
                                                                ? 'font-medium text-slate-800 dark:text-slate-200'
                                                                : 'text-slate-400 italic'
                                                        }`}
                                                    >
                                                        {p.last_visit}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {/* Primary Issue Token */}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleIssueToken(p)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-teal-700 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/40 transition-colors"
                                                            title="Issue channeling token"
                                                        >
                                                            <Ticket className="w-3 h-3" />
                                                            <span>Issue token</span>
                                                        </button>

                                                        {/* Actions Menu */}
                                                        <ActionsMenu
                                                            items={[
                                                                {
                                                                    label: 'View patient history',
                                                                    icon: History,
                                                                    onClick: () => openPatientSlideOver(p),
                                                                },
                                                                {
                                                                    label: 'Edit patient',
                                                                    icon: Edit3,
                                                                    onClick: () => openEditModal(p),
                                                                },
                                                                {
                                                                    label: 'Call mobile',
                                                                    icon: Phone,
                                                                    href: `tel:${p.phone_normalized || p.phone_raw}`,
                                                                },
                                                                whatsappNumber
                                                                    ? {
                                                                          label: 'WhatsApp chat',
                                                                          icon: MessageSquare,
                                                                          href: `https://wa.me/${whatsappNumber}`,
                                                                      }
                                                                    : null,
                                                            ]}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* CARDS VIEW: Responsive Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {patients.data.map((p) => {
                            const docColor = getDoctorColor(p.id);
                            const whatsappNumber = (p.phone_normalized || p.phone_raw || '').replace(/\D/g, '');

                            return (
                                <GlassCard
                                    key={p.id}
                                    hover
                                    onClick={() => openPatientSlideOver(p)}
                                    className="cursor-pointer flex flex-col justify-between border-slate-200/80 dark:border-white/10 relative overflow-hidden"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div
                                                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white text-sm shadow-xs shrink-0 bg-gradient-to-tr ${docColor.gradient}`}
                                                >
                                                    {p.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                        {p.name}
                                                    </h3>
                                                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                                        {p.formatted_id} • {p.nic_masked}
                                                    </p>
                                                </div>
                                            </div>

                                            {p.is_possible_duplicate && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300 dark:border-amber-800/40 shrink-0">
                                                    Duplicate
                                                </span>
                                            )}
                                        </div>

                                        {/* Contact & Location */}
                                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 space-y-1.5 text-xs">
                                            <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                                                <span className="font-mono font-semibold">{p.phone_display}</span>
                                                <span className="capitalize">{p.age !== null ? `${p.age} yrs` : '—'} • {p.gender}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                                <span className="truncate">{p.location_display}</span>
                                            </div>
                                        </div>

                                        {/* Allergy Banner if present */}
                                        {p.allergies && (
                                            <div className="mt-2.5 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/50 text-[11px] text-rose-800 dark:text-rose-200 flex items-center gap-1.5">
                                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                                <span className="font-semibold truncate">Allergies: {p.allergies}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer & Actions */}
                                    <div
                                        className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-xs"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="text-[11px] text-slate-400">
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{p.visits_formatted}</span>
                                            <span className="mx-1">•</span>
                                            <span>{p.last_visit}</span>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => handleIssueToken(p)}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-teal-700 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/40 transition-colors"
                                            >
                                                <Ticket className="w-3 h-3" />
                                                <span>Token</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => openPatientSlideOver(p)}
                                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
                                                title="View History"
                                            >
                                                <History className="w-3.5 h-3.5" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => openEditModal(p)}
                                                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
                                                title="Edit Patient"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                )}

                {/* Pagination Controls */}
                {patients.total > 0 && (
                    <div className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                        <div className="text-slate-500 dark:text-slate-400">
                            Showing <span className="font-bold text-slate-900 dark:text-white">{patients.from || 0}</span> to{' '}
                            <span className="font-bold text-slate-900 dark:text-white">{patients.to || 0}</span> of{' '}
                            <span className="font-bold text-slate-900 dark:text-white">{patients.total}</span> patients
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Page size selector */}
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 text-[11px]">Show:</span>
                                <select
                                    value={selectedPerPage}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        setSelectedPerPage(val);
                                        updateQuery({ per_page: val });
                                    }}
                                    className="py-1 px-2 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium"
                                >
                                    <option value={25} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">25</option>
                                    <option value={50} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">50</option>
                                    <option value={100} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">100</option>
                                </select>
                            </div>

                            {/* Pagination links */}
                            <div className="flex items-center gap-1">
                                {patients.links.map((link, idx) => {
                                    if (link.label.includes('Previous')) {
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                disabled={!link.url}
                                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true, preserveScroll: true })}
                                                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                                                title="Previous page"
                                                aria-label="Previous page"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                        );
                                    }

                                    if (link.label.includes('Next')) {
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                disabled={!link.url}
                                                onClick={() => link.url && router.get(link.url, {}, { preserveState: true, preserveScroll: true })}
                                                className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
                                                title="Next page"
                                                aria-label="Next page"
                                            >
                                                <ChevronRight className="w-4 h-4" />
                                            </button>
                                        );
                                    }

                                    return (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => link.url && router.get(link.url, {}, { preserveState: true, preserveScroll: true })}
                                            className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-bold transition-colors ${
                                                link.active
                                                    ? 'bg-primary text-white shadow-xs'
                                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                                            }`}
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* SLIDE-OVER SIDE PANEL */}
            <PatientDetailSlideOver
                isOpen={isSlideOverOpen}
                onClose={() => setIsSlideOverOpen(false)}
                patient={selectedPatient}
                userPermissions={userPermissions}
                onIssueToken={(p) => {
                    handleIssueToken(p);
                }}
                onMoveToken={(v) => {
                    handleMoveTokenFromHistory(v);
                }}
                onEditPatient={(p) => {
                    openEditModal(p);
                }}
            />

            {/* REGISTER / EDIT PATIENT MODAL */}
            <GlassModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                title={editingPatient ? `Edit ${editingPatient.name}` : 'Register patient'}
                subtitle="Enter identity, contact, location, and clinical safety allergies."
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Patient full name *
                            </label>
                            <input
                                type="text"
                                required
                                value={form.data.name}
                                onChange={(e) => form.setData('name', e.target.value)}
                                placeholder="e.g. Sunil Shantha"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Mobile phone (+94) *
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
                                Sri Lankan NIC no.
                            </label>
                            <input
                                type="text"
                                value={form.data.nic}
                                onChange={(e) => form.setData('nic', e.target.value)}
                                placeholder="199012345678 or 901234567V"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary font-medium"
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
                                Date of birth
                            </label>
                            <input
                                type="date"
                                value={form.data.date_of_birth}
                                onChange={(e) => form.setData('date_of_birth', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary font-medium"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Sri Lankan district
                            </label>
                            <GlassSelect
                                value={form.data.district}
                                onChange={(e) => form.setData('district', e.target.value)}
                                searchable={true}
                                options={allDistricts.map((d) => ({ value: d, label: d }))}
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
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary font-medium"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Residential address
                        </label>
                        <input
                            type="text"
                            value={form.data.address}
                            onChange={(e) => form.setData('address', e.target.value)}
                            placeholder="e.g. No. 42, Temple Road"
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary font-medium"
                        />
                    </div>

                    {/* Allergies & Notes */}
                    <div className="p-3.5 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/30 space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-rose-700 dark:text-rose-300 mb-1 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                                Known allergies (drugs / foods)
                            </label>
                            <input
                                type="text"
                                value={form.data.allergies}
                                onChange={(e) => form.setData('allergies', e.target.value)}
                                placeholder="e.g. Penicillin, Aspirin, Sulfa drugs, Peanuts"
                                className="w-full text-xs rounded-xl border border-rose-200 dark:border-rose-800/40 bg-white dark:bg-slate-900 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-rose-500 font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Clinical notes / chronic conditions
                            </label>
                            <textarea
                                rows={2}
                                value={form.data.notes}
                                onChange={(e) => form.setData('notes', e.target.value)}
                                placeholder="e.g. Type 2 Diabetic, Hypertensive on medication"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 py-1.5 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary font-medium"
                            />
                        </div>
                    </div>

                    {/* Emergency Contact */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Emergency contact name
                            </label>
                            <input
                                type="text"
                                value={form.data.emergency_contact_name}
                                onChange={(e) => form.setData('emergency_contact_name', e.target.value)}
                                placeholder="e.g. S. Shantha (Spouse)"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary font-medium"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Emergency contact phone
                            </label>
                            <input
                                type="text"
                                value={form.data.emergency_contact_phone}
                                onChange={(e) => form.setData('emergency_contact_phone', e.target.value)}
                                placeholder="07X XXX XXXX"
                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary font-medium"
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
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md disabled:opacity-50 transition-colors"
                        >
                            {form.processing ? 'Saving...' : editingPatient ? 'Update patient' : 'Save patient'}
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* ASSIGN DOCTOR DRAWER (ISSUE TOKEN) */}
            <AssignDoctorDrawer
                isOpen={assignDrawerOpen}
                onClose={() => setAssignDrawerOpen(false)}
                patient={assignDrawerPatient}
                doctors={doctors}
                visitTypes={visitTypes}
                onTokenIssued={() => {
                    router.reload();
                }}
            />

            {/* MOVE TOKEN MODAL */}
            <MoveTokenModal
                isOpen={moveModalOpen}
                onClose={() => setMoveModalOpen(false)}
                token={tokenToMove}
                doctors={doctors}
                onSuccess={() => {
                    router.reload();
                }}
            />
        </AuthenticatedLayout>
    );
}
