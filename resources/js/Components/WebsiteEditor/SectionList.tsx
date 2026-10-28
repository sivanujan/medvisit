import React, { useState } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    GripVertical,
    Eye,
    EyeOff,
    ChevronUp,
    ChevronDown,
    Plus,
    Trash2,
    Sparkles,
    Info,
    Stethoscope,
    Calendar,
    Activity,
    Clock,
    MapPin,
    Layers,
    Image,
    HelpCircle,
    Megaphone,
    AlignLeft,
    AlertCircle,
    X,
} from 'lucide-react';
import type { SiteSection } from '@/Components/ClinicSite/types';

interface Props {
    sections: SiteSection[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    onReorder: (newSections: SiteSection[]) => void;
    onToggleEnable: (id: string, enabled: boolean) => void;
    onAddSection: (type: string) => void;
    onDeleteSection: (id: string) => void;
}

const SECTION_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    hero: Sparkles,
    about: Info,
    doctors: Stethoscope,
    sessions: Calendar,
    services: Activity,
    hours: Clock,
    contact: MapPin,
    footer: Layers,
    gallery: Image,
    faq: HelpCircle,
    announcement: Megaphone,
    text: AlignLeft,
};

const SECTION_LABELS: Record<string, string> = {
    hero: 'Hero banner',
    about: 'About clinic',
    doctors: 'Doctors',
    sessions: 'Doctor sessions',
    services: 'Services',
    hours: 'Opening hours',
    contact: 'Contact & map',
    footer: 'Footer notice',
    gallery: 'Photo gallery',
    faq: 'Questions (FAQ)',
    announcement: 'Announcement',
    text: 'Custom text',
};

const CORE_SECTION_TYPES = ['hero', 'about', 'doctors', 'sessions', 'services', 'hours', 'contact', 'footer'];

interface SortableItemProps {
    section: SiteSection;
    isSelected: boolean;
    isFirst: boolean;
    isLast: boolean;
    onSelect: () => void;
    onToggle: (enabled: boolean) => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onDelete?: () => void;
}

function SortableSectionItem({
    section,
    isSelected,
    isFirst,
    isLast,
    onSelect,
    onToggle,
    onMoveUp,
    onMoveDown,
    onDelete,
}: SortableItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: section.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const Icon = SECTION_ICONS[section.type] || Layers;
    const isCore = CORE_SECTION_TYPES.includes(section.type);

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={`group relative flex items-center gap-1.5 rounded-xl border px-2 py-2 text-xs transition-colors ${
                isDragging
                    ? 'opacity-60 bg-primary/10 border-primary z-20'
                    : isSelected
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-sm'
                    : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700'
            } ${!section.enabled ? 'opacity-60' : ''}`}
        >
            {/* Drag Handle */}
            <button
                type="button"
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 touch-none"
                aria-label={`Drag to reorder ${SECTION_LABELS[section.type] || section.id}`}
            >
                <GripVertical className="h-3.5 w-3.5" />
            </button>

            {/* Icon */}
            <div
                onClick={onSelect}
                className={`p-1.5 rounded-lg shrink-0 cursor-pointer ${
                    isSelected ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
            >
                <Icon className="h-3.5 w-3.5" />
            </div>

            {/* Title / Click to select */}
            <button
                type="button"
                onClick={onSelect}
                className="flex-1 text-left font-medium text-slate-800 dark:text-slate-200 truncate cursor-pointer py-0.5"
            >
                <span className="block truncate">
                    {section.title || SECTION_LABELS[section.type] || section.type}
                </span>
                <span className="block text-[10px] text-slate-400 font-normal">
                    {SECTION_LABELS[section.type] || section.type}
                </span>
            </button>

            {/* Actions: Move Up/Down, Eye toggle, Delete */}
            <div className="flex items-center gap-0.5 shrink-0">
                {/* Keyboard move up/down */}
                <button
                    type="button"
                    onClick={onMoveUp}
                    disabled={isFirst}
                    title="Move up"
                    aria-label="Move section up"
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                    <ChevronUp className="h-3 w-3" />
                </button>
                <button
                    type="button"
                    onClick={onMoveDown}
                    disabled={isLast}
                    title="Move down"
                    aria-label="Move section down"
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 disabled:cursor-not-allowed"
                >
                    <ChevronDown className="h-3 w-3" />
                </button>

                {/* Eye toggle */}
                <button
                    type="button"
                    onClick={() => onToggle(!section.enabled)}
                    title={section.enabled ? 'Hide section' : 'Show section'}
                    aria-label={section.enabled ? 'Hide section' : 'Show section'}
                    className={`p-1 rounded transition ${
                        section.enabled
                            ? 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                            : 'text-amber-600 dark:text-amber-400'
                    }`}
                >
                    {section.enabled ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>

                {/* Delete button (for extra sections only) */}
                {!isCore && onDelete && (
                    <button
                        type="button"
                        onClick={onDelete}
                        title="Delete section"
                        aria-label="Delete section"
                        className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition"
                    >
                        <Trash2 className="h-3 w-3" />
                    </button>
                )}
            </div>
        </li>
    );
}

export default function SectionList({
    sections,
    selectedId,
    onSelect,
    onReorder,
    onToggleEnable,
    onAddSection,
    onDeleteSection,
}: Props) {
    const [addModalOpen, setAddModalOpen] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = sections.findIndex((s) => s.id === active.id);
            const newIndex = sections.findIndex((s) => s.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) {
                onReorder(arrayMove(sections, oldIndex, newIndex));
            }
        }
    };

    const handleMove = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= sections.length) return;
        onReorder(arrayMove(sections, index, targetIndex));
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/40 border-r border-slate-200/80 dark:border-white/10 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3 px-1">
                <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Sections ({sections.length})
                    </h2>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">Drag or use arrows to reorder</p>
                </div>
                <button
                    type="button"
                    onClick={() => setAddModalOpen(true)}
                    className="inline-flex items-center gap-1 rounded-xl bg-primary px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:brightness-105 transition"
                >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-1">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                        <ul className="space-y-1.5" role="list">
                            {sections.map((section, idx) => (
                                <SortableSectionItem
                                    key={section.id}
                                    section={section}
                                    isSelected={selectedId === section.id}
                                    isFirst={idx === 0}
                                    isLast={idx === sections.length - 1}
                                    onSelect={() => onSelect(section.id)}
                                    onToggle={(enabled) => onToggleEnable(section.id, enabled)}
                                    onMoveUp={() => handleMove(idx, 'up')}
                                    onMoveDown={() => handleMove(idx, 'down')}
                                    onDelete={
                                        !CORE_SECTION_TYPES.includes(section.type)
                                            ? () => onDeleteSection(section.id)
                                            : undefined
                                    }
                                />
                            ))}
                        </ul>
                    </SortableContext>
                </DndContext>
            </div>

            {/* Add Section Modal */}
            {addModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
                    <div
                        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-2xl p-6"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-section-title"
                    >
                        <button
                            type="button"
                            onClick={() => setAddModalOpen(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            aria-label="Close"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h3 id="add-section-title" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            Add a section
                        </h3>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Choose an optional block to add to your clinic home page.
                        </p>

                        <div className="grid grid-cols-1 gap-2.5 my-4">
                            {[
                                {
                                    type: 'gallery',
                                    title: 'Photo gallery',
                                    description: 'Show pictures of your clinic, facilities, and waiting area.',
                                    icon: Image,
                                },
                                {
                                    type: 'faq',
                                    title: 'Questions (FAQ)',
                                    description: 'Answer common patient questions with an expandable accordion.',
                                    icon: HelpCircle,
                                },
                                {
                                    type: 'announcement',
                                    title: 'Announcement',
                                    description: 'Highlight a special clinic notice, holiday hours, or health camp.',
                                    icon: Megaphone,
                                },
                                {
                                    type: 'text',
                                    title: 'Custom text',
                                    description: 'Add custom paragraphs, guidelines, or instructions.',
                                    icon: AlignLeft,
                                },
                            ].map((item) => {
                                const ItemIcon = item.icon;
                                return (
                                    <button
                                        key={item.type}
                                        type="button"
                                        onClick={() => {
                                            onAddSection(item.type);
                                            setAddModalOpen(false);
                                        }}
                                        className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 p-3 text-left transition hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10"
                                    >
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                                            <ItemIcon className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                {item.title}
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {item.description}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Note about insurance / payment */}
                        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 p-3 text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                            <div>
                                Insurance and payment information does not have a builder widget and is configured directly in clinic settings.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
