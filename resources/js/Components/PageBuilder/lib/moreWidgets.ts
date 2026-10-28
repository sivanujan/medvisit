import { escapeHtml } from './contentHelpers.ts';

// Batch A widgets: block markup (with data-mv-field markers for in-place editing) and link helpers.

export type MoreWidgetKind =
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
    | 'whatsapp';

const TEAL = '#0E9E8F';

// Sri Lankan local numbers (leading 0) become +94; other numbers keep their country code.
function internationalDigits(number: string): string {
    const digits = (number || '').replace(/\D/g, '');
    return digits.startsWith('0') ? `94${digits.slice(1)}` : digits;
}

export function whatsappHref(number: string, message: string): string {
    const base = `https://wa.me/${internationalDigits(number)}`;
    return message.trim() ? `${base}?text=${encodeURIComponent(message.trim())}` : base;
}

export function telHref(number: string): string {
    return `tel:+${internationalDigits(number)}`;
}

export function starsHtml(rating: number, max = 5): string {
    const filled = Math.max(0, Math.min(max, Math.round(rating)));
    const star = (on: boolean) => `<span style="color: ${on ? '#f59e0b' : '#cbd5e1'};">${on ? '★' : '☆'}</span>`;
    return Array.from({ length: max }, (_, i) => star(i < filled)).join('');
}

export type SocialNetwork = { id: string; label: string; short: string; color: string };
export const SOCIAL_NETWORKS: SocialNetwork[] = [
    { id: 'facebook', label: 'Facebook', short: 'f', color: '#1877f2' },
    { id: 'instagram', label: 'Instagram', short: 'IG', color: '#d62976' },
    { id: 'youtube', label: 'YouTube', short: '▶', color: '#ff0000' },
    { id: 'tiktok', label: 'TikTok', short: '♪', color: '#111827' },
    { id: 'linkedin', label: 'LinkedIn', short: 'in', color: '#0a66c2' },
    { id: 'x', label: 'X', short: 'X', color: '#111827' },
];

export function socialLinkHtml(network: SocialNetwork, url: string): string {
    return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener" data-mv-social="${network.id}" title="${escapeHtml(network.label)}" style="display: inline-flex; width: 40px; height: 40px; border-radius: 9999px; background: ${network.color}; color: #ffffff; align-items: center; justify-content: center; font-weight: 800; font-size: 14px; text-decoration: none;">${escapeHtml(network.short)}</a>`;
}

export function galleryImageHtml(src: string, alt = ''): string {
    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" data-mv-gallery-item style="width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 12px;" />`;
}

const SAMPLE_IMAGE = 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&auto=format&fit=crop&q=80';
const ICON_PLUS = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg>`;

const BLOCKS: Record<MoreWidgetKind, () => string> = {
    divider: () =>
        `<div data-mv-widget="divider" style="padding: 16px 0;"><hr data-mv-field="line" style="border: 0; border-top: 1px solid #e2e8f0; width: 100%; margin: 0 auto;" /></div>`,
    spacer: () => `<div data-mv-widget="spacer" style="height: 48px;"></div>`,
    'icon-box': () =>
        `<div data-mv-widget="icon-box" style="padding: 24px; text-align: center; border-radius: 16px; background: #ffffff; border: 1px solid #e2e8f0;">
<div data-mv-field="icon" style="display: inline-flex; width: 56px; height: 56px; border-radius: 14px; background: #ecfdf5; color: ${TEAL}; align-items: center; justify-content: center; margin-bottom: 12px;">${ICON_PLUS}</div>
<h3 data-mv-field="title" style="margin: 0 0 8px 0; font-size: 1.15rem; font-weight: 700; color: #0f172a;">Specialist Care</h3>
<p data-mv-field="text" style="margin: 0; color: #64748b; font-size: 0.9rem;">Consult experienced specialists with digital token booking.</p>
</div>`,
    'image-box': () =>
        `<div data-mv-widget="image-box" style="border-radius: 16px; overflow: hidden; background: #ffffff; border: 1px solid #e2e8f0;">
<img data-mv-field="image" src="${SAMPLE_IMAGE}" alt="Clinic" style="width: 100%; height: 200px; object-fit: cover; display: block;" />
<div style="padding: 20px;"><h3 data-mv-field="title" style="margin: 0 0 8px 0; font-size: 1.15rem; font-weight: 700; color: #0f172a;">Modern Facilities</h3>
<p data-mv-field="text" style="margin: 0; color: #64748b; font-size: 0.9rem;">Clean consultation rooms and on-site diagnostics.</p></div>
</div>`,
    alert: () =>
        `<div data-mv-widget="alert" data-mv-tone="info" style="padding: 14px 18px; border-radius: 12px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af;">
<strong data-mv-field="title" style="display: block; margin-bottom: 2px;">Please note</strong>
<span data-mv-field="text">Bring your previous reports and prescriptions to your consultation.</span>
</div>`,
    'star-rating': () =>
        `<div data-mv-widget="star-rating" data-mv-rating="5" style="display: flex; align-items: center; gap: 8px;">
<span data-mv-field="stars" style="font-size: 1.4rem; letter-spacing: 2px;">${starsHtml(5)}</span>
<span data-mv-field="label" style="color: #475569; font-size: 0.9rem; font-weight: 600;">Rated 5/5 by our patients</span>
</div>`,
    tabs: () => {
        const tabs = [
            ['Consultations', 'Specialist channeling with live token tracking.'],
            ['Laboratory', 'Blood tests and reports, most results on the same day.'],
            ['Pharmacy', 'Prescriptions filled at our in-house pharmacy.'],
        ];
        const buttons = tabs
            .map(
                ([t], i) =>
                    `<button type="button" data-mv-tab-button="${i}" style="padding: 10px 16px; border: 0; border-bottom: 2px solid ${i === 0 ? TEAL : 'transparent'}; background: transparent; font-weight: 700; color: ${i === 0 ? TEAL : '#475569'}; cursor: pointer;">${t}</button>`,
            )
            .join('');
        const panels = tabs
            .map(
                ([, body], i) =>
                    `<div data-mv-tab-panel="${i}" style="padding: 16px 4px; color: #334155;${i === 0 ? '' : ' display: none;'}"><p style="margin: 0;">${body}</p></div>`,
            )
            .join('');
        return `<div data-mv-widget="tabs" style="margin: 16px 0;"><div role="tablist" style="display: flex; gap: 4px; border-bottom: 1px solid #e2e8f0; flex-wrap: wrap;">${buttons}</div>${panels}</div>`;
    },
    'social-icons': () =>
        `<div data-mv-widget="social-icons" style="display: flex; gap: 10px; flex-wrap: wrap;">${SOCIAL_NETWORKS.slice(0, 3)
            .map((n) => socialLinkHtml(n, '#'))
            .join('')}</div>`,
    counter: () =>
        `<div data-mv-widget="counter" style="text-align: center; padding: 16px;">
<div style="font-size: 2.5rem; font-weight: 800; color: ${TEAL};"><span data-mv-count="25000" data-mv-field="number">25000</span><span data-mv-field="suffix">+</span></div>
<div data-mv-field="label" style="color: #475569; font-weight: 600;">Patients served</div>
</div>`,
    'progress-bar': () =>
        `<div data-mv-widget="progress-bar" data-mv-percent="85" style="margin: 12px 0;">
<div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: 700; color: #334155; margin-bottom: 6px;"><span data-mv-field="label">Patient satisfaction</span><span data-mv-field="percent-text">85%</span></div>
<div style="height: 10px; border-radius: 9999px; background: #e2e8f0; overflow: hidden;"><div data-mv-field="bar" style="height: 100%; width: 85%; background: ${TEAL}; border-radius: 9999px;"></div></div>
</div>`,
    testimonial: () =>
        `<figure data-mv-widget="testimonial" style="margin: 0; padding: 24px; border-radius: 16px; background: #ffffff; border: 1px solid #e2e8f0;">
<div data-mv-field="stars" style="font-size: 1.1rem; margin-bottom: 8px;">${starsHtml(5)}</div>
<blockquote data-mv-field="quote" style="margin: 0 0 16px 0; color: #334155; font-size: 1rem; line-height: 1.6;">The doctors were caring and the token system meant no waiting in the lobby.</blockquote>
<figcaption style="display: flex; align-items: center; gap: 12px;"><img data-mv-field="image" src="${SAMPLE_IMAGE}" alt="Patient" style="width: 44px; height: 44px; border-radius: 9999px; object-fit: cover;" />
<div><div data-mv-field="name" style="font-weight: 700; color: #0f172a;">Nimali Perera</div><div data-mv-field="role" style="font-size: 0.8rem; color: #64748b;">Patient, Colombo</div></div></figcaption>
</figure>`,
    gallery: () =>
        `<div data-mv-widget="gallery" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">${[1, 2, 3, 4, 5, 6]
            .map(() => galleryImageHtml(SAMPLE_IMAGE, 'Clinic photo'))
            .join('')}</div>`,
    cta: () =>
        `<div data-mv-widget="cta" style="padding: 40px 24px; border-radius: 20px; background: linear-gradient(135deg, ${TEAL} 0%, #087066 100%); color: #ffffff; text-align: center;">
<h2 data-mv-field="title" style="margin: 0 0 8px 0; font-size: 1.8rem; font-weight: 800;">Need to see a specialist?</h2>
<p data-mv-field="text" style="margin: 0 0 20px 0; opacity: 0.9;">Reserve your channeling token online in under a minute.</p>
<a data-mv-field="button" href="/book" style="display: inline-block; padding: 12px 28px; border-radius: 12px; background: #ffffff; color: ${TEAL}; font-weight: 800; text-decoration: none;">Book a token</a>
</div>`,
    'price-list': () =>
        `<div data-mv-widget="price-list" style="display: flex; flex-direction: column; gap: 14px;">${[
            ['General consultation', 'Rs. 1,500', 'Visit with our family physician.'],
            ['Specialist channeling', 'Rs. 3,000', 'Includes the clinic fee.'],
            ['Full blood count', 'Rs. 950', 'Results on the same day.'],
        ]
            .map(
                ([name, price, desc]) =>
                    `<div data-mv-price-item style="display: flex; justify-content: space-between; gap: 16px; padding-bottom: 12px; border-bottom: 1px dashed #cbd5e1;"><div><div data-mv-field="name" style="font-weight: 700; color: #0f172a;">${name}</div><div data-mv-field="description" style="font-size: 0.85rem; color: #64748b;">${desc}</div></div><div data-mv-field="price" style="font-weight: 800; color: ${TEAL}; white-space: nowrap;">${price}</div></div>`,
            )
            .join('')}</div>`,
    'opening-hours': () =>
        `<div data-mv-widget="opening-hours" style="border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; background: #ffffff;">${[
            ['Monday – Friday', '8:00 AM – 9:00 PM'],
            ['Saturday', '8:00 AM – 6:00 PM'],
            ['Sunday & Poya days', '9:00 AM – 1:00 PM'],
        ]
            .map(
                ([day, time]) =>
                    `<div data-mv-hours-item style="display: flex; justify-content: space-between; gap: 16px; padding: 12px 18px; border-bottom: 1px solid #f1f5f9;"><span data-mv-field="day" style="font-weight: 600; color: #0f172a;">${day}</span><span data-mv-field="time" style="color: #475569;">${time}</span></div>`,
            )
            .join('')}</div>`,
    whatsapp: () =>
        `<a data-mv-widget="whatsapp" data-mv-mode="whatsapp" href="${whatsappHref('0771234567', 'Hello, I would like to book an appointment')}" target="_blank" rel="noopener" style="display: inline-flex; align-items: center; gap: 8px; padding: 12px 22px; border-radius: 9999px; background: #25d366; color: #ffffff; font-weight: 800; text-decoration: none;"><span data-mv-field="label">Chat on WhatsApp</span></a>`,
};

export const MORE_WIDGETS: { kind: MoreWidgetKind; label: string; hint: string; emoji: string }[] = [
    { kind: 'divider', label: 'Divider', hint: 'Horizontal line', emoji: '➖' },
    { kind: 'spacer', label: 'Spacer', hint: 'Empty space', emoji: '↕️' },
    { kind: 'icon-box', label: 'Icon Box', hint: 'Icon + title + text', emoji: '🔷' },
    { kind: 'image-box', label: 'Image Box', hint: 'Image + title + text', emoji: '🖼️' },
    { kind: 'alert', label: 'Alert', hint: 'Notice / message', emoji: '⚠️' },
    { kind: 'star-rating', label: 'Star Rating', hint: 'Stars + label', emoji: '⭐' },
    { kind: 'tabs', label: 'Tabs', hint: 'Tabbed content', emoji: '🗂️' },
    { kind: 'social-icons', label: 'Social Icons', hint: 'Facebook, YouTube…', emoji: '🔗' },
    { kind: 'counter', label: 'Counter', hint: 'Animated number', emoji: '🔢' },
    { kind: 'progress-bar', label: 'Progress Bar', hint: 'Percentage bar', emoji: '📊' },
    { kind: 'testimonial', label: 'Testimonial', hint: 'Patient review', emoji: '💬' },
    { kind: 'gallery', label: 'Image Gallery', hint: 'Photo grid', emoji: '🏞️' },
    { kind: 'cta', label: 'Call to Action', hint: 'Title + button box', emoji: '📣' },
    { kind: 'price-list', label: 'Price List', hint: 'Services & fees', emoji: '💲' },
    { kind: 'opening-hours', label: 'Opening Hours', hint: 'Days & times', emoji: '🕒' },
    { kind: 'whatsapp', label: 'WhatsApp / Call', hint: 'Chat or hotline button', emoji: '📞' },
];

export function moreWidgetHtml(kind: MoreWidgetKind): string {
    return BLOCKS[kind]();
}
