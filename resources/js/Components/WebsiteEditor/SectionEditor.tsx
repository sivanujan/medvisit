import React from 'react';
import { ExternalLink, Plus, Trash2, Clock, MapPin, Copy, AlertCircle } from 'lucide-react';
import { TextField, Toggle, Segmented, ImageField, FieldLabel, Hint } from './Fields';
import MapPinPicker from './MapPinPicker';
import type { SiteSection } from '@/Components/ClinicSite/types';

interface Props {
    section: SiteSection;
    onChange: (updated: SiteSection) => void;
    clinic: {
        phone?: string;
        address?: string;
        whatsapp?: string;
        email?: string;
    };
}

const DAYS = [
    { key: 'mon', label: 'Monday' },
    { key: 'tue', label: 'Tuesday' },
    { key: 'wed', label: 'Wednesday' },
    { key: 'thu', label: 'Thursday' },
    { key: 'fri', label: 'Friday' },
    { key: 'sat', label: 'Saturday' },
    { key: 'sun', label: 'Sunday' },
];

export default function SectionEditor({ section, onChange, clinic }: Props) {
    const updateField = <K extends keyof SiteSection>(key: K, value: SiteSection[K]) => {
        onChange({ ...section, [key]: value });
    };

    const type = section.type;

    return (
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            <div className="border-b border-slate-200/80 dark:border-slate-800 pb-3">
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 capitalize">
                    {section.title || section.type}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Editing section content and presentation.
                </p>
            </div>

            {/* Visibility Toggle for all sections */}
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 p-3.5">
                <Toggle
                    label="Show this section on the website"
                    description="When disabled, this section remains in your draft but is hidden from patients."
                    checked={section.enabled ?? true}
                    onChange={(checked) => updateField('enabled', checked)}
                />
            </div>

            {/* HERO */}
            {type === 'hero' && (
                <div className="space-y-4">
                    <TextField
                        label="Heading title"
                        value={section.title ?? ''}
                        onChange={(v) => updateField('title', v)}
                        max={70}
                        placeholder="Our Clinic"
                    />
                    <TextField
                        label="Subtitle"
                        value={section.subtitle ?? ''}
                        onChange={(v) => updateField('subtitle', v)}
                        max={150}
                        placeholder="Book your channeling token online"
                        multiline
                        rows={2}
                    />
                    <TextField
                        label="Location badge / Pill"
                        value={section.badge ?? ''}
                        onChange={(v) => updateField('badge', v)}
                        max={40}
                        placeholder="Colombo 07"
                        hint="Small city or department chip shown above the headline."
                    />
                    <TextField
                        label="Action button text"
                        value={section.cta_text ?? ''}
                        onChange={(v) => updateField('cta_text', v)}
                        max={30}
                        placeholder="Book a token"
                    />
                    <ImageField
                        label="Hero background image"
                        value={section.image_url ?? ''}
                        onChange={(v) => updateField('image_url', v)}
                        hint="Used when hero style is Photo or Split."
                    />
                </div>
            )}

            {/* ABOUT */}
            {type === 'about' && (
                <div className="space-y-4">
                    <TextField
                        label="Section title"
                        value={section.title ?? ''}
                        onChange={(v) => updateField('title', v)}
                        max={70}
                        placeholder="About our clinic"
                    />
                    <TextField
                        label="Clinic description"
                        value={section.description ?? ''}
                        onChange={(v) => updateField('description', v)}
                        max={500}
                        multiline
                        rows={5}
                        placeholder="Tell patients about your medical practice, values, and facilities."
                    />
                    <ImageField
                        label="Feature image"
                        value={section.image_url ?? ''}
                        onChange={(v) => updateField('image_url', v)}
                        hint="Photo of your clinic building, consultation suite, or medical team."
                    />
                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5">
                        <Toggle
                            label="Show live counts banner"
                            description="Displays live counts of verified doctors and upcoming channeling sessions."
                            checked={section.show_stats ?? true}
                            onChange={(checked) => updateField('show_stats', checked)}
                        />
                    </div>
                </div>
            )}

            {/* DOCTORS */}
            {type === 'doctors' && (
                <div className="space-y-4">
                    <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start justify-between gap-3">
                        <div>
                            <strong>Automatic synchronization</strong>
                            <p className="mt-0.5">This updates automatically from your doctors and schedule.</p>
                        </div>
                        <a
                            href="/doctors"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-primary shrink-0 hover:underline"
                        >
                            Manage doctors
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>

                    <TextField
                        label="Section title"
                        value={section.title ?? ''}
                        onChange={(v) => updateField('title', v)}
                        max={70}
                        placeholder="Our doctors"
                    />
                    <TextField
                        label="Subtitle"
                        value={section.subtitle ?? ''}
                        onChange={(v) => updateField('subtitle', v)}
                        max={150}
                        placeholder="SLMC verified consultants and specialists"
                    />

                    <Segmented
                        label="Display layout"
                        value={(section.layout as string) || 'grid'}
                        options={[
                            { value: 'grid', label: 'Grid cards' },
                            { value: 'list', label: 'Compact list' },
                        ]}
                        onChange={(v) => updateField('layout', v as any)}
                    />

                    <Segmented
                        label="Number of doctors to show"
                        value={String(section.limit ?? 6)}
                        options={[
                            { value: '3', label: '3 doctors' },
                            { value: '6', label: '6 doctors' },
                            { value: '9', label: '9 doctors' },
                            { value: '12', label: '12 doctors' },
                        ]}
                        onChange={(v) => updateField('limit', parseInt(v, 10))}
                    />
                </div>
            )}

            {/* SESSIONS */}
            {type === 'sessions' && (
                <div className="space-y-4">
                    <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 p-3 text-xs text-blue-800 dark:text-blue-300 flex items-start justify-between gap-3">
                        <div>
                            <strong>Automatic synchronization</strong>
                            <p className="mt-0.5">This updates automatically from your doctors and schedule.</p>
                        </div>
                        <a
                            href="/doctors"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-primary shrink-0 hover:underline"
                        >
                            Manage schedule
                            <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>

                    <TextField
                        label="Section title"
                        value={section.title ?? ''}
                        onChange={(v) => updateField('title', v)}
                        max={70}
                        placeholder="This week's sessions"
                    />
                    <TextField
                        label="Subtitle"
                        value={section.subtitle ?? ''}
                        onChange={(v) => updateField('subtitle', v)}
                        max={150}
                        placeholder="Book a token for an upcoming session"
                    />

                    <Segmented
                        label="Display layout"
                        value={(section.layout as string) || 'cards'}
                        options={[
                            { value: 'cards', label: 'Session cards' },
                            { value: 'table', label: 'Timetable' },
                        ]}
                        onChange={(v) => updateField('layout', v as any)}
                    />

                    <Segmented
                        label="Maximum sessions to display"
                        value={String(section.limit ?? 6)}
                        options={[
                            { value: '3', label: '3 sessions' },
                            { value: '6', label: '6 sessions' },
                            { value: '10', label: '10 sessions' },
                        ]}
                        onChange={(v) => updateField('limit', parseInt(v, 10))}
                    />
                </div>
            )}

            {/* SERVICES */}
            {type === 'services' && (
                <div className="space-y-4">
                    <TextField
                        label="Section title"
                        value={section.title ?? ''}
                        onChange={(v) => updateField('title', v)}
                        max={70}
                        placeholder="Our medical services"
                    />
                    <TextField
                        label="Subtitle"
                        value={section.subtitle ?? ''}
                        onChange={(v) => updateField('subtitle', v)}
                        max={150}
                        placeholder="Comprehensive healthcare services for your family"
                    />

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <FieldLabel>Service items ({section.items?.length || 0})</FieldLabel>
                            <button
                                type="button"
                                onClick={() => {
                                    const items = [...(section.items || []), { name: '', desc: '' }];
                                    updateField('items', items);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add service
                            </button>
                        </div>

                        <div className="space-y-2.5">
                            {(section.items || []).map((item: any, index: number) => (
                                <div
                                    key={index}
                                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 space-y-2 relative"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <input
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => {
                                                const items = [...(section.items || [])];
                                                items[index] = { ...items[index], name: e.target.value };
                                                updateField('items', items);
                                            }}
                                            placeholder="Service name (e.g. ECG & Vitals)"
                                            className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-medium"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const items = section.items?.filter((_: any, i: number) => i !== index);
                                                updateField('items', items);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                                            title="Remove service"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <textarea
                                        rows={2}
                                        value={item.desc}
                                        onChange={(e) => {
                                            const items = [...(section.items || [])];
                                            items[index] = { ...items[index], desc: e.target.value };
                                            updateField('items', items);
                                        }}
                                        placeholder="Short description of this service..."
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* OPENING HOURS */}
            {type === 'hours' && (
                <div className="space-y-4">
                    <TextField
                        label="Section title"
                        value={section.title ?? ''}
                        onChange={(v) => updateField('title', v)}
                        max={70}
                        placeholder="Opening hours"
                    />
                    <TextField
                        label="Emergency note"
                        value={section.note ?? ''}
                        onChange={(v) => updateField('note', v)}
                        max={150}
                        placeholder="Channeling appointments operate according to individual doctor schedules."
                    />

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <FieldLabel>Weekly schedule</FieldLabel>
                            <button
                                type="button"
                                onClick={() => {
                                    const days = section.days || [];
                                    const monday = days.find((d: any) => d.day === 'mon');
                                    if (monday) {
                                        const updatedDays = days.map((d: any) =>
                                            d.day === 'mon' ? d : { ...d, open: monday.open, ranges: [...monday.ranges] },
                                        );
                                        updateField('days', updatedDays);
                                    }
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                                <Copy className="h-3.5 w-3.5" />
                                Same as Monday
                            </button>
                        </div>

                        <div className="space-y-2">
                            {DAYS.map(({ key, label }) => {
                                const dayData = (section.days || []).find((d: any) => d.day === key) || {
                                    day: key,
                                    open: false,
                                    ranges: [],
                                };

                                const updateDay = (newDayData: typeof dayData) => {
                                    const existing = [...(section.days || [])];
                                    const idx = existing.findIndex((d: any) => d.day === key);
                                    if (idx >= 0) existing[idx] = newDayData;
                                    else existing.push(newDayData);
                                    updateField('days', existing);
                                };

                                return (
                                    <div
                                        key={key}
                                        className={`rounded-xl border p-3 transition ${
                                            dayData.open
                                                ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                                                : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 opacity-70'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 w-24">
                                                {label}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const nowOpen = !dayData.open;
                                                        const ranges =
                                                            nowOpen && dayData.ranges.length === 0
                                                                ? [{ from: '08:00 AM', to: '08:00 PM' }]
                                                                : dayData.ranges;
                                                        updateDay({ ...dayData, open: nowOpen, ranges });
                                                    }}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                                                        dayData.open
                                                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                                            : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                    }`}
                                                >
                                                    {dayData.open ? 'Open' : 'Closed'}
                                                </button>
                                            </div>
                                        </div>

                                        {dayData.open && (
                                            <div className="mt-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
                                                {dayData.ranges.map((range: any, rIdx: number) => (
                                                    <div key={rIdx} className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={range.from}
                                                            onChange={(e) => {
                                                                const ranges = [...dayData.ranges];
                                                                ranges[rIdx] = { ...ranges[rIdx], from: e.target.value };
                                                                updateDay({ ...dayData, ranges });
                                                            }}
                                                            placeholder="08:00 AM"
                                                            className="w-28 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100"
                                                        />
                                                        <span className="text-xs text-slate-400">to</span>
                                                        <input
                                                            type="text"
                                                            value={range.to}
                                                            onChange={(e) => {
                                                                const ranges = [...dayData.ranges];
                                                                ranges[rIdx] = { ...ranges[rIdx], to: e.target.value };
                                                                updateDay({ ...dayData, ranges });
                                                            }}
                                                            placeholder="08:00 PM"
                                                            className="w-28 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-2.5 py-1 text-xs text-slate-900 dark:text-slate-100"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const ranges = dayData.ranges.filter((_: any, i: number) => i !== rIdx);
                                                                updateDay({ ...dayData, ranges });
                                                            }}
                                                            className="p-1 text-slate-400 hover:text-red-600"
                                                            title="Remove hours range"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const ranges = [...dayData.ranges, { from: '09:00 AM', to: '05:00 PM' }];
                                                        updateDay({ ...dayData, ranges });
                                                    }}
                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                                                >
                                                    <Plus className="h-3 w-3" /> Add shift
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* CONTACT & MAP */}
            {type === 'contact' && (
                <div className="space-y-4">
                    <TextField
                        label="Section title"
                        value={section.title ?? ''}
                        onChange={(v) => updateField('title', v)}
                        max={70}
                        placeholder="Contact us"
                    />
                    <TextField
                        label="Subtitle"
                        value={section.subtitle ?? ''}
                        onChange={(v) => updateField('subtitle', v)}
                        max={150}
                        placeholder="Visit our medical center or reach out by phone"
                    />

                    <TextField
                        label="Hotline phone number"
                        value={section.phone ?? ''}
                        onChange={(v) => updateField('phone', v)}
                        placeholder={clinic.phone || '+94 11 234 5678'}
                        hint={!section.phone && clinic.phone ? `Using clinic default: ${clinic.phone}` : undefined}
                    />

                    <TextField
                        label="WhatsApp number"
                        value={section.whatsapp ?? ''}
                        onChange={(v) => updateField('whatsapp', v)}
                        placeholder={clinic.whatsapp || '+94 77 123 4567'}
                        hint={!section.whatsapp && clinic.whatsapp ? `Using clinic default: ${clinic.whatsapp}` : undefined}
                    />

                    <TextField
                        label="Email address"
                        value={section.email ?? ''}
                        onChange={(v) => updateField('email', v)}
                        type="email"
                        placeholder={clinic.email || 'care@clinic.lk'}
                    />

                    <TextField
                        label="Physical address"
                        value={section.address ?? ''}
                        onChange={(v) => updateField('address', v)}
                        multiline
                        rows={2}
                        placeholder={clinic.address || '123 Hospital Road, Colombo'}
                    />

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-3">
                        <Toggle
                            label="Show location map"
                            description="Displays an interactive map centered on your clinic pin."
                            checked={section.show_map ?? true}
                            onChange={(checked) => updateField('show_map', checked)}
                        />

                        {section.show_map !== false && (
                            <div className="pt-2">
                                <MapPinPicker
                                    latitude={section.latitude ?? null}
                                    longitude={section.longitude ?? null}
                                    onChange={(lat, lng) => {
                                        onChange({ ...section, latitude: lat, longitude: lng });
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* FOOTER */}
            {type === 'footer' && (
                <div className="space-y-4">
                    <TextField
                        label="Footer notice"
                        value={section.notice ?? ''}
                        onChange={(v) => updateField('notice', v)}
                        max={150}
                        multiline
                        rows={3}
                        placeholder="Doctor schedules can change. Token times are approximate."
                        hint="Important disclaimer or token advisory displayed in the website footer."
                    />
                </div>
            )}

            {/* GALLERY */}
            {type === 'gallery' && (
                <div className="space-y-4">
                    <TextField
                        label="Section title"
                        value={section.title ?? ''}
                        onChange={(v) => updateField('title', v)}
                        max={70}
                        placeholder="Clinic gallery"
                    />

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <FieldLabel>Gallery photos ({section.images?.length || 0})</FieldLabel>
                            <button
                                type="button"
                                onClick={() => {
                                    const images = [...(section.images || []), { url: '', caption: '' }];
                                    updateField('images', images);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add photo
                            </button>
                        </div>

                        <div className="space-y-3">
                            {(section.images || []).map((img: any, index: number) => (
                                <div
                                    key={index}
                                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 space-y-2 relative"
                                >
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const images = section.images?.filter((_: any, i: number) => i !== index);
                                                updateField('images', images);
                                            }}
                                            className="text-slate-400 hover:text-red-600 text-xs inline-flex items-center gap-1"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" /> Remove
                                        </button>
                                    </div>
                                    <ImageField
                                        label={`Photo #${index + 1}`}
                                        value={img.url}
                                        onChange={(url) => {
                                            const images = [...(section.images || [])];
                                            images[index] = { ...images[index], url };
                                            updateField('images', images);
                                        }}
                                    />
                                    <TextField
                                        label="Photo caption (optional)"
                                        value={img.caption ?? ''}
                                        onChange={(caption) => {
                                            const images = [...(section.images || [])];
                                            images[index] = { ...images[index], caption };
                                            updateField('images', images);
                                        }}
                                        max={100}
                                        placeholder="Consultation Chamber 1"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* FAQ */}
            {type === 'faq' && (
                <div className="space-y-4">
                    <TextField
                        label="Section title"
                        value={section.title ?? ''}
                        onChange={(v) => updateField('title', v)}
                        max={70}
                        placeholder="Frequently asked questions"
                    />

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <FieldLabel>Question & answer items ({section.items?.length || 0})</FieldLabel>
                            <button
                                type="button"
                                onClick={() => {
                                    const items = [...(section.items || []), { question: '', answer: '' }];
                                    updateField('items', items);
                                }}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add question
                            </button>
                        </div>

                        <div className="space-y-3">
                            {(section.items || []).map((item: any, index: number) => (
                                <div
                                    key={index}
                                    className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 space-y-2 relative"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold text-slate-500">Q#{index + 1}</span>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const items = section.items?.filter((_: any, i: number) => i !== index);
                                                updateField('items', items);
                                            }}
                                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                                            title="Remove item"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <input
                                        type="text"
                                        value={item.question ?? ''}
                                        onChange={(e) => {
                                            const items = [...(section.items || [])];
                                            items[index] = { ...items[index], question: e.target.value };
                                            updateField('items', items);
                                        }}
                                        placeholder="Question (e.g. Do I need an appointment?)"
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-semibold"
                                    />
                                    <textarea
                                        rows={3}
                                        value={item.answer ?? ''}
                                        onChange={(e) => {
                                            const items = [...(section.items || [])];
                                            items[index] = { ...items[index], answer: e.target.value };
                                            updateField('items', items);
                                        }}
                                        placeholder="Clear answer for patients..."
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ANNOUNCEMENT */}
            {type === 'announcement' && (
                <div className="space-y-4">
                    <TextField
                        label="Notice title"
                        value={section.title ?? ''}
                        onChange={(v) => updateField('title', v)}
                        max={70}
                        placeholder="Notice: Poya day schedule"
                    />
                    <TextField
                        label="Announcement message"
                        value={section.message ?? ''}
                        onChange={(v) => updateField('message', v)}
                        multiline
                        rows={3}
                        placeholder="Specialist channeling will operate until 2:00 PM on Poya day."
                    />
                    <Segmented
                        label="Notice tone / color"
                        value={(section.tone as string) || 'info'}
                        options={[
                            { value: 'info', label: 'Info (Blue)' },
                            { value: 'warning', label: 'Warning (Amber)' },
                            { value: 'success', label: 'Success (Green)' },
                        ]}
                        onChange={(v) => updateField('tone', v as any)}
                    />
                </div>
            )}

            {/* CUSTOM TEXT */}
            {type === 'text' && (
                <div className="space-y-4">
                    <TextField
                        label="Heading title (optional)"
                        value={section.title ?? ''}
                        onChange={(v) => updateField('title', v)}
                        max={70}
                        placeholder="Patient guidelines"
                    />
                    <TextField
                        label="Body text"
                        value={section.body ?? ''}
                        onChange={(v) => updateField('body', v)}
                        multiline
                        rows={6}
                        placeholder="Write custom instructions, clinic policies, or detailed guidance for patients."
                    />
                </div>
            )}
        </div>
    );
}
