import React from 'react';
import {
    Sparkles,
    Palette,
    Camera,
    MapPin,
    Clock,
    Stethoscope,
    Globe,
    Pill,
    Printer,
    Compass,
    PartyPopper,
    Check,
    Lock,
} from 'lucide-react';
import { WizardStepDef } from '../types';

export const WIZARD_STEPS: WizardStepDef[] = [
    {
        id: 1,
        slug: 'welcome',
        number: null,
        title: 'Welcome to MedVisit',
        shortTitle: 'Welcome',
        description: 'Get your clinic up and running',
        icon: 'Sparkles',
    },
    {
        id: 2,
        slug: 'brand',
        number: 1,
        title: 'Logo & brand colors',
        shortTitle: 'Branding',
        description: 'Identity on website & TV displays',
        icon: 'Palette',
    },
    {
        id: 3,
        slug: 'cover',
        number: 2,
        title: 'Clinic cover photo',
        shortTitle: 'Clinic photo',
        description: 'Warm welcome photo or banner',
        icon: 'Camera',
        optional: true,
    },
    {
        id: 4,
        slug: 'location',
        number: 3,
        title: 'Location & contact',
        shortTitle: 'Location',
        description: 'Map pin, address & WhatsApp',
        icon: 'MapPin',
    },
    {
        id: 5,
        slug: 'hours',
        number: 4,
        title: 'Opening hours',
        shortTitle: 'Opening hours',
        description: 'Weekly schedule & breaks',
        icon: 'Clock',
    },
    {
        id: 6,
        slug: 'services',
        number: 5,
        title: 'Services offered',
        shortTitle: 'Services',
        description: 'OPD, dental, lab & specialists',
        icon: 'Stethoscope',
    },
    {
        id: 7,
        slug: 'booking',
        number: 6,
        title: 'Online patient booking',
        shortTitle: 'Online booking',
        description: 'Token limits & verification',
        icon: 'Globe',
    },
    {
        id: 8,
        slug: 'pharmacy',
        number: 7,
        title: 'Dispensary & pharmacy',
        shortTitle: 'Pharmacy',
        description: 'Inventory & stock deduction',
        icon: 'Pill',
    },
    {
        id: 9,
        slug: 'printing',
        number: 8,
        title: 'Reception & printing',
        shortTitle: 'Printing',
        description: 'Thermal slips, receipts & Rx',
        icon: 'Printer',
    },
    {
        id: 10,
        slug: 'directory',
        number: 9,
        title: 'Public directory listing',
        shortTitle: 'Directory',
        description: 'Listing on medvisit.lk/find',
        icon: 'Compass',
    },
    {
        id: 11,
        slug: 'celebration',
        number: null,
        title: 'Ready to launch',
        shortTitle: 'Launch',
        description: 'Summary & launch your clinic',
        icon: 'PartyPopper',
    },
];

const ICONS_MAP: Record<string, React.ElementType> = {
    Sparkles,
    Palette,
    Camera,
    MapPin,
    Clock,
    Stethoscope,
    Globe,
    Pill,
    Printer,
    Compass,
    PartyPopper,
};

interface Props {
    currentStep: number;
    highestUnlockedStep: number;
    onSelectStep: (stepId: number) => void;
    brandColor: string;
}

export default function SetupStepper({
    currentStep,
    highestUnlockedStep,
    onSelectStep,
    brandColor,
}: Props) {
    // 9 numbered steps calculation for progress percentage
    const numberedTotal = 9;
    const completedCount = Math.max(0, Math.min(numberedTotal, currentStep > 10 ? 9 : currentStep - 1));
    const progressPercent = Math.round((completedCount / numberedTotal) * 100);

    return (
        <aside className="w-full lg:w-[270px] shrink-0">
            <div className="sticky top-20 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-sm space-y-6">
                {/* Progress bar header */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                        <span className="uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">
                            Clinic setup
                        </span>
                        <span className="tabular-nums font-mono text-[#1E6FD9] dark:text-[#5c9df4]">
                            {progressPercent}%
                        </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500 ease-out"
                            style={{
                                width: `${progressPercent}%`,
                                background: `linear-gradient(90deg, #1E6FD9 0%, ${brandColor || '#0E9E8F'} 100%)`,
                            }}
                        />
                    </div>
                </div>

                {/* Steps List */}
                <nav className="space-y-1" aria-label="Setup steps">
                    {WIZARD_STEPS.map((step) => {
                        const IconComponent = ICONS_MAP[step.icon] || Sparkles;
                        const isCurrent = step.id === currentStep;
                        const isCompleted = step.id < currentStep;
                        const isUnlocked = step.id <= highestUnlockedStep;

                        return (
                            <button
                                key={step.id}
                                type="button"
                                disabled={!isUnlocked}
                                onClick={() => isUnlocked && onSelectStep(step.id)}
                                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all group ${
                                    isCurrent
                                        ? 'bg-gradient-to-r from-[#1E6FD9]/10 to-[#0E9E8F]/10 text-slate-900 dark:text-white font-semibold shadow-xs ring-1 ring-[#1E6FD9]/20'
                                        : isCompleted
                                        ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-white/5 cursor-pointer'
                                        : isUnlocked
                                        ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-100/60 dark:hover:bg-white/5 cursor-pointer'
                                        : 'text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
                                }`}
                            >
                                {/* Step number / icon indicator */}
                                <div
                                    className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                                        isCurrent
                                            ? 'text-white shadow-md'
                                            : isCompleted
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                                    }`}
                                    style={
                                        isCurrent
                                            ? {
                                                  background: `linear-gradient(135deg, #1E6FD9 0%, ${brandColor || '#0E9E8F'} 100%)`,
                                              }
                                            : undefined
                                    }
                                >
                                    {isCompleted ? (
                                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                                    ) : !isUnlocked ? (
                                        <Lock className="w-3.5 h-3.5 opacity-60" />
                                    ) : step.number !== null ? (
                                        <span>{step.number}</span>
                                    ) : (
                                        <IconComponent className="w-3.5 h-3.5" />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs truncate block font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                                            {step.shortTitle}
                                        </span>
                                        {step.optional && (
                                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400">
                                                Opt
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate leading-tight mt-0.5">
                                        {step.description}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </nav>

                {/* Help tip */}
                <div className="pt-2 border-t border-slate-100 dark:border-white/5">
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                        Settings configured here can be updated anytime later in the clinic Settings centre.
                    </p>
                </div>
            </div>
        </aside>
    );
}
