import React, {
    useState,
    useRef,
    useEffect,
    useCallback,
    ReactNode,
    isValidElement,
    Children,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

export interface GlassSelectOption {
    value: string | number;
    label: string;
    description?: string;
    disabled?: boolean;
}

export interface GlassSelectProps {
    value?: string | number | null;
    defaultValue?: string | number;
    onChange?: (e: { target: { value: string; name?: string } }) => void;
    onValueChange?: (value: string) => void;
    options?: (GlassSelectOption | string)[];
    children?: ReactNode;
    placeholder?: string;
    searchable?: boolean;
    disabled?: boolean;
    error?: boolean | string;
    name?: string;
    id?: string;
    className?: string;
    portalClassName?: string;
    'aria-label'?: string;
    required?: boolean;
}

/**
 * Normalized option object from either options prop or option children.
 */
function normalizeOptions(
    optionsProp?: (GlassSelectOption | string)[],
    children?: ReactNode
): GlassSelectOption[] {
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

    const extracted: GlassSelectOption[] = [];
    if (children) {
        Children.forEach(children, (child) => {
            if (isValidElement(child)) {
                // If child is <option>
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

export default function GlassSelect({
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
    name,
    id,
    className = '',
    portalClassName = '',
    'aria-label': ariaLabel,
    required = false,
}: GlassSelectProps) {
    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState<string>(
        isControlled
            ? String(controlledValue ?? '')
            : String(defaultValue ?? '')
    );

    const currentValue = isControlled ? String(controlledValue ?? '') : internalValue;

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [focusedIndex, setFocusedIndex] = useState(-1);

    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Floating position state
    const [coords, setCoords] = useState<{
        top: number;
        left: number;
        width: number;
        openUpward: boolean;
    }>({
        top: 0,
        left: 0,
        width: 0,
        openUpward: false,
    });

    const options = normalizeOptions(optionsProp, children);

    // Determine if search input should be visible
    const isSearchable = searchable !== undefined ? searchable : options.length >= 6;

    const selectedOption = options.find((opt) => opt.value === currentValue);

    // Filter options based on search query
    const filteredOptions = searchQuery.trim()
        ? options.filter((opt) =>
              opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (opt.description && opt.description.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        : options;

    // Calculate menu position relative to viewport
    const updatePosition = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 280; // approximate max-height

        const openUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

        setCoords({
            top: openUpward ? rect.top - 8 : rect.bottom + 8,
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

    // Auto-update position on scroll / resize while open
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

    // Focus search input when open
    useEffect(() => {
        if (isOpen && isSearchable) {
            setTimeout(() => {
                searchInputRef.current?.focus();
            }, 50);
        }
    }, [isOpen, isSearchable]);

    // Click outside handler
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

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleOpen();
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setFocusedIndex((prev) =>
                    prev < filteredOptions.length - 1 ? prev + 1 : 0
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredOptions.length - 1
                );
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

    return (
        <div className="relative w-full">
            {/* Hidden native input so FormData / HTML forms pick it up if needed */}
            <input
                type="hidden"
                name={name}
                id={id}
                value={currentValue}
                required={required}
            />

            {/* Trigger Button */}
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={() => (isOpen ? handleClose() : handleOpen())}
                onKeyDown={handleKeyDown}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={ariaLabel || placeholder}
                className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none select-none text-left
                    bg-white/90 hover:bg-white dark:bg-slate-900/90 dark:hover:bg-slate-900
                    text-slate-900 dark:text-slate-100
                    backdrop-blur-md
                    border ${
                        error
                            ? 'border-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
                            : isOpen
                            ? 'border-primary ring-4 ring-primary/15'
                            : 'border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                    }
                    shadow-xs disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            >
                <div className="flex-1 text-left min-w-0 py-0.5">
                    <span className={`block truncate ${!selectedOption && !currentValue ? 'text-slate-400 dark:text-slate-500' : 'font-medium'}`}>
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
                        isOpen ? 'rotate-180 text-primary' : ''
                    }`}
                />
            </button>

            {/* Floating Portal Menu */}
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
                        onKeyDown={handleKeyDown}
                        className={`rounded-2xl border border-slate-200/90 dark:border-white/10
                            bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl
                            shadow-2xl shadow-slate-900/20 dark:shadow-black/60
                            overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150 ${portalClassName}`}
                    >
                        {/* Search Filter Bar */}
                        {isSearchable && (
                            <div className="p-2 border-b border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-slate-800/40">
                                <div className="relative flex items-center">
                                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setFocusedIndex(0);
                                        }}
                                        placeholder="Type to search..."
                                        className="w-full text-xs pl-8 pr-7 py-1.5 rounded-lg border-none bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none ring-1 ring-slate-200 dark:ring-white/10 focus:ring-2 focus:ring-primary"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Options List */}
                        <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5">
                            {filteredOptions.length === 0 ? (
                                <div className="py-6 px-3 text-center text-xs text-slate-400 dark:text-slate-500">
                                    No options match your search.
                                </div>
                            ) : (
                                filteredOptions.map((opt, idx) => {
                                    const isSelected = opt.value === currentValue;
                                    const isFocused = idx === focusedIndex;

                                    return (
                                        <button
                                            key={`${opt.value}-${idx}`}
                                            type="button"
                                            disabled={opt.disabled}
                                            onClick={() => !opt.disabled && selectValue(opt.value)}
                                            onMouseEnter={() => setFocusedIndex(idx)}
                                            role="option"
                                            aria-selected={isSelected}
                                            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl text-xs transition-colors select-none text-left ${
                                                opt.disabled
                                                    ? 'opacity-40 cursor-not-allowed text-slate-400'
                                                    : isSelected
                                                    ? 'bg-primary text-white font-bold shadow-xs'
                                                    : isFocused
                                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <div className="truncate">{opt.label}</div>
                                                {opt.description && (
                                                    <div
                                                        className={`text-[10px] truncate mt-0.5 ${
                                                            isSelected
                                                                ? 'text-white/80'
                                                                : 'text-slate-400 dark:text-slate-500'
                                                        }`}
                                                    >
                                                        {opt.description}
                                                    </div>
                                                )}
                                            </div>
                                            {isSelected && (
                                                <Check className="w-4 h-4 shrink-0 text-white" />
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
