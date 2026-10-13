export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string | null;
    tenant_id?: string | null;
    roles?: Array<{ name: string }> | string[];
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
    tenant?: {
        id: string;
        name: string;
        subdomain: string;
        status?: string;
        phone?: string;
        address?: string;
    } | null;
    flash?: {
        status?: string | null;
        success?: string | null;
        error?: string | null;
    };
};
