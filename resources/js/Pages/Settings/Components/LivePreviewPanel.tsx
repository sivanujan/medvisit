import React from 'react';
import { Eye, Sparkles } from 'lucide-react';

interface Props {
    title: string;
    subtitle?: string;
    children: React.ReactNode;
}

export default function LivePreviewPanel({ title, subtitle, children }: Props) {
    return (
        <aside
            aria-label="Settings live preview"
            className="sticky top-24 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 p-5 shadow-lg shadow-slate-200/40 dark:shadow-black/20 space-y-4"
        >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Eye className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 truncate">
                            <span>Live preview</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            {subtitle || title}
                        </div>
                    </div>
                </div>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                    Real-time
                </span>
            </div>

            <div className="min-h-[260px] flex flex-col justify-center">
                {children}
            </div>
        </aside>
    );
}
