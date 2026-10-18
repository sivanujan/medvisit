import React, { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser';
import { Camera, X, Flashlight, Keyboard, AlertCircle, CheckCircle2, Repeat, Maximize2 } from 'lucide-react';
import GlassModal from '@/Components/UI/GlassModal';
import {
    BarcodeScanDeduplicator,
    playScanBeep,
    triggerScanHaptic,
} from '@/Utils/barcodeScannerLogic';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onScan?: (barcode: string) => void | Promise<void>;
    onDetected?: (barcode: string) => void | Promise<void>;
    title?: string;
    isLocked?: boolean;
    allowContinuous?: boolean;
    initialContinuous?: boolean;
}

export default function BarcodeScanner({
    isOpen,
    onClose,
    onScan,
    onDetected,
    title = 'Scan Barcode',
    isLocked = false,
    allowContinuous = true,
    initialContinuous = false,
}: Props) {
    const triggerScan = onScan || onDetected || (() => {});
    const videoRef = useRef<HTMLVideoElement>(null);
    const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
    const controlsRef = useRef<IScannerControls | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // Scanner deduplicator (2 second cooldown per code)
    const deduplicatorRef = useRef<BarcodeScanDeduplicator>(new BarcodeScanDeduplicator(2000));

    const [isContinuous, setIsContinuous] = useState<boolean>(initialContinuous);
    const [cameraActive, setCameraActive] = useState<boolean>(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [manualCode, setManualCode] = useState<string>('');
    const [torchOn, setTorchOn] = useState<boolean>(false);
    const [lastScannedFeedback, setLastScannedFeedback] = useState<string | null>(null);
    const [scanFlash, setScanFlash] = useState<boolean>(false);

    // Sync external isLocked prop to deduplicator
    useEffect(() => {
        deduplicatorRef.current.setLocked(isLocked);
    }, [isLocked]);

    // Handle open / close lifecycle
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            setManualCode('');
            setCameraError(null);
            setLastScannedFeedback(null);
            deduplicatorRef.current.reset();
            return;
        }

        startScanning();

        return () => {
            stopCamera();
        };
    }, [isOpen]);

    // Handle pause/lock changes while open
    useEffect(() => {
        if (!isOpen) return;

        if (isLocked) {
            // If locked (e.g. Link modal opens), stop the camera to free hardware & avoid background frame decodes
            stopCamera();
        } else if (!cameraActive && !cameraError) {
            // Resume if unlocked
            startScanning();
        }
    }, [isLocked]);

    const handleDecode = async (text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        // 1. Check de-duplication: 2-second cooldown per code & locked status
        if (!deduplicatorRef.current.shouldAccept(trimmed)) {
            return;
        }

        // 2. Audio & Haptic feedback
        playScanBeep();
        triggerScanHaptic(100);

        // 3. Visual feedback
        setLastScannedFeedback(trimmed);
        setScanFlash(true);
        setTimeout(() => setScanFlash(false), 500);

        // 4. Mode behavior
        if (!isContinuous) {
            // Single-scan mode: close camera and modal immediately after one accepted read
            stopCamera();
            onClose();
            await triggerScan(trimmed);
        } else {
            // Continuous mode: keep camera active, trigger callback, allow next barcode or re-scan after cooldown
            await triggerScan(trimmed);
        }
    };

    const startScanning = async () => {
        try {
            setCameraError(null);
            const codeReader = new BrowserMultiFormatReader();
            codeReaderRef.current = codeReader;

            if (!videoRef.current) return;

            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });
            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                setCameraActive(true);

                // Use controls returned by decodeFromVideoElement to ensure proper stoppage
                const controls = await codeReader.decodeFromVideoElement(
                    videoRef.current,
                    (result, err) => {
                        if (result) {
                            const rawText = result.getText();
                            if (rawText) {
                                handleDecode(rawText);
                            }
                        }
                    }
                );
                controlsRef.current = controls;
            }
        } catch (err: unknown) {
            console.error('Camera barcode scanner error:', err);
            setCameraActive(false);
            const msg = err instanceof Error ? err.message : 'Camera permission denied or camera unavailable.';
            setCameraError(msg);
        }
    };

    const stopCamera = () => {
        if (controlsRef.current) {
            try {
                controlsRef.current.stop();
            } catch {
                // ignore
            }
            controlsRef.current = null;
        }
        if (codeReaderRef.current) {
            codeReaderRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
        setTorchOn(false);
    };

    const toggleTorch = async () => {
        if (!streamRef.current) return;
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (videoTrack) {
            try {
                await (videoTrack as any).applyConstraints({
                    advanced: [{ torch: !torchOn }],
                });
                setTorchOn(!torchOn);
            } catch (e) {
                console.warn('Torch not supported on this device/browser');
            }
        }
    };

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const code = manualCode.trim();
        if (code !== '') {
            handleDecode(code);
            setManualCode('');
        }
    };

    return (
        <GlassModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            maxWidth="max-w-md"
        >
            <div className="space-y-4">
                {/* Scanner Mode Toggle (Single vs Continuous) */}
                {allowContinuous && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs">
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                            Scanner Mode
                        </span>
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <button
                                type="button"
                                onClick={() => setIsContinuous(false)}
                                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                                    !isContinuous
                                        ? 'bg-teal-600 text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                Single scan
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsContinuous(true)}
                                className={`px-2.5 py-1 rounded-md font-semibold transition-all flex items-center gap-1 ${
                                    isContinuous
                                        ? 'bg-teal-600 text-white shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                                }`}
                            >
                                <Repeat className="w-3 h-3" />
                                <span>Continuous</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Camera Viewport */}
                <div
                    className={`relative aspect-video bg-black/90 rounded-2xl overflow-hidden border transition-all duration-300 flex items-center justify-center ${
                        scanFlash
                            ? 'border-emerald-400 shadow-lg shadow-emerald-500/30'
                            : 'border-slate-700/50'
                    }`}
                >
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        playsInline
                        muted
                    />

                    {/* Scanning Crosshair & Guide */}
                    {cameraActive && (
                        <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                            <div className="w-3/4 h-32 border-2 border-teal-400/80 rounded-xl relative overflow-hidden">
                                <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-md shadow-red-500 animate-pulse top-1/2 -translate-y-1/2" />
                            </div>
                            <span className="text-xs text-white/80 font-medium mt-2 bg-black/60 px-3 py-1 rounded-full">
                                {isContinuous ? 'Continuous mode: scan items in sequence' : 'Point camera at barcode'}
                            </span>
                        </div>
                    )}

                    {/* Last Scanned Feedback Toast Overlay */}
                    {lastScannedFeedback && (
                        <div className="absolute top-2 left-2 right-12 z-20 pointer-events-none">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/95 text-white text-xs font-semibold shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Accepted: {lastScannedFeedback}</span>
                            </div>
                        </div>
                    )}

                    {/* Camera error fallback */}
                    {cameraError && (
                        <div className="absolute inset-0 p-4 flex flex-col items-center justify-center text-center bg-slate-900/90 text-slate-300">
                            <AlertCircle className="w-8 h-8 text-amber-400 mb-2" />
                            <p className="text-xs font-semibold text-slate-200">Camera preview unavailable</p>
                            <p className="text-[11px] text-slate-400 mt-1 max-w-xs">{cameraError}</p>
                            <p className="text-[11px] text-teal-400 mt-2">
                                You can enter the barcode manually below, or scan using a USB/Bluetooth handheld scanner.
                            </p>
                        </div>
                    )}

                    {/* Controls overlay */}
                    {cameraActive && (
                        <div className="absolute top-2 right-2 flex gap-1 z-10">
                            <button
                                type="button"
                                onClick={toggleTorch}
                                className={`p-2 rounded-xl text-white transition-colors ${
                                    torchOn ? 'bg-amber-500' : 'bg-black/40 hover:bg-black/60'
                                }`}
                                title="Toggle torch"
                            >
                                <Flashlight className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Handheld & Manual Barcode Entry Fallback */}
                <form onSubmit={handleManualSubmit} className="space-y-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Keyboard className="w-3.5 h-3.5 text-slate-400" />
                        <span>Manual or Handheld Scanner Input</span>
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={manualCode}
                            onChange={(e) => setManualCode(e.target.value)}
                            placeholder="Type or scan barcode..."
                            autoFocus
                            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                            type="submit"
                            disabled={!manualCode.trim()}
                            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-sm shadow-teal-600/30"
                        >
                            Submit
                        </button>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Handheld USB/Bluetooth barcode scanners type directly into this field automatically.
                    </p>
                </form>
            </div>
        </GlassModal>
    );
}
