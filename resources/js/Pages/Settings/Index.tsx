import React, { useState, useEffect, useMemo } from 'react';
import { Head, Link, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Building2,
    MapPin,
    Copy,
    Check,
    ExternalLink,
    ArrowLeft,
    Sliders,
    Globe,
    Calendar,
    Receipt,
    Pill,
    ShieldAlert,
    Clock,
    Sparkles,
} from 'lucide-react';
import { SettingsPageProps, SettingsSectionKey } from './types';
import SettingsNav, { SETTINGS_NAV_GROUPS } from './Components/SettingsNav';
import UnsavedBar from './Components/UnsavedBar';

// Sections
import ProfileSection from './Sections/ProfileSection';
import BrandingSection from './Sections/BrandingSection';
import HoursSection from './Sections/HoursSection';
import SessionDefaultsSection from './Sections/SessionDefaultsSection';
import OnlineBookingSection from './Sections/OnlineBookingSection';
import PrescriptionSection from './Sections/PrescriptionSection';
import BillingSection from './Sections/BillingSection';
import ReceiptsSection from './Sections/ReceiptsSection';
import PharmacySection from './Sections/PharmacySection';
import DirectorySection from './Sections/DirectorySection';
import AuditSection from './Sections/AuditSection';
import TvDisplaySection, { TvSettingsFormData } from './Sections/TvDisplaySection';

export default function SettingsCentre({
    activeSection: initialActiveSection = 'profile',
    profile,
    sessionDefaults,
    billingSettings,
    onlineBookingSettings,
    pharmacySettings,
    directorySettings,
    tvSettings,
    tvDevices = [],
    availableDoctors = [],
    auditLogs,
    availableActions,
    districts = [],
    filters,
}: SettingsPageProps) {
    const [activeSection, setActiveSection] = useState<SettingsSectionKey>(initialActiveSection || 'profile');
    const [mobileViewingDetail, setMobileViewingDetail] = useState<boolean>(true);
    const [copiedAddress, setCopiedAddress] = useState(false);

    // Sync with prop when URL changes
    useEffect(() => {
        if (initialActiveSection) {
            setActiveSection(initialActiveSection);
            setMobileViewingDetail(true);
        }
    }, [initialActiveSection]);

    // 1. Profile Form
    const profileForm = useForm({
        name: profile.name,
        phone: profile.phone,
        address_line: profile.address_line || '',
        city: profile.city || '',
        district: profile.district || '',
        postal_code: profile.postal_code || '',
        registration_number: profile.registration_number,
        logo_url: profile.logo_url,
    });

    // 2. Session Defaults Form
    const sessionForm = useForm({
        default_avg_consultation_minutes: sessionDefaults.default_avg_consultation_minutes,
        default_max_tokens: sessionDefaults.default_max_tokens,
        cancellation_window_hours: sessionDefaults.cancellation_window_hours,
        auto_generate_days: sessionDefaults.auto_generate_days,
    });

    // 3. Billing Form
    const billingForm = useForm({
        billing_timing: billingSettings.billing_timing,
        receipt_prefix: billingSettings.receipt_prefix,
        tax_percentage: billingSettings.tax_percentage,
        accepted_methods: billingSettings.accepted_methods,
        show_clinic_share_to_doctors: billingSettings.show_clinic_share_to_doctors ?? false,
    });

    // 4. Online Booking Form
    const onlineForm = useForm({
        online_booking_enabled: onlineBookingSettings.online_booking_enabled,
        max_active_tokens_per_phone: onlineBookingSettings.max_active_tokens_per_phone,
        require_staff_approval: onlineBookingSettings.require_staff_approval,
        require_phone_verification: onlineBookingSettings.require_phone_verification ?? true,
        phone_verification_methods: onlineBookingSettings.phone_verification_methods ?? ['whatsapp', 'textlk'],
    });

    // 5. Pharmacy & Prescription Form
    const pharmacyForm = useForm({
        pharmacy_enabled: pharmacySettings?.pharmacy_enabled ?? false,
        default_reorder_level: pharmacySettings?.default_reorder_level ?? 10,
        expiring_soon_threshold_days: pharmacySettings?.expiring_soon_threshold_days ?? 60,
        stock_reduction_mode: pharmacySettings?.stock_reduction_mode ?? 'dispense',
        prescription_print_enabled: pharmacySettings?.prescription_print_enabled ?? false,
        prescription_print_language: pharmacySettings?.prescription_print_language ?? 'en',
        prescription_print_show_doctor_reg: pharmacySettings?.prescription_print_show_doctor_reg ?? true,
        prescription_print_show_diagnosis: pharmacySettings?.prescription_print_show_diagnosis ?? false,
    });

    // 6. TV Display Form
    const tvForm = useForm<TvSettingsFormData>({
        name_display_mode: (tvSettings?.name_display_mode as any) || 'token_only',
        languages: (tvSettings?.languages as any) || ['en', 'ta', 'si'],
        chime_enabled: tvSettings?.chime_enabled ?? true,
        voice_language: (tvSettings?.voice_language as any) || 'off',
        ticker_text: tvSettings?.ticker_text || '',
        theme: (tvSettings?.theme as any) || 'dark',
        reduced_motion: tvSettings?.reduced_motion ?? false,
    });

    // Detect if current active section form has unsaved modifications
    const currentSectionDirty = useMemo(() => {
        switch (activeSection) {
            case 'profile':
                return profileForm.isDirty;
            case 'sessions':
                return sessionForm.isDirty;
            case 'billing':
            case 'receipts':
                return billingForm.isDirty;
            case 'booking':
                return onlineForm.isDirty;
            case 'pharmacy':
            case 'prescriptions':
                return pharmacyForm.isDirty;
            case 'tv':
                return tvForm.isDirty;
            default:
                return false;
        }
    }, [activeSection, profileForm.isDirty, sessionForm.isDirty, billingForm.isDirty, onlineForm.isDirty, pharmacyForm.isDirty, tvForm.isDirty]);

    const isCurrentFormSaving = useMemo(() => {
        switch (activeSection) {
            case 'profile':
                return profileForm.processing;
            case 'sessions':
                return sessionForm.processing;
            case 'billing':
            case 'receipts':
                return billingForm.processing;
            case 'booking':
                return onlineForm.processing;
            case 'pharmacy':
            case 'prescriptions':
                return pharmacyForm.processing;
            case 'tv':
                return tvForm.processing;
            default:
                return false;
        }
    }, [activeSection, profileForm.processing, sessionForm.processing, billingForm.processing, onlineForm.processing, pharmacyForm.processing, tvForm.processing]);

    // Save handler based on active section
    const handleSaveCurrentSection = () => {
        switch (activeSection) {
            case 'profile':
                profileForm.put('/settings/profile', { preserveScroll: true });
                break;
            case 'sessions':
                sessionForm.put('/settings/session-defaults', { preserveScroll: true });
                break;
            case 'billing':
            case 'receipts':
                billingForm.put('/settings/billing', { preserveScroll: true });
                break;
            case 'booking':
                onlineForm.put('/settings/online-booking', { preserveScroll: true });
                break;
            case 'pharmacy':
            case 'prescriptions':
                pharmacyForm.put('/settings/pharmacy', { preserveScroll: true });
                break;
            case 'tv':
                tvForm.put('/settings/tv', { preserveScroll: true });
                break;
        }
    };

    // Discard changes
    const handleDiscardCurrentSection = () => {
        switch (activeSection) {
            case 'profile':
                profileForm.reset();
                break;
            case 'sessions':
                sessionForm.reset();
                break;
            case 'billing':
            case 'receipts':
                billingForm.reset();
                break;
            case 'booking':
                onlineForm.reset();
                break;
            case 'pharmacy':
            case 'prescriptions':
                pharmacyForm.reset();
                break;
            case 'tv':
                tvForm.reset();
                break;
        }
    };

    // Unsaved changes browser prompt
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (currentSectionDirty) {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [currentSectionDirty]);

    // Handle address copy
    const handleCopyAddress = () => {
        const addr = profile.address || [profile.address_line, profile.city, profile.district].filter(Boolean).join(', ');
        if (!addr) return;
        navigator.clipboard.writeText(addr);
        setCopiedAddress(true);
        setTimeout(() => setCopiedAddress(false), 2000);
    };

    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        (profile.name ? profile.name + ', ' : '') + (profile.address || 'Sri Lanka')
    )}`;

    const formattedAddressDisplay =
        profile.address || [profile.address_line, profile.city, profile.district, profile.postal_code].filter(Boolean).join(', ');

    return (
        <AuthenticatedLayout>
            <Head title="Settings — MedVisit Clinic Control" />

            <div className="space-y-6 max-w-[1600px] mx-auto pb-24">
                {/* Clean Header with Address Bar */}
                <div className="p-6 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2.5">
                                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                                    Settings
                                </h1>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#1E6FD9]/10 text-[#1E6FD9]">
                                    {profile.subdomain}.medvisit.lk
                                </span>
                                <Link
                                    href="/setup"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-[#1E6FD9]/10 to-[#0E9E8F]/10 hover:from-[#1E6FD9]/20 hover:to-[#0E9E8F]/20 text-[#1E6FD9] dark:text-[#5c9df4] border border-[#1E6FD9]/20 transition-all shadow-xs"
                                >
                                    <Sparkles className="w-3.5 h-3.5 text-[#0E9E8F]" />
                                    <span>Run setup wizard</span>
                                </Link>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Manage how your clinic works in MedVisit.
                            </p>
                        </div>

                        {/* Clinic Address Card (normal font, not monospace, with Copy and Open buttons) */}
                        {formattedAddressDisplay && (
                            <div className="flex items-center gap-2 p-2.5 px-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/70 dark:border-white/5 text-xs max-w-md shrink-0">
                                <MapPin className="w-4 h-4 text-[#0E9E8F] shrink-0" />
                                <span className="text-slate-700 dark:text-slate-300 font-medium truncate" title={formattedAddressDisplay}>
                                    {formattedAddressDisplay}
                                </span>

                                <div className="flex items-center gap-1 shrink-0 ml-auto pl-2 border-l border-slate-200 dark:border-white/10">
                                    <button
                                        type="button"
                                        onClick={handleCopyAddress}
                                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                                        title={copiedAddress ? 'Copied!' : 'Copy address to clipboard'}
                                        aria-label="Copy address to clipboard"
                                    >
                                        {copiedAddress ? (
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                        ) : (
                                            <Copy className="w-3.5 h-3.5" />
                                        )}
                                    </button>

                                    <a
                                        href={mapsUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-1 rounded-lg text-slate-400 hover:text-[#1E6FD9] hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                                        title="Open in Google Maps"
                                        aria-label="Open location in Google Maps"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Body: Desktop Left Nav + Right Content; Mobile List -> Detail */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Left Settings Navigation Rail (Desktop >=1024px) */}
                    <div className="hidden lg:block lg:col-span-3">
                        <div className="sticky top-24 p-4 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-sm max-h-[calc(100vh-8rem)] overflow-y-auto">
                            <SettingsNav activeSection={activeSection} />
                        </div>
                    </div>

                    {/* Mobile Navigation List (Visible only on <1024px when not viewing detail) */}
                    <div className={`lg:hidden col-span-12 ${mobileViewingDetail ? 'hidden' : 'block'}`}>
                        <div className="p-4 rounded-3xl bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-sm">
                            <SettingsNav
                                activeSection={activeSection}
                                isMobileList
                                onSelectSection={(sec) => {
                                    setActiveSection(sec);
                                    setMobileViewingDetail(true);
                                }}
                            />
                        </div>
                    </div>

                    {/* Active Section Content (Desktop + Mobile Detail) */}
                    <div className={`col-span-12 lg:col-span-9 ${!mobileViewingDetail ? 'hidden lg:block' : 'block'}`}>
                        {/* Mobile Top Back Button */}
                        <div className="lg:hidden mb-4">
                            <button
                                type="button"
                                onClick={() => setMobileViewingDetail(false)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:bg-slate-50 transition-colors"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Back to all settings</span>
                            </button>
                        </div>

                        {/* Section Rendering */}
                        {activeSection === 'profile' && (
                            <ProfileSection
                                form={profileForm}
                                profile={profile}
                                districts={districts}
                            />
                        )}

                        {activeSection === 'branding' && (
                            <BrandingSection
                                profile={profile}
                                onLogoUpdated={(newUrl) => {
                                    profileForm.setData('logo_url', newUrl || '');
                                }}
                            />
                        )}

                        {activeSection === 'hours' && <HoursSection profile={profile} />}

                        {activeSection === 'sessions' && (
                            <SessionDefaultsSection
                                form={sessionForm}
                                sessionDefaults={sessionDefaults}
                            />
                        )}

                        {activeSection === 'booking' && (
                            <OnlineBookingSection
                                form={onlineForm}
                                onlineBookingSettings={onlineBookingSettings}
                            />
                        )}

                        {activeSection === 'prescriptions' && (
                            <PrescriptionSection
                                form={pharmacyForm}
                                clinicName={profile.name}
                            />
                        )}

                        {activeSection === 'billing' && (
                            <BillingSection
                                form={billingForm}
                                billingSettings={billingSettings}
                            />
                        )}

                        {activeSection === 'receipts' && (
                            <ReceiptsSection
                                form={billingForm}
                                clinicName={profile.name}
                                clinicAddress={formattedAddressDisplay}
                                clinicPhone={profile.phone}
                            />
                        )}

                        {activeSection === 'pharmacy' && (
                            <PharmacySection
                                form={pharmacyForm}
                                pharmacySettings={pharmacySettings}
                            />
                        )}

                        {activeSection === 'directory' && directorySettings && (
                            <DirectorySection
                                settings={directorySettings}
                                clinicName={profile.name}
                                logoUrl={profile.logo_url}
                            />
                        )}

                        {activeSection === 'tv' && (
                            <TvDisplaySection
                                form={tvForm}
                                tvDevices={tvDevices}
                                availableDoctors={availableDoctors}
                                clinicName={profile.name}
                                subdomain={profile.subdomain}
                            />
                        )}

                        {activeSection === 'audit' && (
                            <AuditSection
                                auditLogs={auditLogs}
                                availableActions={availableActions}
                                filters={filters}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky Unsaved Changes Bar */}
            <UnsavedBar
                show={currentSectionDirty}
                isSaving={isCurrentFormSaving}
                onSave={handleSaveCurrentSection}
                onDiscard={handleDiscardCurrentSection}
            />
        </AuthenticatedLayout>
    );
}
