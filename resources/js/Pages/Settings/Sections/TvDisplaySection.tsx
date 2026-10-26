import React, { useState } from 'react';
import {
    Tv,
    Shield,
    Volume2,
    VolumeX,
    Languages,
    MessageSquare,
    Palette,
    Plus,
    Trash2,
    CheckCircle2,
    XCircle,
    ExternalLink,
    Laptop,
    HelpCircle,
    Eye,
    Edit2,
    Radio,
} from 'lucide-react';
import type { FormInstance } from '../types';
import TvPairingModal from '@/Pages/Queue/Components/TvPairingModal';
import axios from 'axios';
import { router } from '@inertiajs/react';

export interface TvSettingsFormData {
    name_display_mode: 'token_only' | 'initial_last' | 'first_only' | 'full_name';
    languages: ('en' | 'ta' | 'si')[];
    chime_enabled: boolean;
    voice_language: 'off' | 'en' | 'ta' | 'si';
    ticker_text: string;
    theme: 'dark' | 'light';
    reduced_motion: boolean;
}

export interface TvDeviceItem {
    id: number;
    name: string;
    doctor_ids: number[] | null;
    last_seen_at: string;
    last_seen_timestamp?: number;
    is_online: boolean;
    is_revoked: boolean;
    revoked_at?: string;
    created_at: string;
}

interface TvDisplaySectionProps {
    form: FormInstance<TvSettingsFormData>;
    tvDevices: TvDeviceItem[];
    availableDoctors?: { id: number; name: string; specialty?: string }[];
    clinicName?: string;
    subdomain?: string;
}

export default function TvDisplaySection({
    form,
    tvDevices = [],
    availableDoctors = [],
    clinicName = 'MedVisit Clinic',
    subdomain,
}: TvDisplaySectionProps) {
    const { data, setData, errors } = form;
    const [pairingModalOpen, setPairingModalOpen] = useState(false);
    const [revokingId, setRevokingId] = useState<number | null>(null);

    const handleLanguageToggle = (lang: 'en' | 'ta' | 'si') => {
        const current = data.languages || ['en', 'ta', 'si'];
        if (current.includes(lang)) {
            if (current.length === 1) return; // Keep at least one
            setData('languages', current.filter((l) => l !== lang));
        } else {
            setData('languages', [...current, lang]);
        }
    };

    const handleRevokeDevice = async (id: number) => {
        if (!confirm('Are you sure you want to revoke this TV? It will immediately disconnect and return to the pairing screen.')) {
            return;
        }

        setRevokingId(id);
        try {
            await axios.delete(`/api/tv/devices/${id}`);
            router.reload({ only: ['tvDevices'] });
        } catch (err) {
            console.error('Failed to revoke device', err);
            alert('Failed to revoke TV device. Please try again.');
        } finally {
            setRevokingId(null);
        }
    };

    return (
        <div className="space-y-8">
            {/* Top Info Banner */}
            <div className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-md border border-slate-700/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-[#38BDF8] shrink-0 border border-white/10">
                            <Tv className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white flex items-center gap-2">
                                <span>Waiting-Room TV Display</span>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#0E9E8F]/20 text-[#0E9E8F] border border-[#0E9E8F]/30">
                                    10-Foot UI
                                </span>
                            </h2>
                            <p className="text-xs text-slate-300 mt-0.5">
                                Large-format display designed to be read from 3–5 metres away on 1080p and 768p screens.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setPairingModalOpen(true)}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-[#0E9E8F] hover:bg-[#0c8a7d] text-white text-xs font-semibold shadow-sm transition-colors shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Pair New TV</span>
                        </button>

                        <a
                            href="/queue/tv"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-colors shrink-0"
                        >
                            <Eye className="w-4 h-4 text-[#38BDF8]" />
                            <span>Preview</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                    </div>
                </div>
            </div>

            {/* 1. Privacy & Patient Name Display */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                    <Shield className="w-5 h-5 text-[#1E6FD9]" />
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Patient Name Privacy
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Configure how patient identities are displayed on public screens in the waiting room.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {[
                        {
                            mode: 'token_only' as const,
                            label: 'Token number only (Recommended)',
                            desc: 'Maximum privacy. Shows only Token 15. Names and phones are never transmitted.',
                            badge: 'DEFAULT',
                        },
                        {
                            mode: 'initial_last' as const,
                            label: 'First initial + Last name',
                            desc: 'E.g. "T. Sivanujan". Balances privacy with patient clarity.',
                        },
                        {
                            mode: 'first_only' as const,
                            label: 'First name only',
                            desc: 'E.g. "Thanarasan". Friendly and discreet without revealing family names.',
                        },
                        {
                            mode: 'full_name' as const,
                            label: 'Full name',
                            desc: 'E.g. "Thanarasan Sivanujan". Shows the patient full name as booked.',
                        },
                    ].map((opt) => {
                        const isSelected = data.name_display_mode === opt.mode;
                        return (
                            <button
                                key={opt.mode}
                                type="button"
                                onClick={() => setData('name_display_mode', opt.mode)}
                                className={`text-left p-4 rounded-2xl border transition-all ${
                                    isSelected
                                        ? 'bg-[#1E6FD9]/5 border-[#1E6FD9] ring-2 ring-[#1E6FD9]/20 dark:bg-[#1E6FD9]/10'
                                        : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-white/5 hover:border-slate-300'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <span className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#1E6FD9]' : 'border-slate-400'}`}>
                                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#1E6FD9]" />}
                                        </span>
                                        {opt.label}
                                    </span>
                                    {opt.badge && (
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                                            {opt.badge}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-5">
                                    {opt.desc}
                                </p>
                            </button>
                        );
                    })}
                </div>
                {errors.name_display_mode && (
                    <p className="text-xs text-red-500 font-medium">{errors.name_display_mode}</p>
                )}
            </div>

            {/* 2. Languages & Localization */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                    <Languages className="w-5 h-5 text-[#0E9E8F]" />
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Display Languages
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Headers, tokens, and room notices will show in these selected national languages.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                        { key: 'en' as const, label: 'English', sub: 'Now serving · Room · Next' },
                        { key: 'ta' as const, label: 'தமிழ் (Tamil)', sub: 'இப்போது · அறை · அடுத்து' },
                        { key: 'si' as const, label: 'සිංහල (Sinhala)', sub: 'දැන් · කාමරය · ඊළඟට' },
                    ].map((lang) => {
                        const checked = data.languages?.includes(lang.key);
                        return (
                            <label
                                key={lang.key}
                                className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                                    checked
                                        ? 'bg-[#0E9E8F]/5 border-[#0E9E8F] ring-1 ring-[#0E9E8F]/20 dark:bg-[#0E9E8F]/10'
                                        : 'bg-slate-50/50 dark:bg-slate-800/40 border-slate-200 dark:border-white/5'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => handleLanguageToggle(lang.key)}
                                    className="mt-0.5 rounded border-slate-300 text-[#0E9E8F] focus:ring-[#0E9E8F]"
                                />
                                <div>
                                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                                        {lang.label}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        {lang.sub}
                                    </div>
                                </div>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* 3. Sound & Voice Announcements */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                    <Volume2 className="w-5 h-5 text-amber-500" />
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Sound & Calling Chime
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Audio cues played when staff call the next token from the consultation room.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Chime toggle */}
                    <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                {data.chime_enabled ? <Volume2 className="w-4 h-4 text-emerald-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                                Calling Chime
                            </span>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Soft dual-tone bell chime on every token call
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={data.chime_enabled}
                            onChange={(e) => setData('chime_enabled', e.target.checked)}
                            className="rounded border-slate-300 text-[#1E6FD9] focus:ring-[#1E6FD9] h-5 w-5 cursor-pointer"
                        />
                    </div>

                    {/* Speech Synthesis Voice Language */}
                    <div className="p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5 space-y-1.5">
                        <label className="text-xs font-bold text-slate-900 dark:text-white block">
                            Browser Voice Announcement
                        </label>
                        <select
                            value={data.voice_language}
                            onChange={(e) => setData('voice_language', e.target.value as any)}
                            className="w-full text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 px-3 py-2 text-slate-800 dark:text-slate-200"
                        >
                            <option value="off">Off (Chime only)</option>
                            <option value="en">English Voice (&quot;Token 15, Room 2&quot;)</option>
                            <option value="ta">Tamil Voice (&quot;டோக்கன் 15, அறை 2&quot;)</option>
                            <option value="si">Sinhala Voice (&quot;ටෝකන් 15, කාමරය 2&quot;)</option>
                        </select>
                        <p className="text-[10px] text-slate-400">
                            Uses TV browser speech synthesis if voices are installed; never blocks if unavailable.
                        </p>
                    </div>
                </div>
            </div>

            {/* 4. Bottom Ticker & Theme */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-white/5">
                    <MessageSquare className="w-5 h-5 text-indigo-500" />
                    <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            Footer Ticker & Theme
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Marquee notice along the bottom of the TV display.
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Scrolling Message
                    </label>
                    <input
                        type="text"
                        value={data.ticker_text}
                        onChange={(e) => setData('ticker_text', e.target.value)}
                        placeholder="Please keep your token slip ready. Keep the waiting area quiet and comfortable."
                        className="w-full text-xs rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/50 px-4 py-3 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                            Color Theme
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setData('theme', 'dark')}
                                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                                    data.theme === 'dark'
                                        ? 'bg-slate-950 text-white border-slate-700 ring-2 ring-slate-600'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent'
                                }`}
                            >
                                Dark (Default · High Contrast)
                            </button>
                            <button
                                type="button"
                                onClick={() => setData('theme', 'light')}
                                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-semibold border text-center transition-all ${
                                    data.theme === 'light'
                                        ? 'bg-white text-slate-900 border-slate-300 ring-2 ring-slate-400'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent'
                                }`}
                            >
                                Light
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200 dark:border-white/5">
                        <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                Reduced Motion
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                                Disables 3D flip card animations for older TV boxes
                            </span>
                        </div>
                        <input
                            type="checkbox"
                            checked={data.reduced_motion}
                            onChange={(e) => setData('reduced_motion', e.target.checked)}
                            className="rounded border-slate-300 text-[#1E6FD9] focus:ring-[#1E6FD9] h-5 w-5 cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            {/* 5. Paired TVs Table */}
            <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3">
                        <Laptop className="w-5 h-5 text-[#1E6FD9]" />
                        <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                Connected TV Displays ({tvDevices.filter((d) => !d.is_revoked).length})
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Devices currently authorized with a device token.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setPairingModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Pair Device</span>
                    </button>
                </div>

                {tvDevices.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                        No TVs paired yet. Click &quot;Pair New TV&quot; to generate a 6-digit code or QR.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400">
                                    <th className="py-2.5 font-semibold">Device Name</th>
                                    <th className="py-2.5 font-semibold">Status</th>
                                    <th className="py-2.5 font-semibold">Last Seen</th>
                                    <th className="py-2.5 font-semibold">Doctor Scope</th>
                                    <th className="py-2.5 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {tvDevices.map((dev) => (
                                    <tr key={dev.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                        <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                                            {dev.name}
                                        </td>
                                        <td className="py-3">
                                            {dev.is_revoked ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500">
                                                    <XCircle className="w-3.5 h-3.5" /> Revoked
                                                </span>
                                            ) : dev.is_online ? (
                                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Online
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                                                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600" /> Offline
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 text-slate-500 dark:text-slate-400">
                                            {dev.last_seen_at}
                                        </td>
                                        <td className="py-3 text-slate-500 dark:text-slate-400">
                                            {dev.doctor_ids && dev.doctor_ids.length > 0 ? (
                                                <span>{dev.doctor_ids.length} selected doctor(s)</span>
                                            ) : (
                                                <span className="text-slate-400">All Live Doctors</span>
                                            )}
                                        </td>
                                        <td className="py-3 text-right">
                                            {!dev.is_revoked && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRevokeDevice(dev.id)}
                                                    disabled={revokingId === dev.id}
                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 px-2 py-1 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                    <span>Revoke</span>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Pairing Modal */}
            <TvPairingModal
                isOpen={pairingModalOpen}
                onClose={() => {
                    setPairingModalOpen(false);
                    router.reload({ only: ['tvDevices'] });
                }}
                clinicName={clinicName}
                subdomain={subdomain}
                availableDoctors={availableDoctors}
            />
        </div>
    );
}
