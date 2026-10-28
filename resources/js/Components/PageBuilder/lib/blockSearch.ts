// Widget library search: matches a block's visible label text and its category name.
function visibleText(html: string): string {
    return (html || '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

// Every word of the query must appear; an empty query matches everything.
export function matchesBlockQuery(labelHtml: string, category: string, query: string): boolean {
    const words = (query || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return true;
    const haystack = `${visibleText(labelHtml)} ${(category || '').toLowerCase()}`;
    return words.every((w) => haystack.includes(w));
}
