import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    User,
    Stethoscope,
    Ticket,
    Compass,
    ArrowRight,
    Loader2,
    X,
} from 'lucide-react';

interface SearchResultItem {
    id?: number | string;
    title: string;
    subtitle: string;
    url: string;
    category: 'Patient' | 'Doctor' | 'Token' | 'Navigation';
}

interface CommandPaletteModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CommandPaletteModal({ isOpen, onClose }: CommandPaletteModalProps) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<{
        patients: SearchResultItem[];
        doctors: SearchResultItem[];
        tokens: SearchResultItem[];
        navigation: SearchResultItem[];
    }>({
        patients: [],
        doctors: [],
        tokens: [],
        navigation: [],
    });
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Focus input on open
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 50);
            fetchInitialSuggestions();
        }
    }, [isOpen]);

    const fetchInitialSuggestions = async () => {
        try {
            const res = await fetch('/api/search?q=');
            if (res.ok) {
                const data = await res.json();
                setResults({
                    patients: data.patients || [],
                    doctors: data.doctors || [],
                    tokens: data.tokens || [],
                    navigation: data.navigation || [],
                });
            }
        } catch {
            // Silently fail on network err
        }
    };

    // Live search debounced
    useEffect(() => {
        if (!isOpen) return;

        const timer = setTimeout(async () => {
            if (query.trim().length === 0) {
                fetchInitialSuggestions();
                return;
            }

            setLoading(true);
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
                if (res.ok) {
                    const data = await res.json();
                    setResults({
                        patients: data.patients || [],
                        doctors: data.doctors || [],
                        tokens: data.tokens || [],
                        navigation: data.navigation || [],
                    });
                    setSelectedIndex(0);
                }
            } finally {
                setLoading(false);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [query, isOpen]);

    // Flatten all items for keyboard navigation
    const allItems: SearchResultItem[] = [
        ...results.tokens,
        ...results.patients,
        ...results.doctors,
        ...results.navigation,
    ];

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1 < allItems.length ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : allItems.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const selected = allItems[selectedIndex];
            if (selected) {
                handleSelect(selected);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
    };

    const handleSelect = (item: SearchResultItem) => {
        onClose();
        router.visit(item.url);
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'Patient':
                return <User className="w-4 h-4 text-secondary-500" />;
            case 'Doctor':
                return <Stethoscope className="w-4 h-4 text-primary-500" />;
            case 'Token':
                return <Ticket className="w-4 h-4 text-accent-500" />;
            default:
                return <Compass className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md"
                        onClick={onClose}
                    />

                    {/* Modal Dialog */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.15 }}
                        className="relative w-full max-w-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 overflow-hidden z-10 flex flex-col max-h-[80vh]"
                    >
                        {/* Search Input Bar */}
                        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/70 dark:border-white/10">
                            <Search className="w-5 h-5 text-slate-400 shrink-0" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search patients (name/phone/NIC), doctors, tokens, or jump to page..."
                                className="w-full bg-transparent border-none outline-none text-sm sm:text-base text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0"
                            />
                            {loading ? (
                                <Loader2 className="w-4 h-4 text-primary-500 animate-spin shrink-0" />
                            ) : query ? (
                                <button
                                    onClick={() => setQuery('')}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            ) : (
                                <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">
                                    ESC
                                </kbd>
                            )}
                        </div>

                        {/* Results Body */}
                        <div className="overflow-y-auto p-2 divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[60vh]">
                            {allItems.length === 0 && !loading && (
                                <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                                    <Search className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm font-medium">No results found for "{query}"</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Try searching by patient phone (+94), NIC, doctor name, or token number.
                                    </p>
                                </div>
                            )}

                            {/* Grouped lists */}
                            {['Token', 'Patient', 'Doctor', 'Navigation'].map((category) => {
                                const categoryItems = allItems.filter((i) => i.category === category);
                                if (categoryItems.length === 0) return null;

                                return (
                                    <div key={category} className="py-2 first:pt-0 last:pb-0">
                                        <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                            {category === 'Navigation' ? 'Quick Pages' : category + 's'}
                                        </div>
                                        <div className="space-y-0.5 mt-1">
                                            {categoryItems.map((item) => {
                                                const globalIndex = allItems.indexOf(item);
                                                const isSelected = globalIndex === selectedIndex;

                                                return (
                                                    <div
                                                        key={`${item.category}-${item.title}-${globalIndex}`}
                                                        onClick={() => handleSelect(item)}
                                                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                                                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                                                            isSelected
                                                                ? 'bg-primary-50 dark:bg-primary-950/40 text-primary-900 dark:text-primary-100 border border-primary-200 dark:border-primary-800/50'
                                                                : 'hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                                                                {getCategoryIcon(item.category)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-semibold truncate">
                                                                    {item.title}
                                                                </div>
                                                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                                    {item.subtitle}
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <ArrowRight className={`w-4 h-4 shrink-0 transition-opacity ${isSelected ? 'opacity-100 text-primary-600 dark:text-primary-400' : 'opacity-0'}`} />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer Tips */}
                        <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-900/80 border-t border-slate-200/70 dark:border-white/10 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-3">
                                <span><kbd className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">↑↓</kbd> Navigate</span>
                                <span><kbd className="font-mono bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">↵</kbd> Select</span>
                            </div>
                            <span>Sri Lankan Channeling Search</span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
