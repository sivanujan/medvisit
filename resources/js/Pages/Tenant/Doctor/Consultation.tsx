import React, { useState, useEffect, useRef } from 'react';
import { Head, router, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import {
    Stethoscope,
    Clock,
    User,
    Phone,
    Calendar,
    Pill,
    Plus,
    Trash2,
    Save,
    CheckCircle2,
    Printer,
    History,
    Sparkles,
    AlertCircle,
    Copy,
    ChevronDown,
    ChevronUp,
    FileText,
    BookmarkPlus,
    X,
    Search,
    RotateCcw,
    Lock,
    ExternalLink,
} from 'lucide-react';
import { formatLKR } from '@/Utils/formatters';

interface Patient {
    id: number;
    name: string;
    phone: string;
    gender: string;
    age: number | null;
    allergies: string | null;
}

interface DoctorInfo {
    id: number;
    name: string;
    specialty: string;
    slmc_number?: string;
}

interface BillInfo {
    id: number;
    payment_status: string;
    total_amount_formatted: string;
}

interface TokenData {
    id: number;
    token_number: number;
    status: string;
    estimated_time?: string;
    patient: Patient;
    doctor: DoctorInfo;
    bill: BillInfo | null;
}

export interface PrescriptionItemState {
    id?: number;
    clinic_medicine_id?: number | null;
    medicine_variant_id?: number | null;
    generic_name: string;
    strength_text: string;
    dosage_form: string;
    brand_name?: string | null;
    display_name: string;
    source: 'clinic_stock' | 'buy_outside';
    dose: string;
    frequency: string;
    frequency_text?: string | null;
    duration_days: number | string;
    timing: string;
    quantity: number;
    instructions?: string;
    unit_price_cents?: number;
}

interface PrescriptionData {
    id: number;
    prescription_number: string;
    status: string;
    chief_complaint: string;
    diagnosis: string;
    clinical_notes: string;
    follow_up_date: string;
    addendum_notes: string;
    cancellation_reason: string;
    is_finalized: boolean;
    is_dispensed: boolean;
    is_cancelled: boolean;
    is_locked: boolean;
    stock_reduction_mode: string;
    tags: string[];
    items: PrescriptionItemState[];
}

interface TemplateItem {
    display_name: string;
    clinic_medicine_id?: number | null;
    medicine_variant_id?: number | null;
    source: 'clinic_stock' | 'buy_outside';
    dose: string;
    frequency: string;
    duration_days: number;
    timing: string;
    quantity: number;
    instructions?: string;
}

interface PrescriptionTemplate {
    id: number;
    name: string;
    description?: string;
    is_shared: boolean;
    items: TemplateItem[];
}

interface DiagnosisTagItem {
    id: number;
    name: string;
    usage_count: number;
}

interface PastPrescription {
    id: number;
    prescription_number: string;
    date: string;
    doctor_name: string;
    chief_complaint?: string;
    diagnosis?: string;
    follow_up_date?: string;
    items: Array<{
        id: number;
        display_name: string;
        dose: string;
        frequency: string;
        duration_days: number;
        timing: string;
        quantity: number;
        source: string;
    }>;
}

interface Props {
    token: TokenData;
    prescription: PrescriptionData;
    settings: {
        pharmacy_enabled: boolean;
        stock_reduction_mode: string;
        prescription_print_enabled: boolean;
        print_language: string;
    };
    patientHistory: PastPrescription[];
    suggestedTags: DiagnosisTagItem[];
    templates: PrescriptionTemplate[];
}

const COMMON_CHIEF_COMPLAINTS = [
    'Fever',
    'Cough',
    'Cold / Flu',
    'Sore Throat',
    'Headache',
    'Body Ache',
    'Abdominal Pain',
    'Gastritis / Acid Reflux',
    'Diarrhea',
    'Vomiting',
    'Skin Rash / Allergy',
    'Back Pain',
    'Joint Pain',
    'General Weakness',
];

const FREQUENCY_OPTIONS = [
    { value: '1-0-1', label: '1-0-1 (Morning & Night)' },
    { value: '1-1-1', label: '1-1-1 (Three times daily)' },
    { value: '1-0-0', label: '1-0-0 (Morning only)' },
    { value: '0-0-1', label: '0-0-1 (Night only)' },
    { value: '0-1-0', label: '0-1-0 (Afternoon only)' },
    { value: '1-1-1-1', label: '1-1-1-1 (Four times daily)' },
    { value: 'sos', label: 'SOS / PRN (As needed)' },
    { value: 'once_daily', label: 'Once daily' },
    { value: 'stat', label: 'STAT (Immediately)' },
];

const TIMING_OPTIONS = [
    { value: 'after_meals', label: 'After Meals' },
    { value: 'before_meals', label: 'Before Meals' },
    { value: 'with_meals', label: 'With Meals' },
    { value: 'bedtime', label: 'At Bedtime' },
    { value: 'empty_stomach', label: 'Empty Stomach' },
    { value: 'as_directed', label: 'As Directed' },
];

export default function Consultation({
    token,
    prescription,
    settings,
    patientHistory,
    suggestedTags,
    templates,
}: Props) {
    // Form state
    const [chiefComplaint, setChiefComplaint] = useState(prescription.chief_complaint || '');
    const [diagnosis, setDiagnosis] = useState(prescription.diagnosis || '');
    const [clinicalNotes, setClinicalNotes] = useState(prescription.clinical_notes || '');
    const [followUpDate, setFollowUpDate] = useState(prescription.follow_up_date || '');
    const [selectedTags, setSelectedTags] = useState<string[]>(prescription.tags || []);
    const [items, setItems] = useState<PrescriptionItemState[]>(prescription.items || []);

    // UI state
    const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
    const [showNotes, setShowNotes] = useState(!!prescription.clinical_notes);
    const [showAddendumModal, setShowAddendumModal] = useState(false);
    const [addendumText, setAddendumText] = useState('');
    const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateShared, setNewTemplateShared] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Medicine search state for each row
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isReadOnly = prescription.is_locked || prescription.is_finalized || prescription.is_cancelled;

    // Dose Calculation helper on the client for live responsiveness
    const calculateQuantity = (doseStr: string, freqStr: string, daysVal: number | string, form: string): number => {
        const days = Number(daysVal);
        if (!days || isNaN(days) || days <= 0) return 0;

        // Non-solid forms (syrups, creams) default to 1 pack/bottle
        const lowerForm = (form || '').toLowerCase();
        if (['syrup', 'suspension', 'cream', 'ointment', 'gel', 'lotion', 'drops', 'inhaler', 'spray'].includes(lowerForm)) {
            return 1;
        }

        if (['sos', 'prn', 'as_needed'].includes(freqStr.toLowerCase())) {
            return 0; // Doctor will set manually
        }

        // Parse dose decimal
        let dose = 1;
        const trimmed = (doseStr || '').trim();
        if (trimmed === '1/2' || trimmed === '0.5') dose = 0.5;
        else if (trimmed === '1/4' || trimmed === '0.25') dose = 0.25;
        else if (trimmed === '3/4' || trimmed === '0.75') dose = 0.75;
        else if (trimmed === '1 1/2' || trimmed === '1.5') dose = 1.5;
        else {
            const parsed = parseFloat(trimmed);
            if (!isNaN(parsed) && parsed > 0) dose = parsed;
        }

        // Parse frequency
        let timesPerDay = 1;
        if (freqStr.includes('-')) {
            const parts = freqStr.split('-');
            let sum = 0;
            for (const p of parts) {
                const pt = p.trim();
                if (pt === '1/2' || pt === '0.5') sum += 0.5;
                else {
                    const num = parseFloat(pt);
                    if (!isNaN(num)) sum += num;
                }
            }
            if (sum > 0) {
                return Math.ceil(sum * days);
            }
        } else if (freqStr === '1-1-1') timesPerDay = 3;
        else if (freqStr === '1-0-1') timesPerDay = 2;
        else if (freqStr === '1-0-0' || freqStr === '0-0-1' || freqStr === 'once_daily') timesPerDay = 1;
        else if (freqStr === '1-1-1-1') timesPerDay = 4;
        else if (freqStr === 'stat') return Math.ceil(dose);

        return Math.ceil(dose * timesPerDay * days);
    };

    // Live search catalog & clinic inventory
    const searchMedicines = (query: string, rowIndex: number) => {
        setSearchQuery(query);
        setActiveSearchIndex(rowIndex);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (!query || query.trim().length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/pharmacy/catalog/search?q=${encodeURIComponent(query)}&query=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    const rawList = data.results || data.data || [];
                    const normalized = rawList.map((item: any) => ({
                        ...item,
                        id: item.clinic_medicine_id || item.id,
                        clinic_medicine_id: item.clinic_medicine_id || (item.source === 'stock' ? item.id : null),
                        variant_id: item.variant_id || item.medicine_variant_id,
                        medicine_variant_id: item.variant_id || item.medicine_variant_id,
                        in_clinic_stock: item.in_stock ?? (item.source === 'stock'),
                        current_stock: item.total_quantity ?? item.current_stock ?? 0,
                        strength_text: item.strength_form || item.strength_text || '',
                        dosage_form: item.dosage_form || item.base_unit || 'Tablet',
                        display_name: item.display_name,
                        brand_name: item.brand_name || null,
                        generic_name: item.generic_name || item.display_name,
                        selling_price_cents: item.selling_price_cents || 0,
                    }));
                    setSearchResults(normalized);
                }
            } catch (err) {
                console.error('Failed to search medicines:', err);
            } finally {
                setIsSearching(false);
            }
        }, 200);
    };

    const selectMedicineResult = (result: any, index: number) => {
        const nextItems = [...items];
        const hasStock = (result.in_clinic_stock || result.in_stock) && ((result.current_stock > 0) || (result.total_quantity > 0));
        const isClinicStock = hasStock && settings.pharmacy_enabled;

        const displayName = result.display_name || (result.brand_name
            ? `${result.brand_name} (${result.generic_name} ${result.strength_text || ''} ${result.dosage_form || ''})`
            : `${result.generic_name} ${result.strength_text || ''} ${result.dosage_form || ''}`.trim());

        nextItems[index] = {
            ...nextItems[index],
            clinic_medicine_id: isClinicStock ? (result.clinic_medicine_id || result.id) : null,
            medicine_variant_id: result.medicine_variant_id || result.variant_id || null,
            generic_name: result.generic_name || displayName,
            strength_text: result.strength_text || result.strength_form || '',
            dosage_form: result.dosage_form || result.base_unit || 'Tablet',
            brand_name: result.brand_name || null,
            display_name: displayName,
            source: isClinicStock ? 'clinic_stock' : 'buy_outside',
            unit_price_cents: result.selling_price_cents || 0,
            quantity: calculateQuantity(nextItems[index].dose || '1', nextItems[index].frequency || '1-0-1', nextItems[index].duration_days || 3, result.dosage_form || 'Tablet'),
        };

        setItems(nextItems);
        setActiveSearchIndex(null);
        setSearchResults([]);
    };

    const addItem = () => {
        setItems([
            ...items,
            {
                generic_name: '',
                strength_text: '',
                dosage_form: 'Tablet',
                brand_name: null,
                display_name: '',
                source: settings.pharmacy_enabled ? 'clinic_stock' : 'buy_outside',
                dose: '1',
                frequency: '1-0-1',
                duration_days: 3,
                timing: 'after_meals',
                quantity: 6,
                instructions: '',
            },
        ]);
    };

    const removeItem = (idx: number) => {
        setItems(items.filter((_, i) => i !== idx));
    };

    const updateItem = (idx: number, field: keyof PrescriptionItemState, value: any) => {
        const next = [...items];
        next[idx] = { ...next[idx], [field]: value };

        // Recalculate quantity if dose, frequency or days change
        if (field === 'dose' || field === 'frequency' || field === 'duration_days') {
            const autoQty = calculateQuantity(
                field === 'dose' ? value : next[idx].dose,
                field === 'frequency' ? value : next[idx].frequency,
                field === 'duration_days' ? value : next[idx].duration_days,
                next[idx].dosage_form
            );
            if (autoQty > 0) {
                next[idx].quantity = autoQty;
            }
        }

        setItems(next);
    };

    const toggleTag = (tagName: string) => {
        if (selectedTags.includes(tagName)) {
            setSelectedTags(selectedTags.filter((t) => t !== tagName));
        } else {
            setSelectedTags([...selectedTags, tagName]);
        }
    };

    const addComplaintChip = (chip: string) => {
        if (!chiefComplaint) {
            setChiefComplaint(chip);
        } else if (!chiefComplaint.includes(chip)) {
            setChiefComplaint(`${chiefComplaint}, ${chip}`);
        }
    };

    const applyTemplate = (tpl: PrescriptionTemplate) => {
        if (items.length > 0 && !confirm('This will append the template medicines to your current list. Continue?')) {
            return;
        }

        // Record template usage in background
        fetch(`/doctor/templates/${tpl.id}/apply`, {
            method: 'POST',
            headers: {
                'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                'Accept': 'application/json',
            },
        }).catch(() => {});

        const templateItems: PrescriptionItemState[] = tpl.items.map((it) => ({
            clinic_medicine_id: it.clinic_medicine_id,
            medicine_variant_id: it.medicine_variant_id,
            generic_name: it.display_name,
            strength_text: '',
            dosage_form: 'Tablet',
            brand_name: null,
            display_name: it.display_name,
            source: settings.pharmacy_enabled ? it.source : 'buy_outside',
            dose: it.dose || '1',
            frequency: it.frequency || '1-0-1',
            duration_days: it.duration_days || 3,
            timing: it.timing || 'after_meals',
            quantity: it.quantity || calculateQuantity(it.dose || '1', it.frequency || '1-0-1', it.duration_days || 3, 'Tablet'),
            instructions: it.instructions || '',
        }));

        setItems([...items, ...templateItems]);
    };

    const repeatLastPrescription = () => {
        if (!patientHistory || patientHistory.length === 0) return;
        const last = patientHistory[0];

        if (items.length > 0 && !confirm('Replace current prescription items with the patient’s last prescription?')) {
            return;
        }

        if (last.chief_complaint && !chiefComplaint) setChiefComplaint(last.chief_complaint);
        if (last.diagnosis && !diagnosis) setDiagnosis(last.diagnosis);

        const repeatedItems: PrescriptionItemState[] = last.items.map((it) => ({
            display_name: it.display_name,
            generic_name: it.display_name,
            strength_text: '',
            dosage_form: 'Tablet',
            source: 'buy_outside', // Re-evaluate during save
            dose: it.dose || '1',
            frequency: it.frequency || '1-0-1',
            duration_days: it.duration_days || 3,
            timing: it.timing || 'after_meals',
            quantity: it.quantity || 0,
        }));

        setItems(repeatedItems);
    };

    // Submissions
    const saveDraft = () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setSubmitError(null);

        router.post(
            `/doctor/consultation/${token.id}/draft`,
            {
                chief_complaint: chiefComplaint,
                diagnosis: diagnosis,
                clinical_notes: clinicalNotes,
                follow_up_date: followUpDate || null,
                tags: selectedTags,
                items: items.map((it) => ({
                    clinic_medicine_id: it.clinic_medicine_id || null,
                    medicine_variant_id: it.medicine_variant_id || null,
                    generic_name: it.generic_name || it.display_name,
                    strength_text: it.strength_text || null,
                    dosage_form: it.dosage_form || null,
                    brand_name: it.brand_name || null,
                    display_name: it.display_name,
                    source: it.source,
                    dose: it.dose,
                    frequency: it.frequency,
                    duration_days: it.duration_days ? Number(it.duration_days) : null,
                    timing: it.timing,
                    quantity: Number(it.quantity) || 0,
                    instructions: it.instructions || null,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => setIsSubmitting(false),
                onError: (errors) => {
                    setIsSubmitting(false);
                    setSubmitError(Object.values(errors)[0] as string || 'Failed to save draft.');
                },
            }
        );
    };

    const finalizeConsultation = () => {
        if (isSubmitting) return;
        if (!diagnosis && !chiefComplaint && items.length === 0) {
            alert('Please add at least a chief complaint, diagnosis, or prescribed medicine before finalizing.');
            return;
        }

        if (
            !confirm(
                'Finalize consultation and prescription? This locks medicine items and notifies the pharmacy/billing.'
            )
        ) {
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        router.post(
            `/doctor/consultation/${token.id}/finalize`,
            {
                chief_complaint: chiefComplaint,
                diagnosis: diagnosis,
                clinical_notes: clinicalNotes,
                follow_up_date: followUpDate || null,
                tags: selectedTags,
                items: items.map((it) => ({
                    clinic_medicine_id: it.clinic_medicine_id || null,
                    medicine_variant_id: it.medicine_variant_id || null,
                    generic_name: it.generic_name || it.display_name,
                    strength_text: it.strength_text || null,
                    dosage_form: it.dosage_form || null,
                    brand_name: it.brand_name || null,
                    display_name: it.display_name,
                    source: it.source,
                    dose: it.dose,
                    frequency: it.frequency,
                    duration_days: it.duration_days ? Number(it.duration_days) : null,
                    timing: it.timing,
                    quantity: Number(it.quantity) || 0,
                    instructions: it.instructions || null,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => setIsSubmitting(false),
                onError: (errors) => {
                    setIsSubmitting(false);
                    setSubmitError(Object.values(errors)[0] as string || 'Failed to finalize consultation.');
                },
            }
        );
    };

    const submitAddendum = (e: React.FormEvent) => {
        e.preventDefault();
        if (!addendumText.trim()) return;

        setIsSubmitting(true);
        router.post(
            `/doctor/consultation/${token.id}/addendum`,
            { addendum_notes: addendumText },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowAddendumModal(false);
                    setAddendumText('');
                    setIsSubmitting(false);
                },
                onError: () => setIsSubmitting(false),
            }
        );
    };

    const saveAsTemplate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTemplateName.trim() || items.length === 0) return;

        setIsSubmitting(true);
        router.post(
            '/doctor/templates',
            {
                name: newTemplateName,
                is_shared: newTemplateShared,
                items: items.map((it) => ({
                    clinic_medicine_id: it.clinic_medicine_id || null,
                    medicine_variant_id: it.medicine_variant_id || null,
                    display_name: it.display_name,
                    source: it.source,
                    dose: it.dose,
                    frequency: it.frequency,
                    duration_days: it.duration_days ? Number(it.duration_days) : null,
                    timing: it.timing,
                    quantity: Number(it.quantity) || 0,
                    instructions: it.instructions || null,
                })),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setShowSaveTemplateModal(false);
                    setNewTemplateName('');
                    setIsSubmitting(false);
                },
                onError: () => setIsSubmitting(false),
            }
        );
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Consultation - Token #${token.token_number} - ${token.patient.name}`} />

            <div className="space-y-6 pb-28">
                {/* PAGE HEADER */}
                <PageHeader
                    breadcrumbs={[
                        { label: 'Today\'s Queue', href: '/sessions/today' },
                        { label: `Token #${token.token_number} (${token.patient.name})` },
                    ]}
                    title={`Consultation & Prescription: Token #${token.token_number}`}
                    subtitle={`Patient: ${token.patient.name} (${token.patient.gender || 'Patient'}, ${token.patient.age ? `${token.patient.age} yrs` : 'Age N/A'}) • Doctor: ${token.doctor.name}`}
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            {prescription.is_finalized && settings.prescription_print_enabled && (
                                <a
                                    href={`/doctor/prescriptions/${prescription.id}/print`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 shadow-xs"
                                >
                                    <Printer className="w-3.5 h-3.5 text-primary-600" />
                                    <span>Print Prescription (A5)</span>
                                </a>
                            )}

                            <button
                                type="button"
                                onClick={() => setShowHistoryDrawer(true)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 shadow-xs"
                            >
                                <History className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Patient History ({patientHistory.length})</span>
                            </button>

                            <Link
                                href="/sessions/today"
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <span>Back to Queue</span>
                            </Link>
                        </div>
                    }
                />

                {/* ERROR ALERT */}
                {submitError && (
                    <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between text-rose-700 dark:text-rose-300 text-xs">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{submitError}</span>
                        </div>
                        <button type="button" onClick={() => setSubmitError(null)} className="p-1 hover:text-rose-900">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* PATIENT & VISIT BANNER CARD */}
                <GlassCard className="p-4 sm:p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black text-lg shadow-inner">
                                #{token.token_number}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        {token.patient.name}
                                    </h2>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                                        {token.patient.gender || 'Unknown'} {token.patient.age ? `• ${token.patient.age} yrs` : ''}
                                    </span>
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            prescription.is_finalized
                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                : prescription.is_cancelled
                                                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                        }`}
                                    >
                                        {prescription.status}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    <span className="flex items-center gap-1">
                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                        {token.patient.phone}
                                    </span>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        Est. {token.estimated_time || 'Now'}
                                    </span>
                                    {token.bill && (
                                        <>
                                            <span>•</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                Bill: {token.bill.total_amount_formatted} ({token.bill.payment_status})
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* REPEAT LAST PRESCRIPTION QUICK ACTION */}
                        {!isReadOnly && patientHistory.length > 0 && items.length === 0 && (
                            <button
                                type="button"
                                onClick={repeatLastPrescription}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 hover:bg-indigo-100 transition-all"
                            >
                                <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                                <span>Repeat Last Prescription</span>
                            </button>
                        )}
                    </div>

                    {/* Allergies banner if recorded */}
                    {token.patient.allergies && (
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-semibold">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>Known Allergies: {token.patient.allergies}</span>
                        </div>
                    )}
                </GlassCard>

                {/* CONSULTATION INPUT WORKSPACE */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* LEFT COLUMN: Chief Complaint, Diagnosis, Notes (5 cols) */}
                    <div className="lg:col-span-5 space-y-6">
                        {/* Chief Complaint Card */}
                        <GlassCard className="p-4 sm:p-5 space-y-3">
                            <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                Chief Complaint / Presenting Symptoms
                            </label>

                            {/* Quick chips */}
                            {!isReadOnly && (
                                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                                    {COMMON_CHIEF_COMPLAINTS.map((chip) => (
                                        <button
                                            key={chip}
                                            type="button"
                                            onClick={() => addComplaintChip(chip)}
                                            className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-primary-50 hover:text-primary dark:bg-slate-800 dark:hover:bg-primary-950/60 text-slate-600 dark:text-slate-300 transition-colors"
                                        >
                                            + {chip}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <textarea
                                rows={2}
                                value={chiefComplaint}
                                onChange={(e) => setChiefComplaint(e.target.value)}
                                disabled={isReadOnly}
                                placeholder="e.g. High fever for 2 days with severe dry cough and headache..."
                                className="w-full text-xs p-3 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                            />
                        </GlassCard>

                        {/* Diagnosis Card & Tags */}
                        <GlassCard className="p-4 sm:p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                    Diagnosis
                                </label>
                                {suggestedTags.length > 0 && !isReadOnly && (
                                    <span className="text-[10px] text-slate-400">Doctor's frequent tags:</span>
                                )}
                            </div>

                            {/* Suggested Tags (most used first) */}
                            {!isReadOnly && suggestedTags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                                    {suggestedTags.map((tag) => {
                                        const isSelected = selectedTags.includes(tag.name);
                                        return (
                                            <button
                                                key={tag.id}
                                                type="button"
                                                onClick={() => toggleTag(tag.name)}
                                                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-all ${
                                                    isSelected
                                                        ? 'bg-primary text-white shadow-xs'
                                                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                                }`}
                                            >
                                                {tag.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            <input
                                type="text"
                                value={diagnosis}
                                onChange={(e) => setDiagnosis(e.target.value)}
                                disabled={isReadOnly}
                                placeholder="e.g. Acute Upper Respiratory Tract Infection (URTI)"
                                className="w-full text-xs p-3 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-primary-500 focus:border-primary-500 font-semibold"
                            />
                        </GlassCard>

                        {/* Internal Clinical Notes (Collapsible) */}
                        <GlassCard className="p-4 sm:p-5 space-y-3">
                            <button
                                type="button"
                                onClick={() => setShowNotes(!showNotes)}
                                className="w-full flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider text-left"
                            >
                                <span className="flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                                    <span>Clinical / Internal Notes (Doctor Only)</span>
                                </span>
                                {showNotes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            {showNotes && (
                                <textarea
                                    rows={3}
                                    value={clinicalNotes}
                                    onChange={(e) => setClinicalNotes(e.target.value)}
                                    disabled={isReadOnly}
                                    placeholder="Doctor internal observations, vitals (BP, PR, SpO2, Temp), examination findings (not printed on prescription slip)..."
                                    className="w-full text-xs p-3 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-primary-500 focus:border-primary-500"
                                />
                            )}
                        </GlassCard>

                        {/* Follow-up Date */}
                        <GlassCard className="p-4 sm:p-5 space-y-2">
                            <label className="block text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                                Follow-up / Review Date
                            </label>
                            {!isReadOnly && (
                                <div className="flex flex-wrap gap-1.5">
                                    {[
                                        { label: 'In 3 days', days: 3 },
                                        { label: 'In 5 days', days: 5 },
                                        { label: 'In 1 week', days: 7 },
                                        { label: 'In 2 weeks', days: 14 },
                                        { label: 'In 1 month', days: 30 },
                                    ].map((opt) => (
                                        <button
                                            key={opt.label}
                                            type="button"
                                            onClick={() => {
                                                const d = new Date();
                                                d.setDate(d.getDate() + opt.days);
                                                setFollowUpDate(d.toISOString().split('T')[0]);
                                            }}
                                            className="px-2 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <input
                                type="date"
                                value={followUpDate}
                                onChange={(e) => setFollowUpDate(e.target.value)}
                                disabled={isReadOnly}
                                className="w-full text-xs p-2.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                            />
                        </GlassCard>

                        {/* Post-Finalize Addendum Notes if any */}
                        {prescription.addendum_notes && (
                            <GlassCard className="p-4 sm:p-5 border-amber-200/60 dark:border-amber-900/40 bg-amber-50/20 space-y-2">
                                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Addendum Notes (Post-Finalization)</span>
                                </span>
                                <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {prescription.addendum_notes}
                                </p>
                            </GlassCard>
                        )}
                    </div>

                    {/* RIGHT COLUMN: Prescription Items Builder (7 cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        <GlassCard className="p-4 sm:p-5 space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-white/5 pb-3.5">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-primary-500/10 text-primary dark:text-primary-400 flex items-center justify-center border border-primary-500/20 shadow-xs">
                                            <Pill className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                                <span>Prescribed Medications</span>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/50">
                                                    {items.length}
                                                </span>
                                            </h3>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                <Sparkles className="w-3 h-3 text-secondary shrink-0" />
                                                <span>Quantity auto-computes from dose, frequency & days</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {!isReadOnly && (
                                    <div className="flex items-center gap-2 shrink-0">
                                        {/* Templates Dropdown */}
                                        {templates.length > 0 && (
                                            <div className="relative group">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/60 dark:border-white/10 transition-colors shadow-xs cursor-pointer"
                                                >
                                                    <BookmarkPlus className="w-3.5 h-3.5 text-primary" />
                                                    <span>Templates</span>
                                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                                </button>
                                                <div className="hidden group-hover:block absolute right-0 top-full mt-1.5 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 p-2 z-20 space-y-1 backdrop-blur-xl">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                                                        Load Preset Regimen
                                                    </div>
                                                    {templates.map((tpl) => (
                                                        <button
                                                            key={tpl.id}
                                                            type="button"
                                                            onClick={() => applyTemplate(tpl)}
                                                            className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-200 hover:bg-primary-50 dark:hover:bg-primary-950/60 hover:text-primary transition-colors flex items-center justify-between cursor-pointer"
                                                        >
                                                            <span className="font-semibold">{tpl.name}</span>
                                                            <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                                                                {tpl.items.length} meds
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {items.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => setShowSaveTemplateModal(true)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary-300 bg-slate-100/60 dark:bg-slate-800/60 hover:bg-primary-50 dark:hover:bg-primary-950/40 border border-slate-200/60 dark:border-white/10 transition-colors shadow-xs cursor-pointer"
                                                title="Save current medicines as template"
                                            >
                                                <BookmarkPlus className="w-3.5 h-3.5 text-secondary" />
                                                <span>Save Template</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Prescription Items List */}
                            <div className="space-y-4">
                                {items.length === 0 ? (
                                    <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-6 space-y-3 bg-slate-50/40 dark:bg-slate-900/40">
                                        <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/50 text-primary dark:text-primary-400 flex items-center justify-center mx-auto border border-primary-200/50 dark:border-primary-800/40 shadow-xs">
                                            <Pill className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                                No medications added yet
                                            </p>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                Search clinic pharmacy stock or write external prescriptions
                                            </p>
                                        </div>
                                        {!isReadOnly && (
                                            <button
                                                type="button"
                                                onClick={addItem}
                                                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary/20 transition-all cursor-pointer"
                                            >
                                                <Plus className="w-4 h-4" />
                                                <span>Add First Medicine</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    items.map((it, idx) => (
                                        <div
                                            key={idx}
                                            className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-slate-900/60 shadow-sm space-y-3.5 relative group hover:border-slate-300 dark:hover:border-white/20 transition-all"
                                        >
                                            {/* Top Row: Medicine Search / Name & Source */}
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                                <div className="flex-1 relative">
                                                    {!isReadOnly ? (
                                                        <div className="relative">
                                                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                                                                <Search className="w-4 h-4" />
                                                            </div>
                                                            <input
                                                                type="text"
                                                                value={it.display_name}
                                                                onChange={(e) => {
                                                                    updateItem(idx, 'display_name', e.target.value);
                                                                    searchMedicines(e.target.value, idx);
                                                                }}
                                                                onFocus={() => {
                                                                    if (it.display_name.length >= 2) {
                                                                        searchMedicines(it.display_name, idx);
                                                                    }
                                                                }}
                                                                placeholder="Search medicine brand or generic name..."
                                                                className="w-full text-xs font-semibold pl-10 pr-9 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs transition-all"
                                                            />
                                                            {isSearching && activeSearchIndex === idx && (
                                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                    <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                                                </div>
                                                            )}

                                                            {/* Search Results Dropdown */}
                                                            {activeSearchIndex === idx && searchResults.length > 0 && (
                                                                <div
                                                                    onMouseDown={(e) => e.preventDefault()}
                                                                    className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 max-h-64 overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-white/5 backdrop-blur-xl"
                                                                >
                                                                    {searchResults.map((res: any, rIdx: number) => {
                                                                        const inStock = (res.in_clinic_stock || res.in_stock) && ((res.current_stock > 0) || (res.total_quantity > 0));
                                                                        const stockCount = res.current_stock ?? res.total_quantity ?? 0;
                                                                        return (
                                                                            <button
                                                                                key={rIdx}
                                                                                type="button"
                                                                                onClick={() => selectMedicineResult(res, idx)}
                                                                                className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between gap-2.5 cursor-pointer"
                                                                            >
                                                                                <div className="min-w-0">
                                                                                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                                                                                        {res.brand_name ? `${res.brand_name} ` : ''}
                                                                                        {res.generic_name || res.display_name}{' '}
                                                                                        <span className="text-slate-400 font-normal">
                                                                                            {res.strength_text || res.strength_form || ''}
                                                                                        </span>
                                                                                    </span>
                                                                                    {res.brand_name && res.generic_name && (
                                                                                        <span className="text-[10px] text-slate-500 block mt-0.5 truncate">
                                                                                            Generic: {res.generic_name}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                <div className="text-right shrink-0">
                                                                                    <span
                                                                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                                                            inStock
                                                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-500/20'
                                                                                                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                                                        }`}
                                                                                    >
                                                                                        {inStock ? `${stockCount} in stock` : 'Out of Stock'}
                                                                                    </span>
                                                                                    {res.selling_price_cents > 0 && (
                                                                                        <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">
                                                                                            {formatLKR(res.selling_price_cents)}/ea
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-black text-slate-900 dark:text-white block py-1">
                                                            {it.display_name}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Source Badge / Selector & Remove button */}
                                                <div className="flex items-center gap-2 shrink-0">
                                                    {!isReadOnly ? (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                updateItem(
                                                                    idx,
                                                                    'source',
                                                                    it.source === 'clinic_stock' ? 'buy_outside' : 'clinic_stock'
                                                                )
                                                            }
                                                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                                                                it.source === 'clinic_stock'
                                                                    ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                                                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                                            }`}
                                                            title="Click to toggle between Clinic Stock and Buy Outside"
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full ${it.source === 'clinic_stock' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                            <span>{it.source === 'clinic_stock' ? 'Clinic Pharmacy' : 'Buy Outside'}</span>
                                                        </button>
                                                    ) : (
                                                        <span
                                                            className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                                                                it.source === 'clinic_stock'
                                                                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                                                    : 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                                            }`}
                                                        >
                                                            <span className={`w-1.5 h-1.5 rounded-full ${it.source === 'clinic_stock' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                                            <span>{it.source === 'clinic_stock' ? 'Clinic Pharmacy' : 'Buy Outside'}</span>
                                                        </span>
                                                    )}

                                                    {!isReadOnly && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeItem(idx)}
                                                            className="p-2 rounded-xl text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 transition-colors cursor-pointer"
                                                            title="Remove medicine"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Middle Row: Dose, Frequency, Timing, Days, Qty */}
                                            <div className="grid grid-cols-2 sm:grid-cols-12 gap-2.5 text-xs">
                                                {/* Dose: 2 cols */}
                                                <div className="col-span-1 sm:col-span-2">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                                                        Dose
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={it.dose}
                                                        onChange={(e) => updateItem(idx, 'dose', e.target.value)}
                                                        disabled={isReadOnly}
                                                        placeholder="1 tab"
                                                        className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs transition-all"
                                                    />
                                                </div>

                                                {/* Frequency: 3 cols */}
                                                <div className="col-span-1 sm:col-span-3">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block truncate">
                                                        Frequency
                                                    </label>
                                                    <select
                                                        value={it.frequency}
                                                        onChange={(e) => updateItem(idx, 'frequency', e.target.value)}
                                                        disabled={isReadOnly}
                                                        className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs transition-all cursor-pointer"
                                                    >
                                                        {FREQUENCY_OPTIONS.map((fo) => (
                                                            <option key={fo.value} value={fo.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                                                {fo.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Timing: 3 cols */}
                                                <div className="col-span-1 sm:col-span-3">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block truncate">
                                                        Timing
                                                    </label>
                                                    <select
                                                        value={it.timing}
                                                        onChange={(e) => updateItem(idx, 'timing', e.target.value)}
                                                        disabled={isReadOnly}
                                                        className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs transition-all cursor-pointer"
                                                    >
                                                        {TIMING_OPTIONS.map((to) => (
                                                            <option key={to.value} value={to.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                                                                {to.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Duration: 2 cols */}
                                                <div className="col-span-1 sm:col-span-2">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 block">
                                                        Days
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={365}
                                                        value={it.duration_days}
                                                        onChange={(e) => updateItem(idx, 'duration_days', e.target.value)}
                                                        disabled={isReadOnly}
                                                        className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs transition-all"
                                                    />
                                                </div>

                                                {/* Qty Units: 2 cols */}
                                                <div className="col-span-2 sm:col-span-2">
                                                    <label className="text-[10px] font-bold uppercase tracking-wider text-primary dark:text-primary-400 mb-1.5 block truncate">
                                                        Total Qty
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        value={it.quantity}
                                                        onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                                                        disabled={isReadOnly}
                                                        className="w-full text-xs font-extrabold px-3 py-2 rounded-xl border border-primary/40 dark:border-primary/50 bg-primary-50/70 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary shadow-xs transition-all"
                                                    />
                                                </div>
                                            </div>

                                            {/* Bottom Row: Instructions */}
                                            <div className="relative">
                                                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                                                    <FileText className="w-3.5 h-3.5" />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={it.instructions || ''}
                                                    onChange={(e) => updateItem(idx, 'instructions', e.target.value)}
                                                    disabled={isReadOnly}
                                                    placeholder="Special directions (e.g. Drink full glass of water, apply before sleeping)..."
                                                    className="w-full text-xs pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-xs transition-all"
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {!isReadOnly && (
                                <button
                                    type="button"
                                    onClick={addItem}
                                    className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-primary dark:hover:border-primary/60 hover:bg-primary-50/40 dark:hover:bg-primary-950/20 text-slate-600 hover:text-primary dark:text-slate-400 dark:hover:text-primary-300 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs group"
                                >
                                    <Plus className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                                    <span>Add Another Medicine</span>
                                </button>
                            )}
                        </GlassCard>
                    </div>
                </div>

                {/* BOTTOM STICKY ACTION BAR */}
                <div className="fixed bottom-0 left-0 right-0 z-40 p-4 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-t border-slate-200/80 dark:border-white/10 shadow-2xl">
                    <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                Rx #{prescription.prescription_number}
                            </span>
                            <span className="text-[11px] text-slate-500">
                                • Mode:{' '}
                                {prescription.stock_reduction_mode === 'consultation'
                                    ? 'Instant Doctor Dispense'
                                    : 'Two-step Pharmacy Dispense'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            {!isReadOnly ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={saveDraft}
                                        disabled={isSubmitting}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 transition-all disabled:opacity-50"
                                    >
                                        <Save className="w-3.5 h-3.5 inline mr-1 text-slate-500" />
                                        <span>Save Draft</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={finalizeConsultation}
                                        disabled={isSubmitting}
                                        className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-lg shadow-primary/25 transition-all disabled:opacity-50 hover:-translate-y-0.5"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>{isSubmitting ? 'Finalizing...' : 'Finalize Consultation & Rx'}</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    {prescription.is_finalized && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAddendumModal(true)}
                                            className="px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 hover:bg-indigo-100"
                                        >
                                            <FileText className="w-3.5 h-3.5 inline mr-1 text-indigo-500" />
                                            <span>Add Addendum Note</span>
                                        </button>
                                    )}

                                    {prescription.is_finalized && settings.prescription_print_enabled && (
                                        <a
                                            href={`/doctor/prescriptions/${prescription.id}/print`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md"
                                        >
                                            <Printer className="w-4 h-4" />
                                            <span>Print Prescription</span>
                                        </a>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* PATIENT HISTORY SLIDE-OVER DRAWER */}
                {showHistoryDrawer && (
                    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
                        <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-white/10">
                            {/* Drawer Header */}
                            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <History className="w-4 h-4 text-indigo-500" />
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Patient Visit History
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowHistoryDrawer(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {patientHistory.length === 0 ? (
                                    <div className="py-12 text-center text-xs text-slate-400">
                                        No previous recorded visits for this patient at this clinic.
                                    </div>
                                ) : (
                                    patientHistory.map((hist) => (
                                        <div
                                            key={hist.id}
                                            className="p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-slate-850/40 space-y-2.5"
                                        >
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-bold text-slate-900 dark:text-white">
                                                    {hist.date}
                                                </span>
                                                <span className="text-[11px] text-slate-500">{hist.doctor_name}</span>
                                            </div>

                                            {hist.chief_complaint && (
                                                <div className="text-[11px]">
                                                    <span className="font-bold text-slate-500">Complaint: </span>
                                                    <span className="text-slate-800 dark:text-slate-200">
                                                        {hist.chief_complaint}
                                                    </span>
                                                </div>
                                            )}

                                            {hist.diagnosis && (
                                                <div className="text-[11px]">
                                                    <span className="font-bold text-slate-500">Diagnosis: </span>
                                                    <span className="text-primary font-semibold">{hist.diagnosis}</span>
                                                </div>
                                            )}

                                            {/* Meds list */}
                                            <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 space-y-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block">
                                                    Prescribed Medicines
                                                </span>
                                                {hist.items.map((m) => (
                                                    <div
                                                        key={m.id}
                                                        className="text-[11px] flex items-center justify-between text-slate-700 dark:text-slate-300"
                                                    >
                                                        <span>• {m.display_name}</span>
                                                        <span className="text-slate-400 font-mono">
                                                            {m.dose} ({m.frequency}) × {m.duration_days}d
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ADDENDUM MODAL */}
                {showAddendumModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6 max-w-md w-full shadow-2xl space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-500" />
                                <span>Add Addendum Note</span>
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                Add supplemental clinical notes after consultation finalization. Medicine items cannot be modified via addendum.
                            </p>
                            <form onSubmit={submitAddendum} className="space-y-4">
                                <textarea
                                    rows={4}
                                    value={addendumText}
                                    onChange={(e) => setAddendumText(e.target.value)}
                                    placeholder="Enter addendum notes (e.g. Lab results verified, follow-up call received)..."
                                    className="w-full text-xs p-3 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    required
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddendumModal(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Append Addendum'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* SAVE TEMPLATE MODAL */}
                {showSaveTemplateModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6 max-w-md w-full shadow-2xl space-y-4">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <BookmarkPlus className="w-4 h-4 text-primary" />
                                <span>Save As Prescription Template</span>
                            </h3>
                            <form onSubmit={saveAsTemplate} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Template Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                        placeholder="e.g. Adult URI Regimen, Hypertension Standard"
                                        className="w-full text-xs p-2.5 rounded-xl border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                        required
                                    />
                                </div>

                                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={newTemplateShared}
                                        onChange={(e) => setNewTemplateShared(e.target.checked)}
                                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                    />
                                    <span>Share with all doctors in this clinic</span>
                                </label>

                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowSaveTemplateModal(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                                    >
                                        {isSubmitting ? 'Saving...' : 'Save Template'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
