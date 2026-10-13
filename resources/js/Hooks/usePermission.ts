import { usePage } from '@inertiajs/react';

interface AuthUser {
    id: number;
    name: string;
    email: string;
    tenant_id?: string | null;
    roles?: Array<{ name: string }> | string[];
    permissions?: Array<{ name: string }> | string[];
}

interface SharedPageProps {
    auth: {
        user: AuthUser;
    };
    [key: string]: unknown;
}

export function usePermission() {
    const page = usePage<SharedPageProps>();
    const user = page.props?.auth?.user;

    const userRoles: string[] = Array.isArray(user?.roles)
        ? user.roles.map((r) => (typeof r === 'string' ? r : r.name))
        : [];

    const userPermissions: string[] = Array.isArray(user?.permissions)
        ? user.permissions.map((p) => (typeof p === 'string' ? p : p.name))
        : [];

    const hasRole = (role: string | string[]): boolean => {
        if (!user) return false;
        if (userRoles.includes('super_admin')) return true;

        if (Array.isArray(role)) {
            return role.some((r) => userRoles.includes(r));
        }
        return userRoles.includes(role);
    };

    const can = (permission: string | string[]): boolean => {
        if (!user) return false;
        if (userRoles.includes('super_admin')) return true;

        if (Array.isArray(permission)) {
            return permission.some((p) => userPermissions.includes(p));
        }
        return userPermissions.includes(permission);
    };

    return {
        user,
        roles: userRoles,
        permissions: userPermissions,
        hasRole,
        can,
        isSuperAdmin: userRoles.includes('super_admin'),
        isClinicAdmin: userRoles.includes('clinic_admin') || userRoles.includes('super_admin'),
        isDoctor: userRoles.includes('doctor'),
        isReceptionist: userRoles.includes('receptionist'),
    };
}

export default usePermission;
