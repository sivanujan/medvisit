import React, { FormEventHandler, useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';
import {
    CheckCircle2,
    ShieldCheck,
    Lock,
    User,
    Mail,
    Eye,
    EyeOff,
    Stethoscope,
    ArrowRight,
    Loader2,
    Shield,
    AlertCircle,
} from 'lucide-react';

interface Props {
    invitation: {
        token: string;
        name: string;
        email: string;
        role: string;
        role_label: string;
    };
    clinicName: string;
}

export default function AcceptInvitation({ invitation, clinicName }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const { data, setData, post, processing, errors } = useForm({
        name: invitation.name,
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(`/invitation/accept/${invitation.token}`);
    };

    const hasMinLength = data.password.length >= 8;
    const passwordsMatch = data.password && data.password === data.password_confirmation;
    const isDoctor = invitation.role.toLowerCase().includes('doctor');

    return (
        <GuestLayout>
            <Head title={`Join ${clinicName} - MedVisit`} />

            <div className="space-y-6">
                {/* Header with Glowing Icon & Clinic Branding */}
                <div className="text-center">
                    <div className="relative mx-auto w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-primary-500/20 via-primary-500/10 to-secondary-500/20 border border-primary-500/30 flex items-center justify-center shadow-lg shadow-primary-500/15 mb-3 group">
                        <div className="absolute inset-0 rounded-2xl bg-primary-500/20 blur-md -z-10 group-hover:blur-lg transition-all" />
                        {isDoctor ? (
                            <Stethoscope className="w-7 h-7 sm:w-8 sm:h-8 text-primary dark:text-primary-400" />
                        ) : (
                            <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 text-primary dark:text-primary-400" />
                        )}
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                        Join {clinicName}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 max-w-sm mx-auto leading-relaxed">
                        You've been invited to join the clinic team as a{' '}
                        <span className="font-semibold text-primary dark:text-primary-300 px-2 py-0.5 rounded-md bg-primary-50 dark:bg-primary-950/60 border border-primary-200 dark:border-primary-800/40 inline-flex items-center gap-1">
                            {isDoctor && <Stethoscope className="w-3 h-3 inline-block" />}
                            {invitation.role_label}
                        </span>
                        . Choose your password to activate your account.
                    </p>
                </div>

                {/* Verified Invitation Banner */}
                <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-950/60 border border-slate-200/90 dark:border-white/10 text-xs flex items-center justify-between gap-3 shadow-sm backdrop-blur-md">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center shrink-0 text-primary dark:text-primary-400">
                            <Mail className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
                                Invited Email
                            </span>
                            <span className="font-bold text-slate-900 dark:text-white truncate block">
                                {invitation.email}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-primary-100 dark:bg-primary-950/80 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/50">
                            {invitation.role_label}
                        </span>
                    </div>
                </div>

                {/* Account Setup Form */}
                <form onSubmit={submit} className="space-y-4">
                    {/* Full Name */}
                    <div>
                        <label
                            htmlFor="name"
                            className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1.5"
                        >
                            Your Full Name <span className="text-accent">*</span>
                        </label>
                        <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                                <User className="w-4 h-4" />
                            </div>
                            <input
                                id="name"
                                type="text"
                                name="name"
                                value={data.name}
                                spellCheck={false}
                                autoComplete="name"
                                autoFocus
                                required
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder="Enter your full legal name"
                                className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none
                                    bg-white/90 hover:bg-white focus:bg-white dark:bg-slate-950/60 dark:hover:bg-slate-950/80 dark:focus:bg-slate-950/90
                                    text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500
                                    backdrop-blur-md
                                    border ${
                                        errors.name
                                            ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                                            : 'border-slate-200/90 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/15'
                                    }
                                    shadow-xs`}
                            />
                        </div>
                        {errors.name && (
                            <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{errors.name}</span>
                            </p>
                        )}
                    </div>

                    {/* Choose Password */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label
                                htmlFor="password"
                                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                            >
                                Choose Password <span className="text-accent">*</span>
                            </label>
                            {data.password && (
                                <span
                                    className={`text-[10px] font-semibold flex items-center gap-1 ${
                                        hasMinLength
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-amber-500'
                                    }`}
                                >
                                    {hasMinLength ? '✓ 8+ chars' : 'At least 8 chars'}
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                                <Lock className="w-4 h-4" />
                            </div>
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={data.password}
                                autoComplete="new-password"
                                required
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder="Create a strong password"
                                className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none
                                    bg-white/90 hover:bg-white focus:bg-white dark:bg-slate-950/60 dark:hover:bg-slate-950/80 dark:focus:bg-slate-950/90
                                    text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500
                                    backdrop-blur-md
                                    border ${
                                        errors.password
                                            ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                                            : 'border-slate-200/90 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/15'
                                    }
                                    shadow-xs`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-1"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        {errors.password && (
                            <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{errors.password}</span>
                            </p>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label
                                htmlFor="password_confirmation"
                                className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300"
                            >
                                Confirm Password <span className="text-accent">*</span>
                            </label>
                            {data.password_confirmation && (
                                <span
                                    className={`text-[10px] font-semibold flex items-center gap-1 ${
                                        passwordsMatch
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-amber-500'
                                    }`}
                                >
                                    {passwordsMatch ? '✓ Matches' : 'Must match'}
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none">
                                <Lock className="w-4 h-4" />
                            </div>
                            <input
                                id="password_confirmation"
                                type={showConfirmPassword ? 'text' : 'password'}
                                name="password_confirmation"
                                value={data.password_confirmation}
                                autoComplete="new-password"
                                required
                                onChange={(e) => setData('password_confirmation', e.target.value)}
                                placeholder="Re-enter your password"
                                className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none
                                    bg-white/90 hover:bg-white focus:bg-white dark:bg-slate-950/60 dark:hover:bg-slate-950/80 dark:focus:bg-slate-950/90
                                    text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500
                                    backdrop-blur-md
                                    border ${
                                        errors.password_confirmation
                                            ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                                            : 'border-slate-200/90 dark:border-white/10 focus:border-primary focus:ring-4 focus:ring-primary/15'
                                    }
                                    shadow-xs`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer p-1"
                                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                                {showConfirmPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        {errors.password_confirmation && (
                            <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                <span>{errors.password_confirmation}</span>
                            </p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={processing}
                        className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-primary-600 via-primary to-secondary-600 hover:from-primary-700 hover:to-secondary-700 shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
                    >
                        {processing ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Activating Workspace Account...</span>
                            </>
                        ) : (
                            <>
                                <span>Set Password & Enter Workspace</span>
                                <ArrowRight className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>

                {/* Trust and Compliance Footer Note */}
                <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex items-center justify-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                    <Shield className="w-3 h-3 text-emerald-500 shrink-0" />
                    <span>Protected by 256-bit SSL • HIPAA & Sri Lanka Healthcare Compliant</span>
                </div>
            </div>
        </GuestLayout>
    );
}

