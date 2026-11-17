import React, { useEffect, useRef, useState, ReactNode } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { modalBackdropVariants, modalPanelVariants } from '@/Utils/motion';

export interface FormModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    isDirty?: boolean;
    isSubmitting?: boolean;
    submitLabel?: string;
    cancelLabel?: string;
    onSubmit?: (e: React.FormEvent) => void;
    extraFooterActions?: ReactNode;
    maxWidth?: string; // default 'sm:max-w-[720px]'
    className?: string;
    contentClassName?: string;
}

export function FormModal({
    isOpen,
    onClose,
    title,
    description,
    children,
    isDirty = false,
    isSubmitting = false,
    submitLabel = 'Save changes',
    cancelLabel = 'Cancel',
    onSubmit,
    extraFooterActions,
    maxWidth = 'sm:max-w-[720px]',
    className = '',
    contentClassName = '',
}: FormModalProps) {
    const shouldReduceMotion = useReducedMotion();
    const contentRef = useRef<HTMLDivElement>(null);
    const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);

    // Reset unsaved warning on open
    useEffect(() => {
        if (isOpen) {
            setShowUnsavedWarning(false);
            if (contentRef.current) {
                contentRef.current.scrollTop = 0;
            }
        }
    }, [isOpen]);

    // Handle close request with dirty check
    const handleAttemptClose = () => {
        if (isSubmitting) return;

        if (isDirty) {
            setShowUnsavedWarning(true);
        } else {
            onClose();
        }
    };

    const confirmDiscardAndClose = () => {
        setShowUnsavedWarning(false);
        onClose();
    };

    // ESC key listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                if (showUnsavedWarning) {
                    setShowUnsavedWarning(false);
                } else {
                    handleAttemptClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, showUnsavedWarning, isDirty, isSubmitting]);

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

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 sm:p-6 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        variants={modalBackdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        onClick={handleAttemptClose}
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
                        aria-hidden="true"
                    />

                    {/* Modal Panel / Mobile Sheet */}
                    <motion.div
                        variants={modalPanelVariants(shouldReduceMotion ?? false)}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={`relative w-full ${maxWidth} z-10 h-full sm:h-auto sm:max-h-[calc(100vh-3.5rem)] flex flex-col rounded-none sm:rounded-3xl border-0 sm:border border-white/60 dark:border-white/10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl overflow-hidden ${className}`}
                    >
                        {/* Unsaved changes confirmation dialog overlay */}
                        {showUnsavedWarning && (
                            <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
                                <div className="w-full max-w-sm rounded-2xl p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl text-center space-y-3">
                                    <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-500 mx-auto flex items-center justify-center">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                                        Discard unsaved changes?
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        You have unsaved changes in this form. If you close now, your changes will be lost.
                                    </p>
                                    <div className="flex items-center justify-center gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowUnsavedWarning(false)}
                                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                        >
                                            Keep editing
                                        </button>
                                        <button
                                            type="button"
                                            onClick={confirmDiscardAndClose}
                                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-sm"
                                        >
                                            Discard & close
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Sticky Header */}
                        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200/70 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                            <div className="pr-4">
                                <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                                    {title}
                                </h3>
                                {description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate max-w-xl">
                                        {description}
                                    </p>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={handleAttemptClose}
                                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1E6FD9]"
                                aria-label="Close dialog"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Form / Scrollable Body */}
                        {onSubmit ? (
                            <form
                                onSubmit={onSubmit}
                                className="flex flex-col flex-1 min-h-0 overflow-hidden"
                            >
                                <div
                                    ref={contentRef}
                                    className={`overflow-y-auto flex-1 p-6 overscroll-contain space-y-5 ${contentClassName}`}
                                >
                                    {children}
                                </div>

                                {/* Sticky Footer */}
                                <div className="shrink-0 px-6 py-3.5 border-t border-slate-200/70 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-end gap-2.5">
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={handleAttemptClose}
                                        className="px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                                    >
                                        {cancelLabel}
                                    </button>

                                    {extraFooterActions}

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white bg-[#1E6FD9] hover:bg-blue-600 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all cursor-pointer"
                                    >
                                        {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        <span>{isSubmitting ? 'Saving...' : submitLabel}</span>
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <>
                                <div
                                    ref={contentRef}
                                    className={`overflow-y-auto flex-1 p-6 overscroll-contain space-y-5 ${contentClassName}`}
                                >
                                    {children}
                                </div>
                                <div className="shrink-0 px-6 py-3.5 border-t border-slate-200/70 dark:border-white/10 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-end gap-2.5">
                                    <button
                                        type="button"
                                        disabled={isSubmitting}
                                        onClick={handleAttemptClose}
                                        className="px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                                    >
                                        {cancelLabel}
                                    </button>
                                    {extraFooterActions}
                                </div>
                            </>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}

export default FormModal;
