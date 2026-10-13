/**
 * Extract clean display first name, handling medical and professional titles.
 * E.g.: "Dr. John Silva" -> "John"
 *       "Prof. Aruni Perera" -> "Aruni"
 *       "Sivanujan K." -> "Sivanujan"
 */
export function getFirstName(name?: string | null, fallback = 'User'): string {
    if (!name || typeof name !== 'string') {
        return fallback;
    }

    const parts = name.trim().split(/\s+/);
    if (!parts.length || !parts[0]) {
        return fallback;
    }

    const titles = new Set([
        'dr.', 'dr',
        'prof.', 'prof',
        'mr.', 'mr',
        'mrs.', 'mrs',
        'ms.', 'ms',
        'miss',
        'rev.', 'rev',
    ]);

    const firstName = parts.find((part) => !titles.has(part.toLowerCase()));

    return firstName || parts[0] || fallback;
}

export function getAvatarInitial(name?: string | null, fallback = 'M'): string {
    const first = getFirstName(name, '');
    if (first && first.length > 0) {
        return first.charAt(0).toUpperCase();
    }
    if (name && typeof name === 'string' && name.trim().length > 0) {
        return name.trim().charAt(0).toUpperCase();
    }
    return fallback;
}

export default getFirstName;
