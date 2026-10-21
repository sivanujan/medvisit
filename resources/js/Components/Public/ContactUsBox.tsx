import React from 'react';
import { Mail, Phone, MapPin, Building2, User, Globe, MessageSquare, ExternalLink } from 'lucide-react';
import { defaultPublicConfig, BusinessDetails } from '@/Config/medvisitPublic';

interface Props {
    business?: BusinessDetails;
    className?: string;
}

export default function ContactUsBox({ business = defaultPublicConfig.business, className = '' }: Props) {
    const supportEmail = business.support_email || business.email || 'support@medvisit.lk';
    const generalEmail = business.general_email || 'hello@medvisit.lk';
    const displayPhone = business.phone_display || '070 129 1688';
    const telHref = business.phone_raw ? `tel:${business.phone_raw}` : 'tel:+94701291688';
    const whatsappUrl = business.whatsapp_url || 'https://wa.me/94701291688';

    return (
        <section
            aria-labelledby="contact-heading"
            className={`mt-12 p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-900/90 dark:to-slate-800/60 border border-slate-200/90 dark:border-slate-800 backdrop-blur-md shadow-sm ${className}`}
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center font-bold">
                        <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 id="contact-heading" className="text-base font-bold text-slate-900 dark:text-white">
                            Contact Us & Business Information
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Official merchant & registered operating entity for MedVisit
                        </p>
                    </div>
                </div>

                <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-all active:scale-95 self-start sm:self-center"
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                    <ExternalLink className="w-3 h-3 opacity-80" />
                </a>
            </div>

            {/* Required contact summary line */}
            <div className="mb-4 px-3 py-2 rounded-lg bg-white/70 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-xs font-medium text-slate-700 dark:text-slate-300">
                Support: {supportEmail} · General: {generalEmail} · Phone / WhatsApp: {displayPhone}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-300">
                <div className="space-y-2.5">
                    <div className="flex items-start gap-2.5">
                        <Building2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Business Name</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">{business.name}</span>
                        </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                        <Globe className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Platform</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">Clinic Management & Queue System</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-2.5 sm:border-l sm:border-slate-200/80 sm:dark:border-slate-800 sm:pl-4">
                    <div className="flex items-start gap-2.5">
                        <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Support & Disputes Email</span>
                            <a
                                href={`mailto:${supportEmail}`}
                                className="font-semibold text-primary hover:text-primary-600 dark:hover:text-primary-400 underline underline-offset-2 transition-colors"
                            >
                                {supportEmail}
                            </a>
                        </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                        <Mail className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">General Enquiries Email</span>
                            <a
                                href={`mailto:${generalEmail}`}
                                className="font-semibold text-secondary hover:text-secondary-600 dark:hover:text-secondary-400 underline underline-offset-2 transition-colors"
                            >
                                {generalEmail}
                            </a>
                        </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                        <Phone className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Phone / WhatsApp</span>
                            <a
                                href={telHref}
                                className="font-semibold text-slate-800 dark:text-slate-100 hover:text-secondary transition-colors"
                            >
                                {displayPhone}
                            </a>
                        </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                        <Globe className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Official Website & Currency</span>
                            <span className="text-slate-700 dark:text-slate-300">
                                <a
                                    href={business.website}
                                    className="font-medium hover:underline text-primary"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    {business.website}
                                </a>{' '}
                                &bull; {business.currency}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
