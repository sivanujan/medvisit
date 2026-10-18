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
import { kitToCss } from '@/Components/PageBuilder/lib/kit';
import { googleFontsUrl, usedFontFamilies } from '@/Components/PageBuilder/lib/fonts';
import MediaLibraryModal from '@/Components/PageBuilder/MediaLibraryModal';
import TopBar from '@/Components/PageBuilder/TopBar';
import WidgetsTab from '@/Components/PageBuilder/LeftPanel/WidgetsTab';
import LayersTab from '@/Components/PageBuilder/LeftPanel/LayersTab';
import HeaderTab from '@/Components/PageBuilder/LeftPanel/HeaderTab';
import FooterTab from '@/Components/PageBuilder/LeftPanel/FooterTab';
import Inspector from '@/Components/PageBuilder/Inspector/Inspector';
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
    Revision,
    SaveState,
} from '@/Components/PageBuilder/types';
import { getMedicalSvg } from '@/Utils/medicalIcons';

export default function PageBuilder({
    tenant,
    page,
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

    const [saving, setSaving] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>(null);
    const [isDirty, setIsDirty] = useState(false);
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
    const [revisionsModalOpen, setRevisionsModalOpen] = useState(false);
    const [revisionsList, setRevisionsList] = useState<Revision[]>(initialRevisions);
    const [revertingRevision, setRevertingRevision] = useState<number | null>(null);
    const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
    const [exitModalOpen, setExitModalOpen] = useState(false);

    // Page settings state
    const [pageTheme, setPageTheme] = useState(page.theme_preset || 'medvisit-teal');
    const [seoTitle, setSeoTitle] = useState(page.seo_title || `${tenant.name} - Specialist Channeling`);
    const [seoDescription, setSeoDescription] = useState(
        page.seo_description || `Book doctor channeling sessions online at ${tenant.name}.`
    );

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
                : getTemplateHtml('modern-clinic');
        const initialCss = cssBase + (page.css ? '\n' + page.css : '');

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
            selectorManager: { appendTo: '#builder-selectors-container' },
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
            setIsDirty(true);
        };
        editor.on('component:update', markDirty);
        editor.on('component:add', markDirty);
        editor.on('component:remove', markDirty);
        editor.on('style:update', markDirty);

        // Ensure canvas renders on load
        editor.on('load', () => {
            if (!editor.getHtml() || editor.getHtml().trim() === '<body></body>') {
                editor.setComponents(initialHtml);
            }
            editor.setStyle(initialCss);
            const canvasDoc = editor.Canvas.getDocument();
            if (siteKit && canvasDoc) {
                const kitStyle = canvasDoc.createElement('style');
                kitStyle.id = 'mv-kit';
                kitStyle.textContent = kitToCss(siteKit);
                canvasDoc.head.appendChild(kitStyle);
                const fontsUrl = googleFontsUrl(usedFontFamilies(siteKit, initialCss));
                if (fontsUrl) {
                    const fontLink = canvasDoc.createElement('link');
                    fontLink.id = 'mv-fonts';
                    fontLink.rel = 'stylesheet';
                    fontLink.href = fontsUrl;
                    canvasDoc.head.appendChild(fontLink);
                }
            }
            editor.refresh();
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
    // Helper to generate full HTML templates
    const getTemplateHtml = (templateId: string): string => {
        if (templateId === 'specialist-center') {
            return `
                <!-- Specialist Suites Header -->
                <header style="background: #0f172a; border-bottom: 1px solid #1e293b; padding: 16px 24px; position: sticky; top: 0; z-index: 100;">
                    <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${
                                tenant.logo_url
                                    ? `<img src="${tenant.logo_url}" alt="${tenant.name}" style="height: 38px; border-radius: 8px;" />`
                                    : `<div style="width: 40px; height: 40px; border-radius: 10px; background: #7C3AED; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px;">${tenant.name.charAt(0)}</div>`
                            }
                            <div>
                                <span style="font-size: 1.25rem; font-weight: 800; color: #ffffff; display: block; line-height: 1.2;">${tenant.name}</span>
                                <span style="font-size: 0.75rem; color: #a78bfa; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Consultant Specialist Suites</span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 20px;">
                            <span style="color: #cbd5e1; font-size: 0.85rem; font-weight: 600;">Direct Channeling: ${tenant.phone || '+94 11 234 5678'}</span>
                            <a href="/book" style="background: #7C3AED; color: #ffffff; padding: 12px 24px; border-radius: 10px; font-size: 0.85rem; font-weight: 700; text-decoration: none; box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);">
                                Book Consultant Chamber →
                            </a>
                        </div>
                    </div>
                </header>

                <!-- Specialist Hero -->
                <section class="medvisit-section" style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%); padding: 90px 20px; color: #ffffff;">
                    <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto; text-align: center;">
                        <span style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 18px; background: rgba(124, 58, 237, 0.2); border: 1px solid rgba(167, 139, 250, 0.3); color: #c4b5fd; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 24px;">
                            ★ Premier Medical Specialist Chambers • SLMC Accredited
                        </span>
                        <h1 style="font-size: 3.25rem; font-weight: 800; color: #ffffff; line-height: 1.15; margin: 0 auto 24px auto; max-width: 900px;">
                            Sri Lanka's Leading Medical Specialists Under One Roof
                        </h1>
                        <p style="font-size: 1.2rem; color: #94a3b8; line-height: 1.7; max-width: 750px; margin: 0 auto 40px auto;">
                            Consult senior hospital consultants in private clinical chambers with real-time queue synchronization. Zero lounge congestion and guaranteed consultation tokens.
                        </p>
                        <div style="display: flex; justify-content: center; gap: 16px; flex-wrap: wrap;">
                            <a href="/book" style="background: #7C3AED; color: #ffffff; padding: 16px 36px; border-radius: 12px; font-size: 1rem; font-weight: 700; text-decoration: none; box-shadow: 0 6px 20px rgba(124, 58, 237, 0.4);">
                                Reserve Channeling Token
                            </a>
                            <a href="#chambers" style="background: rgba(255, 255, 255, 0.05); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.2); padding: 16px 28px; border-radius: 12px; font-size: 1rem; font-weight: 700; text-decoration: none;">
                                View Specialty Chambers
                            </a>
                        </div>
                    </div>
                </section>

                <!-- Chambers Grid -->
                <section id="chambers" class="medvisit-section" style="background: #ffffff; padding: 80px 20px;">
                    <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto;">
                        <div style="text-align: center; max-width: 650px; margin: 0 auto 48px auto;">
                            <span style="font-size: 0.8rem; font-weight: 700; color: #7C3AED; text-transform: uppercase; letter-spacing: 0.05em;">Clinical Divisions</span>
                            <h2 style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 8px 0 12px 0;">Specialized Consultation Chambers</h2>
                            <p style="color: #64748b; font-size: 1rem; margin: 0;">Comprehensive outpatient care covering major adult and pediatric medical sub-specialties.</p>
                        </div>
                        <div class="medvisit-grid-3" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
                            <div style="padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background: #faf5ff; text-align: left;">
                                <div style="margin-bottom: 14px; color: #7C3AED;">${getMedicalSvg('HeartPulse', { size: 36, color: '#7C3AED' })}</div>
                                <h4 style="margin: 0 0 6px 0; font-size: 1.2rem; font-weight: 700; color: #0f172a;">Cardiology &amp; Cardiac Health</h4>
                                <p style="color: #64748b; font-size: 0.85rem; margin: 0 0 16px 0;">Echocardiography, ECG, cardiac risk profiles, and hypertension management.</p>
                                <a href="/book" style="color: #7C3AED; font-weight: 700; font-size: 0.85rem; text-decoration: none;">Book Cardiologist →</a>
                            </div>
                            <div style="padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background: #f0fdf4; text-align: left;">
                                <div style="margin-bottom: 14px; color: #059669;">${getMedicalSvg('Brain', { size: 36, color: '#059669' })}</div>
                                <h4 style="margin: 0 0 6px 0; font-size: 1.2rem; font-weight: 700; color: #0f172a;">Neurology &amp; Neuro-Medicine</h4>
                                <p style="color: #64748b; font-size: 0.85rem; margin: 0 0 16px 0;">Stroke assessment, headache clinics, migraine therapy, and peripheral nerve diagnostics.</p>
                                <a href="/book" style="color: #059669; font-weight: 700; font-size: 0.85rem; text-decoration: none;">Book Neurologist →</a>
                            </div>
                            <div style="padding: 28px; border: 1px solid #e2e8f0; border-radius: 20px; background: #eff6ff; text-align: left;">
                                <div style="margin-bottom: 14px; color: #2563eb;">${getMedicalSvg('Activity', { size: 36, color: '#2563eb' })}</div>
                                <h4 style="margin: 0 0 6px 0; font-size: 1.2rem; font-weight: 700; color: #0f172a;">Orthopaedics &amp; Joint Surgery</h4>
                                <p style="color: #64748b; font-size: 0.85rem; margin: 0 0 16px 0;">Arthritis clinics, joint injections, sports trauma recovery, and spine evaluations.</p>
                                <a href="/book" style="color: #2563eb; font-weight: 700; font-size: 0.85rem; text-decoration: none;">Book Orthopaedic →</a>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Fast-track Token CTA -->
                <section class="medvisit-section" style="background: #7C3AED; padding: 70px 20px; color: #ffffff;">
                    <div class="medvisit-container" style="max-width: 900px; margin: 0 auto; text-align: center;">
                        <h2 style="font-size: 2.25rem; font-weight: 800; margin: 0 0 16px 0;">Fast-Track Consultation Tokens</h2>
                        <p style="font-size: 1.05rem; opacity: 0.9; margin: 0 0 28px 0;">Reserve an exact consultation token and track live doctor arrivals from your mobile phone.</p>
                        <a href="/book" style="display: inline-block; background: #ffffff; color: #7C3AED; padding: 14px 36px; border-radius: 12px; font-size: 1rem; font-weight: 800; text-decoration: none; box-shadow: 0 6px 20px rgba(0,0,0,0.2);">
                            Book Channeling Appointment →
                        </a>
                    </div>
                </section>

                <!-- Footer -->
                <footer style="background: #0f172a; color: #94a3b8; padding: 60px 20px 30px 20px; font-size: 0.9rem;">
                    <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-bottom: 40px;">
                        <div>
                            <h3 style="color: #ffffff; font-size: 1.15rem; font-weight: 700; margin: 0 0 12px 0;">${tenant.name}</h3>
                            <p style="line-height: 1.6; margin: 0 0 16px 0;">${tenant.address || 'Specialist Hospital Suites, Colombo, Sri Lanka'}</p>
                            <p style="margin: 0;">Hotline: <strong style="color: #ffffff;">${tenant.phone || '+94 11 234 5678'}</strong></p>
                        </div>
                        <div>
                            <h4 style="color: #ffffff; font-size: 1rem; font-weight: 700; margin: 0 0 12px 0;">Consultant Hours</h4>
                            <p style="margin: 0 0 6px 0;">Daily: 08:00 AM – 10:00 PM</p>
                            <p style="margin: 0;">Emergency Outpatient Desk: 24/7 Active</p>
                        </div>
                        <div>
                            <h4 style="color: #ffffff; font-size: 1rem; font-weight: 700; margin: 0 0 12px 0;">Quick Links</h4>
                            <p style="margin: 0 0 8px 0;"><a href="/book" style="color: #a78bfa; text-decoration: none; font-weight: 700;">Book Channeling Online</a></p>
                            <p style="margin: 0 0 8px 0;"><a href="/login" style="color: #94a3b8; text-decoration: none;">Staff Workspace</a></p>
                            <p style="margin: 0;"><a href="/clinic/live-queue" style="color: #94a3b8; text-decoration: none;">Live Waiting Queue</a></p>
                        </div>
                    </div>
                    <div style="max-width: 1200px; margin: 0 auto; border-top: 1px solid #1e293b; padding-top: 24px; text-align: center; font-size: 0.8rem; color: #64748b;">
                        © ${new Date().getFullYear()} ${tenant.name}. Powered by MedVisit.
                    </div>
                </footer>
            `;
        }

        if (templateId === 'family-practice') {
            return `
                <!-- Family Practice Header -->
                <header style="background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; position: sticky; top: 0; z-index: 100;">
                    <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            ${
                                tenant.logo_url
                                    ? `<img src="${tenant.logo_url}" alt="${tenant.name}" style="height: 38px; border-radius: 8px;" />`
                                    : `<div style="width: 40px; height: 40px; border-radius: 10px; background: #059669; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px;">${tenant.name.charAt(0)}</div>`
                            }
                            <div>
                                <span style="font-size: 1.25rem; font-weight: 800; color: #0f172a; display: block; line-height: 1.2;">${tenant.name}</span>
                                <span style="font-size: 0.75rem; color: #059669; font-weight: 700;">Family Medical &amp; Preventive Clinic</span>
                            </div>
                        </div>
                        <div style="display: flex; align-items: center; gap: 16px;">
                            <span style="color: #475569; font-size: 0.85rem; font-weight: 600;">Clinic Hotline: ${tenant.phone || '+94 11 234 5678'}</span>
                            <a href="/book" style="background: #059669; color: #ffffff; padding: 10px 22px; border-radius: 10px; font-size: 0.85rem; font-weight: 700; text-decoration: none; box-shadow: 0 4px 10px rgba(5, 150, 105, 0.25);">
                                Book Appointment
                            </a>
                        </div>
                    </div>
                </header>

                <!-- Family Practice Hero -->
                <section class="medvisit-section" style="background: linear-gradient(180deg, #ecfdf5 0%, #ffffff 100%); padding: 80px 20px;">
                    <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto; text-align: center;">
                        <span style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; background: #d1fae5; color: #065f46; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 20px;">
                            ✦ Caring for All Generations • Open 7 Days a Week
                        </span>
                        <h1 style="font-size: 3rem; font-weight: 800; color: #0f172a; line-height: 1.2; margin: 0 auto 20px auto; max-width: 850px;">
                            Compassionate Healthcare for Your Entire Family
                        </h1>
                        <p style="font-size: 1.15rem; color: #475569; line-height: 1.7; max-width: 700px; margin: 0 auto 36px auto;">
                            From newborn health checks and routine family medicine to senior chronic care and certified outpatient lab tests.
                        </p>
                        <div style="display: flex; justify-content: center; gap: 14px; flex-wrap: wrap;">
                            <a href="/book" style="background: #059669; color: #ffffff; padding: 16px 36px; border-radius: 12px; font-size: 1rem; font-weight: 700; text-decoration: none; box-shadow: 0 6px 20px rgba(5, 150, 105, 0.35);">
                                Schedule a Doctor Visit
                            </a>
                            <a href="#services" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 16px 28px; border-radius: 12px; font-size: 1rem; font-weight: 700; text-decoration: none;">
                                Our Family Services
                            </a>
                        </div>
                    </div>
                </section>

                <!-- Services Grid -->
                <section id="services" class="medvisit-section" style="background: #ffffff; padding: 70px 20px;">
                    <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto;">
                        <div style="text-align: center; max-width: 600px; margin: 0 auto 48px auto;">
                            <h2 style="font-size: 2.2rem; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">Primary &amp; Preventive Care</h2>
                            <p style="color: #64748b; font-size: 1rem; margin: 0;">Comprehensive clinical support tailored for patients of every age.</p>
                        </div>
                        <div class="medvisit-grid-4" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                            <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
                                <div style="margin-bottom: 12px; color: #059669;">${getMedicalSvg('Baby', { size: 32, color: '#059669' })}</div>
                                <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Child Health &amp; Vaccines</h4>
                                <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Growth monitoring, pediatric wellness, and immunization schedules.</p>
                            </div>
                            <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
                                <div style="margin-bottom: 12px; color: #059669;">${getMedicalSvg('Stethoscope', { size: 32, color: '#059669' })}</div>
                                <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">General Consultations</h4>
                                <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Experienced family physicians for acute fever, infections, and common illnesses.</p>
                            </div>
                            <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
                                <div style="margin-bottom: 12px; color: #059669;">${getMedicalSvg('Droplet', { size: 32, color: '#059669' })}</div>
                                <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Diabetes &amp; Chronic Care</h4>
                                <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Regular glucose screening, blood pressure monitoring, and prescription renewals.</p>
                            </div>
                            <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
                                <div style="margin-bottom: 12px; color: #059669;">${getMedicalSvg('FlaskConical', { size: 32, color: '#059669' })}</div>
                                <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Diagnostic Laboratory</h4>
                                <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Complete blood count, urine analysis, and rapid same-day test results.</p>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Book Token Banner -->
                <section class="medvisit-section" style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 60px 20px; color: #ffffff;">
                    <div class="medvisit-container" style="max-width: 900px; margin: 0 auto; text-align: center;">
                        <h2 style="font-size: 2.2rem; font-weight: 800; margin: 0 0 16px 0;">Reserve Your Token Online Before Leaving Home</h2>
                        <p style="font-size: 1rem; opacity: 0.9; margin: 0 0 28px 0;">Avoid crowded waiting rooms with live digital queuing.</p>
                        <a href="/book" style="display: inline-block; background: #ffffff; color: #059669; padding: 14px 36px; border-radius: 12px; font-size: 1rem; font-weight: 800; text-decoration: none;">
                            Book Token Now →
                        </a>
                    </div>
                </section>

                <!-- Footer -->
                <footer style="background: #0f172a; color: #94a3b8; padding: 50px 20px 30px 20px; font-size: 0.9rem;">
                    <div style="max-width: 1200px; margin: 0 auto; text-align: center;">
                        <h3 style="color: #ffffff; font-size: 1.2rem; font-weight: 700; margin: 0 0 8px 0;">${tenant.name}</h3>
                        <p style="margin: 0 0 16px 0;">${tenant.address || 'Colombo, Sri Lanka'} • Tel: ${tenant.phone || '+94 11 234 5678'}</p>
                        <p style="font-size: 0.8rem; color: #64748b; margin: 0;">© ${new Date().getFullYear()} ${tenant.name}. Powered by MedVisit.</p>
                    </div>
                </footer>
            `;
        }

        // Default: modern-clinic
        return `
            <!-- Navbar -->
            <header style="background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 16px 24px; position: sticky; top: 0; z-index: 100;">
                <div style="max-width: 1200px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${
                            tenant.logo_url
                                ? `<img src="${tenant.logo_url}" alt="${tenant.name}" style="height: 36px; border-radius: 8px;" />`
                                : `<div style="width: 36px; height: 36px; border-radius: 8px; background: #0E9E8F; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 18px;">${tenant.name.charAt(0)}</div>`
                        }
                        <div>
                            <span style="font-size: 1.15rem; font-weight: 800; color: #0f172a; display: block; line-height: 1.2;">${tenant.name}</span>
                            <span style="font-size: 0.75rem; color: #0E9E8F; font-weight: 600;">Specialist Medical Center</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <span style="color: #475569; font-size: 0.85rem; font-weight: 600;">Hotline: ${tenant.phone || '+94 11 234 5678'}</span>
                        <a href="/book" style="background: #0E9E8F; color: #ffffff; padding: 10px 20px; border-radius: 10px; font-size: 0.85rem; font-weight: 700; text-decoration: none; box-shadow: 0 4px 10px rgba(14, 158, 143, 0.25);">
                            Book Token Online
                        </a>
                    </div>
                </div>
            </header>

            <!-- Hero Section -->
            <section class="medvisit-section" style="background: linear-gradient(180deg, #f0fdfa 0%, #ffffff 100%); padding: 80px 20px;">
                <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto; text-align: center;">
                    <span style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 16px; background: #ccfbf1; color: #0f766e; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 20px;">
                        ✦ Open Daily • SLMC Verified Specialist Channeling
                    </span>
                    <h1 style="font-size: 3rem; font-weight: 800; color: #0f172a; line-height: 1.15; margin: 0 auto 20px auto; max-width: 850px;">
                        Compassionate Care, Specialist Excellence
                    </h1>
                    <p style="font-size: 1.15rem; color: #475569; line-height: 1.7; max-width: 700px; margin: 0 auto 36px auto;">
                        Consult top Sri Lankan medical specialists with live digital queue tracking. Reserve your token online and avoid waiting lounge congestion.
                    </p>
                    <div style="display: flex; justify-content: center; gap: 14px; flex-wrap: wrap;">
                        <a href="/book" style="background: #0E9E8F; color: #ffffff; padding: 16px 36px; border-radius: 14px; font-size: 1.05rem; font-weight: 700; text-decoration: none; box-shadow: 0 6px 20px rgba(14, 158, 143, 0.35);">
                            Book Appointment Online
                        </a>
                        <a href="#services" style="background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 16px 28px; border-radius: 14px; font-size: 1.05rem; font-weight: 700; text-decoration: none;">
                            Explore Clinical Services
                        </a>
                    </div>
                </div>
            </section>

            <!-- Announcement Banner -->
            <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
                <div style="background: #ecfdf5; border: 1px solid #a7f3d0; padding: 16px 24px; border-radius: 16px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="display: flex; align-items: center; color: #065f46;">${getMedicalSvg('Hospital', { size: 22, color: '#065f46' })}</span>
                        <span style="font-size: 0.9rem; font-weight: 600; color: #065f46;">
                            Real-Time Waiting Room Queue Monitoring is active for all current doctor sessions.
                        </span>
                    </div>
                    <a href="/book" style="color: #047857; font-weight: 700; font-size: 0.85rem; text-decoration: underline;">
                        Book Token →
                    </a>
                </div>
            </div>

            <!-- Doctors Roster -->
            <section class="medvisit-section" style="background: #ffffff; padding: 80px 20px;">
                <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto;">
                    <div style="text-align: center; max-width: 600px; margin: 0 auto 48px auto;">
                        <span style="font-size: 0.8rem; font-weight: 700; color: #0E9E8F; text-transform: uppercase;">Medical Practitioners</span>
                        <h2 style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 8px 0 12px 0;">Meet Our Medical Specialists</h2>
                        <p style="color: #64748b; font-size: 1rem; margin: 0;">Board certified consultants practicing at our modern medical center.</p>
                    </div>
                    <div class="medvisit-grid-3" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;">
                        <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 20px; background: #ffffff; text-align: center;">
                            <div style="width: 72px; height: 72px; border-radius: 50%; background: #ccfbf1; color: #0E9E8F; font-size: 28px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">S</div>
                            <h4 style="margin: 0 0 4px 0; font-size: 1.2rem; font-weight: 700; color: #0f172a;">Dr. Priyantha Silva</h4>
                            <span style="display: inline-block; padding: 4px 12px; background: #f0fdfa; color: #0f766e; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 12px;">Consultant Physician</span>
                            <p style="color: #64748b; font-size: 0.85rem; margin: 0 0 16px 0;">Specialized in adult internal medicine, diabetes management, and preventive wellness.</p>
                            <a href="/book" style="display: block; width: 100%; padding: 10px; background: #0E9E8F; color: #ffffff; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 0.9rem;">Book Token</a>
                        </div>
                        <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 20px; background: #ffffff; text-align: center;">
                            <div style="width: 72px; height: 72px; border-radius: 50%; background: #ccfbf1; color: #0E9E8F; font-size: 28px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">A</div>
                            <h4 style="margin: 0 0 4px 0; font-size: 1.2rem; font-weight: 700; color: #0f172a;">Dr. Anoma Jayawardena</h4>
                            <span style="display: inline-block; padding: 4px 12px; background: #f0fdfa; color: #0f766e; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 12px;">Consultant Paediatrician</span>
                            <p style="color: #64748b; font-size: 0.85rem; margin: 0 0 16px 0;">Expert pediatric care, newborn screening, and child growth and immunization.</p>
                            <a href="/book" style="display: block; width: 100%; padding: 10px; background: #0E9E8F; color: #ffffff; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 0.9rem;">Book Token</a>
                        </div>
                        <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 20px; background: #ffffff; text-align: center;">
                            <div style="width: 72px; height: 72px; border-radius: 50%; background: #ccfbf1; color: #0E9E8F; font-size: 28px; font-weight: 800; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px auto;">R</div>
                            <h4 style="margin: 0 0 4px 0; font-size: 1.2rem; font-weight: 700; color: #0f172a;">Dr. Rohan Senanayake</h4>
                            <span style="display: inline-block; padding: 4px 12px; background: #f0fdfa; color: #0f766e; border-radius: 9999px; font-size: 0.8rem; font-weight: 700; margin-bottom: 12px;">Consultant Cardiologist</span>
                            <p style="color: #64748b; font-size: 0.85rem; margin: 0 0 16px 0;">Cardiac assessment, digital ECG interpretation, and cardiovascular health management.</p>
                            <a href="/book" style="display: block; width: 100%; padding: 10px; background: #0E9E8F; color: #ffffff; border-radius: 10px; font-weight: 700; text-decoration: none; font-size: 0.9rem;">Book Token</a>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Clinical Services Section -->
            <section id="services" class="medvisit-section" style="background: #f8fafc; padding: 80px 20px;">
                <div class="medvisit-container" style="max-width: 1200px; margin: 0 auto;">
                    <div style="text-align: center; max-width: 600px; margin: 0 auto 48px auto;">
                        <span style="font-size: 0.8rem; font-weight: 700; color: #0E9E8F; text-transform: uppercase;">Comprehensive Care</span>
                        <h2 style="font-size: 2.25rem; font-weight: 800; color: #0f172a; margin: 8px 0 12px 0;">Our Clinical Services</h2>
                        <p style="color: #64748b; font-size: 1rem; margin: 0;">Full outpatient diagnostics and pharmacy services under one roof.</p>
                    </div>
                    <div class="medvisit-grid-4" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
                        <div style="padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; text-align: left;">
                            <div style="margin-bottom: 12px; color: #0E9E8F;">${getMedicalSvg('Stethoscope', { size: 32, color: '#0E9E8F' })}</div>
                            <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Specialist Channeling</h4>
                            <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Direct consultations with verified senior SLMC specialist doctors.</p>
                        </div>
                        <div style="padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; text-align: left;">
                            <div style="margin-bottom: 12px; color: #0E9E8F;">${getMedicalSvg('FlaskConical', { size: 32, color: '#0E9E8F' })}</div>
                            <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Clinical Laboratory</h4>
                            <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Automated blood screening, biochemistry, and rapid diagnostic tests.</p>
                        </div>
                        <div style="padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; text-align: left;">
                            <div style="margin-bottom: 12px; color: #0E9E8F;">${getMedicalSvg('HeartPulse', { size: 32, color: '#0E9E8F' })}</div>
                            <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Digital ECG &amp; Vitals</h4>
                            <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Rapid cardiovascular monitoring and doctor-certified reports.</p>
                        </div>
                        <div style="padding: 24px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; text-align: left;">
                            <div style="margin-bottom: 12px; color: #0E9E8F;">${getMedicalSvg('Pill', { size: 32, color: '#0E9E8F' })}</div>
                            <h4 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700; color: #0f172a;">Certified Pharmacy</h4>
                            <p style="color: #64748b; font-size: 0.85rem; margin: 0;">Licensed pharmaceuticals and experienced pharmacist counseling.</p>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Book Token Banner -->
            <section class="medvisit-section" style="background: linear-gradient(135deg, #0E9E8F 0%, #065f46 100%); padding: 70px 20px; color: #ffffff;">
                <div class="medvisit-container" style="max-width: 900px; margin: 0 auto; text-align: center;">
                    <h2 style="font-size: 2.5rem; font-weight: 800; margin: 0 0 16px 0;">Reserve Your Channeling Token Online</h2>
                    <p style="font-size: 1.1rem; opacity: 0.9; margin: 0 0 32px 0;">Experience peaceful doctor consultations with our atomic queue number system.</p>
                    <a href="/book" style="display: inline-block; background: #ffffff; color: #0E9E8F; padding: 16px 40px; border-radius: 14px; font-size: 1.1rem; font-weight: 800; text-decoration: none; box-shadow: 0 6px 20px rgba(0,0,0,0.2);">
                        Book Appointment Now →
                    </a>
                </div>
            </section>

            <!-- Footer -->
            <footer style="background: #0f172a; color: #94a3b8; padding: 60px 20px 30px 20px; font-size: 0.9rem;">
                <div style="max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; margin-bottom: 40px;">
                    <div>
                        <h3 style="color: #ffffff; font-size: 1.15rem; font-weight: 700; margin: 0 0 12px 0;">${tenant.name}</h3>
                        <p style="line-height: 1.6; margin: 0 0 16px 0;">${tenant.address || 'Colombo, Sri Lanka'}</p>
                        <p style="margin: 0;">Hotline: <strong style="color: #ffffff;">${tenant.phone || '+94 11 234 5678'}</strong></p>
                    </div>
                    <div>
                        <h4 style="color: #ffffff; font-size: 1rem; font-weight: 700; margin: 0 0 12px 0;">Clinical Hours</h4>
                        <p style="margin: 0 0 6px 0;">Monday – Friday: 07:30 AM – 10:00 PM</p>
                        <p style="margin: 0 0 6px 0;">Saturday: 07:30 AM – 10:00 PM</p>
                        <p style="margin: 0;">Sunday: 08:00 AM – 08:00 PM</p>
                    </div>
                    <div>
                        <h4 style="color: #ffffff; font-size: 1rem; font-weight: 700; margin: 0 0 12px 0;">Quick Navigation</h4>
                        <p style="margin: 0 0 8px 0;"><a href="/book" style="color: #0E9E8F; text-decoration: none; font-weight: 700;">Book Token Online</a></p>
                        <p style="margin: 0 0 8px 0;"><a href="/login" style="color: #94a3b8; text-decoration: none;">Staff Workspace Login</a></p>
                        <p style="margin: 0;"><a href="/clinic/live-queue" style="color: #94a3b8; text-decoration: none;">Live Waiting Queue</a></p>
                    </div>
                </div>
                <div style="max-width: 1200px; margin: 0 auto; border-top: 1px solid #1e293b; padding-top: 24px; text-align: center; font-size: 0.8rem; color: #64748b;">
                    © ${new Date().getFullYear()} ${tenant.name}. Certified by Ministry of Health &amp; PHSRC Sri Lanka. Powered by MedVisit.
                </div>
            </footer>
        `;
    };

    // Load Ready-Made Templates
    const loadTemplate = (templateId: string, editorInstanceParam?: any) => {
        const editor = editorInstanceParam || editorInstance.current;
        if (!editor) return;

        const templateHtml = getTemplateHtml(templateId);
        editor.setComponents(templateHtml);
        editor.refresh();
        setIsDirty(true);
        setTemplatesModalOpen(false);
    };

    // Save Page Draft (Manual or Autosave)
    const handleSave = async (isPublish = false) => {
        if (!editorInstance.current) return;
        setSaving(true);
        setSaveState(null);

        const html = editorInstance.current.getHtml();
        const css = editorInstance.current.getCss();
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
                    seo_title: seoTitle,
                    seo_description: seoDescription,
                    header_config: headerConfig,
                    footer_config: footerConfig,
                }),
            });

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
            } else {
                setSaveState('error');
                setTimeout(() => setSaveState(null), 4000);
            }
        } catch (err) {
            console.error('Save error:', err);
            setSaveState('error');
            setTimeout(() => setSaveState(null), 4000);
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
                if (data.html) {
                    editorInstance.current.setComponents(data.html);
                }
                if (data.css) {
                    editorInstance.current.setStyle(data.css);
                }
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
    const openMediaLibrary = (currentValue: string) => {
        setMediaCurrentValue(currentValue);
        setMediaModalOpen(true);
    };

    // Exit Builder Handler
    const handleExit = () => {
        if (isDirty) {
            setExitModalOpen(true);
        } else {
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
                /* GrapesJS Canvas Reset for Elementor 3-Panel Layout */
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
            />

            {/* 3-PANEL WORKSPACE */}
            <div className="flex-1 flex overflow-hidden">
                {/* 1. LEFT PANEL: Widget Library & Structure Navigator (w-80) */}
                <aside className="w-80 bg-slate-950 border-r border-white/10 flex flex-col flex-shrink-0 z-20">
                    {/* Header Tabs */}
                    <div className="h-11 border-b border-white/10 bg-slate-900/50 px-2 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-1">
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
                                <span className="hidden xl:inline">Widgets</span>
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
                                <span className="hidden xl:inline">Layers</span>
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
                                <span className="hidden xl:inline">Page</span>
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

                        <div className="pt-2 border-t border-white/10 space-y-3">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                    SEO Page Title
                                </label>
                                <input
                                    type="text"
                                    value={seoTitle}
                                    onChange={(e) => {
                                        setSeoTitle(e.target.value);
                                        setIsDirty(true);
                                    }}
                                    className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                                    SEO Meta Description
                                </label>
                                <textarea
                                    rows={3}
                                    value={seoDescription}
                                    onChange={(e) => {
                                        setSeoDescription(e.target.value);
                                        setIsDirty(true);
                                    }}
                                    className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-3 py-1.5 focus:border-teal-500"
                                />
                            </div>
                        </div>
                    </div>

                    <HeaderTab
                        editor={editor}
                        selectedComponent={selectedComponent}
                        isActive={leftPanelTab === 'header'}
                        headerConfig={headerConfig}
                        setHeaderConfig={setHeaderConfig}
                        setIsDirty={setIsDirty}
                        onOpenMedia={openMediaLibrary}
                    />

                    <FooterTab
                        editor={editor}
                        selectedComponent={selectedComponent}
                        isActive={leftPanelTab === 'footer'}
                        footerConfig={footerConfig}
                        setFooterConfig={setFooterConfig}
                        setIsDirty={setIsDirty}
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
            </div>

            {/* MODALS */}

            {/* 1. Media Library Modal */}
            <MediaLibraryModal
                isOpen={mediaModalOpen}
                onClose={() => setMediaModalOpen(false)}
                onSelect={(url) => {
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
                                onClick={() => router.visit('/website')}
                                className="flex-1 py-2 rounded-xl text-xs font-bold border border-white/10 text-slate-300 hover:bg-white/5"
                            >
                                Discard &amp; Exit
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    await handleSave(false);
                                    router.visit('/website');
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
