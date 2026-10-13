import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
    preference: ThemePreference;
    resolved: ResolvedTheme;
    setPreference: (theme: ThemePreference) => void;
    toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'medvisit_theme';

function systemPrefersDark(): boolean {
    return typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-color-scheme: dark)').matches
        : false;
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
    return preference === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : preference;
}

export function ThemeProvider({
    initialPreference = 'system',
    children,
}: {
    initialPreference?: ThemePreference;
    children: ReactNode;
}) {
    const [preference, setPreferenceState] = useState<ThemePreference>(() => {
        if (typeof window === 'undefined') return initialPreference;
        return (window.localStorage.getItem(STORAGE_KEY) as ThemePreference) || initialPreference;
    });

    const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(preference));

    useEffect(() => {
        const nextResolved = resolveTheme(preference);
        setResolved(nextResolved);

        if (typeof document !== 'undefined') {
            document.documentElement.classList.toggle('dark', nextResolved === 'dark');
        }

        if (preference !== 'system') return undefined;

        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => {
            const sysResolved = resolveTheme('system');
            setResolved(sysResolved);
            if (typeof document !== 'undefined') {
                document.documentElement.classList.toggle('dark', sysResolved === 'dark');
            }
        };

        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [preference]);

    const setPreference = useCallback((next: ThemePreference) => {
        setPreferenceState(next);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(STORAGE_KEY, next);
        }
    }, []);

    const toggle = useCallback(() => {
        setPreference(resolveTheme(preference) === 'dark' ? 'light' : 'dark');
    }, [preference, setPreference]);

    return (
        <ThemeContext.Provider value={{ preference, resolved, setPreference, toggle }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
        return {
            preference: isDark ? 'dark' : 'light',
            resolved: isDark ? 'dark' : 'light',
            setPreference: () => {},
            toggle: () => {},
        };
    }
    return ctx;
}

export default ThemeProvider;
