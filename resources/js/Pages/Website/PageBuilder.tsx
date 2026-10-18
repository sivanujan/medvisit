import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
import {
    Smartphone,
    Tablet,
    Sparkles,
    Layers,
    LayoutGrid,
    Settings,
    X,
    ShieldAlert,
    History,
    RefreshCw,
    PanelTop,
    PanelBottom,
} from 'lucide-react';
import type { SiteKit } from '@/Components/PageBuilder/lib/kit';
import { applyKitToDocument } from '@/Components/PageBuilder/lib/kitCanvas';
import { KitContext } from '@/Components/PageBuilder/controls/KitContext';
import SiteSettingsTab from '@/Components/PageBuilder/LeftPanel/SiteSettingsTab';
import { buildInitialEditorCss, cssWithCustomBlock, stripCustomCssBlock, syncCustomCssStyle } from '@/Components/PageBuilder/lib/customCss';
import { animationCss, canvasEditorCss } from '@/Components/PageBuilder/lib/animations';
import { createLoadGuard } from '@/Components/PageBuilder/lib/loadGuard';
import MediaLibraryModal from '@/Components/PageBuilder/MediaLibraryModal';
import TopBar from '@/Components/PageBuilder/TopBar';
import WidgetsTab from '@/Components/PageBuilder/LeftPanel/WidgetsTab';
import LayersTab from '@/Components/PageBuilder/LeftPanel/LayersTab';
import HeaderTab from '@/Components/PageBuilder/LeftPanel/HeaderTab';
import FooterTab from '@/Components/PageBuilder/LeftPanel/FooterTab';
import Inspector from '@/Components/PageBuilder/Inspector/Inspector';
import PageSettings from '@/Components/PageBuilder/Inspector/PageSettings';
import { registerBlocks } from '@/Components/PageBuilder/blocks/registerBlocks';
import type {
    BuilderPageProps,
    Component,
    DeviceName,
    Editor,
    FooterConfig,
    HeaderConfig,
    InspectorTabName,
    LeftPanelTabName,
    MenuLink,
    PageSummary,
    Revision,
    SaveState,
} from '@/Components/PageBuilder/types';
import { getTemplateHtml } from '@/Components/PageBuilder/templates';

// Remount the builder per page: GrapesJS is initialised once from the page's content.
export default function PageBuilder(props: BuilderPageProps) {
    return <PageBuilderInner key={props.page.id} {...props} />;
}

function PageBuilderInner({
    tenant,
    page: initialPage,
    pages: initialPages,
    revisions: initialRevisions,
    mediaAssets,
    doctors,
    upcomingSessions,
    headerConfig: initialHeaderConfig,
    footerConfig: initialFooterConfig,
    siteKit,
}: BuilderPageProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const editorInstance = useRef<Editor | null>(null);
    const [editor, setEditor] = useState<Editor | null>(null);

    // Site kit: `kit` is the working copy shown live in the canvas; `savedKit` is what the server has.
    // Kit edits are saved by the Site Settings panel itself and are separate from the page's dirty state.
    const [kit, setKit] = useState<SiteKit | null>(siteKit ?? null);
    const [savedKit, setSavedKit] = useState<SiteKit | null>(siteKit ?? null);
    const kitRef = useRef(kit);
    kitRef.current = kit;

    // Current page + page list (kept in sync with page-settings changes)
    const [page, setPage] = useState(initialPage);
    const [pagesList, setPagesList] = useState<PageSummary[]>(initialPages ?? []);
    const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
    const [notice, setNotice] = useState<string | null>(null);
    const allowUnloadRef = useRef(false);

    const [saving, setSaving] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>(null);
    const [isDirty, setIsDirty] = useState(false);
    // Events fired while content is loaded programmatically are not user edits.
    const loadGuardRef = useRef(createLoadGuard(true));
    const [lastSavedTime, setLastSavedTime] = useState<string | null>(
        page.published_at ? new Date(page.published_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null
    );

    // Active Device Viewport ('Desktop' | 'Tablet' | 'Mobile')
    const [currentDevice, setCurrentDevice] = useState<DeviceName>('Desktop');

    // Left Panel Tab: 'elements' | 'navigator' | 'header' | 'footer' | 'settings'
    const [leftPanelTab, setLeftPanelTab] = useState<LeftPanelTabName>('elements');

    // Header & Footer Configuration State
    const [headerConfig, setHeaderConfig] = useState<HeaderConfig>(() => ({
        logo_url: initialHeaderConfig?.logo_url ?? tenant.logo_url ?? '',
        show_tagline: initialHeaderConfig?.show_tagline ?? true,
        tagline: initialHeaderConfig?.tagline ?? 'Compassionate, Modern Healthcare',
        menu_items: initialHeaderConfig?.menu_items ?? [
            { label: 'Home', url: '/' },
            { label: 'About', url: '/about' },
            { label: 'Doctors', url: '/doctors' },
            { label: 'Services', url: '/services' },
            { label: 'Contact', url: '/contact' },
        ],
        show_phone: initialHeaderConfig?.show_phone ?? true,
        phone: initialHeaderConfig?.phone ?? tenant.phone ?? '+94 77 204 6898',
        show_whatsapp: initialHeaderConfig?.show_whatsapp ?? false,
        whatsapp_number: initialHeaderConfig?.whatsapp_number ?? '',
        cta_text: initialHeaderConfig?.cta_text ?? 'Book a token',
        cta_url: initialHeaderConfig?.cta_url ?? '/book',
        is_sticky: initialHeaderConfig?.is_sticky ?? true,
        is_transparent_over_hero: initialHeaderConfig?.is_transparent_over_hero ?? false,
    }));

    const [footerConfig, setFooterConfig] = useState<FooterConfig>(() => ({
        about_text: initialFooterConfig?.about_text ?? '',
        quick_links: initialFooterConfig?.quick_links ?? [
            { label: 'Home', url: '/' },
            { label: 'About Us', url: '/about' },
            { label: 'Doctors & Specialists', url: '/doctors' },
            { label: 'Clinical Services', url: '/services' },
            { label: 'Channeling / Book Token', url: '/book' },
            { label: 'Live Queue Status', url: '/queue' },
            { label: 'Contact & Location', url: '/contact' },
        ],
        address: initialFooterConfig?.address ?? tenant.address ?? '',
        phone: initialFooterConfig?.phone ?? tenant.phone ?? '',
        email: initialFooterConfig?.email ?? '',
        whatsapp_number: initialFooterConfig?.whatsapp_number ?? '',
        opening_hours: initialFooterConfig?.opening_hours ?? 'Mon – Sat: 8:00 AM – 9:00 PM | Sun: 8:00 AM – 2:00 PM',
        cta_text: initialFooterConfig?.cta_text ?? 'Book a token',
        cta_url: initialFooterConfig?.cta_url ?? '/book',
        show_social: initialFooterConfig?.show_social ?? true,
        facebook_url: initialFooterConfig?.facebook_url ?? '',
        instagram_url: initialFooterConfig?.instagram_url ?? '',
        show_powered_by: initialFooterConfig?.show_powered_by ?? true,
    }));

    // Right Inspector Subtab: 'content' | 'style' | 'advanced'
    const [inspectorTab, setInspectorTab] = useState<InspectorTabName>('content');

    // Selected Component state
    const [selectedComponent, setSelectedComponent] = useState<Component | null>(null);
    const [selectedTagName, setSelectedTagName] = useState<string>('');
    const [selectedWidgetName, setSelectedWidgetName] = useState<string>('');

    // Search query in elements panel
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [mediaModalOpen, setMediaModalOpen] = useState(false);
    const [mediaCurrentValue, setMediaCurrentValue] = useState('');
    // One-shot handler for a media pick requested by a non-image control (e.g. background image)
    const mediaPickRef = useRef<((url: string) => void) | null>(null);
    const [revisionsModalOpen, setRevisionsModalOpen] = useState(false);
    const [revisionsList, setRevisionsList] = useState<Revision[]>(initialRevisions);
    const [revertingRevision, setRevertingRevision] = useState<number | null>(null);
    const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
    const [exitModalOpen, setExitModalOpen] = useState(false);

    // Page settings state
    const [pageTheme, setPageTheme] = useState(page.theme_preset || 'medvisit-teal');

    // Theme Presets for Clinic
    const themePresets = [
        { id: 'medvisit-teal', name: 'MedVisit Teal', color: '#0E9E8F', desc: 'Standard clinical clarity & trusted medical tone' },
        { id: 'ocean-blue', name: 'Ocean Blue', color: '#1E6FD9', desc: 'Modern hospital, diagnostics & outpatient suites' },
        { id: 'emerald-health', name: 'Emerald Health', color: '#059669', desc: 'Wellness, cardiology & holistic preventive care' },
        { id: 'royal-purple', name: 'Royal Specialist', color: '#7C3AED', desc: 'High-end consultant suites & private surgical rooms' },
        { id: 'slate-luxury', name: 'Slate Luxury', color: '#334155', desc: 'Corporate medical centers & executive executive screening' },
    ];

    // Initial GrapesJS Setup
    useEffect(() => {
        if (!editorRef.current || editorInstance.current) return;

        // Custom GrapesJS Canvas base styling
        const cssBase = `
            * { box-sizing: border-box; }
            html, body {
                margin: 0;
                padding: 0;
                min-height: 100vh;
                background-color: #ffffff;
                color: #0f172a;
                font-family: 'Poppins', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                line-height: 1.6;
            }
            .medvisit-section {
                padding: 60px 20px;
                position: relative;
            }
            .medvisit-container {
                max-width: 1200px;
                margin-left: auto;
                margin-right: auto;
                width: 100%;
            }
            .medvisit-grid-2 {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 24px;
            }
            .medvisit-grid-3 {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 24px;
            }
            .medvisit-grid-4 {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 20px;
            }
            @media (max-width: 768px) {
                .medvisit-grid-2, .medvisit-grid-3, .medvisit-grid-4 {
                    grid-template-columns: 1fr;
                }
                .medvisit-section {
                    padding: 40px 16px;
                }
            }
        `;

        const initialHtml =
            page.html && page.html.trim().length > 0
                ? page.html
                : getTemplateHtml('modern-clinic', tenant);
        const initialCss = buildInitialEditorCss(cssBase, page.css);

        const editor = grapesjs.init({
            container: editorRef.current,
            fromElement: false,
            height: '100%',
            width: '100%',
            storageManager: false,
            components: initialHtml,
            style: initialCss,
            assetManager: {
                custom: {
                    open(props: any) {
                        setMediaCurrentValue(props.target?.get('src') || '');
                        setMediaModalOpen(true);
                    },
                    close() {
                        setMediaModalOpen(false);
                    },
                },
            },
            deviceManager: {
                devices: [
                    { name: 'Desktop', width: '' },
                    { name: 'Tablet', width: '768px', widthMedia: '992px' },
                    { name: 'Mobile', width: '375px', widthMedia: '480px' },
                ],
            },
            panels: { defaults: [] }, // Custom external header & panels
            blockManager: { appendTo: '#builder-blocks-container' },
            layerManager: { appendTo: '#builder-layers-container' },
            styleManager: { appendTo: '#builder-styles-container' },
            selectorManager: { componentFirst: true, appendTo: '#builder-selectors-container' },
            traitManager: { appendTo: '#builder-traits-container' },
            canvas: {
                styles: [
                    'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap',
                ],
                scripts: [],
            },
        });

        editorInstance.current = editor;
        setEditor(editor);

        // Register Blocks into categories
        registerBlocks(editor, doctors);

        // Selection listeners
        editor.on('component:selected', (component: any) => {
            setSelectedComponent(component);
            setSelectedTagName(component.get('tagName')?.toUpperCase() || 'ELEMENT');
            const customName =
                component.get('custom-name') ||
                component.get('name') ||
                component.get('tagName');
            setSelectedWidgetName(customName);
        });

        editor.on('component:deselected', () => {
            setSelectedComponent(null);
            setSelectedTagName('');
            setSelectedWidgetName('');
        });

        // Change tracking for unsaved indicator
        const markDirty = () => {
            if (loadGuardRef.current.isLoading()) return;
            setIsDirty(true);
        };
        editor.on('component:update', markDirty);
        editor.on('component:add component:remove component:update:attributes', () => syncCustomCssStyle(editor));
        editor.on('component:add', markDirty);
        editor.on('component:remove', markDirty);
        editor.on('style:update', markDirty);
        editor.on('component:styleUpdate', markDirty);
        // Keep page chrome in sync when the device is changed from anywhere (toolbar or Style tab icons)
        // Editor-only canvas styles: animated elements stay visible and elements hidden on the active device are faded.
        const syncCanvasStyles = () => {
            const canvasDoc = editor.Canvas.getDocument();
            if (!canvasDoc) return;
            const existing = canvasDoc.getElementById('mv-editor-only') as HTMLStyleElement | null;
            const el: HTMLStyleElement = existing ?? canvasDoc.createElement('style');
            if (!existing) {
                el.id = 'mv-editor-only';
                canvasDoc.head.appendChild(el);
            }
            const name = String(editor.getDevice?.() || 'Desktop').toLowerCase();
            const device = name === 'tablet' || name === 'mobile' ? name : 'desktop';
            // Appended after the animation rules so the canvas override wins.
            el.textContent = animationCss() + canvasEditorCss(device);
        };
        editor.on('device:select', (device: any) => {
            setCurrentDevice((device?.get?.('name') || 'Desktop') as DeviceName);
            syncCanvasStyles();
        });

        // Ensure canvas renders on load
        editor.on('load', () => {
            loadGuardRef.current.run(() => {
                if (!editor.getHtml() || editor.getHtml().trim() === '<body></body>') {
                    editor.setComponents(initialHtml);
                }
                editor.setStyle(initialCss);
                if (kitRef.current) applyKitToDocument(editor.Canvas.getDocument(), kitRef.current, initialCss);
                syncCanvasStyles();
                syncCustomCssStyle(editor);
                editor.refresh();
            });
            // Let GrapesJS's deferred (0ms) events from the load settle before edits count.
            setTimeout(() => {
                editor.UndoManager?.clear?.();
                loadGuardRef.current.release();
                setIsDirty(false);
            }, 0);
        });

        setTimeout(() => {
            editor.refresh();
        }, 150);

        return () => {
            editor.destroy();
            editorInstance.current = null;
            setEditor(null);
        };
    }, []);

    // Keep the canvas kit style + fonts link in sync with every kit change.
    useEffect(() => {
        if (!editor || !kit) return;
        applyKitToDocument(editor.Canvas.getDocument(), kit, editor.getCss() ?? '');
    }, [editor, kit]);

    // Warn before closing/reloading the tab while there are unsaved changes
    useEffect(() => {
        if (!isDirty) return;
        const guard = (e: BeforeUnloadEvent) => {
            if (allowUnloadRef.current) return;
            e.preventDefault();
            e.returnValue = '';
        };
        window.addEventListener('beforeunload', guard);
        return () => window.removeEventListener('beforeunload', guard);
    }, [isDirty]);

    // Intentional navigation: step the guard aside first
    const willNavigate = () => {
        allowUnloadRef.current = true;
    };

    const showNotice = (message: string) => {
        setNotice(message);
        setTimeout(() => setNotice(null), 4000);
    };

    // The page was deleted elsewhere (404 on save/publish)
    const handlePageDeleted = () => {
        showNotice('This page was deleted');
        setIsDirty(false);
        willNavigate();
        setTimeout(() => router.visit('/website#pages'), 1200);
    };

    // Page settings changed (title/slug/SEO/homepage): refresh local state from the server response
    const handlePageSaved = (summary: PageSummary) => {
        setPage((prev) => ({
            ...prev,
            title: summary.title,
            slug: summary.slug,
            is_homepage: summary.is_homepage,
            seo_title: summary.seo_title,
            seo_description: summary.seo_description,
            public_url: summary.url,
        }));
        setPagesList((prev) =>
            prev.map((p) =>
                p.id === summary.id ? summary : summary.is_homepage ? { ...p, is_homepage: false } : p
            )
        );

        // Keep stored fallback URLs of menu links to this page current (needs a save to persist)
        const stale = (links: MenuLink[] | undefined) =>
            !!links?.some((l) => l.page_id === summary.id && l.url !== summary.url);
        const refresh = <T extends MenuLink>(links: T[] | undefined) =>
            links?.map((l) => (l.page_id === summary.id ? { ...l, url: summary.url } : l));
        if (stale(headerConfig.menu_items) || stale(footerConfig.quick_links)) {
            setHeaderConfig((prev) => ({ ...prev, menu_items: refresh(prev.menu_items) }));
            setFooterConfig((prev) => ({ ...prev, quick_links: refresh(prev.quick_links) }));
            setIsDirty(true);
        }
    };

    // Load Ready-Made Templates
    const loadTemplate = (templateId: string, editorInstanceParam?: any) => {
        const editor = editorInstanceParam || editorInstance.current;
        if (!editor) return;

        const templateHtml = getTemplateHtml(templateId, tenant);
        editor.setComponents(templateHtml);
        editor.refresh();
        setIsDirty(true);
        setTemplatesModalOpen(false);
    };

    // Save Page Draft (Manual or Autosave)
    const handleSave = async (isPublish = false): Promise<boolean> => {
        if (!editorInstance.current) return false;
        setSaving(true);
        setSaveState(null);

        const html = editorInstance.current.getHtml();
        const css = cssWithCustomBlock(editorInstance.current);
        const projectData = editorInstance.current.getProjectData();

        const endpoint = isPublish
            ? `/website/builder/${page.id}/publish`
            : `/website/builder/${page.id}/save`;
        const csrfToken =
            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    content_json: projectData,
                    html,
                    css,
                    theme_preset: pageTheme,
                    header_config: headerConfig,
                    footer_config: footerConfig,
                }),
            });

            if (res.status === 404) {
                handlePageDeleted();
                return false;
            }

            const data = await res.json();
            if (res.ok && data.ok) {
                setSaveState('ok');
                setIsDirty(false);
                setLastSavedTime(
                    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                );
                // Refresh revisions list
                fetchRevisions();
                setTimeout(() => setSaveState(null), 3000);
                return true;
            }
            setSaveState('error');
            setTimeout(() => setSaveState(null), 4000);
            return false;
        } catch (err) {
            console.error('Save error:', err);
            setSaveState('error');
            setTimeout(() => setSaveState(null), 4000);
            return false;
        } finally {
            setSaving(false);
        }
    };

    // Fetch Revisions
    const fetchRevisions = async () => {
        try {
            const res = await fetch(`/website/builder/${page.id}/revisions`);
            const data = await res.json();
            if (res.ok && data.revisions) {
                setRevisionsList(data.revisions);
            }
        } catch (err) {
            console.error('Revisions fetch error:', err);
        }
    };

    // Restore Revision
    const handleRestoreRevision = async (rev: Revision) => {
        if (!editorInstance.current) return;
        setRevertingRevision(rev.id);

        const csrfToken =
            (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '';

        try {
            const res = await fetch(`/website/builder/${page.id}/revert/${rev.id}`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    Accept: 'application/json',
                },
            });

            const data = await res.json();
            if (res.ok && data.ok) {
                // The server already saved the restored revision as the draft, so this is not an unsaved edit.
                loadGuardRef.current.run(() => {
                    if (data.html) {
                        editorInstance.current.setComponents(data.html);
                    }
                    if (data.css) {
                        editorInstance.current.setStyle(stripCustomCssBlock(data.css));
                        syncCustomCssStyle(editorInstance.current);
                    }
                });
                setIsDirty(false);
                setRevisionsModalOpen(false);
                fetchRevisions();
            }
        } catch (err) {
            console.error('Restore revision error:', err);
        } finally {
            setRevertingRevision(null);
        }
    };

    // Device Viewport Switcher
    const setDevice = (device: DeviceName) => {
        if (!editorInstance.current) return;
        editorInstance.current.setDevice(device);
        setCurrentDevice(device);
    };

    // Open the media library modal for the given current value
    const openMediaLibrary = (currentValue: string, onPick?: (url: string) => void) => {
        mediaPickRef.current = onPick ?? null;
        setMediaCurrentValue(currentValue);
        setMediaModalOpen(true);
    };

    // Exit Builder Handler
    const handleExit = () => {
        if (isDirty) {
            setExitModalOpen(true);
        } else {
            willNavigate();
            router.visit('/website');
        }
    };

    // Filter elements list
    const filteredWidgets = useMemo(() => {
        if (!searchQuery.trim()) return null;
        const q = searchQuery.toLowerCase();
        return [
            { name: '1 Column', cat: 'Layout', key: 'layout-1-col' },
            { name: '2 Columns', cat: 'Layout', key: 'layout-2-col' },
            { name: '3 Columns', cat: 'Layout', key: 'layout-3-col' },
            { name: 'Heading', cat: 'Core', key: 'widget-heading' },
            { name: 'Rich Text', cat: 'Core', key: 'widget-paragraph' },
            { name: 'Action Button', cat: 'Core', key: 'widget-button' },
            { name: 'Image', cat: 'Core', key: 'widget-image' },
            { name: 'Icon List', cat: 'Core', key: 'widget-icon-list' },
            { name: 'Video Embed', cat: 'Core', key: 'widget-video' },
            { name: 'FAQ Accordion', cat: 'Core', key: 'widget-faq' },
            { name: 'Location Map', cat: 'Core', key: 'widget-map' },
            { name: 'Doctors List (Live)', cat: 'MedVisit Dynamic', key: 'medvisit-doctors' },
            { name: 'Sessions This Week', cat: 'MedVisit Dynamic', key: 'medvisit-sessions' },
            { name: 'Book-a-Token Box', cat: 'MedVisit Dynamic', key: 'medvisit-book-token' },
            { name: 'Announcement Banner', cat: 'MedVisit Dynamic', key: 'medvisit-announcement' },
        ].filter((w) => w.name.toLowerCase().includes(q) || w.cat.toLowerCase().includes(q));
    }, [searchQuery]);

    return (
        <div className="h-screen w-screen flex flex-col bg-slate-900 text-slate-100 font-sans overflow-hidden select-none">
            <Head title={`Page Builder - ${tenant.name}`} />

            <style>{`
                /* GrapesJS Canvas Reset for 3-Panel Layout */
                .gjs-editor, .gjs-editor-c {
                    position: relative !important;
                    width: 100% !important;
                    height: 100% !important;
                    min-height: 100% !important;
                    background-color: #ffffff !important;
                }
                .gjs-cv-canvas {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    min-height: 100% !important;
                    background-color: #ffffff !important;
                }
                .gjs-cv-canvas__frames {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                }
                .gjs-frame-wrapper {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    right: 0 !important;
                    bottom: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                }
                .gjs-frame {
                    position: absolute !important;
                    top: 0 !important;
                    left: 0 !important;
                    width: 100% !important;
                    height: 100% !important;
                    min-height: 100% !important;
                    background-color: #ffffff !important;
                    border: none !important;
                }
                /* Custom GrapesJS Blocks & UI Theme */
                .gjs-block {
                    user-select: none !important;
                    background-color: rgba(255, 255, 255, 0.05) !important;
                    border: 1px solid rgba(255, 255, 255, 0.1) !important;
                    border-radius: 12px !important;
                    color: #f1f5f9 !important;
                    transition: all 0.15s ease-in-out !important;
                    padding: 10px 6px !important;
                    width: 48% !important;
                    margin: 1% !important;
                    text-align: center !important;
                }
                .gjs-block:hover {
                    background-color: rgba(14, 158, 143, 0.15) !important;
                    border-color: #0E9E8F !important;
                    transform: translateY(-2px) !important;
                }
                .gjs-block-category .gjs-title {
                    font-weight: 700 !important;
                    font-size: 11px !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.05em !important;
                    color: #94a3b8 !important;
                    padding: 10px 4px 6px 4px !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                }
                .gjs-layer {
                    color: #cbd5e1 !important;
                }
                .gjs-layer-name {
                    color: #f1f5f9 !important;
                    font-size: 11px !important;
                }
                .gjs-sm-sector .gjs-sm-sector-title {
                    background-color: rgba(255, 255, 255, 0.05) !important;
                    color: #f8fafc !important;
                    font-weight: 700 !important;
                    font-size: 11px !important;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
                }
                .gjs-sm-properties {
                    padding: 8px 4px !important;
                }
                .gjs-sm-property {
                    color: #94a3b8 !important;
                }
                .gjs-sm-property input, .gjs-sm-property select {
                    background-color: #0f172a !important;
                    border: 1px solid rgba(255, 255, 255, 0.15) !important;
                    color: #ffffff !important;
                    border-radius: 8px !important;
                }
            `}</style>

            {/* TOP BAR (Full Width Header) */}
            <TopBar
                editor={editor}
                tenant={tenant}
                isDirty={isDirty}
                lastSavedTime={lastSavedTime}
                currentDevice={currentDevice}
                saving={saving}
                saveState={saveState}
                onExit={handleExit}
                onSetDevice={setDevice}
                onOpenTemplates={() => setTemplatesModalOpen(true)}
                onOpenRevisions={() => {
                    fetchRevisions();
                    setRevisionsModalOpen(true);
                }}
                onSave={handleSave}
                pages={pagesList}
                page={page}
                previewHref={page.is_homepage ? '/preview' : `/preview/p/${page.slug}`}
                onSaveDraft={() => handleSave(false)}
                onWillNavigate={willNavigate}
                clinic={tenant}
                onOpenSiteSettings={kit ? () => setLeftPanelTab('site') : undefined}
                siteSettingsActive={leftPanelTab === 'site'}
            />

            {/* 3-PANEL WORKSPACE */}
            <div className="flex-1 flex overflow-hidden">
                {/* 1. LEFT PANEL: Widget Library & Structure Navigator (w-80) */}
                <aside className="w-80 bg-slate-950 border-r border-white/10 flex flex-col flex-shrink-0 z-20 overflow-hidden">
                    {/* Header Tabs: wrap instead of overflowing into the canvas */}
                    <div className="min-h-11 py-1 border-b border-white/10 bg-slate-900/50 px-2 flex items-center justify-between gap-1 flex-shrink-0 overflow-hidden">
                        <div className="flex flex-wrap items-center gap-1 min-w-0">
                            <button
                                type="button"
                                onClick={() => setLeftPanelTab('elements')}
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                    leftPanelTab === 'elements'
                                        ? 'bg-teal-600 text-white'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                title="Widgets Library"
                            >
                                <LayoutGrid className="w-3.5 h-3.5" />
                                <span>Widgets</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setLeftPanelTab('navigator')}
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                    leftPanelTab === 'navigator'
                                        ? 'bg-teal-600 text-white'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                title="DOM Layers"
                            >
                                <Layers className="w-3.5 h-3.5" />
                                <span>Layers</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setLeftPanelTab('header')}
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                    leftPanelTab === 'header'
                                        ? 'bg-teal-600 text-white'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                title="Shared Public Header Settings"
                            >
                                <PanelTop className="w-3.5 h-3.5" />
                                <span>Header</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setLeftPanelTab('footer')}
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                    leftPanelTab === 'footer'
                                        ? 'bg-teal-600 text-white'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                title="Shared Public Footer Settings"
                            >
                                <PanelBottom className="w-3.5 h-3.5" />
                                <span>Footer</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setLeftPanelTab('settings')}
                                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                                    leftPanelTab === 'settings'
                                        ? 'bg-teal-600 text-white'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                title="Clinic Theme & SEO"
                            >
                                <Settings className="w-3.5 h-3.5" />
                                <span>Theme</span>
                            </button>
                        </div>

                        {selectedTagName && (
                            <span className="font-mono text-[10px] font-bold text-teal-400 bg-teal-500/10 px-1 py-0.5 rounded border border-teal-500/20 truncate max-w-[60px]">
                                &lt;{selectedTagName}&gt;
                            </span>
                        )}
                    </div>

                    {/* Subcontent according to Tab */}
                    <WidgetsTab
                        editor={editor}
                        selectedComponent={selectedComponent}
                        isActive={leftPanelTab === 'elements'}
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                    />

                    <LayersTab
                        editor={editor}
                        selectedComponent={selectedComponent}
                        isActive={leftPanelTab === 'navigator'}
                    />
                    <div className={`flex-1 overflow-y-auto p-4 space-y-5 text-xs ${leftPanelTab === 'settings' ? '' : 'hidden'}`}>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2">
                                Clinic Theme Preset
                            </label>
                            <div className="space-y-2">
                                {themePresets.map((t) => (
                                    <div
                                        key={t.id}
                                        onClick={() => {
                                            setPageTheme(t.id);
                                            setIsDirty(true);
                                        }}
                                        className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                                            pageTheme === t.id
                                                ? 'bg-teal-500/10 border-teal-500 text-white'
                                                : 'bg-white/5 border-white/10 text-slate-300 hover:border-white/20'
                                        }`}
                                    >
                                        <div
                                            className="w-4 h-4 rounded-full mt-0.5 shrink-0 shadow-xs"
                                            style={{ backgroundColor: t.color }}
                                        />
                                        <div className="min-w-0">
                                            <p className="font-bold text-xs">{t.name}</p>
                                            <p className="text-[10px] text-slate-400 line-clamp-1">{t.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {kit && savedKit && (
                        <SiteSettingsTab
                            editor={editor}
                            isActive={leftPanelTab === 'site'}
                            kit={kit}
                            savedKit={savedKit}
                            onChange={setKit}
                            onSaved={(saved) => {
                                setKit(saved);
                                setSavedKit(saved);
                            }}
                        />
                    )}

                    <HeaderTab
                        editor={editor}
                        selectedComponent={selectedComponent}
                        isActive={leftPanelTab === 'header'}
                        headerConfig={headerConfig}
                        setHeaderConfig={setHeaderConfig}
                        setIsDirty={setIsDirty}
                        onOpenMedia={openMediaLibrary}
                        pages={pagesList}
                    />

                    <FooterTab
                        editor={editor}
                        selectedComponent={selectedComponent}
                        isActive={leftPanelTab === 'footer'}
                        footerConfig={footerConfig}
                        setFooterConfig={setFooterConfig}
                        setIsDirty={setIsDirty}
                        pages={pagesList}
                    />
                </aside>

                {/* 2. CENTER CANVAS: Live Interactive Frame with Responsive Preview */}
                <main className="flex-1 relative flex flex-col bg-slate-950 overflow-hidden">
                    {/* Device Header label if responsive */}
                    {currentDevice !== 'Desktop' && (
                        <div className="h-7 bg-slate-900 border-b border-white/10 text-slate-400 text-[11px] font-bold flex items-center justify-center gap-1.5 flex-shrink-0">
                            {currentDevice === 'Tablet' ? (
                                <>
                                    <Tablet className="w-3.5 h-3.5 text-teal-400" />
                                    <span>Tablet Simulation (768px Viewport)</span>
                                </>
                            ) : (
                                <>
                                    <Smartphone className="w-3.5 h-3.5 text-teal-400" />
                                    <span>Mobile Simulation (375px Viewport)</span>
                                </>
                            )}
                        </div>
                    )}

                    {/* Page label: opens page settings in the right panel */}
                    <div className="relative z-10 h-8 bg-slate-900 border-b border-white/10 px-3 flex items-center flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => setPageSettingsOpen((o) => !o)}
                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold transition-colors ${
                                pageSettingsOpen ? 'text-teal-400' : 'text-slate-400 hover:text-white'
                            }`}
                            title="Page settings"
                        >
                            <Settings className="w-3.5 h-3.5" />
                            <span>Page</span>
                            <span className="font-normal text-slate-500 truncate max-w-[240px]">{page.title}</span>
                        </button>
                    </div>

                    {/* Canvas Frame Container */}
                    <div className="flex-1 relative w-full h-full min-h-0 overflow-hidden flex justify-center items-stretch p-3 bg-slate-950">
                        <div
                            ref={editorRef}
                            id="gjs"
                            className="bg-white relative transition-all duration-300 w-full h-full flex flex-col"
                            style={{
                                maxWidth:
                                    currentDevice === 'Mobile'
                                        ? '375px'
                                        : currentDevice === 'Tablet'
                                        ? '768px'
                                        : '100%',
                                height: '100%',
                                minHeight: '100%',
                                boxShadow: currentDevice !== 'Desktop' ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' : 'none',
                                borderRadius: currentDevice !== 'Desktop' ? '16px' : '0px',
                                overflow: 'hidden',
                                border: currentDevice !== 'Desktop' ? '2px solid rgba(255, 255, 255, 0.2)' : 'none',
                            }}
                        />
                    </div>
                </main>

                {/* 3. RIGHT PANEL: Component Properties Inspector (w-72) */}
                {pageSettingsOpen ? (
                    <PageSettings
                        page={
                            pagesList.find((p) => p.id === page.id) ?? {
                                id: page.id,
                                title: page.title,
                                slug: page.slug,
                                url: page.public_url ?? '',
                                is_homepage: !!page.is_homepage,
                                is_published: page.is_published,
                                has_unpublished_changes: false,
                                updated_at: null,
                                sort_order: 0,
                                seo_title: page.seo_title ?? null,
                                seo_description: page.seo_description ?? null,
                            }
                        }
                        onClose={() => setPageSettingsOpen(false)}
                        onSaved={handlePageSaved}
                    />
                ) : (
                <KitContext.Provider value={kit}>
                    <Inspector
                        editor={editor}
                        selectedComponent={selectedComponent}
                        selectedTagName={selectedTagName}
                        selectedWidgetName={selectedWidgetName}
                        inspectorTab={inspectorTab}
                        setInspectorTab={setInspectorTab}
                        setSelectedComponent={setSelectedComponent}
                        setIsDirty={setIsDirty}
                        onOpenMedia={openMediaLibrary}
                    />
                </KitContext.Provider>
                )}
            </div>

            {/* MODALS */}

            {/* 1. Media Library Modal */}
            <MediaLibraryModal
                isOpen={mediaModalOpen}
                onClose={() => {
                    mediaPickRef.current = null;
                    setMediaModalOpen(false);
                }}
                onSelect={(url) => {
                    if (mediaPickRef.current) {
                        mediaPickRef.current(url);
                        mediaPickRef.current = null;
                        setMediaModalOpen(false);
                        return;
                    }
                    if (selectedComponent && selectedTagName === 'IMG') {
                        selectedComponent.set('src', url);
                        setIsDirty(true);
                    }
                    setMediaModalOpen(false);
                }}
                currentValue={mediaCurrentValue}
                title="Clinic Media Library"
                tenant={tenant}
            />

            {/* 2. Ready-Made Templates Modal */}
            {templatesModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-3xl bg-slate-900 rounded-2xl border border-white/10 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-teal-400" />
                                    Choose Ready-Made Page Template
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Select a professional layout to instantly populate your clinic homepage.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setTemplatesModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                            {/* Template 1 */}
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between hover:border-teal-500 transition-colors">
                                <div>
                                    <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center mb-2.5 font-bold">
                                        01
                                    </div>
                                    <h4 className="font-bold text-sm text-white">Modern Clinic</h4>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Full-featured layout with hero, announcement banner, live doctors roster, and services.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => loadTemplate('modern-clinic')}
                                    className="mt-4 w-full py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold transition-colors"
                                >
                                    Load Template
                                </button>
                            </div>

                            {/* Template 2 */}
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between hover:border-teal-500 transition-colors">
                                <div>
                                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-2.5 font-bold">
                                        02
                                    </div>
                                    <h4 className="font-bold text-sm text-white">Specialist Center</h4>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Focuses on consultant credentials, specialty chambers, and weekly channeling schedules.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => loadTemplate('specialist-center')}
                                    className="mt-4 w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition-colors"
                                >
                                    Load Template
                                </button>
                            </div>

                            {/* Template 3 */}
                            <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between hover:border-teal-500 transition-colors">
                                <div>
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-2.5 font-bold">
                                        03
                                    </div>
                                    <h4 className="font-bold text-sm text-white">Family Practice</h4>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Warm community medical center with pediatric, pharmacy, and laboratory features.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => loadTemplate('family-practice')}
                                    className="mt-4 w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors"
                                >
                                    Load Template
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Revisions History Modal */}
            {revisionsModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-xl bg-slate-900 rounded-2xl border border-white/10 p-6 shadow-2xl space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-white/10">
                            <div>
                                <h3 className="text-base font-bold text-white flex items-center gap-2">
                                    <History className="w-4 h-4 text-teal-400" />
                                    Revision History
                                </h3>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Restore your clinic homepage to any previous save or publication snapshot.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRevisionsModalOpen(false)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                            {revisionsList.length === 0 ? (
                                <p className="text-center py-8 text-xs text-slate-500">
                                    No revisions recorded yet. Save or publish to create snapshots.
                                </p>
                            ) : (
                                revisionsList.map((rev) => (
                                    <div
                                        key={rev.id}
                                        className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between gap-4"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs text-white">
                                                    Version #{rev.version_number}
                                                </span>
                                                <span className="text-[10px] text-teal-400 font-semibold px-2 py-0.5 rounded-full bg-teal-500/10">
                                                    {rev.summary}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-400 mt-0.5">
                                                By {rev.user_name} • {rev.created_at_formatted} ({rev.created_at_relative})
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            disabled={revertingRevision === rev.id}
                                            onClick={() => handleRestoreRevision(rev)}
                                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
                                        >
                                            {revertingRevision === rev.id && (
                                                <RefreshCw className="w-3 h-3 animate-spin" />
                                            )}
                                            <span>Restore</span>
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Notice toast */}
            {notice && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-xl bg-slate-800 border border-white/15 text-xs font-bold text-white shadow-2xl">
                    {notice}
                </div>
            )}

            {/* 4. Unsaved Changes Exit Prompt */}
            {exitModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-slate-900 rounded-2xl border border-white/10 p-6 shadow-2xl text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 mx-auto flex items-center justify-center">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-white">Unsaved Changes Detected</h3>
                            <p className="text-xs text-slate-400 mt-1">
                                You have modifications that have not been published yet. Do you want to save your work before exiting?
                            </p>
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    willNavigate();
                                    router.visit('/website');
                                }}
                                className="flex-1 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:bg-white/5"
                            >
                                Discard &amp; Exit
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (await handleSave(false)) {
                                        willNavigate();
                                        router.visit('/website');
                                    }
                                }}
                                className="flex-1 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white"
                            >
                                Save &amp; Exit
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
