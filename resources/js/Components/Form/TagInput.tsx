import React, { useState, KeyboardEvent, useId, ReactNode } from 'react';
import { X } from 'lucide-react';
import FormLabel from './FormLabel';
import FormError from './FormError';

export interface TagInputProps {
    label?: ReactNode;
    value?: string | string[]; // Can be comma-separated string or string array
    onChange: (value: string) => void;
    placeholder?: string;
    helperText?: ReactNode;
    error?: string | null;
    required?: boolean;
    optional?: boolean;
    disabled?: boolean;
    className?: string;
    containerClassName?: string;
    id?: string;
}

export function TagInput({
    label,
    value = '',
    onChange,
    placeholder = 'Type and press enter...',
    helperText,
    error,
    required = false,
    optional = false,
    disabled = false,
    className = '',
    containerClassName = '',
    id: propId,
}: TagInputProps) {
    const generatedId = useId();
    const id = propId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    // Convert value to array of tags
    const tags: string[] = Array.isArray(value)
        ? value
        : typeof value === 'string' && value.trim()
        ? value.split(',').map((t) => t.trim()).filter(Boolean)
        : [];

    const [inputValue, setInputValue] = useState('');

    const addTag = (tagToAdd: string) => {
        const clean = tagToAdd.trim().replace(/,/g, '');
        if (clean && !tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
            const next = [...tags, clean];
            onChange(next.join(', '));
        }
        setInputValue('');
    };

    const removeTag = (indexToRemove: number) => {
        const next = tags.filter((_, i) => i !== indexToRemove);
        onChange(next.join(', '));
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
            e.preventDefault();
            removeTag(tags.length - 1);
        }
    };

    const hasError = Boolean(error);

    return (
        <div className={`w-full ${containerClassName}`}>
            {label && (
                <FormLabel htmlFor={id} required={required} optional={optional}>
                    {label}
                </FormLabel>
            )}

            <div
                className={`min-h-[44px] w-full p-1.5 rounded-xl flex flex-wrap items-center gap-1.5 transition-all duration-200
                    bg-white/80 dark:bg-slate-900/60 backdrop-blur-md shadow-xs
                    border ${
                        hasError
                            ? 'border-rose-400 dark:border-rose-500 ring-4 ring-rose-500/15'
                            : 'border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 focus-within:border-[#1E6FD9] focus-within:ring-4 focus-within:ring-[#1E6FD9]/15'
                    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
            >
                {tags.map((tag, idx) => (
                    <span
                        key={`${tag}-${idx}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-white/10"
                    >
                        <span>{tag}</span>
                        {!disabled && (
                            <button
                                type="button"
                                onClick={() => removeTag(idx)}
                                className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                aria-label={`Remove ${tag}`}
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </span>
                ))}

                <input
                    id={id}
                    type="text"
                    disabled={disabled}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                        if (inputValue.trim()) {
                            addTag(inputValue);
                        }
                    }}
                    placeholder={tags.length === 0 ? placeholder : 'Add more...'}
                    aria-invalid={hasError}
                    aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
                    className="flex-1 min-w-[120px] h-7 px-2 bg-transparent text-[14px] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
                />
            </div>

            {hasError && <FormError message={error} id={errorId} />}

            {!hasError && helperText && (
                <p id={helperId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {helperText}
                </p>
            )}
        </div>
    );
}

export default TagInput;
