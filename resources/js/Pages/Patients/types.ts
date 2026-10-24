export interface PatientItem {
    id: number;
    formatted_id: string;
    name: string;
    phone_normalized: string | null;
    phone_display: string;
    phone_raw: string;
    nic_masked: string;
    email: string | null;
    gender: string;
    date_of_birth: string | null;
    age: number | null;
    district: string;
    city: string;
    location_display: string;
    address: string | null;
    allergies: string | null;
    notes: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    tokens_count: number;
    visits_formatted: string;
    last_visit: string;
    last_visit_timestamp: string | null;
    has_visits: boolean;
    is_possible_duplicate: boolean;
    duplicate_reason: string | null;
    created_at: string;
}

export interface HistoryVisit {
    id: number;
    token_number: number;
    doctor_name: string;
    doctor_specialty: string;
    session_date: string;
    room_number: string;
    status: string;
    booked_via: string;
    estimated_time: string;
    receipt_number: string | null;
    bill_amount: number | null;
    bill_amount_formatted: string;
    payment_status: string;
    created_at_formatted: string;
}

export interface HistoryUpcomingToken {
    id: number;
    token_number: number;
    doctor_name: string;
    doctor_specialty: string;
    session_date: string;
    start_time: string;
    room_number: string;
    status: string;
    estimated_time: string;
    total_fee_formatted: string;
    payment_status: string;
}

export interface HistoryPrescription {
    id: number;
    doctor_name: string;
    doctor_specialty: string;
    date: string;
    diagnosis: string | null;
    notes: string | null;
    items_count: number;
    items_summary: string[];
    print_url: string;
}

export interface HistoryBill {
    id: number;
    receipt_number: string;
    token_number: number | null;
    amount_formatted: string;
    payment_method: string;
    payment_status: string;
    date: string;
}

export interface DuplicatePatientMatch {
    id: number;
    name: string;
    phone_display: string;
    nic_masked: string;
    match_reason: string;
}

export interface PatientHistoryData {
    patient: {
        id: number;
        formatted_id: string;
        name: string;
        phone_normalized: string | null;
        phone_display: string;
        nic_masked: string;
        email: string | null;
        gender: string;
        date_of_birth: string | null;
        age: number | null;
        district: string;
        city: string;
        location_display: string;
        address: string | null;
        allergies: string | null;
        notes: string | null;
        emergency_contact_name: string | null;
        emergency_contact_phone: string | null;
        tokens_count: number;
        created_at: string;
    };
    visits: HistoryVisit[];
    upcoming_tokens: HistoryUpcomingToken[];
    prescriptions: HistoryPrescription[];
    bills: HistoryBill[];
    duplicates: DuplicatePatientMatch[];
    permissions: {
        can_view_prescriptions: boolean;
        can_reveal_nic: boolean;
    };
}

export interface InUseDistrict {
    name: string;
    count: number;
}

export interface DirectoryStats {
    total_patients: number;
    new_this_month: number;
    visited_today: number;
}

export interface UserPermissions {
    can_reveal_nic: boolean;
    can_view_prescriptions: boolean;
    can_export: boolean;
    role: string;
}

export interface DirectoryFilters {
    search: string;
    district: string;
    gender: string;
    age_range: string;
    last_visit: string;
    doctor_id: string;
    sort: string;
    per_page: number;
}
