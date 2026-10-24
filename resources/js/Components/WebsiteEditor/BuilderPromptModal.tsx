import React, { useState, useEffect } from 'react';
import {
    LayoutTemplate,
    Sparkles,
    Sliders,
    Layers,
    Stethoscope,
    ArrowRight,
    X,
    Check,
} from 'lucide-react';

interface Props {
    clinicName: string;
}

export default function BuilderPromptModal({ clinicName }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        // Check if user has permanently dismissed it or seen it in current session
        const dismissed = localStorage.getItem('mv_builder_prompt_dismissed');
        const sessionSeen = sessionStorage.getItem('mv_builder_prompt_session_seen');

        if (!dismissed && !sessionSeen) {
            // Small delay for smooth entry after page hydration
            const timer = setTimeout(() => {
                setIsOpen(true);
                sessionStorage.setItem('mv_builder_prompt_session_seen', 'true');
            }, 400);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem('mv_builder_prompt_dismissed', 'true');
        }
        setIsOpen(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl p-6 sm:p-7 overflow-hidden transition-all animate-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                {/* Decorative background glow */}
                <div className="absolute -top-16 -right-16 w-40 h-40 bg-gradient-to-br from-primary/20 to-teal-400/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-gradient-to-tr from-amber-400/15 to-primary/10 rounded-full blur-3xl pointer-events-none" />

                {/* Close X button */}
                <button
                    type="button"
                    onClick={handleClose}
                    className="absolute top-5 right-5 p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>

                {/* Header Badge & Icon */}
                <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-primary/10 text-primary dark:bg-primary/20 dark:text-teal-300 border border-primary/20">
                        <Sparkles className="h-3 w-3 text-primary dark:text-teal-300" />
                        Visual Page Builder
                    </span>
                </div>

                {/* Title & Subtitle */}
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Customize your clinic website with Page Builder
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                    You can fully customize <strong className="text-slate-900 dark:text-white font-semibold">{clinicName || 'your clinic website'}</strong> using our drag-and-drop visual page builder, or continue with standard structured sections below.
                </p>

                {/* Feature Highlights Bento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 my-5">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-teal-300 flex items-center justify-center shrink-0">
                            <Layers className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Drag & Drop Blocks</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                Free-form layout grids, banners, accordions & custom styling.
                            </div>
                        </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3">
                        <div className="h-8 w-8 rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-300 flex items-center justify-center shrink-0">
                            <Stethoscope className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Live Clinic Widgets</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                Real-time doctor schedules and token booking integration.
                            </div>
                        </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3">
                        <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 flex items-center justify-center shrink-0">
                            <Sliders className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Full Design Control</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                Brand colors, typography, margins, and dark mode palette.
                            </div>
                        </div>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-start gap-3">
                        <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300 flex items-center justify-center shrink-0">
                            <LayoutTemplate className="h-4 w-4" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-slate-100">Responsive Ready</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                                Pixel-perfect controls for Desktop, Tablet, and Mobile.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Don't show again toggle */}
                <div className="flex items-center justify-between pt-1 pb-3">
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-slate-500 dark:text-slate-400">
                        <input
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={(e) => setDontShowAgain(e.target.checked)}
                            className="rounded border-slate-300 text-primary focus:ring-primary h-3.5 w-3.5 dark:border-slate-700 dark:bg-slate-800"
                        />
                        <span>Don't show this popup again</span>
                    </label>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition order-2 sm:order-1 text-center"
                    >
                        Continue with Standard Sections
                    </button>
                    <a
                        href="/website/builder"
                        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-xs font-semibold text-white shadow-md shadow-primary/20 hover:brightness-105 transition order-1 sm:order-2 text-center"
                    >
                        <LayoutTemplate className="h-4 w-4" />
                        <span>Launch MedVisit Page Builder</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                    </a>
                </div>
            </div>
        </div>
    );
}
