import React, { useState, useEffect, useMemo, FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Building2,
    Globe,
    UserCheck,
    CheckCircle2,
    ArrowRight,
    ArrowLeft,
    Lock,
    Eye,
    EyeOff,
    Sparkles,
    ShieldCheck,
    Clock,
    MapPin,
    Phone,
    Mail,
    AlertCircle,
    Check,
    ExternalLink,
    Laptop,
} from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import AuthHeader from '@/Components/AuthHeader';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import {
    GlassLabel,
    GlassInput,
    GlassSelect,
    GlassCheckbox,
    GlassError,
} from '@/Components/UI/FormControls';
import { PhoneInput } from '@/Components/UI/PhoneInput';
import { useDebounce } from '@/Hooks/useDebounce';

interface Props {
    districts: string[];
    clinicTypes: string[];
    centralDomain: string;
}

interface SubdomainCheckResult {
    available: boolean;
    reason?: string;
    suggestions?: string[];
    url?: string;
}

export default function RegisterClinic({ districts, clinicTypes, centralDomain }: Props) {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [showPassword, setShowPassword] = useState(false);
    const [subdomainManuallyEdited, setSubdomainManuallyEdited] = useState(false);

    // Subdomain checking state
    const [checkingSubdomain, setCheckingSubdomain] = useState(false);
    const [subdomainResult, setSubdomainResult] = useState<SubdomainCheckResult | null>(null);

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        // Honeypot field
        honeypot: '',
        // Step 1: Clinic
        clinic_name: '',
        clinic_type: 'medical centre',
        district: 'Colombo',
        city: '',
        address: '',
        clinic_phone: '+94',
        // Step 2: Web Address
        subdomain: '',
        // Step 3: Admin User
        name: '',
        email: '',
        mobile: '+94',
        password: '',
        password_confirmation: '',
        terms: false as boolean,
    });

    // Auto-generate subdomain from clinic name until user manually types subdomain
    useEffect(() => {
        if (!subdomainManuallyEdited && data.clinic_name) {
            const slug = data.clinic_name
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '')
                .slice(0, 30);
            setData('subdomain', slug);
        }
    }, [data.clinic_name, subdomainManuallyEdited]);

    const debouncedSubdomain = useDebounce(data.subdomain, 400);

    // Live availability check
    useEffect(() => {
        if (!debouncedSubdomain || debouncedSubdomain.length < 3) {
            setSubdomainResult(null);
            setCheckingSubdomain(false);
            return;
        }

        let isMounted = true;
        setCheckingSubdomain(true);

        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

        fetch(route('subdomain.check'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken,
                Accept: 'application/json',
            },
            body: JSON.stringify({ subdomain: debouncedSubdomain }),
        })
            .then((res) => {
                if (!res.ok) {
                    throw new Error(`Status ${res.status}`);
                }
                return res.json();
            })
            .then((resData: SubdomainCheckResult) => {
                if (isMounted) {
                    setSubdomainResult(resData);
                    setCheckingSubdomain(false);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setCheckingSubdomain(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [debouncedSubdomain]);

    // Step validation helpers
    const canProceedStep1 = useMemo(() => {
        return (
            data.clinic_name.trim().length >= 2 &&
            data.city.trim().length >= 2 &&
            data.address.trim().length >= 3 &&
            data.clinic_phone.trim().length >= 9
        );
    }, [data.clinic_name, data.city, data.address, data.clinic_phone]);

    const canProceedStep2 = useMemo(() => {
        return (
            data.subdomain.length >= 3 &&
            data.subdomain.length <= 30 &&
            subdomainResult?.available === true
        );
    }, [data.subdomain, subdomainResult]);

    const canProceedStep3 = useMemo(() => {
        return (
            data.name.trim().length >= 2 &&
            data.email.includes('@') &&
            data.mobile.trim().length >= 9 &&
            data.password.length >= 8 &&
            data.password === data.password_confirmation &&
            data.terms === true
        );
    }, [data.name, data.email, data.mobile, data.password, data.password_confirmation, data.terms]);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('register'));
    };

    const displaySubdomain = data.subdomain ? data.subdomain.toLowerCase() : 'your-clinic';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative selection:bg-primary-100 selection:text-primary-800">
            {/* Subtle Ambient Background Glows */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute -top-32 left-1/4 w-[42rem] h-[32rem] rounded-full bg-primary-500/10 dark:bg-primary-500/15 blur-[120px]" />
                <div className="absolute top-1/3 -right-20 w-[36rem] h-[36rem] rounded-full bg-secondary-500/10 dark:bg-secondary-500/15 blur-[130px]" />
                <div className="absolute -bottom-24 left-1/3 w-[32rem] h-[32rem] rounded-full bg-primary-500/5 dark:bg-primary-500/10 blur-[100px]" />
            </div>

            {/* Redesigned Shared Header */}
            <AuthHeader
                subtitle="Create your clinic"
                step={step}
                totalSteps={4}
                stepLabel={
                    step === 1
                        ? 'Clinic details'
                        : step === 2
                        ? 'Web address'
                        : step === 3
                        ? 'Admin account'
                        : 'Review & launch'
                }
                rightAction="signin"
            />

            {/* Mobile Live URL Preview Header Strip */}
            <div className="lg:hidden px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between text-xs border-b border-slate-800">
                <div className="flex items-center gap-2 truncate">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="font-mono text-slate-300 truncate">
                        https://<span className="text-white font-bold">{displaySubdomain}</span>.medvisit.lk
                    </span>
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/30 text-primary-300">
                    Live Preview
                </span>
            </div>

            {/* Main Content: Split Desktop Layout (aligned to exact container) */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Multi-Step Wizard Form (~58% cols on desktop) */}
                <div className="lg:col-span-7 space-y-4">
                    {/* Step Form Container */}
                    <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xl dark:shadow-2xl">
                        {/* Clean 4-Step Indicator Inside Form Card */}
                        <div className="pb-6 mb-6 border-b border-slate-200/80 dark:border-white/10">
                            <div className="flex items-center justify-between">
                                {[
                                    { num: 1, label: 'Clinic', icon: Building2 },
                                    { num: 2, label: 'Web Address', icon: Globe },
                                    { num: 3, label: 'Admin Account', icon: UserCheck },
                                    { num: 4, label: 'Launch', icon: CheckCircle2 },
                                ].map((s, idx) => {
                                    const Icon = s.icon;
                                    const isCurrent = step === s.num;
                                    const isDone = step > s.num;
                                    return (
                                        <React.Fragment key={s.num}>
                                            <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (isDone) setStep(s.num as any);
                                                    }}
                                                    disabled={!isDone && !isCurrent}
                                                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 ${
                                                        isCurrent
                                                            ? 'bg-primary text-white shadow-lg shadow-primary/30 ring-4 ring-primary/20 scale-105'
                                                            : isDone
                                                            ? 'bg-secondary/15 text-secondary border border-secondary/40 hover:bg-secondary/25 cursor-pointer'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                                    }`}
                                                    aria-label={`Step ${s.num}: ${s.label}`}
                                                    title={`Step ${s.num}: ${s.label}`}
                                                >
                                                    {isDone ? (
                                                        <Check className="w-4 h-4 stroke-[2.5]" />
                                                    ) : (
                                                        <Icon className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <span
                                                    className={`text-[10px] sm:text-xs font-semibold text-center truncate max-w-[65px] sm:max-w-none transition-colors duration-200 ${
                                                        isCurrent
                                                            ? 'text-primary dark:text-primary-400 font-bold'
                                                            : isDone
                                                            ? 'text-secondary-600 dark:text-secondary-400'
                                                            : 'text-slate-400 dark:text-slate-500'
                                                    }`}
                                                >
                                                    {s.label}
                                                </span>
                                            </div>
                                            {idx < 3 && (
                                                <div
                                                    className={`flex-1 h-0.5 mx-1 sm:mx-2 rounded-full transition-colors duration-300 self-center -mt-5 ${
                                                        step > idx + 1
                                                            ? 'bg-secondary'
                                                            : 'bg-slate-200 dark:bg-slate-800'
                                                    }`}
                                                />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        <form onSubmit={submit}>
                            {/* Honeypot field (hidden from real users) */}
                            <div className="hidden" aria-hidden="true">
                                <input
                                    type="text"
                                    name="honeypot"
                                    value={data.honeypot}
                                    tabIndex={-1}
                                    autoComplete="off"
                                    onChange={(e) => setData('honeypot', e.target.value)}
                                />
                            </div>

                            <AnimatePresence mode="wait">
                                {/* STEP 1: CLINIC PROFILE */}
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 16 }}
                                        transition={{ duration: 0.25 }}
                                        className="space-y-4 sm:space-y-5"
                                    >
                                        <div>
                                            {/* Refined Teal Trial Chip in Hero Area */}
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-secondary-700 dark:text-secondary-300 bg-secondary-500/10 dark:bg-secondary-500/15 border border-secondary-500/30 backdrop-blur-md mb-2.5 shadow-xs">
                                                <Sparkles className="w-3.5 h-3.5 text-secondary-500 dark:text-secondary-400 animate-pulse" />
                                                <span>14 days free · No card needed</span>
                                            </div>

                                            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                                <Building2 className="w-5 h-5 text-primary" />
                                                Clinic Information
                                            </h2>
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                Tell us about your healthcare practice in Sri Lanka.
                                            </p>
                                        </div>

                                        <div>
                                            <GlassLabel htmlFor="clinic_name" required>
                                                Clinic Name
                                            </GlassLabel>
                                            <GlassInput
                                                id="clinic_name"
                                                name="clinic_name"
                                                value={data.clinic_name}
                                                placeholder="e.g. Ruhunu Medical Centre"
                                                error={!!errors.clinic_name}
                                                autoFocus
                                                onChange={(e) => setData('clinic_name', e.target.value)}
                                            />
                                            <GlassError message={errors.clinic_name} />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <GlassLabel htmlFor="clinic_type" required>
                                                    Clinic Type
                                                </GlassLabel>
                                                <GlassSelect
                                                    id="clinic_type"
                                                    name="clinic_type"
                                                    value={data.clinic_type}
                                                    error={!!errors.clinic_type}
                                                    onChange={(e) => setData('clinic_type', e.target.value)}
                                                >
                                                    {clinicTypes.map((type) => (
                                                        <option key={type} value={type}>
                                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                                        </option>
                                                    ))}
                                                </GlassSelect>
                                                <GlassError message={errors.clinic_type} />
                                            </div>

                                            <div>
                                                <GlassLabel htmlFor="district" required>
                                                    District
                                                </GlassLabel>
                                                <GlassSelect
                                                    id="district"
                                                    name="district"
                                                    value={data.district}
                                                    error={!!errors.district}
                                                    onChange={(e) => setData('district', e.target.value)}
                                                >
                                                    {districts.map((d) => (
                                                        <option key={d} value={d}>
                                                            {d}
                                                        </option>
                                                    ))}
                                                </GlassSelect>
                                                <GlassError message={errors.district} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <GlassLabel htmlFor="city" required>
                                                    Town / City
                                                </GlassLabel>
                                                <GlassInput
                                                    id="city"
                                                    name="city"
                                                    value={data.city}
                                                    placeholder="e.g. Matara"
                                                    error={!!errors.city}
                                                    onChange={(e) => setData('city', e.target.value)}
                                                />
                                                <GlassError message={errors.city} />
                                            </div>

                                            <div>
                                                <GlassLabel htmlFor="clinic_phone" required>
                                                    Clinic Phone (+94)
                                                </GlassLabel>
                                                <PhoneInput
                                                    id="clinic_phone"
                                                    name="clinic_phone"
                                                    value={data.clinic_phone}
                                                    error={!!errors.clinic_phone}
                                                    placeholder="041 222 3344"
                                                    onChange={(val) => setData('clinic_phone', val)}
                                                />
                                                <GlassError message={errors.clinic_phone} />
                                            </div>
                                        </div>

                                        <div>
                                            <GlassLabel htmlFor="address" required>
                                                Street Address
                                            </GlassLabel>
                                            <GlassInput
                                                id="address"
                                                name="address"
                                                value={data.address}
                                                placeholder="e.g. 45 Beach Road"
                                                error={!!errors.address}
                                                onChange={(e) => setData('address', e.target.value)}
                                            />
                                            <GlassError message={errors.address} />
                                        </div>

                                        <div className="pt-4 flex justify-end">
                                            <button
                                                type="button"
                                                disabled={!canProceedStep1}
                                                onClick={() => {
                                                    clearErrors();
                                                    setStep(2);
                                                }}
                                                className="py-3 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <span>Continue to Web Address</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 2: WEB ADDRESS / SUBDOMAIN */}
                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 16 }}
                                        transition={{ duration: 0.25 }}
                                        className="space-y-4 sm:space-y-5"
                                    >
                                        <div>
                                            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                                <Globe className="w-5 h-5 text-primary" />
                                                Choose Your Clinic Web Address
                                            </h2>
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                Your staff and patients will use this direct address to access MedVisit.
                                            </p>
                                        </div>

                                        <div>
                                            <GlassLabel htmlFor="subdomain" required>
                                                Subdomain
                                            </GlassLabel>
                                            <div className="relative flex rounded-xl border border-slate-300 dark:border-white/10 bg-white/90 dark:bg-slate-900/80 overflow-hidden focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
                                                <span className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 text-xs font-mono text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-white/10 flex items-center shrink-0">
                                                    https://
                                                </span>
                                                <input
                                                    id="subdomain"
                                                    type="text"
                                                    value={data.subdomain}
                                                    placeholder="ruhunu"
                                                    autoFocus
                                                    onChange={(e) => {
                                                        setSubdomainManuallyEdited(true);
                                                        setData(
                                                            'subdomain',
                                                            e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                                                        );
                                                    }}
                                                    className="w-full px-3.5 py-2.5 text-sm font-semibold text-slate-900 dark:text-white outline-none bg-transparent"
                                                />
                                                <span className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800/80 text-xs font-mono text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-white/10 flex items-center shrink-0">
                                                    .medvisit.lk
                                                </span>
                                            </div>

                                            {/* Subdomain status indicator */}
                                            <div className="mt-2.5 flex items-center gap-2 text-xs">
                                                {checkingSubdomain && (
                                                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 animate-spin" />
                                                        Checking availability...
                                                    </span>
                                                )}

                                                {!checkingSubdomain && subdomainResult && (
                                                    <>
                                                        {subdomainResult.available ? (
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                                                                <strong>{data.subdomain}</strong> is available!
                                                            </span>
                                                        ) : (
                                                            <div className="space-y-1.5">
                                                                <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                                    {subdomainResult.reason || 'Address unavailable.'}
                                                                </span>

                                                                {/* Suggestions */}
                                                                {subdomainResult.suggestions && subdomainResult.suggestions.length > 0 && (
                                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                                                                            Try instead:
                                                                        </span>
                                                                        {subdomainResult.suggestions.map((sug) => (
                                                                            <button
                                                                                key={sug}
                                                                                type="button"
                                                                                onClick={() => setData('subdomain', sug)}
                                                                                className="px-2 py-0.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-mono text-[11px] font-bold border border-primary/20 transition-colors cursor-pointer"
                                                                            >
                                                                                {sug}
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
                                                Rules: 3 to 30 characters. Use lowercase letters, numbers, and hyphens (no hyphens at start or end).
                                            </p>
                                            <GlassError message={errors.subdomain} />
                                        </div>

                                        <div className="pt-4 flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                className="py-3 px-5 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                                <span>Back</span>
                                            </button>

                                            <button
                                                type="button"
                                                disabled={!canProceedStep2}
                                                onClick={() => {
                                                    clearErrors();
                                                    setStep(3);
                                                }}
                                                className="py-3 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <span>Continue to Admin Account</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 3: ADMIN ACCOUNT */}
                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 16 }}
                                        transition={{ duration: 0.25 }}
                                        className="space-y-4 sm:space-y-5"
                                    >
                                        <div>
                                            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                                <UserCheck className="w-5 h-5 text-primary" />
                                                Clinic Administrator Account
                                            </h2>
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                This account will have primary administrative access to manage staff, doctors, and clinic settings.
                                            </p>
                                        </div>

                                        <div>
                                            <GlassLabel htmlFor="admin_name" required>
                                                Administrator Full Name
                                            </GlassLabel>
                                            <GlassInput
                                                id="admin_name"
                                                name="name"
                                                value={data.name}
                                                placeholder="e.g. Dr. Kasun Bandara"
                                                error={!!errors.name}
                                                autoFocus
                                                onChange={(e) => setData('name', e.target.value)}
                                            />
                                            <GlassError message={errors.name} />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <GlassLabel htmlFor="email" required>
                                                    Work Email
                                                </GlassLabel>
                                                <GlassInput
                                                    id="email"
                                                    type="email"
                                                    name="email"
                                                    value={data.email}
                                                    placeholder="doctor@ruhunuclinic.lk"
                                                    error={!!errors.email}
                                                    icon={<Mail className="w-4 h-4" />}
                                                    onChange={(e) => setData('email', e.target.value)}
                                                />
                                                <GlassError message={errors.email} />
                                            </div>

                                            <div>
                                                <GlassLabel htmlFor="mobile" required>
                                                    Mobile Number (+94)
                                                </GlassLabel>
                                                <PhoneInput
                                                    id="mobile"
                                                    name="mobile"
                                                    value={data.mobile}
                                                    error={!!errors.mobile}
                                                    placeholder="077 123 4567"
                                                    onChange={(val) => setData('mobile', val)}
                                                />
                                                <GlassError message={errors.mobile} />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <GlassLabel htmlFor="password" required>
                                                    Password (min 8 chars)
                                                </GlassLabel>
                                                <div className="relative">
                                                    <GlassInput
                                                        id="password"
                                                        type={showPassword ? 'text' : 'password'}
                                                        name="password"
                                                        value={data.password}
                                                        placeholder="••••••••••••"
                                                        error={!!errors.password}
                                                        icon={<Lock className="w-4 h-4" />}
                                                        onChange={(e) => setData('password', e.target.value)}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                                <GlassError message={errors.password} />
                                            </div>

                                            <div>
                                                <GlassLabel htmlFor="password_confirmation" required>
                                                    Confirm Password
                                                </GlassLabel>
                                                <GlassInput
                                                    id="password_confirmation"
                                                    type={showPassword ? 'text' : 'password'}
                                                    name="password_confirmation"
                                                    value={data.password_confirmation}
                                                    placeholder="••••••••••••"
                                                    error={!!errors.password_confirmation}
                                                    icon={<Lock className="w-4 h-4" />}
                                                    onChange={(e) => setData('password_confirmation', e.target.value)}
                                                />
                                                <GlassError message={errors.password_confirmation} />
                                            </div>
                                        </div>

                                        <div className="pt-1">
                                            <GlassCheckbox
                                                id="terms"
                                                name="terms"
                                                checked={data.terms}
                                                onChange={(e) => setData('terms', e.target.checked)}
                                                label={
                                                    <span className="text-xs text-slate-600 dark:text-slate-300">
                                                        I accept the{' '}
                                                        <a
                                                            href="#"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                alert('MedVisit Terms of Service: Standard healthcare data protection, Sri Lanka privacy compliance, and 14-day trial agreement.');
                                                            }}
                                                            className="text-primary font-bold hover:underline"
                                                        >
                                                            Terms of Service
                                                        </a>{' '}
                                                        and{' '}
                                                        <a
                                                            href="#"
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                alert('MedVisit Privacy Policy: Patient medical records and doctor notes remain encrypted and isolated to your tenant workspace.');
                                                            }}
                                                            className="text-primary font-bold hover:underline"
                                                        >
                                                            Privacy Policy
                                                        </a>
                                                        .
                                                    </span>
                                                }
                                            />
                                            <GlassError message={errors.terms} />
                                        </div>

                                        <div className="pt-4 flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setStep(2)}
                                                className="py-3 px-5 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                                <span>Back</span>
                                            </button>

                                            <button
                                                type="button"
                                                disabled={!canProceedStep3}
                                                onClick={() => {
                                                    clearErrors();
                                                    setStep(4);
                                                }}
                                                className="py-3 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <span>Review & Finish</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 4: REVIEW & CREATE */}
                                {step === 4 && (
                                    <motion.div
                                        key="step4"
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 16 }}
                                        transition={{ duration: 0.25 }}
                                        className="space-y-5"
                                    >
                                        <div>
                                            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-secondary" />
                                                Review Your Clinic Details
                                            </h2>
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                Please confirm your details before creating your clinic workspace.
                                            </p>
                                        </div>

                                        {/* Review Cards */}
                                        <div className="space-y-3">
                                            {/* Clinic Summary */}
                                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 flex items-start justify-between">
                                                <div className="space-y-1 text-xs">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                                        1. Clinic Profile
                                                    </span>
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                                                        {data.clinic_name}
                                                    </p>
                                                    <p className="text-slate-500 dark:text-slate-400 capitalize">
                                                        {data.clinic_type} • {data.district} District
                                                    </p>
                                                    <p className="text-slate-500 dark:text-slate-400">
                                                        {data.address}, {data.city} ({data.clinic_phone})
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setStep(1)}
                                                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                                >
                                                    Edit
                                                </button>
                                            </div>

                                            {/* Subdomain Summary */}
                                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 flex items-start justify-between">
                                                <div className="space-y-1 text-xs">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                                                        2. Web Address
                                                    </span>
                                                    <p className="font-mono font-bold text-sm text-primary">
                                                        https://{data.subdomain}.medvisit.lk
                                                    </p>
                                                    <p className="text-slate-500 dark:text-slate-400">
                                                        Local test access: https://{data.subdomain}.{centralDomain}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setStep(2)}
                                                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                                >
                                                    Edit
                                                </button>
                                            </div>

                                            {/* Admin Summary */}
                                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 flex items-start justify-between">
                                                <div className="space-y-1 text-xs">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                                                        3. Administrator Account
                                                    </span>
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                                                        {data.name}
                                                    </p>
                                                    <p className="text-slate-500 dark:text-slate-400">
                                                        {data.email} • {data.mobile}
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setStep(3)}
                                                    className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                                >
                                                    Edit
                                                </button>
                                            </div>
                                        </div>

                                        {/* Security & Trial Reassurance */}
                                        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5">
                                            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                                            <span>
                                                Includes 14 days of full MedVisit Pro features. No credit card required. Auto-initialized with Sri Lanka LKR tokens and queue management.
                                            </span>
                                        </div>

                                        <div className="pt-4 flex items-center justify-between">
                                            <button
                                                type="button"
                                                disabled={processing}
                                                onClick={() => setStep(3)}
                                                className="py-3 px-5 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                                <span>Back</span>
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={processing}
                                                className="py-3.5 px-8 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary via-primary-600 to-secondary hover:shadow-xl shadow-lg shadow-primary/30 transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                            >
                                                {processing ? (
                                                    <span>Building Your Clinic...</span>
                                                ) : (
                                                    <>
                                                        <Sparkles className="w-4 h-4" />
                                                        <span>Create My Clinic</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </form>
                    </div>

                    {/* Small Trust Line Under Form */}
                    <div className="pt-1 px-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                            <Lock className="w-3.5 h-3.5 text-secondary shrink-0" />
                            <span>Your clinic data is isolated and encrypted</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                            <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>Setup in under 60 seconds</span>
                        </div>
                    </div>
                </div>

                {/* Right Column: Live Animated Clinic Preview Panel (5 cols on desktop) */}
                <div className="hidden lg:block lg:col-span-5 sticky top-24">
                    <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800 relative overflow-hidden">
                        {/* Ambient glow inside browser container */}
                        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-primary-500/20 blur-3xl pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-secondary-500/20 blur-3xl pointer-events-none" />

                        {/* Browser Window Mockup Frame */}
                        <div className="rounded-2xl bg-slate-950/90 border border-slate-800 shadow-inner overflow-hidden">
                            {/* Browser Top Bar with macOS Window Dots */}
                            <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                                </div>

                                {/* Live Address Bar */}
                                <div className="flex-1 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center gap-2 text-xs font-mono text-slate-300">
                                    <Lock className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span className="text-slate-500">https://</span>
                                    <span className="font-bold text-white transition-all">
                                        {displaySubdomain}
                                    </span>
                                    <span className="text-slate-500">.medvisit.lk</span>
                                    <div className="w-1.5 h-3.5 bg-primary animate-pulse ml-auto" />
                                </div>
                            </div>

                            {/* Clinic Live Workspace Canvas */}
                            <div className="p-5 space-y-4">
                                {/* Mini Dashboard Header */}
                                <div className="flex items-start justify-between pb-3 border-b border-slate-800/80">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary-300 font-bold text-xs flex items-center justify-center">
                                                {data.clinic_name ? data.clinic_name.charAt(0).toUpperCase() : 'M'}
                                            </div>
                                            <h3 className="font-bold text-sm text-white tracking-tight truncate max-w-[180px]">
                                                {data.clinic_name || 'Your Clinic Name'}
                                            </h3>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 capitalize">
                                            <MapPin className="w-3 h-3 text-slate-500" />
                                            <span>
                                                {data.city || 'City'} • {data.district} District
                                            </span>
                                        </div>
                                    </div>

                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                        Live Trial
                                    </span>
                                </div>

                                {/* Live Token-Queue Card (Animated gently) */}
                                <motion.div
                                    animate={{ y: [0, -4, 0] }}
                                    transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                                    className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-850 border border-slate-700/60 shadow-lg relative overflow-hidden"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                            Token Queue Monitor
                                        </span>
                                        <span className="text-[10px] font-semibold text-secondary-400">
                                            Dr. Consulting
                                        </span>
                                    </div>

                                    <div className="flex items-baseline justify-between">
                                        <div>
                                            <p className="text-[10px] text-slate-400 font-medium">Now Serving</p>
                                            <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-secondary-400 tracking-tight">
                                                07
                                            </div>
                                        </div>

                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 font-medium">Next in line</p>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                                <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-bold text-slate-300">
                                                    08
                                                </span>
                                                <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-bold text-slate-400">
                                                    09
                                                </span>
                                                <span className="text-[10px] text-slate-500">+12</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>

                                {/* Feature Badges */}
                                <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary-400 shrink-0" />
                                        <div className="truncate">
                                            <p className="text-[9px] text-slate-500 font-bold uppercase">Currency</p>
                                            <p className="font-semibold text-slate-200">LKR (Rs.)</p>
                                        </div>
                                    </div>

                                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-secondary-400 shrink-0" />
                                        <div className="truncate">
                                            <p className="text-[9px] text-slate-500 font-bold uppercase">Timezone</p>
                                            <p className="font-semibold text-slate-200">Asia/Colombo</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Reassurance Footer */}
                        <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                            <span className="flex items-center gap-1.5 text-[11px]">
                                <ShieldCheck className="w-3.5 h-3.5 text-secondary-400" />
                                Isolated Tenant Workspace
                            </span>
                            <span className="text-[11px] text-slate-500">
                                Setup in &lt; 60 seconds
                            </span>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
