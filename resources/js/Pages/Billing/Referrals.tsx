import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import {
    Gift,
    Copy,
    Check,
    Share2,
    Users,
    Wallet,
    Sparkles,
    CheckCircle2,
    Clock,
    AlertCircle,
    Info,
    ArrowRight,
    Shield,
    ExternalLink,
} from 'lucide-react';

interface ReferralItem {
    id: number;
    clinic_name: string;
    status: 'registered' | 'paying' | 'reward_pending' | 'rewarded' | 'rejected' | 'cancelled';
    reward_amount_cents: number;
    reward_formatted: string;
    qualifying_invoices_count: number;
    created_at: string;
}

interface Props {
    referralCode: string;
    referralUrl: string;
    creditBalanceCents: number;
    creditBalanceFormatted: string;
    totalEarnedCents: number;
    totalEarnedFormatted: string;
    maxRewardFormatted: string;
    referrals: ReferralItem[];
    hasPaidInvoice: boolean;
    isCompOrDemo: boolean;
    qualifyingTarget: number;
    currentPlanName: string;
}

export default function Referrals({
    referralCode,
    referralUrl,
    creditBalanceCents,
    creditBalanceFormatted,
    totalEarnedCents,
    totalEarnedFormatted,
    maxRewardFormatted,
    referrals,
    hasPaidInvoice,
    isCompOrDemo,
    qualifyingTarget = 2,
    currentPlanName,
}: Props) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(referralUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch {
            // Fallback
            const el = document.createElement('textarea');
            el.value = referralUrl;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const whatsappMessage = encodeURIComponent(
        `Manage your clinic with MedVisit — Sri Lanka's modern healthcare platform for appointments, live token display, and doctor sessions. Register with our link: ${referralUrl}`
    );
    const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

    const getStatusBadge = (status: ReferralItem['status'], qualifyingCount: number) => {
        switch (status) {
            case 'rewarded':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Rewarded
                    </span>
                );
            case 'reward_pending':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        Reward pending
                    </span>
                );
            case 'paying':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-xs font-semibold text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                        <Clock className="h-3 w-3" />
                        Paying ({qualifyingCount}/{qualifyingTarget})
                    </span>
                );
            case 'registered':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-500/20 dark:text-slate-400">
                        Registered
                    </span>
                );
            case 'rejected':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-xs font-semibold text-rose-600 dark:bg-rose-500/20 dark:text-rose-400">
                        <AlertCircle className="h-3 w-3" />
                        Rejected
                    </span>
                );
            case 'cancelled':
                return (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/10 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        Cancelled
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Refer a Clinic — MedVisit" />

            <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                            <Gift className="h-4 w-4" />
                            Billing & Partnerships
                        </div>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                            Refer a Clinic
                        </h1>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            Invite colleague clinics to MedVisit and earn billing credits toward your monthly subscription.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link
                            href={route('tenant.settings.billing')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            Back to Billing Center
                        </Link>
                    </div>
                </div>

                {/* Eligibility Notice if Not Yet Paid or Comp/Demo */}
                {!hasPaidInvoice && !isCompOrDemo && (
                    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-300">
                        <div className="flex items-start gap-3">
                            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <div>
                                <strong className="font-semibold">Share now, unlock rewards with your first payment!</strong>
                                <p className="mt-0.5 text-amber-700 dark:text-amber-300/90">
                                    You can share your referral link immediately. Rewards from your referred clinics will qualify and remain pending until your clinic pays its first monthly subscription invoice.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {isCompOrDemo && (
                    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-xs text-blue-800 dark:border-blue-400/20 dark:bg-blue-500/10 dark:text-blue-300">
                        <div className="flex items-start gap-3">
                            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                            <div>
                                <strong className="font-semibold">Complimentary & Demo Account Notice</strong>
                                <p className="mt-0.5 text-blue-700 dark:text-blue-300/90">
                                    Complimentary and demo accounts are welcome to share referral links with other clinics, but are excluded from receiving monetary billing credits.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Top Stats & Balance Overview */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Active Credit Balance
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                                <Wallet className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {creditBalanceFormatted}
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Applies automatically to your next invoice
                        </p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Total Credits Earned
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20">
                                <Sparkles className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {totalEarnedFormatted}
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Cumulative lifetime referral earnings
                        </p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Max Reward Per Referral
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400">
                                <Gift className="h-5 w-5" />
                            </div>
                        </div>
                        <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            {maxRewardFormatted}
                        </div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Capped at 1 month of your {currentPlanName} plan
                        </p>
                    </GlassCard>
                </div>

                {/* Referral Link & Share Controls */}
                <GlassCard className="p-6">
                    <div className="space-y-4">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                Your Unique Referral Link
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Share this link with clinics, doctors, or medical practice managers.
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-800 dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-200">
                                <span className="truncate">{referralUrl}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleCopy}
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="h-4 w-4" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="h-4 w-4" />
                                            Copy Link
                                        </>
                                    )}
                                </button>

                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#20ba59]"
                                >
                                    <Share2 className="h-4 w-4" />
                                    Share on WhatsApp
                                </a>
                            </div>
                        </div>

                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Your referral code: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">{referralCode}</code>
                        </div>
                    </div>
                </GlassCard>

                {/* Explanation of Program Rules */}
                <GlassCard className="p-6">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        How the Referral Program Works
                    </h2>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-xl border border-slate-200/70 bg-white/50 p-4 dark:border-white/5 dark:bg-slate-900/40">
                            <div className="text-xs font-bold text-primary">1. Share Your Link</div>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                Send your link to fellow clinic owners. When they open it, a 30-day cookie ensures you are credited upon registration.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200/70 bg-white/50 p-4 dark:border-white/5 dark:bg-slate-900/40">
                            <div className="text-xs font-bold text-primary">2. Two Paid Invoices</div>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                The referred clinic must pay 2 consecutive monthly invoices. Free trial, invites, and Rs. 0 promotional months do not earn credits.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200/70 bg-white/50 p-4 dark:border-white/5 dark:bg-slate-900/40">
                            <div className="text-xs font-bold text-primary">3. Fair Reward Cap</div>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                You receive credit equal to what the clinic actually paid for its first month, capped at up to one month of your own plan price.
                            </p>
                        </div>

                        <div className="rounded-xl border border-slate-200/70 bg-white/50 p-4 dark:border-white/5 dark:bg-slate-900/40">
                            <div className="text-xs font-bold text-primary">4. Automatic Offset</div>
                            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                Credit applies automatically against future invoices. Unused credit carries forward and expires after 12 months (no cash payout).
                            </p>
                        </div>
                    </div>
                </GlassCard>

                {/* Referrals Status Table */}
                <GlassCard className="overflow-hidden">
                    <div className="border-b border-slate-200/80 px-6 py-4 dark:border-white/10 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" />
                                Referred Clinics ({referrals.length})
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                Real-time status of clinics that registered using your referral link.
                            </p>
                        </div>
                    </div>

                    {referrals.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800">
                                <Gift className="h-6 w-6 text-slate-400" />
                            </div>
                            <h3 className="mt-3 text-sm font-bold text-slate-900 dark:text-white">
                                No referrals yet
                            </h3>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Share your link above with doctors and clinic managers to start earning billing credits.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="border-b border-slate-200/80 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-white/10 dark:bg-slate-900/50 dark:text-slate-400">
                                    <tr>
                                        <th className="px-6 py-3">Clinic Name</th>
                                        <th className="px-6 py-3">Status</th>
                                        <th className="px-6 py-3">Paid Invoices</th>
                                        <th className="px-6 py-3">Reward Earned</th>
                                        <th className="px-6 py-3">Joined Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200/80 dark:divide-white/5">
                                    {referrals.map((r) => (
                                        <tr
                                            key={r.id}
                                            className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                                        >
                                            <td className="px-6 py-3.5 font-semibold text-slate-900 dark:text-white">
                                                {r.clinic_name}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                {getStatusBadge(r.status, r.qualifying_invoices_count)}
                                            </td>
                                            <td className="px-6 py-3.5 text-slate-600 dark:text-slate-300">
                                                {r.qualifying_invoices_count} / {qualifyingTarget}
                                            </td>
                                            <td className="px-6 py-3.5 font-semibold text-emerald-600 dark:text-emerald-400">
                                                {r.reward_amount_cents > 0 ? r.reward_formatted : '—'}
                                            </td>
                                            <td className="px-6 py-3.5 text-slate-500 dark:text-slate-400">
                                                {r.created_at || '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </GlassCard>
            </div>
        </AuthenticatedLayout>
    );
}
