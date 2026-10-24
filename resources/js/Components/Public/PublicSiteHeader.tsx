import React, { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import {
    Phone,
    Calendar,
    Menu,
    X,
    ChevronDown,
    Clock,
    MapPin,
    MessageCircle,
} from 'lucide-react';

export interface HeaderMenuItem {
    id?: string;
    label: string;
    url: string;
    page_id?: number;
    children?: { label: string; url: string }[];
}

export interface HeaderConfig {
    logo_url?: string;
    tagline?: string;
    show_tagline?: boolean;
    menu_items?: HeaderMenuItem[];
    show_phone?: boolean;
    phone?: string;
    show_whatsapp?: boolean;
    whatsapp_number?: string;
    cta_text?: string;
    cta_link?: string;
    cta_url?: string;
    is_sticky?: boolean;
    is_transparent?: boolean;
    is_transparent_over_hero?: boolean;
}

interface PublicSiteHeaderProps {
    clinic: {
        name: string;
        subdomain?: string;
        phone?: string;
        address?: string;
        logo_url?: string;
        whatsapp_number?: string;
        opening_hours?: string;
    };
    headerConfig?: HeaderConfig;
    themePreset?: string;
}

// Format Sri Lankan and international phone numbers into clean grouped format: "+94 70 129 1688"
function formatPhoneNumber(rawPhone?: string): string {
    if (!rawPhone) return '+94 70 129 1688';
    const cleaned = rawPhone.trim();
    const digits = cleaned.replace(/\D/g, '');

    if (digits.startsWith('94') && digits.length === 11) {
        return `+94 ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    if (digits.startsWith('0') && digits.length === 10) {
        return `+94 ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    if (cleaned.startsWith('+')) {
        return cleaned;
    }
    return cleaned;
}

// Primary theme styles mapping
const THEME_CLASSES: Record<string, { bg: string; hover: string; text: string; ring: string }> = {
    'medvisit-teal': {
        bg: 'bg-teal-600',
        hover: 'hover:bg-teal-500',
        text: 'text-teal-700',
        ring: 'focus-visible:ring-teal-500',
    },
    'ocean-blue': {
        bg: 'bg-blue-600',
        hover: 'hover:bg-blue-500',
        text: 'text-blue-700',
        ring: 'focus-visible:ring-blue-500',
    },
    'emerald-health': {
        bg: 'bg-emerald-600',
        hover: 'hover:bg-emerald-500',
        text: 'text-emerald-700',
        ring: 'focus-visible:ring-emerald-500',
    },
    'royal-purple': {
        bg: 'bg-purple-600',
        hover: 'hover:bg-purple-500',
        text: 'text-purple-700',
        ring: 'focus-visible:ring-purple-500',
    },
    'warm-terracotta': {
        bg: 'bg-amber-600',
        hover: 'hover:bg-amber-500',
        text: 'text-amber-700',
        ring: 'focus-visible:ring-amber-500',
    },
};

export default function PublicSiteHeader({
    clinic,
    headerConfig,
    themePreset = 'medvisit-teal',
}: PublicSiteHeaderProps) {
    const [isScrolled, setIsScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);

    // Resolve theme styling tokens
    const themeStyles = THEME_CLASSES[themePreset] || THEME_CLASSES['medvisit-teal'];

    // Track window scroll for translucency and subtle shadow
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 15);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Lock body scroll while mobile drawer is open & handle ESC key
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
            const handleKeyDown = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    setMobileMenuOpen(false);
                }
            };
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                document.body.style.overflow = '';
                window.removeEventListener('keydown', handleKeyDown);
            };
        } else {
            document.body.style.overflow = '';
        }
    }, [mobileMenuOpen]);

    // Menu items defaults
    const defaultMenuItems: HeaderMenuItem[] = [
        { label: 'Home', url: '/' },
        { label: 'About', url: '/#about' },
        { label: 'Doctors', url: '/#doctors' },
        { label: 'Services', url: '/#services' },
        { label: 'Contact', url: '/#contact' },
    ];

    const menuItems = headerConfig?.menu_items && headerConfig.menu_items.length > 0
        ? headerConfig.menu_items
        : defaultMenuItems;

    const displayLogoUrl = headerConfig?.logo_url || clinic.logo_url;
    const displayPhone = headerConfig?.phone || clinic.phone || '+94 70 129 1688';
    const formattedPhone = formatPhoneNumber(displayPhone);
    const rawTel = displayPhone.replace(/\s+/g, '');
    const displayWhatsApp = headerConfig?.whatsapp_number || clinic.whatsapp_number;
    const cleanWhatsApp = displayWhatsApp ? displayWhatsApp.replace(/\D/g, '') : '';
    const showTagline = headerConfig?.show_tagline !== false;
    const tagline = headerConfig?.tagline || '';
    const ctaText = headerConfig?.cta_text || 'Book a token';
    const ctaLink = headerConfig?.cta_link || '/book';
    const isSticky = headerConfig?.is_sticky !== false;
    const isTransparent = headerConfig?.is_transparent && !isScrolled;

    // Check active navigation link
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    const currentHash = typeof window !== 'undefined' ? window.location.hash : '';

    const isLinkActive = (url: string) => {
        if (url === '/' && currentPath === '/' && !currentHash) return true;
        if (url.startsWith('/#') && currentPath === '/' && currentHash === url.substring(1)) return true;
        if (url !== '/' && currentPath === url) return true;
        return false;
    };

    return (
        <>
            {/* 1. Skip-to-content accessibility link */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 z-50 px-4 py-2 bg-teal-600 text-white font-bold rounded-xl shadow-xl ring-2 ring-white transition-all outline-none"
            >
                Skip to content
            </a>

            {/* 2. Top Live Emergency / Queue Banner (Subtle & verified) */}
            <div className="bg-slate-900 text-slate-300 text-[11px] py-1.5 px-4 border-b border-slate-800 hidden md:block">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-teal-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                            Book your token online
                        </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                        <Link
                            href="/login"
                            className="font-medium text-slate-400 hover:text-white transition-colors"
                        >
                            Staff Login
                        </Link>
                    </div>
                </div>
            </div>

            {/* 3. Main Public Site Header (Height ~76px) */}
            <header
                className={`${isSticky ? 'sticky top-0 z-40' : 'relative z-40'} transition-all duration-200 ${
                    isTransparent
                        ? 'bg-transparent border-transparent'
                        : isScrolled
                        ? 'bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs'
                        : 'bg-white border-b border-slate-200'
                }`}
            >
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[76px] flex items-center justify-between gap-4">
                    {/* Left: Clinic Logo, Name, and Tagline */}
                    <div className="flex items-center gap-3 min-w-0">
                        <Link
                            href="/"
                            className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-xl p-1 -m-1"
                            title={`${clinic.name} Home`}
                        >
                            {displayLogoUrl ? (
                                <img
                                    src={displayLogoUrl}
                                    alt={`${clinic.name} Logo`}
                                    className="h-11 sm:h-12 w-auto max-w-[160px] object-contain rounded-lg"
                                />
                            ) : (
                                <div
                                    className={`w-11 h-11 rounded-2xl ${themeStyles.bg} flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-teal-700/20 group-hover:scale-105 transition-transform shrink-0`}
                                >
                                    {clinic.name.charAt(0).toUpperCase()}
                                </div>
                            )}

                            <div className="min-w-0">
                                <span className="text-base sm:text-lg font-black tracking-tight text-slate-900 block leading-tight truncate">
                                    {clinic.name}
                                </span>
                                {showTagline && tagline && (
                                    <span className="text-[11px] text-slate-500 font-medium block truncate max-w-[200px] sm:max-w-xs">
                                        {tagline}
                                    </span>
                                )}
                            </div>
                        </Link>
                    </div>

                    {/* Centre: Desktop Navigation Menu */}
                    <nav
                        className="hidden lg:flex items-center gap-1 text-sm font-semibold text-slate-600"
                        aria-label="Main Navigation"
                    >
                        {menuItems.map((item, idx) => {
                            const active = isLinkActive(item.url);
                            const hasChildren = item.children && item.children.length > 0;

                            if (hasChildren) {
                                return (
                                    <div
                                        key={item.id || item.label || idx}
                                        className="relative"
                                        onMouseEnter={() => setOpenDropdownIndex(idx)}
                                        onMouseLeave={() => setOpenDropdownIndex(null)}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setOpenDropdownIndex(openDropdownIndex === idx ? null : idx)}
                                            className={`inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all focus-visible:outline-none ${themeStyles.ring} ${
                                                active
                                                    ? `${themeStyles.text} bg-teal-50/80`
                                                    : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/70'
                                            }`}
                                            aria-expanded={openDropdownIndex === idx}
                                        >
                                            <span>{item.label}</span>
                                            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                                        </button>

                                        {openDropdownIndex === idx && (
                                            <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-2xl border border-slate-200/90 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                                                {item.children!.map((child, cIdx) => (
                                                    <a
                                                        key={child.label || cIdx}
                                                        href={child.url}
                                                        className="block px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                                                    >
                                                        {child.label}
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            }

                            return (
                                <a
                                    key={item.id || item.label || idx}
                                    href={item.url}
                                    aria-current={active ? 'page' : undefined}
                                    className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all focus-visible:outline-none ${themeStyles.ring} ${
                                        active
                                            ? `${themeStyles.text} bg-teal-50/80`
                                            : 'text-slate-700 hover:text-slate-950 hover:bg-slate-100/70'
                                    }`}
                                >
                                    {item.label}
                                </a>
                            );
                        })}
                    </nav>

                    {/* Right: Phone, WhatsApp, and Primary "Book a token" Button */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Phone hotline (desktop) */}
                        {headerConfig?.show_phone !== false && displayPhone && (
                            <a
                                href={`tel:${rawTel}`}
                                className="hidden xl:inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 hover:text-slate-950 px-3 py-2 rounded-xl hover:bg-slate-100/70 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                                title="Call clinic reception"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-teal-700">
                                    <Phone className="w-3.5 h-3.5" />
                                </div>
                                <span className="tabular-nums font-mono">{formattedPhone}</span>
                            </a>
                        )}

                        {/* WhatsApp icon button */}
                        {headerConfig?.show_whatsapp !== false && cleanWhatsApp && (
                            <a
                                href={`https://wa.me/${cleanWhatsApp}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                                aria-label="Chat on WhatsApp"
                                title="Chat with clinic on WhatsApp"
                            >
                                <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                            </a>
                        )}

                        {/* Mobile Phone icon button (<1024px) */}
                        <a
                            href={`tel:${rawTel}`}
                            className="inline-flex lg:hidden items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                            aria-label={`Call ${formattedPhone}`}
                            title={`Call ${formattedPhone}`}
                        >
                            <Phone className="w-4 h-4 text-teal-700" />
                        </a>

                        {/* Primary "Book a token" CTA Button */}
                        <Link
                            href={ctaLink}
                            className={`inline-flex items-center gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-xl ${themeStyles.bg} ${themeStyles.hover} text-white font-bold text-xs sm:text-sm shadow-md shadow-teal-700/20 hover:shadow-lg transition-all active:scale-95 focus-visible:outline-none ${themeStyles.ring}`}
                        >
                            <Calendar className="w-4 h-4" />
                            <span className="hidden sm:inline">{ctaText}</span>
                            <span className="sm:hidden">Book</span>
                        </Link>

                        {/* Mobile Hamburger Button (<1024px) */}
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            className="inline-flex lg:hidden items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                            aria-label="Open navigation menu"
                            aria-expanded={mobileMenuOpen}
                        >
                            <Menu className="w-5 h-5 text-slate-800" />
                        </button>
                    </div>
                </div>
            </header>

            {/* 4. Mobile Full-Height Slide-in Drawer */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-50 lg:hidden flex justify-end"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Mobile Navigation Drawer"
                >
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Slide-in Drawer Panel */}
                    <div className="relative w-full max-w-xs sm:max-w-sm bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250">
                        {/* Drawer Header with Styled Close Button */}
                        <div className="h-[76px] px-5 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                {displayLogoUrl ? (
                                    <img
                                        src={displayLogoUrl}
                                        alt={clinic.name}
                                        className="h-9 w-auto object-contain rounded-lg"
                                    />
                                ) : (
                                    <div
                                        className={`w-9 h-9 rounded-xl ${themeStyles.bg} flex items-center justify-center text-white font-black text-base shadow-xs`}
                                    >
                                        {clinic.name.charAt(0).toUpperCase()}
                                    </div>
                                )}
                                <span className="font-black text-slate-900 text-sm tracking-tight truncate max-w-[170px]">
                                    {clinic.name}
                                </span>
                            </div>

                            {/* Styled Close Button - with X icon and aria-label */}
                            <button
                                type="button"
                                onClick={() => setMobileMenuOpen(false)}
                                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-950 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                                aria-label="Close navigation menu"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Drawer Navigation Links */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-4">
                            <nav className="space-y-1">
                                {menuItems.map((item, idx) => {
                                    const active = isLinkActive(item.url);
                                    return (
                                        <div key={item.id || item.label || idx}>
                                            <a
                                                href={item.url}
                                                onClick={() => setMobileMenuOpen(false)}
                                                className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-bold transition-colors ${
                                                    active
                                                        ? `${themeStyles.text} bg-teal-50`
                                                        : 'text-slate-800 hover:bg-slate-100'
                                                }`}
                                            >
                                                <span>{item.label}</span>
                                            </a>

                                            {item.children && item.children.length > 0 && (
                                                <div className="ml-4 pl-3 border-l-2 border-slate-200 space-y-1 py-1">
                                                    {item.children.map((child, cIdx) => (
                                                        <a
                                                            key={child.label || cIdx}
                                                            href={child.url}
                                                            onClick={() => setMobileMenuOpen(false)}
                                                            className="block py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                                                        >
                                                            {child.label}
                                                        </a>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </nav>

                            {/* Info card: Phone & Opening Hours */}
                            <div className="pt-4 border-t border-slate-100 space-y-3">
                                {displayPhone && (
                                    <a
                                        href={`tel:${rawTel}`}
                                        className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-900 transition-colors"
                                    >
                                        <div className="w-9 h-9 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                                            <Phone className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                                                Clinic Hotline
                                            </span>
                                            <span className="text-xs font-bold font-mono">
                                                {formattedPhone}
                                            </span>
                                        </div>
                                    </a>
                                )}

                                {clinic.address && (
                                    <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 text-slate-700 text-xs">
                                        <MapPin className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                                        <span className="line-clamp-2">{clinic.address}</span>
                                    </div>
                                )}

                                <div className="flex items-start gap-3 p-3 rounded-2xl bg-teal-50/60 text-teal-950 text-xs">
                                    <Clock className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                                    <div>
                                        <strong className="block font-bold">Consultation Hours</strong>
                                        <span className="text-[11px] text-teal-800">
                                            {clinic.opening_hours || 'Mon – Sat: 07:30 AM – 10:00 PM | Sun: 08:00 AM – 08:00 PM'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Drawer Bottom CTA Button */}
                        <div className="p-5 border-t border-slate-200 bg-slate-50/80">
                            <Link
                                href={ctaLink}
                                onClick={() => setMobileMenuOpen(false)}
                                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl ${themeStyles.bg} ${themeStyles.hover} text-white font-bold text-sm shadow-md transition-all active:scale-95`}
                            >
                                <Calendar className="w-4 h-4" />
                                <span>{ctaText}</span>
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
