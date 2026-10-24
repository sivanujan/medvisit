import React from 'react';
import { Calendar, Clock, Users, ShieldAlert, Sparkles, AlertCircle } from 'lucide-react';
import LivePreviewPanel from '../Components/LivePreviewPanel';
import { SessionDefaultsData, FormInstance } from '../types';

interface Props {
    form: FormInstance<{
        default_avg_consultation_minutes: number;
        default_max_tokens: number;
        cancellation_window_hours: number;
        auto_generate_days: number;
    }>;
    sessionDefaults: SessionDefaultsData;
}

export default function SessionDefaultsSection({ form }: Props) {
    const { data, setData, errors } = form;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Session defaults
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Define baseline rules for doctor channeling sessions, estimated consultation times and patient capacity.
                    </p>
                </div>

                <div className="p-6 rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm space-y-5">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 dark:border-white/5">
                        <Calendar className="w-4 h-4 text-[#1E6FD9]" />
                        <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                            Channeling rules & limits
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Avg Consultation Time */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Default consultation duration (minutes)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min={3}
                                    max={60}
                                    value={data.default_avg_consultation_minutes}
                                    onChange={(e) =>
                                        setData('default_avg_consultation_minutes', parseInt(e.target.value) || 10)
                                    }
                                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 font-semibold"
                                    required
                                />
                                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                                    mins / patient
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Used to estimate appointment wait times on live TV queue screens and patient SMS.
                            </p>
                            {errors.default_avg_consultation_minutes && (
                                <p className="text-xs text-rose-500 font-semibold mt-1">
                                    {errors.default_avg_consultation_minutes}
                                </p>
                            )}
                        </div>

                        {/* Max Tokens Per Session */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Default maximum patient capacity
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min={1}
                                    max={100}
                                    value={data.default_max_tokens}
                                    onChange={(e) =>
                                        setData('default_max_tokens', parseInt(e.target.value) || 20)
                                    }
                                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 font-semibold"
                                    required
                                />
                                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                                    tokens
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Suggested token limit pre-filled when staff create a quick doctor session.
                            </p>
                            {errors.default_max_tokens && (
                                <p className="text-xs text-rose-500 font-semibold mt-1">{errors.default_max_tokens}</p>
                            )}
                        </div>

                        {/* Cancellation Window */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Online cancellation window (hours)
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min={0}
                                    max={48}
                                    value={data.cancellation_window_hours}
                                    onChange={(e) =>
                                        setData('cancellation_window_hours', parseInt(e.target.value) || 0)
                                    }
                                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 font-semibold"
                                    required
                                />
                                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                                    hours prior
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                Minimum notice required for patients to cancel an appointment online before start.
                            </p>
                            {errors.cancellation_window_hours && (
                                <p className="text-xs text-rose-500 font-semibold mt-1">
                                    {errors.cancellation_window_hours}
                                </p>
                            )}
                        </div>

                        {/* Recurring Session Generation Window */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                Automated recurring schedule window
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    min={7}
                                    max={90}
                                    value={data.auto_generate_days}
                                    onChange={(e) =>
                                        setData('auto_generate_days', parseInt(e.target.value) || 30)
                                    }
                                    className="w-full px-3.5 py-2.5 rounded-2xl text-xs bg-slate-50/70 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30 font-semibold"
                                    required
                                />
                                <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-medium">
                                    days ahead
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                                How many days in advance recurring doctor schedules generate slots automatically.
                            </p>
                            {errors.auto_generate_days && (
                                <p className="text-xs text-rose-500 font-semibold mt-1">{errors.auto_generate_days}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Preview Column */}
            <div className="lg:col-span-5 space-y-4">
                <LivePreviewPanel
                    title="Session card preview"
                    subtitle="How a doctor session appears with these rules"
                >
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-white/10 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1E6FD9]/10 text-[#1E6FD9]">
                                Today • Evening Session
                            </span>
                            <span className="text-[11px] font-mono font-semibold text-slate-500">
                                05:30 PM – 08:30 PM
                            </span>
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                Dr. K. Sivalingam
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Consultant Cardiologist
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-white/5 text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                                <span className="text-[10px] text-slate-400 block">Capacity</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {data.default_max_tokens} tokens
                                </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03]">
                                <span className="text-[10px] text-slate-400 block">Consultation avg</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                    ~{data.default_avg_consultation_minutes} mins
                                </span>
                            </div>
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 pt-1">
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>
                                Cancellation allowed until {data.cancellation_window_hours} hours prior to start.
                            </span>
                        </div>
                    </div>
                </LivePreviewPanel>
            </div>
        </div>
    );
}
