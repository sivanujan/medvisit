import React from 'react';
import { Compass, MapPin, ExternalLink, Stethoscope, Star, CheckCircle2 } from 'lucide-react';
import DirectorySettingsTab, { DirectorySettingsData } from '../Partials/DirectorySettingsTab';
import LivePreviewPanel from '../Components/LivePreviewPanel';

interface Props {
    settings: DirectorySettingsData;
    clinicName: string;
    logoUrl?: string;
}

export default function DirectorySection({ settings, clinicName, logoUrl }: Props) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 space-y-6">
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Public directory listing
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Publish and promote your clinic on MedVisit.lk directory with geographic search, doctor schedules and direct booking.
                    </p>
                </div>

                <DirectorySettingsTab settings={settings} />
            </div>

            <div className="lg:col-span-5 space-y-4">
                <LivePreviewPanel
                    title="MedVisit.lk search card"
                    subtitle="How patients find your clinic in the public directory"
                >
                    <div className="p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/70 dark:border-white/10 shadow-sm space-y-3.5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt={clinicName} className="w-full h-full object-contain p-1" />
                                    ) : (
                                        <div className="w-full h-full rounded-xl bg-gradient-to-tr from-[#1E6FD9] to-[#0E9E8F] text-white font-black text-sm flex items-center justify-center">
                                            {(clinicName || 'M').charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                        {clinicName || 'Clinic Name'}
                                    </h4>
                                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                        <MapPin className="w-3 h-3 text-[#0E9E8F] shrink-0" />
                                        <span className="truncate">
                                            {settings.city ? `${settings.city}, ${settings.district}` : 'Location on Map'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                                Verified
                            </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                            {settings.description ||
                                'Modern family medical center providing specialist channeling, rapid diagnostic investigations and comprehensive outpatient healthcare.'}
                        </p>

                        <div className="flex flex-wrap gap-1.5 pt-1">
                            {settings.services && settings.services.length > 0 ? (
                                settings.services.slice(0, 3).map((s) => (
                                    <span
                                        key={s}
                                        className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300"
                                    >
                                        {s}
                                    </span>
                                ))
                            ) : (
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 dark:bg-white/10 text-slate-500">
                                    Specialist Channeling
                                </span>
                            )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                <Stethoscope className="w-3.5 h-3.5 text-[#1E6FD9]" />
                                <span>{settings.active_doctors_count} active doctors</span>
                            </span>

                            <a
                                href={settings.preview_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:text-blue-600 transition-colors"
                            >
                                <span>View listing</span>
                                <ExternalLink className="w-3 h-3" />
                            </a>
                        </div>
                    </div>
                </LivePreviewPanel>
            </div>
        </div>
    );
}
