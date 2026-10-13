import React from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Calendar,
    Users,
    Receipt,
    Clock,
    Activity,
    ArrowRight,
    Sparkles,
    Layers,
    Stethoscope,
    AlertCircle,
} from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import { StatusBadge } from '@/Components/UI/StatusBadge';
import { formatLKR, formatDate } from '@/Utils/formatters';

export default function Dashboard() {
    return (
        <AuthenticatedLayout>
            <Head title="Clinical Dashboard" />

            <PageHeader
                eyebrow="Clinical Workspace"
                title="Practice Overview"
                subtitle="Real-time consultation monitor, queue metrics, and clinic operations."
                actions={
                    <Link
                        href="/dev/components"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-primary dark:text-primary-300 bg-primary-50 dark:bg-primary-950/60 border border-primary-200/80 dark:border-primary-800/50 hover:bg-primary-100 transition-colors shadow-xs"
                    >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Inspect UI Component Showcase</span>
                    </Link>
                }
            />

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <GlassCard hover className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Today's Patients
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary flex items-center justify-center">
                            <Users className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                        28
                    </p>
                    <p className="text-xs text-secondary font-semibold mt-1 flex items-center gap-1">
                        <span>&uarr; 12%</span>
                        <span className="text-slate-400 font-normal">vs yesterday</span>
                    </p>
                </GlassCard>

                <GlassCard hover className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Active Queue
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                        6
                    </p>
                    <div className="mt-1">
                        <StatusBadge status="waiting" label="Lobby Wait: ~18m" />
                    </div>
                </GlassCard>

                <GlassCard hover className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Active Session
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-secondary-50 dark:bg-secondary-950/60 text-secondary flex items-center justify-center">
                            <Stethoscope className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-2 truncate">
                        Dr. K. Sivanujan
                    </p>
                    <div className="mt-1">
                        <StatusBadge status="in_consultation" pulse label="Room 02 &bull; Token #14" />
                    </div>
                </GlassCard>

                <GlassCard hover className="p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Today's Collections
                        </span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                            <Receipt className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                        {formatLKR(4850000)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        18 invoices settled
                    </p>
                </GlassCard>
            </div>

            {/* Quick Action Banner */}
            <GlassCard className="p-6 border-l-4 border-l-primary flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-primary-100 dark:bg-primary-950/80 text-primary flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                            MedVisit Design System &amp; Component Suite Active
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                            All components are adapted to MedVisit brand tokens (Primary #1E6FD9, Secondary #0E9E8F, Accent #FF7A59) with glass surfaces and dark mode.
                        </p>
                    </div>
                </div>

                <Link
                    href="/dev/components"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-primary hover:bg-primary-600 transition-colors shrink-0 shadow-sm shadow-primary/30"
                >
                    <span>Open Showcase</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                </Link>
            </GlassCard>
        </AuthenticatedLayout>
    );
}
