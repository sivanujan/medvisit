import { useState, useEffect, useRef, useCallback } from 'react';
import { usePage, router } from '@inertiajs/react';
import { PageProps } from '@/types';

export interface UseOfflineStatusReturn {
    isOffline: boolean;
    isChecking: boolean;
    showBackOnlineToast: boolean;
    dismissToast: () => void;
    checkConnection: () => Promise<boolean>;
}

export function useOfflineStatus(): UseOfflineStatusReturn {
    const { offline } = usePage<PageProps>().props;
    const isPhase0Enabled = Boolean(offline?.enabled && offline?.phase_0);
    const pingIntervalSeconds = offline?.ping_interval_seconds || 15;

    // Start with navigator.onLine if browser supports it
    const [isOffline, setIsOffline] = useState<boolean>(() => {
        if (!isPhase0Enabled) return false;
        if (typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean') {
            return !navigator.onLine;
        }
        return false;
    });

    const [isChecking, setIsChecking] = useState<boolean>(false);
    const [showBackOnlineToast, setShowBackOnlineToast] = useState<boolean>(false);
    const wasOfflineRef = useRef<boolean>(isOffline);
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Active ping function to test real Internet connectivity via /up
    const checkConnection = useCallback(async (): Promise<boolean> => {
        if (!isPhase0Enabled) return true;

        // If navigator says offline, don't even wait for ping to timeout
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            setIsOffline(true);
            wasOfflineRef.current = true;
            return false;
        }

        setIsChecking(true);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        try {
            const res = await fetch(`/up?_t=${Date.now()}`, {
                method: 'HEAD',
                cache: 'no-store',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const online = res.ok;

            if (online) {
                if (wasOfflineRef.current) {
                    // Transition: Offline -> Online
                    wasOfflineRef.current = false;
                    setIsOffline(false);
                    setShowBackOnlineToast(true);

                    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
                    toastTimerRef.current = setTimeout(() => {
                        setShowBackOnlineToast(false);
                    }, 5000);

                    // Auto-refresh page data via Inertia reload
                    try {
                        router.reload();
                    } catch {
                        // Ignore reload errors during rapid network shifts
                    }

                    // Attempt Reverb reconnection if Echo is loaded
                    try {
                        if (typeof window !== 'undefined' && window.Echo) {
                            const pusher = (window.Echo.connector as any)?.pusher;
                            if (pusher?.connection?.state === 'disconnected' || pusher?.connection?.state === 'unavailable') {
                                pusher.connect();
                            }
                        }
                    } catch {
                        // Echo reconnection is best-effort
                    }
                } else {
                    setIsOffline(false);
                }
                return true;
            } else {
                wasOfflineRef.current = true;
                setIsOffline(true);
                return false;
            }
        } catch {
            clearTimeout(timeoutId);
            wasOfflineRef.current = true;
            setIsOffline(true);
            return false;
        } finally {
            setIsChecking(false);
        }
    }, [isPhase0Enabled]);

    useEffect(() => {
        if (!isPhase0Enabled) return;

        const handleBrowserOnline = () => {
            // Browser reports network adapter connected, verify true connectivity via ping
            checkConnection();
        };

        const handleBrowserOffline = () => {
            wasOfflineRef.current = true;
            setIsOffline(true);
            setShowBackOnlineToast(false);
        };

        window.addEventListener('online', handleBrowserOnline);
        window.addEventListener('offline', handleBrowserOffline);

        // Periodic heartbeat ping every N seconds
        const intervalId = setInterval(() => {
            checkConnection();
        }, pingIntervalSeconds * 1000);

        return () => {
            window.removeEventListener('online', handleBrowserOnline);
            window.removeEventListener('offline', handleBrowserOffline);
            clearInterval(intervalId);
            if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        };
    }, [isPhase0Enabled, pingIntervalSeconds, checkConnection]);

    const dismissToast = useCallback(() => {
        setShowBackOnlineToast(false);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    }, []);

    return {
        isOffline,
        isChecking,
        showBackOnlineToast,
        dismissToast,
        checkConnection,
    };
}
