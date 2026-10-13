import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import { motion } from 'framer-motion';
import {
    AlertTriangle,
    Shield,
    Phone,
    Mail,
    MessageSquare,
    LogOut,
    CheckCircle2,
    Calendar,
    ArrowRight,
} from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';

interface Props {
    tenant: {
        id: string;
        name: string;
        subdomain: string;
        status: string;
        plan: string;
        trial_ends_at?: string;
        is_expired: boolean;
        is_suspended: boolean;
    };
    support: {
        email: string;
        phone: string;
        whatsapp: string;
        billingUrl: string;
    };
}

export default function SuspendedOrExpired({ tenant, support }: Props) {
    const handleLogout = () => {
        router.post('/logout');
    };

    const isExpired = tenant.is_expired;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between relative selection:bg-primary-100 selection:text-primary-800 overflow-hidden">
            <Head title={`Account Notice • ${tenant.name}`} />

            {/* Ambient Background Glow */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-amber-500/15 dark:bg-amber-500/20 blur-3xl" />
                <div className="absolute top-1/2 -right-32 w-[32rem] h-[32rem] rounded-full bg-primary-500/15 dark:bg-primary-500/20 blur-3xl" />
            </div>

            {/* Header */}
            <header className="h-18 px-4 sm:px-8 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between bg-white/60 dark:bg-slate-900/50 backdrop-blur-xl">
                <div className="flex items-center gap-3">
                    <ApplicationLogo className="h-8 sm:h-9 w-auto" />
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                        {isExpired ? 'Trial Concluded' : 'Account Suspended'}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    <ThemeToggle size="sm" />
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                    >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </header>

            {/* Main Content Card */}
            <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, scale: 0.97, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="w-full p-6 sm:p-10 rounded-3xl bg-white/85 dark:bg-slate-900/75 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl space-y-6 text-center"
                >
                    {/* Notice Icon */}
                    <div className="flex justify-center">
                        <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-lg shadow-amber-500/10">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                    </div>

                    {/* Headline */}
                    <div className="space-y-1.5">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            {isExpired
                                ? `${tenant.name} Free Trial has Concluded`
                                : `${tenant.name} Workspace Access is Paused`}
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                            {isExpired
                                ? `The 14-day trial period for this clinic ended${tenant.trial_ends_at ? ` on ${tenant.trial_ends_at}` : ''}. Upgrade your plan to restore real-time queue and consultation features.`
                                : 'Access to this clinic workspace is temporarily paused. Please reach out to our team to quickly reactivate your account.'}
                        </p>
                    </div>

                    {/* Safe Data Guarantee Card */}
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left flex items-start gap-3 text-xs text-emerald-800 dark:text-emerald-300">
                        <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                            <strong className="block font-bold">
                                Your Patient Data & Records are Safe
                            </strong>
                            <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 mt-0.5">
                                All electronic medical records, token histories, patient details, and clinic configurations remain encrypted and securely preserved in your tenant database.
                            </p>
                        </div>
                    </div>

                    {/* Contact MedVisit Options */}
                    <div className="space-y-2 text-left">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                            Quick Reactivation Channels (Sri Lanka)
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <a
                                href={`tel:${support.phone.replace(/\s+/g, '')}`}
                                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 hover:border-primary/40 transition-colors flex flex-col items-center text-center gap-1.5 group"
                            >
                                <Phone className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                    Direct Call
                                </span>
                                <span className="text-[10px] text-slate-400">{support.phone}</span>
                            </a>

                            <a
                                href={`https://wa.me/${support.whatsapp.replace(/\D/g, '')}?text=Hello%20MedVisit%20Team%2C%20I%20would%20like%20to%20activate%20clinic%20${tenant.subdomain}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 hover:border-emerald-500/40 transition-colors flex flex-col items-center text-center gap-1.5 group"
                            >
                                <MessageSquare className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                    WhatsApp Support
                                </span>
                                <span className="text-[10px] text-slate-400">{support.whatsapp}</span>
                            </a>

                            <a
                                href={`mailto:${support.email}?subject=Reactivation%20Request%20for%20${tenant.name}%20(${tenant.subdomain})`}
                                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 hover:border-secondary/40 transition-colors flex flex-col items-center text-center gap-1.5 group"
                            >
                                <Mail className="w-5 h-5 text-secondary group-hover:scale-110 transition-transform" />
                                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                                    Email Billing
                                </span>
                                <span className="text-[10px] text-slate-400">{support.email}</span>
                            </a>
                        </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-2">
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full py-3 px-4 rounded-xl font-bold text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Return to Sign In</span>
                        </button>
                    </div>
                </motion.div>
            </main>

            {/* Footer */}
            <footer className="py-4 text-center text-xs text-slate-400 dark:text-slate-600 border-t border-slate-200/50 dark:border-white/5">
                MedVisit Support • Colombo, Sri Lanka • Mon–Sat 8:00 AM – 8:00 PM IST
            </footer>
        </div>
    );
}
