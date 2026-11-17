import React, { useState, useEffect } from 'react';
import { Zap, Wifi, X, ShieldCheck } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

const STORAGE_KEY = 'medvisit_offline_backup_tip_dismissed';

export default function OfflinePowerBackupTipCard() {
    const { offline } = usePage<PageProps>().props;
    const isPhase0Enabled = Boolean(offline?.enabled && offline?.phase_0);

    const [dismissed, setDismissed] = useState<boolean>(true);

    useEffect(() => {
        if (!isPhase0Enabled) {
            setDismissed(true);
            return;
        }

        try {
            const isDismissed = localStorage.getItem(STORAGE_KEY) === 'true';
            setDismissed(isDismissed);
        } catch {
            setDismissed(false);
        }
    }, [isPhase0Enabled]);

    const handleDismiss = () => {
        setDismissed(true);
        try {
            localStorage.setItem(STORAGE_KEY, 'true');
        } catch {
            // Ignore localStorage errors
        }
    };

    if (dismissed) {
        return null;
    }

    return (
        <div className="relative overflow-hidden rounded-3xl border border-sky-200/80 bg-gradient-to-r from-sky-50/90 via-blue-50/70 to-teal-50/80 p-5 text-slate-800 shadow-sm backdrop-blur-md dark:border-sky-500/20 dark:from-sky-950/30 dark:via-blue-950/20 dark:to-teal-950/30 dark:text-slate-200 transition-all">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1E6FD9]/10 text-[#1E6FD9] dark:bg-[#1E6FD9]/20">
                        <Zap className="h-5 w-5" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                                Recommended: Backup 4G Router & Mini-UPS
                            </h4>
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                                <ShieldCheck className="h-3 w-3" /> Sri Lanka Clinics
                            </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                            In Sri Lanka, sudden power trips and fiber outages can interrupt reception. We strongly recommend keeping a backup 4G router / mobile hotspot with an active data SIM, plus a small 12V DC mini-UPS powering your router and reception computer so patient tokens and queue tracking never stall.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={handleDismiss}
                    aria-label="Dismiss power and connectivity recommendation"
                    className="shrink-0 rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/50 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
