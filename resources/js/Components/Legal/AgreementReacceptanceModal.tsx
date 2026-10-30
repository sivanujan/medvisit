import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import { ShieldCheck, ExternalLink, RotateCw, AlertCircle } from 'lucide-react';

interface Props {
    isOpen: boolean;
}

export default function AgreementReacceptanceModal({ isOpen }: Props) {
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [authorityAccepted, setAuthorityAccepted] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isOpen) {
        return null;
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!termsAccepted || !authorityAccepted) {
            setErrorMessage('Please accept both statements to proceed.');
            return;
        }

        setProcessing(true);
        setErrorMessage(null);

        router.post(
            '/agreements/accept',
            {
                terms: termsAccepted,
                agreement_authority: authorityAccepted,
            },
            {
                preserveScroll: true,
                onError: (errors) => {
                    setProcessing(false);
                    const msg = Object.values(errors)[0] as string;
                    setErrorMessage(msg || 'An error occurred while saving your agreement. Please try again.');
                },
                onFinish: () => {
                    setProcessing(false);
                },
            }
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="space-y-1.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-2">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                        We've updated our Terms & Policies
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        To continue managing your clinic on MedVisit, please review and accept our updated legal agreements.
                    </p>
                </div>

                {/* Policies Links Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <a
                        href="/terms"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:border-teal-500/50 hover:bg-teal-500/5 transition flex items-center justify-between text-slate-800 dark:text-slate-200 font-medium group"
                    >
                        <span>Terms & Conditions</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                    </a>
                    <a
                        href="/privacy-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:border-teal-500/50 hover:bg-teal-500/5 transition flex items-center justify-between text-slate-800 dark:text-slate-200 font-medium group"
                    >
                        <span>Privacy Policy</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                    </a>
                    <a
                        href="/refund-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:border-teal-500/50 hover:bg-teal-500/5 transition flex items-center justify-between text-slate-800 dark:text-slate-200 font-medium group"
                    >
                        <span>Refund Policy</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                    </a>
                    <a
                        href="/dispute-policy"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 hover:border-teal-500/50 hover:bg-teal-500/5 transition flex items-center justify-between text-slate-800 dark:text-slate-200 font-medium group"
                    >
                        <span>Dispute Policy</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-500 transition-colors" />
                    </a>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {/* Checkbox 1 */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed select-none">
                            I agree to the{' '}
                            <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 underline font-semibold">Terms & Conditions</a>,{' '}
                            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 underline font-semibold">Privacy Policy</a>,{' '}
                            <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 underline font-semibold">Refund Policy</a>, and{' '}
                            <a href="/dispute-policy" target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 underline font-semibold">Dispute Policy</a>.
                        </span>
                    </label>

                    {/* Checkbox 2 */}
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            checked={authorityAccepted}
                            onChange={(e) => setAuthorityAccepted(e.target.checked)}
                            className="mt-0.5 w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed select-none">
                            I am authorised to register this clinic, and the clinic is responsible for the accuracy of its information and for its patient data.
                        </span>
                    </label>

                    {errorMessage && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* Submit */}
                    <div className="pt-2">
                        <button
                            type="submit"
                            disabled={!termsAccepted || !authorityAccepted || processing}
                            className="w-full h-11 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-teal-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {processing ? (
                                <>
                                    <RotateCw className="w-4 h-4 animate-spin" />
                                    <span>Updating agreements...</span>
                                </>
                            ) : (
                                <span>I Agree & Continue</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

