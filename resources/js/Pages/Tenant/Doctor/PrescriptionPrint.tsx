import React, { useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { Printer, Download } from 'lucide-react';

interface FormattedItem {
    id: number;
    display_name: string;
    generic_name?: string;
    strength_text?: string;
    dosage_form?: string;
    brand_name?: string;
    dose_display: string;
    frequency: string;
    frequency_text?: string;
    timing_text: string;
    duration_text: string;
    quantity: number;
    source: string;
    instructions?: string;
}

interface Props {
    current_lang?: 'en' | 'ta' | 'si';
    clinic: {
        name: string;
        address?: string;
        phone?: string;
        logo_url?: string;
    };
    doctor: {
        name: string;
        specialty: string;
        slmc_number?: string;
        show_slmc: boolean;
    };
    patient: {
        name: string;
        age: number | null;
        gender: string;
        phone: string;
    };
    prescription: {
        prescription_number: string;
        date: string;
        diagnosis?: string;
        show_diagnosis: boolean;
        follow_up_date?: string;
        items: FormattedItem[];
    };
    labels: {
        prescription: string;
        diagnosis: string;
        slmc_reg: string;
        patient: string;
        age: string;
        gender: string;
        date: string;
        rx_number: string;
        follow_up: string;
        doctor_signature: string;
        buy_outside: string;
    };
}

export default function PrescriptionPrint({
    current_lang = 'en',
    clinic,
    doctor,
    patient,
    prescription,
    labels,
}: Props) {
    useEffect(() => {
        // Auto trigger print dialog on first load unless user is switching languages
        const params = new URLSearchParams(window.location.search);
        if (!params.has('lang')) {
            const timer = setTimeout(() => {
                window.print();
            }, 450);
            return () => clearTimeout(timer);
        }
    }, []);

    return (
        <div className="min-h-screen bg-slate-100 p-4 sm:p-8 print:p-0 print:bg-white text-slate-900 font-sans">
            <Head title={`Prescription - ${prescription.prescription_number} - ${patient.name}`} />

            {/* Print toolbar (hidden during print) */}
            <div className="max-w-[148mm] mx-auto mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
                {/* 3-way Language Selector */}
                <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-600">
                        Language:
                    </span>
                    <div className="inline-flex rounded-xl border border-slate-300 bg-white p-1 shadow-xs">
                        <button
                            type="button"
                            onClick={() => router.get(window.location.pathname, { lang: 'en' }, { preserveScroll: true })}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                                current_lang === 'en'
                                    ? 'bg-[#1E6FD9] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            English
                        </button>
                        <button
                            type="button"
                            onClick={() => router.get(window.location.pathname, { lang: 'ta' }, { preserveScroll: true })}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                                current_lang === 'ta'
                                    ? 'bg-[#1E6FD9] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            தமிழ்
                        </button>
                        <button
                            type="button"
                            onClick={() => router.get(window.location.pathname, { lang: 'si' }, { preserveScroll: true })}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                                current_lang === 'si'
                                    ? 'bg-[#1E6FD9] text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                            }`}
                        >
                            සිංහල
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <a
                        href={`${window.location.pathname}?format=pdf&lang=${current_lang}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-xs transition-colors"
                        title="Download A4 official PDF"
                    >
                        <Download className="w-3.5 h-3.5" />
                        <span>PDF</span>
                    </a>
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-[#1E6FD9] hover:bg-[#1859ae] shadow-md shadow-[#1E6FD9]/20 transition-all hover:scale-[1.02]"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print (A5)</span>
                    </button>
                </div>
            </div>

            {/* A5 Printable Sheet */}
            <div className="max-w-[148mm] min-h-[210mm] mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-xl border border-slate-200 print:border-none print:shadow-none print:rounded-none print:p-6 print:m-0 flex flex-col justify-between">
                <div>
                    {/* Header: Clinic & Doctor */}
                    <div className="border-b-2 border-slate-900 pb-3 flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                                {clinic.name}
                            </h1>
                            <p className="text-[10px] text-slate-600 leading-tight mt-0.5">
                                {clinic.address}
                                {clinic.phone && ` • Tel: ${clinic.phone}`}
                            </p>
                        </div>
                        <div className="text-right shrink-0">
                            <h2 className="text-sm font-bold text-slate-950">
                                {doctor.name}
                            </h2>
                            <p className="text-[10px] text-slate-600 font-medium">
                                {doctor.specialty}
                            </p>
                            {doctor.show_slmc && doctor.slmc_number && (
                                <p className="text-[9px] text-slate-500 font-mono">
                                    {labels.slmc_reg}: {doctor.slmc_number}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Patient Information & Rx Meta Ribbon */}
                    <div className="py-2.5 border-b border-slate-200 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                            <span className="font-bold text-slate-500">{labels.patient}: </span>
                            <span className="font-black text-slate-950">{patient.name}</span>
                            <span className="text-slate-500 ml-1">
                                ({patient.gender || 'Patient'}{patient.age ? `, ${patient.age}y` : ''})
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="font-bold text-slate-500">{labels.date}: </span>
                            <span className="font-semibold text-slate-900">{prescription.date}</span>
                        </div>
                        <div>
                            <span className="font-bold text-slate-500">{labels.rx_number}: </span>
                            <span className="font-mono font-bold text-slate-900">{prescription.prescription_number}</span>
                        </div>
                        {patient.phone && (
                            <div className="text-right text-slate-500 text-[10px]">
                                Tel: {patient.phone}
                            </div>
                        )}
                    </div>

                    {/* Diagnosis line (if enabled in clinic settings) */}
                    {prescription.show_diagnosis && prescription.diagnosis && (
                        <div className="py-1.5 border-b border-slate-100 text-[11px]">
                            <span className="font-bold text-slate-600">{labels.diagnosis}: </span>
                            <span className="font-semibold text-slate-900">{prescription.diagnosis}</span>
                        </div>
                    )}

                    {/* Rx Symbol & Medicines List */}
                    <div className="pt-3">
                        <div className="text-xl font-black font-serif italic text-slate-900 mb-2">
                            &#8478;
                        </div>

                        <div className="space-y-3">
                            {prescription.items.map((item, idx) => (
                                <div key={idx} className="text-xs pl-2 border-l-2 border-slate-300">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <div className="font-bold text-slate-950 text-xs">
                                            {idx + 1}. {item.display_name}
                                        </div>
                                        <div className="text-right shrink-0 font-black text-slate-900 font-mono text-[11px]">
                                            Qty: {item.quantity}
                                        </div>
                                    </div>

                                    {/* Dosage, timing, duration */}
                                    <div className="text-[11px] text-slate-700 font-medium mt-0.5 flex flex-wrap items-center gap-x-2">
                                        <span>Dose: <strong>{item.dose_display}</strong></span>
                                        <span>•</span>
                                        <span>{item.frequency_text || item.frequency}</span>
                                        <span>•</span>
                                        <span className="text-slate-900 font-semibold">{item.timing_text}</span>
                                        {item.duration_text && (
                                            <>
                                                <span>•</span>
                                                <span>{item.duration_text}</span>
                                            </>
                                        )}
                                        {item.source === 'outside' && (
                                            <span className="ml-1 text-[9px] font-bold px-1.5 py-0.2 bg-slate-100 border border-slate-300 rounded text-slate-600 uppercase">
                                                {labels.buy_outside}
                                            </span>
                                        )}
                                    </div>

                                    {/* Instructions if present */}
                                    {item.instructions && (
                                        <div className="text-[10px] text-slate-500 italic mt-0.5">
                                            &ldquo;{item.instructions}&rdquo;
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer: Follow-up & Doctor Stamp/Signature */}
                <div className="pt-6 mt-6 border-t border-slate-200">
                    <div className="flex items-end justify-between">
                        <div className="text-[10px] text-slate-600">
                            {prescription.follow_up_date && (
                                <p className="font-semibold text-slate-900">
                                    {labels.follow_up}: {prescription.follow_up_date}
                                </p>
                            )}
                            <p className="text-slate-400 mt-1">Generated by MedVisit Clinic Management</p>
                        </div>

                        <div className="text-center w-40">
                            <div className="h-14 border-b border-dashed border-slate-400 mb-1" />
                            <span className="text-[10px] font-bold text-slate-600 uppercase block tracking-wider">
                                {labels.doctor_signature}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS Print Styles */}
            <style>{`
                @media print {
                    @page {
                        size: A5 portrait;
                        margin: 10mm;
                    }
                    body {
                        background: #ffffff !important;
                        color: #000000 !important;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                }
            `}</style>
        </div>
    );
}
