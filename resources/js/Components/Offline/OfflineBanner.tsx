import React from 'react';
import { WifiOff, Wifi, RefreshCw, X } from 'lucide-react';
import { useOfflineStatus } from '@/Hooks/useOfflineStatus';

export default function OfflineBanner() {
    const {
        isOffline,
        isChecking,
        showBackOnlineToast,
        dismissToast,
        checkConnection,
    } = useOfflineStatus();

    return (
        <>
            {/* Top Offline Notification Banner */}
            {isOffline && (
                <div
                    role="alert"
                    aria-live="assertive"
                    className="mb-4 rounded-2xl border border-amber-300/80 bg-amber-50/95 p-3.5 sm:p-4 text-amber-950 shadow-sm backdrop-blur-sm dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-200 transition-all duration-200 animate-in fade-in slide-in-from-top-2"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-200/70 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300">
                                <WifiOff className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400">
                                        Offline Mode
                                    </span>
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm font-medium mt-0.5 leading-snug">
                                    You&apos;re offline — showing the last saved data. Changes will be saved when the connection is back.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <button
                                type="button"
                                onClick={() => checkConnection()}
                                disabled={isChecking}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white/80 px-3 py-1.5 text-xs font-bold text-amber-900 shadow-xs hover:bg-white active:scale-95 disabled:opacity-50 dark:border-amber-700/60 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60 transition-all cursor-pointer"
                            >
                                <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                                <span>{isChecking ? 'Checking...' : 'Check connection'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Back Online Toast */}
            {showBackOnlineToast && (
                <div
                    role="status"
                    aria-live="polite"
                    className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-950 shadow-lg dark:border-emerald-600/40 dark:bg-emerald-950/90 dark:text-emerald-100 transition-all animate-in fade-in slide-in-from-bottom-3 duration-300"
                >
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200 shrink-0">
                        <Wifi className="h-4 w-4" />
                    </div>
                    <div className="text-xs sm:text-sm">
                        <p className="font-bold">Back online</p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">Live connection restored & data refreshed.</p>
                    </div>
                    <button
                        type="button"
                        onClick={dismissToast}
                        aria-label="Dismiss back online message"
                        className="ml-2 rounded-lg p-1 text-emerald-700 hover:bg-emerald-200/50 dark:text-emerald-300 dark:hover:bg-emerald-800/50 cursor-pointer"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
        </>
    );
}
