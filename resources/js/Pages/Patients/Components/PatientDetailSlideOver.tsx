import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    X,
    Phone,
    MessageSquare,
    Ticket,
    Calendar,
    Clock,
    User,
    Shield,
    Eye,
    EyeOff,
    AlertTriangle,
    MapPin,
    FileText,
    Receipt,
    ArrowRightLeft,
    CheckCircle2,
    Lock,
    ExternalLink,
    AlertCircle,
    Copy,
    Check,
} from 'lucide-react';
import { getDoctorColor } from '@/Utils/doctorColors';
import {
    PatientItem,
    PatientHistoryData,
    HistoryVisit,
    HistoryUpcomingToken,
    HistoryPrescription,
    HistoryBill,
    UserPermissions,
} from '../types';

interface PatientDetailSlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    patient: PatientItem | null;
    userPermissions: UserPermissions;
    onIssueToken: (patient: PatientItem) => void;
    onMoveToken: (token: any) => void;
    onEditPatient: (patient: PatientItem) => void;
}

export const PatientDetailSlideOver: React.FC<PatientDetailSlideOverProps> = ({
    isOpen,
    onClose,
    patient,
    userPermissions,
    onIssueToken,
    onMoveToken,
    onEditPatient,
}) => {
    const [activeTab, setActiveTab] = useState<'visits' | 'upcoming' | 'prescriptions' | 'bills'>('visits');
    const [historyData, setHistoryData] = useState<PatientHistoryData | null>(null);
    const [loading, setLoading] = useState(false);
    const [revealedNic, setRevealedNic] = useState<string | null>(null);
    const [revealingNic, setRevealingNic] = useState(false);
    const [copiedPhone, setCopiedPhone] = useState(false);

    // Fetch history when patient changes or drawer opens
    useEffect(() => {
        if (!isOpen || !patient) {
            setHistoryData(null);
            setRevealedNic(null);
            return;
        }

        let isMounted = true;
        setLoading(true);
        setActiveTab('visits');

        axios
            .get<PatientHistoryData>(`/patients/${patient.id}/history`)
            .then((res) => {
                if (isMounted) {
                    setHistoryData(res.data);
                }
            })
            .catch((err) => {
                console.error('Failed to load patient history', err);
            })
            .finally(() => {
                if (isMounted) setLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, patient?.id]);

    // Handle ESC key to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !patient) return null;

    const docColor = getDoctorColor(patient.id);
    const whatsappNumber = (patient.phone_normalized || patient.phone_raw || '').replace(/\D/g, '');

    const handleRevealNic = async () => {
        if (!userPermissions.can_reveal_nic) return;
        setRevealingNic(true);
        try {
            const res = await axios.post<{ nic: string }>(`/patients/${patient.id}/reveal-nic`);
            setRevealedNic(res.data.nic);
        } catch (err) {
            console.error('Failed to reveal NIC', err);
        } finally {
            setRevealingNic(false);
        }
    };

    const copyPhone = () => {
        navigator.clipboard.writeText(patient.phone_display || patient.phone_raw);
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
                <aside
                    aria-label="Patient details"
                    className="w-screen max-w-lg bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl border-l border-slate-200/80 dark:border-white/10 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
                >
                    {/* Top Header */}
                    <div className="p-5 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/5 flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-0">
                            <div
                                className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-2xl flex items-center justify-center font-bold text-xl text-white shadow-md shrink-0 bg-gradient-to-tr ${docColor.gradient} select-none leading-none`}
                            >
                                {patient.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white truncate">
                                        {patient.name}
                                    </h2>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-semibold shrink-0">
                                        {patient.formatted_id}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                                    <span>{patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : 'Unknown'}</span>
                                    <span>•</span>
                                    <span>{patient.age !== null ? `${patient.age} yrs` : 'Age unrecorded'}</span>
                                    <span>•</span>
                                    <span>{patient.visits_formatted}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                type="button"
                                onClick={() => onEditPatient(patient)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
                            >
                                Edit
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
                                aria-label="Close side panel"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Quick Action Ribbon */}
                    <div className="px-5 py-3 border-b border-slate-200/60 dark:border-white/5 bg-slate-100/40 dark:bg-white/[0.02] flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                            {/* Call */}
                            <a
                                href={`tel:${patient.phone_normalized || patient.phone_raw}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/60 dark:border-emerald-800/40 transition-colors"
                                title="Call patient"
                            >
                                <Phone className="w-3.5 h-3.5" />
                                <span>Call</span>
                            </a>

                            {/* WhatsApp */}
                            {whatsappNumber && (
                                <a
                                    href={`https://wa.me/${whatsappNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200/60 dark:border-teal-800/40 transition-colors"
                                    title="Open WhatsApp chat"
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    <span>WhatsApp</span>
                                </a>
                            )}

                            {/* Copy phone */}
                            <button
                                type="button"
                                onClick={copyPhone}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors text-xs"
                                title="Copy mobile number"
                            >
                                {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>

                        {/* Primary Issue Token */}
                        <button
                            type="button"
                            onClick={() => onIssueToken(patient)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-xs transition-colors"
                        >
                            <Ticket className="w-3.5 h-3.5" />
                            <span>Issue token</span>
                        </button>
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-4">
                        {/* Duplicate Alert Card */}
                        {patient.is_possible_duplicate && (
                            <div className="p-3.5 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs">
                                <div className="flex items-start gap-2.5">
                                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="font-bold">Possible duplicate record detected</p>
                                        <p className="text-[11px] text-amber-800 dark:text-amber-300">
                                            {patient.duplicate_reason || 'Shares identical phone number or NIC with another patient.'}
                                        </p>
                                        {historyData?.duplicates && historyData.duplicates.length > 0 && (
                                            <div className="pt-2 border-t border-amber-500/20 mt-2 space-y-1">
                                                <p className="text-[10px] uppercase font-bold tracking-wider text-amber-700 dark:text-amber-300">
                                                    Matching Profiles
                                                </p>
                                                {historyData.duplicates.map((dup) => (
                                                    <div key={dup.id} className="text-[11px] flex items-center justify-between">
                                                        <span>{dup.name} ({dup.phone_display})</span>
                                                        <span className="font-mono text-[10px] text-amber-700 dark:text-amber-400">{dup.match_reason}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Demographics Card */}
                        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-3">
                            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Patient Details
                            </h3>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Mobile number</span>
                                    <span className="font-semibold text-slate-900 dark:text-white font-mono">
                                        {patient.phone_display}
                                    </span>
                                </div>

                                <div>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">National ID (NIC)</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-semibold text-slate-900 dark:text-white font-mono">
                                            {revealedNic || patient.nic_masked}
                                        </span>
                                        {!revealedNic && userPermissions.can_reveal_nic && (
                                            <button
                                                type="button"
                                                onClick={handleRevealNic}
                                                disabled={revealingNic}
                                                className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 font-bold transition-colors inline-flex items-center gap-1"
                                                title="Reveal unmasked NIC (audit-logged)"
                                            >
                                                <Eye className="w-3 h-3" />
                                                <span>{revealingNic ? '...' : 'Reveal'}</span>
                                            </button>
                                        )}
                                    </div>
                                    {revealedNic && (
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                                            <CheckCircle2 className="w-3 h-3" />
                                            NIC revealed & logged
                                        </span>
                                    )}
                                </div>

                                <div>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Location</span>
                                    <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                        {patient.location_display}
                                    </span>
                                    {patient.address && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                            {patient.address}
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Date of birth</span>
                                    <span className="font-semibold text-slate-900 dark:text-white">
                                        {patient.date_of_birth || 'Unrecorded'}
                                    </span>
                                </div>

                                {patient.emergency_contact_name && (
                                    <div className="col-span-2 pt-2 border-t border-slate-200/60 dark:border-white/5">
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Emergency contact</span>
                                        <span className="font-semibold text-slate-900 dark:text-white">
                                            {patient.emergency_contact_name} {patient.emergency_contact_phone ? `(${patient.emergency_contact_phone})` : ''}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Allergy Alert */}
                            {patient.allergies && (
                                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-900/50 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-bold block">Known allergies</span>
                                        <span className="text-[11px] font-medium">{patient.allergies}</span>
                                    </div>
                                </div>
                            )}

                            {/* Notes */}
                            {patient.notes && (
                                <div className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-white/5 text-xs text-slate-700 dark:text-slate-300 italic">
                                    "{patient.notes}"
                                </div>
                            )}
                        </div>

                        {/* Navigation Tabs */}
                        <div className="border-b border-slate-200/80 dark:border-white/10 flex items-center gap-1">
                            <button
                                type="button"
                                onClick={() => setActiveTab('visits')}
                                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                                    activeTab === 'visits'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <Clock className="w-3.5 h-3.5" />
                                <span>Visits timeline</span>
                                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-white/10">
                                    {historyData?.visits?.length ?? patient.tokens_count}
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('upcoming')}
                                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                                    activeTab === 'upcoming'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <Calendar className="w-3.5 h-3.5" />
                                <span>Upcoming</span>
                                {historyData?.upcoming_tokens && historyData.upcoming_tokens.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                                        {historyData.upcoming_tokens.length}
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('prescriptions')}
                                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                                    activeTab === 'prescriptions'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <FileText className="w-3.5 h-3.5" />
                                <span>Prescriptions</span>
                                {userPermissions.can_view_prescriptions && historyData?.prescriptions && (
                                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-white/10">
                                        {historyData.prescriptions.length}
                                    </span>
                                )}
                            </button>

                            <button
                                type="button"
                                onClick={() => setActiveTab('bills')}
                                className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                                    activeTab === 'bills'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                }`}
                            >
                                <Receipt className="w-3.5 h-3.5" />
                                <span>Bills</span>
                                {historyData?.bills && (
                                    <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-white/10">
                                        {historyData.bills.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* TAB 1: VISITS TIMELINE */}
                        {activeTab === 'visits' && (
                            <div className="space-y-3">
                                {loading ? (
                                    <div className="py-8 text-center text-xs text-slate-400">Loading visit records...</div>
                                ) : !historyData?.visits || historyData.visits.length === 0 ? (
                                    <div className="py-8 text-center space-y-2">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">No visit history recorded yet.</p>
                                        <button
                                            type="button"
                                            onClick={() => onIssueToken(patient)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:text-teal-300"
                                        >
                                            <Ticket className="w-3.5 h-3.5" />
                                            <span>Issue first token</span>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-white/10">
                                        {historyData.visits.map((v) => (
                                            <div key={v.id} className="relative group">
                                                {/* Timeline dot */}
                                                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-white dark:border-slate-900 ring-2 ring-primary/20" />

                                                <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-white/[0.03] border border-slate-200/70 dark:border-white/5 space-y-2 hover:border-primary/40 transition-colors">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                                    {v.session_date}
                                                                </span>
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary/10 text-primary font-bold">
                                                                    #{v.token_number}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 font-medium">
                                                                {v.doctor_name}
                                                            </p>
                                                            <p className="text-[11px] text-slate-400">
                                                                {v.doctor_specialty} • {v.room_number}
                                                            </p>
                                                        </div>

                                                        <div className="text-right">
                                                            <span
                                                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                                                                    v.status === 'completed'
                                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                                        : v.status === 'cancelled'
                                                                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                                                        : v.status === 'moved'
                                                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                                        : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300'
                                                                }`}
                                                            >
                                                                {v.status.replace('_', ' ')}
                                                            </span>
                                                            <span className="block text-[11px] text-slate-400 mt-1">
                                                                {v.estimated_time}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Billing snippet */}
                                                    <div className="pt-2 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between text-[11px]">
                                                        <span className="text-slate-500 dark:text-slate-400">
                                                            {v.receipt_number || 'Receipt pending'}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-slate-900 dark:text-white">
                                                                {v.bill_amount_formatted}
                                                            </span>
                                                            {v.status !== 'completed' && v.status !== 'cancelled' && v.status !== 'moved' && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => onMoveToken(v)}
                                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                                                                >
                                                                    <ArrowRightLeft className="w-3 h-3" />
                                                                    <span>Move</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* TAB 2: UPCOMING APPOINTMENTS */}
                        {activeTab === 'upcoming' && (
                            <div className="space-y-3">
                                {loading ? (
                                    <div className="py-8 text-center text-xs text-slate-400">Loading upcoming appointments...</div>
                                ) : !historyData?.upcoming_tokens || historyData.upcoming_tokens.length === 0 ? (
                                    <div className="py-8 text-center space-y-2">
                                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">No upcoming appointments scheduled.</p>
                                        <button
                                            type="button"
                                            onClick={() => onIssueToken(patient)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-xs"
                                        >
                                            <Ticket className="w-3.5 h-3.5" />
                                            <span>Issue new token</span>
                                        </button>
                                    </div>
                                ) : (
                                    historyData.upcoming_tokens.map((up) => (
                                        <div
                                            key={up.id}
                                            className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/40 space-y-2"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <span className="font-bold text-xs text-teal-900 dark:text-teal-200">
                                                        {up.session_date}
                                                    </span>
                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">
                                                        {up.doctor_name}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                                        {up.doctor_specialty} • {up.room_number} • {up.estimated_time}
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200">
                                                        Token #{up.token_number}
                                                    </span>
                                                    <span className="block text-xs font-bold text-slate-900 dark:text-white mt-1">
                                                        {up.total_fee_formatted}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="pt-2 border-t border-teal-200/50 dark:border-teal-800/30 flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => onMoveToken(up)}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300"
                                                >
                                                    <ArrowRightLeft className="w-3 h-3" />
                                                    <span>Move appointment</span>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* TAB 3: PRESCRIPTIONS (ROLE GATED) */}
                        {activeTab === 'prescriptions' && (
                            <div className="space-y-3">
                                {!userPermissions.can_view_prescriptions ? (
                                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
                                        <div className="flex items-center gap-2 font-bold">
                                            <Lock className="w-4 h-4 text-amber-600" />
                                            <span>Clinical records restricted</span>
                                        </div>
                                        <p className="text-[11px] text-amber-700 dark:text-amber-300">
                                            Prescriptions and clinical notes are restricted to doctors and clinical administrators under medical privacy guidelines.
                                        </p>
                                    </div>
                                ) : loading ? (
                                    <div className="py-8 text-center text-xs text-slate-400">Loading prescriptions...</div>
                                ) : !historyData?.prescriptions || historyData.prescriptions.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 italic">
                                        No prescriptions recorded for this patient yet.
                                    </div>
                                ) : (
                                    historyData.prescriptions.map((rx) => (
                                        <div
                                            key={rx.id}
                                            className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 space-y-2"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <span className="font-bold text-xs text-slate-900 dark:text-white">
                                                        {rx.date}
                                                    </span>
                                                    <p className="text-xs text-slate-600 dark:text-slate-300">
                                                        {rx.doctor_name} ({rx.doctor_specialty})
                                                    </p>
                                                    {rx.diagnosis && (
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">
                                                            Dx: {rx.diagnosis}
                                                        </p>
                                                    )}
                                                </div>

                                                <a
                                                    href={rx.print_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                                                >
                                                    <span>View / Print</span>
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </div>

                                            {/* Medications list */}
                                            {rx.items_summary && rx.items_summary.length > 0 && (
                                                <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex flex-wrap gap-1.5">
                                                    {rx.items_summary.map((med, i) => (
                                                        <span
                                                            key={i}
                                                            className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium"
                                                        >
                                                            {med}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* TAB 4: BILLS & RECEIPTS */}
                        {activeTab === 'bills' && (
                            <div className="space-y-3">
                                {loading ? (
                                    <div className="py-8 text-center text-xs text-slate-400">Loading billing records...</div>
                                ) : !historyData?.bills || historyData.bills.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 italic">
                                        No billing records found for this patient.
                                    </div>
                                ) : (
                                    historyData.bills.map((b) => (
                                        <div
                                            key={b.id}
                                            className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center justify-between"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                                                        {b.receipt_number}
                                                    </span>
                                                    <span
                                                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                                            b.payment_status === 'paid'
                                                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                                                : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                                        }`}
                                                    >
                                                        {b.payment_status}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                    {b.date} • {b.payment_method.toUpperCase()}
                                                </p>
                                            </div>

                                            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                                                {b.amount_formatted}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    );
};
