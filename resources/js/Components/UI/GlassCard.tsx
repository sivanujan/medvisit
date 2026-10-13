import React, { CSSProperties, ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface GlassCardProps {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    animate?: boolean;
    delay?: number;
    hover?: boolean;
    onClick?: () => void;
}

export function GlassCard({
    children,
    className = '',
    style = {},
    animate = true,
    delay = 0,
    hover = false,
    onClick,
}: GlassCardProps) {
    const shouldReduceMotion = useReducedMotion();

    const baseClasses = `relative p-5 sm:p-6 rounded-3xl transition-all duration-300
        bg-white/75 dark:bg-slate-900/60
        border border-slate-200/80 dark:border-white/10
        backdrop-blur-xl
        shadow-sm dark:shadow-2xl
        ${hover ? 'hover:-translate-y-1 hover:shadow-lg dark:hover:border-primary/40' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}`;

    if (!animate) {
        return (
            <div className={baseClasses} style={style} onClick={onClick}>
                {children}
            </div>
        );
    }

    return (
        <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: delay * 0.05, ease: [0.16, 1, 0.3, 1] }}
            className={baseClasses}
            style={style}
            onClick={onClick}
        >
            {children}
        </motion.div>
    );
}

export default GlassCard;
