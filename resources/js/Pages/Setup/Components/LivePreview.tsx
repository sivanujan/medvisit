import React, { useEffect, useState } from 'react';
import {
    MapPin,
    Phone,
    Mail,
    MessageCircle,
    Clock,
    CheckCircle2,
    Calendar,
    Printer,
    Compass,
    Sparkles,
    ShieldCheck,
    Globe,
    ExternalLink,
    Receipt,
    QrCode,
} from 'lucide-react';
import { SetupFormData, SetupTenantInfo } from '../types';

interface Props {
    step: number;
    tenant: SetupTenantInfo;
    form: SetupFormData;
}

function useColomboClock(): string {
    const format = () =>
        new Intl.DateTimeFormat('en-GB', {
            timeZone: 'Asia/Colombo',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        }).format(new Date());

    const [time, setTime] = useState(format);
    useEffect(() => {
        const id = window.setInterval(() => setTime(format()), 15_000);
        return () => window.clearInterval(id);
    }, []);
    return time.toUpperCase();
}

/** Check if clinic is open right now based on Sri Lanka Colombo time */
function getColomboOpenStatus(hours: SetupFormData['opening_hours']): {
    isOpen: boolean;
    text: string;
} {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Colombo',
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const dayStr = parts.find((p) => p.type === 'weekday')?.value?.toLowerCase() || 'mon';
    const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const currentMins = hour * 60 + minute;

    const dayKey = dayStr.slice(0, 3);
    const schedule = hours[dayKey];

    if (!schedule || !schedule.open) {
        return { isOpen: false, text: 'Closed today' };
    }

    const [startH, startM] = (schedule.start || '08:30').split(':').map(Number);
    const [endH, endM] = (schedule.end || '17:30').split(':').map(Number);
    const openMins = startH * 60 + startM;
    const closeMins = endH * 60 + endM;

    if (currentMins >= openMins && currentMins < closeMins) {
        return { isOpen: true, text: `Open now · Closes ${schedule.end}` };
    }

    return { isOpen: false, text: `Closed now · Opens ${schedule.start}` };
}

export default function LivePreview({ step, tenant, form }: Props) {
    const colomboTime = useColomboClock();
    const openStatus = getColomboOpenStatus(form.opening_hours);
    const brand = form.brand_color || '#0E9E8F';
    const clinicName = tenant.name || 'Your Clinic';
    const initial = (clinicName.trim().charAt(0) || 'C').toUpperCase();

    return (
        <div className="w-full lg:w-[380px] xl:w-[410px] shrink-0">
            <div className="sticky top-20 rounded-3xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 p-5 shadow-sm space-y-4">
                {/* Preview Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                        <span className="relative flex h-2.5 w-2.5">
                            <span
                                className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                                style={{ backgroundColor: brand }}
                            />
                            <span
                                className="relative inline-flex rounded-full h-2.5 w-2.5"
                                style={{ backgroundColor: brand }}
                            />
                        </span>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            Live preview
                        </span>
                    </div>

                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 font-medium">
                        {step === 1 || step === 11
                            ? 'Queue TV'
                            : step === 2 || step === 3
                            ? 'Public Website'
                            : step === 4
                            ? 'Contact Card'
                            : step === 5
                            ? 'Opening Hours'
                            : step === 6
                            ? 'Services'
                            : step === 7
                            ? 'Patient Booking'
                            : step === 8
                            ? 'Navigation Menu'
                            : step === 9
                            ? '80mm Thermal Slip'
                            : 'Directory Listing'}
                    </span>
                </div>

                {/* Contextual Preview Content */}
                <div className="min-h-[360px] flex flex-col justify-center">
                    {/* Step 1 & 11: TV Waiting Room Display */}
                    {(step === 1 || step === 11) && (
                        <div className="space-y-3">
                            <div className="relative rounded-2xl overflow-hidden bg-slate-950 text-white p-5 border border-slate-800 shadow-xl">
                                {/* Ambient Glow */}
                                <div
                                    className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl opacity-30 pointer-events-none"
                                    style={{ background: brand }}
                                />

                                {/* TV Top Bar */}
                                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
                                    <div className="flex items-center gap-2.5">
                                        {form.logo_url ? (
                                            <img
                                                src={form.logo_url}
                                                alt="Logo"
                                                className="h-7 w-7 object-contain rounded-md bg-white/10 p-0.5"
                                            />
                                        ) : (
                                            <div
                                                className="h-7 w-7 rounded-md flex items-center justify-center text-xs font-bold text-white shadow-xs"
                                                style={{ background: brand }}
                                            >
                                                {initial}
                                            </div>
                                        )}
                                        <span className="text-xs font-bold tracking-tight truncate max-w-[140px]">
                                            {clinicName}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                                        <Clock className="w-3 h-3 text-slate-500" />
                                        <span>{colomboTime}</span>
                                    </div>
                                </div>

                                {/* TV Token Display */}
                                <div className="text-center py-5 space-y-1">
                                    <p
                                        className="text-[11px] font-bold uppercase tracking-widest"
                                        style={{ color: brand }}
                                    >
                                        NOW SERVING
                                    </p>
                                    <div className="text-5xl font-black tracking-tight font-mono text-white drop-shadow-md">
                                        01
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium">Room 1 · Dr. Consultation</p>
                                </div>

                                {/* TV Up Next */}
                                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                                    <span>Next in queue:</span>
                                    <div className="flex gap-2 font-mono font-bold text-white">
                                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                                            02
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                                            03
                                        </span>
                                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                                            04
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
                                Stream live token queues to any waiting-room TV or tablet.
                            </p>
                        </div>
                    )}

                    {/* Step 2: Logo & Brand colors */}
                    {step === 2 && (
                        <div className="space-y-4">
                            {/* Website Navbar Preview */}
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 p-4 space-y-3">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    Clinic website header
                                </span>
                                <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xs">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        {form.logo_url ? (
                                            <img
                                                src={form.logo_url}
                                                alt="Logo"
                                                className="h-8 w-8 object-contain rounded-lg border border-slate-200 dark:border-white/10 p-0.5 bg-white shrink-0"
                                            />
                                        ) : (
                                            <div
                                                className="h-8 w-8 rounded-lg flex items-center justify-center text-sm font-bold text-white shadow-sm shrink-0"
                                                style={{ background: brand }}
                                            >
                                                {initial}
                                            </div>
                                        )}
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                {clinicName}
                                            </p>
                                            <p className="text-[10px] text-slate-400 truncate">
                                                {tenant.subdomain}.medvisit.lk
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white shadow-xs shrink-0"
                                        style={{ background: brand }}
                                    >
                                        Book token
                                    </button>
                                </div>
                            </div>

                            {/* Mini Token TV card */}
                            <div
                                className="rounded-2xl p-4 text-white shadow-md space-y-2 relative overflow-hidden"
                                style={{
                                    background: `linear-gradient(135deg, ${brand} 0%, #0f172a 100%)`,
                                }}
                            >
                                <div className="flex items-center justify-between text-[11px] opacity-90">
                                    <span>Token Display Theme</span>
                                    <span className="font-mono">{colomboTime}</span>
                                </div>
                                <div className="text-2xl font-black font-mono">TOKEN #14</div>
                                <div className="text-xs opacity-90">Estimated wait: ~10 mins</div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Clinic Cover Photo */}
                    {step === 3 && (
                        <div className="space-y-3">
                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-md">
                                {form.cover_photo_url ? (
                                    <div className="relative h-44 w-full">
                                        <img
                                            src={form.cover_photo_url}
                                            alt="Clinic cover"
                                            className="h-full w-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                                    </div>
                                ) : (
                                    <div
                                        className="h-44 w-full flex flex-col justify-end p-4 relative"
                                        style={{
                                            background: `linear-gradient(135deg, ${brand} 0%, #1E6FD9 60%, #0f172a 100%)`,
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-15" />
                                    </div>
                                )}

                                <div className="absolute bottom-3 left-3 right-3 text-white">
                                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/40 backdrop-blur-md">
                                        Public Hero
                                    </span>
                                    <h4 className="text-base font-bold drop-shadow-md truncate mt-1">
                                        {clinicName}
                                    </h4>
                                    <p className="text-xs text-white/90 drop-shadow-sm truncate">
                                        Welcome to modern, queue-free healthcare.
                                    </p>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
                                {form.cover_photo_url
                                    ? 'High-resolution photo displayed prominently on your website and directory.'
                                    : 'A modern brand gradient will be shown as your clean fallback hero.'}
                            </p>
                        </div>
                    )}

                    {/* Step 4: Location & Contact */}
                    {step === 4 && (
                        <div className="space-y-3">
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-[#1E6FD9]" />
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Patient contact card
                                    </span>
                                </div>

                                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 space-y-2 text-xs">
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                                        {form.address_line || '123 Hospital Road'}
                                        {form.city ? `, ${form.city}` : ', Colombo'}
                                        {form.district ? ` (${form.district})` : ''}
                                    </p>

                                    {form.phone && (
                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                                            <span>{form.phone}</span>
                                        </div>
                                    )}

                                    {form.whatsapp && (
                                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                                            <MessageCircle className="w-3.5 h-3.5" />
                                            <span>WhatsApp: {form.whatsapp}</span>
                                        </div>
                                    )}

                                    {form.email && (
                                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="truncate">{form.email}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                                    <span>GPS Pin Status:</span>
                                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        Pinned in Sri Lanka
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 5: Opening Hours */}
                    {step === 5 && (
                        <div className="space-y-3">
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-[#0E9E8F]" />
                                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                            Clinic Schedule
                                        </span>
                                    </div>
                                    <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            openStatus.isOpen
                                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                        }`}
                                    >
                                        {openStatus.text}
                                    </span>
                                </div>

                                <div className="space-y-1.5 text-xs max-h-56 overflow-y-auto pr-1">
                                    {['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => {
                                        const schedule = form.opening_hours[d];
                                        const dayLabel = {
                                            mon: 'Monday',
                                            tue: 'Tuesday',
                                            wed: 'Wednesday',
                                            thu: 'Thursday',
                                            fri: 'Friday',
                                            sat: 'Saturday',
                                            sun: 'Sunday',
                                        }[d];

                                        return (
                                            <div
                                                key={d}
                                                className="flex items-center justify-between py-1 px-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-slate-200/50 dark:border-white/5"
                                            >
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                    {dayLabel}
                                                </span>
                                                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                                    {schedule?.open
                                                        ? `${schedule.start} – ${schedule.end}`
                                                        : 'Closed'}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {form.opening_hours_note && (
                                    <p className="text-[11px] text-amber-600 dark:text-amber-400 italic bg-amber-50 dark:bg-amber-950/30 p-2 rounded-xl border border-amber-200 dark:border-amber-900/40">
                                        Note: {form.opening_hours_note}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 6: Services */}
                    {step === 6 && (
                        <div className="space-y-3">
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 p-4 space-y-3">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    Website services grid ({form.services.length} selected)
                                </span>

                                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                                    {form.services.map((service, idx) => (
                                        <div
                                            key={idx}
                                            className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 flex items-center gap-2 text-xs shadow-xs"
                                        >
                                            <span
                                                className="w-1.5 h-1.5 rounded-full shrink-0"
                                                style={{ backgroundColor: brand }}
                                            />
                                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                {service}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 7: Online Booking */}
                    {step === 7 && (
                        <div className="space-y-3">
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 p-4 space-y-3">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    Patient Booking Button
                                </span>

                                {form.online_booking_enabled ? (
                                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 space-y-3 text-center">
                                        <button
                                            type="button"
                                            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2"
                                            style={{ background: brand }}
                                        >
                                            <Globe className="w-4 h-4" />
                                            <span>Book a token online</span>
                                        </button>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                            Max {form.max_active_tokens_per_phone} active tokens per phone
                                            number
                                            {form.require_phone_verification && ' · OTP verified'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 space-y-2 text-center">
                                        <div className="py-2 px-3 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 text-xs font-semibold">
                                            Online booking is paused
                                        </div>
                                        <p className="text-[11px] text-slate-400">
                                            Patients will see &quot;Walk-ins only / Call to book&quot;
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 8: Pharmacy */}
                    {step === 8 && (
                        <div className="space-y-3">
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 p-4 space-y-3">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    Sidebar Menu Preview
                                </span>

                                <div className="space-y-1.5 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-white/10 text-xs">
                                    <div className="p-2 rounded-lg text-slate-700 dark:text-slate-300 font-medium">
                                        Dashboard
                                    </div>
                                    <div className="p-2 rounded-lg text-slate-700 dark:text-slate-300 font-medium">
                                        Sessions & Queue
                                    </div>

                                    {form.pharmacy_enabled ? (
                                        <div
                                            className="p-2 rounded-lg font-bold flex items-center justify-between text-white shadow-xs"
                                            style={{ background: brand }}
                                        >
                                            <span>Pharmacy & Dispensary</span>
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/20">
                                                Active
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="p-2 rounded-lg text-slate-400 dark:text-slate-600 italic line-through">
                                            Pharmacy & Dispensary (Hidden)
                                        </div>
                                    )}

                                    <div className="p-2 rounded-lg text-slate-700 dark:text-slate-300 font-medium">
                                        Billing & Invoices
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 9: Printing */}
                    {step === 9 && (
                        <div className="space-y-3">
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-100/80 dark:bg-slate-950/60 p-4">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-2">
                                    80mm Thermal Slip Mockup
                                </span>

                                {/* Thermal Slip */}
                                <div className="bg-white text-slate-900 rounded-lg p-3 shadow-md font-mono text-[11px] leading-tight space-y-2 border border-slate-200 max-w-[260px] mx-auto">
                                    {form.print_header_show_logo && (
                                        <div className="text-center font-bold text-xs uppercase tracking-wider">
                                            {clinicName}
                                        </div>
                                    )}
                                    {form.print_header_show_address && (
                                        <div className="text-center text-[10px] text-slate-600">
                                            {form.address_line || 'Colombo, Sri Lanka'}
                                            {form.registration_number && (
                                                <div>Reg: {form.registration_number}</div>
                                            )}
                                        </div>
                                    )}

                                    <div className="border-t border-dashed border-slate-400 my-1.5" />

                                    <div className="text-center">
                                        <div className="text-[10px] uppercase font-bold">TOKEN NUMBER</div>
                                        <div className="text-2xl font-black my-0.5">#01</div>
                                        <div className="text-[10px] text-slate-600">{colomboTime}</div>
                                    </div>

                                    <div className="border-t border-dashed border-slate-400 my-1.5" />

                                    <div className="text-[10px] space-y-0.5">
                                        <div>Ref: {form.receipt_prefix || 'REC'}-00101</div>
                                        <div>Format: {form.print_receipt_format.toUpperCase()}</div>
                                        <div>Auto-print: {form.print_token_slip_autoprint ? 'YES' : 'NO'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 10: Public Directory */}
                    {step === 10 && (
                        <div className="space-y-3">
                            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-slate-950/60 p-4 space-y-3">
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    medvisit.lk/find card
                                </span>

                                {form.directory_enabled ? (
                                    <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 space-y-2 text-xs shadow-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-900 dark:text-white truncate">
                                                {clinicName}
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 flex items-center gap-1 shrink-0">
                                                <ShieldCheck className="w-3 h-3" />
                                                Verified
                                            </span>
                                        </div>

                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                            <MapPin className="w-3 h-3 text-[#1E6FD9] shrink-0" />
                                            <span>
                                                {form.city || 'Colombo'}, {form.district || 'Colombo'}
                                            </span>
                                        </p>

                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {form.services.slice(0, 3).map((s, i) => (
                                                <span
                                                    key={i}
                                                    className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-[10px] text-slate-600 dark:text-slate-300"
                                                >
                                                    {s}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 text-center text-xs text-slate-400">
                                        Clinic is unlisted from public directory
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
