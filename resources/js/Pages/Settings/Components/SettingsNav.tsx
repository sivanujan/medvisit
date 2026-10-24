import React from 'react';
import { Link } from '@inertiajs/react';
import {
    Building2,
    Sparkles,
    Clock,
    Calendar,
    Globe,
    FileText,
    Receipt,
    Printer,
    Pill,
    Compass,
    ShieldAlert,
    ChevronRight,
} from 'lucide-react';
import { SettingsSectionKey } from '../types';

export interface NavGroup {
    title: string;
    items: {
        key: SettingsSectionKey;
        name: string;
        description: string;
        icon: React.ComponentType<{ className?: string }>;
        badge?: string;
    }[];
}

export const SETTINGS_NAV_GROUPS: NavGroup[] = [
    {
        title: 'Clinic',
        items: [
            {
                key: 'profile',
                name: 'Clinic profile',
                description: 'Identity, contacts and official address',
                icon: Building2,
            },
            {
                key: 'branding',
                name: 'Branding & logo',
                description: 'Logo upload, square crop and favicon',
                icon: Sparkles,
            },
            {
                key: 'hours',
                name: 'Opening hours',
                description: 'Working days and public schedule',
                icon: Clock,
            },
        ],
    },
    {
        title: 'Operations',
        items: [
            {
                key: 'sessions',
                name: 'Session defaults',
                description: 'Consultation slot time and token caps',
                icon: Calendar,
            },
            {
                key: 'booking',
                name: 'Online booking',
                description: 'Public patient reservations and OTP gate',
                icon: Globe,
            },
            {
                key: 'prescriptions',
                name: 'Prescriptions',
                description: 'Language, SLMC reg and diagnosis prints',
                icon: FileText,
            },
        ],
    },
    {
        title: 'Money',
        items: [
            {
                key: 'billing',
                name: 'Billing & cashier',
                description: 'Payment timing, taxes and doctor share',
                icon: Receipt,
            },
            {
                key: 'receipts',
                name: 'Receipts & invoices',
                description: 'Receipt prefix and 80mm thermal slip',
                icon: Printer,
            },
        ],
    },
    {
        title: 'Pharmacy',
        items: [
            {
                key: 'pharmacy',
                name: 'Pharmacy & stock',
                description: 'Inventory levels and dispense triggers',
                icon: Pill,
            },
        ],
    },
    {
        title: 'Visibility',
        items: [
            {
                key: 'directory',
                name: 'Public directory',
                description: 'MedVisit.lk public listing and map pin',
                icon: Compass,
            },
        ],
    },
    {
        title: 'Security',
        items: [
            {
                key: 'audit',
                name: 'Audit trail',
                description: 'Security logs, change history & CSV export',
                icon: ShieldAlert,
            },
        ],
    },
];

interface Props {
    activeSection: SettingsSectionKey;
    onSelectSection?: (section: SettingsSectionKey) => void;
    isMobileList?: boolean;
}

export default function SettingsNav({ activeSection, onSelectSection, isMobileList = false }: Props) {
    return (
        <nav aria-label="Settings navigation" className="space-y-6">
            {SETTINGS_NAV_GROUPS.map((group) => (
                <div key={group.title} className="space-y-1.5">
                    <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {group.title}
                    </div>

                    <div className="space-y-1">
                        {group.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeSection === item.key;

                            return (
                                <Link
                                    key={item.key}
                                    href={`/settings/${item.key}`}
                                    preserveScroll
                                    preserveState
                                    onClick={() => onSelectSection && onSelectSection(item.key)}
                                    className={`group relative flex items-center justify-between p-3 rounded-2xl transition-all duration-150 ${
                                        isActive && !isMobileList
                                            ? 'bg-gradient-to-r from-primary-500/10 via-primary-500/5 to-transparent text-primary-700 dark:text-primary-300 font-semibold shadow-xs border border-primary-500/20'
                                            : 'text-slate-700 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-800/60 border border-transparent hover:border-slate-200/60 dark:hover:border-white/5'
                                    }`}
                                >
                                    {/* Active Accent Bar */}
                                    {isActive && !isMobileList && (
                                        <span
                                            aria-hidden="true"
                                            className="absolute left-0 top-2 bottom-2 w-1 rounded-r bg-[#1E6FD9]"
                                        />
                                    )}

                                    <div className="flex items-center gap-3 min-w-0">
                                        <div
                                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                                                isActive && !isMobileList
                                                    ? 'bg-[#1E6FD9] text-white shadow-md shadow-[#1E6FD9]/20'
                                                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 group-hover:bg-slate-200/60 dark:group-hover:bg-slate-700/60'
                                            }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                        </div>

                                        <div className="min-w-0 text-left">
                                            <div className="text-xs font-semibold truncate leading-tight flex items-center gap-1.5">
                                                <span>{item.name}</span>
                                                {item.badge && (
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                                {item.description}
                                            </div>
                                        </div>
                                    </div>

                                    <ChevronRight
                                        className={`w-4 h-4 shrink-0 transition-transform ${
                                            isActive && !isMobileList
                                                ? 'text-[#1E6FD9] translate-x-0.5'
                                                : 'text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400'
                                        }`}
                                    />
                                </Link>
                            );
                        })}
                    </div>
                </div>
            ))}
        </nav>
    );
}
