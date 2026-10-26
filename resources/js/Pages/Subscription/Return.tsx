import React, { useEffect, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { CheckCircle2, AlertTriangle, Loader2, ArrowRight, RefreshCw } from 'lucide-react';
import axios from 'axios';

interface Props {
    checkoutId?: string;
    initialStatus?: string;
    clinicName: string;
    defaultRedirect?: string;
}

export default function Return({ checkoutId, initialStatus, clinicName, defaultRedirect }: Props) {
    const [state, setState] = useState<'verifying' | 'succeeded' | 'failed'>('verifying');
    const [message, setMessage] = useState<string>('Verifying transaction...');
    const [redirectUrl, setRedirectUrl] = useState<string>(defaultRedirect || route('tenant.dashboard'));

    useEffect(() => {
        let isMounted = true;
        let attempts = 0;
        const maxAttempts = 15; // 30 seconds max polling

        const checkStatus = async () => {
            try {
                const response = await axios.get(route('tenant.subscription.check_status'), {
                    params: { checkout_id: checkoutId },
                });

                if (!isMounted) return;

                if (response.data.status === 'succeeded') {
                    setState('succeeded');
                    setMessage('Your payment has been confirmed and your MedVisit subscription is now active!');
                    if (response.data.redirect) {
                        setRedirectUrl(response.data.redirect);
                    }
                    return;
                }

                if (response.data.status === 'failed') {
                    setState('failed');
                    setMessage(response.data.message || 'Payment was not completed or was declined. You can retry anytime.');
                    return;
                }

                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(checkStatus, 2000);
                } else {
                    // Polling timeout - webhook might still arrive
                    setState('succeeded');
                    setMessage('Your transaction was submitted. If your account was charged, your subscription will activate momentarily.');
                }
            } catch (err) {
                if (!isMounted) return;
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(checkStatus, 2000);
                } else {
                    setState('failed');
                    setMessage('Could not verify status. Please check your billing dashboard or try again.');
                }
            }
        };

        checkStatus();

        return () => {
            isMounted = false;
        };
    }, [checkoutId]);

    const handleContinue = () => {
        window.location.href = redirectUrl;
    };

    const handleRetry = () => {
        router.visit(route('tenant.subscription.subscribe'));
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-teal-500 selection:text-white">
            <Head title="Payment Confirmation" />

            <div className="max-w-md w-full bg-slate-800/80 border border-slate-700 rounded-3xl p-8 backdrop-blur shadow-2xl text-center">
                {state === 'verifying' && (
                    <div className="space-y-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Confirming Payment</h2>
                            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                                Please wait while we verify your transaction. This typically takes just a few seconds...
                            </p>
                        </div>
                    </div>
                )}

                {state === 'succeeded' && (
                    <div className="space-y-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div>
                            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">
                                Subscription Active
                            </span>
                            <h2 className="text-2xl font-bold text-white mt-1">Payment Successful!</h2>
                            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                                {message}
                            </p>
                            <p className="mt-1 text-xs text-slate-400 font-mono">
                                Clinic: {clinicName}
                            </p>
                        </div>
                        <button
                            onClick={handleContinue}
                            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-slate-950 font-bold text-sm tracking-wide shadow-lg shadow-teal-500/25 transition"
                        >
                            <span>Go to Dashboard</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {state === 'failed' && (
                    <div className="space-y-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-8 h-8 text-rose-400" />
                        </div>
                        <div>
                            <span className="text-xs uppercase tracking-wider font-semibold text-rose-400">
                                Incomplete Transaction
                            </span>
                            <h2 className="text-2xl font-bold text-white mt-1">Payment Not Completed</h2>
                            <p className="mt-2 text-sm text-slate-300 leading-relaxed">
                                {message}
                            </p>
                        </div>
                        <button
                            onClick={handleRetry}
                            className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm transition"
                        >
                            <RefreshCw className="w-4 h-4" />
                            <span>Try Again</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
