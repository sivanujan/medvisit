import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Layout,
    Palette,
    FileText,
    Search,
    AlertCircle,
    ExternalLink,
    Eye,
    ChevronLeft,
    Monitor,
    Sparkles,
    LayoutTemplate,
} from 'lucide-react';
import { useWebsiteDraft } from '@/Components/WebsiteEditor/useWebsiteDraft';
import EditorTopBar from '@/Components/WebsiteEditor/EditorTopBar';
import SectionList from '@/Components/WebsiteEditor/SectionList';
import SectionEditor from '@/Components/WebsiteEditor/SectionEditor';
import PreviewPane from '@/Components/WebsiteEditor/PreviewPane';
import LookTab from '@/Components/WebsiteEditor/LookTab';
import ExtraPagesTab from '@/Components/WebsiteEditor/ExtraPagesTab';
import SeoTab from '@/Components/WebsiteEditor/SeoTab';
import BuilderPromptModal from '@/Components/WebsiteEditor/BuilderPromptModal';
import type { SiteLook, SiteSection } from '@/Components/ClinicSite/types';
import type { SiteStatus } from '@/Components/WebsiteEditor/useWebsiteDraft';
import type { PageSummary } from '@/Components/PageBuilder/types';

interface PageItem extends PageSummary {
    in_menu?: boolean;
}

interface Props {
    sections: SiteSection[];
    look: SiteLook;
    status: SiteStatus;
    seo: {
        title: string;
        description: string;
        default_title: string;
        default_description: string;
        share_image_url: string | null;
        generated_share_image_url: string;
    };
    clinic: {
        name: string;
        subdomain: string;
        site_url: string;
        display_host: string;
        phone?: string;
        address?: string;
        whatsapp?: string;
        email?: string;
        logo_url?: string | null;
        latitude?: number | null;
        longitude?: number | null;
    };
    counts: {
        doctors: number;
    };
    homepageUsesBuilder: boolean;
    pages: PageItem[];
}

type TabKey = 'home' | 'look' | 'pages' | 'seo';

const defaultSection = (type: string, id: string): SiteSection => {
    switch (type) {
        case 'gallery':
            return { id, type: 'gallery', enabled: true, title: 'Gallery', images: [] };
        case 'faq':
            return { id, type: 'faq', enabled: true, title: 'Questions', items: [] };
        case 'announcement':
            return { id, type: 'announcement', enabled: true, title: '', message: '', tone: 'info' };
        case 'text':
            return { id, type: 'text', enabled: true, title: '', body: '' };
        default:
            return { id, type: type as any, enabled: true };
    }
};

export default function WebsiteIndex({
    sections: initialSections,
    look: initialLook,
    status: initialStatus,
    seo,
    clinic,
    counts,
    homepageUsesBuilder,
    pages,
}: Props) {
    const [activeTab, setActiveTab] = useState<TabKey>('home');
    const [selectedId, setSelectedId] = useState<string | null>(initialSections[0]?.id || null);
    const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
    const [mobileViewingEditor, setMobileViewingEditor] = useState(false);
    const [previewExpanded, setPreviewExpanded] = useState(false);

    // Draft state manager with autosave, undo, and navigation guards
    const {
        sections,
        look,
        status,
        setStatus,
        saveState,
        update,
        undo,
        canUndo,
    } = useWebsiteDraft({ sections: initialSections, look: initialLook }, initialStatus);

    const selectedSection = sections.find((s) => s.id === selectedId) || sections[0] || null;

    // Handlers for sections
    const handleReorder = (newSections: SiteSection[]) => {
        update((prev) => ({ ...prev, sections: newSections }));
    };

    const handleToggleEnable = (id: string, enabled: boolean) => {
        update((prev) => ({
            ...prev,
            sections: prev.sections.map((s) => (s.id === id ? { ...s, enabled } : s)),
        }));
    };

    const handleAddSection = (type: string) => {
        const id = `${type}-${Math.random().toString(36).substring(2, 8)}`;
        const newSec = defaultSection(type, id);
        update((prev) => ({
            ...prev,
            sections: [...prev.sections, newSec],
        }));
        setSelectedId(id);
        setMobileViewingEditor(true);
    };

    const handleDeleteSection = (id: string) => {
        update((prev) => ({
            ...prev,
            sections: prev.sections.filter((s) => s.id !== id),
        }));
        if (selectedId === id) {
            setSelectedId(sections[0]?.id || null);
        }
    };

    const handleUpdateSection = (updated: SiteSection) => {
        update(
            (prev) => ({
                ...prev,
                sections: prev.sections.map((s) => (s.id === updated.id ? updated : s)),
            }),
            `sec-${updated.id}`,
        );
    };

    const handleUpdateLook = (newLook: SiteLook) => {
        update(
            (prev) => ({
                ...prev,
                look: newLook,
            }),
            'look',
        );
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Website Editor' },
            ]}
        >
            <Head title="Website Editor" />

            <div className="min-h-[calc(100vh-64px)] flex flex-col bg-slate-50/60 dark:bg-slate-950/60 font-sans">
                {/* 1. Sticky Top Bar */}
                <EditorTopBar
                    status={status}
                    onStatusChange={setStatus}
                    saveState={saveState}
                    canUndo={canUndo}
                    onUndo={undo}
                    clinic={clinic}
                />

                {/* 2. Navigation Tabs Bar */}
                <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-6">
                    <div className="max-w-[1700px] mx-auto flex items-center justify-between">
                        <nav className="flex space-x-1 sm:space-x-2 py-2" aria-label="Editor Tabs">
                            {[
                                { key: 'home', label: 'Home page', icon: Layout },
                                { key: 'look', label: 'Look & feel', icon: Palette },
                                { key: 'pages', label: 'Extra pages', icon: FileText, count: pages.length },
                                { key: 'seo', label: 'SEO & sharing', icon: Search },
                            ].map((tab) => {
                                const TabIcon = tab.icon;
                                const isActive = activeTab === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => {
                                            setActiveTab(tab.key as TabKey);
                                            setMobilePreviewOpen(false);
                                        }}
                                        className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                                            isActive
                                                ? 'bg-primary/10 text-primary dark:text-white dark:bg-primary/20 shadow-xs'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
                                        }`}
                                    >
                                        <TabIcon className="h-4 w-4" />
                                        <span>{tab.label}</span>
                                        {tab.count !== undefined && tab.count > 0 && (
                                            <span
                                                className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                                                    isActive
                                                        ? 'bg-primary text-white'
                                                        : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                                }`}
                                            >
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </nav>

                        <div className="flex items-center gap-2">
                            {/* Visual Page Builder link */}
                            <a
                                href="/website/builder"
                                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 dark:border-primary/40 bg-primary/10 dark:bg-primary/20 hover:bg-primary/20 text-xs font-semibold text-primary dark:text-teal-300 transition shadow-xs"
                                title="Open MedVisit visual drag-and-drop page builder"
                            >
                                <LayoutTemplate className="h-3.5 w-3.5" />
                                <span>MedVisit Page Builder</span>
                                <ExternalLink className="h-3 w-3 opacity-70" />
                            </a>

                            {/* On tablet/mobile in Home tab: toggle preview button */}
                            {activeTab === 'home' && (
                                <button
                                    type="button"
                                    onClick={() => setMobilePreviewOpen(!mobilePreviewOpen)}
                                    className="lg:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                >
                                    <Eye className="h-3.5 w-3.5 text-primary" />
                                    {mobilePreviewOpen ? 'Back to Editor' : 'Preview'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Tab Content Area */}
                <div className="flex-1 flex flex-col">
                    {/* TAB: HOME PAGE (3 Panes) */}
                    {activeTab === 'home' && (
                        <div className="flex-1 flex flex-col">
                            {/* Builder Notice if homepage is handled by page builder, or invite banner to use visual builder */}
                            {homepageUsesBuilder ? (
                                <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span>
                                            Notice: Your home page currently comes from the MedVisit Page Builder. Edits made to standard sections here will apply whenever standard sections are active.
                                        </span>
                                    </div>
                                    <Link
                                        href="/website/builder"
                                        className="shrink-0 font-bold text-amber-900 dark:text-amber-100 underline hover:text-amber-700"
                                    >
                                        Open MedVisit Page Builder →
                                    </Link>
                                </div>
                            ) : (
                                <div className="bg-gradient-to-r from-sky-50 to-indigo-50/40 dark:from-slate-800/80 dark:to-slate-800/40 border-b border-sky-100 dark:border-slate-800 px-4 py-2 text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                                        <span>
                                            Want to design with drag-and-drop? Use <strong>MedVisit Page Builder</strong> for free-form layouts, custom blocks, and live doctor widgets.
                                        </span>
                                    </div>
                                    <a
                                        href="/website/builder"
                                        className="shrink-0 font-bold text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                        Launch Visual Page Builder →
                                    </a>
                                </div>
                            )}

                            {/* Main 3-pane layout on Desktop, responsive on Tablet / Mobile */}
                            <div className="flex-1 flex flex-col lg:flex-row min-h-[calc(100vh-160px)]">
                                {/* Mobile/Tablet View: Either Preview or Editor */}
                                {mobilePreviewOpen ? (
                                    <div className="lg:hidden flex-1 h-[calc(100vh-170px)]">
                                        <PreviewPane
                                            sections={sections}
                                            look={look}
                                            selectedId={selectedId}
                                            onSelect={(id) => {
                                                setSelectedId(id);
                                                setMobilePreviewOpen(false);
                                                setMobileViewingEditor(true);
                                            }}
                                        />
                                    </div>
                                ) : (
                                    <>
                                        {/* LEFT PANE: Section list (~260px - 280px) */}
                                        <div
                                            className={`${
                                                previewExpanded ? 'hidden' : 'block'
                                            } lg:w-68 xl:w-72 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-white/10 ${
                                                mobileViewingEditor ? 'hidden md:block' : 'block'
                                            }`}
                                        >
                                            <SectionList
                                                sections={sections}
                                                selectedId={selectedId}
                                                onSelect={(id) => {
                                                    setSelectedId(id);
                                                    setMobileViewingEditor(true);
                                                }}
                                                onReorder={handleReorder}
                                                onToggleEnable={handleToggleEnable}
                                                onAddSection={handleAddSection}
                                                onDeleteSection={handleDeleteSection}
                                            />
                                        </div>

                                        {/* CENTRE PANE: Selected section editor (~380px - 440px) */}
                                        <div
                                            className={`${
                                                previewExpanded ? 'hidden' : 'flex'
                                            } flex-1 md:w-96 lg:max-w-md xl:max-w-lg bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-white/10 flex flex-col ${
                                                !mobileViewingEditor ? 'hidden md:flex' : 'flex'
                                            }`}
                                        >
                                            {/* Mobile back to section list button */}
                                            <div className="md:hidden p-3 border-b border-slate-200 dark:border-slate-800">
                                                <button
                                                    type="button"
                                                    onClick={() => setMobileViewingEditor(false)}
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary"
                                                >
                                                    <ChevronLeft className="h-4 w-4" />
                                                    Back to section list
                                                </button>
                                            </div>

                                            {selectedSection ? (
                                                <SectionEditor
                                                    key={selectedSection.id}
                                                    section={selectedSection}
                                                    onChange={handleUpdateSection}
                                                    clinic={clinic}
                                                />
                                            ) : (
                                                <div className="p-8 text-center text-xs text-slate-400">
                                                    Select a section on the left to edit its settings.
                                                </div>
                                            )}
                                        </div>

                                        {/* RIGHT PANE: Sticky Preview Frame on Desktop */}
                                        <div className={`hidden lg:flex ${previewExpanded ? 'w-full flex-1' : 'flex-1'} sticky top-[105px] h-[calc(100vh-105px)] overflow-hidden transition-all duration-200`}>
                                            <PreviewPane
                                                sections={sections}
                                                look={look}
                                                selectedId={selectedId}
                                                onSelect={(id) => setSelectedId(id)}
                                                isExpanded={previewExpanded}
                                                onToggleExpand={() => setPreviewExpanded(!previewExpanded)}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TAB: LOOK & FEEL */}
                    {activeTab === 'look' && (
                        <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/40">
                            <LookTab
                                look={look}
                                onChange={handleUpdateLook}
                                clinic={clinic}
                                onLogoUpdate={(url) => {
                                    clinic.logo_url = url;
                                }}
                            />
                        </div>
                    )}

                    {/* TAB: EXTRA PAGES */}
                    {activeTab === 'pages' && (
                        <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/40">
                            <ExtraPagesTab
                                pages={pages}
                                clinic={clinic}
                            />
                        </div>
                    )}

                    {/* TAB: SEO & SHARING */}
                    {activeTab === 'seo' && (
                        <div className="flex-1 bg-slate-50/50 dark:bg-slate-950/40">
                            <SeoTab
                                seo={seo}
                                clinic={clinic}
                            />
                        </div>
                    )}
                </div>

                {/* Onboarding / Feature Discovery Modal: Customize Clinic with Page Builder */}
                <BuilderPromptModal clinicName={clinic.name} />
            </div>
        </AuthenticatedLayout>
    );
}
