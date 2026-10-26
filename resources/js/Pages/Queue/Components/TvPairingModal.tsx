import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
    Tv,
    X,
    Copy,
    Check,
    RefreshCw,
    ExternalLink,
    ShieldCheck,
    Clock,
    MonitorPlay,
    QrCode as QrIcon,
} from 'lucide-react';
import axios from 'axios';

interface TvPairingModalProps {
    isOpen: boolean;
    onClose: () => void;
    clinicName?: string;
    subdomain?: string;
    availableDoctors?: { id: number; name: string }[];
}

export default function TvPairingModal({
    isOpen,
    onClose,
    clinicName = 'MedVisit Clinic',
    subdomain,
    availableDoctors = [],
}: TvPairingModalProps) {
    const [code, setCode] = useState<string | null>(null);
    const [expiresAt, setExpiresAt] = useState<Date | null>(null);
    const [secondsLeft, setSecondsLeft] = useState<number>(600);
    const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
    const [directUrl, setDirectUrl] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [copied, setCopied] = useState<boolean>(false);
    const [deviceName, setDeviceName] = useState<string>('Waiting Room TV');
    const [selectedDoctorIds, setSelectedDoctorIds] = useState<number[]>([]);

    const fetchPairingCode = async () => {
        setLoading(true);
        try {
            const res = await axios.post('/api/tv/pairing-code', {
                device_name: deviceName,
                doctor_ids: selectedDoctorIds.length > 0 ? selectedDoctorIds : null,
            });

            setCode(res.data.code);
            const exp = new Date(res.data.expires_at);
            setExpiresAt(exp);
            setDirectUrl(res.data.qr_url);

            const qrUrl = await QRCode.toDataURL(res.data.qr_url, {
                width: 240,
                margin: 1,
                color: {
                    dark: '#0f172a',
                    light: '#ffffff',
                },
            });
            setQrDataUrl(qrUrl);
        } catch (err) {
            console.error('Failed to generate pairing code', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchPairingCode();
        } else {
            setCode(null);
            setExpiresAt(null);
        }
    }, [isOpen]);

    // 10-minute countdown timer
    useEffect(() => {
        if (!expiresAt) return;

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
            setSecondsLeft(remaining);
            if (remaining <= 0) {
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [expiresAt]);

    const formatCountdown = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleCopy = () => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    const isExpired = secondsLeft <= 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#1E6FD9]/10 text-[#1E6FD9] flex items-center justify-center shadow-sm">
                            <Tv className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Connect Waiting Room TV
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                6-digit pairing code with automatic encryption
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Security notice */}
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/30 text-xs text-emerald-800 dark:text-emerald-300">
                        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        <div>
                            <span className="font-semibold">Zero-Login TV Pairing:</span> This TV display is securely authorized via a signed device token. No staff accounts or credentials are saved on the TV.
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <RefreshCw className="w-8 h-8 animate-spin text-[#1E6FD9]" />
                            <span className="text-sm">Generating secure pairing code...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                            {/* Left: 6-Digit Code & Instructions */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                                        1. On the TV, open:
                                    </label>
                                    <div className="px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/5 truncate">
                                        {window.location.origin}/tv
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                            2. Enter this 6-digit code:
                                        </label>
                                        <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                            <Clock className="w-3 h-3 text-amber-500" />
                                            <span className={isExpired ? 'text-red-500 font-bold' : ''}>
                                                {isExpired ? 'Expired' : `${formatCountdown(secondsLeft)} left`}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="relative group">
                                        <div className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-4 rounded-2xl bg-slate-900 dark:bg-black text-white font-mono text-2xl sm:text-3xl font-black tracking-widest shadow-inner border border-slate-800">
                                            {code ? (
                                                code.split('').map((char, i) => (
                                                    <span
                                                        key={i}
                                                        className="w-8 h-10 flex items-center justify-center rounded-lg bg-slate-800/80 text-[#38BDF8] border border-white/10"
                                                    >
                                                        {char}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-slate-600">••••••</span>
                                            )}
                                        </div>

                                        <button
                                            type="button"
                                            onClick={handleCopy}
                                            disabled={!code || isExpired}
                                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                                            title="Copy 6-digit code"
                                            aria-label="Copy 6-digit code"
                                        >
                                            {copied ? (
                                                <Check className="w-4 h-4 text-emerald-400" />
                                            ) : (
                                                <Copy className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {isExpired && (
                                    <button
                                        type="button"
                                        onClick={fetchPairingCode}
                                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E6FD9] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-sm transition-colors"
                                    >
                                        <RefreshCw className="w-3.5 h-3.5" />
                                        <span>Generate Fresh Code</span>
                                    </button>
                                )}
                            </div>

                            {/* Right: QR Code for Easy Pairing */}
                            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-white/5 text-center">
                                <div className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                                    <QrIcon className="w-4 h-4 text-[#0E9E8F]" />
                                    <span>Or Scan with TV / Phone</span>
                                </div>

                                {qrDataUrl ? (
                                    <div className="p-2.5 rounded-2xl bg-white shadow-sm border border-slate-200 mb-2">
                                        <img
                                            src={qrDataUrl}
                                            alt="TV Display Pairing QR"
                                            className="w-36 h-36 rounded-lg object-contain"
                                        />
                                    </div>
                                ) : (
                                    <div className="w-36 h-36 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse mb-2" />
                                )}

                                <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[200px]">
                                    Scans directly to {clinicName}&apos;s TV display with the pairing code pre-filled.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/40">
                    <a
                        href="/queue/tv"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1E6FD9] dark:text-[#38BDF8] hover:underline"
                    >
                        <MonitorPlay className="w-3.5 h-3.5" />
                        <span>Preview display on this PC</span>
                        <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
