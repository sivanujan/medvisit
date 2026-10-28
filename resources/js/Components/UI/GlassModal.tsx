import React, { useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { modalBackdropVariants, modalPanelVariants } from '@/Utils/motion';

export interface GlassModalProps {
    isOpen?: boolean;
    onClose: () => void;
    title?: ReactNode;
    subtitle?: ReactNode;
    children: ReactNode;
    maxWidth?: 'max-w-md' | 'max-w-lg' | 'max-w-xl' | 'max-w-2xl' | 'max-w-3xl' | 'max-w-4xl' | 'max-w-5xl';
    className?: string;
}

export function GlassModal({
    isOpen = false,
    onClose,
    title,
    subtitle,
    children,
    maxWidth = 'max-w-xl',
    className = '',
}: GlassModalProps) {
    const shouldReduceMotion = useReducedMotion();
    const contentRef = useRef<HTMLDivElement>(null);

    // ESC key listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Body scroll lock
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        variants={modalBackdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-950/50 backdrop-blur-md"
                        aria-hidden="true"
                    />

                    {/* Modal Card */}
                    <motion.div
                        variants={modalPanelVariants(shouldReduceMotion ?? false)}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={`relative w-full ${maxWidth} z-10 max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] flex flex-col overflow-hidden rounded-3xl border border-white/60 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl shadow-2xl ${className}`}
                    >
                        {/* Header */}
                        {(Boolean(title) || Boolean(onClose)) && (
                            <div className="shrink-0 flex items-center justify-between px-6 py-4.5 border-b border-slate-200/70 dark:border-white/10">
                                <div>
                                    {title && (
                                        <h3 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                                            {title}
                                        </h3>
                                    )}
                                    {subtitle && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                            {subtitle}
                                        </p>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                    aria-label="Close dialog"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Content */}
                        <div ref={contentRef} className="overflow-y-auto flex-1 p-6 overscroll-contain">
                            {children}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default GlassModal;
