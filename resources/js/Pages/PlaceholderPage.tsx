import React from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    LayoutDashboard,
    Calendar,
    Users,
    Receipt,
    Settings,
    Clock,
    Ticket,
    Stethoscope,
    Globe,
    UserCheck,
    Tv,
    ArrowRight,
    Sparkles,
    CheckCircle2,
} from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';

interface PlaceholderPageProps {
    title: string;
    description: string;
    moduleKey: string;
    badge?: string;
    features?: string[];
}

const moduleIcons: Record<string, React.ElementType> = {
    calendar: Calendar,
    bookings: Ticket,
    doctors: Stethoscope,
    patients: Users,
    billing: Receipt,
    website: Globe,
    staff: UserCheck,
    settings: Settings,
    today_queue: Clock,
    tv_queue: Tv,
};

export default function PlaceholderPage({
    title,
    description,
    moduleKey,
    badge = 'Coming in the next update',
    features = [],
}: PlaceholderPageProps) {
    const Icon = moduleIcons[moduleKey] || Sparkles;

    return (
        <AuthenticatedLayout>
            <Head title={`${title} • MedVisit`} />

            <div className="space-y-6 max-w-5xl">
                {/* Header with Title and Status */}
                <PageHeader
                    title={title}
                    subtitle={description}
                    action={
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                <Sparkles className="w-3.5 h-3.5" />
                                {badge}
                            </span>
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                            >
                                <LayoutDashboard className="w-3.5 h-3.5" />
                                <span>Dashboard</span>
                            </Link>
                        </div>
                    }
                />

                {/* Hero Feature Showcase Card */}
                <GlassCard className="p-8 sm:p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-primary-500/10 blur-3xl pointer-events-none" />

                    <div className="max-w-2xl space-y-6">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-primary-600 to-secondary-500 text-white flex items-center justify-center shadow-lg shadow-primary-500/20">
                            <Icon className="w-7 h-7" />
                        </div>

                        <div>
                            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                {title}
                            </h2>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                                {description}
                            </p>
                        </div>

                        {features.length > 0 && (
                            <div className="pt-4 border-t border-slate-200/70 dark:border-white/10 space-y-3">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Planned Capabilities in this Module
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {features.map((feat, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 text-xs text-slate-700 dark:text-slate-300 font-medium"
                                        >
                                            <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                            <span>{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-2 flex items-center gap-3">
                            <Link
                                href="/dashboard"
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-primary hover:bg-primary-600 transition-all shadow-md shadow-primary/20"
                            >
                                <span>Return to Clinical Dashboard</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>
                    </div>
                </GlassCard>
            </div>
        </AuthenticatedLayout>
    );
}
