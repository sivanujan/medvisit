import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/Contexts/ThemeContext';

interface ThemeToggleProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function ThemeToggle({ className = '', size = 'md' }: ThemeToggleProps) {
    const { resolved, toggle } = useTheme();
    const isDark = resolved === 'dark';

    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-9 h-9',
        lg: 'w-10 h-10',
    }[size];

    return (
        <button
            type="button"
            onClick={toggle}
            className={`group relative flex items-center justify-center rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary-300 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs backdrop-blur-md cursor-pointer ${sizeClasses} ${className}`}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
            {isDark ? (
                <Sun className="h-4 w-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
            ) : (
                <Moon className="h-4 w-4 text-primary transition-transform duration-300 group-hover:-rotate-12" />
            )}
        </button>
    );
}

export default ThemeToggle;
