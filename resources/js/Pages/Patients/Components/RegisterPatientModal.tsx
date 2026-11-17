import React, { useState, useEffect, useRef, useMemo } from 'react';
import { usePage, router } from '@inertiajs/react';
import {
    User,
    MapPin,
    FileText,
    PhoneCall,
    ExternalLink,
    AlertCircle,
    Check,
    Ticket,
} from 'lucide-react';
import axios from 'axios';
import { parseSriLankanNIC } from '@/Utils/sriLankanNIC';
import {
    FormModal,
    TextInput,
    PhoneInput,
    Select,
    DateInput,
    Textarea,
    FieldGroup,
    TagInput,
    FormLabel,
} from '@/Components/Form';

export interface PatientFormData {
    id?: number;
    name: string;
    phone: string;
    nic: string;
    gender: 'male' | 'female' | 'other' | '';
    date_of_birth: string;
    district: string;
    city: string;
    address: string;
    allergies: string;
    notes: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
}

export interface RegisterPatientModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingPatient?: any | null;
    allDistricts?: string[];
    onSuccess?: (patient: any, action?: 'save' | 'save_and_issue_token') => void;
    onViewPatient?: (patientId: number) => void;
}

interface DuplicateMatch {
    id: number;
    name: string;
    phone: string;
    nic?: string;
    city?: string;
    last_visit_date?: string;
    formatted_id?: string;
}

export function RegisterPatientModal({
    isOpen,
    onClose,
    editingPatient = null,
    allDistricts = [],
    onSuccess,
    onViewPatient,
}: RegisterPatientModalProps) {
    const page = usePage();
    const clinicDistrict = (page.props as any)?.tenant?.district || '';

    const initialFormData: PatientFormData = useMemo(() => {
        if (editingPatient) {
            return {
                id: editingPatient.id,
                name: editingPatient.name || '',
                phone: editingPatient.phone || '',
                nic: editingPatient.nic || '',
                gender: editingPatient.gender || '',
                date_of_birth: editingPatient.date_of_birth || '',
                district: editingPatient.district || '',
                city: editingPatient.city || '',
                address: editingPatient.address || '',
                allergies: editingPatient.allergies || '',
                notes: editingPatient.notes || '',
                emergency_contact_name: editingPatient.emergency_contact_name || '',
                emergency_contact_phone: editingPatient.emergency_contact_phone || '',
            };
        }

        return {
            name: '',
            phone: '',
            nic: '',
            gender: '',
            date_of_birth: '',
            district: clinicDistrict || '',
            city: '',
            address: '',
            allergies: '',
            notes: '',
            emergency_contact_name: '',
            emergency_contact_phone: '',
        };
    }, [editingPatient, clinicDistrict]);

    const [data, setData] = useState<PatientFormData>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitAction, setSubmitAction] = useState<'save' | 'save_and_issue_token'>('save');

    // Duplicate check states
    const [duplicateMatch, setDuplicateMatch] = useState<DuplicateMatch | null>(null);
    const [checkingDuplicate, setCheckingDuplicate] = useState(false);
    const duplicateSearchTimer = useRef<NodeJS.Timeout | null>(null);

    // Track dirty state
    const isDirty = useMemo(() => {
        return (
            data.name !== initialFormData.name ||
            data.phone !== initialFormData.phone ||
            data.nic !== initialFormData.nic ||
            data.gender !== initialFormData.gender ||
            data.date_of_birth !== initialFormData.date_of_birth ||
            data.district !== initialFormData.district ||
            data.city !== initialFormData.city ||
            data.address !== initialFormData.address ||
            data.allergies !== initialFormData.allergies ||
            data.notes !== initialFormData.notes ||
            data.emergency_contact_name !== initialFormData.emergency_contact_name ||
            data.emergency_contact_phone !== initialFormData.emergency_contact_phone
        );
    }, [data, initialFormData]);

    // Reset when modal opens or editing patient changes
    useEffect(() => {
        if (isOpen) {
            setData(initialFormData);
            setErrors({});
            setDuplicateMatch(null);
        }
    }, [isOpen, initialFormData]);

    // Auto-fill gender and date of birth from valid NIC
    const handleNicChange = (nicVal: string) => {
        setData((prev) => {
            const next = { ...prev, nic: nicVal };
            const parsed = parseSriLankanNIC(nicVal);

            if (parsed.isValid) {
                if (parsed.gender) {
                    next.gender = parsed.gender;
                }
                if (parsed.dateOfBirth) {
                    next.date_of_birth = parsed.dateOfBirth;
                }
            }
            return next;
        });

        // Trigger debounced duplicate check for NIC
        triggerDuplicateCheck(nicVal, 'nic');
    };

    // Duplicate search handler
    const triggerDuplicateCheck = (query: string, field: 'phone' | 'nic') => {
        if (editingPatient) return; // Don't check duplicates when editing existing

        if (duplicateSearchTimer.current) {
            clearTimeout(duplicateSearchTimer.current);
        }

        const cleanQuery = query.replace(/[^\d+a-zA-Z]/g, '');
        if (cleanQuery.length < 5) {
            setDuplicateMatch(null);
            return;
        }

        duplicateSearchTimer.current = setTimeout(async () => {
            try {
                setCheckingDuplicate(true);
                const res = await axios.get('/api/patients/search', {
                    params: { q: cleanQuery },
                });

                if (Array.isArray(res.data) && res.data.length > 0) {
                    // Match found
                    const match = res.data[0];
                    setDuplicateMatch(match);
                } else {
                    setDuplicateMatch(null);
                }
            } catch (err) {
                // Ignore search network error silently
            } finally {
                setCheckingDuplicate(false);
            }
        }, 350);
    };

    const handlePhoneChange = (normalizedPhone: string) => {
        setData((prev) => ({ ...prev, phone: normalizedPhone }));
        triggerDuplicateCheck(normalizedPhone, 'phone');
    };

    // Submit form
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        // Client validation
        const newErrors: Record<string, string> = {};
        if (!data.name.trim()) {
            newErrors.name = 'Patient full name is required.';
        }
        if (!data.phone.trim()) {
            newErrors.phone = 'Mobile phone number is required.';
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsSubmitting(true);

        const url = editingPatient ? `/patients/${editingPatient.id}` : '/patients';
        const method = editingPatient ? 'put' : 'post';

        router[method](url, data as any, {
            preserveScroll: true,
            onSuccess: (pageProps) => {
                setIsSubmitting(false);
                onClose();
                if (onSuccess) {
                    onSuccess(data, submitAction);
                }
            },
            onError: (serverErrors) => {
                setIsSubmitting(false);
                setErrors(serverErrors);
            },
        });
    };

    const districtOptions = useMemo(() => {
        return allDistricts.map((d) => ({ value: d, label: d }));
    }, [allDistricts]);

    return (
        <FormModal
            isOpen={isOpen}
            onClose={onClose}
            title={editingPatient ? `Edit patient · ${editingPatient.name}` : 'Register patient'}
            description="Enter patient details, contact numbers, address, and medical notes."
            isDirty={isDirty}
            isSubmitting={isSubmitting}
            submitLabel={editingPatient ? 'Update patient' : 'Save patient'}
            cancelLabel="Cancel"
            onSubmit={handleSubmit}
            extraFooterActions={
                !editingPatient && (
                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={(e) => {
                            setSubmitAction('save_and_issue_token');
                            handleSubmit(e);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#0E9E8F] hover:bg-teal-600 shadow-md shadow-teal-500/20 disabled:opacity-50 transition-all cursor-pointer"
                    >
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Save & issue token</span>
                    </button>
                )
            }
        >
            {/* Inline Duplicate Patient Alert */}
            {duplicateMatch && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 min-w-0">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <span className="truncate">
                            <strong>Possible existing patient:</strong> {duplicateMatch.name}
                            {duplicateMatch.last_visit_date
                                ? ` · Last visit ${duplicateMatch.last_visit_date}`
                                : duplicateMatch.city
                                ? ` · ${duplicateMatch.city}`
                                : ''}
                        </span>
                    </div>

                    {onViewPatient && (
                        <button
                            type="button"
                            onClick={() => {
                                onViewPatient(duplicateMatch.id);
                                onClose();
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/50 hover:bg-amber-50 dark:hover:bg-slate-700 shadow-xs shrink-0"
                        >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3" />
                        </button>
                    )}
                </div>
            )}

            {/* Section 1: Patient details */}
            <FieldGroup
                title="Patient details"
                icon={<User className="w-3.5 h-3.5" />}
                description="Primary patient identification, phone, NIC, and birthdate"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <TextInput
                        label="Full name"
                        required
                        value={data.name}
                        onChange={(e) => setData({ ...data, name: e.target.value })}
                        placeholder="e.g. Sunil Shantha"
                        error={errors.name}
                    />

                    <PhoneInput
                        label="Mobile number (+94)"
                        required
                        value={data.phone}
                        onChange={handlePhoneChange}
                        placeholder="7X XXX XXXX"
                        error={errors.phone}
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                        <TextInput
                            label="Sri Lankan NIC"
                            optional
                            value={data.nic}
                            onChange={(e) => handleNicChange(e.target.value)}
                            placeholder="199012345678 or 901234567V"
                            error={errors.nic}
                            helperText="Auto-fills gender and birthdate"
                        />
                    </div>

                    <div>
                        <FormLabel optional>Gender</FormLabel>
                        <div className="h-11 p-1 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 flex items-center gap-1">
                            {(['male', 'female', 'other'] as const).map((g) => {
                                const isSelected = data.gender === g;
                                const label = g === 'male' ? 'Male' : g === 'female' ? 'Female' : 'Other';
                                return (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setData({ ...data, gender: isSelected ? '' : g })}
                                        className={`flex-1 h-full rounded-lg text-xs font-semibold transition-all duration-150 capitalize flex items-center justify-center gap-1 ${
                                            isSelected
                                                ? 'bg-white dark:bg-slate-700 text-[#1E6FD9] dark:text-blue-300 shadow-xs font-bold'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        {isSelected && <Check className="w-3 h-3 text-[#1E6FD9]" />}
                                        <span>{label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <DateInput
                            label="Date of birth"
                            optional
                            value={data.date_of_birth}
                            onChange={(iso) => setData({ ...data, date_of_birth: iso })}
                            placeholder="dd/mm/yyyy"
                            error={errors.date_of_birth}
                        />
                    </div>
                </div>
            </FieldGroup>

            <hr className="border-slate-200/70 dark:border-white/10 my-2" />

            {/* Section 2: Address */}
            <FieldGroup
                title="Residential address"
                icon={<MapPin className="w-3.5 h-3.5" />}
                description="District, town/city, and street address"
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <Select
                        label="District"
                        optional
                        value={data.district}
                        onChange={(e) => setData({ ...data, district: e.target.value })}
                        options={districtOptions}
                        placeholder="Select district..."
                        searchable={true}
                        error={errors.district}
                    />

                    <TextInput
                        label="Town / city"
                        optional
                        value={data.city}
                        onChange={(e) => setData({ ...data, city: e.target.value })}
                        placeholder="e.g. Nugegoda / Dehiwala"
                        error={errors.city}
                    />
                </div>

                <TextInput
                    label="Street address"
                    optional
                    value={data.address}
                    onChange={(e) => setData({ ...data, address: e.target.value })}
                    placeholder="e.g. No. 42, Temple Road"
                    error={errors.address}
                />
            </FieldGroup>

            <hr className="border-slate-200/70 dark:border-white/10 my-2" />

            {/* Section 3: Medical notes (optional, neutral styling) */}
            <FieldGroup
                title="Medical notes"
                icon={<FileText className="w-3.5 h-3.5" />}
                description="Known allergies and chronic medical conditions (neutral clinical view)"
            >
                <TagInput
                    label="Known allergies"
                    optional
                    value={data.allergies}
                    onChange={(tags) => setData({ ...data, allergies: tags })}
                    placeholder="e.g. Penicillin, Aspirin, Peanuts (type and press enter)"
                    helperText="Press Enter or comma to create an allergy chip"
                    error={errors.allergies}
                />

                <Textarea
                    label="Chronic conditions / clinical notes"
                    optional
                    rows={2}
                    value={data.notes}
                    onChange={(e) => setData({ ...data, notes: e.target.value })}
                    placeholder="e.g. Type 2 diabetic, hypertensive on regular medication"
                    error={errors.notes}
                />
            </FieldGroup>

            <hr className="border-slate-200/70 dark:border-white/10 my-2" />

            {/* Section 4: Emergency contact (optional, collapsible) */}
            <FieldGroup
                title="Emergency contact"
                icon={<PhoneCall className="w-3.5 h-3.5" />}
                description="Relative or guardian details for urgent situations"
                collapsible={true}
                defaultOpen={Boolean(data.emergency_contact_name || data.emergency_contact_phone)}
                badge={
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal">
                        (optional)
                    </span>
                }
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <TextInput
                        label="Contact person name"
                        optional
                        value={data.emergency_contact_name}
                        onChange={(e) => setData({ ...data, emergency_contact_name: e.target.value })}
                        placeholder="e.g. S. Shantha (Spouse)"
                        error={errors.emergency_contact_name}
                    />

                    <TextInput
                        label="Contact phone number"
                        optional
                        value={data.emergency_contact_phone}
                        onChange={(e) => setData({ ...data, emergency_contact_phone: e.target.value })}
                        placeholder="07X XXX XXXX"
                        error={errors.emergency_contact_phone}
                    />
                </div>
            </FieldGroup>
        </FormModal>
    );
}

export default RegisterPatientModal;
