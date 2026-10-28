import React from 'react';
import type { InspectorTabName, InspectorTabProps } from '../types';
import { describeComponent } from './componentHelpers';
import HeadingContent from './content/HeadingContent';
import TextContent from './content/TextContent';
import ButtonContent from './content/ButtonContent';
import ImageContent from './content/ImageContent';
import VideoContent from './content/VideoContent';
import MapContent from './content/MapContent';
import IconListContent from './content/IconListContent';
import FaqContent from './content/FaqContent';
import IconContent from './content/IconContent';
import ContainerContent from './content/ContainerContent';
import DoctorsContent from './content/DoctorsContent';
import SessionsContent from './content/SessionsContent';
import BookTokenContent from './content/BookTokenContent';
import AnnouncementContent from './content/AnnouncementContent';
import { FIELD_CONFIGS, makeFieldsPanel } from './content/FieldsPanel';
import { OpeningHoursContent, PriceListContent } from './content/RowListPanel';
import TabsContent from './content/TabsContent';
import SocialIconsContent from './content/SocialIconsContent';
import GalleryContent from './content/GalleryContent';
import WhatsappContent from './content/WhatsappContent';
import type { ClinicData, ContentPanelProps } from './content/types';
import type { WidgetKind } from '../lib/widgetKinds';

interface ContentTabProps extends InspectorTabProps {
    inspectorTab: InspectorTabName;
    selectedTagName: string;
    onOpenMedia: (currentValue: string, onPick?: (url: string) => void) => void;
    onOpenStyle?: () => void;
    clinicData?: ClinicData;
}

// Content panel for each widget kind; kinds without one show only the Element section.
const PANELS: Partial<Record<WidgetKind, React.ComponentType<ContentPanelProps>>> = {
    heading: HeadingContent,
    text: TextContent,
    button: ButtonContent,
    image: ImageContent,
    video: VideoContent,
    map: MapContent,
    'icon-list': IconListContent,
    faq: FaqContent,
    icon: IconContent,
    container: ContainerContent,
    doctors: DoctorsContent,
    sessions: SessionsContent,
    'book-token': BookTokenContent,
    announcement: AnnouncementContent,
    // Batch A: simple widgets share the field-driven panel; list-style widgets have their own.
    ...Object.fromEntries(
        (Object.keys(FIELD_CONFIGS) as WidgetKind[]).map((kind) => [kind, makeFieldsPanel(kind)]),
    ),
    tabs: TabsContent,
    'social-icons': SocialIconsContent,
    gallery: GalleryContent,
    'price-list': PriceListContent,
    'opening-hours': OpeningHoursContent,
    whatsapp: WhatsappContent,
};

export default function ContentTab({
    editor,
    selectedComponent,
    inspectorTab,
    setIsDirty,
    onOpenMedia,
    onOpenStyle,
    clinicData,
}: ContentTabProps) {
    const { kind, label } = describeComponent(selectedComponent);
    const Panel = selectedComponent ? PANELS[kind] : undefined;

    return (
        <div
            style={
                inspectorTab === 'content'
                    ? { display: 'block' }
                    : { height: 0, opacity: 0, overflow: 'hidden', position: 'absolute', pointerEvents: 'none' }
            }
            className="space-y-3"
        >
            {selectedComponent && (
                <div className="text-[11px] font-bold uppercase tracking-wide text-teal-400">Edit {label}</div>
            )}

            {Panel && editor && (
                <Panel
                    key={selectedComponent.cid}
                    editor={editor}
                    component={selectedComponent}
                    setIsDirty={setIsDirty}
                    onOpenMedia={onOpenMedia}
                    onOpenStyle={onOpenStyle}
                    clinicData={clinicData}
                />
            )}

            {/* Element section: GrapesJS traits (ID, Title) — container must stay mounted for GrapesJS. */}
            <details className="pt-2 border-t border-white/10" open={!Panel}>
                <summary className="text-[11px] font-bold text-slate-400 cursor-pointer select-none">Element</summary>
                <div id="builder-traits-container" className="space-y-2 text-xs mt-2" />
            </details>
        </div>
    );
}
