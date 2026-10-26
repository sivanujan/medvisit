import type { useForm } from '@inertiajs/react';

export type FormInstance<T extends Record<string, any>> = ReturnType<typeof useForm<T>>;

export interface AuditLogItem {
    id: string;
    action: string;
    resource_type?: string;
    resource_id?: string;
    metadata?: Record<string, any>;
    ip_address?: string;
    user_name: string;
    user_email?: string;
    created_at: string;
    created_at_relative: string;
}

export interface ClinicProfileData {
    name: string;
    subdomain: string;
    phone: string;
    address: string;
    address_line?: string;
    city?: string;
    district?: string;
    postal_code?: string;
    legacy_address?: string;
    registration_number: string;
    logo_url: string;
    logo_png_url?: string;
    favicon_url?: string;
    plan: string;
    status: string;
    districts?: string[];
}

export interface SessionDefaultsData {
    default_avg_consultation_minutes: number;
    default_max_tokens: number;
    cancellation_window_hours: number;
    auto_generate_days: number;
}

export interface BillingSettingsData {
    billing_timing: 'pay_at_issue' | 'pay_after_consult' | string;
    receipt_prefix: string;
    tax_percentage: number;
    accepted_methods: string[];
    show_clinic_share_to_doctors?: boolean;
    currency: string;
}

export interface OnlineBookingSettingsData {
    online_booking_enabled: boolean;
    max_active_tokens_per_phone: number;
    require_staff_approval: boolean;
    require_phone_verification: boolean;
    phone_verification_methods: string[];
    platform_available_channels: string[];
}

export interface PharmacySettingsData {
    pharmacy_enabled: boolean;
    default_reorder_level: number;
    expiring_soon_threshold_days: number;
    stock_reduction_mode?: 'dispense' | 'consultation';
    prescription_print_enabled?: boolean;
    prescription_print_language?: 'en' | 'ta' | 'si';
    prescription_print_show_doctor_reg?: boolean;
    prescription_print_show_diagnosis?: boolean;
}

export interface DirectorySettingsData {
    enabled: boolean;
    consented_at: string | null;
    district: string;
    city: string;
    latitude: number;
    longitude: number;
    has_pinned: boolean;
    description: string;
    services: string[];
    active_doctors_count: number;
    missing_fields: string[];
    preview_url: string;
    districts: string[];
    fixed_services: string[];
    is_owner: boolean;
}

export type SettingsSectionKey =
    | 'profile'
    | 'branding'
    | 'hours'
    | 'sessions'
    | 'booking'
    | 'prescriptions'
    | 'tv'
    | 'billing'
    | 'receipts'
    | 'pharmacy'
    | 'directory'
    | 'audit';

export interface TvSettingsData {
    name_display_mode: 'token_only' | 'initial_last' | 'first_only' | 'full_name';
    languages: ('en' | 'ta' | 'si')[];
    chime_enabled: boolean;
    voice_language: 'off' | 'en' | 'ta' | 'si';
    ticker_text: string;
    theme: 'dark' | 'light';
    reduced_motion: boolean;
}

export interface TvDeviceItem {
    id: number;
    name: string;
    doctor_ids: number[] | null;
    last_seen_at: string;
    last_seen_timestamp?: number;
    is_online: boolean;
    is_revoked: boolean;
    revoked_at?: string;
    created_at: string;
}

export interface AvailableDoctorItem {
    id: number;
    name: string;
    specialty?: string;
}

export interface SettingsPageProps {
    activeSection?: SettingsSectionKey;
    profile: ClinicProfileData;
    sessionDefaults: SessionDefaultsData;
    billingSettings: BillingSettingsData;
    onlineBookingSettings: OnlineBookingSettingsData;
    pharmacySettings?: PharmacySettingsData;
    directorySettings?: DirectorySettingsData;
    tvSettings?: TvSettingsData;
    tvDevices?: TvDeviceItem[];
    availableDoctors?: AvailableDoctorItem[];
    auditLogs: AuditLogItem[];
    availableActions: string[];
    districts?: string[];
    filters: {
        action: string;
        search: string;
        date: string;
    };
    flash?: {
        success?: string;
        error?: string;
    };
}
