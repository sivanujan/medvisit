import React, { useEffect, useRef, useState } from 'react';
import { Head } from '@inertiajs/react';

import PublicSiteHeader, { HeaderConfig } from '@/Components/Public/PublicSiteHeader';
import PublicSiteFooter, { FooterConfig } from '@/Components/Public/PublicSiteFooter';
import { kitToCss, type SiteKit } from '@/Components/PageBuilder/lib/kit';
import { animationCss, initEntranceAnimations } from '@/Components/PageBuilder/lib/animations';
import { initWidgets } from '@/Components/PageBuilder/lib/widgetsRuntime';
import { googleFontsUrl, usedFontFamilies } from '@/Components/PageBuilder/lib/fonts';
import ClinicSiteRenderer, { siteFontsHref } from '@/Components/ClinicSite/ClinicSiteRenderer';
import type {
    SiteClinic,
    SiteDoctor,
    SiteLook,
    SiteSection,
    SiteSession,
    SiteStat,
} from '@/Components/ClinicSite/types';

interface Props {
    clinic: SiteClinic & { opening_hours?: string | null };
    headerConfig?: HeaderConfig;
    footerConfig?: FooterConfig;
    sections: SiteSection[];
    visibleSectionIds: string[];
    look: SiteLook;
    stats: SiteStat[];
    theme: string;
    isPublished: boolean;
    isPreview?: boolean;
    isEmbed?: boolean;
    doctors: SiteDoctor[];
    upcomingSessions: SiteSession[];
    seo: { title: string; description: string; image?: string; url?: string };
    siteKit?: SiteKit | null;
    customPage?: { html: string; css: string; isPreview?: boolean } | null;
}

/** Messages exchanged with the website editor when the page is shown inside its preview frame. */
type EditorMessage =
    | { source: 'mv-editor'; type: 'state'; sections: SiteSection[]; look: SiteLook; selectedId: string | null }
    | { source: 'mv-editor'; type: 'scroll-to'; id: string };

function SiteHead({ seo, clinic, look, extraFonts }: { seo: Props['seo']; clinic: Props['clinic']; look?: SiteLook; extraFonts?: string | null }) {
    const fontHref = look ? siteFontsHref(look.font) : null;
    return (
        <Head>
            <title>{seo.title || clinic.name}</title>
            <meta name="description" content={seo.description} />
            <meta property="og:type" content="website" />
            <meta property="og:title" content={seo.title || clinic.name} />
            <meta property="og:description" content={seo.description} />
            {seo.image && <meta property="og:image" content={seo.image} />}
            {seo.url && <meta property="og:url" content={seo.url} />}
            <meta name="twitter:card" content="summary_large_image" />
            {clinic.logo_url && <link rel="icon" href={clinic.logo_url} />}
            {fontHref && <link rel="stylesheet" href={fontHref} />}
            {extraFonts && <link rel="stylesheet" href={extraFonts} />}
        </Head>
    );
}

export default function ClinicLanding(props: Props) {
    const { clinic, headerConfig, footerConfig, theme, doctors, upcomingSessions, seo, siteKit, customPage } = props;

    // The shared header/footer take undefined (not null) for missing details.
    const chromeClinic = Object.fromEntries(
        Object.entries(clinic).map(([k, v]) => [k, v === null ? undefined : v]),
    ) as { name: string; [key: string]: any };

    const customMainRef = useRef<HTMLElement>(null);
    const customHtml = customPage?.html;
    // Entrance animations, Tabs and Counters run once the builder HTML is mounted; cleanup removes them.
    useEffect(() => {
        if (!customHtml || !customMainRef.current) return;
        const stopAnimations = initEntranceAnimations(customMainRef.current);
        const stopWidgets = initWidgets(customMainRef.current);
        return () => {
            stopAnimations();
            stopWidgets();
        };
    }, [customHtml]);

    // ---- Editor preview frame: live draft state + click-to-select ----
    const embed = !!props.isEmbed;
    const [sections, setSections] = useState(props.sections);
    const [look, setLook] = useState(props.look);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [flashId, setFlashId] = useState<string | null>(null);

    useEffect(() => {
        if (!embed) return;
        const onMessage = (e: MessageEvent<EditorMessage>) => {
            if (e.origin !== window.location.origin || e.data?.source !== 'mv-editor') return;
            if (e.data.type === 'state') {
                setSections(e.data.sections);
                setLook(e.data.look);
                setSelectedId(e.data.selectedId);
            } else if (e.data.type === 'scroll-to') {
                const el = document.getElementById(e.data.id);
                const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
                setFlashId(null);
                requestAnimationFrame(() => setFlashId(e.data.type === 'scroll-to' ? e.data.id : null));
            }
        };
        // In the editor, clicks pick a section instead of following links.
        const onClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const section = target.closest<HTMLElement>('[data-section-id]');
            if (target.closest('a, button, summary') || section) e.preventDefault();
            if (section) {
                window.parent.postMessage({ source: 'mv-preview', type: 'select', id: section.dataset.sectionId }, window.location.origin);
            }
        };
        window.addEventListener('message', onMessage);
        document.addEventListener('click', onClick, true);
        window.parent.postMessage({ source: 'mv-preview', type: 'ready' }, window.location.origin);
        return () => {
            window.removeEventListener('message', onMessage);
            document.removeEventListener('click', onClick, true);
        };
    }, [embed]);

    if (customPage?.html) {
        const fontsUrl = siteKit ? googleFontsUrl(usedFontFamilies(siteKit, customPage.css ?? '')) : null;
        return (
            <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
                <SiteHead seo={seo} clinic={clinic} extraFonts={fontsUrl} />

                {customPage.isPreview && (
                    <div className="sticky top-0 z-50 bg-amber-400 text-slate-950 px-4 py-2 text-sm font-semibold flex items-center justify-between">
                        <span>Preview: you are seeing unpublished changes.</span>
                        <a href="/website/builder" className="px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold">
                            Back to the builder
                        </a>
                    </div>
                )}

                <PublicSiteHeader clinic={chromeClinic} headerConfig={headerConfig} themePreset={theme} />

                {siteKit && <style dangerouslySetInnerHTML={{ __html: kitToCss(siteKit) }} />}
                <style dangerouslySetInnerHTML={{ __html: animationCss() }} />
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
                            .medvisit-custom-page-canvas header,
                            .medvisit-custom-page-canvas footer {
                                display: none !important;
                            }
                            ${customPage.css || ''}
                        `,
                    }}
                />

                <main
                    ref={customMainRef}
                    id="main-content"
                    className="flex-1 medvisit-custom-page-canvas"
                    dangerouslySetInnerHTML={{ __html: customPage.html }}
                />

                <PublicSiteFooter clinic={chromeClinic} footerConfig={footerConfig} themePreset={theme} />
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex flex-col ${look.mode === 'dark' ? 'bg-[#0b1220]' : 'bg-white'}`}>
            <SiteHead seo={seo} clinic={clinic} look={look} />

            {props.isPreview && !embed && (
                <div className="sticky top-0 z-50 bg-amber-400 text-slate-950 px-4 py-2 text-sm font-semibold flex items-center justify-between gap-3">
                    <span>Preview: this is your draft. Visitors still see the published site.</span>
                    <a href="/website" className="shrink-0 px-3 py-1 bg-slate-900 text-white rounded-lg text-xs font-semibold">
                        Back to the editor
                    </a>
                </div>
            )}

            <PublicSiteHeader clinic={chromeClinic} headerConfig={headerConfig} themePreset={look.theme || theme} />

            <main id="main-content" className="flex-1">
                <ClinicSiteRenderer
                    clinic={clinic}
                    sections={sections}
                    look={look}
                    stats={props.stats}
                    doctors={doctors}
                    sessions={upcomingSessions}
                    preview={!!props.isPreview}
                    embed={embed}
                    selectedId={selectedId}
                    flashId={flashId}
                    visibleIds={props.visibleSectionIds}
                />
            </main>

            <PublicSiteFooter clinic={chromeClinic} footerConfig={footerConfig} themePreset={look.theme || theme} />
        </div>
    );
}
