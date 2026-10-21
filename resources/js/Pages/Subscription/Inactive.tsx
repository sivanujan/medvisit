import React from 'react';
import { Head, router } from '@inertiajs/react';
import { Building2, LogOut, ShieldAlert } from 'lucide-react';

interface Props {
    clinicName: string;
}

export default function Inactive({ clinicName }: Props) {
    const handleLogout = (e: React.FormEvent) => {
        e.preventDefault();
        router.post(route('tenant.logout'));
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between selection:bg-teal-500 selection:text-white">
            <Head title="Subscription Inactive" />

            {/* Header */}
            <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center font-bold text-white shadow-lg shadow-teal-500/20">
                        MV
                    </div>
                    <span className="font-semibold text-white tracking-tight">{clinicName}</span>
                </div>

                <form onSubmit={handleLogout}>
                    <button
                        type="submit"
                        className="text-xs text-slate-400 hover:text-white flex items-center space-x-1.5 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                    </button>
                </form>
            </header>

            {/* Main Friendly Notice */}
            <main className="flex-1 flex items-center justify-center px-4 py-12">
                <div className="max-w-lg w-full bg-slate-800/80 border border-slate-700/80 rounded-3xl p-8 sm:p-10 backdrop-blur shadow-2xl text-center">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
                        <Building2 className="w-8 h-8 text-amber-400" />
                    </div>

                    <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold mb-4">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>MedVisit Inactive</span>
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        Subscription Inactive
                    </h1>

                    {/* Exact requested friendly statement */}
                    <div className="mt-4 p-4 rounded-xl bg-slate-900/60 border border-slate-700/60">
                        <p className="text-base font-medium text-slate-200 leading-relaxed">
                            Your clinic's MedVisit subscription is inactive. Please contact your clinic administrator.
                        </p>
                    </div>

                    <p className="mt-4 text-xs sm:text-sm text-slate-400 leading-relaxed">
                        Your clinic administrator can renew or reactivate the subscription from their admin account.
                        Once activated, your workspace access will be restored immediately.
                    </p>

                    <div className="mt-8 pt-6 border-t border-slate-700/60">
                        <form onSubmit={handleLogout}>
                            <button
                                type="submit"
                                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium text-sm transition"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Sign Out of Account</span>
                            </button>
                        </form>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-800 py-4 text-center text-xs text-slate-500">
                MedVisit Healthcare Operating System &copy; {new Date().getFullYear()}. All rights reserved.
            </footer>
        </div>
    );
}
