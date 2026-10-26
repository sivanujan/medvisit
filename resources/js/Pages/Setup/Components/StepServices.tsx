import React, { useState } from 'react';
import {
    Stethoscope,
    Plus,
    X,
    Check,
    Info,
    ArrowRight,
    ArrowLeft,
    AlertCircle,
} from 'lucide-react';
import { PresetService, SetupFormData, SetupTenantInfo } from '../types';

interface Props {
    tenant: SetupTenantInfo;
    form: SetupFormData;
    presetServices: PresetService[];
    onChange: <K extends keyof SetupFormData>(field: K, value: SetupFormData[K]) => void;
    onContinue: () => void;
    onBack: () => void;
    saving: boolean;
    errors?: Record<string, string>;
}

export default function StepServices({
    tenant,
    form,
    presetServices,
    onChange,
    onContinue,
    onBack,
    saving,
    errors = {},
}: Props) {
    const [customInput, setCustomInput] = useState('');

    const isSelected = (label: string) =>
        form.services.some((s) => s.toLowerCase() === label.toLowerCase());

    const toggleService = (label: string) => {
        if (isSelected(label)) {
            onChange(
                'services',
                form.services.filter((s) => s.toLowerCase() !== label.toLowerCase())
            );
        } else {
            onChange('services', [...form.services, label]);
        }
    };

    const handleAddCustom = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const trimmed = customInput.trim();
        if (!trimmed) return;

        if (!isSelected(trimmed)) {
            onChange('services', [...form.services, trimmed]);
        }
        setCustomInput('');
    };

    const removeService = (service: string) => {
        onChange(
            'services',
            form.services.filter((s) => s.toLowerCase() !== service.toLowerCase())
        );
    };

    const hasServices = form.services.length > 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#1E6FD9] dark:text-[#5c9df4]">
                    Step 5 of 9
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-1">
                    Services provided
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Select all clinical services and facilities available at your clinic.
                </p>
            </div>

            {/* "What this means" bullet explanation */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-900 dark:text-blue-300">
                    <Info className="w-4 h-4 text-[#1E6FD9] shrink-0" />
                    <span>How services are presented:</span>
                </div>
                <ul className="text-[11px] text-blue-800/80 dark:text-blue-300/80 space-y-1 list-disc list-inside">
                    <li>Organized into a clean services grid on your clinic homepage.</li>
                    <li>Enables patients to filter and discover your clinic on MedVisit Directory.</li>
                    <li>Can be expanded anytime with individual pricing and descriptions.</li>
                </ul>
            </div>

            {/* Popular Presets */}
            <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Common Healthcare Services
                </label>

                <div className="flex flex-wrap gap-2">
                    {presetServices.map((preset) => {
                        const active = isSelected(preset.label);

                        return (
                            <button
                                key={preset.id}
                                type="button"
                                onClick={() => toggleService(preset.label)}
                                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                                    active
                                        ? 'bg-[#1E6FD9] text-white shadow-xs'
                                        : 'bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                                }`}
                            >
                                {active ? (
                                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                                ) : (
                                    <Plus className="w-3.5 h-3.5 text-slate-400" />
                                )}
                                <span>{preset.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Add Custom Service Input */}
            <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Add Other Service or Facility
                </label>

                <form onSubmit={handleAddCustom} className="flex gap-2">
                    <input
                        type="text"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        placeholder="e.g. Ultrasound scanning, Audiometry..."
                        className="flex-1 px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]/30"
                    />
                    <button
                        type="submit"
                        disabled={!customInput.trim()}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90 transition-opacity disabled:opacity-40 cursor-pointer"
                    >
                        Add
                    </button>
                </form>
            </div>

            {/* Selected Chips */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                        Selected Services ({form.services.length})
                    </span>
                    {form.services.length === 0 && (
                        <span className="text-rose-500 font-semibold text-xs flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Please select at least 1 service
                        </span>
                    )}
                </div>

                <div className="flex flex-wrap gap-1.5 min-h-[38px] p-2.5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5">
                    {form.services.map((service) => (
                        <span
                            key={service}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 shadow-2xs"
                        >
                            <span>{service}</span>
                            <button
                                type="button"
                                onClick={() => removeService(service)}
                                className="text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                    {form.services.length === 0 && (
                        <span className="text-xs text-slate-400 italic">No services selected yet.</span>
                    )}
                </div>

                {errors.services && (
                    <p className="text-xs text-rose-500 font-semibold">{errors.services}</p>
                )}
            </div>

            {/* Navigation buttons */}
            <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                </button>

                <button
                    type="button"
                    disabled={saving || !hasServices}
                    onClick={onContinue}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    style={{
                        background: `linear-gradient(135deg, #1E6FD9 0%, ${form.brand_color || '#0E9E8F'} 100%)`,
                    }}
                >
                    <span>{saving ? 'Saving...' : 'Save & continue'}</span>
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
