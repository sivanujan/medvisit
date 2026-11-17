import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    ReactNode,
    isValidElement,
    Children,
    useId,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import FormLabel from './FormLabel';
import FormError from './FormError';

export interface SelectOption {
    value: string | number;
    label: string;
    description?: string;
    disabled?: boolean;
}

export interface SelectProps {
    label?: ReactNode;
    value?: string | number | null;
    defaultValue?: string | number;
    onChange?: (e: { target: { value: string; name?: string } }) => void;
    onValueChange?: (value: string) => void;
    options?: (SelectOption | string)[];
    children?: ReactNode;
    placeholder?: string;
    searchable?: boolean;
    disabled?: boolean;
    error?: string | null;
    helperText?: ReactNode;
    name?: string;
    id?: string;
    className?: string;
    containerClassName?: string;
    required?: boolean;
    optional?: boolean;
    'aria-label'?: string;
}

function normalizeOptions(
    optionsProp?: (SelectOption | string)[],
    children?: ReactNode
): SelectOption[] {
    if (optionsProp && optionsProp.length > 0) {
        return optionsProp.map((opt) => {
            if (typeof opt === 'string' || typeof opt === 'number') {
                return { value: String(opt), label: String(opt) };
            }
            return {
                value: String(opt.value),
                label: opt.label,
                description: opt.description,
                disabled: opt.disabled,
            };
        });
    }

    const extracted: SelectOption[] = [];
    if (children) {
        Children.forEach(children, (child) => {
            if (isValidElement(child)) {
                const props = child.props as any;
                if (props.value !== undefined) {
                    const label =
                        typeof props.children === 'string'
                            ? props.children
                            : Array.isArray(props.children)
                            ? props.children.filter((c: any) => typeof c === 'string').join(' ')
                            : String(props.value);

                    extracted.push({
                        value: String(props.value),
                        label: label || String(props.value),
                        disabled: Boolean(props.disabled),
                    });
                }
            }
        });
    }
    return extracted;
}

export function Select({
    label,
    value: controlledValue,
    defaultValue,
    onChange,
    onValueChange,
    options: optionsProp,
    children,
    placeholder = 'Select an option...',
    searchable,
    disabled = false,
    error,
    helperText,
    name,
    id: propId,
    className = '',
    containerClassName = '',
    required = false,
    optional = false,
    'aria-label': ariaLabel,
}: SelectProps) {
    const generatedId = useId();
    const id = propId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    const allOptions = normalizeOptions(optionsProp, children);

    // Auto-searchable when more than 8 options unless explicitly configured
    const isSearchable = searchable !== undefined ? searchable : allOptions.length > 8;

    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState<string>(() => {
        if (controlledValue !== undefined && controlledValue !== null) {
            return String(controlledValue);
        }
        if (defaultValue !== undefined && defaultValue !== null) {
            return String(defaultValue);
        }
        return '';
    });

    const currentValue = isControlled
        ? controlledValue === null || controlledValue === undefined
            ? ''
            : String(controlledValue)
        : internalValue;

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const [coords, setCoords] = useState<{
        top: number;
        left: number;
        width: number;
        openUpward: boolean;
    }>({ top: 0, left: 0, width: 0, openUpward: false });

    const filteredOptions = allOptions.filter((opt) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            opt.label.toLowerCase().includes(q) ||
            (opt.description && opt.description.toLowerCase().includes(q))
        );
    });

    const selectedOption = allOptions.find((opt) => opt.value === currentValue);

    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 280;

        const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

        setCoords({
            top: openUpward ? rect.top - 6 : rect.bottom + 6,
            left: rect.left,
            width: rect.width,
            openUpward,
        });
    }, []);

    const handleOpen = () => {
        if (disabled) return;
        updatePosition();
        setIsOpen(true);
        setSearchQuery('');
        const curIdx = filteredOptions.findIndex((o) => o.value === currentValue);
        setFocusedIndex(curIdx >= 0 ? curIdx : 0);
    };

    const handleClose = () => {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
        triggerRef.current?.focus();
    };

    const selectValue = (val: string | number) => {
        const strVal = String(val);
        if (!isControlled) {
            setInternalValue(strVal);
        }
        if (onChange) {
            onChange({ target: { value: strVal, name } });
        }
        if (onValueChange) {
            onValueChange(strVal);
        }
        handleClose();
    };

    useEffect(() => {
        if (!isOpen) return;
        updatePosition();

        const handleScrollOrResize = () => {
            updatePosition();
        };

        window.addEventListener('resize', handleScrollOrResize);
        window.addEventListener('scroll', handleScrollOrResize, true);
        return () => {
            window.removeEventListener('resize', handleScrollOrResize);
            window.removeEventListener('scroll', handleScrollOrResize, true);
        };
    }, [isOpen, updatePosition]);

    useEffect(() => {
        if (isOpen && isSearchable) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    }, [isOpen, isSearchable]);

    useEffect(() => {
        if (!isOpen) return;

        const handlePointerDown = (e: MouseEvent | TouchEvent) => {
            const target = e.target as Node;
            if (
                triggerRef.current?.contains(target) ||
                dropdownRef.current?.contains(target)
            ) {
                return;
            }
            handleClose();
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('touchstart', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('touchstart', handlePointerDown);
        };
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (!isOpen) {
            if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
                e.preventDefault();
                handleOpen();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex((prev) => {
                    const next = prev + 1;
                    return next >= filteredOptions.length ? 0 : next;
                });
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex((prev) => {
                    const next = prev - 1;
                    return next < 0 ? filteredOptions.length - 1 : next;
                });
                break;
            case 'Enter':
                e.preventDefault();
                if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
                    const opt = filteredOptions[focusedIndex];
                    if (!opt.disabled) {
                        selectValue(opt.value);
                    }
                }
                break;
            case 'Escape':
                e.preventDefault();
                handleClose();
                break;
            case 'Tab':
                setIsOpen(false);
                break;
        }
    };

    const hasError = Boolean(error);

    return (
        <div className={`relative w-full ${containerClassName}`}>
            {label && (
                <FormLabel htmlFor={id} required={required} optional={optional}>
                    {label}
                </FormLabel>
            )}

            <input
                type="hidden"
                name={name}
                id={id}
                value={currentValue}
                required={required}
            />

            {/* 44px (h-11) standardized trigger */}
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => (isOpen ? handleClose() : handleOpen())}
                onKeyDown={handleKeyDown}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={ariaLabel || (typeof label === 'string' ? label : placeholder)}
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : helperText ? helperId : undefined}
                className={`h-11 w-full flex items-center justify-between gap-2 px-3.5 rounded-xl text-[15px] font-normal transition-all duration-200 outline-none select-none text-left
                    bg-white/80 hover:bg-white focus:bg-white dark:bg-slate-900/60 dark:hover:bg-slate-900/80 dark:focus:bg-slate-900/90
                    text-slate-900 dark:text-white
                    backdrop-blur-md shadow-xs
                    border ${
                        hasError
                            ? 'border-rose-400 dark:border-rose-500 ring-4 ring-rose-500/15'
                            : isOpen
                            ? 'border-[#1E6FD9] ring-4 ring-[#1E6FD9]/15'
                            : 'border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            >
                <div className="flex-1 text-left min-w-0">
                    <span
                        className={`block truncate ${
                            !selectedOption && !currentValue
                                ? 'text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white font-normal'
                        }`}
                    >
                        {selectedOption ? selectedOption.label : (currentValue || placeholder)}
                    </span>
                    {selectedOption?.description && (
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {selectedOption.description}
                        </span>
                    )}
                </div>
                <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-180 text-[#1E6FD9]' : ''
                    }`}
                />
            </button>

            {hasError && <FormError message={error} id={errorId} />}

            {!hasError && helperText && (
                <p id={helperId} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {helperText}
                </p>
            )}

            {/* Portal Dropdown Menu */}
            {isOpen &&
                typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={dropdownRef}
                        role="listbox"
                        style={{
                            position: 'fixed',
                            top: coords.openUpward ? undefined : `${coords.top}px`,
                            bottom: coords.openUpward
                                ? `${window.innerHeight - coords.top}px`
                                : undefined,
                            left: `${coords.left}px`,
                            width: `${coords.width}px`,
                            zIndex: 99999,
                        }}
                        className="rounded-2xl border border-slate-200/80 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
                        onKeyDown={handleKeyDown}
                    >
                        {isSearchable && (
                            <div className="p-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                                <div className="relative flex items-center">
                                    <Search className="absolute left-2.5 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setFocusedIndex(0);
                                        }}
                                        placeholder="Search..."
                                        className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-[#1E6FD9] focus:ring-1 focus:ring-[#1E6FD9]"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 overscroll-contain">
                            {filteredOptions.length === 0 ? (
                                <div className="py-4 text-center text-xs text-slate-400">
                                    No options found
                                </div>
                            ) : (
                                filteredOptions.map((opt, idx) => {
                                    const isSelected = opt.value === currentValue;
                                    const isFocused = idx === focusedIndex;

                                    return (
                                        <button
                                            key={`${opt.value}-${idx}`}
                                            type="button"
                                            role="option"
                                            aria-selected={isSelected}
                                            disabled={opt.disabled}
                                            onClick={() => selectValue(opt.value)}
                                            onMouseEnter={() => setFocusedIndex(idx)}
                                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-sm transition-colors cursor-pointer select-none ${
                                                opt.disabled
                                                    ? 'opacity-40 cursor-not-allowed'
                                                    : isSelected
                                                    ? 'bg-[#1E6FD9]/10 text-[#1E6FD9] dark:bg-[#1E6FD9]/20 dark:text-blue-300 font-medium'
                                                    : isFocused
                                                    ? 'bg-slate-100/80 dark:bg-white/10 text-slate-900 dark:text-white'
                                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                            }`}
                                        >
                                            <div className="min-w-0 pr-2">
                                                <div className="truncate">{opt.label}</div>
                                                {opt.description && (
                                                    <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                                        {opt.description}
                                                    </div>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <Check className="w-4 h-4 text-[#1E6FD9] shrink-0" />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>,
                    document.body
                )}
        </div>
    );
}

export default Select;
