import React, { useState } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { GlassModal } from '@/Components/UI/GlassModal';
import GlassSelect from '@/Components/UI/GlassSelect';
import {
    DollarSign,
    Sparkles,
    Settings,
    Layers,
    Check,
    Plus,
    Edit2,
    Trash2,
    AlertCircle,
    Info,
    Receipt,
    Wallet,
    Percent,
    Shield,
    Sliders,
    ArrowRight,
    HelpCircle,
    Building2,
    Users,
} from 'lucide-react';

interface FeeComponentData {
    id: number;
    name: string;
    code: string | null;
    amount_type: 'fixed' | 'percent_component' | 'percent_subtotal';
    target_component_id: number | null;
    target_component_name?: string | null;
    amount_value: number;
    amount_display: string;
    amount_lkr: number;
    recipient: 'doctor' | 'clinic' | 'third_party';
    recipient_name: string | null;
    applies_to: string[];
    is_mandatory: boolean;
    is_separate_line: boolean;
    is_active: boolean;
    sort_order: number;
}

interface VisitTypeData {
    id: number;
    name: string;
    code: string | null;
    pricing_type: 'percentage' | 'fixed';
    percentage_value: number;
    fixed_fee_cents: number;
    fixed_fee_lkr: number;
    fixed_fee_formatted: string;
    is_default: boolean;
    is_active: boolean;
    allow_online: boolean;
    sort_order: number;
    payout_rule_override: any;
}

interface Props {
    settings: {
        pricing_mode: 'split' | 'single_price';
        default_doctor_fee_lkr: number;
        default_clinic_fee_lkr: number;
        default_total_fee_lkr: number;
        online_booking_fee_lkr: number;
        rounding_step: number;
        default_payout_rule: {
            type: 'full_doctor_fee' | 'fixed_per_patient' | 'percentage_of_total' | 'fixed_per_session' | 'salaried' | 'none';
            value: number;
            min_patients: number;
            pay_no_shows: boolean;
            pay_cancelled: boolean;
        };
        receptionist_can_discount: boolean;
        receptionist_max_discount_type: 'percent' | 'amount';
        receptionist_max_discount_value: number;
        show_clinic_share_to_doctors?: boolean;
        fee_setup_completed: boolean;
    };
    components: FeeComponentData[];
    visitTypes: VisitTypeData[];
}

export default function FeesAndPayouts({ settings, components, visitTypes }: Props) {
    const [activeSection, setActiveSection] = useState<'defaults' | 'components' | 'visit_types' | 'presets'>('defaults');
    const [isWizardOpen, setIsWizardOpen] = useState(!settings.fee_setup_completed);
    const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
    const [editingComponent, setEditingComponent] = useState<FeeComponentData | null>(null);
    const [isVisitTypeModalOpen, setIsVisitTypeModalOpen] = useState(false);
    const [editingVisitType, setEditingVisitType] = useState<VisitTypeData | null>(null);

    // Wizard states (3 questions)
    const [wizardQ1, setWizardQ1] = useState<'split' | 'single' | 'dispensary' | 'hospital'>('split');
    const [wizardQ2, setWizardQ2] = useState<'full' | 'fixed' | 'percent'>('full');
    const [wizardQ3, setWizardQ3] = useState<boolean>(false);

    // Defaults Form
    const defaultsForm = useForm({
        pricing_mode: settings.pricing_mode,
        default_doctor_fee_lkr: settings.default_doctor_fee_lkr,
        default_clinic_fee_lkr: settings.default_clinic_fee_lkr,
        default_total_fee_lkr: settings.default_total_fee_lkr,
        online_booking_fee_lkr: settings.online_booking_fee_lkr,
        rounding_step: settings.rounding_step,
        default_payout_rule: {
            type: settings.default_payout_rule.type,
            value: settings.default_payout_rule.type === 'percentage_of_total'
                ? settings.default_payout_rule.value
                : settings.default_payout_rule.value / 100,
            min_patients: settings.default_payout_rule.min_patients || 0,
            pay_no_shows: settings.default_payout_rule.pay_no_shows,
            pay_cancelled: settings.default_payout_rule.pay_cancelled,
        },
        receptionist_can_discount: settings.receptionist_can_discount,
        receptionist_max_discount_type: settings.receptionist_max_discount_type,
        receptionist_max_discount_value: settings.receptionist_max_discount_type === 'amount'
            ? settings.receptionist_max_discount_value / 100
            : settings.receptionist_max_discount_value,
        show_clinic_share_to_doctors: settings.show_clinic_share_to_doctors ?? false,
    });

    // Component Form
    const componentForm = useForm({
        name: '',
        amount_type: 'fixed' as 'fixed' | 'percent_component' | 'percent_subtotal',
        target_component_id: '' as string | number,
        amount_lkr: 1000,
        amount_percent: 10,
        recipient: 'clinic' as 'doctor' | 'clinic' | 'third_party',
        recipient_name: '',
        applies_to: ['walk_in', 'phone', 'online'],
        is_mandatory: true,
        is_separate_line: true,
        is_active: true,
        sort_order: 1,
    });

    // Visit Type Form
    const visitTypeForm = useForm({
        name: '',
        pricing_type: 'percentage' as 'percentage' | 'fixed',
        percentage_value: 100,
        fixed_fee_lkr: 1500,
        is_default: false,
        is_active: true,
        allow_online: true,
        sort_order: 1,
    });

    const handleDefaultsSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        defaultsForm.put('/settings/fees/defaults', {
            preserveScroll: true,
        });
    };

    const handleApplyPreset = (presetKey: string) => {
        if (confirm(`Apply the '${presetKey}' fee structure preset? This will configure standard fee components and defaults.`)) {
            router.post('/settings/fees/preset', { preset: presetKey }, {
                preserveScroll: true,
            });
        }
    };

    const handleApplyWizard = () => {
        let presetKey = 'split';
        if (wizardQ1 === 'single') presetKey = 'single_price';
        if (wizardQ1 === 'dispensary') presetKey = 'dispensary';
        if (wizardQ1 === 'hospital') presetKey = 'hospital_opd';

        router.post('/settings/fees/preset', { preset: presetKey }, {
            onSuccess: () => {
                if (wizardQ3) {
                    router.put('/settings/fees/defaults', {
                        ...defaultsForm.data,
                        online_booking_fee_lkr: 200,
                    });
                }
                setIsWizardOpen(false);
            },
        });
    };

    const openCreateComponent = () => {
        setEditingComponent(null);
        componentForm.clearErrors();
        componentForm.reset();
        componentForm.setData({
            name: '',
            amount_type: 'fixed',
            target_component_id: '',
            amount_lkr: 1000,
            amount_percent: 10,
            recipient: 'clinic',
            recipient_name: '',
            applies_to: ['walk_in', 'phone', 'online'],
            is_mandatory: true,
            is_separate_line: true,
            is_active: true,
            sort_order: components.length + 1,
        });
        setIsComponentModalOpen(true);
    };

    const openEditComponent = (c: FeeComponentData) => {
        setEditingComponent(c);
        componentForm.clearErrors();
        componentForm.setData({
            name: c.name,
            amount_type: c.amount_type,
            target_component_id: c.target_component_id || '',
            amount_lkr: c.amount_type === 'fixed' ? c.amount_lkr : 1000,
            amount_percent: c.amount_type !== 'fixed' ? c.amount_value : 10,
            recipient: c.recipient,
            recipient_name: c.recipient_name || '',
            applies_to: c.applies_to || ['walk_in', 'phone', 'online'],
            is_mandatory: c.is_mandatory,
            is_separate_line: c.is_separate_line,
            is_active: c.is_active,
            sort_order: c.sort_order,
        });
        setIsComponentModalOpen(true);
    };

    const handleComponentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        componentForm.transform((data) => ({
            ...data,
            target_component_id: data.amount_type === 'percent_component' ? data.target_component_id : '',
            amount_percent: data.amount_type === 'fixed' ? 0 : data.amount_percent,
        }));

        if (editingComponent) {
            componentForm.put(`/settings/fees/components/${editingComponent.id}`, {
                onSuccess: () => {
                    setIsComponentModalOpen(false);
                    componentForm.reset();
                },
            });
        } else {
            componentForm.post('/settings/fees/components', {
                onSuccess: () => {
                    setIsComponentModalOpen(false);
                    componentForm.reset();
                },
            });
        }
    };

    const handleDeleteComponent = (c: FeeComponentData) => {
        if (confirm(`Delete fee component '${c.name}'?`)) {
            router.delete(`/settings/fees/components/${c.id}`);
        }
    };

    const openCreateVisitType = () => {
        setEditingVisitType(null);
        visitTypeForm.clearErrors();
        visitTypeForm.reset();
        visitTypeForm.setData({
            name: '',
            pricing_type: 'percentage',
            percentage_value: 100,
            fixed_fee_lkr: 1500,
            is_default: false,
            is_active: true,
            allow_online: true,
            sort_order: visitTypes.length + 1,
        });
        setIsVisitTypeModalOpen(true);
    };

    const openEditVisitType = (v: VisitTypeData) => {
        setEditingVisitType(v);
        visitTypeForm.clearErrors();
        visitTypeForm.setData({
            name: v.name,
            pricing_type: v.pricing_type,
            percentage_value: v.pricing_type === 'percentage' ? v.percentage_value : 100,
            fixed_fee_lkr: v.pricing_type === 'fixed' ? v.fixed_fee_lkr : 1500,
            is_default: v.is_default,
            is_active: v.is_active,
            allow_online: v.allow_online,
            sort_order: v.sort_order,
        });
        setIsVisitTypeModalOpen(true);
    };

    const handleVisitTypeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        visitTypeForm.transform((data) => ({
            ...data,
            percentage_value: data.pricing_type === 'percentage' ? data.percentage_value : 0,
            fixed_fee_lkr: data.pricing_type === 'fixed' ? data.fixed_fee_lkr : 0,
        }));

        if (editingVisitType) {
            visitTypeForm.put(`/settings/fees/visit-types/${editingVisitType.id}`, {
                onSuccess: () => {
                    setIsVisitTypeModalOpen(false);
                    visitTypeForm.reset();
                },
            });
        } else {
            visitTypeForm.post('/settings/fees/visit-types', {
                onSuccess: () => {
                    setIsVisitTypeModalOpen(false);
                    visitTypeForm.reset();
                },
            });
        }
    };

    const handleDeleteVisitType = (v: VisitTypeData) => {
        if (confirm(`Delete visit type '${v.name}'?`)) {
            router.delete(`/settings/fees/visit-types/${v.id}`);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Fees & Doctor Payouts - Settings" />

            <div className="space-y-6">
                <PageHeader
                    title="Fees & Doctor Payouts"
                    subtitle="Configure pricing models, customizable fee components, visit types, doctor payout calculations and rounding rules"
                    actions={
                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={() => setIsWizardOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors shadow-sm"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Setup Wizard</span>
                            </button>
                        </div>
                    }
                />

                {/* Sub-Navigation Tabs */}
                <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 pb-2">
                    <button
                        type="button"
                        onClick={() => setActiveSection('defaults')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeSection === 'defaults'
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                        Clinic Defaults & Policy
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('components')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeSection === 'components'
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                        Fee Components ({components.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('visit_types')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeSection === 'visit_types'
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                        Visit Types ({visitTypes.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('presets')}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeSection === 'presets'
                                ? 'bg-primary text-white shadow-md shadow-primary/20'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                        }`}
                    >
                        One-Click Presets
                    </button>
                </div>

                {/* SECTION 1: CLINIC DEFAULTS & POLICIES */}
                {activeSection === 'defaults' && (
                    <form onSubmit={handleDefaultsSubmit} className="space-y-6">
                        <GlassCard className="p-6 space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Sliders className="w-4 h-4 text-primary" />
                                    Pricing Mode & Hierarchy Defaults
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Determines how patient charges are presented and calculated. Doctor or session overrides will supersede these defaults.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <label
                                    className={`relative flex flex-col p-4 rounded-2xl border cursor-pointer transition-all ${
                                        defaultsForm.data.pricing_mode === 'split'
                                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                            : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="pricing_mode"
                                        value="split"
                                        checked={defaultsForm.data.pricing_mode === 'split'}
                                        onChange={() => defaultsForm.setData('pricing_mode', 'split')}
                                        className="sr-only"
                                    />
                                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                                        Split Mode (Channeling Centre)
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                        Patient pays: Doctor Fee + Clinic/Channeling Fee. Doctor receives full doctor fee by default.
                                    </span>
                                </label>

                                <label
                                    className={`relative flex flex-col p-4 rounded-2xl border cursor-pointer transition-all ${
                                        defaultsForm.data.pricing_mode === 'single_price'
                                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                                            : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="pricing_mode"
                                        value="single_price"
                                        checked={defaultsForm.data.pricing_mode === 'single_price'}
                                        onChange={() => defaultsForm.setData('pricing_mode', 'single_price')}
                                        className="sr-only"
                                    />
                                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                                        Single Total Price Mode
                                    </span>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                        Patient pays one combined consultation charge. Doctor is paid according to the configured payout rule (percentage, fixed, or salaried).
                                    </span>
                                </label>
                            </div>

                            {/* Default Amounts */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                                {defaultsForm.data.pricing_mode === 'split' ? (
                                    <>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Default Doctor Fee (LKR)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="50"
                                                value={defaultsForm.data.default_doctor_fee_lkr}
                                                onChange={(e) => defaultsForm.setData('default_doctor_fee_lkr', parseFloat(e.target.value) || 0)}
                                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Default Clinic Fee (LKR)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="50"
                                                value={defaultsForm.data.default_clinic_fee_lkr}
                                                onChange={(e) => defaultsForm.setData('default_clinic_fee_lkr', parseFloat(e.target.value) || 0)}
                                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                    </>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Default Total Fee (LKR)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="50"
                                            value={defaultsForm.data.default_total_fee_lkr}
                                            onChange={(e) => defaultsForm.setData('default_total_fee_lkr', parseFloat(e.target.value) || 0)}
                                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Online Booking Fee (LKR)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        step="10"
                                        value={defaultsForm.data.online_booking_fee_lkr}
                                        onChange={(e) => defaultsForm.setData('online_booking_fee_lkr', parseFloat(e.target.value) || 0)}
                                        className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary"
                                    />
                                    <span className="text-[10px] text-slate-400">Added only for appointments booked via online portal</span>
                                </div>
                            </div>

                            {/* Rounding Policy */}
                            <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Cash Total Rounding (Sri Lankan Standard)
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                        { val: 0, label: 'No Rounding (Exact cents)' },
                                        { val: 10, label: 'Nearest Rs. 10' },
                                        { val: 50, label: 'Nearest Rs. 50' },
                                        { val: 100, label: 'Nearest Rs. 100' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.val}
                                            type="button"
                                            onClick={() => defaultsForm.setData('rounding_step', opt.val)}
                                            className={`p-2.5 rounded-xl text-xs font-bold border text-center transition-all ${
                                                defaultsForm.data.rounding_step === opt.val
                                                    ? 'border-primary bg-primary text-white shadow-sm'
                                                    : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                                            }`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </GlassCard>

                        {/* DOCTOR PAYOUT DEFAULT POLICY */}
                        <GlassCard className="p-6 space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Wallet className="w-4 h-4 text-emerald-600" />
                                    Default Doctor Payout Policy
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Defines how doctors are compensated by default unless individually overridden in the doctor edit modal.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[
                                    { id: 'full_doctor_fee', title: 'Full Doctor Fee', desc: '100% of doctor portion pass-through' },
                                    { id: 'percentage_of_total', title: 'Percentage of Patient Total', desc: 'e.g. 60% of gross total collected' },
                                    { id: 'fixed_per_patient', title: 'Fixed Amount Per Patient', desc: 'Flat LKR amount per consultation' },
                                    { id: 'fixed_per_session', title: 'Fixed Amount Per Session', desc: 'Lump-sum per session regardless of patient count' },
                                    { id: 'salaried', title: 'Salaried / No Per-Session Fee', desc: 'Doctor is on a fixed clinic payroll' },
                                ].map((rule) => (
                                    <button
                                        key={rule.id}
                                        type="button"
                                        onClick={() => {
                                            defaultsForm.setData('default_payout_rule', {
                                                ...defaultsForm.data.default_payout_rule,
                                                type: rule.id as any,
                                            });
                                        }}
                                        className={`p-3 rounded-2xl border text-left transition-all ${
                                            defaultsForm.data.default_payout_rule.type === rule.id
                                                ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                                                : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                                        }`}
                                    >
                                        <div className="font-bold text-xs text-slate-900 dark:text-white">{rule.title}</div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{rule.desc}</div>
                                    </button>
                                ))}
                            </div>

                            {/* Payout Rule Inputs */}
                            {defaultsForm.data.default_payout_rule.type === 'percentage_of_total' && (
                                <div className="max-w-xs">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Doctor Share Percentage (%)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={defaultsForm.data.default_payout_rule.value}
                                            onChange={(e) => {
                                                defaultsForm.setData('default_payout_rule', {
                                                    ...defaultsForm.data.default_payout_rule,
                                                    value: parseFloat(e.target.value) || 0,
                                                });
                                            }}
                                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                                        />
                                        <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">%</span>
                                    </div>
                                </div>
                            )}

                            {(defaultsForm.data.default_payout_rule.type === 'fixed_per_patient' ||
                                defaultsForm.data.default_payout_rule.type === 'fixed_per_session') && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Payout Amount (LKR)
                                        </label>
                                        <input
                                            type="number"
                                            min="0"
                                            step="50"
                                            value={defaultsForm.data.default_payout_rule.value}
                                            onChange={(e) => {
                                                defaultsForm.setData('default_payout_rule', {
                                                    ...defaultsForm.data.default_payout_rule,
                                                    value: parseFloat(e.target.value) || 0,
                                                });
                                            }}
                                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                                        />
                                    </div>
                                    {defaultsForm.data.default_payout_rule.type === 'fixed_per_session' && (
                                        <div>
                                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                                Minimum Patients Required
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={defaultsForm.data.default_payout_rule.min_patients}
                                                onChange={(e) => {
                                                    defaultsForm.setData('default_payout_rule', {
                                                        ...defaultsForm.data.default_payout_rule,
                                                        min_patients: parseInt(e.target.value) || 0,
                                                    });
                                                }}
                                                placeholder="0 for unconditional"
                                                className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* No-Shows and Cancellation Compensation */}
                            <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex flex-wrap gap-6">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={defaultsForm.data.default_payout_rule.pay_no_shows}
                                        onChange={(e) => {
                                            defaultsForm.setData('default_payout_rule', {
                                                ...defaultsForm.data.default_payout_rule,
                                                pay_no_shows: e.target.checked,
                                            });
                                        }}
                                        className="rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    <span>Pay Doctor for Patient No-Shows</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={defaultsForm.data.default_payout_rule.pay_cancelled}
                                        onChange={(e) => {
                                            defaultsForm.setData('default_payout_rule', {
                                                ...defaultsForm.data.default_payout_rule,
                                                pay_cancelled: e.target.checked,
                                            });
                                        }}
                                        className="rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    <span>Pay Doctor for Late Cancelled Tokens</span>
                                </label>
                            </div>
                        </GlassCard>

                        {/* RECEPTIONIST DISCOUNT LIMITS */}
                        <GlassCard className="p-6 space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-primary" />
                                    Receptionist Manual Discount & Waiver Limits
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Clinic Administrators have unlimited discount authority. Set threshold limits for receptionists at token issue.
                                </p>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                    <input
                                        type="checkbox"
                                        checked={defaultsForm.data.receptionist_can_discount}
                                        onChange={(e) => defaultsForm.setData('receptionist_can_discount', e.target.checked)}
                                        className="rounded border-slate-300 text-primary focus:ring-primary"
                                    />
                                    <span>Allow Receptionists to Apply Discounts & Waivers</span>
                                </label>
                            </div>

                            {defaultsForm.data.receptionist_can_discount && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg pt-2">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Limit Type
                                        </label>
                                        <GlassSelect
                                            value={defaultsForm.data.receptionist_max_discount_type}
                                            onChange={(e) => defaultsForm.setData('receptionist_max_discount_type', e.target.value as any)}
                                            options={[
                                                { value: 'percent', label: 'Maximum Percentage (%)' },
                                                { value: 'amount', label: 'Maximum Amount (LKR)' },
                                            ]}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Maximum Value ({defaultsForm.data.receptionist_max_discount_type === 'percent' ? '%' : 'LKR'})
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max={defaultsForm.data.receptionist_max_discount_type === 'percent' ? 100 : 100000}
                                            value={defaultsForm.data.receptionist_max_discount_value}
                                            onChange={(e) => defaultsForm.setData('receptionist_max_discount_value', parseFloat(e.target.value) || 0)}
                                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                                        />
                                    </div>
                                </div>
                            )}
                        </GlassCard>

                        {/* DOCTOR VISIBILITY & TRANSPARENCY */}
                        <GlassCard className="p-6 space-y-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary" />
                                    Doctor Portal Transparency
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Control whether doctors can see clinic fees, clinic gross earnings, and clinic margins in their Doctor Payouts hub and slips.
                                </p>
                            </div>

                            <label className="flex items-start gap-3 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={defaultsForm.data.show_clinic_share_to_doctors}
                                    onChange={(e) => defaultsForm.setData('show_clinic_share_to_doctors', e.target.checked)}
                                    className="mt-0.5 rounded border-slate-300 text-primary focus:ring-primary w-4 h-4"
                                />
                                <div>
                                    <span className="font-bold">Show clinic share to doctors</span>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                                        Default is off. When disabled, doctors only see their doctor payout amount, patient counts, paid status, and slips without clinic margins or collection splits.
                                    </p>
                                </div>
                            </label>
                        </GlassCard>

                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={defaultsForm.processing}
                                className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md transition-all"
                            >
                                {defaultsForm.processing ? 'Saving...' : 'Save Defaults & Policies'}
                            </button>
                        </div>
                    </form>
                )}

                {/* SECTION 2: FEE COMPONENTS */}
                {activeSection === 'components' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Active Fee Components
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Components make up the patient receipt. Each component tracks its recipient for automated doctor payouts and lab collections.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={openCreateComponent}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Fee Component</span>
                            </button>
                        </div>

                        <div className="overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/60 backdrop-blur-xl">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50/70 dark:bg-white/5 border-b border-slate-200/70 dark:border-white/10 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="py-3 px-4">Component Name</th>
                                        <th className="py-3 px-4">Type & Amount</th>
                                        <th className="py-3 px-4">Recipient</th>
                                        <th className="py-3 px-4">Applies To</th>
                                        <th className="py-3 px-4">Properties</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {components.map((comp) => (
                                        <tr key={comp.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="py-3 px-4">
                                                <span className="font-bold text-slate-900 dark:text-white block">
                                                    {comp.name}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                    {comp.code}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="font-semibold text-slate-900 dark:text-white block">
                                                    {comp.amount_display}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {comp.amount_type === 'fixed' && 'Fixed amount'}
                                                    {comp.amount_type === 'percent_component' && `% of ${comp.target_component_name || 'Component'}`}
                                                    {comp.amount_type === 'percent_subtotal' && '% of subtotal'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    comp.recipient === 'doctor'
                                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                        : comp.recipient === 'third_party'
                                                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300'
                                                        : 'bg-primary-50 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300'
                                                }`}>
                                                    {comp.recipient === 'doctor' && 'Doctor'}
                                                    {comp.recipient === 'clinic' && 'Clinic'}
                                                    {comp.recipient === 'third_party' && (comp.recipient_name || 'Third Party')}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4">
                                                <span className="text-[11px] text-slate-600 dark:text-slate-300">
                                                    {comp.applies_to.join(', ')}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 space-x-1.5">
                                                {comp.is_mandatory ? (
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-medium">
                                                        Mandatory
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 font-bold">
                                                        Optional (ticked at issue)
                                                    </span>
                                                )}
                                                {comp.is_separate_line && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-500">
                                                        Separate line
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right space-x-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditComponent(comp)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                                    title="Edit Component"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteComponent(comp)}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                                    title="Delete Component"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* SECTION 3: VISIT TYPES */}
                {activeSection === 'visit_types' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Channeling Visit Types
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Selectable by reception when issuing a token. Percentage visit types adjust the normal fee; fixed visit types replace it.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={openCreateVisitType}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Visit Type</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {visitTypes.map((vt) => (
                                <GlassCard key={vt.id} className="p-4 space-y-3 relative overflow-hidden">
                                    {vt.is_default && (
                                        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary text-white">
                                            Default
                                        </div>
                                    )}
                                    <div>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                            {vt.name}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            {vt.code}
                                        </span>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10">
                                        <div className="text-[10px] uppercase font-bold text-slate-400">
                                            Effective Pricing
                                        </div>
                                        <div className="text-sm font-bold text-primary mt-0.5">
                                            {vt.pricing_type === 'percentage'
                                                ? `${vt.percentage_value}% of regular fee`
                                                : vt.fixed_fee_formatted}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-500">
                                        <span>{vt.allow_online ? 'Available online' : 'Clinic desk only'}</span>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => openEditVisitType(vt)}
                                                className="p-1 rounded text-slate-400 hover:text-primary"
                                            >
                                                <Edit2 className="w-3.5 h-3.5" />
                                            </button>
                                            {!vt.is_default && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteVisitType(vt)}
                                                    className="p-1 rounded text-slate-400 hover:text-rose-600"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    </div>
                )}

                {/* SECTION 4: ONE-CLICK PRESETS */}
                {activeSection === 'presets' && (
                    <div className="space-y-4">
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Sri Lankan Clinic Presets
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                One-click presets configure components, pricing mode, and doctor payout rules. You can edit every aspect afterwards.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {[
                                {
                                    key: 'split',
                                    title: 'Channeling Centre (Split Mode)',
                                    badge: 'Most Popular',
                                    desc: 'Doctor Fee (pass-through to doctor) + Channeling Fee (kept by clinic).',
                                    receipt: ['Doctor Fee: Rs. 2,000 (Doctor)', 'Channeling Fee: Rs. 800 (Clinic)'],
                                    split: 'Patient pays: Rs. 2,800 · Doctor: Rs. 2,000 · Clinic: Rs. 800',
                                },
                                {
                                    key: 'single_price',
                                    title: 'Single Price Clinic (Revenue Share)',
                                    badge: 'Modern Care',
                                    desc: 'One total consultation fee to patient. Doctor receives configured % share (e.g. 60%).',
                                    receipt: ['Consultation Fee: Rs. 2,500 (Clinic)'],
                                    split: 'Patient pays: Rs. 2,500 · Doctor: Rs. 1,500 (60%) · Clinic: Rs. 1,000',
                                },
                                {
                                    key: 'dispensary',
                                    title: 'Dispensary (Consultation + Medicine)',
                                    badge: 'GP & Family',
                                    desc: 'Consultation fee with optional medicine charge selected at reception desk.',
                                    receipt: ['Consultation Fee: Rs. 1,500', 'Medicine: Rs. 1,000 (Optional)'],
                                    split: 'Patient pays: Rs. 2,500 · Doctor: Rs. 800 fixed · Clinic: Rs. 1,700',
                                },
                                {
                                    key: 'hospital_opd',
                                    title: 'Hospital OPD Style (Multi-Charge)',
                                    badge: 'Hospital',
                                    desc: 'Doctor fee + Hospital charge + 10% Service Charge calculated on subtotal.',
                                    receipt: ['Doctor Fee: Rs. 2,000', 'Hospital Charge: Rs. 1,000', 'Service Charge (10%): Rs. 300'],
                                    split: 'Patient pays: Rs. 3,300 · Doctor: Rs. 2,000 · Clinic: Rs. 1,300',
                                },
                            ].map((preset) => (
                                <GlassCard key={preset.key} className="p-5 space-y-4 border hover:border-primary/50 transition-all flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                                                {preset.title}
                                            </span>
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                                                {preset.badge}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            {preset.desc}
                                        </p>

                                        {/* Sample Receipt */}
                                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 text-[11px] space-y-1 font-mono">
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans mb-1">
                                                Receipt Breakdown Preview
                                            </div>
                                            {preset.receipt.map((r, i) => (
                                                <div key={i} className="text-slate-700 dark:text-slate-300">
                                                    • {r}
                                                </div>
                                            ))}
                                            <div className="pt-2 text-[10px] font-bold font-sans text-emerald-600 dark:text-emerald-400">
                                                {preset.split}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleApplyPreset(preset.key)}
                                        className="w-full py-2 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-black dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 transition-colors shadow-sm"
                                    >
                                        Apply This Preset
                                    </button>
                                </GlassCard>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* SETUP WIZARD MODAL */}
            <GlassModal
                isOpen={isWizardOpen}
                onClose={() => setIsWizardOpen(false)}
                title="Fees & Payouts Setup Wizard"
                subtitle="Configure your clinic's billing model in 3 quick questions. You can customize everything later."
                maxWidth="max-w-xl"
            >
                <div className="space-y-5">
                    {/* Q1 */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-900 dark:text-white">
                            1. How do patients pay at your clinic?
                        </label>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            {[
                                { id: 'split', title: 'Doctor Fee + Clinic Fee', desc: 'Channeling centre model' },
                                { id: 'single', title: 'Single Consultation Price', desc: 'One flat fee' },
                                { id: 'dispensary', title: 'Fee + Optional Medicine', desc: 'Dispensary model' },
                                { id: 'hospital', title: 'Doctor + Hospital + Service %', desc: 'Private hospital' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setWizardQ1(opt.id as any)}
                                    className={`p-3 rounded-xl border text-left transition-all ${
                                        wizardQ1 === opt.id
                                            ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                                            : 'border-slate-200 dark:border-white/10 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="font-bold text-slate-900 dark:text-white text-xs">{opt.title}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Q2 */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-900 dark:text-white">
                            2. How do you pay your doctors?
                        </label>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            {[
                                { id: 'full', title: 'Full Doctor Fee', desc: 'Pass-through' },
                                { id: 'percent', title: 'Percentage Share', desc: 'e.g. 60%' },
                                { id: 'fixed', title: 'Fixed per Patient', desc: 'Flat rate' },
                            ].map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setWizardQ2(opt.id as any)}
                                    className={`p-2.5 rounded-xl border text-left transition-all ${
                                        wizardQ2 === opt.id
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                                            : 'border-slate-200 dark:border-white/10'
                                    }`}
                                >
                                    <div className="font-bold text-slate-900 dark:text-white text-xs">{opt.title}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">{opt.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Q3 */}
                    <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-900 dark:text-white">
                            3. Do you charge extra for online bookings?
                        </label>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                                <input
                                    type="radio"
                                    name="wizard_q3"
                                    checked={!wizardQ3}
                                    onChange={() => setWizardQ3(false)}
                                    className="text-primary focus:ring-primary"
                                />
                                <span>No extra online fee (Recommended)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                                <input
                                    type="radio"
                                    name="wizard_q3"
                                    checked={wizardQ3}
                                    onChange={() => setWizardQ3(true)}
                                    className="text-primary focus:ring-primary"
                                />
                                <span>Yes, charge Rs. 200 platform/online fee</span>
                            </label>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex justify-between items-center">
                        <button
                            type="button"
                            onClick={() => setIsWizardOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5"
                        >
                            Skip Wizard
                        </button>
                        <button
                            type="button"
                            onClick={handleApplyWizard}
                            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md transition-all"
                        >
                            <span>Apply Matching Configuration</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </GlassModal>

            {/* CREATE / EDIT COMPONENT MODAL */}
            <GlassModal
                isOpen={isComponentModalOpen}
                onClose={() => setIsComponentModalOpen(false)}
                title={editingComponent ? `Edit ${editingComponent.name}` : 'Create Fee Component'}
                subtitle="Configure charge type, recipient, and applicability"
                maxWidth="max-w-xl"
            >
                <form onSubmit={handleComponentSubmit} className="space-y-4">
                    {Object.keys(componentForm.errors).length > 0 && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs space-y-1">
                            {Object.entries(componentForm.errors).map(([field, err]) => (
                                <div key={field} className="flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>{err}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Component Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={componentForm.data.name}
                            onChange={(e) => componentForm.setData('name', e.target.value)}
                            placeholder="e.g. Doctor Fee, Channeling Fee, Lab Fee, Hospital Charge"
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                        />
                        {componentForm.errors.name && (
                            <p className="text-red-500 text-[11px] mt-1">{componentForm.errors.name}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Amount Type *
                            </label>
                            <GlassSelect
                                value={componentForm.data.amount_type}
                                onChange={(e) => componentForm.setData('amount_type', e.target.value as any)}
                                options={[
                                    { value: 'fixed', label: 'Fixed LKR Cents/Rupees' },
                                    { value: 'percent_component', label: '% of another component' },
                                    { value: 'percent_subtotal', label: '% of running subtotal' },
                                ]}
                            />
                            {componentForm.errors.amount_type && (
                                <p className="text-red-500 text-[11px] mt-1">{componentForm.errors.amount_type}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                {componentForm.data.amount_type === 'fixed' ? 'Amount (LKR) *' : 'Percentage (%) *'}
                            </label>
                            {componentForm.data.amount_type === 'fixed' ? (
                                <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    required
                                    value={componentForm.data.amount_lkr}
                                    onChange={(e) => componentForm.setData('amount_lkr', parseFloat(e.target.value) || 0)}
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                                />
                            ) : (
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    required
                                    value={componentForm.data.amount_percent}
                                    onChange={(e) => componentForm.setData('amount_percent', parseFloat(e.target.value) || 0)}
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                                />
                            )}
                            {componentForm.errors.amount_lkr && (
                                <p className="text-red-500 text-[11px] mt-1">{componentForm.errors.amount_lkr}</p>
                            )}
                            {componentForm.errors.amount_percent && (
                                <p className="text-red-500 text-[11px] mt-1">{componentForm.errors.amount_percent}</p>
                            )}
                        </div>
                    </div>

                    {componentForm.data.amount_type === 'percent_component' && (
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Target Component (Calculate % From) *
                            </label>
                            <GlassSelect
                                value={componentForm.data.target_component_id}
                                onChange={(e) => componentForm.setData('target_component_id', e.target.value)}
                                options={[
                                    { value: '', label: '-- Select Target Component --' },
                                    ...components
                                        .filter((c) => !editingComponent || c.id !== editingComponent.id)
                                        .map((c) => ({
                                            value: c.id,
                                            label: c.name,
                                        })),
                                ]}
                            />
                            {componentForm.errors.target_component_id && (
                                <p className="text-red-500 text-[11px] mt-1">{componentForm.errors.target_component_id}</p>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Recipient *
                            </label>
                            <GlassSelect
                                value={componentForm.data.recipient}
                                onChange={(e) => componentForm.setData('recipient', e.target.value as any)}
                                options={[
                                    { value: 'clinic', label: 'Clinic (Kept by facility)' },
                                    { value: 'doctor', label: 'Doctor (Credited in payout)' },
                                    { value: 'third_party', label: 'Third Party (e.g. Lab, Diagnostics)' },
                                ]}
                            />
                            {componentForm.errors.recipient && (
                                <p className="text-red-500 text-[11px] mt-1">{componentForm.errors.recipient}</p>
                            )}
                        </div>

                        {componentForm.data.recipient === 'third_party' && (
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Third Party Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={componentForm.data.recipient_name}
                                    onChange={(e) => componentForm.setData('recipient_name', e.target.value)}
                                    placeholder="e.g. Asiri Labs, MediScan"
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                                />
                                {componentForm.errors.recipient_name && (
                                    <p className="text-red-500 text-[11px] mt-1">{componentForm.errors.recipient_name}</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                                <input
                                    type="checkbox"
                                    checked={componentForm.data.is_mandatory}
                                    onChange={(e) => componentForm.setData('is_mandatory', e.target.checked)}
                                    className="rounded border-slate-300 text-primary"
                                />
                                <span>Mandatory on every token</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                                <input
                                    type="checkbox"
                                    checked={componentForm.data.is_separate_line}
                                    onChange={(e) => componentForm.setData('is_separate_line', e.target.checked)}
                                    className="rounded border-slate-300 text-primary"
                                />
                                <span>Itemize as separate line on receipt</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3">
                        <button
                            type="button"
                            onClick={() => setIsComponentModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={componentForm.processing}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                        >
                            {editingComponent ? 'Update Component' : 'Create Component'}
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* CREATE / EDIT VISIT TYPE MODAL */}
            <GlassModal
                isOpen={isVisitTypeModalOpen}
                onClose={() => setIsVisitTypeModalOpen(false)}
                title={editingVisitType ? `Edit ${editingVisitType.name}` : 'Create Visit Type'}
                subtitle="Define consult nature, pricing adjustments, and online booking rules"
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleVisitTypeSubmit} className="space-y-4">
                    {Object.keys(visitTypeForm.errors).length > 0 && (
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 dark:text-red-400 text-xs space-y-1">
                            {Object.entries(visitTypeForm.errors).map(([field, err]) => (
                                <div key={field} className="flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>{err}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Visit Type Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={visitTypeForm.data.name}
                            onChange={(e) => visitTypeForm.setData('name', e.target.value)}
                            placeholder="e.g. New consultation, Follow-up, Report checking, Minor procedure"
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                        />
                        {visitTypeForm.errors.name && (
                            <p className="text-red-500 text-[11px] mt-1">{visitTypeForm.errors.name}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Pricing Mechanism *
                            </label>
                            <GlassSelect
                                value={visitTypeForm.data.pricing_type}
                                onChange={(e) => visitTypeForm.setData('pricing_type', e.target.value as any)}
                                options={[
                                    { value: 'percentage', label: 'Percentage of Regular Fee' },
                                    { value: 'fixed', label: 'Fixed Consultation Price' },
                                ]}
                            />
                            {visitTypeForm.errors.pricing_type && (
                                <p className="text-red-500 text-[11px] mt-1">{visitTypeForm.errors.pricing_type}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                {visitTypeForm.data.pricing_type === 'percentage' ? 'Percentage (e.g. 100%, 50%) *' : 'Fixed Price (LKR) *'}
                            </label>
                            {visitTypeForm.data.pricing_type === 'percentage' ? (
                                <input
                                    type="number"
                                    min="0"
                                    max="500"
                                    required
                                    value={visitTypeForm.data.percentage_value}
                                    onChange={(e) => visitTypeForm.setData('percentage_value', parseInt(e.target.value) || 0)}
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                                />
                            ) : (
                                <input
                                    type="number"
                                    min="0"
                                    step="50"
                                    required
                                    value={visitTypeForm.data.fixed_fee_lkr}
                                    onChange={(e) => visitTypeForm.setData('fixed_fee_lkr', parseFloat(e.target.value) || 0)}
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 py-2 px-3 text-slate-800 dark:text-slate-200"
                                />
                            )}
                            {visitTypeForm.errors.percentage_value && (
                                <p className="text-red-500 text-[11px] mt-1">{visitTypeForm.errors.percentage_value}</p>
                            )}
                            {visitTypeForm.errors.fixed_fee_lkr && (
                                <p className="text-red-500 text-[11px] mt-1">{visitTypeForm.errors.fixed_fee_lkr}</p>
                            )}
                        </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                            <input
                                type="checkbox"
                                checked={visitTypeForm.data.is_default}
                                onChange={(e) => visitTypeForm.setData('is_default', e.target.checked)}
                                className="rounded border-slate-300 text-primary"
                            />
                            <span>Make this the default visit type for new tokens</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                            <input
                                type="checkbox"
                                checked={visitTypeForm.data.allow_online}
                                onChange={(e) => visitTypeForm.setData('allow_online', e.target.checked)}
                                className="rounded border-slate-300 text-primary"
                            />
                            <span>Allow patients to select this visit type online</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-3">
                        <button
                            type="button"
                            onClick={() => setIsVisitTypeModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={visitTypeForm.processing}
                            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm"
                        >
                            {editingVisitType ? 'Update Visit Type' : 'Create Visit Type'}
                        </button>
                    </div>
                </form>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
