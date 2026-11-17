import React, { useRef } from 'react';
import { Printer, X, Calendar, User, Clock, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@/types';

export interface PrintableToken {
    id: number;
    token_number: number;
    token_display?: string | null;
    patient_name: string;
    patient_phone?: string;
    patient_phone_masked?: string;
    status: string;
    estimated_time?: string | null;
    visit_type_name?: string | null;
    notes?: string | null;
}

export interface PrintableSession {
    id: number;
    doctor_name: string;
    doctor_specialty?: string;
    doctor_token_code?: string;
    start_time: string;
    end_time: string;
    room_number?: string;
    status: string;
    current_token_display?: string | null;
    max_tokens: number;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    activeSession: PrintableSession | null;
    tokens: PrintableToken[];
    allSessions?: PrintableSession[];
}

export default function PrintTodayQueueModal({
    isOpen,
    onClose,
    activeSession,
    tokens,
    allSessions = [],
}: Props) {
    const { tenant } = usePage<PageProps>().props;
    const printAreaRef = useRef<HTMLDivElement>(null);

    if (!isOpen) return null;

    const handlePrint = () => {
        window.print();
    };

    const todayDateFormatted = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const waitingTokens = tokens.filter((t) => ['booked', 'checked_in'].includes(t.status));
    const completedTokens = tokens.filter((t) => t.status === 'completed');
    const absentTokens = tokens.filter((t) => ['skipped', 'no_show', 'cancelled'].includes(t.status));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            {/* Modal Dialog (Hidden during print) */}
            <div className="relative w-full max-w-3xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 shadow-2xl p-6 print:hidden">
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1E6FD9]/10 text-[#1E6FD9] dark:bg-[#1E6FD9]/20">
                            <Printer className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Print Today&apos;s Patient Token List
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Works 100% offline using locally loaded session data.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Preview Box */}
                <div className="my-5 max-h-[60vh] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-6 font-sans">
                    <div className="space-y-4 text-xs">
                        {/* Header */}
                        <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-start">
                            <div>
                                <h1 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                                    {tenant?.name || 'Clinic Channeling Queue'}
                                </h1>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                    {tenant?.phone ? `Tel: ${tenant.phone} • ` : ''}Date: {todayDateFormatted}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="inline-block px-2.5 py-1 rounded-md bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300 font-bold text-[11px]">
                                    {activeSession ? `${activeSession.room_number || 'Room 1'}` : "Today's Queue"}
                                </span>
                            </div>
                        </div>

                        {/* Session Metadata */}
                        {activeSession && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/5 text-[11px]">
                                <div>
                                    <span className="text-slate-400 block">Doctor:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeSession.doctor_name}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Time:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeSession.start_time} - {activeSession.end_time}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Total Tokens:</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">{tokens.length} / {activeSession.max_tokens}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Waiting:</span>
                                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{waitingTokens.length} patients</span>
                                </div>
                            </div>
                        )}

                        {/* Tokens Table */}
                        {tokens.length === 0 ? (
                            <div className="py-8 text-center text-slate-400">
                                No patient tokens booked yet for this session.
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-500 uppercase">
                                        <th className="py-2 px-2 w-16">Token</th>
                                        <th className="py-2 px-2">Patient Name</th>
                                        <th className="py-2 px-2">Phone</th>
                                        <th className="py-2 px-2">Est. Time</th>
                                        <th className="py-2 px-2 w-28">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                                    {tokens.map((t) => (
                                        <tr key={t.id} className="hover:bg-slate-100/50 dark:hover:bg-white/5">
                                            <td className="py-2 px-2 font-mono font-bold text-slate-900 dark:text-white">
                                                #{t.token_display || t.token_number}
                                            </td>
                                            <td className="py-2 px-2 font-medium text-slate-800 dark:text-slate-200">
                                                {t.patient_name}
                                                {t.visit_type_name && (
                                                    <span className="ml-1.5 text-[10px] text-slate-400 font-normal">
                                                        ({t.visit_type_name})
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-2 px-2 text-slate-500 dark:text-slate-400 font-mono text-[10px]">
                                                {t.patient_phone_masked || t.patient_phone || '—'}
                                            </td>
                                            <td className="py-2 px-2 text-slate-500 dark:text-slate-400">
                                                {t.estimated_time || '—'}
                                            </td>
                                            <td className="py-2 px-2">
                                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                                                    t.status === 'completed'
                                                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                                        : t.status === 'checked_in'
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                        : t.status === 'called'
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 font-bold'
                                                        : t.status === 'skipped' || t.status === 'no_show'
                                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                }`}>
                                                    {t.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}

                        {/* Footer Notes */}
                        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-400 flex justify-between">
                            <span>Printed from MedVisit Clinic Management System</span>
                            <span>Total Records: {tokens.length}</span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handlePrint}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1E6FD9] hover:bg-[#185bc0] text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition-all cursor-pointer"
                    >
                        <Printer className="h-4 w-4" />
                        <span>Print / Save as PDF</span>
                    </button>
                </div>
            </div>

            {/* Dedicated Print Container (Visible only when window.print() is executed) */}
            <div
                ref={printAreaRef}
                className="hidden print:block fixed inset-0 bg-white text-black p-8 font-sans z-[9999]"
            >
                <div className="border-b-2 border-slate-800 pb-4 mb-4 flex justify-between items-start">
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-tight text-black">
                            {tenant?.name || 'Clinic Channeling Queue'}
                        </h1>
                        <p className="text-xs text-slate-600 mt-0.5">
                            {tenant?.phone ? `Tel: ${tenant.phone} • ` : ''}Date: {todayDateFormatted}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-bold text-black">{activeSession?.room_number || 'Consultation Room'}</p>
                        <p className="text-xs text-slate-600">Printed: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                </div>

                {activeSession && (
                    <div className="mb-4 p-3 border border-slate-300 rounded bg-slate-50 text-xs flex justify-between">
                        <div>
                            <span className="font-semibold text-slate-600">Doctor: </span>
                            <span className="font-bold text-black">{activeSession.doctor_name}</span>
                            {activeSession.doctor_specialty && ` (${activeSession.doctor_specialty})`}
                        </div>
                        <div>
                            <span className="font-semibold text-slate-600">Session Hours: </span>
                            <span className="font-bold text-black">{activeSession.start_time} - {activeSession.end_time}</span>
                        </div>
                        <div>
                            <span className="font-semibold text-slate-600">Tokens: </span>
                            <span className="font-bold text-black">{tokens.length} booked / {activeSession.max_tokens} max</span>
                        </div>
                    </div>
                )}

                <table className="w-full text-left border-collapse text-xs">
                    <thead>
                        <tr className="border-b-2 border-slate-800 text-[11px] font-bold text-black uppercase">
                            <th className="py-2 px-2 w-16">Token</th>
                            <th className="py-2 px-2">Patient Name</th>
                            <th className="py-2 px-2">Phone</th>
                            <th className="py-2 px-2">Est. Time</th>
                            <th className="py-2 px-2 w-28">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                        {tokens.map((t) => (
                            <tr key={t.id}>
                                <td className="py-2 px-2 font-mono font-bold text-black">
                                    #{t.token_display || t.token_number}
                                </td>
                                <td className="py-2 px-2 font-medium text-black">
                                    {t.patient_name}
                                    {t.visit_type_name && ` (${t.visit_type_name})`}
                                </td>
                                <td className="py-2 px-2 font-mono text-[11px] text-slate-700">
                                    {t.patient_phone_masked || t.patient_phone || '—'}
                                </td>
                                <td className="py-2 px-2 text-slate-700">
                                    {t.estimated_time || '—'}
                                </td>
                                <td className="py-2 px-2 font-semibold capitalize text-black">
                                    {t.status.replace('_', ' ')}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-8 pt-3 border-t border-slate-300 text-[10px] text-slate-500 flex justify-between">
                    <span>MedVisit Clinic Management System • Offline Printable Queue Sheet</span>
                    <span>Total Patients: {tokens.length} • Waiting: {waitingTokens.length} • Completed: {completedTokens.length}</span>
                </div>
            </div>
        </div>
    );
}
