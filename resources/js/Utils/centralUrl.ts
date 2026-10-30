/**
 * Resolves a central MedVisit URL given a relative path (e.g. '/terms').
 * If invoked on a tenant subdomain (e.g. sivacli.medvisit.localhost:8000 or sivacli.medvisit.lk),
 * it strips the tenant subdomain and targets the central platform domain.
 */
export function getCentralUrl(path: string, fallbackBaseDomain?: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    if (typeof window === 'undefined') {
        const base = fallbackBaseDomain || 'medvisit.lk';
        return `https://${base}${cleanPath}`;
    }

    const { protocol, port, hostname } = window.location;
    const parts = hostname.split('.');

    // Handle tenant subdomains:
    // e.g. "sivacli.medvisit.localhost" -> ["sivacli", "medvisit", "localhost"] -> "medvisit.localhost"
    // e.g. "sivacli.medvisit.lk" -> ["sivacli", "medvisit", "lk"] -> "medvisit.lk"
    let centralHostname = hostname;
    if (parts.length >= 3) {
        centralHostname = parts.slice(1).join('.');
    } else if (parts.length === 2 && parts[1] === 'localhost') {
        centralHostname = fallbackBaseDomain || parts[1];
    } else if (fallbackBaseDomain) {
        centralHostname = fallbackBaseDomain;
    }

    const portSuffix = port && port !== '80' && port !== '443' ? `:${port}` : '';
    return `${protocol}//${centralHostname}${portSuffix}${cleanPath}`;
}

