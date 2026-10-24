import React, { useState, useEffect, useRef, useMemo } from 'react';
import { router, useForm } from '@inertiajs/react';
import {
    UserPlus,
    X,
    Check,
    ArrowRight,
    ArrowLeft,
    User,
    Mail,
    Phone,
    ShieldCheck,
    Stethoscope,
    Users,
    Pill,
    AlertTriangle,
    Info,
    Copy,
    CheckCircle2,
    Loader2,
    Sparkles,
    Building2,
    Clock,
} from 'lucide-react';

export interface StaffUserSummary {
    id: number;
    name: string;
    email: string;
    role: string;
    roles: string[];
    is_active: boolean;
    linked_doctor?: {
        id: number;
        name: string;
        specialty?: string;
    } | null;
}

export interface PendingInvitationSummary {
    id: number;
    name: string;
    email: string;
    role_label: string;
    is_expired: boolean;
}

export interface DoctorOptionSummary {
    id: number;
    name: string;
    specialty: string;
    slmc_number?: string;
    is_linked: boolean;
    linked_user_id?: number | null;
    linked_user_name?: string | null;
}

export interface InviteTeamMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    staffUsers: StaffUserSummary[];
    pendingInvitations: PendingInvitationSummary[];
    doctors: DoctorOptionSummary[];
    clinicName: string;
    clinicLogoUrl?: string | null;
    flashInviteLink?: string | null;
}

// Predefined role definitions matching system permissions
const ROLE_DEFINITIONS = [
    {
        id: 'clinic_admin',
        title: 'Clinic administrator',
        icon: ShieldCheck,
        badgeColor: 'bg-blue-500/10 text-[#1E6FD9] dark:text-blue-300 border-blue-500/20',
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
        badgeColor: 'bg-teal-500/10 text-[#0E9E8F] dark:text-teal-300 border-teal-500/20',
        activeBorder: 'border-[#0E9E8F] ring-2 ring-[#0E9E8F]/20',
        tagline: 'Clinical practitioner managing patient consultations and prescriptions.',
        bullets: [
            'Conduct consultations and issue electronic prescriptions',
            'Manage personal prescription templates and dosages',
            'View own patient queue and channeling schedules',
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

// Consistent avatar background colors
const AVATAR_COLORS = [
    'bg-[#1E6FD9] text-white',
    'bg-[#0E9E8F] text-white',
    'bg-[#FF7A59] text-white',
    'bg-purple-600 text-white',
    'bg-indigo-600 text-white',
    'bg-emerald-600 text-white',
];

function getAvatarColor(name: string): string {
    if (!name) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
}

function getInitials(name: string): string {
    if (!name.trim()) return 'TM';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function InviteTeamMemberModal({
    isOpen,
    onClose,
    staffUsers,
    pendingInvitations,
    doctors,
    clinicName,
    clinicLogoUrl,
    flashInviteLink,
}: InviteTeamMemberModalProps) {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
    const [successInviteLink, setSuccessInviteLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Input refs for auto-focusing on invalid fields
    const nameInputRef = useRef<HTMLInputElement>(null);
    const emailInputRef = useRef<HTMLInputElement>(null);
    const doctorNameInputRef = useRef<HTMLInputElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    const form = useForm({
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

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            form.reset();
            setStep(1);
            setClientErrors({});
            setSuccessInviteLink(flashInviteLink || null);
            setCopied(false);
            // Auto focus name input after opening
            setTimeout(() => {
                nameInputRef.current?.focus();
            }, 100);
        }
    }, [isOpen]);

    // Handle ESC key with confirmation if fields are filled
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                e.preventDefault();
                handleCloseAttempt();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, form.data]);

    const handleCloseAttempt = () => {
        const isFilled =
            Boolean(form.data.name.trim()) ||
            Boolean(form.data.email.trim()) ||
            Boolean(form.data.phone.trim()) ||
            step > 1;

        if (step === 4 || !isFilled) {
            onClose();
        } else {
            if (window.confirm('Discard unsaved invitation changes?')) {
                onClose();
            }
        }
    };

    // Conflict check for email
    const emailConflict = useMemo(() => {
        const email = form.data.email.trim().toLowerCase();
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
    }, [form.data.email, staffUsers, pendingInvitations]);

    // Validate Step 1
    const validateStep1 = (): boolean => {
        const errors: Record<string, string> = {};

        if (!form.data.name.trim()) {
            errors.name = 'Full name is required.';
        }

        if (!form.data.email.trim()) {
            errors.email = 'Email address is required.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.data.email.trim())) {
            errors.email = 'Please enter a valid email address.';
        } else if (emailConflict?.type === 'member') {
            errors.email = emailConflict.message;
        }

        setClientErrors(errors);

        if (errors.name) {
            nameInputRef.current?.focus();
            return false;
        }
        if (errors.email) {
            emailInputRef.current?.focus();
            return false;
        }

        return true;
    };

    // Validate Step 2
    const validateStep2 = (): boolean => {
        const errors: Record<string, string> = {};

        const isDoctor = form.data.role === 'doctor' || form.data.secondary_role === 'doctor';
        if (isDoctor && form.data.doctor_mode === 'new') {
            if (!form.data.new_doctor.name.trim()) {
                errors.new_doctor_name = 'Doctor profile name is required.';
            }
        }

        setClientErrors(errors);

        if (errors.new_doctor_name) {
            doctorNameInputRef.current?.focus();
            return false;
        }

        return true;
    };

    // Handle continue click
    const handleContinue = () => {
        if (step === 1) {
            if (validateStep1()) {
                setStep(2);
            }
        } else if (step === 2) {
            if (validateStep2()) {
                setStep(3);
            }
        }
    };

    // Handle form submit
    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        form.post('/staff/invite', {
            preserveScroll: true,
            onSuccess: (page) => {
                const flashLink =
                    (page.props as any)?.flashInviteLink ||
                    (page.props as any)?.flash?.invite_link;
                if (flashLink) {
                    setSuccessInviteLink(flashLink);
                }
                setStep(4);
            },
            onError: (errs) => {
                setClientErrors(errs);
                // Return to first step if details error
                if (errs.email || errs.name) {
                    setStep(1);
                }
            },
        });
    };

    // Copy link helper
    const handleCopySuccessLink = () => {
        if (!successInviteLink) return;
        navigator.clipboard.writeText(successInviteLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
    };

    const selectedRoleDef = useMemo(() => {
        return ROLE_DEFINITIONS.find((r) => r.id === form.data.role) || ROLE_DEFINITIONS[2];
    }, [form.data.role]);

    const isDoctorSelected =
        form.data.role === 'doctor' || form.data.secondary_role === 'doctor';

    const selectedDoctorName = useMemo(() => {
        if (!form.data.doctor_id) return null;
        return doctors.find((d) => String(d.id) === String(form.data.doctor_id))?.name || null;
    }, [form.data.doctor_id, doctors]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 overflow-y-auto"
            aria-labelledby="invite-modal-title"
            aria-describedby="invite-modal-subtitle"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop: Darker blurred backdrop as requested */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                onClick={handleCloseAttempt}
                aria-hidden="true"
            />

            {/* Positioning Container: Centred horizontally and vertically on desktop, bottom sheet on mobile */}
            <div className="fixed inset-0 z-10 flex sm:items-center sm:justify-center items-end justify-center p-0 sm:p-4 md:p-6 pointer-events-none">
                {/* Modal Window: max-w-[720px], max-h-[90vh], sticky header & footer */}
                <div
                    ref={modalRef}
                    className="pointer-events-auto relative w-full sm:max-w-[720px] h-[94vh] sm:h-auto sm:max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-t-[28px] sm:rounded-3xl shadow-2xl overflow-hidden text-slate-900 dark:text-white"
                >
                    {/* 1. STICKY HEADER */}
                    <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md z-10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-[#1E6FD9]/10 text-[#1E6FD9] dark:bg-[#1E6FD9]/20 flex items-center justify-center shrink-0">
                                <UserPlus className="w-5 h-5" />
                            </div>
                            <div>
                                <h3
                                    id="invite-modal-title"
                                    className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug"
                                >
                                    {step === 4 ? 'Invitation dispatched' : 'Invite a team member'}
                                </h3>
                                <p
                                    id="invite-modal-subtitle"
                                    className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1"
                                >
                                    {step === 4
                                        ? 'Share the single-use link or wait for email confirmation.'
                                        : `They'll get an email with a secure link to join ${clinicName}.`}
                                </p>
                            </div>
                        </div>

                        {/* Close button with 44px hit area */}
                        <button
                            type="button"
                            onClick={handleCloseAttempt}
                            className="w-11 h-11 -mr-2 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/40"
                            aria-label="Close dialog"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* 2. STEPPER PROGRESS (Steps 1 to 3) */}
                    {step < 4 && (
                        <div className="shrink-0 px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-white/[0.02]">
                            <div className="relative flex items-center justify-between max-w-lg mx-auto">
                                {/* Connecting track lines */}
                                <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 h-0.5 bg-slate-200 dark:bg-white/10 -z-0" />
                                <div
                                    className="absolute top-1/2 left-4 -translate-y-1/2 h-0.5 bg-[#1E6FD9] transition-all duration-300 -z-0"
                                    style={{
                                        width: step === 1 ? '0%' : step === 2 ? '50%' : '100%',
                                    }}
                                />

                                {[
                                    { num: 1, label: 'Details' },
                                    { num: 2, label: 'Role & linking' },
                                    { num: 3, label: 'Review & send' },
                                ].map((s) => {
                                    const isCompleted = step > s.num;
                                    const isActive = step === s.num;

                                    return (
                                        <button
                                            key={s.num}
                                            type="button"
                                            disabled={!isCompleted && !isActive}
                                            onClick={() => {
                                                if (isCompleted) {
                                                    setStep(s.num as 1 | 2 | 3);
                                                }
                                            }}
                                            className={`relative z-10 flex items-center gap-2 px-1.5 py-1 rounded-xl transition-all ${
                                                isCompleted ? 'cursor-pointer hover:opacity-80' : 'cursor-default'
                                            }`}
                                        >
                                            <div
                                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                                    isCompleted
                                                        ? 'bg-[#1E6FD9] text-white shadow-xs'
                                                        : isActive
                                                        ? 'bg-[#1E6FD9] text-white ring-4 ring-[#1E6FD9]/20 shadow-xs'
                                                        : 'bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-400'
                                                }`}
                                            >
                                                {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                                            </div>
                                            <span
                                                className={`text-xs font-semibold ${
                                                    isActive
                                                        ? 'text-[#1E6FD9] dark:text-blue-400'
                                                        : isCompleted
                                                        ? 'text-slate-700 dark:text-slate-200'
                                                        : 'text-slate-400 dark:text-slate-500'
                                                }`}
                                            >
                                                {s.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 3. SCROLLABLE BODY (Two-column layout on >=768px desktop) */}
                    <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0 space-y-6">
                        {step < 4 ? (
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                                {/* LEFT COLUMN (Form, ~60%) */}
                                <div className="md:col-span-7 space-y-5">
                                    {/* STEP 1: Details */}
                                    {step === 1 && (
                                        <div className="space-y-4">
                                            {/* Full name */}
                                            <div>
                                                <label className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                    <span>Full name</span>
                                                    <span
                                                        className="w-1.5 h-1.5 rounded-full bg-rose-500 ml-1.5 align-middle"
                                                        title="Required"
                                                    />
                                                </label>
                                                <div className="relative">
                                                    <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                    <input
                                                        ref={nameInputRef}
                                                        type="text"
                                                        value={form.data.name}
                                                        onChange={(e) => {
                                                            form.setData('name', e.target.value);
                                                            if (clientErrors.name) {
                                                                setClientErrors((prev) => ({ ...prev, name: '' }));
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                emailInputRef.current?.focus();
                                                            }
                                                        }}
                                                        placeholder="e.g. Kamal Perera"
                                                        className={`w-full h-12 pl-11 pr-4 rounded-xl border bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                                                            clientErrors.name
                                                                ? 'border-rose-500 focus:ring-rose-500/20'
                                                                : 'border-slate-200 dark:border-white/10 focus:ring-[#1E6FD9]/30 focus:border-[#1E6FD9]'
                                                        }`}
                                                    />
                                                </div>
                                                {clientErrors.name && (
                                                    <p className="text-xs text-rose-500 font-medium mt-1">
                                                        {clientErrors.name}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Email address */}
                                            <div>
                                                <label className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                    <span>Email address</span>
                                                    <span
                                                        className="w-1.5 h-1.5 rounded-full bg-rose-500 ml-1.5 align-middle"
                                                        title="Required"
                                                    />
                                                </label>
                                                <div className="relative">
                                                    <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                    <input
                                                        ref={emailInputRef}
                                                        type="email"
                                                        value={form.data.email}
                                                        onChange={(e) => {
                                                            form.setData('email', e.target.value);
                                                            if (clientErrors.email) {
                                                                setClientErrors((prev) => ({ ...prev, email: '' }));
                                                            }
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleContinue();
                                                            }
                                                        }}
                                                        placeholder="e.g. name@clinic.lk"
                                                        className={`w-full h-12 pl-11 pr-4 rounded-xl border bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                                                            clientErrors.email
                                                                ? 'border-rose-500 focus:ring-rose-500/20'
                                                                : 'border-slate-200 dark:border-white/10 focus:ring-[#1E6FD9]/30 focus:border-[#1E6FD9]'
                                                        }`}
                                                    />
                                                </div>
                                                {clientErrors.email && (
                                                    <p className="text-xs text-rose-500 font-medium mt-1">
                                                        {clientErrors.email}
                                                    </p>
                                                )}

                                                {/* Conflict Notices */}
                                                {emailConflict && emailConflict.type === 'member' && (
                                                    <div className="mt-2.5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                                                        <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                                                        <div>
                                                            <strong>Already a member:</strong> {emailConflict.message}
                                                        </div>
                                                    </div>
                                                )}

                                                {emailConflict && emailConflict.type === 'pending' && (
                                                    <div className="mt-2.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <Info className="w-4 h-4 shrink-0 text-amber-600" />
                                                            <span>{emailConflict.message}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                router.post(
                                                                    `/staff/invitations/${emailConflict.inviteId}/resend`,
                                                                    {},
                                                                    { preserveScroll: true }
                                                                );
                                                                onClose();
                                                            }}
                                                            className="px-2.5 py-1 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700 transition-colors shrink-0 text-xs"
                                                        >
                                                            Resend invite
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Phone number */}
                                            <div>
                                                <label className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                    <span>Phone number</span>
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1.5">
                                                        · optional
                                                    </span>
                                                </label>
                                                <div className="relative">
                                                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none text-slate-400">
                                                        <Phone className="w-4 h-4" />
                                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-white/10 pr-2">
                                                            +94
                                                        </span>
                                                    </div>
                                                    <input
                                                        type="tel"
                                                        value={form.data.phone.replace(/^\+94/, '')}
                                                        onChange={(e) => {
                                                            const digits = e.target.value.replace(/\D/g, '');
                                                            form.setData('phone', digits ? `+94${digits}` : '');
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleContinue();
                                                            }
                                                        }}
                                                        placeholder="77 123 4567"
                                                        className="w-full h-12 pl-20 pr-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 focus:border-[#1E6FD9] transition-all"
                                                    />
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                                    For your records and staff contact.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 2: Role Selection & Doctor Linking */}
                                    {step === 2 && (
                                        <div className="space-y-5">
                                            <div>
                                                <label className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2.5">
                                                    <span>Primary role</span>
                                                    <span
                                                        className="w-1.5 h-1.5 rounded-full bg-rose-500 ml-1.5 align-middle"
                                                        title="Required"
                                                    />
                                                </label>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {ROLE_DEFINITIONS.map((card) => {
                                                        const isSelected = form.data.role === card.id;
                                                        const IconComp = card.icon;

                                                        return (
                                                            <div
                                                                key={card.id}
                                                                onClick={() => form.setData('role', card.id)}
                                                                className={`cursor-pointer rounded-2xl p-3.5 border transition-all text-left relative flex flex-col justify-between ${
                                                                    isSelected
                                                                        ? `${card.activeBorder} bg-white dark:bg-slate-800 shadow-md`
                                                                        : 'border-slate-200/80 dark:border-white/10 bg-white/50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800/80'
                                                                }`}
                                                            >
                                                                <div>
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <div
                                                                            className={`w-9 h-9 rounded-xl flex items-center justify-center ${card.badgeColor}`}
                                                                        >
                                                                            <IconComp className="w-5 h-5" />
                                                                        </div>
                                                                        <div
                                                                            className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                                                                                isSelected
                                                                                    ? 'bg-[#1E6FD9] border-[#1E6FD9] text-white'
                                                                                    : 'border-slate-300 dark:border-slate-600'
                                                                            }`}
                                                                        >
                                                                            {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                                        </div>
                                                                    </div>

                                                                    <h4 className="font-bold text-xs text-slate-900 dark:text-white mb-1">
                                                                        {card.title}
                                                                    </h4>
                                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2 line-clamp-2">
                                                                        {card.tagline}
                                                                    </p>

                                                                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                                                                        Can:
                                                                    </div>
                                                                    <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                                                                        {card.bullets.slice(0, 3).map((b, i) => (
                                                                            <li key={i} className="flex items-start gap-1.5 leading-snug">
                                                                                <span className="text-emerald-500 font-bold shrink-0">
                                                                                    •
                                                                                </span>
                                                                                <span>{b}</span>
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Doctor Linking UI (Visible if Doctor chosen as primary or secondary) */}
                                            {isDoctorSelected && (
                                                <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/20 space-y-4 animate-in fade-in duration-200">
                                                    <div className="flex items-center gap-2">
                                                        <Stethoscope className="w-4 h-4 text-[#0E9E8F]" />
                                                        <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                                                            Doctor profile linking
                                                        </h4>
                                                    </div>
                                                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                                        Linking connects this user account to patient consultations, prescription authoring, and personal payout statements.
                                                    </p>

                                                    <div className="flex items-center gap-5 text-xs font-semibold">
                                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="doctor_mode"
                                                                checked={form.data.doctor_mode === 'existing'}
                                                                onChange={() => {
                                                                    form.setData((prev) => ({
                                                                        ...prev,
                                                                        doctor_mode: 'existing',
                                                                        create_doctor: false,
                                                                    }));
                                                                }}
                                                                className="text-[#0E9E8F] focus:ring-[#0E9E8F]"
                                                            />
                                                            <span>Link existing profile</span>
                                                        </label>

                                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                                            <input
                                                                type="radio"
                                                                name="doctor_mode"
                                                                checked={form.data.doctor_mode === 'new'}
                                                                onChange={() => {
                                                                    form.setData((prev) => ({
                                                                        ...prev,
                                                                        doctor_mode: 'new',
                                                                        create_doctor: true,
                                                                        new_doctor: {
                                                                            name: prev.new_doctor.name || prev.name,
                                                                            specialty: prev.new_doctor.specialty || '',
                                                                            slmc_number: prev.new_doctor.slmc_number || '',
                                                                        },
                                                                    }));
                                                                }}
                                                                className="text-[#0E9E8F] focus:ring-[#0E9E8F]"
                                                            />
                                                            <span>Create new doctor profile</span>
                                                        </label>
                                                    </div>

                                                    {form.data.doctor_mode === 'existing' ? (
                                                        <div>
                                                            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                                Select doctor profile
                                                            </label>
                                                            <select
                                                                value={form.data.doctor_id}
                                                                onChange={(e) => form.setData('doctor_id', e.target.value)}
                                                                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#0E9E8F]/30 focus:outline-none"
                                                            >
                                                                <option value="">-- Choose unlinked doctor (or skip) --</option>
                                                                {doctors.map((d) => (
                                                                    <option key={d.id} value={d.id}>
                                                                        {d.name} ({d.specialty || 'General'})
                                                                        {d.is_linked ? ` [Linked to ${d.linked_user_name}]` : ' [Unlinked]'}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                            <div>
                                                                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                                    Doctor name
                                                                </label>
                                                                <input
                                                                    ref={doctorNameInputRef}
                                                                    type="text"
                                                                    value={form.data.new_doctor.name}
                                                                    onChange={(e) =>
                                                                        form.setData('new_doctor', {
                                                                            ...form.data.new_doctor,
                                                                            name: e.target.value,
                                                                        })
                                                                    }
                                                                    placeholder="e.g. Dr. K. Silva"
                                                                    className={`w-full px-3 py-2 text-xs rounded-xl border bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 ${
                                                                        clientErrors.new_doctor_name
                                                                            ? 'border-rose-500 focus:ring-rose-500/20'
                                                                            : 'border-slate-200 dark:border-white/10 focus:ring-[#0E9E8F]/30'
                                                                    }`}
                                                                />
                                                                {clientErrors.new_doctor_name && (
                                                                    <p className="text-[10px] text-rose-500 font-medium mt-1">
                                                                        {clientErrors.new_doctor_name}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <div>
                                                                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                                    Specialty
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={form.data.new_doctor.specialty}
                                                                    onChange={(e) =>
                                                                        form.setData('new_doctor', {
                                                                            ...form.data.new_doctor,
                                                                            specialty: e.target.value,
                                                                        })
                                                                    }
                                                                    placeholder="e.g. General Practice"
                                                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0E9E8F]/30"
                                                                />
                                                            </div>

                                                            <div>
                                                                <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                                                    SLMC no. (optional)
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={form.data.new_doctor.slmc_number}
                                                                    onChange={(e) =>
                                                                        form.setData('new_doctor', {
                                                                            ...form.data.new_doctor,
                                                                            slmc_number: e.target.value,
                                                                        })
                                                                    }
                                                                    placeholder="e.g. SLMC 18452"
                                                                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0E9E8F]/30"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Secondary role toggle */}
                                            <div className="pt-2 border-t border-slate-200/70 dark:border-white/10">
                                                <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={form.data.has_secondary_role}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            form.setData((prev) => ({
                                                                ...prev,
                                                                has_secondary_role: checked,
                                                                secondary_role: checked ? prev.secondary_role || 'doctor' : '',
                                                            }));
                                                        }}
                                                        className="rounded text-[#1E6FD9] focus:ring-[#1E6FD9]"
                                                    />
                                                    <span>Assign an additional secondary role</span>
                                                </label>

                                                {form.data.has_secondary_role && (
                                                    <div className="mt-2.5 max-w-xs animate-in fade-in duration-150">
                                                        <select
                                                            value={form.data.secondary_role}
                                                            onChange={(e) => form.setData('secondary_role', e.target.value)}
                                                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-800 dark:text-white focus:ring-2 focus:ring-[#1E6FD9]/30 focus:outline-none"
                                                        >
                                                            <option value="">-- Choose secondary role --</option>
                                                            {ROLE_DEFINITIONS.filter((c) => c.id !== form.data.role).map((c) => (
                                                                <option key={c.id} value={c.id}>
                                                                    {c.title}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* STEP 3: Review & Personal Message */}
                                    {step === 3 && (
                                        <div className="space-y-4">
                                            {/* Summary Card */}
                                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-3">
                                                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                                    Invitation summary
                                                </h4>

                                                <div className="grid grid-cols-2 gap-3 text-xs">
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px]">Full name</span>
                                                        <span className="font-semibold text-slate-900 dark:text-white">
                                                            {form.data.name}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px]">Email address</span>
                                                        <span className="font-semibold text-slate-900 dark:text-white">
                                                            {form.data.email}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px]">Phone number</span>
                                                        <span className="font-semibold text-slate-900 dark:text-white">
                                                            {form.data.phone || 'None provided'}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <span className="text-slate-400 block text-[11px]">Role(s)</span>
                                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1E6FD9]/10 text-[#1E6FD9] dark:bg-[#1E6FD9]/20">
                                                                {selectedRoleDef.title}
                                                            </span>
                                                            {form.data.secondary_role && (
                                                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300">
                                                                    {ROLE_DEFINITIONS.find((r) => r.id === form.data.secondary_role)?.title}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Doctor Linking Summary */}
                                                {form.data.doctor_id && (
                                                    <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 text-xs">
                                                        <span className="text-slate-400 block text-[11px]">Linked doctor profile:</span>
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {selectedDoctorName}
                                                        </span>
                                                    </div>
                                                )}

                                                {form.data.create_doctor && form.data.new_doctor.name && (
                                                    <div className="pt-2 border-t border-slate-200/60 dark:border-white/10 text-xs">
                                                        <span className="text-slate-400 block text-[11px]">New doctor profile to create:</span>
                                                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                            {form.data.new_doctor.name} ({form.data.new_doctor.specialty || 'General'})
                                                            {form.data.new_doctor.slmc_number ? ` · ${form.data.new_doctor.slmc_number}` : ''}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Personal Message */}
                                            <div>
                                                <label className="flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                    <span>Personal message</span>
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 font-normal ml-1.5">
                                                        · optional
                                                    </span>
                                                </label>
                                                <textarea
                                                    rows={3}
                                                    value={form.data.personal_message}
                                                    onChange={(e) => form.setData('personal_message', e.target.value)}
                                                    placeholder="Add a welcoming note or instructions included in the invitation email..."
                                                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 focus:border-[#1E6FD9] text-xs transition-all"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* RIGHT COLUMN (Live Preview, ~40% - hidden on mobile, visible on >=768px desktop) */}
                                <div className="md:col-span-5 hidden md:block">
                                    <div className="sticky top-2 rounded-2xl p-4 bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/10 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                                Live preview
                                            </div>
                                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                Interactive
                                            </span>
                                        </div>

                                        {/* Invite Card Preview (Steps 1 & 2) */}
                                        {step < 3 ? (
                                            <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-white/10 shadow-xs space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shadow-xs shrink-0 ${getAvatarColor(
                                                            form.data.name
                                                        )}`}
                                                    >
                                                        {getInitials(form.data.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h5 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                            {form.data.name.trim() || 'Team member name'}
                                                        </h5>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                            {form.data.email.trim() || 'name@clinic.lk'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2 text-xs">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-slate-400 text-[11px]">Assigned role:</span>
                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1E6FD9]/10 text-[#1E6FD9] dark:bg-[#1E6FD9]/20">
                                                            {selectedRoleDef.title}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between">
                                                        <span className="text-slate-400 text-[11px]">Phone contact:</span>
                                                        <span className="text-slate-700 dark:text-slate-300 font-medium">
                                                            {form.data.phone || 'None'}
                                                        </span>
                                                    </div>

                                                    {form.data.doctor_id && (
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-slate-400 text-[11px]">Linked doctor:</span>
                                                            <span className="text-teal-600 dark:text-teal-400 font-semibold truncate max-w-[140px]">
                                                                {selectedDoctorName}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            /* Email Preview (Step 3) */
                                            <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-white/10 shadow-xs space-y-3">
                                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-white/5">
                                                    {clinicLogoUrl ? (
                                                        <img
                                                            src={clinicLogoUrl}
                                                            alt={clinicName}
                                                            className="w-6 h-6 rounded-md object-contain"
                                                        />
                                                    ) : (
                                                        <div className="w-6 h-6 rounded-md bg-[#1E6FD9] text-white text-[10px] font-bold flex items-center justify-center">
                                                            {clinicName.charAt(0)}
                                                        </div>
                                                    )}
                                                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                                                        {clinicName}
                                                    </span>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                                        You're invited to join {clinicName}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                                                        Hi {form.data.name.split(' ')[0] || 'there'}, you have been invited to join the clinic workspace as <strong>{selectedRoleDef.title}</strong>.
                                                    </p>
                                                    {form.data.personal_message && (
                                                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-white/5 text-[10px] text-slate-600 dark:text-slate-300 italic border-l-2 border-[#1E6FD9]">
                                                            "{form.data.personal_message}"
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="pt-2 text-center">
                                                    <div className="inline-block px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#1E6FD9] shadow-xs">
                                                        Accept invitation
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 mt-1.5">
                                                        Single-use secure link · Expires in 7 days
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* STEP 4: Success State */
                            <div className="py-8 text-center space-y-6 max-w-md mx-auto animate-in fade-in zoom-in-95 duration-200">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5 shadow-xs">
                                    <CheckCircle2 className="w-9 h-9" />
                                </div>

                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                        Invitation dispatched!
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                                        We sent an invitation email to <strong className="text-slate-800 dark:text-slate-200">{form.data.email}</strong> with a secure link to join {clinicName}.
                                    </p>
                                </div>

                                {successInviteLink && (
                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 text-left space-y-2">
                                        <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                            <span>Invitation accept link</span>
                                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Expires in 7 days
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                readOnly
                                                value={successInviteLink}
                                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCopySuccessLink}
                                                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-[#1E6FD9] hover:bg-[#1E6FD9]/90 shrink-0 inline-flex items-center gap-1.5 shadow-xs transition-colors"
                                            >
                                                {copied ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5" />
                                                        <span>Copied!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-3.5 h-3.5" />
                                                        <span>Copy link</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Mobile Summary Chip (Visible on <768px screen when typing details) */}
                    {step < 4 && (
                        <div className="md:hidden px-6 py-2 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                                <div
                                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${getAvatarColor(
                                        form.data.name
                                    )}`}
                                >
                                    {getInitials(form.data.name)}
                                </div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {form.data.name.trim() || 'New member'}
                                </span>
                            </div>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1E6FD9]/10 text-[#1E6FD9] dark:bg-[#1E6FD9]/20 shrink-0">
                                {selectedRoleDef.title.split(' ')[0]}
                            </span>
                        </div>
                    )}

                    {/* 4. STICKY FOOTER */}
                    <div className="shrink-0 px-6 py-4 border-t border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between z-10">
                        {/* Left: Back button */}
                        {step > 1 && step < 4 ? (
                            <button
                                type="button"
                                onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back</span>
                            </button>
                        ) : (
                            <div />
                        )}

                        {/* Right: Actions */}
                        <div className="flex items-center gap-2.5">
                            {step < 4 ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={handleCloseAttempt}
                                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>

                                    {step < 3 ? (
                                        <button
                                            type="button"
                                            onClick={handleContinue}
                                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-[#1E6FD9] hover:bg-[#1E6FD9]/90 active:scale-[0.98] transition-all shadow-md shadow-[#1E6FD9]/20"
                                        >
                                            <span>Continue</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled={form.processing}
                                            onClick={() => handleSubmit()}
                                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] hover:brightness-105 active:scale-[0.98] transition-all shadow-md shadow-[#1E6FD9]/20 disabled:opacity-60"
                                        >
                                            {form.processing ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    <span>Sending invitation...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Mail className="w-4 h-4" />
                                                    <span>Send invitation</span>
                                                </>
                                            )}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            form.reset();
                                            setStep(1);
                                            setSuccessInviteLink(null);
                                            setCopied(false);
                                        }}
                                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 transition-colors"
                                    >
                                        Invite another member
                                    </button>
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:brightness-105 transition-colors shadow-sm"
                                    >
                                        Done
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
