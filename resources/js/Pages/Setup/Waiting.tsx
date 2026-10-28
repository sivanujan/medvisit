import React from 'react';
import { Head, Link } from '@inertiajs/react';
import { Clock, LogOut, ShieldCheck, Stethoscope } from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';

interface Props {
    clinicName: string;
}

export default function Waiting({ clinicName }: Props) {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between items-center px-4 py-8 relative overflow-hidden font-sans selection:bg-[#1E6FD9] selection:text-white">
            <Head title={`${clinicName} is being set up`} />

            {/* Ambient background glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#1E6FD9]/15 blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#0E9E8F]/15 blur-[120px] pointer-events-none" />

            {/* Minimal Header */}
            <div className="w-full max-w-5xl flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#1E6FD9] to-[#0E9E8F] flex items-center justify-center shadow-lg shadow-[#1E6FD9]/20 text-white font-bold text-lg">
                        {clinicName ? clinicName.charAt(0).toUpperCase() : 'M'}
                    </div>
                    <div>
                        <h1 className="text-sm font-bold text-white tracking-tight">{clinicName}</h1>
                        <p className="text-[11px] text-slate-400 font-medium">MedVisit Healthcare Platform</p>
                    </div>
                </div>

                <Link
                    href="/logout"
                    method="post"
                    as="button"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                >
                    <LogOut className="w-3.5 h-3.5 text-slate-400" />
                    <span>Sign out</span>
                </Link>
            </div>

            {/* Center Content Card */}
            <div className="w-full max-w-lg my-auto z-10">
                <div className="p-8 sm:p-10 rounded-3xl bg-slate-900/80 backdrop-blur-2xl border border-white/10 shadow-2xl text-center space-y-6">
                    {/* Token TV Inspired Motif */}
                    <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-[#1E6FD9]/20 via-[#0E9E8F]/20 to-[#FF7A59]/10 border border-white/15 flex items-center justify-center relative shadow-inner">
                        <Clock className="w-10 h-10 text-[#0E9E8F] animate-pulse" />
                        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#1E6FD9] border-2 border-slate-900 flex items-center justify-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        </span>
                    </div>

                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0E9E8F]/15 border border-[#0E9E8F]/30 text-[#0E9E8F] text-[11px] font-bold uppercase tracking-wider">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Clinic setup in progress</span>
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">
                            {clinicName} is being set up
                        </h2>
                        <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
                            Your clinic administrator is currently customizing your practice logo, channeling hours, and reception print settings.
                        </p>
                    </div>

                    {/* Informative Checklist Card */}
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 text-left text-xs space-y-2.5">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            What happens next
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#1E6FD9]" />
                            <span>Clinic admin completes the 3-minute guided setup.</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#0E9E8F]" />
                            <span>Today's queue, doctor channeling, and billing will unlock for all staff.</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-300">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#FF7A59]" />
                            <span>Please check back soon or contact your clinic administrator.</span>
                        </div>
                    </div>

                    <div className="pt-2">
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="w-full py-3 px-4 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                            <LogOut className="w-4 h-4 text-slate-400" />
                            <span>Log out of workspace</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="w-full max-w-5xl text-center text-xs text-slate-500 z-10">
                <p>
                    <a
                        href="https://medvisit.lk"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-slate-400 hover:underline transition-colors"
                    >
                        Powered by MedVisit
                    </a>
                </p>
            </div>
        </div>
    );
}
