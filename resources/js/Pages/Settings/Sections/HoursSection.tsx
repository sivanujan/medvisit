import React from 'react';
import { Link } from '@inertiajs/react';
import { Clock, Calendar, ExternalLink, CheckCircle2, Sparkles } from 'lucide-react';
import LivePreviewPanel from '../Components/LivePreviewPanel';
import { ClinicProfileData } from '../types';

interface Props {
    profile: ClinicProfileData;
}

export default function HoursSection({ profile }: Props) {
    const days = [
        { name: 'Monday', hours: '8:00 AM – 9:00 PM', open: true },
        { name: 'Tuesday', hours: '8:00 AM – 9:00 PM', open: true },
        { name: 'Wednesday', hours: '8:00 AM – 9:00 PM', open: true },
        { name: 'Thursday', hours: '8:00 AM – 9:00 PM', open: true },
        { name: 'Friday', hours: '8:00 AM – 9:00 PM', open: true },
        { name: 'Saturday', hours: '8:00 AM – 9:00 PM', open: true },
        { name: 'Sunday', hours: '8:00 AM – 2:00 PM', open: true },
    ];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Opening hours & working schedule
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Manage your clinic working hours for walk-in reception and public channeling appointments.
                    </p>
                </div>

                <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-2.5">
                            <Clock className="w-4 h-4 text-[#1E6FD9]" />
                            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                                Weekly clinic schedule
                            </h3>
                        </div>

                        <Link
                            href="/website"
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                        >
                            <span>Customize in Website Editor</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-white/5">
                        {days.map((d) => (
                            <div key={d.name} className="py-2.5 flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    {d.name}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-slate-600 dark:text-slate-400">
                                        {d.hours}
                                    </span>
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                        Open
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/60 dark:border-white/5 flex items-start gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <CheckCircle2 className="w-4 h-4 text-[#0E9E8F] shrink-0 mt-0.5" />
                        <div>
                            <span>
                                Opening hours are synchronized with your public booking website and patient directory card. Individual doctor channeling schedules are managed in the Doctors module.
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-5 space-y-4">
                <LivePreviewPanel
                    title="Public hours card"
                    subtitle="How patients see your hours on the website"
                >
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-white/10 shadow-sm space-y-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
                            <Clock className="w-4 h-4 text-[#0E9E8F]" />
                            <span>Clinic operating hours</span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-white/5 text-slate-600 dark:text-slate-300">
                                <span>Mon – Sat</span>
                                <span className="font-semibold font-mono text-slate-900 dark:text-white">8:00 AM – 9:00 PM</span>
                            </div>
                            <div className="flex justify-between py-1 text-slate-600 dark:text-slate-300">
                                <span>Sunday</span>
                                <span className="font-semibold font-mono text-slate-900 dark:text-white">8:00 AM – 2:00 PM</span>
                            </div>
                        </div>

                        <div className="pt-2 text-[11px] text-slate-400 italic">
                            * Doctor channeling times may vary based on session schedules.
                        </div>
                    </div>
                </LivePreviewPanel>
            </div>
        </div>
    );
}
