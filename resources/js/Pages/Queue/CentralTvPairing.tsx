import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { Tv, ArrowRight, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
import axios from 'axios';

interface Props {
    prefillCode?: string;
}

export default function CentralTvPairing({ prefillCode = '' }: Props) {
    const [code, setCode] = useState(prefillCode);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleDigitClick = (digit: string) => {
        if (code.length < 6) {
            setCode((prev) => prev + digit);
            setError(null);
        }
    };

    const handleBackspace = () => {
        setCode((prev) => prev.slice(0, -1));
        setError(null);
    };

    const handleClear = () => {
        setCode('');
        setError(null);
    };

    const handleSubmit = async (submitCode?: string) => {
        const codeToSubmit = submitCode || code;
        if (codeToSubmit.length !== 6) {
            setError('Please enter all 6 digits of your pairing code.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await axios.post('/tv/resolve-code', { code: codeToSubmit });
            if (res.data.redirect_url) {
                window.location.href = res.data.redirect_url;
            } else {
                setError('Could not connect to clinic.');
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Invalid or expired pairing code. Please generate a new code from clinic settings.');
        } finally {
            setLoading(false);
        }
    };

    // Auto submit if 6 digits entered
    useEffect(() => {
        if (code.length === 6) {
            handleSubmit(code);
        }
    }, [code]);

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between p-6 sm:p-12 select-none font-sans">
            <Head title="Connect Waiting Room TV · MedVisit" />

            {/* Top Brand */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#1E6FD9] to-[#0E9E8F] flex items-center justify-center text-white shadow-lg">
                    <Tv className="w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <span>MedVisit</span>
                        <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded-full bg-[#1E6FD9]/30 text-[#38BDF8] border border-[#1E6FD9]/40">
                            TV Display
                        </span>
                    </h1>
                </div>
            </div>

            {/* Main Center Card */}
            <div className="w-full max-w-xl p-8 sm:p-10 rounded-3xl bg-slate-900/80 border border-white/10 shadow-2xl backdrop-blur-xl space-y-8 my-auto">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        Connect this TV
                    </h2>
                    <p className="text-sm text-slate-400">
                        Enter the 6-digit pairing code generated in your clinic dashboard.
                    </p>
                </div>

                {/* 6-Digit PIN Display */}
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                    {[0, 1, 2, 3, 4, 5].map((idx) => {
                        const digit = code[idx];
                        const isCurrent = idx === code.length;
                        return (
                            <div
                                key={idx}
                                className={`w-12 h-16 sm:w-16 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-mono font-black border transition-all ${
                                    digit
                                        ? 'bg-slate-800 text-[#38BDF8] border-[#38BDF8]/50 shadow-lg shadow-[#38BDF8]/10'
                                        : isCurrent
                                        ? 'bg-slate-800/80 border-[#1E6FD9] ring-2 ring-[#1E6FD9]/30'
                                        : 'bg-slate-900/60 border-white/10 text-slate-600'
                                }`}
                            >
                                {digit || '•'}
                            </div>
                        );
                    })}
                </div>

                {error && (
                    <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2.5 animate-shake">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                        <span>{error}</span>
                    </div>
                )}

                {/* On-Screen Big Number Pad for TV Remotes / Air Mouses */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-sm mx-auto">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((item) => {
                        const isClear = item === 'C';
                        const isBackspace = item === '⌫';
                        return (
                            <button
                                key={item}
                                type="button"
                                disabled={loading}
                                onClick={() => {
                                    if (isClear) handleClear();
                                    else if (isBackspace) handleBackspace();
                                    else handleDigitClick(item);
                                }}
                                className={`h-14 sm:h-16 rounded-2xl font-mono text-xl sm:text-2xl font-bold flex items-center justify-center transition-all active:scale-95 ${
                                    isClear || isBackspace
                                        ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 border border-white/5'
                                        : 'bg-slate-800 hover:bg-slate-700/80 text-white border border-white/10 shadow-sm'
                                }`}
                            >
                                {item}
                            </button>
                        );
                    })}
                </div>

                {loading && (
                    <div className="flex items-center justify-center gap-2 text-xs text-[#38BDF8] font-semibold animate-pulse">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Connecting to your clinic queue...</span>
                    </div>
                )}
            </div>

            {/* Bottom Footer */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-[#0E9E8F]" />
                <span>Encrypted 10-foot waiting room display · MedVisit LK</span>
            </div>
        </div>
    );
}
