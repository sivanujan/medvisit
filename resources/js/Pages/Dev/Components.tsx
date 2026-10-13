import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    Sparkles,
    User,
    Mail,
    Search,
    Plus,
    Filter,
    Edit,
    Trash2,
    Eye,
    Layers,
    Phone,
    Activity,
    Calendar,
    ArrowLeft,
    CheckCircle2,
    Lock,
} from 'lucide-react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import {
    GlassTable,
    GlassThead,
    GlassTh,
    GlassTbody,
    GlassTr,
    GlassTd,
} from '@/Components/UI/GlassTable';
import {
    GlassLabel,
    GlassInput,
    GlassSelect,
    GlassTextarea,
    GlassCheckbox,
    GlassError,
} from '@/Components/UI/FormControls';
import { GlassModal } from '@/Components/UI/GlassModal';
import { ActionsMenu } from '@/Components/UI/ActionsMenu';
import { StatusBadge, BadgeStatus } from '@/Components/UI/StatusBadge';
import { EmptyState } from '@/Components/UI/EmptyState';
import { Tabs } from '@/Components/UI/Tabs';
import { PhoneInput } from '@/Components/UI/PhoneInput';
import { ThemeToggle } from '@/Components/Common/ThemeToggle';
import { formatLKR, formatDate, formatTime } from '@/Utils/formatters';

export default function DevComponentsShowcase() {
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all');
    const [phoneVal, setPhoneVal] = useState('0771234567');
    const [sortCol, setSortCol] = useState<'id' | 'name' | 'time'>('id');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
    const [checkboxChecked, setCheckboxChecked] = useState(true);

    const handleSort = (col: 'id' | 'name' | 'time') => {
        if (sortCol === col) {
            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortCol(col);
            setSortDir('asc');
        }
    };

    const statuses: Array<{ key: BadgeStatus; label: string }> = [
        { key: 'waiting', label: 'Waiting (In Lobby)' },
        { key: 'called', label: 'Called (Calling to Room)' },
        { key: 'in_consultation', label: 'In Consultation' },
        { key: 'completed', label: 'Completed' },
        { key: 'no_show', label: 'No Show' },
        { key: 'cancelled', label: 'Cancelled' },
        { key: 'open', label: 'Session Open' },
        { key: 'closed', label: 'Session Closed' },
        { key: 'active', label: 'Active Tenant' },
        { key: 'pending', label: 'Pending Approval' },
    ];

    const samplePatients = [
        {
            token: '#01',
            name: 'Kavindu Jayasuriya',
            phone: '+94 77 123 4567',
            status: 'in_consultation' as BadgeStatus,
            doctor: 'Dr. Sivanujan',
            fee: 350000,
            time: '09:00 AM',
        },
        {
            token: '#02',
            name: 'Nadeeka Wickramasinghe',
            phone: '+94 71 987 6543',
            status: 'called' as BadgeStatus,
            doctor: 'Dr. Sivanujan',
            fee: 250000,
            time: '09:15 AM',
        },
        {
            token: '#03',
            name: 'Mohamed Rizwan',
            phone: '+94 76 555 1234',
            status: 'waiting' as BadgeStatus,
            doctor: 'Dr. Perera',
            fee: 300000,
            time: '09:30 AM',
        },
        {
            token: '#04',
            name: 'Anula Senanayake',
            phone: '+94 75 444 9876',
            status: 'completed' as BadgeStatus,
            doctor: 'Dr. Sivanujan',
            fee: 400000,
            time: '08:45 AM',
        },
        {
            token: '#05',
            name: 'Dinesh Gunawardena',
            phone: '+94 78 333 7777',
            status: 'no_show' as BadgeStatus,
            doctor: 'Dr. Perera',
            fee: 0,
            time: '08:30 AM',
        },
    ];

    return (
        <AuthenticatedLayout>
            <Head title="Design System & Component Showcase" />

            <PageHeader
                eyebrow="Local Dev Tool"
                title="MedVisit UI Component Showcase"
                subtitle="Interactive preview of all ported glassmorphism components with MedVisit design tokens (Primary #1E6FD9, Secondary #0E9E8F, Accent #FF7A59, Font Poppins)."
                actions={
                    <div className="flex items-center gap-2.5">
                        <ThemeToggle />
                        <button
                            type="button"
                            onClick={() => setModalOpen(true)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm shadow-primary/30 transition-colors flex items-center gap-2 cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Open GlassModal</span>
                        </button>
                    </div>
                }
            />

            {/* 1. StatusBadge Suite */}
            <section className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        1. Healthcare Status Badges
                    </h3>
                </div>
                <GlassCard className="p-5">
                    <div className="flex flex-wrap items-center gap-3">
                        {statuses.map((s) => (
                            <StatusBadge
                                key={s.key}
                                status={s.key}
                                label={s.label}
                                pulse={s.key === 'in_consultation' || s.key === 'called'}
                            />
                        ))}
                    </div>
                </GlassCard>
            </section>

            {/* 2. Tabs Suite */}
            <section className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-secondary" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        2. Segmented Tabs
                    </h3>
                </div>
                <Tabs
                    activeTab={activeTab}
                    onChange={setActiveTab}
                    tabs={[
                        { id: 'all', label: 'All Patients', count: 48 },
                        { id: 'waiting', label: 'Waiting', count: 6 },
                        { id: 'in_consult', label: 'In Session', count: 2 },
                        { id: 'completed', label: 'Completed', count: 40 },
                    ]}
                />
            </section>

            {/* 3. GlassTable Suite */}
            <section className="mb-10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                            3. GlassTable with Sorting & ActionsMenu
                        </h3>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Click headers to sort</span>
                </div>

                <GlassTable>
                    <GlassThead>
                        <tr>
                            <GlassTh
                                sortable
                                sortDirection={sortCol === 'id' ? sortDir : false}
                                onSort={() => handleSort('id')}
                            >
                                Token
                            </GlassTh>
                            <GlassTh
                                sortable
                                sortDirection={sortCol === 'name' ? sortDir : false}
                                onSort={() => handleSort('name')}
                            >
                                Patient Name
                            </GlassTh>
                            <GlassTh>Contact</GlassTh>
                            <GlassTh>Doctor</GlassTh>
                            <GlassTh>Status</GlassTh>
                            <GlassTh
                                align="right"
                                sortable
                                sortDirection={sortCol === 'time' ? sortDir : false}
                                onSort={() => handleSort('time')}
                            >
                                Fee (LKR)
                            </GlassTh>
                            <GlassTh align="center">Actions</GlassTh>
                        </tr>
                    </GlassThead>
                    <GlassTbody>
                        {samplePatients.map((p, i) => (
                            <GlassTr key={i}>
                                <GlassTd>
                                    <span className="font-extrabold text-primary">{p.token}</span>
                                </GlassTd>
                                <GlassTd>
                                    <div className="font-semibold text-slate-900 dark:text-white">{p.name}</div>
                                    <div className="text-[11px] text-slate-400">Scheduled {p.time}</div>
                                </GlassTd>
                                <GlassTd>{p.phone}</GlassTd>
                                <GlassTd>{p.doctor}</GlassTd>
                                <GlassTd>
                                    <StatusBadge status={p.status} pulse={p.status === 'in_consultation' || p.status === 'called'} />
                                </GlassTd>
                                <GlassTd align="right">
                                    <span className="font-bold">{formatLKR(p.fee)}</span>
                                </GlassTd>
                                <GlassTd align="center">
                                    <ActionsMenu
                                        items={[
                                            { label: 'View Consultation', icon: Eye, onClick: () => alert(`Viewing ${p.name}`) },
                                            { label: 'Edit Patient', icon: Edit, onClick: () => alert(`Editing ${p.name}`) },
                                            { label: 'Cancel Token', icon: Trash2, danger: true, onClick: () => alert(`Cancelled ${p.name}`) },
                                        ]}
                                    />
                                </GlassTd>
                            </GlassTr>
                        ))}
                    </GlassTbody>
                </GlassTable>
            </section>

            {/* 4. FormControls & PhoneInput */}
            <section className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-accent" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        4. FormControls &amp; Sri Lanka PhoneInput
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6 space-y-4">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">Inputs &amp; Selects</h4>
                        <div>
                            <GlassLabel htmlFor="test_input" required>Patient Full Name</GlassLabel>
                            <GlassInput id="test_input" placeholder="e.g. Ruwan Silva" icon={<User className="w-4 h-4" />} />
                        </div>
                        <div>
                            <GlassLabel htmlFor="test_select">Consultation Department</GlassLabel>
                            <GlassSelect id="test_select" defaultValue="opd">
                                <option value="opd">General OPD Consultation</option>
                                <option value="peds">Pediatrics</option>
                                <option value="cardio">Cardiology</option>
                                <option value="dental">Dental Clinic</option>
                            </GlassSelect>
                        </div>
                        <div>
                            <GlassCheckbox
                                id="test_check"
                                label="Send SMS token alert to patient mobile"
                                checked={checkboxChecked}
                                onChange={(e) => setCheckboxChecked(e.target.checked)}
                            />
                        </div>
                    </GlassCard>

                    <GlassCard className="p-6 space-y-4">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            Sri Lanka PhoneInput &amp; Textarea
                        </h4>
                        <div>
                            <GlassLabel htmlFor="phone_input" required>Patient Mobile Number (+94)</GlassLabel>
                            <PhoneInput
                                id="phone_input"
                                value={phoneVal}
                                onChange={setPhoneVal}
                            />
                            <p className="mt-1.5 text-[11px] text-slate-400 font-mono">
                                Normalized E.164 Value: <strong className="text-primary">{phoneVal || '-'}</strong>
                            </p>
                        </div>
                        <div>
                            <GlassLabel htmlFor="test_textarea">Clinical Chief Complaint / Notes</GlassLabel>
                            <GlassTextarea id="test_textarea" placeholder="Describe symptoms, duration, vitals..." rows={3} />
                            <GlassError message="Example error feedback styling preview" />
                        </div>
                    </GlassCard>
                </div>
            </section>

            {/* 5. EmptyState & Formatters */}
            <section className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                        5. EmptyState &amp; LKR Currency Formatters
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <GlassCard className="p-6">
                        <EmptyState
                            title="No Prescriptions Issued"
                            description="This patient does not have any active medications recorded for this session."
                            action={
                                <button
                                    type="button"
                                    onClick={() => alert('New Rx clicked')}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 transition-colors shadow-xs"
                                >
                                    Write Prescription
                                </button>
                            }
                        />
                    </GlassCard>

                    <GlassCard className="p-6 space-y-4">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                            Formatters (LKR &amp; Asia/Colombo)
                        </h4>
                        <div className="space-y-3 text-xs sm:text-sm">
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                                <span className="text-slate-500">Integer Cents (150000):</span>
                                <span className="font-mono font-bold text-primary">{formatLKR(150000)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                                <span className="text-slate-500">Large Consultation Total (4850000):</span>
                                <span className="font-mono font-bold text-secondary">{formatLKR(4850000)}</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                                <span className="text-slate-500">Asia/Colombo Current Date:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {formatDate(new Date().toISOString(), 'long')}
                                </span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-slate-100 dark:border-white/5">
                                <span className="text-slate-500">Asia/Colombo Time:</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                    {formatTime(new Date().toISOString())}
                                </span>
                            </div>
                        </div>
                    </GlassCard>
                </div>
            </section>

            {/* Interactive GlassModal Dialog */}
            <GlassModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Schedule Patient Consultation"
                subtitle="Assign token slot in the OPD doctor roster."
                maxWidth="max-w-lg"
            >
                <div className="space-y-4">
                    <div>
                        <GlassLabel required>Patient Name</GlassLabel>
                        <GlassInput placeholder="Full legal name" defaultValue="Amara Gunawardena" />
                    </div>
                    <div>
                        <GlassLabel required>Phone Number</GlassLabel>
                        <PhoneInput value="0779998888" />
                    </div>
                    <div>
                        <GlassLabel>Session Doctor</GlassLabel>
                        <GlassSelect defaultValue="dr1">
                            <option value="dr1">Dr. K. Sivanujan (Consultant Physician)</option>
                            <option value="dr2">Dr. Aruni Perera (General Practitioner)</option>
                        </GlassSelect>
                    </div>
                    <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-200/70 dark:border-white/10">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                alert('Token generated: #22');
                                setModalOpen(false);
                            }}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary hover:bg-primary-600 shadow-sm shadow-primary/30 transition-colors"
                        >
                            Confirm &amp; Issue Token
                        </button>
                    </div>
                </div>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
