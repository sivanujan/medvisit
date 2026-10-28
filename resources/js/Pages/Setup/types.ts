export interface SetupTenantInfo {
    id: string;
    name: string;
    subdomain: string;
    plan_slug: string;
    plan_name: string;
    plan_allows_pharmacy: boolean;
    subscription_renews_on: string;
    setup_step: number;
    setup_completed: boolean;
    setup_completed_at?: string | null;
    in_grace: boolean;
    grace_days_remaining: number;
    doctors_count: number;
}

export interface SetupDaySchedule {
    day: string;
    open: boolean;
    start: string;
    end: string;
}

export interface SetupFormData {
    // Step 2: Logo & Brand
    logo_url?: string | null;
    logo_png_url?: string | null;
    favicon_url?: string | null;
    brand_color: string;
    theme: string;
    use_initials?: boolean;

    // Step 3: Clinic Photo
    cover_photo_url?: string | null;

    // Step 4: Location & Contact
    address_line: string;
    city: string;
    district: string;
    postal_code: string;
    latitude: number;
    longitude: number;
    has_pinned: boolean;
    phone: string;
    whatsapp: string;
    email: string;

    // Step 5: Opening Hours
    opening_hours: Record<string, SetupDaySchedule>;
    opening_hours_note: string;

    // Step 6: Services
    services: string[];

    // Step 7: Online Booking
    online_booking_enabled: boolean;
    max_active_tokens_per_phone: number;
    require_staff_approval: boolean;
    require_phone_verification: boolean;

    // Step 8: Pharmacy
    pharmacy_enabled: boolean;
    stock_reduction_mode: 'dispense' | 'bill';

    // Step 9: Printing
    print_enabled: boolean;
    print_receipt_format: '80mm' | 'a4';
    receipt_prefix: string;
    print_token_slip_enabled: boolean;
    print_token_slip_autoprint: boolean;
    prescription_print_enabled: boolean;
    prescription_print_language: 'en' | 'si' | 'ta';
    prescription_paper_size: 'a5' | 'a4';
    print_header_show_logo: boolean;
    print_header_show_address: boolean;
    registration_number: string;

    // Step 10: Directory
    directory_enabled: boolean;
    directory_consented: boolean;
    directory_consented_at?: string | null;
}

export interface PresetService {
    id: string;
    label: string;
}

export interface SetupPageProps {
    tenant: SetupTenantInfo;
    form: SetupFormData;
    districts: string[];
    preset_services: PresetService[];
}

export interface WizardStepDef {
    id: number;
    slug: string;
    number: number | null; // null for Welcome & Celebration bookends
    title: string;
    shortTitle: string;
    description: string;
    icon: string;
    optional?: boolean;
}
