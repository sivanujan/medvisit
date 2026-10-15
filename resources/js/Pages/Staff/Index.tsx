import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import { Tabs } from '@/Components/UI/Tabs';
import GlassSelect from '@/Components/UI/GlassSelect';
import {
    Users,
    UserPlus,
    Mail,
    Shield,
    Stethoscope,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Trash2,
    Edit2,
    Lock,
    Link as LinkIcon,
    AlertTriangle,
} from 'lucide-react';

interface StaffUser {
    id: number;
    name: string;
    email: string;
    role: string;
    role_label: string;
    is_active: boolean;
    is_last_admin: boolean;
    linked_doctor: {
        id: number;
        name: string;
        specialty: string;
    } | null;
    created_at_formatted: string;
}

interface PendingInvitation {
    id: number;
    name: string;
    email: string;
    role: string;
    role_label: string;
    is_expired: boolean;
    expires_at_formatted: string;
    doctor_name: string | null;
    created_at_formatted: string;
}

interface DoctorOption {
    id: number;
    name: string;
    specialty: string;
    is_linked: boolean;
}

interface Props {
    staffUsers: StaffUser[];
    pendingInvitations: PendingInvitation[];
    doctors: DoctorOption[];
    currentUser: {
        id: number;
        name: string;
        email: string;
    };
}

export default function StaffIndex({
    staffUsers,
    pendingInvitations,
    doctors,
    currentUser,
}: Props) {
    const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');

    // Modals
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [roleModalOpen, setRoleModalOpen] = useState(false);
    const [linkDoctorModalOpen, setLinkDoctorModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);

    // Invite Form
    const inviteForm = useForm({
        name: '',
        email: '',
        role: 'receptionist',
        doctor_id: '',
    });

    // Role Form
    const roleForm = useForm({
        role: 'receptionist',
        doctor_id: '',
    });

    // Link Doctor Form
    const linkDoctorForm = useForm({
        doctor_id: '',
    });

    const openInviteModal = () => {
        inviteForm.reset();
        setInviteModalOpen(true);
    };

    const submitInvite = (e: React.FormEvent) => {
        e.preventDefault();
        inviteForm.post('/staff/invite', {
            onSuccess: () => {
                setInviteModalOpen(false);
                inviteForm.reset();
            },
        });
    };

    const resendInvite = (inv: PendingInvitation) => {
        router.post(`/staff/invitations/${inv.id}/resend`, {}, { preserveScroll: true });
    };

    const revokeInvite = (inv: PendingInvitation) => {
        if (confirm(`Revoke invitation for ${inv.email}?`)) {
            router.delete(`/staff/invitations/${inv.id}`, { preserveScroll: true });
        }
    };

    const toggleStatus = (u: StaffUser) => {
        if (u.is_last_admin) {
            alert('Cannot deactivate the last remaining clinic administrator.');
            return;
        }

        const action = u.is_active ? 'deactivate' : 'reactivate';
        if (confirm(`Are you sure you want to ${action} ${u.name}?`)) {
            router.patch(`/staff/${u.id}/toggle`, {}, { preserveScroll: true });
        }
    };

    const openRoleModal = (u: StaffUser) => {
        setSelectedUser(u);
        roleForm.setData({
            role: u.role,
            doctor_id: u.linked_doctor ? String(u.linked_doctor.id) : '',
        });
        setRoleModalOpen(true);
    };

    const submitRoleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        roleForm.put(`/staff/${selectedUser.id}/role`, {
            onSuccess: () => setRoleModalOpen(false),
        });
    };

    const openLinkDoctorModal = (u: StaffUser) => {
        setSelectedUser(u);
        linkDoctorForm.setData({
            doctor_id: u.linked_doctor ? String(u.linked_doctor.id) : '',
        });
        setLinkDoctorModalOpen(true);
    };

    const submitLinkDoctor = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;

        linkDoctorForm.post(`/staff/${selectedUser.id}/link-doctor`, {
            onSuccess: () => setLinkDoctorModalOpen(false),
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Staff & Team" />

            <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/40">
                                Team Management
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mt-1">
                            Staff & Team Permissions
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Manage clinical permissions, invite members via automated Resend emails, and link practitioners to consulting profiles.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={openInviteModal}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Invite Team Member</span>
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-slate-200/80 dark:border-white/10 pb-4">
                    <Tabs
                        tabs={[
                            { id: 'members', label: 'Active Staff Members', count: staffUsers.length, icon: Users },
                            { id: 'invitations', label: 'Pending Invitations', count: pendingInvitations.length, icon: Mail },
                        ]}
                        activeTab={activeTab}
                        onChange={(id) => setActiveTab(id as any)}
                    />
                </div>

                {/* TAB 1: ACTIVE STAFF MEMBERS */}
                {activeTab === 'members' && (
                    <div className="space-y-4">
                        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-slate-500 uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="py-3 px-4">Staff Member</th>
                                        <th className="py-3 px-4">Role & Access</th>
                                        <th className="py-3 px-4">Linked Doctor Profile</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Joined Date</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {staffUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary/20 to-teal-500/20 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                                                        {u.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-slate-900 dark:text-white block">
                                                            {u.name}
                                                            {u.id === currentUser.id && (
                                                                <span className="ml-1.5 text-[10px] text-primary font-bold">(You)</span>
                                                            )}
                                                        </span>
                                                        <span className="text-[11px] text-slate-400">{u.email}</span>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3 px-4">
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                                        u.role === 'clinic_admin'
                                                            ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                                                            : u.role === 'doctor'
                                                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                    }`}
                                                >
                                                    {u.role_label}
                                                </span>
                                            </td>

                                            <td className="py-3 px-4">
                                                {u.linked_doctor ? (
                                                    <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                                        <Stethoscope className="w-3.5 h-3.5 text-primary shrink-0" />
                                                        <span className="font-semibold">{u.linked_doctor.name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-[11px] italic">
                                                        Not Linked
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3 px-4">
                                                <span
                                                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                        u.is_active
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                                    }`}
                                                >
                                                    {u.is_active ? 'Active' : 'Deactivated'}
                                                </span>
                                            </td>

                                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px]">
                                                {u.created_at_formatted}
                                            </td>

                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => openRoleModal(u)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-primary-50 dark:hover:bg-primary-950/40"
                                                        title="Change Role"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => openLinkDoctorModal(u)}
                                                        className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40"
                                                        title="Link / Change Doctor Profile"
                                                    >
                                                        <LinkIcon className="w-3.5 h-3.5" />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() => toggleStatus(u)}
                                                        disabled={u.is_last_admin}
                                                        className={`text-[11px] font-semibold px-2 py-1 rounded-lg transition-colors ${
                                                            u.is_last_admin
                                                                ? 'text-slate-400 bg-slate-100 dark:bg-white/5 cursor-not-allowed opacity-50'
                                                                : u.is_active
                                                                ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                                                : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                                        }`}
                                                        title={u.is_last_admin ? 'Last admin protected' : undefined}
                                                    >
                                                        {u.is_active ? 'Deactivate' : 'Reactivate'}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* TAB 2: PENDING INVITATIONS */}
                {activeTab === 'invitations' && (
                    <div className="space-y-4">
                        {pendingInvitations.length === 0 ? (
                            <GlassCard className="text-center py-16">
                                <Mail className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                                    No pending invitations
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                                    Invite doctors, receptionists, or clinic administrators to join your workspace.
                                </p>
                                <button
                                    type="button"
                                    onClick={openInviteModal}
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600"
                                >
                                    <UserPlus className="w-4 h-4" />
                                    <span>Send First Invite</span>
                                </button>
                            </GlassCard>
                        ) : (
                            <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-slate-500 uppercase tracking-wider text-[10px]">
                                        <tr>
                                            <th className="py-3 px-4">Invitee</th>
                                            <th className="py-3 px-4">Assigned Role</th>
                                            <th className="py-3 px-4">Linked Doctor Profile</th>
                                            <th className="py-3 px-4">Expires</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {pendingInvitations.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                                <td className="py-3 px-4">
                                                    <span className="font-bold text-slate-900 dark:text-white block">
                                                        {inv.name}
                                                    </span>
                                                    <span className="text-[11px] text-slate-400">{inv.email}</span>
                                                </td>

                                                <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                                    {inv.role_label}
                                                </td>

                                                <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                    {inv.doctor_name || '—'}
                                                </td>

                                                <td className="py-3 px-4 text-slate-500 text-[11px]">
                                                    {inv.expires_at_formatted}
                                                </td>

                                                <td className="py-3 px-4">
                                                    <span
                                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                            inv.is_expired
                                                                ? 'bg-rose-50 text-rose-700'
                                                                : 'bg-amber-50 text-amber-700'
                                                        }`}
                                                    >
                                                        {inv.is_expired ? 'Expired' : 'Pending'}
                                                    </span>
                                                </td>

                                                <td className="py-3 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => resendInvite(inv)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10"
                                                            title="Resend Invitation Email"
                                                        >
                                                            <RotateCcw className="w-3.5 h-3.5" />
                                                            <span>Resend</span>
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => revokeInvite(inv)}
                                                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                                            title="Revoke Invite"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
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

            {/* MODAL 1: INVITE STAFF MEMBER */}
            <GlassModal
                isOpen={inviteModalOpen}
                onClose={() => setInviteModalOpen(false)}
                title="Invite New Staff Member"
                subtitle="Sends an email invitation with a secure link to join your clinic workspace"
                maxWidth="max-w-md"
            >
                <form onSubmit={submitInvite} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Full Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={inviteForm.data.name}
                            onChange={(e) => inviteForm.setData('name', e.target.value)}
                            placeholder="e.g. Priyanthi Wickrama"
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Email Address *
                        </label>
                        <input
                            type="email"
                            required
                            value={inviteForm.data.email}
                            onChange={(e) => inviteForm.setData('email', e.target.value)}
                            placeholder="name@clinic.lk"
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                        />
                        {inviteForm.errors.email && (
                            <p className="text-[11px] text-rose-500 mt-0.5">{inviteForm.errors.email}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Assigned Workspace Role *
                        </label>
                        <GlassSelect
                            value={inviteForm.data.role}
                            onChange={(e) => inviteForm.setData('role', e.target.value)}
                            options={[
                                { value: 'receptionist', label: 'Receptionist (Bookings, Queue, Patients, Billing)' },
                                { value: 'doctor', label: 'Doctor (Channeling Queue, Calendar, Patient Files)' },
                                { value: 'clinic_admin', label: 'Clinic Administrator (Full Access + Settings & Team)' },
                            ]}
                        />
                    </div>

                    {inviteForm.data.role === 'doctor' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Link to Doctor Profile (Optional)
                            </label>
                            <GlassSelect
                                value={inviteForm.data.doctor_id}
                                onChange={(e) => inviteForm.setData('doctor_id', e.target.value)}
                                placeholder="-- No Doctor Profile Linked Yet --"
                                options={[
                                    { value: '', label: '-- No Doctor Profile Linked Yet --' },
                                    ...doctors.map((d) => ({
                                        value: d.id,
                                        label: `${d.name} (${d.specialty})`,
                                    })),
                                ]}
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setInviteModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-400"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={inviteForm.processing}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md disabled:opacity-50"
                        >
                            {inviteForm.processing ? 'Sending...' : 'Send Invitation'}
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* MODAL 2: CHANGE ROLE MODAL */}
            <GlassModal
                isOpen={roleModalOpen}
                onClose={() => setRoleModalOpen(false)}
                title={selectedUser ? `Change Role: ${selectedUser.name}` : 'Change Role'}
                subtitle="Update user access permissions across MedVisit clinical modules"
                maxWidth="max-w-md"
            >
                {selectedUser && (
                    <form onSubmit={submitRoleUpdate} className="space-y-4">
                        {selectedUser.is_last_admin && (
                            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <div>
                                    <strong>Last Admin Protection:</strong> This user is the only active clinic administrator. Another administrator must be promoted before this role can be modified.
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Role
                            </label>
                            <GlassSelect
                                value={roleForm.data.role}
                                onChange={(e) => roleForm.setData('role', e.target.value)}
                                disabled={selectedUser.is_last_admin}
                                options={[
                                    { value: 'receptionist', label: 'Receptionist' },
                                    { value: 'doctor', label: 'Doctor' },
                                    { value: 'clinic_admin', label: 'Clinic Administrator' },
                                ]}
                            />
                            {roleForm.errors.role && (
                                <p className="text-[11px] text-rose-500 mt-0.5">{roleForm.errors.role}</p>
                            )}
                        </div>

                        {roleForm.data.role === 'doctor' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Linked Doctor Profile
                                </label>
                                <GlassSelect
                                    value={roleForm.data.doctor_id}
                                    onChange={(e) => roleForm.setData('doctor_id', e.target.value)}
                                    placeholder="-- No Doctor Profile Linked --"
                                    options={[
                                        { value: '', label: '-- No Doctor Profile Linked --' },
                                        ...doctors.map((d) => ({
                                            value: d.id,
                                            label: `${d.name} (${d.specialty})`,
                                        })),
                                    ]}
                                />
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => setRoleModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={roleForm.processing || selectedUser.is_last_admin}
                                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md disabled:opacity-50"
                            >
                                {roleForm.processing ? 'Saving...' : 'Update Role'}
                            </button>
                        </div>
                    </form>
                )}
            </GlassModal>

            {/* MODAL 3: LINK DOCTOR PROFILE MODAL */}
            <GlassModal
                isOpen={linkDoctorModalOpen}
                onClose={() => setLinkDoctorModalOpen(false)}
                title={selectedUser ? `Link Doctor Profile: ${selectedUser.name}` : 'Link Doctor Profile'}
                subtitle="Connect user account to a channeling practitioner profile"
                maxWidth="max-w-md"
            >
                {selectedUser && (
                    <form onSubmit={submitLinkDoctor} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Select Practitioner Profile
                            </label>
                            <GlassSelect
                                value={linkDoctorForm.data.doctor_id}
                                onChange={(e) => linkDoctorForm.setData('doctor_id', e.target.value)}
                                placeholder="-- No Linked Doctor Profile --"
                                options={[
                                    { value: '', label: '-- No Linked Doctor Profile --' },
                                    ...doctors.map((d) => ({
                                        value: d.id,
                                        label: `${d.name} (${d.specialty})`,
                                    })),
                                ]}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-white/10">
                            <button
                                type="button"
                                onClick={() => setLinkDoctorModalOpen(false)}
                                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={linkDoctorForm.processing}
                                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md disabled:opacity-50"
                            >
                                {linkDoctorForm.processing ? 'Saving...' : 'Save Linkage'}
                            </button>
                        </div>
                    </form>
                )}
            </GlassModal>
        </AuthenticatedLayout>
    );
}
