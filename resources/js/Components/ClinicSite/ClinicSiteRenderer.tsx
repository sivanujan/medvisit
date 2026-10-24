import React, { CSSProperties, ReactNode, useEffect, useState } from 'react';
import { Link } from '@inertiajs/react';
import { CalendarDays, ChevronDown, Clock, Mail, MapPin, MessageCircle, Phone, Stethoscope } from 'lucide-react';
import { brandTokens, resolvePrimary } from './color';
import {
    DAY_LABELS,
    DayHours,
    SiteClinic,
    SiteDoctor,
    SiteLook,
    SiteSection,
    SiteSession,
    SiteStat,
    colomboWeekday,
    formatTime,
    openNow,
    sectionHasContent,
} from './types';
import './clinic-site.css';

export interface ClinicSiteProps {
    clinic: SiteClinic;
    sections: SiteSection[];
    look: SiteLook;
    stats: SiteStat[];
    doctors: SiteDoctor[];
    sessions: SiteSession[];
    /** Editor preview: empty sections show a placeholder instead of disappearing. */
    preview?: boolean;
    embed?: boolean;
    selectedId?: string | null;
    flashId?: string | null;
    /** Live site: ids the server decided have content. */
    visibleIds?: string[];
}

const FONT_STACKS: Record<SiteLook['font'], { body: string; head: string }> = {
    poppins: { body: 'Poppins', head: 'Poppins' },
    nunito: { body: 'Nunito', head: 'Nunito' },
    serif: { body: 'Poppins', head: "'Source Serif 4'" },
};

export function siteFontsHref(font: SiteLook['font']): string | null {
    if (font === 'nunito') return 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700&display=swap';
    if (font === 'serif') return 'https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&display=swap';
    return null;
}

export function siteStyle(look: SiteLook): CSSProperties {
    const primary = resolvePrimary(look);
    const t = brandTokens(primary, look.mode);
    const fonts = FONT_STACKS[look.font] ?? FONT_STACKS.poppins;
    return {
        '--cs-primary': t.primary,
        '--cs-on-primary': t.onPrimary,
        '--cs-primary-text': t.primaryText,
        '--cs-font-body': fonts.body,
        '--cs-font-head': fonts.head,
    } as CSSProperties;
}

const PLACEHOLDER_HINTS: Record<string, string> = {
    about: 'Write a few lines about your clinic.',
    doctors: 'Add a doctor in Doctors and they appear here.',
    sessions: 'Sessions you schedule for the next 7 days appear here.',
    services: 'List the services you offer.',
    hours: 'Set your weekly opening hours.',
    contact: 'Add your phone and address.',
    gallery: 'Add some photos of your clinic.',
    faq: 'Add a question patients often ask.',
    announcement: 'Write a short announcement.',
    text: 'Write some text.',
};

function Placeholder({ type }: { type: string }) {
    return (
        <div className="cs-placeholder">
            <strong>Placeholder — edit this</strong>
            <span className="text-sm">{PLACEHOLDER_HINTS[type] ?? 'This section is empty.'}</span>
            <span className="mt-1 block text-xs">Hidden on your live site until it has content.</span>
        </div>
    );
}

function SectionHead({ title, subtitle, center = false }: { title?: string; subtitle?: string; center?: boolean }) {
    if (!title && !subtitle) return null;
    return (
        <div className={`mb-8 ${center ? 'mx-auto text-center' : ''}`} style={center ? { maxWidth: '40rem' } : undefined}>
            {title && <h2 className="cs-h2">{title}</h2>}
            {subtitle && <p className={`cs-lead ${center ? 'mx-auto' : ''}`}>{subtitle}</p>}
        </div>
    );
}

function initials(name: string): string {
    return name
        .replace(/^(dr\.?|prof\.?)\s+/i, '')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase())
        .join('');
}

/* ---------------- Sections ---------------- */

function Hero({ s, look, clinic, hasSessions }: { s: SiteSection; look: SiteLook; clinic: SiteClinic; hasSessions: boolean }) {
    const style = look.hero_style === 'photo' && !s.image_url ? 'gradient' : look.hero_style;
    const title = s.title || clinic.name;
    const actions = (
        <div className={`mt-8 flex flex-col gap-3 min-[420px]:flex-row ${style === 'gradient' ? 'justify-center' : ''}`}>
            <Link href="/book" className="cs-btn">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
                {s.cta_text || 'Book a token'}
            </Link>
            {hasSessions && (
                <a href="#sessions" className="cs-btn cs-btn-ghost">
                    This week&apos;s sessions
                </a>
            )}
        </div>
    );
    const text = (
        <>
            {s.badge && (
                <span className="cs-chip">
                    <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                    {s.badge}
                </span>
            )}
            <h1 className="cs-hero-title mt-4">{title}</h1>
            {s.subtitle && <p className={`cs-lead text-lg ${style === 'gradient' ? 'mx-auto' : ''}`}>{s.subtitle}</p>}
            {actions}
        </>
    );

    if (style === 'split') {
        return (
            <div className="cs-hero cs-hero-gradient">
                <div className="cs-container grid items-center gap-10 md:grid-cols-2">
                    <div>{text}</div>
                    {s.image_url ? (
                        <img
                            src={s.image_url}
                            alt=""
                            className="aspect-[4/3] w-full rounded-[1.75rem] object-cover"
                            loading="eager"
                        />
                    ) : (
                        <div className="cs-hero-art" aria-hidden="true" />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            className={`cs-hero relative ${style === 'photo' ? 'cs-hero-photo' : style === 'minimal' ? 'cs-hero-minimal' : 'cs-hero-gradient'}`}
            style={style === 'photo' ? { backgroundImage: `url("${s.image_url}")` } : undefined}
        >
            <div className={`cs-container relative ${style === 'gradient' ? 'text-center' : ''}`}>
                <div className={style === 'gradient' ? 'mx-auto max-w-3xl' : 'max-w-3xl'}>{text}</div>
            </div>
        </div>
    );
}

function About({ s, stats }: { s: SiteSection; stats: SiteStat[] }) {
    const showStats = s.show_stats !== false && stats.length > 0;
    return (
        <div className="cs-container grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
            <div>
                <h2 className="cs-h2">{s.title}</h2>
                {s.description && (
                    <div className="cs-lead space-y-3">
                        {String(s.description)
                            .split(/\n{2,}/)
                            .map((p, i) => (
                                <p key={i}>{p}</p>
                            ))}
                    </div>
                )}
                {showStats && (
                    <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
                        {stats.map((st) => (
                            <div key={st.key}>
                                <dt className="text-sm text-[color:var(--cs-muted)]">{st.label}</dt>
                                <dd className="cs-accent text-3xl font-semibold tabular-nums">{st.value}</dd>
                            </div>
                        ))}
                    </dl>
                )}
            </div>
            {s.image_url && (
                <img src={s.image_url} alt="" className="aspect-[4/3] w-full rounded-[1.5rem] object-cover" loading="lazy" />
            )}
        </div>
    );
}

function Doctors({ s, doctors }: { s: SiteSection; doctors: SiteDoctor[] }) {
    const list = doctors.slice(0, Number(s.limit) || 6);
    const asList = s.layout === 'list';
    return (
        <div className="cs-container">
            <SectionHead title={s.title} subtitle={s.subtitle} />
            <ul className={asList ? 'space-y-3' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
                {list.map((d) => (
                    <li key={d.id} className={`cs-card flex gap-4 p-5 ${asList ? 'items-center' : 'items-start'}`}>
                        {d.photo_url ? (
                            <img src={d.photo_url} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" loading="lazy" />
                        ) : (
                            <span
                                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold"
                                style={{ background: 'color-mix(in srgb, var(--cs-primary) 14%, transparent)', color: 'var(--cs-primary-text)' }}
                                aria-hidden="true"
                            >
                                {initials(d.name)}
                            </span>
                        )}
                        <div className="min-w-0 flex-1">
                            <h3 className="text-base font-semibold">{d.name}</h3>
                            {d.specialty && <p className="cs-accent text-sm font-medium">{d.specialty}</p>}
                            {!asList && d.bio && <p className="mt-2 line-clamp-3 text-sm text-[color:var(--cs-muted)]">{d.bio}</p>}
                            <p className="mt-2 text-sm text-[color:var(--cs-muted)]">Fee {d.total_fee_formatted}</p>
                        </div>
                    </li>
                ))}
            </ul>
            <div className="mt-6">
                <Link href="/book" className="cs-btn cs-btn-small">
                    Book a token
                </Link>
            </div>
        </div>
    );
}

function Sessions({ s, sessions }: { s: SiteSection; sessions: SiteSession[] }) {
    const list = sessions.slice(0, Number(s.limit) || 6);
    return (
        <div className="cs-container">
            <SectionHead title={s.title} subtitle={s.subtitle} />
            <ul className={s.layout === 'list' ? 'space-y-3' : 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'}>
                {list.map((x) => (
                    <li key={x.id} className="cs-card flex flex-col gap-3 p-5">
                        <div>
                            <p className="text-sm text-[color:var(--cs-muted)]">{x.session_date}</p>
                            <h3 className="text-base font-semibold">{x.doctor_name}</h3>
                            {x.doctor_specialty && <p className="cs-accent text-sm font-medium">{x.doctor_specialty}</p>}
                        </div>
                        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-[color:var(--cs-muted)]">
                            <span className="inline-flex items-center gap-1.5">
                                <Clock className="h-4 w-4" aria-hidden="true" />
                                {x.start_time}
                            </span>
                            {x.room_number && <span>{x.room_number}</span>}
                            <span>{x.total_fee_formatted}</span>
                        </p>
                        <div className="mt-auto flex items-center justify-between gap-3 border-t border-[color:var(--cs-line)] pt-3">
                            <span className="text-sm">
                                {x.is_full ? 'Fully booked' : `${x.available_tokens_count} tokens left`}
                            </span>
                            {!x.is_full && (
                                <Link href={`/book?session=${x.id}`} className="cs-btn cs-btn-small">
                                    Book
                                </Link>
                            )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Services({ s }: { s: SiteSection }) {
    const items = (s.items ?? []).filter((i: any) => i?.name?.trim());
    return (
        <div className="cs-container">
            <SectionHead title={s.title} subtitle={s.subtitle} />
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((i: any, idx: number) => (
                    <li key={idx} className="cs-card p-5">
                        <Stethoscope className="cs-accent h-6 w-6" aria-hidden="true" />
                        <h3 className="mt-3 text-base font-semibold">{i.name}</h3>
                        {i.desc && <p className="mt-1 text-sm text-[color:var(--cs-muted)]">{i.desc}</p>}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Hours({ s }: { s: SiteSection }) {
    const days: DayHours[] = s.days ?? [];
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = window.setInterval(() => setNow(new Date()), 60_000);
        return () => window.clearInterval(id);
    }, []);
    const open = openNow(days, now);
    const today = colomboWeekday(now);

    return (
        <div className="cs-container grid gap-8 md:grid-cols-[1fr_1.3fr]">
            <div>
                <h2 className="cs-h2">{s.title}</h2>
                {open !== null && (
                    <p
                        className="mt-4 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-semibold"
                        style={
                            open
                                ? { background: 'rgba(16, 185, 129, 0.14)', color: 'var(--cs-open, #047857)' }
                                : { background: 'rgba(100, 116, 139, 0.16)', color: 'var(--cs-muted)' }
                        }
                    >
                        <span className="h-2 w-2 rounded-full" style={{ background: open ? '#10b981' : '#94a3b8' }} />
                        {open ? 'Open now' : 'Closed now'}
                    </p>
                )}
                {s.note && <p className="cs-lead">{s.note}</p>}
            </div>
            <dl className="cs-card divide-y divide-[color:var(--cs-line)]">
                {days.map((d) => (
                    <div
                        key={d.day}
                        className={`flex items-center justify-between gap-4 px-5 py-3 text-sm ${d.day === today ? 'font-semibold' : ''}`}
                    >
                        <dt>
                            {DAY_LABELS[d.day]}
                            {d.day === today && <span className="cs-accent ml-2 text-xs">Today</span>}
                        </dt>
                        <dd className={d.open ? '' : 'text-[color:var(--cs-muted)]'}>
                            {d.open && d.ranges.length
                                ? d.ranges.map((r) => `${formatTime(r.from)} – ${formatTime(r.to)}`).join(', ')
                                : 'Closed'}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

function Contact({ s, clinic }: { s: SiteSection; clinic: SiteClinic }) {
    const phone = s.phone || clinic.phone;
    const whatsapp = s.whatsapp || clinic.whatsapp_number;
    const email = s.email || clinic.email;
    const address = s.address || clinic.address;
    const lat = s.latitude ?? clinic.latitude;
    const lng = s.longitude ?? clinic.longitude;
    const hasMap = s.show_map !== false && typeof lat === 'number' && typeof lng === 'number';
    const d = 0.006;

    const rows: { icon: ReactNode; label: string; value: ReactNode }[] = [];
    if (phone) rows.push({ icon: <Phone className="h-5 w-5" />, label: 'Phone', value: <a href={`tel:${phone.replace(/\s+/g, '')}`} className="cs-accent font-medium hover:underline">{phone}</a> });
    if (whatsapp)
        rows.push({
            icon: <MessageCircle className="h-5 w-5" />,
            label: 'WhatsApp',
            value: (
                <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} className="cs-accent font-medium hover:underline" rel="noopener noreferrer" target="_blank">
                    Chat on WhatsApp
                </a>
            ),
        });
    if (email) rows.push({ icon: <Mail className="h-5 w-5" />, label: 'Email', value: <a href={`mailto:${email}`} className="cs-accent font-medium hover:underline">{email}</a> });
    if (address) rows.push({ icon: <MapPin className="h-5 w-5" />, label: 'Address', value: <span>{address}</span> });

    return (
        <div className="cs-container grid gap-8 md:grid-cols-2">
            <div>
                <SectionHead title={s.title} subtitle={s.subtitle} />
                <ul className="space-y-4">
                    {rows.map((r) => (
                        <li key={r.label} className="flex items-start gap-3">
                            <span className="cs-accent mt-0.5" aria-hidden="true">
                                {r.icon}
                            </span>
                            <div>
                                <p className="text-sm text-[color:var(--cs-muted)]">{r.label}</p>
                                <div className="text-base">{r.value}</div>
                            </div>
                        </li>
                    ))}
                </ul>
                <Link href="/book" className="cs-btn mt-8">
                    Book a token
                </Link>
            </div>
            {hasMap && (
                <iframe
                    title={`Map showing ${clinic.name}`}
                    className="cs-card h-72 w-full md:h-full md:min-h-[20rem]"
                    loading="lazy"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d}%2C${lng + d}%2C${lat + d}&layer=mapnik&marker=${lat}%2C${lng}`}
                />
            )}
        </div>
    );
}

function Gallery({ s }: { s: SiteSection }) {
    const images = (s.images ?? []).filter((i: any) => i?.url);
    return (
        <div className="cs-container">
            <SectionHead title={s.title} />
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {images.map((img: any, i: number) => (
                    <li key={i}>
                        <img src={img.url} alt={img.alt || ''} className="aspect-[4/3] w-full rounded-2xl object-cover" loading="lazy" />
                    </li>
                ))}
            </ul>
        </div>
    );
}

function Faq({ s }: { s: SiteSection }) {
    const items = (s.items ?? []).filter((i: any) => i?.question?.trim());
    return (
        <div className="cs-container max-w-3xl">
            <SectionHead title={s.title} />
            <div className="divide-y divide-[color:var(--cs-line)] border-y border-[color:var(--cs-line)]">
                {items.map((i: any, idx: number) => (
                    <details key={idx} className="group py-4">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                            {i.question}
                            <ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                        </summary>
                        {i.answer && <p className="mt-2 text-[color:var(--cs-muted)]">{i.answer}</p>}
                    </details>
                ))}
            </div>
        </div>
    );
}

function Announcement({ s }: { s: SiteSection }) {
    const tone = s.tone === 'warning' ? '#B45309' : s.tone === 'success' ? '#047857' : 'var(--cs-primary-text)';
    return (
        <div className="cs-container">
            <div className="cs-card flex gap-4 p-5" style={{ borderLeft: `4px solid ${tone}` }} role="note">
                <div>
                    {s.title && <p className="font-semibold">{s.title}</p>}
                    <p className="text-[color:var(--cs-muted)]">{s.message}</p>
                </div>
            </div>
        </div>
    );
}

function TextBlock({ s }: { s: SiteSection }) {
    return (
        <div className="cs-container max-w-3xl">
            {s.title && <h2 className="cs-h2">{s.title}</h2>}
            <div className="cs-lead space-y-3">
                {String(s.body || '')
                    .split(/\n{2,}/)
                    .map((p, i) => (
                        <p key={i}>{p}</p>
                    ))}
            </div>
        </div>
    );
}

/* ---------------- Renderer ---------------- */

export default function ClinicSiteRenderer({
    clinic,
    sections,
    look,
    stats,
    doctors,
    sessions,
    preview = false,
    embed = false,
    selectedId,
    flashId,
    visibleIds,
}: ClinicSiteProps) {
    const data = { doctors: doctors.length, sessions: sessions.length, stats: stats.length, clinic };
    let alt = false;

    return (
        <div className="cs-root" data-mode={look.mode} data-buttons={look.button_style} data-embed={embed} style={siteStyle(look)}>
            {sections.map((s) => {
                if (!s.enabled && !preview) return null;
                const hasContent = preview ? sectionHasContent(s, data) : (visibleIds ?? []).includes(s.id);
                if (!preview && !hasContent) return null;
                if (preview && !s.enabled) return null;

                let body: ReactNode;
                if (!hasContent) {
                    body = (
                        <div className="cs-container">
                            {s.title && <h2 className="cs-h2 mb-4 opacity-60">{s.title}</h2>}
                            <Placeholder type={s.type} />
                        </div>
                    );
                } else {
                    switch (s.type) {
                        case 'hero':
                            return (
                                <section
                                    key={s.id}
                                    id={s.id}
                                    data-section-id={s.id}
                                    data-selected={selectedId === s.id}
                                    className={flashId === s.id ? 'cs-flash relative' : 'relative'}
                                >
                                    <Hero s={s} look={look} clinic={clinic} hasSessions={sessions.length > 0} />
                                </section>
                            );
                        case 'about':
                            body = <About s={s} stats={stats} />;
                            break;
                        case 'doctors':
                            body = <Doctors s={s} doctors={doctors} />;
                            break;
                        case 'sessions':
                            body = <Sessions s={s} sessions={sessions} />;
                            break;
                        case 'services':
                            body = <Services s={s} />;
                            break;
                        case 'hours':
                            body = <Hours s={s} />;
                            break;
                        case 'contact':
                            body = <Contact s={s} clinic={clinic} />;
                            break;
                        case 'gallery':
                            body = <Gallery s={s} />;
                            break;
                        case 'faq':
                            body = <Faq s={s} />;
                            break;
                        case 'announcement':
                            body = <Announcement s={s} />;
                            break;
                        case 'text':
                            body = <TextBlock s={s} />;
                            break;
                        case 'footer':
                            return s.notice ? (
                                <section
                                    key={s.id}
                                    id={s.id}
                                    data-section-id={s.id}
                                    data-selected={selectedId === s.id}
                                    className={`border-t border-[color:var(--cs-line)] py-6 ${flashId === s.id ? 'cs-flash' : ''}`}
                                >
                                    <p className="cs-container text-center text-sm text-[color:var(--cs-muted)]">{s.notice}</p>
                                </section>
                            ) : null;
                        default:
                            return null;
                    }
                }

                alt = !alt;
                return (
                    <section
                        key={s.id}
                        id={s.id}
                        data-section-id={s.id}
                        data-selected={selectedId === s.id}
                        aria-label={s.title || undefined}
                        className={`cs-section ${alt ? '' : 'cs-section-alt'} ${flashId === s.id ? 'cs-flash' : ''}`}
                    >
                        {body}
                    </section>
                );
            })}
        </div>
    );
}
