import React from 'react';
import { Link, usePage } from '@inertiajs/react';
import { Mail, Phone, MessageSquare, ShieldCheck, ExternalLink } from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import { defaultPublicConfig } from '@/Config/medvisitPublic';
import { PageProps } from '@/types';

interface Props {
    className?: string;
    isTenantContext?: boolean;
}

export default function LegalFooter({ className = '', isTenantContext = false }: Props) {
    const { props } = usePage<PageProps>();
    const publicConfig = props.publicConfig || defaultPublicConfig;
    const business = publicConfig.business;

    const supportEmail = business.support_email || business.email || 'support@medvisit.lk';
    const generalEmail = business.general_email || 'hello@medvisit.lk';
    const displayPhone = business.phone_display || '070 129 1688';
    const telHref = business.phone_raw ? `tel:${business.phone_raw}` : 'tel:+94701291688';
    const whatsappUrl = business.whatsapp_url || 'https://wa.me/94701291688';

    // Detect if we're on a tenant subdomain
    const isTenant = isTenantContext || !!props.tenant?.subdomain;
    const centralBaseDomain = props.tenant?.base_domain || 'medvisit.lk';

    const resolveLink = (path: string) => {
        if (!isTenant) {
            return path;
        }
        if (typeof window !== 'undefined') {
            const port = window.location.port ? `:${window.location.port}` : '';
            return `${window.location.protocol}//${centralBaseDomain}${port}${path}`;
        }
        return `https://${centralBaseDomain}${path}`;
    };

    const renderLink = (label: string, path: string) => {
        const resolved = resolveLink(path);
        if (isTenant) {
            return (
                <a
                    href={resolved}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xs"
                >
                    {label}
                </a>
            );
        }
        return (
            <Link
                href={path}
                className="text-xs text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xs"
            >
                {label}
            </Link>
        );
    };

    return (
        <footer
            aria-label="Legal & Business Information"
            className={`border-t border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors print:hidden ${className}`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
                {/* 4 Column Layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 pb-10 border-b border-slate-200/70 dark:border-slate-800">
                    {/* Col 1: Brand & Tagline */}
                    <div className="space-y-3">
                        <Link href="/" className="inline-flex items-center gap-2 group" aria-label="MedVisit Home">
                            <ApplicationLogo className="h-7 w-auto transition-transform group-hover:scale-105" />
                        </Link>
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                            Sri Lanka’s smart clinic operating system & live patient token management platform. Built for modern medical practices, doctors, and patient care.
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-500 font-medium">
                            {business.name} — Clinic Operating System
                        </p>
                    </div>

                    {/* Col 2: Product */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                            Product
                        </h4>
                        <ul className="space-y-2">
                            <li>{renderLink('Pricing & Plans', '/pricing')}</li>
                            <li>
                                <a
                                    href="/login"
                                    className="text-xs text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xs"
                                >
                                    Sign In
                                </a>
                            </li>
                            <li>
                                <a
                                    href="/register"
                                    className="text-xs text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xs"
                                >
                                    Get Started
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Col 3: Legal (All 4 Policies) */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                            Legal & Compliance
                        </h4>
                        <ul className="space-y-2">
                            <li>{renderLink('Terms and Conditions', '/terms')}</li>
                            <li>{renderLink('Refund and Cancellation Policy', '/refund-policy')}</li>
                            <li>{renderLink('Dispute Resolution Policy', '/dispute-policy')}</li>
                            <li>{renderLink('Privacy Policy', '/privacy-policy')}</li>
                        </ul>
                    </div>

                    {/* Col 4: Contact */}
                    <div id="contact" className="scroll-mt-24">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-3">
                            Contact
                        </h4>
                        <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                            <li>
                                <a
                                    href={`mailto:${supportEmail}`}
                                    className="inline-flex items-start gap-2 hover:text-primary dark:hover:text-primary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xs"
                                >
                                    <Mail className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                    <span>Support: {supportEmail}</span>
                                </a>
                            </li>
                            <li>
                                <a
                                    href={`mailto:${generalEmail}`}
                                    className="inline-flex items-start gap-2 hover:text-secondary dark:hover:text-secondary-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary rounded-xs"
                                >
                                    <Mail className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                                    <span>General: {generalEmail}</span>
                                </a>
                            </li>
                            <li>
                                <a
                                    href={telHref}
                                    className="inline-flex items-start gap-2 hover:text-slate-900 dark:hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xs"
                                >
                                    <Phone className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                                    <span>Call / WhatsApp: {displayPhone}</span>
                                </a>
                            </li>
                            <li>
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600/10 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-semibold hover:bg-emerald-600/20 transition-colors"
                                >
                                    <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>WhatsApp: wa.me/94701291688</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Bar: Copyright & Payment Badges */}
                <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <p className="order-2 sm:order-1 text-center sm:text-left">
                        &copy; 2026 MedVisit. All prices in LKR. Registered in Sri Lanka.
                    </p>

                    <div className="order-1 sm:order-2 flex flex-wrap items-center justify-center gap-2">
                        <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 inline-flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                            <span>Secure card payments</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 font-mono font-bold text-[10px] tracking-wider text-blue-700 dark:text-blue-400">
                                VISA
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-300/80 dark:border-slate-700 font-mono font-bold text-[10px] tracking-wider text-amber-700 dark:text-amber-400">
                                Mastercard
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
