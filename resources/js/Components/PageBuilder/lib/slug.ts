export function slugify(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60)
        .replace(/-+$/g, '');
}

export function isValidSlug(slug: string): boolean {
    return slug.length <= 60 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
