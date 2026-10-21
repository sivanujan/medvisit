import React from 'react';
import { Mail, Phone, Building2, Clock, MessageSquare, ExternalLink } from 'lucide-react';
import { BusinessDetails, defaultPublicConfig } from '@/Config/medvisitPublic';

interface Props {
    business?: BusinessDetails;
    className?: string;
}

export default function PolicyContactCard({ business = defaultPublicConfig.business, className = '' }: Props) {
    const supportEmail = business.support_email || business.email || 'support@medvisit.lk';
    const generalEmail = business.general_email || 'hello@medvisit.lk';
    const displayPhone = business.phone_display || '070 129 1688';
    const telHref = business.phone_raw ? `tel:${business.phone_raw}` : 'tel:+94701291688';
    const whatsappUrl = business.whatsapp_url || 'https://wa.me/94701291688';

    return (
        <section
            aria-labelledby="policy-contact-heading"
            className={`mt-12 rounded-3xl p-6 sm:p-8 bg-white/85 dark:bg-slate-900/80 border border-slate-200/90 dark:border-white/10 shadow-lg shadow-slate-200/50 dark:shadow-none backdrop-blur-xl transition-all ${className}`}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary text-white flex items-center justify-center shadow-sm shadow-primary/30">
                        <Building2 className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div>
                        <h3 id="policy-contact-heading" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                            Contact Us & Support
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            {business.name} — Clinic Operating System
                        </p>
                    </div>
                </div>

                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold self-start sm:self-center">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>We usually reply within 1 working day.</span>
                </div>
            </div>

            {/* Quick summary text */}
            <div className="pt-4 pb-2 text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-800/40 px-3.5 py-2.5 rounded-xl my-4 border border-slate-200/60 dark:border-slate-800/60">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Support: {supportEmail} · General: {generalEmail} · Phone / WhatsApp: {displayPhone}
                </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 text-xs">
                {/* Support Email */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-primary font-bold mb-1">
                            <Mail className="w-4 h-4" />
                            <span>Support & Claims</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                            For refunds, disputes & account help
                        </p>
                    </div>
                    <a
                        href={`mailto:${supportEmail}`}
                        className="font-semibold text-slate-900 dark:text-white hover:text-primary dark:hover:text-primary-400 underline underline-offset-2 break-all transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xs"
                    >
                        {supportEmail}
                    </a>
                </div>

                {/* General Email */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-secondary font-bold mb-1">
                            <Mail className="w-4 h-4" />
                            <span>General Enquiries</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                            Partnerships, sales & general questions
                        </p>
                    </div>
                    <a
                        href={`mailto:${generalEmail}`}
                        className="font-semibold text-slate-900 dark:text-white hover:text-secondary dark:hover:text-secondary-400 underline underline-offset-2 break-all transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded-xs"
                    >
                        {generalEmail}
                    </a>
                </div>

                {/* Phone & Direct Calling */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold mb-1">
                            <Phone className="w-4 h-4 text-primary" />
                            <span>Phone Line</span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                            Mon–Sat 8:30 AM – 6:30 PM
                        </p>
                    </div>
                    <a
                        href={telHref}
                        className="font-bold text-slate-900 dark:text-white hover:text-primary dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xs"
                    >
                        {displayPhone}
                    </a>
                </div>

                {/* WhatsApp Chat Button */}
                <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold mb-1">
                            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span>WhatsApp Chat</span>
                        </div>
                        <p className="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mb-2">
                            Direct messaging via WhatsApp
                        </p>
                    </div>
                    <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                        <span>Chat on WhatsApp</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                </div>
            </div>

            {/* Entity & Currency Info */}
            <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <span>Healthcare clinic management & patient queue platform &bull; Sri Lanka</span>
                </div>
                <div>
                    <span>All fees in LKR</span>
                </div>
            </div>
        </section>
    );
}
