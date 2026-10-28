export type ConversationStatus = 'ai' | 'waiting_human' | 'human_active' | 'closed';
export type SenderType = 'visitor' | 'user' | 'ai' | 'admin' | 'system';
export type SupportChannel = 'website' | 'dashboard';

export interface SupportMessageItem {
    id: number;
    conversation_id: number;
    sender_type: SenderType;
    sender_id?: number | null;
    sender_name: string;
    body: string;
    read_at?: string | null;
    created_at: string;
}

export interface SupportConversationItem {
    id: number;
    public_id: string;
    channel: SupportChannel;
    status: ConversationStatus;
    visitor_name?: string | null;
    visitor_email?: string | null;
    visitor_phone?: string | null;
    clinic_name?: string | null;
    clinic_subdomain?: string | null;
    assigned_admin_name?: string | null;
    assigned_admin_id?: number | null;
    last_message?: {
        body: string;
        sender_type: SenderType;
        created_at: string;
    } | null;
    last_message_at?: string | null;
    waiting_seconds?: number | null;
    rating?: number | null;
    rating_comment?: string | null;
    closed_at?: string | null;
}

export interface SupportCannedReplyItem {
    id: number;
    title: string;
    body: string;
}

export interface SupportStatusResponse {
    is_online: boolean;
    business_hours_text: string;
    response_time_text: string;
    offline_message: string;
    active_conversation?: {
        public_id: string;
        status: ConversationStatus;
        last_message_at?: string | null;
    } | null;
}

export interface ClinicContext {
    type: 'clinic';
    clinic_name: string;
    subdomain: string;
    subdomain_url: string;
    plan: string;
    status: string;
    created_date: string;
    last_payment_date: string;
    last_payment_amount: string;
    user_role: string;
    user_name: string;
    user_email: string;
    user_phone: string;
}

export interface GuestContext {
    type: 'guest';
    visitor_name: string;
    visitor_email: string;
    visitor_phone: string;
    started_page: string;
    user_agent: string;
    colombo_time: string;
}

export type ConversationContext = ClinicContext | GuestContext;
