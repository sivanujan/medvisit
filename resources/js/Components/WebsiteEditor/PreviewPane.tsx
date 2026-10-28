import React, { useEffect, useRef, useState } from 'react';
import {
    Smartphone,
    Tablet,
    RotateCw,
    ExternalLink,
    Monitor,
} from 'lucide-react';
import type { SiteLook, SiteSection } from '@/Components/ClinicSite/types';

interface Props {
    sections: SiteSection[];
    look: SiteLook;
    selectedId: string | null;
    onSelect: (id: string) => void;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

type DeviceMode = 'mobile' | 'tablet';

export default function PreviewPane({
    sections,
    look,
    selectedId,
    onSelect,
}: Props) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [device, setDevice] = useState<DeviceMode>('mobile');
    const [iframeReady, setIframeReady] = useState(false);
    const [key, setKey] = useState(0);

    // Send state to preview iframe
    const sendState = () => {
        if (!iframeRef.current?.contentWindow) return;
        iframeRef.current.contentWindow.postMessage(
            {
                source: 'mv-editor',
                type: 'state',
                sections,
                look,
                selectedId,
            },
            window.location.origin,
        );
    };

    // Send scroll-to message when selected section changes
    const sendScrollTo = (id: string) => {
        if (!iframeRef.current?.contentWindow) return;
        iframeRef.current.contentWindow.postMessage(
            {
                source: 'mv-editor',
                type: 'scroll-to',
                id,
            },
            window.location.origin,
        );
    };

    // Sync whenever sections or look changes
    useEffect(() => {
        sendState();
    }, [sections, look, selectedId]);

    // Send scroll-to when selectedId changes
    useEffect(() => {
        if (selectedId) {
            sendScrollTo(selectedId);
        }
    }, [selectedId]);

    // Listen for preview messages (ready / select)
    useEffect(() => {
        const onMessage = (e: MessageEvent) => {
            if (e.origin !== window.location.origin || e.data?.source !== 'mv-preview') return;

            if (e.data.type === 'ready') {
                setIframeReady(true);
                sendState();
                if (selectedId) sendScrollTo(selectedId);
            } else if (e.data.type === 'select' && e.data.id) {
                onSelect(e.data.id);
            }
        };

        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [sections, look, selectedId, onSelect]);

    const handleReload = () => {
        setKey((k) => k + 1);
        setIframeReady(false);
    };

    return (
        <div className="flex flex-col h-full w-full bg-slate-100/70 dark:bg-slate-950/60 p-3 sm:p-4">
            {/* Top Toolbar: Mobile / Tablet toggles + Open Full Desktop button */}
            <div className="flex items-center justify-between gap-2 mb-3 px-1">
                <div className="flex items-center gap-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-1 shadow-xs">
                    <button
                        type="button"
                        onClick={() => setDevice('mobile')}
                        title="Mobile Preview (Phone View)"
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                            device === 'mobile'
                                ? 'bg-primary text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Smartphone className="h-3.5 w-3.5" />
                        <span>Mobile</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setDevice('tablet')}
                        title="Tablet Preview"
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                            device === 'tablet'
                                ? 'bg-primary text-white shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        <Tablet className="h-3.5 w-3.5" />
                        <span>Tablet</span>
                    </button>
                </div>

                {/* Right controls: Full Desktop Preview in new window & Reload */}
                <div className="flex items-center gap-1.5">
                    <a
                        href="/preview"
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open full-width Desktop preview in a new window"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-primary transition shadow-xs"
                    >
                        <Monitor className="h-3.5 w-3.5 text-primary" />
                        <span className="hidden sm:inline">Desktop Preview</span>
                        <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>

                    <button
                        type="button"
                        onClick={handleReload}
                        title="Reload preview"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:text-slate-900 dark:hover:text-white transition shadow-xs"
                    >
                        <RotateCw className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Device Container Frame (Natural Fit, No Distorted CSS Scale) */}
            <div className="flex-1 flex justify-center items-start overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-200/40 dark:bg-slate-900/50 shadow-inner p-2 sm:p-3">
                <div
                    className={`h-full transition-all duration-300 ease-in-out flex flex-col w-full ${
                        device === 'mobile'
                            ? 'max-w-[390px] rounded-[2rem] border-4 border-slate-800 dark:border-slate-700 shadow-2xl'
                            : 'max-w-[680px] rounded-2xl border-4 border-slate-800 dark:border-slate-700 shadow-2xl'
                    } bg-white dark:bg-slate-950 overflow-hidden`}
                >
                    {/* Device Header Bar / Notch */}
                    {device === 'mobile' && (
                        <div className="w-full bg-slate-800 dark:border-slate-700 h-5 shrink-0 flex items-center justify-center">
                            <div className="w-16 h-3 bg-slate-950 rounded-full" />
                        </div>
                    )}

                    <iframe
                        key={key}
                        ref={iframeRef}
                        src="/preview?embed=1"
                        title="Live Website Preview"
                        className="w-full flex-1 border-0 bg-white dark:bg-slate-950"
                        onLoad={() => {
                            sendState();
                            if (selectedId) sendScrollTo(selectedId);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
