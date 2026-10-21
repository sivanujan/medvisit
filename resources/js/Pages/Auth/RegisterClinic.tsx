import React, { useState, useEffect, useMemo, useRef, FormEventHandler } from 'react';
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
    RotateCw,
    KeyRound,
} from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import AuthHeader from '@/Components/AuthHeader';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import LegalFooter from '@/Components/Public/LegalFooter';
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
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [showPassword, setShowPassword] = useState(false);
    const [subdomainManuallyEdited, setSubdomainManuallyEdited] = useState(false);

    // Subdomain checking state
    const [checkingSubdomain, setCheckingSubdomain] = useState(false);
    const [subdomainResult, setSubdomainResult] = useState<SubdomainCheckResult | null>(null);

    // OTP verification state (Step 4)
    const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
    const [sendingCode, setSendingCode] = useState(false);
    const [verifyingCode, setVerifyingCode] = useState(false);
    const [resendingCode, setResendingCode] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);
    const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [isVerified, setIsVerified] = useState(false);
    const [expirySeconds, setExpirySeconds] = useState(600);
    const [resendCooldown, setResendCooldown] = useState(60);
    const [devCode, setDevCode] = useState<string | null>(null);

    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
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
        // Step 4: OTP Verification
        registration_token: '',
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

    // Timer countdown for Step 4
    useEffect(() => {
        if (step !== 4 || isVerified) return;

        const timer = setInterval(() => {
            setExpirySeconds((prev) => (prev > 0 ? prev - 1 : 0));
            setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(timer);
    }, [step, isVerified]);

    const formatTimer = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

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

    // Send OTP code (Transition from Step 3 -> Step 4)
    const handleSendCode = async () => {
        clearErrors();
        setOtpError(null);
        setSendingCode(true);

        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

        try {
            const res = await fetch(route('register.send_code'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                body: JSON.stringify(data),
            });

            const resData = await res.json();

            if (!res.ok) {
                if (res.status === 422 && resData.errors) {
                    Object.entries(resData.errors).forEach(([field, msgs]) => {
                        const firstMsg = Array.isArray(msgs) ? msgs[0] : (msgs as string);
                        setError(field as any, firstMsg);
                    });
                } else {
                    setOtpError(resData.message || 'Failed to send verification code. Please check your details.');
                }
                setSendingCode(false);
                return;
            }

            setData('registration_token', resData.token);
            setExpirySeconds(resData.expires_in_seconds || 600);
            setResendCooldown(resData.resend_cooldown_seconds || 60);
            if (resData.dev_code) {
                setDevCode(resData.dev_code);
            }
            setDigits(['', '', '', '', '', '']);
            setIsLocked(false);
            setIsVerified(false);
            setSendingCode(false);
            setStep(4);

            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 150);
        } catch {
            setOtpError('Network error while requesting verification code. Please try again.');
            setSendingCode(false);
        }
    };

    // Verify OTP code
    const handleVerifyCode = async (codeToVerify?: string) => {
        const code = codeToVerify || digits.join('');
        if (code.length !== 6 || verifyingCode) return;

        setVerifyingCode(true);
        setOtpError(null);

        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

        try {
            const res = await fetch(route('register.verify_code'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    token: data.registration_token,
                    code,
                }),
            });

            const resData = await res.json();

            if (!res.ok) {
                setOtpError(resData.message || 'Incorrect verification code.');
                if (resData.locked) {
                    setIsLocked(true);
                }
                setVerifyingCode(false);
                return;
            }

            setIsVerified(true);
            setOtpSuccess('Email verified successfully!');
            setVerifyingCode(false);

            // Auto-advance to Step 5 (Review & Create) after 600ms
            setTimeout(() => {
                setStep(5);
            }, 600);
        } catch {
            setOtpError('Network error while verifying code. Please try again.');
            setVerifyingCode(false);
        }
    };

    // Resend OTP code
    const handleResendCode = async () => {
        if (resendCooldown > 0 || resendingCode || !data.registration_token) return;

        setResendingCode(true);
        setOtpError(null);

        const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

        try {
            const res = await fetch(route('register.resend_code'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    token: data.registration_token,
                }),
            });

            const resData = await res.json();

            if (!res.ok) {
                setOtpError(resData.message || 'Failed to resend code.');
                setResendingCode(false);
                return;
            }

            setExpirySeconds(resData.expires_in_seconds || 600);
            setResendCooldown(resData.resend_cooldown_seconds || 60);
            if (resData.dev_code) {
                setDevCode(resData.dev_code);
            }
            setDigits(['', '', '', '', '', '']);
            setIsLocked(false);
            setOtpSuccess('A new verification code has been sent to your email.');
            setTimeout(() => setOtpSuccess(null), 3500);
            setResendingCode(false);

            setTimeout(() => {
                inputRefs.current[0]?.focus();
            }, 100);
        } catch {
            setOtpError('Network error while resending verification code.');
            setResendingCode(false);
        }
    };

    // OTP Input Handlers
    const handleDigitChange = (index: number, value: string) => {
        if (isLocked || isVerified) return;

        const cleanDigit = value.replace(/\D/g, '').slice(-1);
        const newDigits = [...digits];
        newDigits[index] = cleanDigit;
        setDigits(newDigits);
        setOtpError(null);

        if (cleanDigit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto submit on 6th digit
        if (cleanDigit && index === 5) {
            const fullCode = newDigits.join('');
            if (fullCode.length === 6) {
                handleVerifyCode(fullCode);
            }
        }
    };

    const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (!digits[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleDigitPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        if (isLocked || isVerified) return;

        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;

        const newDigits = ['', '', '', '', '', ''];
        for (let i = 0; i < 6; i++) {
            newDigits[i] = pasted[i] || '';
        }
        setDigits(newDigits);
        setOtpError(null);

        if (pasted.length === 6) {
            inputRefs.current[5]?.focus();
            handleVerifyCode(pasted);
        } else {
            const nextIndex = Math.min(pasted.length, 5);
            inputRefs.current[nextIndex]?.focus();
        }
    };

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
                totalSteps={5}
                stepLabel={
                    step === 1
                        ? 'Clinic details'
                        : step === 2
                        ? 'Web address'
                        : step === 3
                        ? 'Admin account'
                        : step === 4
                        ? 'Verify email'
                        : 'Review & create'
                }
                rightAction="signin"
            />

            {/* Mobile Live URL Preview Header Strip */}
            <div className="lg:hidden px-4 py-2.5 bg-slate-900 text-white flex items-center justify-between text-xs border-b border-slate-800">
                <div className="flex items-center gap-2 truncate">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="font-mono text-slate-300 truncate">
                        http://<span className="text-white font-bold">{displaySubdomain}</span>.{centralDomain}:8000
                    </span>
                </div>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/30 text-primary-300">
                    Live Preview
                </span>
            </div>

            {/* Main Content: Split Desktop Layout */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Multi-Step Wizard Form */}
                <div className="lg:col-span-7 space-y-4">
                    {/* Step Form Container */}
                    <div className="p-6 sm:p-8 rounded-3xl bg-white/80 dark:bg-slate-900/70 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-xl dark:shadow-2xl">
                        {/* 5-Step Indicator Inside Form Card */}
                        <div className="pb-6 mb-6 border-b border-slate-200/80 dark:border-white/10">
                            <div className="flex items-center justify-between">
                                {[
                                    { num: 1, label: 'Clinic', icon: Building2 },
                                    { num: 2, label: 'Web Address', icon: Globe },
                                    { num: 3, label: 'Admin', icon: UserCheck },
                                    { num: 4, label: 'Verify', icon: Mail },
                                    { num: 5, label: 'Launch', icon: CheckCircle2 },
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
                                                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 ${
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
                                                        <Check className="w-4 h-4 text-secondary stroke-[3]" />
                                                    ) : (
                                                        <Icon className="w-4 h-4" />
                                                    )}
                                                </button>
                                                <span
                                                    className={`text-[10px] sm:text-xs font-semibold truncate max-w-full ${
                                                        isCurrent
                                                            ? 'text-primary dark:text-primary-400 font-bold'
                                                            : isDone
                                                            ? 'text-slate-700 dark:text-slate-300'
                                                            : 'text-slate-400 dark:text-slate-500'
                                                    }`}
                                                >
                                                    {s.label}
                                                </span>
                                            </div>
                                            {idx < 4 && (
                                                <div
                                                    className={`h-0.5 flex-1 mx-1 sm:mx-2 rounded transition-colors ${
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
                                                        title={showPassword ? 'Hide password' : 'Show password'}
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                                {data.password.length > 0 && data.password.length < 8 && (
                                                    <p className="mt-1 text-xs text-amber-600 dark:text-amber-400 font-medium">
                                                        Must be at least 8 characters (has {data.password.length}).
                                                    </p>
                                                )}
                                                <GlassError message={errors.password} />
                                                <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                                                    Requires uppercase, lowercase & numbers.
                                                </p>
                                            </div>

                                            <div>
                                                <GlassLabel htmlFor="password_confirmation" required>
                                                    Confirm Password
                                                </GlassLabel>
                                                <div className="relative">
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
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                                        title={showPassword ? 'Hide password' : 'Show password'}
                                                    >
                                                        {showPassword ? (
                                                            <EyeOff className="w-4 h-4" />
                                                        ) : (
                                                            <Eye className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                                {data.password_confirmation.length > 0 && (
                                                    data.password !== data.password_confirmation ? (
                                                        <p className="mt-1 text-xs text-rose-500 dark:text-rose-400 font-medium flex items-center gap-1">
                                                            <AlertCircle className="w-3.5 h-3.5" />
                                                            Passwords do not match
                                                        </p>
                                                    ) : (
                                                        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                                                            <Check className="w-3.5 h-3.5" />
                                                            Passwords match
                                                        </p>
                                                    )
                                                )}
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

                                        {otpError && (
                                            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                                                <span>{otpError}</span>
                                            </div>
                                        )}

                                        <div className="pt-4 flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setStep(2)}
                                                className="py-3 px-5 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                                <span>Back</span>
                                            </button>

                                            <div className="flex items-center gap-3">
                                                {!canProceedStep3 && data.password_confirmation.length > 0 && data.password !== data.password_confirmation && (
                                                    <span className="text-xs text-rose-500 hidden sm:inline">
                                                        Passwords must match
                                                    </span>
                                                )}

                                                <button
                                                    type="button"
                                                    disabled={!canProceedStep3 || sendingCode}
                                                    onClick={handleSendCode}
                                                    className="py-3 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {sendingCode ? (
                                                        <>
                                                            <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                                            <span>Sending Verification Code...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>Verify Email</span>
                                                            <ArrowRight className="w-4 h-4" />
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 4: VERIFY EMAIL (NEW OTP STEP) */}
                                {step === 4 && (
                                    <motion.div
                                        key="step4"
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 16 }}
                                        transition={{ duration: 0.25 }}
                                        className="space-y-5"
                                    >
                                        <div className="text-center space-y-1">
                                            <div className="inline-flex w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary-500/20 text-primary items-center justify-center mb-2">
                                                <Mail className="w-6 h-6" />
                                            </div>
                                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                                Verify Your Admin Email
                                            </h2>
                                            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-sm mx-auto">
                                                We sent a 6-digit verification code to{' '}
                                                <strong className="text-primary-700 dark:text-primary-300 font-bold break-all">
                                                    {data.email}
                                                </strong>
                                                . Enter it below to confirm your account.
                                            </p>
                                        </div>

                                        {devCode && (
                                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between gap-2 max-w-sm mx-auto">
                                                <span>Dev Code: <strong className="font-mono font-bold tracking-wider">{devCode}</strong></span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const parts = devCode.split('');
                                                        setDigits(parts);
                                                        handleVerifyCode(devCode);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-semibold cursor-pointer text-[11px] transition-colors"
                                                >
                                                    Auto-fill & Confirm
                                                </button>
                                            </div>
                                        )}

                                        {/* 6 Digit Input Boxes */}
                                        <div className="py-2">
                                            <div
                                                className="flex items-center justify-center gap-2 sm:gap-3"
                                                onPaste={handleDigitPaste}
                                            >
                                                {digits.map((digit, idx) => (
                                                    <input
                                                        key={idx}
                                                        ref={(el) => (inputRefs.current[idx] = el)}
                                                        type="text"
                                                        inputMode="numeric"
                                                        autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                                                        maxLength={1}
                                                        value={digit}
                                                        disabled={isLocked || isVerified}
                                                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                                                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                                                        className={`w-11 h-14 sm:w-13 sm:h-16 text-center font-mono font-extrabold text-2xl sm:text-3xl rounded-2xl border transition-all duration-200 outline-none select-all ${
                                                            digit
                                                                ? 'border-primary bg-primary/5 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 ring-2 ring-primary/20'
                                                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white'
                                                        } ${
                                                            isLocked
                                                                ? 'border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 cursor-not-allowed opacity-60'
                                                                : 'focus:border-primary focus:ring-4 focus:ring-primary/20'
                                                        }`}
                                                        aria-label={`Digit ${idx + 1}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Status / Error Messages */}
                                        {otpError && (
                                            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                                    <span>{otpError}</span>
                                                </div>
                                                {isLocked && (
                                                    <button
                                                        type="button"
                                                        onClick={handleResendCode}
                                                        className="font-bold underline hover:no-underline cursor-pointer shrink-0"
                                                    >
                                                        Request new code
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {otpSuccess && (
                                            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 justify-center">
                                                <Check className="w-4 h-4 text-emerald-500" />
                                                <span className="font-semibold">{otpSuccess}</span>
                                            </div>
                                        )}

                                        {/* Timer & Resend Controls */}
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500 dark:text-slate-400">
                                            <div className="flex items-center gap-1.5 font-medium">
                                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                                {expirySeconds > 0 ? (
                                                    <span>
                                                        Code expires in{' '}
                                                        <strong className="font-mono text-primary font-bold">
                                                            {formatTimer(expirySeconds)}
                                                        </strong>
                                                    </span>
                                                ) : (
                                                    <span className="text-rose-500 font-bold">
                                                        Code has expired
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <button
                                                    type="button"
                                                    disabled={resendCooldown > 0 || resendingCode}
                                                    onClick={handleResendCode}
                                                    className="font-bold text-xs text-primary hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
                                                >
                                                    {resendingCode ? (
                                                        <>
                                                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                                                            <span>Resending...</span>
                                                        </>
                                                    ) : resendCooldown > 0 ? (
                                                        <span>Resend code in {resendCooldown}s</span>
                                                    ) : (
                                                        <span>Resend code</span>
                                                    )}
                                                </button>

                                                <span className="text-slate-300 dark:text-slate-700">•</span>

                                                <button
                                                    type="button"
                                                    onClick={() => setStep(3)}
                                                    className="font-medium text-xs text-slate-600 dark:text-slate-300 hover:text-primary hover:underline cursor-pointer"
                                                >
                                                    Change email
                                                </button>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="pt-4 flex items-center justify-between border-t border-slate-200/80 dark:border-white/10">
                                            <button
                                                type="button"
                                                onClick={() => setStep(3)}
                                                className="py-3 px-5 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                                <span>Back</span>
                                            </button>

                                            <button
                                                type="button"
                                                disabled={digits.join('').length !== 6 || verifyingCode || isLocked}
                                                onClick={() => handleVerifyCode()}
                                                className="py-3 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {verifyingCode ? (
                                                    <>
                                                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                                        <span>Verifying...</span>
                                                    </>
                                                ) : isVerified ? (
                                                    <>
                                                        <Check className="w-4 h-4" />
                                                        <span>Verified • Continue</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Confirm Code</span>
                                                        <ArrowRight className="w-4 h-4" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 5: REVIEW & CREATE */}
                                {step === 5 && (
                                    <motion.div
                                        key="step5"
                                        initial={{ opacity: 0, x: -16 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 16 }}
                                        transition={{ duration: 0.25 }}
                                        className="space-y-5"
                                    >
                                        <div>
                                            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-secondary" />
                                                Review & Launch Clinic
                                            </h2>
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                Your email is confirmed. Please review your details before creating your clinic workspace.
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
                                                        Local URL: http://{data.subdomain}.{centralDomain}:8000
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

                                            {/* Admin Summary with Verified Badge */}
                                            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-white/10 flex items-start justify-between">
                                                <div className="space-y-1 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                                                            3. Administrator Account
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                                                            <Check className="w-3 h-3 text-emerald-600" />
                                                            Email Verified
                                                        </span>
                                                    </div>
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
                                                onClick={() => setStep(4)}
                                                className="py-3 px-5 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                                <span>Back</span>
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={processing || !data.registration_token}
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

            <LegalFooter className="mt-12" />
        </div>
    );
}
