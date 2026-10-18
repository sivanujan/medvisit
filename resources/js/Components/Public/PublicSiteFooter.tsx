import React from 'react';
import { Link } from '@inertiajs/react';
import {
    Phone,
    MapPin,
    Mail,
    Clock,
    Calendar,
    MessageCircle,
    HeartPulse,
    ShieldCheck,
    Globe,
    ExternalLink,
} from 'lucide-react';

export interface FooterConfig {
    logo_url?: string;
    about_text?: string;
    show_about?: boolean;
    quick_links?: { label: string; url: string; page_id?: number }[];
    address?: string;
    phone?: string;
    email?: string;
    whatsapp_number?: string;
    opening_hours?: string;
    cta_text?: string;
    cta_link?: string;
    cta_url?: string;
    show_social?: boolean;
    facebook_url?: string;
    instagram_url?: string;
    social_links?: {
        facebook?: string;
        twitter?: string;
        instagram?: string;
        linkedin?: string;
    };
    show_powered_by?: boolean;
}

interface PublicSiteFooterProps {
    clinic: {
        name: string;
        subdomain?: string;
        phone?: string;
        address?: string;
        logo_url?: string;
        email?: string;
        whatsapp_number?: string;
        opening_hours?: string;
    };
    footerConfig?: FooterConfig;
    themePreset?: string;
}

export default function PublicSiteFooter({
    clinic,
    footerConfig,
    themePreset = 'medvisit-teal',
}: PublicSiteFooterProps) {
    const currentYear = new Date().getFullYear();

    const displayLogoUrl = footerConfig?.logo_url || clinic.logo_url;
    const aboutText =
        footerConfig?.about_text ||
        'Providing premier outpatient healthcare, specialist doctor channeling, and accredited diagnostic medical services with international safety protocols and Sri Lankan warmth.';
    const displayPhone = footerConfig?.phone || clinic.phone || '+94 77 204 6898';
    const displayAddress = footerConfig?.address || clinic.address || 'Colombo, Sri Lanka';
    const displayEmail = footerConfig?.email || clinic.email || `contact@${clinic.subdomain || 'clinic'}.medvisit.lk`;
    const displayWhatsApp = footerConfig?.whatsapp_number || clinic.whatsapp_number;
    const cleanWhatsApp = displayWhatsApp ? displayWhatsApp.replace(/\D/g, '') : '';
    const openingHours =
        footerConfig?.opening_hours ||
        clinic.opening_hours ||
        'Mon – Sat: 07:30 AM – 10:00 PM | Sun: 08:00 AM – 08:00 PM';
    const ctaText = footerConfig?.cta_text || 'Book a token';
    const ctaLink = footerConfig?.cta_link || '/book';
    const showPoweredBy = footerConfig?.show_powered_by !== false;

    const quickLinks = footerConfig?.quick_links && footerConfig.quick_links.length > 0
        ? footerConfig.quick_links
        : [
              { label: 'Home', url: '/' },
              { label: 'Doctor Specialists', url: '/#doctors' },
              { label: 'Weekly Channeling', url: '/#sessions' },
              { label: 'Clinical Services', url: '/#services' },
              { label: 'Operating Hours', url: '/#hours' },
              { label: 'Contact & Location', url: '/#contact' },
          ];

    return (
        <footer className="bg-slate-950 text-slate-400 text-sm border-t border-slate-900" role="contentinfo">
            {/* Top Accent Strip */}
            <div className="h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
                    {/* 1. Clinic Branding & Short About */}
                    <div className="space-y-4">
                        <Link href="/" className="inline-flex items-center gap-3 group">
                            {displayLogoUrl ? (
                                <img
                                    src={displayLogoUrl}
                                    alt={`${clinic.name} Logo`}
                                    className="h-10 w-auto object-contain rounded-lg"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md group-hover:scale-105 transition-transform">
                                    {clinic.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <span className="text-lg font-black tracking-tight text-white block leading-tight">
                                    {clinic.name}
                                </span>
                                <span className="text-xs text-teal-400 font-semibold block">
                                    Specialist Medical Center
                                </span>
                            </div>
                        </Link>

                        <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                            {aboutText}
                        </p>

                        <div className="pt-2 flex items-center gap-2 text-xs text-teal-400 font-semibold">
                            <ShieldCheck className="w-4 h-4 text-teal-400" />
                            <span>Sri Lanka Medical Council Verified</span>
                        </div>
                    </div>

                    {/* 2. Quick Links */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                            Quick Navigation
                        </h4>
                        <ul className="space-y-2.5 text-xs font-medium">
                            {quickLinks.map((item, idx) => (
                                <li key={idx}>
                                    <a
                                        href={item.url}
                                        className="text-slate-400 hover:text-white transition-colors hover:translate-x-0.5 inline-block"
                                    >
                                        {item.label}
                                    </a>
                                </li>
                            ))}
                            <li>
                                <Link
                                    href="/book"
                                    className="text-teal-400 hover:text-teal-300 font-bold transition-colors inline-flex items-center gap-1"
                                >
                                    <span>Online Channeling Portal</span>
                                    <span aria-hidden="true">→</span>
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* 3. Contact & Clinical Hours */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                            Contact & Location
                        </h4>
                        <ul className="space-y-3 text-xs">
                            {displayAddress && (
                                <li className="flex items-start gap-2.5">
                                    <MapPin className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                                    <span className="text-slate-300 leading-relaxed">{displayAddress}</span>
                                </li>
                            )}
                            {displayPhone && (
                                <li className="flex items-center gap-2.5">
                                    <Phone className="w-4 h-4 text-teal-400 shrink-0" />
                                    <a
                                        href={`tel:${displayPhone.replace(/\s+/g, '')}`}
                                        className="text-slate-300 hover:text-white font-mono font-bold transition-colors"
                                    >
                                        {displayPhone}
                                    </a>
                                </li>
                            )}
                            {displayEmail && (
                                <li className="flex items-center gap-2.5">
                                    <Mail className="w-4 h-4 text-teal-400 shrink-0" />
                                    <a
                                        href={`mailto:${displayEmail}`}
                                        className="text-slate-300 hover:text-white transition-colors truncate"
                                    >
                                        {displayEmail}
                                    </a>
                                </li>
                            )}
                            {cleanWhatsApp && (
                                <li className="flex items-center gap-2.5">
                                    <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                                    <a
                                        href={`https://wa.me/${cleanWhatsApp}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                                    >
                                        WhatsApp Channeling Desk
                                    </a>
                                </li>
                            )}
                        </ul>
                    </div>

                    {/* 4. Consultation Hours & CTA */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                            Opening Hours
                        </h4>

                        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5 text-xs">
                            <div className="flex items-center gap-2 text-teal-400 font-bold">
                                <Clock className="w-4 h-4" />
                                <span>Clinic Schedule</span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                                {openingHours}
                            </p>
                        </div>

                        <div className="pt-1">
                            <Link
                                href={ctaLink}
                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all hover:shadow-lg active:scale-95"
                            >
                                <Calendar className="w-4 h-4" />
                                <span>{ctaText}</span>
                            </Link>
                        </div>

                        {/* Social Links if set */}
                        {footerConfig?.social_links && (
                            <div className="pt-2 flex items-center gap-3">
                                {footerConfig.social_links.facebook && (
                                    <a
                                        href={footerConfig.social_links.facebook}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-xs font-bold"
                                        aria-label="Facebook"
                                    >
                                        FB
                                    </a>
                                )}
                                {footerConfig.social_links.twitter && (
                                    <a
                                        href={footerConfig.social_links.twitter}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-xs font-bold"
                                        aria-label="X / Twitter"
                                    >
                                        X
                                    </a>
                                )}
                                {footerConfig.social_links.instagram && (
                                    <a
                                        href={footerConfig.social_links.instagram}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-xs font-bold"
                                        aria-label="Instagram"
                                    >
                                        IG
                                    </a>
                                )}
                                {footerConfig.social_links.linkedin && (
                                    <a
                                        href={footerConfig.social_links.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-xs font-bold"
                                        aria-label="LinkedIn"
                                    >
                                        IN
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Copyright & Powered by MedVisit */}
                <div className="mt-12 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                    <p>
                        &copy; {currentYear} {clinic.name}. All rights reserved.
                    </p>

                    {showPoweredBy && (
                        <div className="flex items-center gap-1 text-slate-400">
                            <span>Powered by</span>
                            <a
                                href="https://medvisit.lk"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-bold text-teal-400 hover:text-teal-300 transition-colors inline-flex items-center gap-1"
                            >
                                <span>MedVisit</span>
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </footer>
    );
}
