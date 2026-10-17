import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
    CheckCircle2,
    MessageCircle,
    MessageSquare,
    QrCode,
    Copy,
    Check,
    RefreshCw,
    AlertCircle,
    Smartphone,
    ExternalLink,
    HelpCircle,
} from 'lucide-react';

interface PhoneVerificationSectionProps {
    phone: string;
    sessionId: string;
    isVerified: boolean;
    setIsVerified: (verified: boolean) => void;
    requireVerification: boolean;
    allowedChannels: string[];
    initialVerifiedPhone?: string | null;
    onChangeNumber?: () => void;
}

export default function PhoneVerificationSection({
    phone,
    sessionId,
    isVerified,
    setIsVerified,
    requireVerification,
    allowedChannels = ['whatsapp', 'textlk'],
    initialVerifiedPhone = null,
    onChangeNumber,
}: PhoneVerificationSectionProps) {
    if (!requireVerification) {
        return null;
    }

    // State
    const [selectedChannel, setSelectedChannel] = useState<'whatsapp' | 'textlk' | null>(null);
    const [verificationId, setVerificationId] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // WhatsApp Path State
    const [waLink, setWaLink] = useState<string>('');
    const [waCode, setWaCode] = useState<string>('');
    const [waNumber, setWaNumber] = useState<string>('');
    const [waMessage, setWaMessage] = useState<string>('');
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [copied, setCopied] = useState<boolean>(false);
    const [waWaitingSeconds, setWaWaitingSeconds] = useState<number>(0);
    const [showSmsFallback, setShowSmsFallback] = useState<boolean>(false);

    // SMS Path State
    const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
    const [resendCountdown, setResendCountdown] = useState<number>(60);
    const [canResend, setCanResend] = useState<boolean>(false);
    const [devCode, setDevCode] = useState<string | null>(null);
    const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

    const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Normalise phone helper for client comparison
    const cleanDigits = phone.replace(/\D/g, '');
    const isPhoneValid = cleanDigits.length >= 9;

    // Check if initialVerifiedPhone matches currently entered phone
    useEffect(() => {
        if (initialVerifiedPhone && isPhoneValid) {
            const cleanInit = initialVerifiedPhone.replace(/\D/g, '');
            if (cleanDigits.endsWith(cleanInit.slice(-9)) || cleanInit.endsWith(cleanDigits.slice(-9))) {
                setIsVerified(true);
            }
        }
    }, [initialVerifiedPhone, phone, isPhoneValid]);

    // Pre-select channel from localStorage or single allowed channel
    useEffect(() => {
        if (!isVerified && isPhoneValid && selectedChannel === null) {
            if (allowedChannels.length === 1) {
                const single = allowedChannels[0] as 'whatsapp' | 'textlk';
                handleSelectChannel(single);
            } else {
                const storedPref = localStorage.getItem('medvisit_pref_channel') as 'whatsapp' | 'textlk' | null;
                if (storedPref && allowedChannels.includes(storedPref)) {
                    // Pre-select but do not auto-start until user confirms or clicks
                }
            }
        }
    }, [allowedChannels, isPhoneValid, isVerified]);

    // Reset verification when phone changes significantly
    const prevPhoneRef = useRef(phone);
    useEffect(() => {
        if (prevPhoneRef.current !== phone) {
            prevPhoneRef.current = phone;
            if (isVerified) {
                setIsVerified(false);
            }
            setVerificationId(null);
            setSelectedChannel(null);
            setError(null);
            setDigits(['', '', '', '', '', '']);
            setShowSmsFallback(false);
            setWaWaitingSeconds(0);
        }
    }, [phone]);

    // Generate QR Code when waLink is ready
    useEffect(() => {
        if (waLink) {
            QRCode.toDataURL(waLink, {
                width: 190,
                margin: 2,
                color: {
                    dark: '#0F766E', // Teal 700
                    light: '#FFFFFF',
                },
            })
                .then((url) => setQrDataUrl(url))
                .catch((err) => console.error('Failed to generate QR code', err));
        }
    }, [waLink]);

    // WhatsApp Polling every 2 seconds
    useEffect(() => {
        if (selectedChannel !== 'whatsapp' || !verificationId || isVerified) {
            return;
        }

        const pollTimer = setInterval(async () => {
            try {
                const res = await fetch(`/book/verify/status?verification_id=${verificationId}&session_id=${sessionId}`, {
                    headers: { credentials: 'same-origin' },
                });
                if (!res.ok) return;

                const data = await res.json();
                if (data.is_verified) {
                    setIsVerified(true);
                    setError(null);
                    clearInterval(pollTimer);
                } else if (data.mismatch_error) {
                    setError(data.mismatch_error);
                }
            } catch (e) {
                // Ignore transient network errors during poll
            }
        }, 2000);

        return () => clearInterval(pollTimer);
    }, [selectedChannel, verificationId, isVerified, sessionId]);

    // 45s timer for WhatsApp SMS fallback button
    useEffect(() => {
        if (selectedChannel !== 'whatsapp' || !verificationId || isVerified) {
            return;
        }

        const interval = setInterval(() => {
            setWaWaitingSeconds((prev) => {
                if (prev + 1 >= 45) {
                    setShowSmsFallback(true);
                }
                return prev + 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [selectedChannel, verificationId, isVerified]);

    // 60s countdown for SMS resend
    useEffect(() => {
        if (selectedChannel !== 'textlk' || !verificationId || isVerified) {
            return;
        }

        setCanResend(false);
        setResendCountdown(60);

        const timer = setInterval(() => {
            setResendCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setCanResend(true);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [selectedChannel, verificationId, isVerified]);

    // Handle starting a verification channel
    const handleSelectChannel = async (channel: 'whatsapp' | 'textlk') => {
        if (!isPhoneValid) {
            setError('Please enter a valid mobile number first.');
            return;
        }

        setSelectedChannel(channel);
        localStorage.setItem('medvisit_pref_channel', channel);
        setLoading(true);
        setError(null);
        setShowSmsFallback(false);
        setWaWaitingSeconds(0);
        setDigits(['', '', '', '', '', '']);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/book/verify/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    phone,
                    channel,
                    session_id: sessionId,
                }),
            });

            const result = await res.json();

            if (result.already_verified) {
                setIsVerified(true);
                setLoading(false);
                return;
            }

            if (!res.ok || !result.success) {
                setError(result.error || 'Failed to start verification.');
                setLoading(false);
                return;
            }

            setVerificationId(result.verification_id);

            if (channel === 'whatsapp' && result.data) {
                setWaLink(result.data.wa_link || '');
                setWaCode(result.data.code || '');
                setWaNumber(result.data.wa_number || '');
                setWaMessage(result.data.message || `VERIFY ${result.data.code}`);
            }

            if (((channel as string) === 'textlk' || (channel as string) === 'log') && result.data?.dev_code) {
                setDevCode(result.data.dev_code);
            } else {
                setDevCode(null);
            }
        } catch (err: any) {
            setError(err.message || 'Network error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // SMS Input Box handlers
    const handleDigitChange = (index: number, val: string) => {
        // Handle paste of whole 6-digit code
        if (val.length > 1) {
            const pastedDigits = val.replace(/\D/g, '').slice(0, 6).split('');
            const newDigits = [...digits];
            pastedDigits.forEach((d, i) => {
                if (i < 6) newDigits[i] = d;
            });
            setDigits(newDigits);
            if (pastedDigits.length === 6) {
                submitSmsCode(newDigits.join(''));
            } else if (pastedDigits.length > 0) {
                const nextIdx = Math.min(5, pastedDigits.length);
                digitRefs.current[nextIdx]?.focus();
            }
            return;
        }

        const singleDigit = val.replace(/\D/g, '');
        const newDigits = [...digits];
        newDigits[index] = singleDigit;
        setDigits(newDigits);

        if (singleDigit && index < 5) {
            digitRefs.current[index + 1]?.focus();
        }

        // Auto submit on 6th digit
        if (singleDigit && index === 5 && newDigits.every((d) => d !== '')) {
            submitSmsCode(newDigits.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !digits[index] && index > 0) {
            digitRefs.current[index - 1]?.focus();
        }
    };

    const submitSmsCode = async (codeToSubmit: string) => {
        if (!verificationId || codeToSubmit.length !== 6) return;

        setLoading(true);
        setError(null);

        try {
            const csrfToken = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';
            const res = await fetch('/book/verify/check-code', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                body: JSON.stringify({
                    verification_id: verificationId,
                    code: codeToSubmit,
                }),
            });

            const result = await res.json();

            if (!res.ok || !result.success) {
                setError(result.error || 'Invalid code.');
                if (typeof result.attempts_remaining === 'number') {
                    setAttemptsRemaining(result.attempts_remaining);
                }
                setLoading(false);
                return;
            }

            setIsVerified(true);
        } catch (err: any) {
            setError(err.message || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const copyWaMessage = () => {
        if (waMessage) {
            navigator.clipboard.writeText(waMessage);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    // If verified, display celebratory green verification card
    if (isVerified) {
        return (
            <div className="mt-2.5 p-3.5 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl flex items-center justify-between text-xs text-emerald-900 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                    <div>
                        <p className="font-bold text-emerald-950 text-sm">Number Verified</p>
                        <p className="text-emerald-700 text-[11px]">
                            {phone} is confirmed. You can proceed to confirm your booking.
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        setIsVerified(false);
                        setSelectedChannel(null);
                        setVerificationId(null);
                        onChangeNumber?.();
                    }}
                    className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline underline-offset-4 ml-3 shrink-0"
                >
                    Change
                </button>
            </div>
        );
    }

    if (!isPhoneValid) {
        return (
            <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-amber-700">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Enter a valid Sri Lankan mobile number to verify.</span>
            </div>
        );
    }

    // Step 1: Channel selection (WhatsApp vs SMS)
    if (!selectedChannel) {
        const storedPref = (typeof window !== 'undefined' ? localStorage.getItem('medvisit_pref_channel') : null) as 'whatsapp' | 'textlk' | null;

        return (
            <div className="mt-3 p-4 bg-slate-50 border border-slate-200/90 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-teal-600" />
                        Do you use WhatsApp on this number?
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">Step 1 of 2</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {allowedChannels.includes('whatsapp') && (
                        <button
                            type="button"
                            onClick={() => handleSelectChannel('whatsapp')}
                            disabled={loading}
                            className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                                storedPref === 'whatsapp'
                                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950'
                                    : 'bg-white border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 text-slate-800'
                            }`}
                        >
                            <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <MessageCircle className="w-5 h-5 fill-current" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-xs text-slate-900">Yes, verify with WhatsApp</p>
                                <p className="text-[11px] text-slate-500">Tap to open WhatsApp & send</p>
                            </div>
                        </button>
                    )}

                    {allowedChannels.includes('textlk') && (
                        <button
                            type="button"
                            onClick={() => handleSelectChannel('textlk')}
                            disabled={loading}
                            className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                                storedPref === 'textlk'
                                    ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-500/20 text-teal-950'
                                    : 'bg-white border-slate-200 hover:border-teal-500 hover:bg-teal-50/40 text-slate-800'
                            }`}
                        >
                            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <p className="font-bold text-xs text-slate-900">No, send me an SMS code</p>
                                <p className="text-[11px] text-slate-500">Receive standard 6-digit text</p>
                            </div>
                        </button>
                    )}
                </div>

                {error && (
                    <p className="text-xs text-rose-600 flex items-center gap-1.5 mt-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </p>
                )}
            </div>
        );
    }

    // Step 2, PATH A: WhatsApp Reverse Verification
    if (selectedChannel === 'whatsapp') {
        return (
            <div className="mt-3 p-5 bg-white border-2 border-emerald-200/90 rounded-2xl shadow-sm space-y-4 relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center rounded-2xl z-10">
                        <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
                    </div>
                )}

                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                            <MessageCircle className="w-4 h-4 fill-current" />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-slate-900">WhatsApp Verification</h4>
                            <p className="text-xs text-slate-500">Tap the button, then press Send in WhatsApp</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => {
                            setSelectedChannel(null);
                            setVerificationId(null);
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600"
                    >
                        Switch method
                    </button>
                </div>

                {/* Main Action Button */}
                <div>
                    <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
                    >
                        <MessageCircle className="w-5 h-5 fill-current" />
                        <span>Open WhatsApp</span>
                        <ExternalLink className="w-4 h-4 opacity-80" />
                    </a>
                </div>

                {/* Desktop QR Code & Copy Section */}
                <div className="p-3.5 bg-slate-50 border border-slate-200/70 rounded-xl space-y-3">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        {qrDataUrl && (
                            <div className="p-2 bg-white rounded-lg border border-slate-200/80 shadow-xs shrink-0 flex flex-col items-center">
                                <img src={qrDataUrl} alt="WhatsApp QR Code" className="w-32 h-32" />
                                <span className="text-[10px] font-semibold text-slate-400 mt-1 flex items-center gap-1">
                                    <QrCode className="w-3 h-3" /> Scan with phone
                                </span>
                            </div>
                        )}

                        <div className="flex-1 space-y-2 text-xs">
                            <div>
                                <span className="text-[11px] font-semibold text-slate-500">Business WhatsApp Number</span>
                                <p className="font-mono font-bold text-slate-800 text-sm">{waNumber || '+94 7X XXX XXXX'}</p>
                            </div>

                            <div>
                                <span className="text-[11px] font-semibold text-slate-500">Exact message to send</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <div className="flex-1 font-mono font-extrabold text-teal-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 tracking-wider">
                                        {waMessage || `VERIFY ${waCode}`}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={copyWaMessage}
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 flex items-center gap-1 font-medium transition-colors"
                                    >
                                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        <span>{copied ? 'Copied' : 'Copy'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Polling Status indicator */}
                <div className="flex items-center justify-between text-xs py-1 px-2 text-slate-600 bg-emerald-50/50 rounded-lg">
                    <div className="flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                        <span className="font-medium text-slate-700">Waiting for your WhatsApp message…</span>
                    </div>
                    <span className="text-[11px] text-slate-400">{waWaitingSeconds}s</span>
                </div>

                {/* Fallbacks */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
                    {showSmsFallback ? (
                        <button
                            type="button"
                            onClick={() => handleSelectChannel('textlk')}
                            className="font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Didn't work? Send me an SMS code instead</span>
                        </button>
                    ) : (
                        <span className="text-[11px] text-slate-400">
                            SMS fallback available in {Math.max(0, 45 - waWaitingSeconds)}s
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            setSelectedChannel(null);
                            setVerificationId(null);
                            onChangeNumber?.();
                        }}
                        className="text-slate-500 hover:text-slate-800 underline underline-offset-2"
                    >
                        Use a different number
                    </button>
                </div>

                {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Verification Alert</p>
                            <p>{error}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Step 2, PATH B: SMS 6-Digit Code
    return (
        <div className="mt-3 p-5 bg-white border-2 border-teal-200/90 rounded-2xl shadow-sm space-y-4 relative">
            {loading && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center rounded-2xl z-10">
                    <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
                </div>
            )}

            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                        <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm text-slate-900">Enter SMS Code</h4>
                        <p className="text-xs text-slate-500">6-digit code sent to {phone}</p>
                    </div>
                </div>

                {allowedChannels.includes('whatsapp') && (
                    <button
                        type="button"
                        onClick={() => handleSelectChannel('whatsapp')}
                        className="text-xs font-semibold text-teal-700 hover:text-teal-900 underline underline-offset-2"
                    >
                        Try WhatsApp instead
                    </button>
                )}
            </div>

            {/* Dev Mode Banner if local */}
            {devCode && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between">
                    <span>
                        <strong>[Local Dev]</strong> Verification code: <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded">{devCode}</code>
                    </span>
                    <button
                        type="button"
                        onClick={() => {
                            const arr = devCode.split('');
                            setDigits(arr);
                            submitSmsCode(devCode);
                        }}
                        className="px-2 py-1 bg-amber-200/70 hover:bg-amber-200 rounded text-[11px] font-bold"
                    >
                        Auto-Fill & Verify
                    </button>
                </div>
            )}

            {/* 6 Digit Input Boxes */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
                {digits.map((digit, idx) => (
                    <input
                        key={idx}
                        ref={(el) => {
                            digitRefs.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleDigitChange(idx, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(idx, e)}
                        autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                        className="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-bold font-mono rounded-xl border-2 border-slate-200 text-slate-900 focus:border-teal-600 focus:ring-4 focus:ring-teal-500/10 focus:outline-none transition-all"
                    />
                ))}
            </div>

            {/* Resend and Controls */}
            <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                <button
                    type="button"
                    disabled={!canResend || loading}
                    onClick={() => handleSelectChannel('textlk')}
                    className="font-bold text-teal-700 hover:text-teal-900 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>{canResend ? 'Resend SMS code' : `Resend in ${resendCountdown}s`}</span>
                </button>

                <button
                    type="button"
                    onClick={() => {
                        setSelectedChannel(null);
                        setVerificationId(null);
                        onChangeNumber?.();
                    }}
                    className="underline hover:text-slate-700"
                >
                    Use a different number
                </button>
            </div>

            {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold">Code Verification Failed</p>
                        <p>{error}</p>
                        {attemptsRemaining !== null && (
                            <p className="mt-1 font-medium">Attempts remaining: {attemptsRemaining}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
