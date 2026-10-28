import React, { useState, useRef, useEffect, ReactNode, ComponentType } from 'react';
import { MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from '@inertiajs/react';

export interface ActionMenuItem {
    label: string;
    icon?: ComponentType<{ className?: string }>;
    onClick?: (e: React.MouseEvent) => void;
    href?: string;
    danger?: boolean;
    disabled?: boolean;
    title?: string;
}

export interface ActionsMenuProps {
    items: (ActionMenuItem | null | undefined | false)[];
    align?: 'left' | 'right';
    placement?: 'bottom' | 'top' | 'auto';
    triggerClassName?: string;
    menuClassName?: string;
    ariaLabel?: string;
}

export function ActionsMenu({
    items = [],
    align = 'right',
    placement = 'auto',
    triggerClassName = '',
    menuClassName = '',
    ariaLabel = 'Actions menu',
}: ActionsMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [openUpward, setOpenUpward] = useState(placement === 'top');
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        function handleClickOutside(e: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node) &&
                buttonRef.current &&
                !buttonRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        }

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setIsOpen(false);
                buttonRef.current?.focus();
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    const handleToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            if (placement === 'top') {
                setOpenUpward(true);
            } else if (placement === 'bottom') {
                setOpenUpward(false);
            } else {
                setOpenUpward(spaceBelow < 260 && rect.top > spaceBelow);
            }
        }
        setIsOpen((prev) => !prev);
    };

    const alignClasses = align === 'left' ? 'left-0' : 'right-0';
    const verticalClasses = openUpward
        ? 'bottom-full mb-1.5 origin-bottom-right'
        : 'top-full mt-1.5 origin-top-right';
    const validItems = items.filter(Boolean) as ActionMenuItem[];

    return (
        <div className="relative inline-block text-left" ref={menuRef} onClick={(e) => e.stopPropagation()}>
            <button
                ref={buttonRef}
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="true"
                aria-expanded={isOpen}
                onClick={handleToggle}
                className={`p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isOpen ? 'bg-slate-100 dark:bg-white/[0.08] text-slate-800 dark:text-white' : ''
                } ${triggerClassName}`}
            >
                <MoreVertical className="w-4 h-4" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: openUpward ? 4 : -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: openUpward ? 4 : -4 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className={`absolute z-50 w-52 rounded-2xl p-1.5 shadow-2xl border
                            border-slate-200/90 dark:border-white/10
                            bg-white/95 dark:bg-slate-900/95
                            backdrop-blur-2xl
                            ${verticalClasses} ${alignClasses} ${menuClassName}`}
                    >
                        <div className="space-y-0.5" role="menu">
                            {validItems.map((item, idx) => {
                                const Icon = item.icon;
                                const isDanger = item.danger;

                                const itemClasses = `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors text-left
                                    ${
                                        isDanger
                                            ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 focus:bg-rose-500/10'
                                            : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 focus:bg-slate-100 dark:focus:bg-white/10'
                                    }
                                    ${item.disabled ? 'opacity-40 pointer-events-none' : ''}`;

                                const handleClick = (e: React.MouseEvent) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    if (item.onClick) item.onClick(e);
                                };

                                if (item.href) {
                                    return (
                                        <Link
                                            key={idx}
                                            href={item.href}
                                            role="menuitem"
                                            title={item.title || item.label}
                                            onClick={handleClick}
                                            className={itemClasses}
                                        >
                                            {Icon && <Icon className="w-4 h-4 shrink-0" />}
                                            <span className="truncate">{item.label}</span>
                                        </Link>
                                    );
                                }

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        role="menuitem"
                                        title={item.title || item.label}
                                        disabled={item.disabled}
                                        onClick={handleClick}
                                        className={itemClasses}
                                    >
                                        {Icon && <Icon className="w-4 h-4 shrink-0" />}
                                        <span className="truncate">{item.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ActionsMenu;
