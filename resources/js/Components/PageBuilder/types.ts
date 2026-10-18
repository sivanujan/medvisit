import type { SiteKit } from './lib/kit';
import type { MediaAsset } from '@/Components/PageBuilder/MediaLibraryModal';
import type { HeaderConfig, HeaderMenuItem } from '@/Components/Public/PublicSiteHeader';
import type { FooterConfig } from '@/Components/Public/PublicSiteFooter';

export type { HeaderConfig, FooterConfig };
export type MenuItem = HeaderMenuItem;

// GrapesJS is declared as `any` in resources/js/types/grapesjs.d.ts
export type Editor = any;
export type Component = any;

export type DeviceName = 'Desktop' | 'Tablet' | 'Mobile';
export type SaveState = 'ok' | 'error' | null;
export type LeftPanelTabName = 'elements' | 'navigator' | 'header' | 'footer' | 'settings';
export type InspectorTabName = 'content' | 'style' | 'advanced';

export interface TabBaseProps {
    editor: Editor | null;
    selectedComponent: Component | null;
}

export interface InspectorTabProps extends TabBaseProps {
    setIsDirty: (dirty: boolean) => void;
}

export interface DoctorItem {
    id: number;
    name: string;
    specialty: string;
    slmc_number?: string;
    bio?: string;
    photo_url?: string;
    doctor_fee?: number;
    clinic_fee?: number;
}

export interface SessionItem {
    id: number;
    doctor?: {
        name: string;
        specialty: string;
    };
    session_date: string;
    start_time: string;
    room_number?: string;
    max_tokens?: number;
    doctor_fee?: number;
    clinic_fee?: number;
}

export interface Revision {
    id: number;
    version_number: number;
    summary: string;
    user_name: string;
    created_at_formatted: string;
    created_at_relative: string;
}

export interface BuilderPageProps {
    tenant: {
        id: string;
        name: string;
        subdomain: string;
        phone?: string;
        address?: string;
        logo_url?: string | null;
        theme?: string;
    };
    page: {
        id: number;
        slug: string;
        title: string;
        schema_version: number;
        content_json?: any;
        html?: string | null;
        css?: string | null;
        is_published: boolean;
        published_at?: string | null;
        seo_title?: string | null;
        seo_description?: string | null;
        theme_preset?: string;
        is_homepage?: boolean;
        public_url?: string;
    };
    revisions: Revision[];
    mediaAssets: MediaAsset[];
    doctors: DoctorItem[];
    upcomingSessions: SessionItem[];
    headerConfig?: HeaderConfig | null;
    footerConfig?: FooterConfig | null;
    siteKit?: SiteKit | null;
}

export interface PageSummary {
    id: number;
    title: string;
    slug: string;
    url: string;
    is_homepage: boolean;
    is_published: boolean;
    has_unpublished_changes: boolean;
    updated_at: string | null;
    sort_order: number;
    seo_title: string | null;
    seo_description: string | null;
}
