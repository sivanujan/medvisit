import React, { useState, useEffect, useRef, FormEventHandler, KeyboardEvent } from 'react';
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
    Mail,
    AlertCircle,
    Check,
    Clock,
    RotateCw,
    Sparkles,
    ChevronDown,
    ChevronUp,
    ShieldCheck,
} from 'lucide-react';
import RegistrationHeader from '@/Components/Registration/RegistrationHeader';
import LiveClinicPreview from '@/Components/Registration/LiveClinicPreview';
import LegalFooter from '@/Components/Public/LegalFooter';
import { useDebounce } from '@/Hooks/useDebounce';
import '@/Components/Registration/registration.css';

interface Props {
    districts: string[];
    clinicTypes: string[];
    centralDomain: string;
    publicDomain?: string;
}

interface SubdomainCheckResult {
    available: boolean;
    reason?: string;
    suggestions?: string[];
    url?: string;
}

const STORAGE_KEY = 'medvisit.registration_draft';

// Steps definition for the one and only stepper
const STEPS = [
    { num: 1, label: 'Clinic', icon: Building2 },
    { num: 2, label: 'Web address', icon: Globe },
    { num: 3, label: 'Admin', icon: UserCheck },
    { num: 4, label: 'Verify', icon: Mail },
    { num: 5, label: 'Launch', icon: CheckCircle2 },
] as const;

export default function RegisterClinic({
    districts,
    clinicTypes,
    centralDomain,
    publicDomain = 'medvisit.lk',
}: Props) {
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [subdomainManuallyEdited, setSubdomainManuallyEdited] = useState(false);
    const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);

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

    // Field refs for programmatic focus on validation failure
    const clinicNameRef = useRef<HTMLInputElement>(null);
    const clinicTypeRef = useRef<HTMLSelectElement>(null);
    const districtRef = useRef<HTMLSelectElement>(null);
    const cityRef = useRef<HTMLInputElement>(null);
    const clinicPhoneRef = useRef<HTMLInputElement>(null);
    const addressRef = useRef<HTMLInputElement>(null);
    const subdomainRef = useRef<HTMLInputElement>(null);
    const adminNameRef = useRef<HTMLInputElement>(null);
    const emailRef = useRef<HTMLInputElement>(null);
    const mobileRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    const passwordConfirmRef = useRef<HTMLInputElement>(null);
    const termsRef = useRef<HTMLInputElement>(null);

    const { data, setData, post, processing, errors, setError, clearErrors } = useForm({
        honeypot: '',
        clinic_name: '',
        clinic_type: 'medical centre',
        district: 'Colombo',
        city: '',
        address: '',
        clinic_phone: '',
        subdomain: '',
        name: '',
        email: '',
        mobile: '',
        password: '',
        password_confirmation: '',
        terms: false as boolean,
        registration_token: '',
    });

    // Restore draft from sessionStorage on mount (excluding passwords & tokens)
    useEffect(() => {
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const draft = JSON.parse(raw);
            if (draft && typeof draft === 'object') {
                if (draft.clinic_name) setData('clinic_name', draft.clinic_name);
                if (draft.clinic_type) setData('clinic_type', draft.clinic_type);
                if (draft.district) setData('district', draft.district);
                if (draft.city) setData('city', draft.city);
                if (draft.address) setData('address', draft.address);
                if (draft.clinic_phone) setData('clinic_phone', draft.clinic_phone);
                if (draft.subdomain) {
                    setData('subdomain', draft.subdomain);
                    setSubdomainManuallyEdited(true);
                }
                if (draft.name) setData('name', draft.name);
                if (draft.email) setData('email', draft.email);
                if (draft.mobile) setData('mobile', draft.mobile);
                if (draft.step && draft.step >= 1 && draft.step <= 3) {
                    setStep(draft.step as 1 | 2 | 3);
                }
            }
        } catch {
            // Storage unavailable in private browsing or blocked site data; graceful fallback
        }
    }, []);

    // Save non-sensitive draft on change
    useEffect(() => {
        try {
            const draft = {
                clinic_name: data.clinic_name,
                clinic_type: data.clinic_type,
                district: data.district,
                city: data.city,
                address: data.address,
                clinic_phone: data.clinic_phone,
                subdomain: data.subdomain,
                name: data.name,
                email: data.email,
                mobile: data.mobile,
                step: step <= 3 ? step : 3, // Steps 4 & 5 require token session
            };
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        } catch {
            // Ignore storage write issues
        }
    }, [
        data.clinic_name,
        data.clinic_type,
        data.district,
        data.city,
        data.address,
        data.clinic_phone,
        data.subdomain,
        data.name,
        data.email,
        data.mobile,
        step,
    ]);

    // Auto-generate subdomain from clinic name until user edits it
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

    // Live availability check (debounced 400ms)
    useEffect(() => {
        if (!debouncedSubdomain || debouncedSubdomain.length < 3) {
            setSubdomainResult(null);
            setCheckingSubdomain(false);
            return;
        }

        let isMounted = true;
        setCheckingSubdomain(true);

        const csrfToken =
            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

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
                if (!res.ok) throw new Error(`Status ${res.status}`);
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

    // Phone normalizer helper: accepts & strips leading 0
    const handlePhoneChange = (field: 'clinic_phone' | 'mobile', raw: string) => {
        // Strip non-digits
        let digitsOnly = raw.replace(/\D/g, '');
        // If typed with international 94 prefix
        if (digitsOnly.startsWith('94')) {
            digitsOnly = digitsOnly.slice(2);
        }
        // Accept and strip leading 0
        if (digitsOnly.startsWith('0')) {
            digitsOnly = digitsOnly.slice(1);
        }
        digitsOnly = digitsOnly.slice(0, 9);

        // Format for display: "77 123 4567"
        let formatted = digitsOnly;
        if (digitsOnly.length > 5) {
            formatted = `${digitsOnly.slice(0, 2)} ${digitsOnly.slice(2, 5)} ${digitsOnly.slice(5)}`;
        } else if (digitsOnly.length > 2) {
            formatted = `${digitsOnly.slice(0, 2)} ${digitsOnly.slice(2)}`;
        }

        setData(field, formatted);
        clearErrors(field);
    };

    // Navigation and validation: Step 1 -> Step 2
    const handleProceedStep1 = () => {
        clearErrors();
        const errs: Record<string, string> = {};

        if (!data.clinic_name.trim()) {
            errs.clinic_name = 'Please enter your clinic name.';
            clinicNameRef.current?.focus();
        } else if (data.clinic_name.trim().length < 2) {
            errs.clinic_name = 'Clinic name must be at least 2 characters.';
            clinicNameRef.current?.focus();
        } else if (!data.city.trim()) {
            errs.city = 'Please enter your town or city.';
            cityRef.current?.focus();
        } else if (!data.clinic_phone.trim() || data.clinic_phone.replace(/\D/g, '').length < 9) {
            errs.clinic_phone = 'Please enter a valid 9-digit Sri Lankan phone number.';
            clinicPhoneRef.current?.focus();
        } else if (!data.address.trim()) {
            errs.address = 'Please enter your street address.';
            addressRef.current?.focus();
        }

        if (Object.keys(errs).length > 0) {
            Object.entries(errs).forEach(([k, v]) => setError(k as any, v));
            return;
        }

        setStep(2);
        requestAnimationFrame(() => subdomainRef.current?.focus());
    };

    // Navigation and validation: Step 2 -> Step 3
    const handleProceedStep2 = () => {
        clearErrors('subdomain');
        const sub = data.subdomain.trim();

        if (!sub) {
            setError('subdomain', 'Please enter a clinic web address.');
            subdomainRef.current?.focus();
            return;
        }

        if (sub.length < 3 || sub.length > 30) {
            setError('subdomain', 'Web address must be between 3 and 30 characters.');
            subdomainRef.current?.focus();
            return;
        }

        if (!/^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/.test(sub)) {
            setError(
                'subdomain',
                'Use only lowercase letters, numbers, and hyphens (no hyphens at start or end).'
            );
            subdomainRef.current?.focus();
            return;
        }

        if (subdomainResult && !subdomainResult.available) {
            setError('subdomain', subdomainResult.reason || 'This address is already taken.');
            subdomainRef.current?.focus();
            return;
        }

        if (checkingSubdomain) {
            setError('subdomain', 'Please wait while we check address availability.');
            return;
        }

        setStep(3);
        requestAnimationFrame(() => adminNameRef.current?.focus());
    };

    // Navigation and validation: Step 3 -> Step 4 (Send Verification Code)
    const handleSendCode = async () => {
        clearErrors();
        setOtpError(null);

        const errs: Record<string, string> = {};

        if (!data.name.trim()) {
            errs.name = 'Please enter your full name.';
            adminNameRef.current?.focus();
        } else if (!data.email.trim() || !data.email.includes('@')) {
            errs.email = 'Please enter a valid email address.';
            emailRef.current?.focus();
        } else if (!data.mobile.trim() || data.mobile.replace(/\D/g, '').length < 9) {
            errs.mobile = 'Please enter a valid 9-digit mobile number.';
            mobileRef.current?.focus();
        } else if (data.password.length < 8) {
            errs.password = 'Password must be at least 8 characters with numbers & uppercase.';
            passwordRef.current?.focus();
        } else if (data.password !== data.password_confirmation) {
            errs.password_confirmation = 'Passwords do not match.';
            passwordConfirmRef.current?.focus();
        } else if (!data.terms) {
            errs.terms = 'You must accept the Terms and Privacy Policy to continue.';
            termsRef.current?.focus();
        }

        if (Object.keys(errs).length > 0) {
            Object.entries(errs).forEach(([k, v]) => setError(k as any, v));
            return;
        }

        setSendingCode(true);
        const csrfToken =
            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

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
                    setOtpError(resData.message || 'Failed to send verification code.');
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

    // Verify OTP code (Step 4 -> Step 5)
    const handleVerifyCode = async (codeToVerify?: string) => {
        const code = codeToVerify || digits.join('');
        if (code.length !== 6 || verifyingCode) return;

        setVerifyingCode(true);
        setOtpError(null);

        const csrfToken =
            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

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

            // Auto-advance to Step 5
            setTimeout(() => {
                setStep(5);
            }, 600);
        } catch {
            setOtpError('Network error while verifying code. Please try again.');
            setVerifyingCode(false);
        }
    };

    // Resend verification code
    const handleResendCode = async () => {
        if (resendCooldown > 0 || resendingCode || !data.registration_token) return;

        setResendingCode(true);
        setOtpError(null);
        const csrfToken =
            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

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
            setOtpError('Network error while resending code.');
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

        if (cleanDigit && index === 5) {
            const fullCode = newDigits.join('');
            if (fullCode.length === 6) {
                handleVerifyCode(fullCode);
            }
        }
    };

    const handleDigitKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace') {
            if (!digits[index] && index > 0) {
                inputRefs.current[index - 1]?.focus();
            }
        } else if (e.key === 'ArrowLeft' && index > 0) {
            inputRefs.current[index - 1]?.focus();
        } else if (e.key === 'ArrowRight' && index < 5) {
            inputRefs.current[index + 1]?.focus();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            handleVerifyCode();
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

    // Enter key handling on forms
    const handleKeyDownOnForm = (e: KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter') {
            const target = e.target as HTMLElement;
            if (target.tagName === 'TEXTAREA' || target.getAttribute('type') === 'checkbox') return;
            e.preventDefault();
            if (step === 1) handleProceedStep1();
            else if (step === 2) handleProceedStep2();
            else if (step === 3) handleSendCode();
            else if (step === 4) handleVerifyCode();
            else if (step === 5) submit();
        }
    };

    // Final submission
    const submit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        post(route('register'), {
            onSuccess: () => {
                try {
                    sessionStorage.removeItem(STORAGE_KEY);
                } catch {
                    // Ignore
                }
            },
        });
    };

    // Password Strength & Match helpers
    const passwordStrength = React.useMemo(() => {
        const pass = data.password || '';
        if (!pass) {
            return {
                score: 0,
                label: '',
                color: 'bg-slate-200 dark:bg-slate-800',
                textColor: 'text-slate-400',
            };
        }

        let score = 0;
        if (pass.length >= 8) score += 1;
        if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score += 1;
        if (/\d/.test(pass)) score += 1;
        if (/[^a-zA-Z0-9]/.test(pass) || pass.length >= 12) score += 1;

        if (pass.length < 6) {
            score = Math.min(score, 1);
        }

        switch (score) {
            case 1:
                return { score: 1, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-500 dark:text-rose-400' };
            case 2:
                return { score: 2, label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-500 dark:text-amber-400' };
            case 3:
                return { score: 3, label: 'Good', color: 'bg-sky-500', textColor: 'text-sky-500 dark:text-sky-400' };
            case 4:
                return { score: 4, label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-500 dark:text-emerald-400' };
            default:
                return { score: 1, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-500 dark:text-rose-400' };
        }
    }, [data.password]);

    const hasTypedConfirm = (data.password_confirmation || '').length > 0;
    const passwordsMatch = hasTypedConfirm && data.password.length > 0 && data.password === data.password_confirmation;
    const passwordsMismatch = hasTypedConfirm && data.password !== data.password_confirmation;

    return (
        <div className="reg-root min-h-[100dvh] flex flex-col justify-between selection:bg-primary-100 selection:text-primary-800 antialiased overflow-x-hidden">
            <Head title="Create your clinic — MedVisit" />

            {/* Dotted grid + radial glow backdrop */}
            <div className="reg-backdrop fixed inset-0 pointer-events-none -z-10" aria-hidden="true" />

            {/* Header: transparent, minimal, no bottom border line */}
            <RegistrationHeader />

            {/* Mobile Collapsible Preview Bar (<1024px) */}
            <div className="lg:hidden px-4 py-2.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-y border-slate-200/80 dark:border-white/10 z-20">
                <button
                    type="button"
                    onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
                    className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                    <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded-md bg-[#1E6FD9] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {data.clinic_name ? data.clinic_name.charAt(0).toUpperCase() : 'M'}
                        </span>
                        <span className="truncate font-bold text-slate-900 dark:text-white">
                            {data.clinic_name || 'Your Clinic'}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px] truncate">
                            ({data.subdomain || 'yourclinic'}.{publicDomain})
                        </span>
                    </div>
                    <span className="flex items-center gap-1 text-primary shrink-0 font-bold text-[11px]">
                        <span>{mobilePreviewOpen ? 'Hide' : 'Preview'}</span>
                        {mobilePreviewOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </span>
                </button>

                {mobilePreviewOpen && (
                    <div className="pt-3 pb-1">
                        <LiveClinicPreview
                            step={step}
                            clinicName={data.clinic_name}
                            clinicType={data.clinic_type}
                            district={data.district}
                            city={data.city}
                            clinicPhone={data.clinic_phone}
                            subdomain={data.subdomain}
                            adminName={data.name}
                            adminEmail={data.email}
                            adminMobile={data.mobile}
                            checkingSubdomain={checkingSubdomain}
                            subdomainResult={subdomainResult}
                            isVerified={isVerified}
                            publicDomain={publicDomain}
                            isMobileCollapsible={true}
                        />
                    </div>
                )}
            </div>

            {/* Main Split Layout: Left Form (~50%), Right Preview (~50%) */}
            <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Form Card */}
                <div className="lg:col-span-6 xl:col-span-6 w-full space-y-4">
                    <div className="rounded-3xl bg-white/85 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-xl dark:shadow-2xl p-6 sm:p-8">
                        {/* Stepper Header (Inside Card Only) */}
                        <div className="pb-6 mb-6 border-b border-slate-200/80 dark:border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                    Step {step} of 5
                                </span>
                                <span className="text-xs font-bold text-primary">
                                    {STEPS[step - 1].label}
                                </span>
                            </div>

                            {/* Slim Horizontal Stepper */}
                            <div className="flex items-center justify-between">
                                {STEPS.map((s, idx) => {
                                    const Icon = s.icon;
                                    const isCurrent = step === s.num;
                                    const isDone = step > s.num;
                                    const isClickable = isDone;

                                    return (
                                        <React.Fragment key={s.num}>
                                            <div
                                                className="flex flex-col items-center gap-1.5 flex-1 min-w-0"
                                                title={`Step ${s.num}: ${s.label}`}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (isClickable) setStep(s.num as any);
                                                    }}
                                                    disabled={!isClickable}
                                                    aria-label={`Step ${s.num}: ${s.label}`}
                                                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-xs sm:text-sm transition-all duration-300 ${
                                                        isCurrent
                                                            ? 'bg-primary text-white shadow-md shadow-primary/30 ring-4 ring-primary/20 scale-105'
                                                            : isDone
                                                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 cursor-pointer'
                                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {isDone ? (
                                                        <Check className="w-4 h-4 stroke-[3]" />
                                                    ) : (
                                                        <Icon className="w-4 h-4" />
                                                    )}
                                                </button>

                                                {/* Full labels on xl screens; tooltip on smaller */}
                                                <span
                                                    className={`hidden xl:inline text-xs font-semibold tracking-tight ${
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
                                                    className={`h-0.5 flex-1 mx-1 sm:mx-2 rounded transition-colors duration-300 ${
                                                        step > idx + 1
                                                            ? 'bg-emerald-500'
                                                            : 'bg-slate-200 dark:bg-slate-800'
                                                    }`}
                                                />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Wizard Form */}
                        <form onSubmit={submit} onKeyDown={handleKeyDownOnForm} noValidate>
                            {/* Honeypot field for bots */}
                            <input
                                type="text"
                                name="honeypot"
                                value={data.honeypot}
                                tabIndex={-1}
                                autoComplete="off"
                                className="hidden"
                                onChange={(e) => setData('honeypot', e.target.value)}
                            />

                            <AnimatePresence mode="wait">
                                {/* STEP 1: CLINIC PROFILE */}
                                {step === 1 && (
                                    <motion.div
                                        key="step1"
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 12 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-1">
                                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                                <Building2 className="w-5 h-5 text-primary" />
                                                Clinic details
                                            </h2>
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                                Tell us about your medical practice in Sri Lanka.
                                            </p>
                                        </div>

                                        {/* Clinic Name */}
                                        <div>
                                            <label htmlFor="clinic_name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                Clinic name <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                ref={clinicNameRef}
                                                id="clinic_name"
                                                type="text"
                                                value={data.clinic_name}
                                                placeholder="e.g. Ruhunu Medical Centre"
                                                autoFocus
                                                onChange={(e) => {
                                                    setData('clinic_name', e.target.value);
                                                    clearErrors('clinic_name');
                                                }}
                                                className={`w-full h-12 px-3.5 rounded-xl border bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all duration-150 ${
                                                    errors.clinic_name
                                                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                                                        : 'border-slate-300 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20'
                                                }`}
                                            />
                                            {errors.clinic_name && (
                                                <p className="mt-1 text-xs text-rose-500 font-medium">{errors.clinic_name}</p>
                                            )}
                                        </div>

                                        {/* Clinic Type & District */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="clinic_type" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                    Clinic type <span className="text-rose-500">*</span>
                                                </label>
                                                <select
                                                    ref={clinicTypeRef}
                                                    id="clinic_type"
                                                    value={data.clinic_type}
                                                    onChange={(e) => setData('clinic_type', e.target.value)}
                                                    className="w-full h-12 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                >
                                                    {clinicTypes.map((type) => (
                                                        <option key={type} value={type}>
                                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label htmlFor="district" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                    District <span className="text-rose-500">*</span>
                                                </label>
                                                <select
                                                    ref={districtRef}
                                                    id="district"
                                                    value={data.district}
                                                    onChange={(e) => setData('district', e.target.value)}
                                                    className="w-full h-12 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                                                >
                                                    {districts.map((d) => (
                                                        <option key={d} value={d}>
                                                            {d}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* City & Phone */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="city" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                    Town / City <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    ref={cityRef}
                                                    id="city"
                                                    type="text"
                                                    value={data.city}
                                                    placeholder="e.g. Matara"
                                                    onChange={(e) => {
                                                        setData('city', e.target.value);
                                                        clearErrors('city');
                                                    }}
                                                    className={`w-full h-12 px-3.5 rounded-xl border bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all duration-150 ${
                                                        errors.city
                                                            ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                                                            : 'border-slate-300 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20'
                                                    }`}
                                                />
                                                {errors.city && (
                                                    <p className="mt-1 text-xs text-rose-500 font-medium">{errors.city}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label htmlFor="clinic_phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                    Clinic phone <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="flex h-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                                    <span className="flex items-center px-3 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 select-none">
                                                        +94
                                                    </span>
                                                    <input
                                                        ref={clinicPhoneRef}
                                                        id="clinic_phone"
                                                        type="tel"
                                                        value={data.clinic_phone}
                                                        placeholder="77 123 4567"
                                                        onChange={(e) => handlePhoneChange('clinic_phone', e.target.value)}
                                                        className="w-full px-3 text-sm font-medium text-slate-900 dark:text-white bg-transparent outline-none"
                                                    />
                                                </div>
                                                {errors.clinic_phone && (
                                                    <p className="mt-1 text-xs text-rose-500 font-medium">{errors.clinic_phone}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Street Address */}
                                        <div>
                                            <label htmlFor="address" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                Street address <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                ref={addressRef}
                                                id="address"
                                                type="text"
                                                value={data.address}
                                                placeholder="e.g. 45 Beach Road"
                                                onChange={(e) => {
                                                    setData('address', e.target.value);
                                                    clearErrors('address');
                                                }}
                                                className={`w-full h-12 px-3.5 rounded-xl border bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all duration-150 ${
                                                    errors.address
                                                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                                                        : 'border-slate-300 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20'
                                                }`}
                                            />
                                            {errors.address && (
                                                <p className="mt-1 text-xs text-rose-500 font-medium">{errors.address}</p>
                                            )}
                                        </div>

                                        {/* Continue Button */}
                                        <div className="pt-4 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={handleProceedStep1}
                                                className="w-full sm:w-auto h-12 px-7 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <span>Continue</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 2: WEB ADDRESS */}
                                {step === 2 && (
                                    <motion.div
                                        key="step2"
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 12 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-1">
                                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                                <Globe className="w-5 h-5 text-primary" />
                                                Web address
                                            </h2>
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                                Choose the dedicated address your clinic team and patients will use.
                                            </p>
                                        </div>

                                        <div>
                                            <label htmlFor="subdomain" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                Clinic web address <span className="text-rose-500">*</span>
                                            </label>

                                            <div className="flex h-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                                <span className="flex items-center px-3.5 bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400 border-r border-slate-200 dark:border-slate-700 select-none">
                                                    https://
                                                </span>
                                                <input
                                                    ref={subdomainRef}
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
                                                        clearErrors('subdomain');
                                                    }}
                                                    className="w-full px-3 text-sm font-semibold text-slate-900 dark:text-white bg-transparent outline-none"
                                                />
                                                <span className="flex items-center px-3.5 bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400 border-l border-slate-200 dark:border-slate-700 select-none">
                                                    .{publicDomain}
                                                </span>
                                            </div>

                                            {/* Subdomain status / suggestions */}
                                            <div className="mt-2 text-xs">
                                                {checkingSubdomain && (
                                                    <span className="text-slate-500 flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 animate-spin" />
                                                        Checking address availability...
                                                    </span>
                                                )}

                                                {!checkingSubdomain && subdomainResult && (
                                                    <>
                                                        {subdomainResult.available ? (
                                                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                                                <Check className="w-3.5 h-3.5" />
                                                                <strong>{data.subdomain}.{publicDomain}</strong> is available!
                                                            </span>
                                                        ) : (
                                                            <div className="space-y-1.5">
                                                                <span className="text-rose-500 font-medium flex items-center gap-1">
                                                                    <AlertCircle className="w-3.5 h-3.5" />
                                                                    {subdomainResult.reason || 'Address unavailable.'}
                                                                </span>

                                                                {subdomainResult.suggestions && subdomainResult.suggestions.length > 0 && (
                                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                                        <span className="text-slate-500 text-[11px]">Try instead:</span>
                                                                        {subdomainResult.suggestions.map((sug) => (
                                                                            <button
                                                                                key={sug}
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setData('subdomain', sug);
                                                                                    clearErrors('subdomain');
                                                                                }}
                                                                                className="px-2 py-0.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-mono text-xs font-semibold cursor-pointer"
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

                                                {errors.subdomain && (
                                                    <p className="mt-1 text-rose-500 font-medium">{errors.subdomain}</p>
                                                )}
                                            </div>

                                            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                                                3 to 30 characters. Use lowercase letters, numbers, and hyphens.
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="pt-4 flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                className="h-12 px-4 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                                <span>Back</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleProceedStep2}
                                                className="h-12 px-7 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer"
                                            >
                                                <span>Continue</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 3: ADMIN ACCOUNT */}
                                {step === 3 && (
                                    <motion.div
                                        key="step3"
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 12 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-1">
                                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                                <UserCheck className="w-5 h-5 text-primary" />
                                                Admin account
                                            </h2>
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                                Create your clinic administrator login credentials.
                                            </p>
                                        </div>

                                        {/* Admin Name */}
                                        <div>
                                            <label htmlFor="name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                Administrator name <span className="text-rose-500">*</span>
                                            </label>
                                            <input
                                                ref={adminNameRef}
                                                id="name"
                                                type="text"
                                                value={data.name}
                                                placeholder="e.g. Dr. Kasun Bandara"
                                                autoFocus
                                                onChange={(e) => {
                                                    setData('name', e.target.value);
                                                    clearErrors('name');
                                                }}
                                                className={`w-full h-12 px-3.5 rounded-xl border bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all duration-150 ${
                                                    errors.name
                                                        ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                                                        : 'border-slate-300 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20'
                                                }`}
                                            />
                                            {errors.name && (
                                                <p className="mt-1 text-xs text-rose-500 font-medium">{errors.name}</p>
                                            )}
                                        </div>

                                        {/* Email & Mobile */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="email" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                    Work email <span className="text-rose-500">*</span>
                                                </label>
                                                <input
                                                    ref={emailRef}
                                                    id="email"
                                                    type="email"
                                                    value={data.email}
                                                    placeholder="doctor@clinic.lk"
                                                    onChange={(e) => {
                                                        setData('email', e.target.value);
                                                        clearErrors('email');
                                                    }}
                                                    className={`w-full h-12 px-3.5 rounded-xl border bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all duration-150 ${
                                                        errors.email
                                                            ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                                                            : 'border-slate-300 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20'
                                                    }`}
                                                />
                                                {errors.email && (
                                                    <p className="mt-1 text-xs text-rose-500 font-medium">{errors.email}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label htmlFor="mobile" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                    Mobile phone <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="flex h-12 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
                                                    <span className="flex items-center px-3 bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-700 select-none">
                                                        +94
                                                    </span>
                                                    <input
                                                        ref={mobileRef}
                                                        id="mobile"
                                                        type="tel"
                                                        value={data.mobile}
                                                        placeholder="77 123 4567"
                                                        onChange={(e) => handlePhoneChange('mobile', e.target.value)}
                                                        className="w-full px-3 text-sm font-medium text-slate-900 dark:text-white bg-transparent outline-none"
                                                    />
                                                </div>
                                                {errors.mobile && (
                                                    <p className="mt-1 text-xs text-rose-500 font-medium">{errors.mobile}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Password & Confirm */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="password" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                    Password <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        ref={passwordRef}
                                                        id="password"
                                                        type={showPassword ? 'text' : 'password'}
                                                        value={data.password}
                                                        placeholder="••••••••••••"
                                                        onChange={(e) => {
                                                            setData('password', e.target.value);
                                                            clearErrors('password');
                                                        }}
                                                        className={`w-full h-12 pl-3.5 pr-10 rounded-xl border bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all duration-150 ${
                                                            errors.password
                                                                ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                                                                : 'border-slate-300 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20'
                                                        }`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                                        title={showPassword ? 'Hide password' : 'Show password'}
                                                    >
                                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>

                                                {/* Password Strength Meter */}
                                                {data.password ? (
                                                    <div className="mt-2 space-y-1">
                                                        <div className="flex items-center gap-1.5 h-1.5 w-full">
                                                            {[1, 2, 3, 4].map((seg) => (
                                                                <div
                                                                    key={seg}
                                                                    className={`h-full flex-1 rounded-full transition-all duration-300 ${
                                                                        seg <= passwordStrength.score
                                                                            ? passwordStrength.color
                                                                            : 'bg-slate-200 dark:bg-slate-800'
                                                                    }`}
                                                                />
                                                            ))}
                                                        </div>
                                                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                                                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                                                                Strength:{' '}
                                                                <strong className={`font-bold ${passwordStrength.textColor}`}>
                                                                    {passwordStrength.label}
                                                                </strong>
                                                            </span>
                                                            <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                                                                Min 8 chars, mixed case & numbers
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                                                        Min 8 characters with numbers & mixed case.
                                                    </p>
                                                )}

                                                {errors.password && (
                                                    <p className="mt-1 text-xs text-rose-500 font-medium">{errors.password}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label htmlFor="password_confirmation" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                    Confirm password <span className="text-rose-500">*</span>
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        ref={passwordConfirmRef}
                                                        id="password_confirmation"
                                                        type={showConfirmPassword ? 'text' : 'password'}
                                                        value={data.password_confirmation}
                                                        placeholder="••••••••••••"
                                                        onChange={(e) => {
                                                            setData('password_confirmation', e.target.value);
                                                            clearErrors('password_confirmation');
                                                        }}
                                                        className={`w-full h-12 pl-3.5 pr-10 rounded-xl border bg-white dark:bg-slate-950 text-sm font-medium text-slate-900 dark:text-white outline-none transition-all duration-150 ${
                                                            passwordsMismatch || errors.password_confirmation
                                                                ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                                                                : passwordsMatch
                                                                ? 'border-emerald-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
                                                                : 'border-slate-300 dark:border-slate-700 focus:border-primary focus:ring-2 focus:ring-primary/20'
                                                        }`}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                                        title={showConfirmPassword ? 'Hide password' : 'Show password'}
                                                    >
                                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                    </button>
                                                </div>

                                                {/* Password Matching Warning / Success */}
                                                {passwordsMismatch && (
                                                    <div className="flex items-center gap-1.5 mt-2 text-xs text-rose-500 font-semibold">
                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                                        <span>Passwords do not match</span>
                                                    </div>
                                                )}
                                                {passwordsMatch && (
                                                    <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                                                        <Check className="w-3.5 h-3.5 shrink-0" />
                                                        <span>Passwords match</span>
                                                    </div>
                                                )}
                                                {!hasTypedConfirm && errors.password_confirmation && (
                                                    <p className="mt-1 text-xs text-rose-500 font-medium">{errors.password_confirmation}</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Terms Checkbox */}
                                        <div className="pt-1">
                                            <label className="flex items-start gap-2.5 cursor-pointer">
                                                <input
                                                    ref={termsRef}
                                                    type="checkbox"
                                                    checked={data.terms}
                                                    onChange={(e) => {
                                                        setData('terms', e.target.checked);
                                                        clearErrors('terms');
                                                    }}
                                                    className="w-4 h-4 mt-0.5 rounded border-slate-300 text-primary focus:ring-primary/20"
                                                />
                                                <span className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                                    I accept the{' '}
                                                    <Link href="/terms" target="_blank" className="text-primary font-bold hover:underline">
                                                        Terms and Conditions
                                                    </Link>{' '}
                                                    and{' '}
                                                    <Link href="/privacy-policy" target="_blank" className="text-primary font-bold hover:underline">
                                                        Privacy Policy
                                                    </Link>
                                                    .
                                                </span>
                                            </label>
                                            {errors.terms && (
                                                <p className="mt-1 text-xs text-rose-500 font-medium">{errors.terms}</p>
                                            )}
                                        </div>

                                        {otpError && (
                                            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                                                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                                                <span>{otpError}</span>
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="pt-4 flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setStep(2)}
                                                className="h-12 px-4 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                                <span>Back</span>
                                            </button>

                                            <button
                                                type="button"
                                                disabled={sendingCode}
                                                onClick={handleSendCode}
                                                className="h-12 px-7 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-60"
                                            >
                                                {sendingCode ? (
                                                    <>
                                                        <RotateCw className="w-4 h-4 animate-spin" />
                                                        <span>Sending Code...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Continue to Verification</span>
                                                        <ArrowRight className="w-4 h-4" />
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 4: VERIFY EMAIL */}
                                {step === 4 && (
                                    <motion.div
                                        key="step4"
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 12 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-1">
                                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                                <Mail className="w-5 h-5 text-primary" />
                                                Verify email
                                            </h2>
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                                We sent a 6-digit confirmation code to{' '}
                                                <strong className="text-slate-900 dark:text-white font-mono font-bold">
                                                    {data.email}
                                                </strong>
                                                .
                                            </p>
                                        </div>

                                        {devCode && (
                                            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
                                                <span>Dev Code: <strong className="font-mono font-bold">{devCode}</strong></span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const parts = devCode.split('');
                                                        setDigits(parts);
                                                        handleVerifyCode(devCode);
                                                    }}
                                                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 font-semibold cursor-pointer text-[11px]"
                                                >
                                                    Auto-fill
                                                </button>
                                            </div>
                                        )}

                                        {/* 6-Digit OTP Boxes */}
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
                                                        maxLength={1}
                                                        value={digit}
                                                        disabled={isLocked || isVerified}
                                                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                                                        onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                                                        className={`w-11 h-14 sm:w-13 sm:h-16 text-center font-mono font-black text-2xl sm:text-3xl rounded-2xl border transition-all duration-200 outline-none select-all ${
                                                            digit
                                                                ? 'border-primary bg-primary/5 text-primary-700 dark:text-primary-300 ring-2 ring-primary/20'
                                                                : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white'
                                                        } ${
                                                            isLocked ? 'opacity-50 cursor-not-allowed' : 'focus:border-primary focus:ring-4 focus:ring-primary/20'
                                                        }`}
                                                        aria-label={`Digit ${idx + 1}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* OTP status messages */}
                                        {otpError && (
                                            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                                    <span>{otpError}</span>
                                                </div>
                                                {isLocked && (
                                                    <button
                                                        type="button"
                                                        onClick={handleResendCode}
                                                        className="font-bold underline cursor-pointer shrink-0"
                                                    >
                                                        Request new code
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {otpSuccess && (
                                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2 justify-center">
                                                <Check className="w-4 h-4 text-emerald-500" />
                                                <span className="font-semibold">{otpSuccess}</span>
                                            </div>
                                        )}

                                        {/* Timer countdown & Resend */}
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
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
                                                    <span className="text-rose-500 font-bold">Code has expired</span>
                                                )}
                                            </div>

                                            <button
                                                type="button"
                                                disabled={resendCooldown > 0 || resendingCode}
                                                onClick={handleResendCode}
                                                className="font-bold text-xs text-primary hover:underline disabled:text-slate-400 disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
                                            >
                                                {resendingCode ? (
                                                    <span>Resending...</span>
                                                ) : resendCooldown > 0 ? (
                                                    <span>Resend code in {resendCooldown}s</span>
                                                ) : (
                                                    <span>Resend code</span>
                                                )}
                                            </button>
                                        </div>

                                        {/* Actions */}
                                        <div className="pt-4 flex items-center justify-between border-t border-slate-200/80 dark:border-white/10">
                                            <button
                                                type="button"
                                                onClick={() => setStep(3)}
                                                className="h-12 px-4 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                                <span>Back</span>
                                            </button>

                                            <button
                                                type="button"
                                                disabled={digits.join('').length !== 6 || verifyingCode || isLocked}
                                                onClick={() => handleVerifyCode()}
                                                className="h-12 px-7 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 shadow-md shadow-primary/25 hover:shadow-lg transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                            >
                                                {verifyingCode ? (
                                                    <>
                                                        <RotateCw className="w-4 h-4 animate-spin" />
                                                        <span>Verifying...</span>
                                                    </>
                                                ) : isVerified ? (
                                                    <>
                                                        <Check className="w-4 h-4" />
                                                        <span>Verified</span>
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

                                {/* STEP 5: REVIEW & LAUNCH */}
                                {step === 5 && (
                                    <motion.div
                                        key="step5"
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 12 }}
                                        transition={{ duration: 0.2 }}
                                        className="space-y-4"
                                    >
                                        <div className="space-y-1">
                                            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                                Launch clinic
                                            </h2>
                                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                                Your email is confirmed. Review your clinic details and launch your workspace.
                                            </p>
                                        </div>

                                        {/* Summary Cards with Edit Actions */}
                                        <div className="space-y-2.5">
                                            {/* Clinic Details */}
                                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 flex items-start justify-between">
                                                <div className="space-y-0.5 text-xs">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                                                        1. Clinic details
                                                    </span>
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                                                        {data.clinic_name}
                                                    </p>
                                                    <p className="text-slate-500 dark:text-slate-400 capitalize">
                                                        {data.clinic_type} • {data.district} District
                                                    </p>
                                                    <p className="text-slate-500 dark:text-slate-400">
                                                        {data.address}, {data.city} (+94 {data.clinic_phone})
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

                                            {/* Web Address */}
                                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 flex items-start justify-between">
                                                <div className="space-y-0.5 text-xs">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0E9E8F]">
                                                        2. Web address
                                                    </span>
                                                    <p className="font-mono font-bold text-sm text-primary">
                                                        https://{data.subdomain}.{publicDomain}
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

                                            {/* Admin Details */}
                                            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/10 flex items-start justify-between">
                                                <div className="space-y-0.5 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
                                                            3. Admin account
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                                                            <Check className="w-3 h-3 text-emerald-600" />
                                                            Verified
                                                        </span>
                                                    </div>
                                                    <p className="font-bold text-sm text-slate-900 dark:text-white">
                                                        {data.name}
                                                    </p>
                                                    <p className="text-slate-500 dark:text-slate-400">
                                                        {data.email} • +94 {data.mobile}
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

                                        {/* Actions */}
                                        <div className="pt-4 flex items-center justify-between">
                                            <button
                                                type="button"
                                                disabled={processing}
                                                onClick={() => setStep(4)}
                                                className="h-12 px-4 rounded-xl font-semibold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <ArrowLeft className="w-4 h-4" />
                                                <span>Back</span>
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={processing || !data.registration_token}
                                                className="h-12 px-8 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary via-primary-600 to-secondary hover:shadow-xl shadow-lg shadow-primary/30 transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                            >
                                                {processing ? (
                                                    <>
                                                        <RotateCw className="w-4 h-4 animate-spin" />
                                                        <span>Creating Clinic...</span>
                                                    </>
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

                    {/* Friendly One-line Reassurance Under Form */}
                    <div className="px-2 text-center">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            You can change these details later in Settings.
                        </p>
                    </div>
                </div>

                {/* Right Column: Evolving Interactive Live Preview (Desktop ≥1024px) */}
                <div className="hidden lg:block lg:col-span-6 xl:col-span-6 sticky top-20">
                    <LiveClinicPreview
                        step={step}
                        clinicName={data.clinic_name}
                        clinicType={data.clinic_type}
                        district={data.district}
                        city={data.city}
                        clinicPhone={data.clinic_phone}
                        subdomain={data.subdomain}
                        adminName={data.name}
                        adminEmail={data.email}
                        adminMobile={data.mobile}
                        checkingSubdomain={checkingSubdomain}
                        subdomainResult={subdomainResult}
                        isVerified={isVerified}
                        publicDomain={publicDomain}
                    />
                </div>
            </main>

            {/* Footer */}
            <LegalFooter className="mt-8 border-t border-slate-200/80 dark:border-white/10" />
        </div>
    );
}
