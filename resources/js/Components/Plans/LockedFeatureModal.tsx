import React from 'react';
import { GlassModal } from '@/Components/UI/GlassModal';
import { Sparkles, Lock, ArrowUpRight, Check, Shield } from 'lucide-react';
import { Link } from '@inertiajs/react';

export interface LockedFeatureDetails {
    feature: string;
    title: string;
    required_plan: string;
    description: string;
    upgrade_url?: string;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    details: LockedFeatureDetails | null;
}

export default function LockedFeatureModal({ isOpen, onClose, details }: Props) {
    if (!details) return null;

    const plan = details.required_plan || 'Pro';

    const featureHighlights: Record<string, string[]> = {
        pharmacy: [
            'Digital medicine catalog with batch & expiry tracking',
            'Counter dispensing linked directly to doctor electronic prescriptions',
            'Good Receiving Notes (GRN) and supplier purchase tracking',
            'Low-stock alerts & automated reorder level calculations',
        ],
        website_builder: [
            'Drag-and-drop live section editor for your clinic website',
            'Custom doctor showcases, clinical service cards & facility galleries',
            'SEO metadata controls and custom page layouts',
            'Instant publishing with mobile and desktop responsive previews',
        ],
        tv_multi_room: [
            'Filter waiting room Smart TV displays by specific doctor or room',
            'Independent multi-room calling displays for busy clinics',
            'Per-room token progress and doctor status indication',
        ],
        audit_export: [
            'Export comprehensive CSV audit trails for healthcare accreditation',
            'Detailed logs of user logins, token cancellations & billing events',
            'Permanent compliance records for clinical governance',
        ],
    };

    const highlights = featureHighlights[details.feature] || [
        'Enhanced capabilities designed for growing medical clinics',
        'Streamlined workflows for your doctors, staff, and reception',
        'Dedicated onboarding and priority customer support',
    ];

    return (
        <GlassModal isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
            <div className="text-center p-2">
                {/* Header Badge */}
                <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-[#1E6FD9]/20 to-[#0E9E8F]/20 border border-[#1E6FD9]/30 flex items-center justify-center text-[#1E6FD9] mb-4 shadow-sm shadow-[#1E6FD9]/10">
                    <Sparkles className="w-6 h-6 text-[#1E6FD9]" />
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#1E6FD9]/10 to-[#0E9E8F]/10 border border-[#1E6FD9]/20 text-[#1E6FD9] text-[11px] font-bold uppercase tracking-wider mb-2">
                    <Lock className="w-3 h-3" />
                    <span>Available on {plan}</span>
                </div>

                <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {details.title}
                </h3>

                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {details.description}
                </p>

                {/* Highlights List */}
                <div className="mt-5 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/50 text-left space-y-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                        What's Included:
                    </span>
                    {highlights.map((h, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-200">
                            <div className="w-4 h-4 rounded-full bg-[#0E9E8F]/15 text-[#0E9E8F] flex items-center justify-center shrink-0 mt-0.5">
                                <Check className="w-2.5 h-2.5" />
                            </div>
                            <span>{h}</span>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5">
                    <Link
                        href={details.upgrade_url || '/settings/billing/change-plan'}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] hover:from-[#1557b0] hover:to-[#0b8074] text-white text-xs font-bold transition shadow-md shadow-[#1E6FD9]/20 cursor-pointer"
                        onClick={onClose}
                    >
                        <span>Upgrade to {plan}</span>
                        <ArrowUpRight className="w-4 h-4" />
                    </Link>

                    <button
                        type="button"
                        onClick={onClose}
                        className="w-full sm:w-auto px-4 py-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                    >
                        Maybe later
                    </button>
                </div>
            </div>
        </GlassModal>
    );
}

