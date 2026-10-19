// Works out which widget a canvas element is, so the inspector can show the matching Content panel.
export type WidgetKind =
    | 'container'
    | 'heading'
    | 'text'
    | 'button'
    | 'image'
    | 'video'
    | 'map'
    | 'icon-list'
    | 'faq'
    | 'icon'
    | 'doctors'
    | 'sessions'
    | 'book-token'
    | 'announcement'
    | 'divider'
    | 'spacer'
    | 'icon-box'
    | 'image-box'
    | 'alert'
    | 'star-rating'
    | 'tabs'
    | 'social-icons'
    | 'counter'
    | 'progress-bar'
    | 'testimonial'
    | 'gallery'
    | 'cta'
    | 'price-list'
    | 'opening-hours'
    | 'whatsapp'
    | 'generic';

export type WidgetInfo = {
    tagName: string;
    classes: string[];
    attributes: Record<string, string>;
    childCount: number;
};

export const WIDGET_LABELS: Record<WidgetKind, string> = {
    container: 'Container',
    heading: 'Heading',
    text: 'Text Editor',
    button: 'Button',
    image: 'Image',
    video: 'Video',
    map: 'Google Map',
    'icon-list': 'Icon List',
    faq: 'FAQ Accordion',
    icon: 'Icon',
    doctors: 'Doctors List',
    sessions: 'Sessions This Week',
    'book-token': 'Book Token Box',
    announcement: 'Announcement',
    divider: 'Divider',
    spacer: 'Spacer',
    'icon-box': 'Icon Box',
    'image-box': 'Image Box',
    alert: 'Alert',
    'star-rating': 'Star Rating',
    tabs: 'Tabs',
    'social-icons': 'Social Icons',
    counter: 'Counter',
    'progress-bar': 'Progress Bar',
    testimonial: 'Testimonial',
    gallery: 'Image Gallery',
    cta: 'Call to Action',
    'price-list': 'Price List',
    'opening-hours': 'Opening Hours',
    whatsapp: 'WhatsApp / Call',
    generic: 'Element',
};

const LEGACY_WIDGETS: Record<string, WidgetKind> = {
    'doctors-list': 'doctors',
    'channeling-sessions': 'sessions',
    'book-token-box': 'book-token',
    'announcement-banner': 'announcement',
};

const CONTAINER_TAGS = ['section', 'header', 'footer', 'article', 'aside', 'main', 'nav'];

function isWidgetKind(value: string): value is WidgetKind {
    return Object.prototype.hasOwnProperty.call(WIDGET_LABELS, value);
}

function looksLikeButton(info: WidgetInfo): boolean {
    if (info.classes.some((c) => /(^|-)(btn|button)(-|$)/i.test(c))) return true;
    const style = (info.attributes.style || '').toLowerCase();
    return /background/.test(style) && /padding/.test(style);
}

export function detectWidgetKind(info: WidgetInfo): WidgetKind {
    const marker = info.attributes['data-mv-widget'];
    if (marker && isWidgetKind(marker)) return marker;

    const legacy = LEGACY_WIDGETS[info.attributes['data-widget'] || ''];
    if (legacy) return legacy;

    const tag = (info.tagName || '').toLowerCase();
    const src = (info.attributes.src || '').toLowerCase();

    if (/^h[1-6]$/.test(tag)) return 'heading';
    if (tag === 'p') return 'text';
    if (tag === 'button') return 'button';
    if (tag === 'a') return looksLikeButton(info) ? 'button' : 'text';
    if (tag === 'img') return 'image';
    if (tag === 'iframe') {
        if (/youtube\.com|youtu\.be|vimeo\.com/.test(src)) return 'video';
        if (/google\.[a-z.]+\/maps|maps\.google\./.test(src)) return 'map';
        return 'generic';
    }
    if (tag === 'ul' || tag === 'ol') return 'icon-list';
    if (tag === 'details') return 'faq';
    if (tag === 'svg') return 'icon';
    if (CONTAINER_TAGS.includes(tag)) return 'container';
    if (tag === 'div' && info.childCount > 0) return 'container';
    return 'generic';
}
