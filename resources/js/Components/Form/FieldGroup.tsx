import React, { ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface FieldGroupProps {
    title: ReactNode;
    icon?: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    collapsible?: boolean;
    defaultOpen?: boolean;
    badge?: ReactNode;
    className?: string;
}

export function FieldGroup({
    title,
    icon,
    description,
    children,
    collapsible = false,
    defaultOpen = true,
    badge,
    className = '',
}: FieldGroupProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className={`space-y-3.5 ${className}`}>
            <div
                className={`flex items-center justify-between ${
                    collapsible ? 'cursor-pointer select-none' : ''
                }`}
                onClick={() => collapsible && setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-2">
                    {icon && (
                        <div className="w-6 h-6 rounded-lg bg-[#1E6FD9]/10 text-[#1E6FD9] dark:bg-[#1E6FD9]/20 dark:text-blue-300 flex items-center justify-center shrink-0">
                            {icon}
                        </div>
                    )}
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                                {title}
                            </h4>
                            {badge && <div>{badge}</div>}
                        </div>
                        {description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {description}
                            </p>
                        )}
                    </div>
                </div>

                {collapsible && (
                    <button
                        type="button"
                        aria-expanded={isOpen}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                    >
                        <ChevronDown
                            className={`w-4 h-4 transition-transform duration-200 ${
                                isOpen ? 'rotate-180 text-[#1E6FD9]' : ''
                            }`}
                        />
                    </button>
                )}
            </div>

            {collapsible ? (
                <AnimatePresence initial={false}>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden space-y-3.5 pt-1"
                        >
                            {children}
                        </motion.div>
                    )}
                </AnimatePresence>
            ) : (
                <div className="space-y-3.5">{children}</div>
            )}
        </div>
    );
}

export default FieldGroup;
