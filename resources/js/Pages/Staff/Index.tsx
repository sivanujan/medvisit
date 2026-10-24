import React, { useState, useMemo } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import InviteTeamMemberModal from './Components/InviteTeamMemberModal';
import { ActionsMenu, ActionMenuItem } from '@/Components/UI/ActionsMenu';
import { EmptyState } from '@/Components/UI/EmptyState';
import {
    Users,
    UserPlus,
    Mail,
    Shield,
    ShieldCheck,
    Stethoscope,
    Pill,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Trash2,
    Edit2,
    Lock,
    Link as LinkIcon,
    Unlink,
    AlertTriangle,
    Search,
    Copy,
    Check,
    ArrowRight,
    ArrowLeft,
    Clock,
    Calendar,
    ChevronRight,
    Eye,
    KeyRound,
    UserCheck,
    Info,
    HelpCircle,
    UserX,
} from 'lucide-react';

interface StaffUser {
    id: number;
    name: string;
    email: string;
    role: string;
    roles: string[];
    role_label: string;
    is_active: boolean;
    is_last_admin: boolean;
    linked_doctor: {
        id: number;
        name: string;
        specialty: string;
        slmc_number?: string;
    } | null;
    is_unrelated_doctor: boolean;
    last_active_at: string;
    created_at_formatted: string;
}

interface PendingInvitation {
    id: number;
    name: string;
    email: string;
    role: string;
    roles: string[];
    role_label: string;
    is_expired: boolean;
    expires_in: string;
    expires_at_formatted: string;
    doctor_name: string | null;
    created_at_formatted: string;
    accept_url: string;
}

interface DoctorOption {
    id: number;
    name: string;
    specialty: string;
    slmc_number?: string;
    is_linked: boolean;
    linked_user_id?: number | null;
    linked_user_name?: string | null;
}

interface PermissionArea {
    area: string;
    description: string;
    clinic_admin: 'full' | 'view' | 'none';
    doctor: 'full' | 'view' | 'none';
    receptionist: 'full' | 'view' | 'none';
    pharmacist: 'full' | 'view' | 'none';
}

interface Props {
    staffUsers: StaffUser[];
    pendingInvitations: PendingInvitation[];
    doctors: DoctorOption[];
    permissionsMatrix: PermissionArea[];
    flashInviteLink?: string | null;
    currentUser: {
        id: number;
        name: string;
        email: string;
        roles: string[];
    };
}

// Predefined role definitions for invite cards
const ROLE_CARDS = [
    {
        id: 'clinic_admin',
        title: 'Clinic administrator',
        icon: ShieldCheck,
        badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
        activeBorder: 'border-[#1E6FD9] ring-2 ring-[#1E6FD9]/20',
        tagline: 'Full administrative control over clinic operations and configurations.',
        bullets: [
            'Manage clinic profile, session settings, and staff accounts',
            'View all doctor payout statements and billing collections',
            'Configure clinic website and MedVisit page builder',
            'Full access to pharmacy dispensaries and prescriptions',
        ],
    },
    {
        id: 'doctor',
        title: 'Doctor / Practitioner',
        icon: Stethoscope,
        badgeColor: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
        activeBorder: 'border-[#0E9E8F] ring-2 ring-[#0E9E8F]/20',
        tagline: 'Clinical practitioner managing patient consultations and prescriptions.',
        bullets: [
            'Conduct consultations and issue electronic prescriptions',
            'Manage personal prescription templates and dosages',
            'View own patient queue and Channeling schedules',
            'Review own doctor earnings and settlement summaries',
        ],
    },
    {
        id: 'receptionist',
        title: 'Receptionist / Front desk',
        icon: Users,
        badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
        activeBorder: 'border-purple-500 ring-2 ring-purple-500/20',
        tagline: 'Front-desk operations for patient arrivals, tokens, and billing.',
        bullets: [
            'Issue live queue tokens and book channeling appointments',
            'Manage patient directory and mark arrivals',
            'Collect cash/card payments and process refunds',
            'View doctor availability and clinic calendars',
        ],
    },
    {
        id: 'pharmacist',
        title: 'Pharmacist / Dispensary',
        icon: Pill,
        badgeColor: 'bg-orange-500/10 text-[#FF7A59] border-orange-500/20',
        activeBorder: 'border-[#FF7A59] ring-2 ring-[#FF7A59]/20',
        tagline: 'Dispensary staff managing medicines, inventory, and stock receipts.',
        bullets: [
            'Dispense medicines against validated prescriptions',
            'Record goods received notes (GRN stock receipts)',
            'Manage suppliers and perform stock level adjustments',
            'Monitor batch expiry dates and low stock alerts',
        ],
    },
];

export default function StaffIndex({
    staffUsers,
    pendingInvitations,
    doctors,
    permissionsMatrix,
    flashInviteLink,
    currentUser,
}: Props) {
    const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'roles'>('members');

    // Search and filters for members tab
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | string>('all');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');

    // Modals
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [inviteStep, setInviteStep] = useState<1 | 2 | 3 | 4>(1);
    const [inviteSuccessLink, setInviteSuccessLink] = useState<string | null>(flashInviteLink || null);

    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [linkDoctorModalOpen, setLinkDoctorModalOpen] = useState(false);
    const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
    const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
    const [resetPasswordConfirmOpen, setResetPasswordConfirmOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);

    // Feedback copy state
    const [copiedInviteId, setCopiedInviteId] = useState<number | string | null>(null);

    // Invite Form
    const inviteForm = useForm({
        name: '',
        email: '',
        phone: '',
        role: 'receptionist',
        secondary_role: '',
        has_secondary_role: false,
        doctor_mode: 'existing' as 'existing' | 'new',
        doctor_id: '',
        create_doctor: false,
        new_doctor: {
            name: '',
            specialty: '',
            slmc_number: '',
        },
        personal_message: '',
    });

    // Role Edit Form
    const roleForm = useForm({
        role: 'receptionist',
        secondary_role: '',
        has_secondary_role: false,
        doctor_id: '',
    });

    // Link Doctor Form
    const linkDoctorForm = useForm({
        doctor_id: '',
    });

    // Handle copying invite link
    const handleCopyLink = (url: string, id: number | string) => {
        navigator.clipboard.writeText(url);
        setCopiedInviteId(id);
        setTimeout(() => setCopiedInviteId(null), 2500);
    };

    // Calculate role chip counts for summary strip
    const roleCounts = useMemo(() => {
        const counts: Record<string, number> = {
            clinic_admin: 0,
            doctor: 0,
            receptionist: 0,
            pharmacist: 0,
        };
        staffUsers.forEach((u) => {
            if (u.is_active) {
                u.roles.forEach((r) => {
                    if (counts[r] !== undefined) {
                        counts[r]++;
                    }
                });
            }
        });
        return counts;
    }, [staffUsers]);

    const activeMembersCount = useMemo(() => {
        return staffUsers.filter((u) => u.is_active).length;
    }, [staffUsers]);

    // Filter and pin current user at top
    const filteredUsers = useMemo(() => {
        let list = staffUsers.filter((u) => {
            const matchesQuery =
                u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (u.linked_doctor && u.linked_doctor.name.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesRole =
                roleFilter === 'all' || u.roles.includes(roleFilter) || u.role === roleFilter;

            const matchesStatus =
                statusFilter === 'all' ||
                (statusFilter === 'active' && u.is_active) ||
                (statusFilter === 'deactivated' && !u.is_active);

            return matchesQuery && matchesRole && matchesStatus;
        });

        // Pin current user at index 0
        list.sort((a, b) => {
            if (a.id === currentUser.id) return -1;
            if (b.id === currentUser.id) return 1;
            return a.name.localeCompare(b.name);
        });

        return list;
    }, [staffUsers, searchQuery, roleFilter, statusFilter, currentUser.id]);

    // Check if entered invite email already belongs to a staff member or pending invite
    const emailConflict = useMemo(() => {
        const email = inviteForm.data.email.trim().toLowerCase();
        if (!email) return null;

        const existingMember = staffUsers.find((u) => u.email.toLowerCase() === email);
        if (existingMember) {
            return {
                type: 'member' as const,
                message: `A team member with this email address is already active (${existingMember.name}).`,
            };
        }

        const pending = pendingInvitations.find((i) => i.email.toLowerCase() === email && !i.is_expired);
        if (pending) {
            return {
                type: 'pending' as const,
                inviteId: pending.id,
                message: `A pending invitation was already sent to this email (${pending.role_label}).`,
            };
        }

        return null;
    }, [inviteForm.data.email, staffUsers, pendingInvitations]);

    // Open Invite Modal
    const handleOpenInviteModal = () => {
        setInviteModalOpen(true);
    };

    // Open Role Edit Modal
    const handleOpenRoleModal = (user: StaffUser) => {
        setSelectedUser(user);
        const secRole = user.roles.find((r) => r !== user.role) || '';
        roleForm.setData({
            role: user.role,
            secondary_role: secRole,
            has_secondary_role: Boolean(secRole),
            doctor_id: user.linked_doctor ? String(user.linked_doctor.id) : '',
        });
        setRoleModalOpen(true);
    };

    const handleSaveRole = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        roleForm.put(`/staff/${selectedUser.id}/role`, {
            preserveScroll: true,
            onSuccess: () => {
                setRoleModalOpen(false);
                setSelectedUser(null);
            },
        });
    };

    // Open Link Doctor Modal
    const handleOpenLinkDoctorModal = (user: StaffUser) => {
        setSelectedUser(user);
        linkDoctorForm.setData({
            doctor_id: user.linked_doctor ? String(user.linked_doctor.id) : '',
        });
        setLinkDoctorModalOpen(true);
    };

    const handleSaveDoctorLink = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        linkDoctorForm.post(`/staff/${selectedUser.id}/link-doctor`, {
            preserveScroll: true,
            onSuccess: () => {
                setLinkDoctorModalOpen(false);
                setSelectedUser(null);
            },
        });
    };

    // Handle Unlink Doctor
    const handleConfirmUnlinkDoctor = () => {
        if (!selectedUser) return;

        router.post(
            `/staff/${selectedUser.id}/unlink-doctor`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setUnlinkConfirmOpen(false);
                    setSelectedUser(null);
                },
            }
        );
    };

    // Handle Toggle Status (Deactivate / Reactivate)
    const handleToggleStatus = (user: StaffUser) => {
        router.patch(
            `/staff/${user.id}/toggle`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setDeactivateConfirmOpen(false);
                    setSelectedUser(null);
                },
            }
        );
    };

    // Handle Password Reset Link
    const handleSendPasswordReset = () => {
        if (!selectedUser) return;

        router.post(
            `/staff/${selectedUser.id}/reset-password`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    setResetPasswordConfirmOpen(false);
                    setSelectedUser(null);
                },
            }
        );
    };

    // Get Avatar Initials & Color
    const getAvatarBadge = (name: string, role: string) => {
        const initials = name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0].toUpperCase())
            .join('');

        const colors: Record<string, string> = {
            clinic_admin: 'bg-blue-600 text-white',
            doctor: 'bg-teal-600 text-white',
            receptionist: 'bg-purple-600 text-white',
            pharmacist: 'bg-orange-500 text-white',
        };

        return (
            <div
                className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm shadow-sm shrink-0 ${
                    colors[role] || 'bg-slate-700 text-white'
                }`}
            >
                {initials || 'U'}
            </div>
        );
    };

    // Role pill style helper
    const renderRolePills = (roles: string[]) => {
        const styles: Record<string, { label: string; bg: string }> = {
            clinic_admin: {
                label: 'Admin',
                bg: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
            },
            doctor: {
                label: 'Doctor',
                bg: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
            },
            receptionist: {
                label: 'Reception',
                bg: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20',
            },
            pharmacist: {
                label: 'Pharmacy',
                bg: 'bg-orange-500/10 text-[#FF7A59] border-orange-500/20',
            },
        };

        return (
            <div className="flex flex-wrap gap-1.5 items-center">
                {roles.map((r) => {
                    const item = styles[r] || {
                        label: ucwords(r.replace('_', ' ')),
                        bg: 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200/50',
                    };
                    return (
                        <span
                            key={r}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${item.bg}`}
                        >
                            {item.label}
                        </span>
                    );
                })}
            </div>
        );
    };

    function ucwords(str: string): string {
        return str.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
    }

    return (
        <AuthenticatedLayout>
            <Head title="Staff & team - MedVisit" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Poppins',sans-serif]">
                {/* 1. Page Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            Staff & team
                        </h1>
                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 mt-1">
                            Who can sign in to your clinic and what they can do.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setActiveTab('roles')}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white/70 dark:bg-slate-800/70 border border-slate-200/70 dark:border-white/10 shadow-sm hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                        >
                            <Shield className="w-4 h-4 text-slate-500" />
                            <span>Roles & permissions</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleOpenInviteModal}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/40"
                        >
                            <UserPlus className="w-4 h-4" />
                            <span>Invite team member</span>
                        </button>
                    </div>
                </div>

                {/* 2. Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <GlassCard className="p-4 flex items-center gap-3.5 lg:col-span-2">
                        <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-[#1E6FD9] flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Active team members
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white">
                                {activeMembersCount} {activeMembersCount === 1 ? 'member' : 'members'}
                            </div>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex flex-col justify-center lg:col-span-3">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                            Members by role
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                Admin {roleCounts.clinic_admin}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                Doctor {roleCounts.doctor}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                Reception {roleCounts.receptionist}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-orange-50 dark:bg-orange-950/40 text-[#FF7A59] border border-orange-200/50 dark:border-orange-800/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A59]" />
                                Pharmacy {roleCounts.pharmacist}
                            </span>
                        </div>
                    </GlassCard>

                    <GlassCard className="p-4 flex items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                Pending invites
                            </div>
                            <div className="text-xl font-bold text-slate-900 dark:text-white">
                                {pendingInvitations.length}
                            </div>
                        </div>
                    </GlassCard>
                </div>

                {/* 3. Navigation Tabs */}
                <div className="flex border-b border-slate-200/70 dark:border-white/10 gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('members')}
                        className={`pb-3.5 px-4 text-sm font-semibold transition-all relative ${
                            activeTab === 'members'
                                ? 'text-[#1E6FD9] dark:text-[#1E6FD9]'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <span>Members ({staffUsers.length})</span>
                        {activeTab === 'members' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E6FD9] rounded-full" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('invitations')}
                        className={`pb-3.5 px-4 text-sm font-semibold transition-all relative ${
                            activeTab === 'invitations'
                                ? 'text-[#1E6FD9] dark:text-[#1E6FD9]'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <span>Pending invites ({pendingInvitations.length})</span>
                        {activeTab === 'invitations' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E6FD9] rounded-full" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('roles')}
                        className={`pb-3.5 px-4 text-sm font-semibold transition-all relative ${
                            activeTab === 'roles'
                                ? 'text-[#1E6FD9] dark:text-[#1E6FD9]'
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                        }`}
                    >
                        <span>Roles & permissions</span>
                        {activeTab === 'roles' && (
                            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E6FD9] rounded-full" />
                        )}
                    </button>
                </div>

                {/* 4. Tab Content: MEMBERS */}
                {activeTab === 'members' && (
                    <div className="space-y-4">
                        {/* Filters bar */}
                        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search by name, email, or linked doctor..."
                                    className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                                />
                            </div>

                            <div className="flex items-center gap-2 flex-wrap">
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                                >
                                    <option value="all">All roles</option>
                                    <option value="clinic_admin">Admin</option>
                                    <option value="doctor">Doctor</option>
                                    <option value="receptionist">Receptionist</option>
                                    <option value="pharmacist">Pharmacist</option>
                                </select>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value as any)}
                                    className="px-3 py-2 text-xs font-medium rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                                >
                                    <option value="all">All statuses</option>
                                    <option value="active">Active</option>
                                    <option value="deactivated">Deactivated</option>
                                </select>
                            </div>
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block">
                            <GlassCard className="overflow-visible border border-white/60 dark:border-white/10 shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <tr>
                                            <th className="py-3.5 px-6">Member</th>
                                            <th className="py-3.5 px-4">Role</th>
                                            <th className="py-3.5 px-4">Linked doctor profile</th>
                                            <th className="py-3.5 px-4">Status</th>
                                            <th className="py-3.5 px-4">Last active</th>
                                            <th className="py-3.5 px-4">Joined date</th>
                                            <th className="py-3.5 px-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                                        {filteredUsers.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-12 text-center text-slate-400">
                                                    No members match your criteria.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredUsers.map((member) => {
                                                const isCurrent = member.id === currentUser.id;

                                                // Prepare Actions Menu items
                                                const actionItems: ActionMenuItem[] = [
                                                    {
                                                        label: 'Edit role',
                                                        icon: Edit2,
                                                        onClick: () => handleOpenRoleModal(member),
                                                    },
                                                    {
                                                        label: member.linked_doctor
                                                            ? 'Change doctor link'
                                                            : 'Link doctor profile',
                                                        icon: LinkIcon,
                                                        onClick: () => handleOpenLinkDoctorModal(member),
                                                    },
                                                    ...(member.linked_doctor
                                                        ? [
                                                              {
                                                                  label: 'Unlink doctor profile',
                                                                  icon: Unlink,
                                                                  onClick: () => {
                                                                      setSelectedUser(member);
                                                                      setUnlinkConfirmOpen(true);
                                                                  },
                                                              },
                                                          ]
                                                        : []),
                                                    {
                                                        label: 'Send password reset link',
                                                        icon: KeyRound,
                                                        onClick: () => {
                                                            setSelectedUser(member);
                                                            setResetPasswordConfirmOpen(true);
                                                        },
                                                    },
                                                    {
                                                        label: member.is_active ? 'Deactivate member' : 'Reactivate member',
                                                        icon: member.is_active ? UserX : CheckCircle2,
                                                        danger: member.is_active,
                                                        disabled: isCurrent || (member.is_last_admin && member.is_active),
                                                        title: isCurrent
                                                            ? 'You cannot deactivate your own account.'
                                                            : member.is_last_admin && member.is_active
                                                            ? 'Cannot deactivate the only active clinic administrator.'
                                                            : undefined,
                                                        onClick: () => {
                                                            setSelectedUser(member);
                                                            setDeactivateConfirmOpen(true);
                                                        },
                                                    },
                                                ];

                                                return (
                                                    <tr
                                                        key={member.id}
                                                        className={`hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors ${
                                                            isCurrent
                                                                ? 'bg-blue-50/30 dark:bg-blue-950/20'
                                                                : ''
                                                        }`}
                                                    >
                                                        {/* Member details */}
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-3.5">
                                                                {getAvatarBadge(member.name, member.role)}
                                                                <div>
                                                                    <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
                                                                        <span>{member.name}</span>
                                                                        {isCurrent && (
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#1E6FD9] text-white">
                                                                                You
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                                        {member.email}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Role */}
                                                        <td className="py-4 px-4">
                                                            {renderRolePills(member.roles)}
                                                        </td>

                                                        {/* Linked doctor */}
                                                        <td className="py-4 px-4">
                                                            {member.linked_doctor ? (
                                                                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-white/10 px-2.5 py-1 rounded-lg">
                                                                    <Stethoscope className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                                                                    <span className="truncate max-w-[150px]">
                                                                        {member.linked_doctor.name}
                                                                    </span>
                                                                    {member.is_unrelated_doctor && (
                                                                        <span
                                                                            title={`Check this link: Account name ('${member.name}') differs from doctor profile ('${member.linked_doctor.name}')`}
                                                                            className="cursor-help text-amber-500 hover:text-amber-600 inline-flex items-center"
                                                                        >
                                                                            <AlertTriangle className="w-3.5 h-3.5" />
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <span className="text-slate-400 text-xs">—</span>
                                                            )}
                                                        </td>

                                                        {/* Status */}
                                                        <td className="py-4 px-4">
                                                            {member.is_active ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                    Active
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/20">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                    Deactivated
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Last active */}
                                                        <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400">
                                                            {member.last_active_at}
                                                        </td>

                                                        {/* Joined date */}
                                                        <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400">
                                                            {member.created_at_formatted}
                                                        </td>

                                                        {/* Actions */}
                                                        <td className="py-4 px-6 text-right">
                                                            <ActionsMenu
                                                                items={actionItems}
                                                                align="right"
                                                                ariaLabel={`Actions for ${member.name}`}
                                                            />
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </GlassCard>
                        </div>

                        {/* Mobile Cards View */}
                        <div className="grid grid-cols-1 gap-3 md:hidden">
                            {filteredUsers.length === 0 ? (
                                <GlassCard className="p-8 text-center text-slate-400 text-sm">
                                    No members match your criteria.
                                </GlassCard>
                            ) : (
                                filteredUsers.map((member) => {
                                    const isCurrent = member.id === currentUser.id;
                                    const actionItems: ActionMenuItem[] = [
                                        {
                                            label: 'Edit role',
                                            icon: Edit2,
                                            onClick: () => handleOpenRoleModal(member),
                                        },
                                        {
                                            label: member.linked_doctor ? 'Change doctor link' : 'Link doctor profile',
                                            icon: LinkIcon,
                                            onClick: () => handleOpenLinkDoctorModal(member),
                                        },
                                        ...(member.linked_doctor
                                            ? [
                                                  {
                                                      label: 'Unlink doctor profile',
                                                      icon: Unlink,
                                                      onClick: () => {
                                                          setSelectedUser(member);
                                                          setUnlinkConfirmOpen(true);
                                                      },
                                                  },
                                              ]
                                            : []),
                                        {
                                            label: 'Send password reset link',
                                            icon: KeyRound,
                                            onClick: () => {
                                                setSelectedUser(member);
                                                setResetPasswordConfirmOpen(true);
                                            },
                                        },
                                        {
                                            label: member.is_active ? 'Deactivate member' : 'Reactivate member',
                                            icon: member.is_active ? UserX : CheckCircle2,
                                            danger: member.is_active,
                                            disabled: isCurrent || (member.is_last_admin && member.is_active),
                                            title: isCurrent
                                                ? 'You cannot deactivate your own account.'
                                                : member.is_last_admin && member.is_active
                                                ? 'Cannot deactivate the only active clinic administrator.'
                                                : undefined,
                                            onClick: () => {
                                                setSelectedUser(member);
                                                setDeactivateConfirmOpen(true);
                                            },
                                        },
                                    ];

                                    return (
                                        <GlassCard
                                            key={member.id}
                                            className={`p-4 space-y-3 ${
                                                isCurrent ? 'ring-1 ring-[#1E6FD9]/30 bg-blue-50/30' : ''
                                            }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-3">
                                                    {getAvatarBadge(member.name, member.role)}
                                                    <div>
                                                        <div className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-white">
                                                            <span>{member.name}</span>
                                                            {isCurrent && (
                                                                <span className="text-[10px] font-bold bg-[#1E6FD9] text-white px-1.5 py-0.5 rounded">
                                                                    You
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                                            {member.email}
                                                        </div>
                                                    </div>
                                                </div>

                                                <ActionsMenu items={actionItems} align="right" />
                                            </div>

                                            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-white/5 text-xs">
                                                {renderRolePills(member.roles)}

                                                {member.is_active ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300">
                                                        Deactivated
                                                    </span>
                                                )}
                                            </div>

                                            {member.linked_doctor && (
                                                <div className="flex items-center justify-between text-xs bg-slate-50 dark:bg-white/5 p-2 rounded-lg">
                                                    <span className="text-slate-500">Doctor profile:</span>
                                                    <div className="flex items-center gap-1 font-medium text-slate-800 dark:text-slate-200">
                                                        <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                                                        <span>{member.linked_doctor.name}</span>
                                                        {member.is_unrelated_doctor && (
                                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center justify-between text-[11px] text-slate-400">
                                                <span>Joined {member.created_at_formatted}</span>
                                                <span>Active {member.last_active_at}</span>
                                            </div>
                                        </GlassCard>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* 5. Tab Content: PENDING INVITATIONS */}
                {activeTab === 'invitations' && (
                    <div className="space-y-4">
                        {pendingInvitations.length === 0 ? (
                            <GlassCard className="p-12 text-center">
                                <EmptyState
                                    icon={Mail}
                                    title="No pending invitations"
                                    description="All invited team members have accepted their invitations or no invites are active."
                                    action={
                                        <button
                                            type="button"
                                            onClick={handleOpenInviteModal}
                                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1E6FD9] hover:bg-[#1E6FD9]/90 shadow-sm"
                                        >
                                            <UserPlus className="w-3.5 h-3.5" />
                                            <span>Invite team member</span>
                                        </button>
                                    }
                                />
                            </GlassCard>
                        ) : (
                            <GlassCard className="overflow-visible border border-white/60 dark:border-white/10 shadow-sm">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                        <tr>
                                            <th className="py-3.5 px-6">Invitee</th>
                                            <th className="py-3.5 px-4">Assigned role</th>
                                            <th className="py-3.5 px-4">Doctor profile</th>
                                            <th className="py-3.5 px-4">Sent date</th>
                                            <th className="py-3.5 px-4">Expires in</th>
                                            <th className="py-3.5 px-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                                        {pendingInvitations.map((inv) => {
                                            const isCopied = copiedInviteId === inv.id;

                                            return (
                                                <tr
                                                    key={inv.id}
                                                    className={`hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors ${
                                                        inv.is_expired ? 'opacity-60 bg-slate-50/40 dark:bg-white/5' : ''
                                                    }`}
                                                >
                                                    <td className="py-4 px-6">
                                                        <div className="font-semibold text-slate-900 dark:text-white">
                                                            {inv.name}
                                                        </div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                                            {inv.email}
                                                        </div>
                                                    </td>

                                                    <td className="py-4 px-4">
                                                        {renderRolePills(inv.roles)}
                                                    </td>

                                                    <td className="py-4 px-4 text-xs">
                                                        {inv.doctor_name ? (
                                                            <span className="font-medium text-slate-700 dark:text-slate-300">
                                                                {inv.doctor_name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400">—</span>
                                                        )}
                                                    </td>

                                                    <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400">
                                                        {inv.created_at_formatted}
                                                    </td>

                                                    <td className="py-4 px-4">
                                                        {inv.is_expired ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-700 dark:text-rose-300">
                                                                Expired
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300">
                                                                <Clock className="w-3 h-3" />
                                                                {inv.expires_in}
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="py-4 px-6 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyLink(inv.accept_url, inv.id)}
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 transition-colors"
                                                                title="Copy invitation link"
                                                            >
                                                                {isCopied ? (
                                                                    <>
                                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                                        <span className="text-emerald-600 font-semibold">
                                                                            Copied!
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                                                                        <span>Copy link</span>
                                                                    </>
                                                                )}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    router.post(
                                                                        `/staff/invitations/${inv.id}/resend`,
                                                                        {},
                                                                        { preserveScroll: true }
                                                                    )
                                                                }
                                                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#1E6FD9] bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 transition-colors"
                                                            >
                                                                <RotateCcw className="w-3.5 h-3.5" />
                                                                <span>Resend</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (confirm('Revoke this invitation? The invite link will no longer work.')) {
                                                                        router.delete(`/staff/invitations/${inv.id}`, {
                                                                            preserveScroll: true,
                                                                        });
                                                                    }
                                                                }}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                                                title="Revoke invitation"
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
                            </GlassCard>
                        )}
                    </div>
                )}

                {/* 6. Tab Content: ROLES & PERMISSIONS MATRIX */}
                {activeTab === 'roles' && (
                    <div className="space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                    Permission matrix by clinic area
                                </h3>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                    Computed from live Spatie role permissions.
                                </p>
                            </div>

                            <div className="flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                                        ✓
                                    </span>
                                    Full access
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
                                        <Eye className="w-3 h-3" />
                                    </span>
                                    View only
                                </span>
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="text-slate-400 font-bold">—</span>
                                    No access
                                </span>
                            </div>
                        </div>

                        <GlassCard className="overflow-hidden border border-white/60 dark:border-white/10 shadow-sm">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-xs font-semibold uppercase tracking-wider">
                                    <tr>
                                        <th className="py-4 px-6 text-slate-600 dark:text-slate-300 w-2/5">
                                            Area / Module
                                        </th>
                                        <th className="py-4 px-4 text-blue-600 dark:text-blue-400 text-center">
                                            Clinic admin
                                        </th>
                                        <th className="py-4 px-4 text-teal-600 dark:text-teal-400 text-center">
                                            Doctor
                                        </th>
                                        <th className="py-4 px-4 text-purple-600 dark:text-purple-400 text-center">
                                            Receptionist
                                        </th>
                                        <th className="py-4 px-4 text-[#FF7A59] text-center">
                                            Pharmacist
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/60 dark:divide-white/5">
                                    {permissionsMatrix.map((item, idx) => {
                                        const renderCell = (level: 'full' | 'view' | 'none') => {
                                            if (level === 'full') {
                                                return (
                                                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                                        ✓
                                                    </span>
                                                );
                                            }
                                            if (level === 'view') {
                                                return (
                                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                                        View only
                                                    </span>
                                                );
                                            }
                                            return <span className="text-slate-300 dark:text-slate-600 font-bold">—</span>;
                                        };

                                        return (
                                            <tr
                                                key={idx}
                                                className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors"
                                            >
                                                <td className="py-3.5 px-6">
                                                    <div className="font-semibold text-slate-900 dark:text-white">
                                                        {item.area}
                                                    </div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                                        {item.description}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    {renderCell(item.clinic_admin)}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    {renderCell(item.doctor)}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    {renderCell(item.receptionist)}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    {renderCell(item.pharmacist)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </GlassCard>
                    </div>
                )}

                {/* 7. REDESIGNED INVITE MODAL (MULTI-STEP) */}
                <InviteTeamMemberModal
                    isOpen={inviteModalOpen}
                    onClose={() => setInviteModalOpen(false)}
                    staffUsers={staffUsers}
                    pendingInvitations={pendingInvitations}
                    doctors={doctors}
                    clinicName={(usePage().props as any)?.tenant?.name || 'MedVisit'}
                    clinicLogoUrl={(usePage().props as any)?.tenant?.logo_url || null}
                    flashInviteLink={flashInviteLink}
                />

                {/* 8. EDIT ROLE MODAL */}
                <GlassModal
                    isOpen={roleModalOpen}
                    onClose={() => {
                        setRoleModalOpen(false);
                        setSelectedUser(null);
                    }}
                    maxWidth="max-w-lg"
                    title={`Edit role for ${selectedUser?.name}`}
                    subtitle="Update assigned permissions and optional secondary role"
                >
                    <form onSubmit={handleSaveRole} className="space-y-4">
                        {selectedUser?.is_last_admin && (
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <strong>Last administrator protection:</strong> This user is the only active clinic administrator. They cannot be demoted without assigning another administrator first.
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                                Primary role
                            </label>
                            <select
                                value={roleForm.data.role}
                                disabled={selectedUser?.is_last_admin}
                                onChange={(e) => roleForm.setData('role', e.target.value)}
                                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            >
                                <option value="clinic_admin">Clinic administrator</option>
                                <option value="doctor">Doctor</option>
                                <option value="receptionist">Receptionist</option>
                                <option value="pharmacist">Pharmacist</option>
                            </select>
                        </div>

                        <div>
                            <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={roleForm.data.has_secondary_role}
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        roleForm.setData((prev) => ({
                                            ...prev,
                                            has_secondary_role: checked,
                                            secondary_role: checked ? prev.secondary_role : '',
                                        }));
                                    }}
                                    className="rounded text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                />
                                <span>Assign a secondary role</span>
                            </label>

                            {roleForm.data.has_secondary_role && (
                                <div className="mt-2">
                                    <select
                                        value={roleForm.data.secondary_role}
                                        onChange={(e) => roleForm.setData('secondary_role', e.target.value)}
                                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    >
                                        <option value="">-- Choose secondary role --</option>
                                        <option value="clinic_admin">Clinic administrator</option>
                                        <option value="doctor">Doctor</option>
                                        <option value="receptionist">Receptionist</option>
                                        <option value="pharmacist">Pharmacist</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200/70 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => {
                                    setRoleModalOpen(false);
                                    setSelectedUser(null);
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={roleForm.processing}
                                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#1E6FD9] hover:bg-[#1E6FD9]/90 shadow-sm"
                            >
                                {roleForm.processing ? 'Saving...' : 'Save role changes'}
                            </button>
                        </div>
                    </form>
                </GlassModal>

                {/* 9. LINK DOCTOR MODAL */}
                <GlassModal
                    isOpen={linkDoctorModalOpen}
                    onClose={() => {
                        setLinkDoctorModalOpen(false);
                        setSelectedUser(null);
                    }}
                    maxWidth="max-w-md"
                    title={`Link doctor profile to ${selectedUser?.name}`}
                    subtitle="Connect clinical schedule, queue calls, and payout statements"
                >
                    <form onSubmit={handleSaveDoctorLink} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Select doctor profile
                            </label>
                            <select
                                value={linkDoctorForm.data.doctor_id}
                                onChange={(e) => linkDoctorForm.setData('doctor_id', e.target.value)}
                                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            >
                                <option value="">-- No doctor profile (Unlinked) --</option>
                                {doctors.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name} ({d.specialty || 'General'})
                                        {d.is_linked
                                            ? d.linked_user_id === selectedUser?.id
                                                ? ' [Currently linked to this user]'
                                                : ` [Linked to ${d.linked_user_name}]`
                                            : ' [Unlinked]'}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200/70 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => {
                                    setLinkDoctorModalOpen(false);
                                    setSelectedUser(null);
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={linkDoctorForm.processing}
                                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#0E9E8F] hover:bg-[#0E9E8F]/90 shadow-sm"
                            >
                                {linkDoctorForm.processing ? 'Saving...' : 'Update linkage'}
                            </button>
                        </div>
                    </form>
                </GlassModal>

                {/* 10. UNLINK DOCTOR CONFIRM MODAL */}
                <GlassModal
                    isOpen={unlinkConfirmOpen}
                    onClose={() => {
                        setUnlinkConfirmOpen(false);
                        setSelectedUser(null);
                    }}
                    maxWidth="max-w-md"
                    title="Unlink doctor profile?"
                    subtitle={`Unlinking ${selectedUser?.name} from ${selectedUser?.linked_doctor?.name}`}
                >
                    <div className="space-y-4">
                        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                                This user will no longer be linked to <strong>{selectedUser?.linked_doctor?.name}</strong>. They will not see personal doctor queues, prescriptions authored under this profile, or individual doctor settlements.
                            </div>
                        </div>

                        <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200/70 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => {
                                    setUnlinkConfirmOpen(false);
                                    setSelectedUser(null);
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmUnlinkDoctor}
                                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm"
                            >
                                Confirm unlinking
                            </button>
                        </div>
                    </div>
                </GlassModal>

                {/* 11. DEACTIVATE / REACTIVATE CONFIRM MODAL */}
                <GlassModal
                    isOpen={deactivateConfirmOpen}
                    onClose={() => {
                        setDeactivateConfirmOpen(false);
                        setSelectedUser(null);
                    }}
                    maxWidth="max-w-md"
                    title={
                        selectedUser?.is_active
                            ? `Deactivate ${selectedUser?.name}?`
                            : `Reactivate ${selectedUser?.name}?`
                    }
                    subtitle={
                        selectedUser?.is_active
                            ? 'Safety Rule Enforcement: Immediate session revocation'
                            : 'Restore full system access for this member'
                    }
                >
                    <div className="space-y-4">
                        {selectedUser?.is_active ? (
                            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/70 text-xs text-rose-800 dark:text-rose-200 space-y-2">
                                <div className="font-semibold flex items-center gap-1.5 text-rose-700 dark:text-rose-300">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    <span>Immediate Access Revocation</span>
                                </div>
                                <p>
                                    When deactivated, <strong>{selectedUser.name}</strong> will be <strong>logged out immediately</strong> on all active browser sessions and API tokens. They will not be able to sign in until reactivated by an administrator.
                                </p>
                            </div>
                        ) : (
                            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/70 text-xs text-emerald-800 dark:text-emerald-200 space-y-2">
                                <div className="font-semibold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    <span>Restoring Account Access</span>
                                </div>
                                <p>
                                    <strong>{selectedUser?.name}</strong> will regain access to their assigned roles and permissions.
                                </p>
                            </div>
                        )}

                        <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200/70 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => {
                                    setDeactivateConfirmOpen(false);
                                    setSelectedUser(null);
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => selectedUser && handleToggleStatus(selectedUser)}
                                className={`px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all ${
                                    selectedUser?.is_active
                                        ? 'bg-rose-600 hover:bg-rose-700'
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
                                {selectedUser?.is_active ? 'Yes, deactivate member' : 'Yes, reactivate member'}
                            </button>
                        </div>
                    </div>
                </GlassModal>

                {/* 12. RESET PASSWORD CONFIRM MODAL */}
                <GlassModal
                    isOpen={resetPasswordConfirmOpen}
                    onClose={() => {
                        setResetPasswordConfirmOpen(false);
                        setSelectedUser(null);
                    }}
                    maxWidth="max-w-md"
                    title={`Send password reset link to ${selectedUser?.name}?`}
                    subtitle={`Dispatches an official reset email to ${selectedUser?.email}`}
                >
                    <div className="space-y-4">
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                            A secure, time-limited password reset link will be sent to <strong>{selectedUser?.email}</strong> allowing them to set a new password.
                        </p>

                        <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200/70 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => {
                                    setResetPasswordConfirmOpen(false);
                                    setSelectedUser(null);
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSendPasswordReset}
                                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#1E6FD9] hover:bg-[#1E6FD9]/90 shadow-sm"
                            >
                                Send reset link
                            </button>
                        </div>
                    </div>
                </GlassModal>
            </div>
        </AuthenticatedLayout>
    );
}
