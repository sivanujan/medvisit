import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Copy, Check, X, QrCode as QrIcon, ExternalLink } from 'lucide-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    url: string;
    clinicName: string;
    subdomain: string;
}

export default function QrCodeModal({ isOpen, onClose, url, clinicName, subdomain }: Props) {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isOpen || !url) return;
        QRCode.toDataURL(url, {
            width: 320,
            margin: 2,
            color: {
                dark: '#0f172a',
                light: '#ffffff',
            },
        })
            .then((data) => setQrDataUrl(data))
            .catch(() => {});
    }, [isOpen, url]);

    if (!isOpen) return null;

    const handleCopy = () => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!qrDataUrl) return;
        const a = document.createElement('a');
        a.href = qrDataUrl;
        a.download = `${subdomain || 'clinic'}-website-qr.png`;
        a.click();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div
                className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl p-6 text-center"
                role="dialog"
                aria-modal="true"
                aria-labelledby="qr-modal-title"
            >
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    aria-label="Close"
                >
                    <X className="h-5 w-5" />
                </button>

                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <QrIcon className="h-6 w-6" />
                </div>

                <h3 id="qr-modal-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Clinic website QR code
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Patients can scan this to visit {clinicName || 'your clinic website'} and book channeling tokens.
                </p>

                <div className="my-5 flex justify-center">
                    <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-inner">
                        {qrDataUrl ? (
                            <img src={qrDataUrl} alt={`QR Code for ${url}`} className="w-56 h-56 rounded-lg" />
                        ) : (
                            <div className="w-56 h-56 flex items-center justify-center text-slate-400 text-xs">
                                Generating QR code…
                            </div>
                        )}
                    </div>
                </div>

                <div className="mb-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 truncate">
                    {url}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition"
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        {copied ? 'Copied' : 'Copy link'}
                    </button>
                    <button
                        type="button"
                        onClick={handleDownload}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white shadow-sm hover:brightness-105 transition"
                    >
                        <Download className="h-3.5 w-3.5" />
                        Download PNG
                    </button>
                </div>
            </div>
        </div>
    );
}
