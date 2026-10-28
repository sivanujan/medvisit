import React, { useState, useEffect, useRef } from 'react';
import {
    X,
    Plus,
    Trash2,
    MoveUp,
    MoveDown,
    Search,
    Pill,
    Globe,
    Check,
    AlertCircle,
    FileText,
    Sparkles,
    Shield,
    Languages,
} from 'lucide-react';
import GlassSelect from '@/Components/UI/GlassSelect';

export interface TemplateBuilderItem {
    id?: number;
    clinic_medicine_id?: number | null;
    medicine_variant_id?: number | null;
    display_name: string;
    generic_name?: string | null;
    brand_name?: string | null;
    strength_text?: string | null;
    dosage_form: string;
    dose: string;
    frequency: string;
    timing: string;
    route: string;
    duration_days: number;
    quantity: number;
    instructions?: string | null;
    source: string;
}

export interface TemplateFormData {
    id?: number;
    name: string;
    description: string;
    condition_tags: string[];
    is_shared: boolean;
    items: TemplateBuilderItem[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: TemplateFormData) => void;
    initialData?: TemplateFormData | null;
    canManageShared: boolean;
    currentDoctorName: string;
    clinicName: string;
    translations: {
        en: Record<string, any>;
        ta: Record<string, any>;
        si: Record<string, any>;
    };
    isSubmitting?: boolean;
}

const FREQUENCY_OPTIONS = [
    { value: 'once_daily', label: 'Once daily', multiplier: 1 },
    { value: 'twice_daily', label: 'Twice daily (1-0-1)', multiplier: 2 },
    { value: 'thrice_daily', label: '3 times a day (1-1-1)', multiplier: 3 },
    { value: 'four_times_daily', label: '4 times a day (1-1-1-1)', multiplier: 4 },
    { value: 'at_night', label: 'At night / Bedtime (0-0-1)', multiplier: 1 },
    { value: 'every_8_hours', label: 'Every 8 hours', multiplier: 3 },
    { value: 'every_6_hours', label: 'Every 6 hours', multiplier: 4 },
    { value: 'sos', label: 'When needed (SOS)', multiplier: 0 },
    { value: 'single_dose', label: 'Single dose', multiplier: 1 },
];

const TIMING_OPTIONS = [
    { value: 'before_meals', label: 'Before meals' },
    { value: 'after_meals', label: 'After meals' },
    { value: 'with_meals', label: 'With meals' },
    { value: 'bedtime', label: 'At bedtime' },
    { value: 'any_time', label: 'Any time' },
];

const ROUTE_OPTIONS = [
    { value: 'oral', label: 'Oral' },
    { value: 'topical', label: 'Topical' },
    { value: 'inhalation', label: 'Inhalation' },
    { value: 'drops', label: 'Drops (Eye / Ear)' },
    { value: 'injection', label: 'Injection' },
    { value: 'other', label: 'Other' },
];

// Dose Calculation logic matching DoseCalculatorService
export function calculateItemQuantity(
    doseStr: string,
    freqStr: string,
    daysVal: number | string,
    formStr: string
): number {
    const days = Number(daysVal);
    if (!days || isNaN(days) || days <= 0) return 1;

    const lowerForm = (formStr || '').toLowerCase();
    if (['syrup', 'suspension', 'cream', 'ointment', 'gel', 'lotion', 'drops', 'inhaler', 'spray'].includes(lowerForm)) {
        return 1;
    }

    if (['sos', 'prn', 'as_needed'].includes(freqStr.toLowerCase())) {
        return 10; // Sensible default for PRN tablets
    }

    // Parse dose decimal
    let dose = 1;
    const trimmed = (doseStr || '').trim();
    if (trimmed === '1/2' || trimmed === '0.5') dose = 0.5;
    else if (trimmed === '1/4' || trimmed === '0.25') dose = 0.25;
    else if (trimmed === '3/4' || trimmed === '0.75') dose = 0.75;
    else if (trimmed === '1 1/2' || trimmed === '1.5') dose = 1.5;
    else if (trimmed === '2') dose = 2;
    else {
        const parsed = parseFloat(trimmed);
        if (!isNaN(parsed) && parsed > 0) dose = parsed;
    }

    // Parse frequency times
    let times = 1;
    const match = FREQUENCY_OPTIONS.find((f) => f.value === freqStr);
    if (match) {
        times = match.multiplier;
    } else if (freqStr.includes('-')) {
        const parts = freqStr.split('-');
        let sum = 0;
        for (const p of parts) {
            const pt = p.trim();
            if (pt === '1/2' || pt === '0.5') sum += 0.5;
            else {
                const n = parseFloat(pt);
                if (!isNaN(n)) sum += n;
            }
        }
        if (sum > 0) return Math.ceil(sum * days);
    }

    if (times === 0) return Math.ceil(dose * 2 * days); // Fallback for SOS
    return Math.ceil(dose * times * days);
}

export const TemplateBuilderModal: React.FC<Props> = ({
    isOpen,
    onClose,
    onSave,
    initialData,
    canManageShared,
    currentDoctorName,
    clinicName,
    translations,
    isSubmitting = false,
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [conditionTags, setConditionTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [isShared, setIsShared] = useState(false);
    const [items, setItems] = useState<TemplateBuilderItem[]>([
        {
            display_name: '',
            dose: '1',
            frequency: 'twice_daily',
            timing: 'after_meals',
            route: 'oral',
            duration_days: 5,
            quantity: 10,
            dosage_form: 'Tablet',
            source: 'clinic',
        },
    ]);

    // Live preview print language
    const [previewLanguage, setPreviewLanguage] = useState<'en' | 'ta' | 'si'>('en');

    // Catalog search autocomplete
    const [searchQuery, setSearchQuery] = useState('');
    const [activeRowIndex, setActiveRowIndex] = useState<number | null>(null);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeoutRef = useRef<any>(null);

    // Dirty state for unsaved-changes guard
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (initialData) {
            setName(initialData.name || '');
            setDescription(initialData.description || '');
            setConditionTags(initialData.condition_tags || []);
            setIsShared(initialData.is_shared || false);
            setItems(
                initialData.items && initialData.items.length > 0
                    ? initialData.items.map((it) => ({
                          ...it,
                          route: it.route || 'oral',
                          dosage_form: it.dosage_form || 'Tablet',
                          source: it.source || 'clinic',
                      }))
                    : [
                          {
                              display_name: '',
                              dose: '1',
                              frequency: 'twice_daily',
                              timing: 'after_meals',
                              route: 'oral',
                              duration_days: 5,
                              quantity: 10,
                              dosage_form: 'Tablet',
                              source: 'clinic',
                          },
                      ]
            );
            setIsDirty(false);
        } else {
            setName('');
            setDescription('');
            setConditionTags([]);
            setIsShared(false);
            setItems([
                {
                    display_name: '',
                    dose: '1',
                    frequency: 'twice_daily',
                    timing: 'after_meals',
                    route: 'oral',
                    duration_days: 5,
                    quantity: 10,
                    dosage_form: 'Tablet',
                    source: 'clinic',
                },
            ]);
            setIsDirty(false);
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleCloseWithGuard = () => {
        if (isDirty) {
            if (!confirm('You have unsaved changes in this template. Are you sure you want to discard them?')) {
                return;
            }
        }
        onClose();
    };

    // Tag management
    const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const trimmed = tagInput.trim().replace(/^,+|,+$/g, '');
            if (trimmed && !conditionTags.includes(trimmed)) {
                setConditionTags([...conditionTags, trimmed]);
                setTagInput('');
                setIsDirty(true);
            }
        }
    };

    const removeTag = (index: number) => {
        setConditionTags(conditionTags.filter((_, i) => i !== index));
        setIsDirty(true);
    };

    // Row Operations
    const addRow = () => {
        setItems([
            ...items,
            {
                display_name: '',
                dose: '1',
                frequency: 'twice_daily',
                timing: 'after_meals',
                route: 'oral',
                duration_days: 5,
                quantity: 10,
                dosage_form: 'Tablet',
                source: 'clinic',
            },
        ]);
        setIsDirty(true);
    };

    const removeRow = (index: number) => {
        if (items.length <= 1) {
            alert('A template must contain at least one medicine.');
            return;
        }
        setItems(items.filter((_, i) => i !== index));
        setIsDirty(true);
    };

    const moveRow = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === items.length - 1) return;
        const target = direction === 'up' ? index - 1 : index + 1;
        const copy = [...items];
        const temp = copy[index];
        copy[index] = copy[target];
        copy[target] = temp;
        setItems(copy);
        setIsDirty(true);
    };

    const updateItem = (index: number, field: keyof TemplateBuilderItem, val: any) => {
        const next = [...items];
        next[index] = { ...next[index], [field]: val };

        // Auto recalculate quantity when dose, frequency, or duration changes
        if (field === 'dose' || field === 'frequency' || field === 'duration_days' || field === 'dosage_form') {
            const calculated = calculateItemQuantity(
                next[index].dose,
                next[index].frequency,
                next[index].duration_days,
                next[index].dosage_form
            );
            next[index].quantity = calculated;
        }

        setItems(next);
        setIsDirty(true);
    };

    // Catalog Search
    const handleSearchInput = (index: number, query: string) => {
        setActiveRowIndex(index);
        setSearchQuery(query);
        updateItem(index, 'display_name', query);

        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

        if (!query || query.trim().length < 2) {
            setSearchResults([]);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/pharmacy/catalog/search?q=${encodeURIComponent(query.trim())}`);
                if (res.ok) {
                    const data = await res.json();
                    setSearchResults(data.results || data.data || []);
                }
            } catch (err) {
                console.error('Catalog search error', err);
            } finally {
                setIsSearching(false);
            }
        }, 220);
    };

    const selectSearchResult = (index: number, result: any) => {
        const next = [...items];
        next[index] = {
            ...next[index],
            clinic_medicine_id: result.clinic_medicine_id || null,
            medicine_variant_id: result.variant_id || null,
            display_name: result.display_name,
            generic_name: result.generic_name || null,
            brand_name: result.brand_name || null,
            strength_text: result.strength_form || null,
            dosage_form: result.dosage_form || 'Tablet',
            source: result.in_stock ? 'clinic' : 'outside',
        };

        const autoQty = calculateItemQuantity(
            next[index].dose,
            next[index].frequency,
            next[index].duration_days,
            result.dosage_form || 'Tablet'
        );
        next[index].quantity = autoQty;

        setItems(next);
        setSearchResults([]);
        setActiveRowIndex(null);
        setIsDirty(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            alert('Please enter a template name.');
            return;
        }

        const validItems = items.filter((it) => it.display_name.trim().length > 0);
        if (validItems.length === 0) {
            alert('Please add at least one medicine item with a name.');
            return;
        }

        onSave({
            id: initialData?.id,
            name: name.trim(),
            description: description.trim(),
            condition_tags: conditionTags,
            is_shared: isShared,
            items: validItems,
        });
    };

    // Helper for translated preview strings
    const getTranslatedInstruction = (it: TemplateBuilderItem, lang: 'en' | 'ta' | 'si') => {
        const dict = translations[lang] || translations.en;
        const timingText = dict.timing?.[it.timing] || it.timing;
        const freqText = dict.frequency?.[it.frequency] || it.frequency;
        const durationTemplate = dict.duration || 'for :days days';
        const durationText = it.duration_days ? durationTemplate.replace(':days', String(it.duration_days)) : '';

        return `${it.dose} ${it.dosage_form.toLowerCase()} • ${freqText} • ${timingText} • ${durationText}`;
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
                onClick={handleCloseWithGuard}
                aria-hidden="true"
            />

            <div className="min-h-full flex items-center justify-center p-2 sm:p-4 md:p-6">
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="template_builder_title"
                    className="relative w-full max-w-6xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 flex flex-col h-[90vh] max-h-[900px]"
                >
                    {/* Header */}
                    <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-white/5 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Pill className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 id="template_builder_title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                                    {initialData?.id ? 'Edit prescription template' : 'New prescription template'}
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Compose reusable medicine combinations with precise doses, frequencies, and timing instructions.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleCloseWithGuard}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Main Content: Left Form + Right Sticky Preview */}
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
                        {/* Two Columns Container */}
                        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
                            {/* LEFT: FORM (Scrollable) */}
                            <div className="flex-1 min-w-0 overflow-y-auto p-4 sm:p-6 space-y-5 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-white/10">
                            {/* Template Name & Visibility */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Template name *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            setIsDirty(true);
                                        }}
                                        placeholder="e.g. Acute Gastritis Regimen / Simple Analgesic"
                                        className="w-full text-xs sm:text-sm font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/40 text-slate-900 dark:text-white placeholder:text-slate-400 px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-900 transition-all"
                                    />
                                </div>

                                {/* Visibility: My template vs Clinic Shared */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                                        <span>Visibility</span>
                                        {!canManageShared && (
                                            <span className="text-[10px] text-slate-400 font-normal">
                                                (Doctor personal)
                                            </span>
                                        )}
                                    </label>
                                    <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/5">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsShared(false);
                                                setIsDirty(true);
                                            }}
                                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                                                !isShared
                                                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                            }`}
                                        >
                                            Personal
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!canManageShared}
                                            onClick={() => {
                                                if (canManageShared) {
                                                    setIsShared(true);
                                                    setIsDirty(true);
                                                }
                                            }}
                                            title={!canManageShared ? 'Only clinic admins can share templates with all doctors' : 'Share with all doctors in clinic'}
                                            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all text-center ${
                                                isShared
                                                    ? 'bg-teal-600 text-white shadow-xs'
                                                    : !canManageShared
                                                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                            }`}
                                        >
                                            Clinic shared
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Condition Tags */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
                                    <span>Condition tags (diagnoses)</span>
                                    <span className="text-[11px] text-slate-400 font-normal">
                                        Press Enter or comma to add
                                    </span>
                                </label>
                                <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 min-h-[44px]">
                                    {conditionTags.map((tag, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary text-xs font-semibold"
                                        >
                                            <span>{tag}</span>
                                            <button
                                                type="button"
                                                onClick={() => removeTag(idx)}
                                                className="hover:text-rose-500 transition-colors"
                                                aria-label={`Remove tag ${tag}`}
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        type="text"
                                        value={tagInput}
                                        onChange={(e) => setTagInput(e.target.value)}
                                        onKeyDown={handleAddTag}
                                        placeholder={conditionTags.length === 0 ? "e.g. Gastritis, Acid Reflux, GERD..." : "Add tag..."}
                                        className="flex-1 min-w-[140px] text-xs bg-transparent border-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* General Advice / Clinical Notes */}
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                    General advice / Patient instructions (optional)
                                </label>
                                <textarea
                                    rows={2}
                                    value={description}
                                    onChange={(e) => {
                                        setDescription(e.target.value);
                                        setIsDirty(true);
                                    }}
                                    placeholder="e.g. Avoid oily and spicy foods. Drink at least 2 liters of water daily. Return if symptoms persist after 5 days."
                                    className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-800/40 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white dark:focus:bg-slate-900 transition-all"
                                />
                            </div>

                            {/* Medicine Rows Editor */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <Pill className="w-3.5 h-3.5 text-primary" />
                                        <span>Prescription medicines ({items.length})</span>
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={addRow}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 transition-colors"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                        <span>Add medicine</span>
                                    </button>
                                </div>

                                {/* Rows List */}
                                <div className="space-y-3">
                                    {items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="p-3 sm:p-4 rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-800/30 shadow-xs space-y-3 transition-all relative group"
                                        >
                                            {/* Row Top Bar: Number + Reorder + Remove */}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center">
                                                        {idx + 1}
                                                    </span>
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        {item.display_name || 'Select medicine'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveRow(idx, 'up')}
                                                        disabled={idx === 0}
                                                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20"
                                                        title="Move row up"
                                                    >
                                                        <MoveUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveRow(idx, 'down')}
                                                        disabled={idx === items.length - 1}
                                                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20"
                                                        title="Move row down"
                                                    >
                                                        <MoveDown className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeRow(idx)}
                                                        className="p-1 rounded text-rose-400 hover:text-rose-600 transition-colors ml-1"
                                                        title="Remove medicine"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Medicine Search with Autocomplete */}
                                            <div className="relative">
                                                <div className="relative">
                                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                    <input
                                                        type="text"
                                                        required
                                                        value={item.display_name}
                                                        onChange={(e) => handleSearchInput(idx, e.target.value)}
                                                        onFocus={() => {
                                                            if (item.display_name.trim().length >= 2) {
                                                                handleSearchInput(idx, item.display_name);
                                                            }
                                                        }}
                                                        placeholder="Search clinic inventory or catalog (e.g. Omeprazole 20mg)..."
                                                        className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary font-medium"
                                                    />
                                                </div>

                                                {/* Autocomplete Dropdown */}
                                                {activeRowIndex === idx && (searchResults.length > 0 || isSearching) && (
                                                    <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                                                        {isSearching ? (
                                                            <div className="p-3 text-center text-xs text-slate-400">
                                                                Searching medicine catalog...
                                                            </div>
                                                        ) : (
                                                            searchResults.map((res, rIdx) => (
                                                                <button
                                                                    key={rIdx}
                                                                    type="button"
                                                                    onClick={() => selectSearchResult(idx, res)}
                                                                    className="w-full p-2.5 text-left hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center justify-between gap-2 border-b border-slate-100 dark:border-white/5 last:border-0"
                                                                >
                                                                    <div className="min-w-0">
                                                                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                                            {res.display_name}
                                                                        </div>
                                                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                                            {res.generic_name} {res.strength_form ? `• ${res.strength_form}` : ''}
                                                                        </div>
                                                                    </div>
                                                                    <div className="shrink-0 text-right">
                                                                        {res.in_stock ? (
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                                                                                In stock ({res.total_quantity ?? '—'})
                                                                            </span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-500">
                                                                                Out of stock
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Fields Grid: 12-column responsive layout with ample space for labels & selects */}
                                            <div className="grid grid-cols-12 gap-2.5">
                                                {/* Dose (2 cols) */}
                                                <div className="col-span-4 sm:col-span-2">
                                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                        Dose
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={item.dose}
                                                        onChange={(e) => updateItem(idx, 'dose', e.target.value)}
                                                        placeholder="1 / 0.5 / 5ml"
                                                        className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                </div>

                                                {/* Frequency (4 cols) */}
                                                <div className="col-span-8 sm:col-span-4">
                                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                        Frequency
                                                    </label>
                                                    <GlassSelect
                                                        value={item.frequency}
                                                        onChange={(e) => updateItem(idx, 'frequency', e.target.value)}
                                                        options={FREQUENCY_OPTIONS}
                                                    />
                                                </div>

                                                {/* Timing (3 cols) */}
                                                <div className="col-span-6 sm:col-span-3">
                                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                        Timing
                                                    </label>
                                                    <GlassSelect
                                                        value={item.timing}
                                                        onChange={(e) => updateItem(idx, 'timing', e.target.value)}
                                                        options={TIMING_OPTIONS}
                                                    />
                                                </div>

                                                {/* Route (3 cols) */}
                                                <div className="col-span-6 sm:col-span-3">
                                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                        Route
                                                    </label>
                                                    <GlassSelect
                                                        value={item.route}
                                                        onChange={(e) => updateItem(idx, 'route', e.target.value)}
                                                        options={ROUTE_OPTIONS}
                                                    />
                                                </div>

                                                {/* Duration (2 cols) */}
                                                <div className="col-span-4 sm:col-span-2">
                                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                        Duration (days)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        max={365}
                                                        value={item.duration_days}
                                                        onChange={(e) => updateItem(idx, 'duration_days', parseInt(e.target.value, 10) || 1)}
                                                        className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                </div>

                                                {/* Auto-Calculated Quantity (2 cols) */}
                                                <div className="col-span-4 sm:col-span-2">
                                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1 flex items-center justify-between">
                                                        <span>Qty</span>
                                                        <span className="text-[9px] text-teal-600 dark:text-teal-400 font-normal">
                                                            Auto
                                                        </span>
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value, 10) || 1)}
                                                        className="w-full text-xs py-2 px-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/40 text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                </div>

                                                {/* Special Instructions (8 cols) */}
                                                <div className="col-span-12 sm:col-span-8">
                                                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                                        Special instructions (optional)
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={item.instructions || ''}
                                                        onChange={(e) => updateItem(idx, 'instructions', e.target.value)}
                                                        placeholder="e.g. Take with warm water / Shake well before use..."
                                                        className="w-full text-xs py-2 px-3 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-slate-900/40 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    type="button"
                                    onClick={addRow}
                                    className="w-full py-2.5 rounded-xl border-2 border-dashed border-slate-200 dark:border-white/10 hover:border-primary/50 dark:hover:border-primary/50 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-primary transition-all flex items-center justify-center gap-1.5"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span>Add another medicine</span>
                                </button>
                            </div>
                        </div>

                        {/* RIGHT: LIVE STICKY PRESCRIPTION PREVIEW (A5 Style) */}
                        <div className="w-full lg:w-[420px] bg-slate-100/70 dark:bg-slate-950/40 p-4 sm:p-6 overflow-y-auto shrink-0 flex flex-col justify-between space-y-4">
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                        <FileText className="w-3.5 h-3.5 text-primary" />
                                        <span>Live Prescription Preview</span>
                                    </span>

                                    {/* Language Switch: EN / தமிழ் / සිංහල */}
                                    <div className="flex items-center p-0.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-xs">
                                        <button
                                            type="button"
                                            onClick={() => setPreviewLanguage('en')}
                                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                                                previewLanguage === 'en'
                                                    ? 'bg-primary text-white shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            EN
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewLanguage('ta')}
                                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                                                previewLanguage === 'ta'
                                                    ? 'bg-primary text-white shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            தமிழ்
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setPreviewLanguage('si')}
                                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                                                previewLanguage === 'si'
                                                    ? 'bg-primary text-white shadow-xs'
                                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                                            }`}
                                        >
                                            සිංහල
                                        </button>
                                    </div>
                                </div>

                                {/* Printable Slip Preview Card */}
                                <div className="rounded-2xl border border-slate-200/90 dark:border-white/10 bg-white dark:bg-slate-900 shadow-md p-5 text-slate-900 dark:text-slate-100 font-sans space-y-4">
                                    {/* Clinic & Doctor Header */}
                                    <div className="border-b border-slate-200 dark:border-white/10 pb-3 flex items-start justify-between">
                                        <div>
                                            <div className="text-xs font-black uppercase tracking-wider text-primary">
                                                {clinicName}
                                            </div>
                                            <div className="text-sm font-bold text-slate-800 dark:text-white mt-0.5">
                                                {currentDoctorName}
                                            </div>
                                            <div className="text-[10px] text-slate-400">
                                                Prescription Slip • Sample Preview
                                            </div>
                                        </div>
                                        <div className="text-2xl font-serif font-black text-primary/80 select-none">
                                            ℞
                                        </div>
                                    </div>

                                    {/* Template Diagnoses / Tags Preview */}
                                    {conditionTags.length > 0 && (
                                        <div className="text-[11px] flex items-center gap-1.5 flex-wrap">
                                            <span className="font-bold text-slate-500">Diagnosis:</span>
                                            {conditionTags.map((t, i) => (
                                                <span
                                                    key={i}
                                                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] font-semibold text-slate-700 dark:text-slate-300"
                                                >
                                                    {t}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Medicines list */}
                                    <div className="space-y-3 pt-1">
                                        {items.map((it, idx) => (
                                            <div key={idx} className="border-b border-slate-100 dark:border-white/5 pb-2.5 last:border-0 last:pb-0">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                                        {idx + 1}. {it.display_name || 'Medicine name'}
                                                    </div>
                                                    <span className="text-xs font-bold text-primary font-mono shrink-0">
                                                        Qty: {it.quantity}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                                                    {getTranslatedInstruction(it, previewLanguage)}
                                                </div>
                                                {it.instructions && (
                                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                                                        * {it.instructions}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* General Advice Notes */}
                                    {description && (
                                        <div className="pt-2 border-t border-slate-100 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-400">
                                            <span className="font-bold text-slate-700 dark:text-slate-300">Advice: </span>
                                            {description}
                                        </div>
                                    )}

                                    {/* Signature Line */}
                                    <div className="pt-4 flex justify-between items-end border-t border-slate-100 dark:border-white/5">
                                        <div className="text-[10px] text-slate-400">
                                            Printed via MedVisit
                                        </div>
                                        <div className="text-right">
                                            <div className="w-24 border-b border-dashed border-slate-300 dark:border-white/20 mb-1" />
                                            <div className="text-[9px] font-semibold text-slate-400">
                                                Doctor's Signature
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                <span className="font-bold text-primary">Note:</span> MedVisit prescription templates are doctor-authored combinations. Dosage calculation is provided as a dispensing tool only.
                            </div>
                        </div>
                    </div>

                    {/* Footer (Full width below both columns) */}
                    <div className="w-full p-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 flex items-center justify-between shrink-0">
                            <button
                                type="button"
                                onClick={handleCloseWithGuard}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-md shadow-primary/20 transition-all hover:scale-[1.01] disabled:opacity-50"
                            >
                                {isSubmitting ? (
                                    <span>Saving template...</span>
                                ) : (
                                    <>
                                        <Check className="w-4 h-4" />
                                        <span>Save template</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
