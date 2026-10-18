import React, { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    Calendar,
    Users,
    Receipt,
    Settings,
    LogOut,
    Menu,
    X,
    User,
    ChevronDown,
    Clock,
    Ticket,
    Stethoscope,
    Globe,
    UserCheck,
    Search,
    Building2,
    Shield,
    DollarSign,
    Sliders,
    Package,
    Boxes,
    Pill,
    FileSpreadsheet,
    LayoutTemplate,
} from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import CommandPaletteModal from '@/Components/Layout/CommandPaletteModal';
import NotificationDropdown from '@/Components/Layout/NotificationDropdown';
import { getFirstName, getAvatarInitial } from '@/Utils/name';
import { usePermission } from '@/Hooks/usePermission';

export interface AuthenticatedLayoutProps {
    header?: ReactNode;
    children: ReactNode;
}

export default function AuthenticatedLayout({
    header,
    children,
}: AuthenticatedLayoutProps) {
    const { auth, tenant } = usePage<{
        auth: {
            user: {
                id: number;
                name: string;
                email: string;
                email_verified_at?: string | null;
                tenant_id?: string | null;
                roles?: Array<{ name: string }> | string[];
            };
        };
        tenant?: {
            id: string;
            name: string;
            subdomain: string;
            phone?: string;
            address?: string;
            logo_url?: string;
            base_domain?: string;
            plan?: string;
            trial_days_left?: number;
            is_trial?: boolean;
            pharmacy_enabled?: boolean;
        } | null;
    }>().props;

    const user = auth.user;
    const { isSuperAdmin, isClinicAdmin, isDoctor, isReceptionist, can } = usePermission();
    const isPharmacyEnabled = !!tenant?.pharmacy_enabled;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    const userInitial = getAvatarInitial(user.name);
    const firstName = getFirstName(user.name);

    const baseDomain =
        tenant?.base_domain ||
        (typeof window !== 'undefined' && window.location.hostname.includes('localhost')
            ? 'medvisit.localhost'
            : 'medvisit.lk');

    const roleLabel = isSuperAdmin
        ? 'Super Admin'
        : isClinicAdmin
        ? 'Clinic Admin'
        : isDoctor
        ? 'Doctor'
        : isReceptionist
        ? 'Receptionist'
        : 'Staff';

    // Global Ctrl+K / Cmd+K shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setCommandPaletteOpen((prev) => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close user dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
                setUserMenuOpen(false);
            }
        };
        if (userMenuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [userMenuOpen]);

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    const isItemActive = (href: string) => {
        if (href === '/dashboard' && (currentPath === '/dashboard' || currentPath === '/')) return true;
        if (href !== '/dashboard' && currentPath.startsWith(href)) return true;
        return false;
    };

    // Grouped navigation structure with role filtering
    const navGroups = [
        {
            title: 'OPERATIONS',
            items: [
                {
                    name: 'Overview',
                    href: '/dashboard',
                    icon: LayoutDashboard,
                    visible: true,
                },
                {
                    name: "Today's Queue",
                    href: '/sessions/today',
                    icon: Clock,
                    visible: true,
                    badge: 'Live',
                },
                {
                    name: 'Channeling Calendar',
                    href: '/calendar',
                    icon: Calendar,
                    visible: true,
                },
            ],
        },
        {
            title: 'CLINICAL',
            items: [
                {
                    name: 'Issue Token / Bookings',
                    href: '/bookings',
                    icon: Ticket,
                    visible: !isDoctor, // Receptionist & Admin
                },
                {
                    name: 'Doctors & Schedules',
                    href: '/doctors',
                    icon: Stethoscope,
                    visible: isClinicAdmin || isReceptionist,
                },
            ],
        },
        {
            title: 'PATIENTS & BILLING',
            items: [
                {
                    name: 'Patient Directory',
                    href: '/patients',
                    icon: Users,
                    visible: true,
                },
                {
                    name: 'Billing & Collections',
                    href: '/billing',
                    icon: Receipt,
                    visible: isClinicAdmin || isReceptionist,
                },
                {
                    name: 'Doctor Payouts',
                    href: '/billing/payouts',
                    icon: DollarSign,
                    visible: isClinicAdmin || isDoctor,
                },
            ],
        },
        {
            title: 'ADMINISTRATION',
            items: [
                {
                    name: 'Fees & Payouts',
                    href: '/settings/fees',
                    icon: Sliders,
                    visible: isClinicAdmin,
                },
                {
                    name: 'Clinic Website',
                    href: '/website',
                    icon: Globe,
                    visible: isClinicAdmin,
                },
                {
                    name: 'MedVisit Page Builder',
                    href: '/website#pages',
                    icon: LayoutTemplate,
                    visible: isClinicAdmin,
                },
                {
                    name: 'Staff & Team',
                    href: '/staff',
                    icon: UserCheck,
                    visible: isClinicAdmin,
                },
                {
                    name: 'Clinic Settings & Audit',
                    href: '/settings',
                    icon: Settings,
                    visible: isClinicAdmin,
                },
            ],
        },
        ...(isPharmacyEnabled && can('pharmacy.view')
            ? [
                  {
                      title: 'PHARMACY & INVENTORY',
                      items: [
                          {
                              name: 'Medicines & Stock',
                              href: '/pharmacy/medicines',
                              icon: Package,
                              visible: can('pharmacy.view'),
                          },
                          {
                              name: 'Receive Stock (GRN)',
                              href: '/pharmacy/receipts/create',
                              icon: Boxes,
                              visible: can('pharmacy.receive_stock'),
                          },
                          {
                              name: 'Stock Receipts',
                              href: '/pharmacy/receipts',
                              icon: Receipt,
                              visible: can('pharmacy.view'),
                          },
                          {
                              name: 'Suppliers',
                              href: '/pharmacy/suppliers',
                              icon: Building2,
                              visible: can('pharmacy.manage_suppliers'),
                          },
                          {
                              name: 'Import Stock (CSV)',
                              href: '/pharmacy/import',
                              icon: FileSpreadsheet,
                              visible: can('pharmacy.import'),
                          },
                      ],
                  },
              ]
            : []),
        ...(isSuperAdmin
            ? [
                  {
                      title: 'SUPER ADMIN',
                      items: [
                          {
                              name: 'Medicine Catalog',
                              href: '/super-admin/medicines',
                              icon: Pill,
                              visible: true,
                          },
                          {
                              name: 'OTP Analytics',
                              href: '/super-admin/otp-usage',
                              icon: Shield,
                              visible: true,
                          },
                      ],
                  },
              ]
            : []),
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex relative selection:bg-primary-100 selection:text-primary-800">
            {/* Ambient Background Glow (Calm Healthcare Palette: Primary #1E6FD9, Secondary #0E9E8F, Accent #FF7A59) */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary-500/10 dark:bg-primary-500/15 blur-3xl" />
                <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-secondary-500/10 dark:bg-secondary-500/15 blur-3xl" />
                <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-accent-500/5 dark:bg-accent-500/10 blur-3xl" />
            </div>

            {/* Desktop Collapsible Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl shrink-0 z-30 sticky top-0 h-screen">
                {/* Clinic Brand Header (No Switcher - Single Clinic Scope) */}
                <div className="h-18 px-5 flex items-center gap-3 border-b border-slate-200/70 dark:border-white/10">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-secondary-500 flex items-center justify-center text-white font-bold shadow-md shadow-primary-500/20 shrink-0">
                        {tenant?.name ? tenant.name.charAt(0).toUpperCase() : <Building2 className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {tenant?.name || 'Clinic Workspace'}
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate">
                            {tenant?.subdomain ? `${tenant.subdomain}.${baseDomain}` : `Clinic • ${baseDomain}`}
                        </p>
                    </div>
                </div>

                {/* Grouped Sidebar Navigation */}
                <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
                    {navGroups.map((group) => {
                        const visibleItems = group.items.filter((item) => item.visible);
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={group.title} className="space-y-1">
                                <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                                    {group.title}
                                </div>
                                <div className="space-y-1">
                                    {visibleItems.map((item) => {
                                        const active = isItemActive(item.href);
                                        const Icon = item.icon;

                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                className={`group flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
                                                    active
                                                        ? 'bg-primary/10 text-primary-700 dark:text-primary-300 font-bold shadow-sm'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/[0.04]'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <Icon
                                                        className={`w-4 h-4 shrink-0 transition-colors ${
                                                            active
                                                                ? 'text-primary'
                                                                : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                                                        }`}
                                                    />
                                                    <span className="truncate">{item.name}</span>
                                                </div>
                                                {item.badge && (
                                                    <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-accent/15 text-accent shrink-0">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Sidebar Bottom Clinic Plan & Trial Status */}
                <div className="p-3 border-t border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
                    <div className="flex items-center justify-between text-xs px-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                            <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                                {tenant?.plan || 'Growth Plan'}
                            </span>
                        </div>
                        {tenant?.is_trial ? (
                            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40 shrink-0">
                                {tenant.trial_days_left}d left
                            </span>
                        ) : (
                            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                                Active
                            </span>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Application Column */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Workspace Top Header Bar */}
                <header className="h-18 border-b border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between gap-4">
                    {/* Left: Mobile Toggle & Brand */}
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 focus:outline-none"
                            aria-label="Toggle Mobile Menu"
                        >
                            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                        <div className="lg:hidden flex items-center gap-2">
                            <ApplicationLogo className="h-7 w-auto" />
                            <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                {tenant?.name || 'MedVisit'}
                            </span>
                        </div>
                    </div>

                    {/* Center: Global Search Bar (Ctrl+K Command Palette Trigger) */}
                    <div className="flex-1 max-w-md mx-2 sm:mx-6 hidden sm:block">
                        <button
                            type="button"
                            onClick={() => setCommandPaletteOpen(true)}
                            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-primary/40 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-inner shadow-black/[0.02]"
                        >
                            <span className="flex items-center gap-2 truncate">
                                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">Search patients, doctors, tokens...</span>
                            </span>
                            <kbd className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 shrink-0">
                                ⌘K
                            </kbd>
                        </button>
                    </div>

                    {/* Right: Search Mobile Icon + Notifications Bell + ThemeToggle + User Menu */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            type="button"
                            onClick={() => setCommandPaletteOpen(true)}
                            className="sm:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label="Open Search"
                        >
                            <Search className="w-5 h-5" />
                        </button>

                        {/* Real-time Queue Notification Bell */}
                        <NotificationDropdown />

                        {/* Light / Dark Mode Toggle Pill */}
                        <ThemeToggle />

                        <div className="h-5 w-px bg-slate-200 dark:bg-white/10 mx-1 hidden sm:block" />

                        {/* User Profile Dropdown Menu */}
                        <div ref={userMenuRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors focus:outline-none"
                            >
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-secondary text-white font-bold text-xs flex items-center justify-center shadow-sm">
                                    {userInitial}
                                </div>
                                <div className="hidden md:block text-left">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[120px]">
                                        {firstName}
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none">
                                        {roleLabel}
                                    </div>
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                            </button>

                            {userMenuOpen && (
                                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 mb-1">
                                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                            {user.name}
                                        </div>
                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                            {user.email}
                                        </div>
                                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                                            {roleLabel}
                                        </span>
                                    </div>

                                    <Link
                                        href="/settings"
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <Settings className="w-4 h-4 text-slate-400" />
                                        Clinic Settings
                                    </Link>

                                    <Link
                                        href="/profile"
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <User className="w-4 h-4 text-slate-400" />
                                        My Profile
                                    </Link>

                                    <div className="my-1 border-t border-slate-100 dark:border-white/5" />

                                    <Link
                                        href="/logout"
                                        method="post"
                                        as="button"
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Mobile Slide-out Menu */}
                {mobileOpen && (
                    <div className="lg:hidden fixed inset-0 z-40 flex">
                        <div
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
                            onClick={() => setMobileOpen(false)}
                        />
                        <div className="relative w-72 max-w-[80%] bg-white dark:bg-slate-900 h-full p-4 flex flex-col shadow-2xl z-10 overflow-y-auto">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-primary text-white font-bold text-xs flex items-center justify-center">
                                        {tenant?.name ? tenant.name.charAt(0).toUpperCase() : 'M'}
                                    </div>
                                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                        {tenant?.name || 'Clinic Workspace'}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setMobileOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 py-4 space-y-6">
                                {navGroups.map((group) => {
                                    const visibleItems = group.items.filter((item) => item.visible);
                                    if (visibleItems.length === 0) return null;

                                    return (
                                        <div key={group.title} className="space-y-1">
                                            <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                                                {group.title}
                                            </div>
                                            {visibleItems.map((item) => {
                                                const active = isItemActive(item.href);
                                                const Icon = item.icon;
                                                return (
                                                    <Link
                                                        key={item.name}
                                                        href={item.href}
                                                        onClick={() => setMobileOpen(false)}
                                                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${
                                                            active
                                                                ? 'bg-primary/10 text-primary font-bold'
                                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Icon className="w-4 h-4 text-slate-400" />
                                                            <span>{item.name}</span>
                                                        </div>
                                                        {item.badge && (
                                                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-accent/20 text-accent">
                                                                {item.badge}
                                                            </span>
                                                        )}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                <Link
                                    href="/logout"
                                    method="post"
                                    as="button"
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Optional Page Header */}
                {header && (
                    <div className="border-b border-slate-200/70 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md px-6 sm:px-8 py-4">
                        <div className="max-w-[1440px] w-full mx-auto">
                            {header}
                        </div>
                    </div>
                )}

                {/* Page Content Body */}
                <main className="flex-1 px-6 sm:px-8 py-6 max-w-[1440px] w-full mx-auto">
                    {children}
                </main>
            </div>

            {/* Global Command Palette Modal */}
            <CommandPaletteModal
                isOpen={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
            />
        </div>
    );
}
