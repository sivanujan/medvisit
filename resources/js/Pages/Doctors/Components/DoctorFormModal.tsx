import React, { useState, useEffect, useMemo, useRef } from 'react';
import { router } from '@inertiajs/react';
import {
    Stethoscope,
    CreditCard,
    Key,
    User,
    CheckCircle2,
    Upload,
    X,
    Tv,
    Globe,
    AlertCircle,
    Check,
    Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FormModal,
    TextInput,
    Select,
    Textarea,
    Switch,
    FieldGroup,
    FormLabel,
} from '@/Components/Form';

export interface DoctorFormData {
    id?: number;
    title: string;
    name: string;
    specialty: string;
    slmc_number: string;
    token_code: string;
    use_clinic_default_fees: boolean;
    doctor_fee_lkr: number;
    clinic_fee_lkr: number;
    total_fee_lkr: number;
    avg_consultation_minutes: number;
    user_id: string | number;
    photo_url: string;
    bio: string;
    is_active: boolean;
}

export interface DoctorFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingDoctor?: any | null;
    specialties?: string[];
    eligibleUsers?: { id: number | string; name: string; email: string }[];
    existingDoctors?: any[];
    defaultClinicFeeLkr?: number;
    onSuccess?: (msg?: string) => void;
}

const TITLE_OPTIONS = [
    { value: 'Dr.', label: 'Dr.' },
    { value: 'Prof.', label: 'Prof.' },
    { value: 'Mr.', label: 'Mr.' },
    { value: 'Mrs.', label: 'Mrs.' },
    { value: 'Ms.', label: 'Ms.' },
];

const CONSULTATION_TIME_CHIPS = [10, 15, 20, 30];

/**
 * Suggest 2-3 uppercase letters from doctor's name
 */
function suggestTokenCode(name: string): string {
    if (!name) return '';
    const clean = name.trim().replace(/^Dr\.?\s+|^Prof\.?\s+/i, '');
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 3);
    }
    if (parts.length === 1 && parts[0].length >= 2) {
        return parts[0].slice(0, 2).toUpperCase();
    }
    return '';
}

export function DoctorFormModal({
    isOpen,
    onClose,
    editingDoctor = null,
    specialties = [],
    eligibleUsers = [],
    existingDoctors = [],
    defaultClinicFeeLkr = 1500,
    onSuccess,
}: DoctorFormModalProps) {
    const initialFormData: DoctorFormData = useMemo(() => {
        if (editingDoctor) {
            return {
                id: editingDoctor.id,
                title: editingDoctor.title || 'Dr.',
                name: editingDoctor.name || '',
                specialty: editingDoctor.specialty || '',
                slmc_number: editingDoctor.slmc_number || '',
                token_code: editingDoctor.token_code || '',
                use_clinic_default_fees: Boolean(editingDoctor.use_clinic_default_fees),
                doctor_fee_lkr: editingDoctor.doctor_fee_lkr || (editingDoctor.doctor_fee ? editingDoctor.doctor_fee / 100 : 0),
                clinic_fee_lkr: editingDoctor.clinic_fee_lkr || (editingDoctor.clinic_fee ? editingDoctor.clinic_fee / 100 : 0),
                total_fee_lkr: editingDoctor.total_fee_lkr || (editingDoctor.total_fee ? editingDoctor.total_fee / 100 : 0),
                avg_consultation_minutes: editingDoctor.avg_consultation_minutes || 15,
                user_id: editingDoctor.user_id ? String(editingDoctor.user_id) : '',
                photo_url: editingDoctor.photo_url || '',
                bio: editingDoctor.bio || '',
                is_active: editingDoctor.is_active !== undefined ? Boolean(editingDoctor.is_active) : true,
            };
        }

        return {
            title: 'Dr.',
            name: '',
            specialty: specialties[0] || 'General Physician',
            slmc_number: '',
            token_code: '',
            use_clinic_default_fees: true,
            doctor_fee_lkr: 1500,
            clinic_fee_lkr: 500,
            total_fee_lkr: 2000,
            avg_consultation_minutes: 15,
            user_id: '',
            photo_url: '',
            bio: '',
            is_active: true,
        };
    }, [editingDoctor, specialties]);

    const [data, setData] = useState<DoctorFormData>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tokenManuallyEdited, setTokenManuallyEdited] = useState(false);
    const [previewTab, setPreviewTab] = useState<'tv' | 'web'>('tv');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Track dirty state
    const isDirty = useMemo(() => {
        return JSON.stringify(data) !== JSON.stringify(initialFormData);
    }, [data, initialFormData]);

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            setData(initialFormData);
            setErrors({});
            setTokenManuallyEdited(Boolean(editingDoctor?.token_code));
        }
    }, [isOpen, initialFormData, editingDoctor]);

    // Auto-suggest token code on name change if not manually edited
    const handleNameChange = (nameVal: string) => {
        setData((prev) => {
            const next = { ...prev, name: nameVal };
            if (!tokenManuallyEdited && !editingDoctor) {
                const suggested = suggestTokenCode(nameVal);
                if (suggested) {
                    next.token_code = suggested;
                }
            }
            return next;
        });
    };

    // Live uniqueness check on token code
    const isTokenDuplicate = useMemo(() => {
        if (!data.token_code) return false;
        const code = data.token_code.trim().toUpperCase();
        return existingDoctors.some(
            (d) => d.id !== editingDoctor?.id && d.token_code?.toUpperCase() === code
        );
    }, [data.token_code, existingDoctors, editingDoctor]);

    // Handle photo file selection
    const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Create local preview URL
        const reader = new FileReader();
        reader.onloadend = () => {
            setData((prev) => ({ ...prev, photo_url: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    // Submit handler
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        // Validation
        const newErrors: Record<string, string> = {};
        if (!data.name.trim()) {
            newErrors.name = 'Full name is required.';
        }
        if (!data.specialty.trim()) {
            newErrors.specialty = 'Medical specialty is required.';
        }
        if (isTokenDuplicate) {
            newErrors.token_code = `Token code '${data.token_code}' is already assigned to another doctor.`;
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);

        const url = editingDoctor ? `/doctors/${editingDoctor.id}` : '/doctors';
        const method = editingDoctor ? 'put' : 'post';

        // Prepare payload with clean number formatting
        const payload = {
            ...data,
            token_code: data.token_code ? data.token_code.toUpperCase().trim() : null,
            user_id: data.user_id ? Number(data.user_id) : null,
        };

        router[method](url, payload as any, {
            preserveScroll: true,
            onSuccess: () => {
                setIsSubmitting(false);
                onClose();
                if (onSuccess) {
                    onSuccess(
                        editingDoctor
                            ? `Doctor ${data.name} updated successfully.`
                            : `Doctor ${data.name} added successfully.`
                    );
                }
            },
            onError: (serverErrors) => {
                setIsSubmitting(false);
                setErrors(serverErrors);
            },
        });
    };

    const specialtyOptions = useMemo(() => {
        return specialties.map((s) => ({ value: s, label: s }));
    }, [specialties]);

    const userOptions = useMemo(() => {
        return [
            { value: '', label: 'Not linked' },
            ...eligibleUsers.map((u) => ({
                value: String(u.id),
                label: `${u.name} (${u.email})`,
            })),
        ];
    }, [eligibleUsers]);

    // Live preview doctor details
    const previewDisplayName = `${data.title} ${data.name || 'Full Name'}`;
    const previewTokenPrefix = data.token_code || suggestTokenCode(data.name) || 'SV';
    const previewFeeFormatted = data.use_clinic_default_fees
        ? 'Default clinic fee'
        : `Rs. ${data.total_fee_lkr.toLocaleString()}`;

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            title={editingDoctor ? `Edit ${editingDoctor.full_title || editingDoctor.name}` : 'Add new doctor'}
            description="Configure doctor credentials, consultation fee split, and portal access."
            isDirty={isDirty}
            isSubmitting={isSubmitting}
            submitLabel={editingDoctor ? 'Update doctor' : 'Save doctor'}
            cancelLabel="Cancel"
            maxWidth="sm:max-w-4xl lg:max-w-5xl"
            onSubmit={handleSubmit}
        >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Form Inputs (Left Column) */}
                <div className="lg:col-span-7 space-y-5">
                    {/* Section 1: Doctor details */}
                    <FieldGroup
                        title="Doctor details"
                        icon={<Stethoscope className="w-3.5 h-3.5" />}
                        description="Professional title, name, medical specialty, and token code"
                    >
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                            <div className="sm:col-span-1">
                                <Select
                                    label="Title"
                                    required
                                    value={data.title}
                                    onChange={(e) => setData({ ...data, title: e.target.value })}
                                    options={TITLE_OPTIONS}
                                    error={errors.title}
                                />
                            </div>

                            <div className="sm:col-span-3">
                                <TextInput
                                    label="Full name"
                                    required
                                    value={data.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    placeholder="e.g. Sunil Shantha"
                                    error={errors.name}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                            <div className="sm:col-span-1">
                                <Select
                                    label="Specialty"
                                    required
                                    value={data.specialty}
                                    onChange={(e) => setData({ ...data, specialty: e.target.value })}
                                    options={specialtyOptions}
                                    placeholder="Select specialty..."
                                    searchable={true}
                                    error={errors.specialty}
                                />
                            </div>

                            <div className="sm:col-span-1">
                                <TextInput
                                    label="SLMC registration"
                                    optional
                                    value={data.slmc_number}
                                    onChange={(e) =>
                                        setData({
                                            ...data,
                                            slmc_number: e.target.value.replace(/\D/g, ''),
                                        })
                                    }
                                    placeholder="e.g. 18429"
                                    helperText="Numbers only"
                                    error={errors.slmc_number}
                                />
                            </div>

                            <div className="sm:col-span-1">
                                <TextInput
                                    label="Token code"
                                    optional
                                    maxLength={5}
                                    value={data.token_code}
                                    onChange={(e) => {
                                        setTokenManuallyEdited(true);
                                        setData({
                                            ...data,
                                            token_code: e.target.value
                                                .toUpperCase()
                                                .replace(/[^A-Z0-9]/g, ''),
                                        });
                                    }}
                                    placeholder="e.g. SV"
                                    rightIcon={
                                        data.token_code ? (
                                            <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                                                {data.token_code}-01
                                            </span>
                                        ) : null
                                    }
                                    helperText={
                                        isTokenDuplicate ? (
                                            <span className="text-rose-500 font-semibold flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> Already in use
                                            </span>
                                        ) : (
                                            '2–3 letters (e.g. SV-01)'
                                        )
                                    }
                                    error={errors.token_code}
                                />
                            </div>
                        </div>
                    </FieldGroup>

                    <hr className="border-slate-200/70 dark:border-white/10 my-2" />

                    {/* Section 2: Fees & payout */}
                    <FieldGroup
                        title="Fees & consultation"
                        icon={<CreditCard className="w-3.5 h-3.5" />}
                        description="Consultation fee split and average patient time"
                    >
                        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 space-y-4">
                            <Switch
                                checked={data.use_clinic_default_fees}
                                onChange={(checked) =>
                                    setData({ ...data, use_clinic_default_fees: checked })
                                }
                                label="Use clinic default fee settings"
                                description="Automatically apply standard consultation fees configured in clinic settings"
                            />

                            <AnimatePresence>
                                {!data.use_clinic_default_fees && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/60 dark:border-white/5"
                                    >
                                        <TextInput
                                            label="Doctor fee"
                                            type="number"
                                            step="50"
                                            min="0"
                                            prefixText="Rs."
                                            value={data.doctor_fee_lkr}
                                            onChange={(e) => {
                                                const docVal = parseFloat(e.target.value) || 0;
                                                setData({
                                                    ...data,
                                                    doctor_fee_lkr: docVal,
                                                    total_fee_lkr: docVal + data.clinic_fee_lkr,
                                                });
                                            }}
                                            error={errors.doctor_fee_lkr}
                                        />

                                        <TextInput
                                            label="Clinic fee"
                                            type="number"
                                            step="50"
                                            min="0"
                                            prefixText="Rs."
                                            value={data.clinic_fee_lkr}
                                            onChange={(e) => {
                                                const clnVal = parseFloat(e.target.value) || 0;
                                                setData({
                                                    ...data,
                                                    clinic_fee_lkr: clnVal,
                                                    total_fee_lkr: data.doctor_fee_lkr + clnVal,
                                                });
                                            }}
                                            error={errors.clinic_fee_lkr}
                                        />

                                        <TextInput
                                            label="Total patient fee"
                                            type="number"
                                            readOnly
                                            prefixText="Rs."
                                            value={data.total_fee_lkr}
                                            className="bg-slate-100 dark:bg-slate-800 font-bold"
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Average consultation time */}
                            <div className="pt-2">
                                <div className="flex items-center justify-between mb-1.5">
                                    <FormLabel required>Average consultation time</FormLabel>
                                    <div className="flex items-center gap-1">
                                        {CONSULTATION_TIME_CHIPS.map((mins) => (
                                            <button
                                                key={mins}
                                                type="button"
                                                onClick={() =>
                                                    setData({ ...data, avg_consultation_minutes: mins })
                                                }
                                                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                                                    data.avg_consultation_minutes === mins
                                                        ? 'bg-[#1E6FD9] text-white shadow-xs'
                                                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-white/10'
                                                }`}
                                            >
                                                {mins}m
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <TextInput
                                    type="number"
                                    min="1"
                                    max="120"
                                    suffixText="minutes"
                                    value={data.avg_consultation_minutes}
                                    onChange={(e) =>
                                        setData({
                                            ...data,
                                            avg_consultation_minutes:
                                                parseInt(e.target.value, 10) || 15,
                                        })
                                    }
                                    error={errors.avg_consultation_minutes}
                                />
                            </div>
                        </div>
                    </FieldGroup>

                    <hr className="border-slate-200/70 dark:border-white/10 my-2" />

                    {/* Section 3: Portal access */}
                    <FieldGroup
                        title="Portal access"
                        icon={<Key className="w-3.5 h-3.5" />}
                        description="Associate doctor with a user account to grant clinical access"
                    >
                        <Select
                            label="Link to clinic user"
                            optional
                            value={data.user_id ? String(data.user_id) : ''}
                            onChange={(e) => setData({ ...data, user_id: e.target.value })}
                            options={userOptions}
                            placeholder="Not linked"
                            helperText="Enables the doctor to log in, view their patient queue, and conduct digital consultations."
                            error={errors.user_id}
                        />
                    </FieldGroup>

                    <hr className="border-slate-200/70 dark:border-white/10 my-2" />

                    {/* Section 4: Profile (Photo & Bio) */}
                    <FieldGroup
                        title="Doctor profile"
                        icon={<User className="w-3.5 h-3.5" />}
                        description="Portrait photo and medical qualifications displayed on booking pages"
                    >
                        <div className="flex items-center gap-4">
                            <div className="relative w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                                {data.photo_url ? (
                                    <img
                                        src={data.photo_url}
                                        alt="Doctor preview"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <span className="text-xl font-bold text-[#1E6FD9]">
                                        {data.name ? data.name.charAt(0).toUpperCase() : 'Dr'}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-1.5 flex-1">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs transition-colors"
                                    >
                                        <Upload className="w-3.5 h-3.5" />
                                        <span>Upload photo</span>
                                    </button>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handlePhotoFileChange}
                                    />
                                    {data.photo_url && (
                                        <button
                                            type="button"
                                            onClick={() => setData({ ...data, photo_url: '' })}
                                            className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                                            title="Remove photo"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                                    Recommended: Square portrait, 500x500px, WebP / JPG / PNG.
                                </p>
                            </div>
                        </div>

                        <Textarea
                            label="Bio / qualifications"
                            optional
                            rows={3}
                            maxLength={500}
                            showCharCount={true}
                            value={data.bio}
                            onChange={(e) => setData({ ...data, bio: e.target.value })}
                            placeholder="e.g. MBBS (Colombo), MD (Cardiology), FRCP (UK) - Consultant Cardiologist at National Hospital"
                            error={errors.bio}
                        />
                    </FieldGroup>

                    <hr className="border-slate-200/70 dark:border-white/10 my-2" />

                    {/* Section 5: Status */}
                    <FieldGroup
                        title="Doctor availability status"
                        icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                        <Switch
                            checked={data.is_active}
                            onChange={(checked) => setData({ ...data, is_active: checked })}
                            label="Active and accepting appointments"
                            description="When active, patients can book appointments with this doctor on the clinic booking portal."
                        />
                    </FieldGroup>
                </div>

                {/* Right Column: Live Preview Card (Desktop) */}
                <div className="lg:col-span-5">
                    <div className="sticky top-2 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/60 p-4 space-y-4 backdrop-blur-md">
                        {/* Preview Top Bar */}
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-[#0E9E8F] animate-pulse" />
                                Live card preview
                            </span>

                            {/* View Switcher: TV display vs Website */}
                            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-200/70 dark:bg-slate-800 text-[11px]">
                                <button
                                    type="button"
                                    onClick={() => setPreviewTab('tv')}
                                    className={`px-2 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
                                        previewTab === 'tv'
                                            ? 'bg-white dark:bg-slate-700 text-[#1E6FD9] shadow-xs'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                    }`}
                                >
                                    <Tv className="w-3 h-3" />
                                    <span>TV</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewTab('web')}
                                    className={`px-2 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
                                        previewTab === 'web'
                                            ? 'bg-white dark:bg-slate-700 text-[#1E6FD9] shadow-xs'
                                            : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                                    }`}
                                >
                                    <Globe className="w-3 h-3" />
                                    <span>Web</span>
                                </button>
                            </div>
                        </div>

                        {/* TV Display Preview Card */}
                        {previewTab === 'tv' ? (
                            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 text-white p-4.5 shadow-xl space-y-3.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] tracking-widest uppercase font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                                        TV Queue Display
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-[#1E6FD9] px-2.5 py-1 rounded-lg text-white shadow-xs">
                                        {previewTokenPrefix}-01
                                    </span>
                                </div>

                                <div className="flex items-center gap-3.5">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1E6FD9] to-[#0E9E8F] p-0.5 shadow-md shrink-0">
                                        <div className="w-full h-full rounded-[14px] bg-slate-900 overflow-hidden flex items-center justify-center">
                                            {data.photo_url ? (
                                                <img
                                                    src={data.photo_url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-xl font-black text-white">
                                                    {data.name
                                                        ? data.name.charAt(0).toUpperCase()
                                                        : 'D'}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h5 className="text-sm font-bold truncate text-white">
                                            {previewDisplayName}
                                        </h5>
                                        <p className="text-xs text-blue-300 font-medium truncate">
                                            {data.specialty || 'Specialty'}
                                        </p>
                                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 mt-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                            {data.is_active ? 'Accepting Patients' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Website Booking Card Preview */
                            <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 p-4.5 shadow-lg space-y-3.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] tracking-wider uppercase font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                        Online Booking Portal
                                    </span>
                                    <span className="text-[11px] font-bold text-[#1E6FD9]">
                                        {previewFeeFormatted}
                                    </span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200/80 dark:border-white/10">
                                        {data.photo_url ? (
                                            <img
                                                src={data.photo_url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <span className="text-base font-bold text-[#1E6FD9]">
                                                {data.name
                                                    ? data.name.charAt(0).toUpperCase()
                                                    : 'D'}
                                            </span>
                                        )}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <h5 className="text-xs font-bold truncate text-slate-900 dark:text-white">
                                            {previewDisplayName}
                                        </h5>
                                        <p className="text-[11px] text-[#0E9E8F] font-semibold truncate">
                                            {data.specialty || 'Specialty'}
                                        </p>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                            <span className="flex items-center gap-0.5">
                                                <Clock className="w-3 h-3" />
                                                {data.avg_consultation_minutes} mins
                                            </span>
                                            {data.slmc_number && (
                                                <span>· SLMC {data.slmc_number}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {data.bio && (
                                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 italic pt-1 border-t border-slate-100 dark:border-white/5">
                                        "{data.bio}"
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/30 text-[11px] text-blue-800 dark:text-blue-300 space-y-1">
                            <span className="font-bold block">Doctor Token Prefix</span>
                            <p className="text-slate-600 dark:text-slate-400">
                                Patients booked with this doctor receive tokens prefixed with{' '}
                                <strong className="text-[#1E6FD9] font-mono">
                                    {previewTokenPrefix}
                                </strong>{' '}
                                (e.g. {previewTokenPrefix}-01, {previewTokenPrefix}-02) across all digital queues.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </FormModal>
    );
}

export default DoctorFormModal;
