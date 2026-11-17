import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import { UserPlus, Stethoscope, Sun, Moon, AlertCircle } from 'lucide-react';
import RegisterPatientModal from '@/Pages/Patients/Components/RegisterPatientModal';
import DoctorFormModal from '@/Pages/Doctors/Components/DoctorFormModal';

interface Props {
    allDistricts: string[];
    specialties: string[];
    eligibleUsers: { id: number; name: string; email: string }[];
    doctors: any[];
}

export default function FormModalsShowcase({
    allDistricts,
    specialties,
    eligibleUsers,
    doctors,
}: Props) {
    const [patientModalOpen, setPatientModalOpen] = useState(false);
    const [editingPatient, setEditingPatient] = useState<any | null>(null);

    const [doctorModalOpen, setDoctorModalOpen] = useState(false);
    const [editingDoctor, setEditingDoctor] = useState<any | null>(null);

    const [isDark, setIsDark] = useState(false);

    const toggleTheme = () => {
        setIsDark(!isDark);
        if (!isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    // Open Empty Patient Modal
    const openEmptyPatient = () => {
        setEditingPatient(null);
        setPatientModalOpen(true);
    };

    // Open Filled Patient Modal
    const openFilledPatient = () => {
        setEditingPatient({
            id: 101,
            name: 'Sunil Shantha',
            phone: '+94 77 123 4567',
            nic: '199012345678',
            gender: 'male',
            date_of_birth: '1990-05-02',
            district: 'Colombo',
            city: 'Nugegoda',
            address: 'No. 42, Temple Road',
            allergies: 'Penicillin, Aspirin',
            notes: 'Type 2 diabetic on metformin',
            emergency_contact_name: 'S. Shantha (Spouse)',
            emergency_contact_phone: '071 234 5678',
        });
        setPatientModalOpen(true);
    };

    // Open Empty Doctor Modal
    const openEmptyDoctor = () => {
        setEditingDoctor(null);
        setDoctorModalOpen(true);
    };

    // Open Filled Doctor Modal
    const openFilledDoctor = () => {
        setEditingDoctor({
            id: 201,
            title: 'Dr.',
            name: 'Kalinga Silva',
            specialty: 'Cardiologist',
            slmc_number: '18429',
            token_code: 'KS',
            use_clinic_default_fees: false,
            doctor_fee_lkr: 2000,
            clinic_fee_lkr: 500,
            total_fee_lkr: 2500,
            avg_consultation_minutes: 20,
            user_id: 1,
            photo_url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80',
            bio: 'MBBS (Colombo), MD (Cardiology), FRCP (UK) - Senior Consultant Cardiologist at National Hospital.',
            is_active: true,
        });
        setDoctorModalOpen(true);
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 font-sans">
            <Head title="Form Modals Showcase" />

            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-5">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                            MedVisit Form System & Modal Showcase
                        </h1>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Redesigned Register Patient & Add Doctor modals with standardized 44px form controls.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={toggleTheme}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                        {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
                        <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
                    </button>
                </div>

                {/* Section: Register Patient Modal */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#1E6FD9]/10 text-[#1E6FD9] flex items-center justify-center">
                            <UserPlus className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Register patient modal
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Segmented gender (no default), Sri Lankan NIC parser, dd/mm/yyyy date picker, allergy chips, and duplicate check.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={openEmptyPatient}
                            id="btn-open-empty-patient"
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#1E6FD9] hover:bg-blue-600 shadow-sm"
                        >
                            Open empty patient modal
                        </button>

                        <button
                            type="button"
                            onClick={openFilledPatient}
                            id="btn-open-filled-patient"
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 shadow-sm"
                        >
                            Open filled patient modal
                        </button>
                    </div>
                </div>

                {/* Section: Add New Doctor Modal */}
                <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 space-y-4 shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#0E9E8F]/10 text-[#0E9E8F] flex items-center justify-center">
                            <Stethoscope className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Add new doctor modal
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Live token code suggestions, fee split switch, consultation chips, and desktop live preview card.
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={openEmptyDoctor}
                            id="btn-open-empty-doctor"
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0E9E8F] hover:bg-teal-600 shadow-sm"
                        >
                            Open empty doctor modal
                        </button>

                        <button
                            type="button"
                            onClick={openFilledDoctor}
                            id="btn-open-filled-doctor"
                            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/10 shadow-sm"
                        >
                            Open filled doctor modal
                        </button>
                    </div>
                </div>
            </div>

            {/* Register Patient Modal */}
            <RegisterPatientModal
                isOpen={patientModalOpen}
                onClose={() => setPatientModalOpen(false)}
                editingPatient={editingPatient}
                allDistricts={allDistricts}
                onSuccess={() => setPatientModalOpen(false)}
            />

            {/* Doctor Form Modal */}
            <DoctorFormModal
                isOpen={doctorModalOpen}
                onClose={() => setDoctorModalOpen(false)}
                editingDoctor={editingDoctor}
                specialties={specialties}
                eligibleUsers={eligibleUsers}
                existingDoctors={doctors}
                defaultClinicFeeLkr={500}
                onSuccess={() => setDoctorModalOpen(false)}
            />
        </div>
    );
}

