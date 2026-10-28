import React, { ReactNode, useState, useEffect, useRef, useMemo } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import {
    LayoutDashboard,
    Calendar,
    Users,
    Receipt,
    CreditCard,
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
    ClipboardList,
    History,
    LayoutTemplate,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    HelpCircle,
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
} from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import BannerStack from '@/Components/Common/BannerStack';
import DemoTopBanner from '@/Components/Demo/DemoTopBanner';
import CommandPaletteModal from '@/Components/Layout/CommandPaletteModal';
import NotificationDropdown from '@/Components/Layout/NotificationDropdown';
import SupportChatWidget from '@/Components/SupportChat/SupportChatWidget';
import { getAvatarInitial } from '@/Utils/name';
import { usePermission } from '@/Hooks/usePermission';
import { getSubscriptionStatusDescriptor } from '@/Utils/subscriptionStatus';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

export interface AuthenticatedLayoutProps {
    header?: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    children: ReactNode;
}

// Route mapping for auto-generated clean breadcrumbs
const ROUTE_BREADCRUMBS: Record<string, { group: string; page: string }> = {
    '/dashboard': { group: 'Operations', page: 'Overview' },
    '/sessions/today': { group: 'Operations', page: "Today's Queue" },
    '/calendar': { group: 'Operations', page: 'Channeling Calendar' },
    '/bookings': { group: 'Clinical', page: 'Issue Token & Bookings' },
    '/doctors': { group: 'Clinical', page: 'Doctors & Schedules' },
    '/doctor/templates': { group: 'Patients', page: 'Prescription Templates' },
    '/prescription-templates': { group: 'Patients', page: 'Prescription Templates' },
    '/patients': { group: 'Patients & Billing', page: 'Patient Directory' },
    '/billing': { group: 'Patients & Billing', page: 'Billing & Collections' },
    '/billing/payouts': { group: 'Patients & Billing', page: 'Doctor Payouts' },
    '/settings/fees': { group: 'Administration', page: 'Fees & Payouts' },
    '/website': { group: 'Administration', page: 'Clinic Website' },
    '/website/builder': { group: 'Administration', page: 'MedVisit Page Builder' },
    '/staff': { group: 'Administration', page: 'Staff & Team' },
    '/settings': { group: 'Administration', page: 'Clinic Settings' },
    '/settings/billing': { group: 'Settings', page: 'Subscription & Billing' },
    '/settings/billing/change-plan': { group: 'Settings', page: 'Change Plan' },
    '/profile': { group: 'Account', page: 'My Profile' },
    '/pharmacy/dispense': { group: 'Pharmacy', page: 'Dispense Counter' },
    '/pharmacy/dispense/history': { group: 'Pharmacy', page: 'Dispense History' },
    '/pharmacy/medicines': { group: 'Pharmacy', page: 'Medicines & Stock' },
    '/pharmacy/receipts/create': { group: 'Pharmacy', page: 'Receive Stock (GRN)' },
    '/pharmacy/receipts': { group: 'Pharmacy', page: 'Stock Receipts' },
    '/pharmacy/suppliers': { group: 'Pharmacy', page: 'Suppliers' },
    '/pharmacy/import': { group: 'Pharmacy', page: 'Import Stock' },
    '/super-admin/subscriptions': { group: 'Platform Admin', page: 'Subscriptions & Payments' },
    '/super-admin/medicines': { group: 'Platform Admin', page: 'Medicine Catalog' },
    '/super-admin/otp-usage': { group: 'Platform Admin', page: 'OTP Analytics' },
};

export default function AuthenticatedLayout({
    breadcrumbs: customBreadcrumbs,
    children,
}: AuthenticatedLayoutProps) {
    const { auth, tenant, impersonation } = usePage<{
        auth: {
            user: {
                id: number;
                name: string;
                email: string;
                email_verified_at?: string | null;
                tenant_id?: string | null;
                roles?: Array<{ name: string }> | string[];
                avatar_url?: string | null;
            };
        };
        tenant?: {
            id: string;
            name: string;
            subdomain: string;
            status?: string;
            phone?: string;
            address?: string;
            logo_url?: string;
            base_domain?: string;
            plan?: string;
            trial_days_left?: number;
            is_trial?: boolean;
            pharmacy_enabled?: boolean;
            live_sessions_count?: number;
            subscription_days_left?: number | null;
        } | null;
        impersonation?: {
            is_active: boolean;
            impersonator_name: string;
            reason?: string;
            started_at?: number;
            expires_at?: number;
            return_url?: string;
        } | null;
    }>().props;

    const user = auth?.user ?? {
        id: 1,
        name: 'Dr. Samantha Perera',
        email: 'samantha@apexfamily.lk',
        roles: ['clinic_admin'],
        avatar_url: null,
    };
    const activeTenant = tenant ?? {
        id: 'preview-clinic',
        name: 'Apex Family Health',
        subdomain: 'apexfamily',
        status: 'active',
        plan: 'Pro',
        subscription_days_left: 28,
        is_trial: false,
        pharmacy_enabled: true,
        live_sessions_count: 2,
        base_domain: 'medvisit.lk',
    };
    const { isSuperAdmin, isClinicAdmin, isDoctor, isReceptionist, can } = usePermission();
    const isPharmacyEnabled = !!activeTenant.pharmacy_enabled;

    // Collapsible sidebar state with localStorage persistence and validation/migration
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        try {
            if (typeof window === 'undefined') return false;
            const val = localStorage.getItem('medvisit_sidebar_collapsed');
            if (val === 'true') return true;
            if (val === 'false') return false;
            if (val !== null) {
                // Clear any corrupted or legacy invalid stored state
                localStorage.removeItem('medvisit_sidebar_collapsed');
            }
            return false;
        } catch {
            return false;
        }
    });

    const toggleSidebar = () => {
        setCollapsed((prev) => {
            const next = !prev;
            try {
                localStorage.setItem('medvisit_sidebar_collapsed', String(next));
            } catch {
                // ignore storage error
            }
            return next;
        });
    };

    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [logoError, setLogoError] = useState(false);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // OS detection for command palette shortcut (Ctrl K on Windows/Linux, ⌘K on Mac)
    const [isMac, setIsMac] = useState(false);
    useEffect(() => {
        if (typeof navigator !== 'undefined') {
            setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform || navigator.userAgent));
        }
    }, []);

    const userInitial = getAvatarInitial(user.name);

    const baseDomain =
        tenant?.base_domain ||
        (typeof window !== 'undefined' && window.location.hostname.includes('localhost')
            ? 'medvisit.localhost:8000'
            : 'medvisit.lk');

    const publicBookingUrl = tenant?.subdomain
        ? `${typeof window !== 'undefined' ? window.location.protocol : 'http:'}//${tenant.subdomain}.${baseDomain}`
        : '/';

    const roleLabel = isSuperAdmin
        ? 'Super Admin'
        : isClinicAdmin
        ? 'Clinic Admin'
        : isDoctor
        ? 'Doctor'
        : isReceptionist
        ? 'Receptionist'
        : 'Staff';

    // Global Ctrl+K / Cmd+K shortcut listener
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

    // Auto-detect breadcrumbs if not explicitly passed
    const activeBreadcrumb = useMemo(() => {
        if (customBreadcrumbs && customBreadcrumbs.length > 0) {
            return null;
        }
        const match = ROUTE_BREADCRUMBS[currentPath];
        if (match) {
            return match;
        }
        // Fallback for subroutes (e.g. /pharmacy/...)
        for (const [key, val] of Object.entries(ROUTE_BREADCRUMBS)) {
            if (key !== '/dashboard' && currentPath.startsWith(key)) {
                return val;
            }
        }
        return { group: 'Clinic', page: 'Overview' };
    }, [currentPath, customBreadcrumbs]);

    // Live session count and date in Colombo time
    const liveSessionsCount = tenant?.live_sessions_count ?? 0;
    const overrunningSessionsCount = (tenant as any)?.overrunning_sessions_count ?? 0;
    const formattedDate = useMemo(() => {
        try {
            return new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Colombo',
                weekday: 'short',
                day: 'numeric',
                month: 'short',
            }).format(new Date());
        } catch {
            return new Date().toLocaleDateString('en-GB', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
            });
        }
    }, []);

    // Live clock next to the date (Asia/Colombo)
    const [liveTime, setLiveTime] = useState<string>(() => {
        try {
            return new Intl.DateTimeFormat('en-GB', {
                timeZone: 'Asia/Colombo',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true,
            }).format(new Date());
        } catch {
            return new Date().toLocaleTimeString();
        }
    });

    useEffect(() => {
        const timer = setInterval(() => {
            try {
                setLiveTime(
                    new Intl.DateTimeFormat('en-GB', {
                        timeZone: 'Asia/Colombo',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                    }).format(new Date())
                );
            } catch {
                setLiveTime(new Date().toLocaleTimeString());
            }
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Regrouped navigation structure with sentence-case group labels and deduplicated items
    const navGroups = [
        {
            title: 'Today',
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
                    badge: liveSessionsCount > 0 ? `${liveSessionsCount}` : undefined,
                },
                {
                    name: 'Issue Token',
                    href: '/bookings',
                    icon: Ticket,
                    visible: !isDoctor,
                },
            ],
        },
        {
            title: 'Schedule',
            items: [
                {
                    name: 'Channeling Calendar',
                    href: '/calendar',
                    icon: Calendar,
                    visible: true,
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
            title: 'Patients',
            items: [
                {
                    name: 'Patient Directory',
                    href: '/patients',
                    icon: Users,
                    visible: true,
                },
                {
                    name: 'Prescription Templates',
                    href: '/doctor/templates',
                    icon: ClipboardList,
                    visible: isDoctor || isClinicAdmin,
                },
            ],
        },
        {
            title: 'Money',
            items: [
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
            title: 'Clinic',
            items: [
                {
                    name: 'Clinic Website',
                    href: '/website',
                    icon: Globe,
                    visible: isClinicAdmin,
                },
                {
                    name: 'MedVisit Page Builder',
                    href: '/website/builder',
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
                    name: 'Settings & Audit',
                    href: '/settings',
                    icon: Settings,
                    visible: isClinicAdmin,
                },
                {
                    name: 'Subscription & Billing',
                    href: '/settings/billing',
                    icon: CreditCard,
                    visible: isClinicAdmin,
                },
            ],
        },
        ...(isPharmacyEnabled && can('pharmacy.view')
            ? [
                  {
                      title: 'Pharmacy',
                      items: [
                          {
                              name: 'Dispense Counter',
                              href: '/pharmacy/dispense',
                              icon: Pill,
                              visible: (can('pharmacy.dispense') || isClinicAdmin) && !isDoctor,
                          },
                          {
                              name: 'Dispense History',
                              href: '/pharmacy/dispense/history',
                              icon: History,
                              visible: (can('pharmacy.dispense') || isClinicAdmin) && !isDoctor,
                          },
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
                      title: 'Platform Admin',
                      items: [
                          {
                              name: 'Subscriptions & Billing',
                              href: '/super-admin/subscriptions',
                              icon: CreditCard,
                              visible: true,
                          },
                          {
                              name: 'Medicine Catalog',
                              href: '/super-admin/medicines',
                              icon: Pill,
                              visible: true,
                          },
                          {
                              name: 'OTP Analytics',
                              href: '/super-admin/otp-usage',
                              icon: Sliders,
                              visible: true,
                          },
                      ],
                  },
              ]
            : []),
    ];

    // Determine the single active navigation href using longest matching path rule (strictly one active item)
    const activeNavHref = useMemo(() => {
        if (!currentPath) return '/dashboard';
        if (currentPath === '/' || currentPath === '/dashboard') return '/dashboard';

        let bestMatch = '';
        navGroups.forEach((group) => {
            group.items.forEach((item) => {
                if (!item.visible) return;
                const h = item.href;
                if (
                    currentPath === h ||
                    currentPath.startsWith(h + '/') ||
                    currentPath.startsWith(h + '?') ||
                    currentPath.startsWith(h + '#')
                ) {
                    if (h.length > bestMatch.length) {
                        bestMatch = h;
                    }
                }
            });
        });

        return bestMatch;
    }, [currentPath, navGroups]);

    const isItemActive = (href: string) => {
        return activeNavHref === href;
    };

    return (
        <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative selection:bg-primary-100 selection:text-primary-800 w-full max-w-full overflow-hidden">
            {/* Ambient Background Glow */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary-500/10 dark:bg-primary-500/15 blur-3xl" />
                <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-secondary-500/10 dark:bg-secondary-500/15 blur-3xl" />
                <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-accent-500/5 dark:bg-accent-500/10 blur-3xl" />
            </div>

            {/* Persistent Public Demo Sandbox Banner */}
            <DemoTopBanner />

            {/* Persistent Impersonation Red Banner */}
            {impersonation?.is_active && (
                <div className="bg-rose-600 text-white px-4 py-2.5 text-xs sm:text-sm font-semibold flex items-center justify-between sticky top-0 z-50 shadow-md shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="bg-white text-rose-700 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0">
                            Viewing as Clinic
                        </span>
                        <span className="truncate">
                            Impersonating <strong>{tenant?.name}</strong> by <strong>{impersonation.impersonator_name}</strong>
                            {impersonation.reason && <span className="opacity-90 ml-1.5 hidden md:inline">({impersonation.reason})</span>}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => router.post(route('tenant.impersonate.exit'))}
                        className="bg-white text-rose-700 hover:bg-rose-50 font-bold px-3 py-1 rounded-md text-xs transition shadow-xs cursor-pointer flex items-center gap-1 shrink-0 ml-3"
                    >
                        <span>Exit Impersonation</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            <div className="flex flex-1 min-h-0 min-w-0 w-full overflow-hidden">

            {/* Desktop Collapsible Sidebar (rigidly shrink-0: 256px expanded / 72px collapsed rail) */}
            <aside
                className={`hidden lg:flex flex-col border-r border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl shrink-0 z-30 h-full transition-all duration-300 ease-in-out ${
                    collapsed ? 'w-[72px] min-w-[72px] max-w-[72px]' : 'w-64 min-w-[256px] max-w-[256px]'
                }`}
            >
                {/* Brand Block: Exactly 64px (h-16) to align with Top Bar bottom border */}
                <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Clinic Logo or Initials Square */}
                        <div
                            className={`w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shrink-0 ${
                                tenant?.logo_url && !logoError
                                    ? 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 p-1 shadow-sm'
                                    : 'bg-gradient-to-tr from-primary-600 to-secondary-500 text-white font-bold text-sm shadow-md shadow-primary-500/20'
                            }`}
                            title={tenant?.name || 'Clinic Workspace'}
                        >
                            {tenant?.logo_url && !logoError ? (
                                <img
                                    src={tenant.logo_url}
                                    alt={tenant?.name || 'Clinic'}
                                    className="w-full h-full object-contain"
                                    width={40}
                                    height={40}
                                    loading="eager"
                                    onError={() => setLogoError(true)}
                                />
                            ) : tenant?.name ? (
                                tenant.name.charAt(0).toUpperCase()
                            ) : (
                                <Building2 className="w-5 h-5" />
                            )}
                        </div>

                        {/* Clinic display name & View public site link (hidden when collapsed) */}
                        {!collapsed && (
                            <div className="min-w-0 flex-1">
                                <h2
                                    className="text-sm font-semibold text-slate-900 dark:text-white truncate"
                                    title={tenant?.name || 'Clinic Workspace'}
                                >
                                    {tenant?.name || 'Clinic Workspace'}
                                </h2>
                                <a
                                    href={publicBookingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] text-primary hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
                                    title="Open public booking website in new tab"
                                >
                                    <span>View public site</span>
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                </a>
                            </div>
                        )}
                    </div>

                    {/* Sidebar Rail Collapse Toggle Button */}
                    {!collapsed && (
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                            title="Collapse sidebar"
                            aria-label="Collapse sidebar"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Collapsed Mode Expand Button */}
                {collapsed && (
                    <div className="py-2 flex justify-center border-b border-slate-100 dark:border-white/5">
                        <button
                            type="button"
                            onClick={toggleSidebar}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Expand sidebar"
                            aria-label="Expand sidebar"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* Grouped Sidebar Navigation */}
                <div className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-6">
                    {navGroups.map((group) => {
                        const visibleItems = group.items.filter((item) => item.visible);
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={group.title} className="space-y-1">
                                {!collapsed ? (
                                    <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                                        {group.title}
                                    </div>
                                ) : (
                                    <div className="h-px bg-slate-200/60 dark:bg-white/5 my-2 mx-1" />
                                )}

                                <div className="space-y-1">
                                    {visibleItems.map((item) => {
                                        const active = isItemActive(item.href);
                                        const Icon = item.icon;

                                        return (
                                            <Link
                                                key={item.name}
                                                href={item.href}
                                                title={collapsed ? item.name : undefined}
                                                className={`group relative flex items-center ${
                                                    collapsed
                                                        ? 'justify-center w-11 h-11 mx-auto'
                                                        : 'justify-between px-3 py-2'
                                                } rounded-xl text-xs font-semibold transition-all duration-150 ${
                                                    active
                                                        ? 'bg-primary/10 text-primary-700 dark:text-primary-300 font-bold shadow-xs'
                                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-white/[0.04]'
                                                }`}
                                            >
                                                {/* Left accent bar in primary #1E6FD9 when active */}
                                                {active && (
                                                    <span
                                                        aria-hidden="true"
                                                        className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r bg-primary"
                                                    />
                                                )}

                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <Icon
                                                        className={`w-[18px] h-[18px] shrink-0 transition-colors ${
                                                            active
                                                                ? 'text-primary'
                                                                : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                                                        }`}
                                                    />
                                                    {!collapsed && <span className="truncate">{item.name}</span>}
                                                </div>

                                                {!collapsed && item.badge && (
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

                {/* Sidebar Bottom: Subscription Status Pill (Green Active, Amber <= 5 days, Red Overdue/Suspended) */}
                {(() => {
                    const planRaw = tenant?.plan || 'Pro';
                    let cleanPlan = planRaw.replace(/\s*plan$/i, '').trim();
                    if (cleanPlan.toLowerCase() === 'medvisit-standard' || cleanPlan.toLowerCase() === 'standard') {
                        cleanPlan = 'Standard';
                    } else if (cleanPlan.includes('-') || cleanPlan.includes('_')) {
                        cleanPlan = cleanPlan.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                    } else if (cleanPlan.length > 0) {
                        cleanPlan = cleanPlan.charAt(0).toUpperCase() + cleanPlan.slice(1);
                    }
                    const status = tenant?.status || 'active';
                    const daysLeft = tenant?.subscription_days_left ?? null;
                    const isDueSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 5;
                    const isOverdue = status === 'expired' || status === 'overdue' || (daysLeft !== null && daysLeft < 0);
                    const isSuspended = status === 'suspended';

                    let badgeClass = 'bg-emerald-50/90 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300';
                    let icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />;
                    let text = `${cleanPlan} · Active`;

                    if (isSuspended) {
                        badgeClass = 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300';
                        icon = <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
                        text = 'Suspended';
                    } else if (isOverdue) {
                        badgeClass = 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300';
                        icon = <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
                        text = `${cleanPlan} · Overdue`;
                    } else if (isDueSoon) {
                        badgeClass = 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300';
                        icon = <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
                        text = `${cleanPlan} · ${daysLeft}d left`;
                    }

                    return (
                        <div className="p-3 border-t border-slate-200/70 dark:border-white/10 shrink-0 bg-white/70 dark:bg-slate-900/60 backdrop-blur-md">
                            <Link
                                href="/settings/billing"
                                className={`flex items-center ${
                                    collapsed ? 'justify-center p-2' : 'justify-between px-3 py-2'
                                } rounded-xl border text-xs font-semibold hover:opacity-90 transition-all shadow-xs ${badgeClass}`}
                                title={collapsed ? text : undefined}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    {icon}
                                    {!collapsed && <span className="font-semibold whitespace-nowrap text-xs">{text}</span>}
                                </div>
                                {!collapsed && <ChevronRight className="w-3.5 h-3.5 opacity-60 shrink-0 ml-1" />}
                            </Link>
                        </div>
                    );
                })()}

                {/* Powered by MedVisit Footer */}
                <div className="p-3 border-t border-slate-200/70 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] flex items-center justify-between text-xs shrink-0">
                    {!collapsed ? (
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
                            <ApplicationLogo className="w-4 h-4 shrink-0 opacity-70" />
                            <span>Powered by MedVisit</span>
                        </div>
                    ) : (
                        <div className="w-full flex justify-center text-slate-400" title="Powered by MedVisit">
                            <ApplicationLogo className="w-4 h-4 shrink-0 opacity-70" />
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Application Column: flex-1 min-w-0 takes remaining width without overflow */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                {/* Workspace Top Bar: Exactly 64px (h-16), glass: backdrop-blur, subtle bottom border */}
                <header className="h-16 border-b border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-4 shrink-0 z-20">
                    {/* Left: Mobile hamburger + Breadcrumbs */}
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Mobile Drawer Hamburger */}
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            className="lg:hidden w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0"
                            aria-label="Open navigation menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Breadcrumbs (small, muted) — NO big title here */}
                        {customBreadcrumbs && customBreadcrumbs.length > 0 ? (
                            <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                                {customBreadcrumbs.map((crumb, idx) => {
                                    const isLast = idx === customBreadcrumbs.length - 1;
                                    return (
                                        <React.Fragment key={idx}>
                                            {crumb.href && !isLast ? (
                                                <Link
                                                    href={crumb.href}
                                                    className="hover:text-primary transition-colors text-slate-500 dark:text-slate-400 truncate"
                                                >
                                                    {crumb.label}
                                                </Link>
                                            ) : (
                                                <span className={isLast ? 'text-slate-800 dark:text-slate-200 font-semibold truncate' : 'text-slate-500 dark:text-slate-400 truncate'}>
                                                    {crumb.label}
                                                </span>
                                            )}
                                            {!isLast && <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />}
                                        </React.Fragment>
                                    );
                                })}
                            </nav>
                        ) : activeBreadcrumb ? (
                            <nav aria-label="Breadcrumb" className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                                <span className="text-slate-400 dark:text-slate-500">{activeBreadcrumb.group}</span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 shrink-0" />
                                <span className="text-slate-800 dark:text-slate-200 font-semibold truncate">
                                    {activeBreadcrumb.page}
                                </span>
                            </nav>
                        ) : null}
                    </div>

                    {/* Center: Global Search (Command Palette) */}
                    <div className="flex-1 max-w-md mx-2 sm:mx-4 hidden md:block">
                        <button
                            type="button"
                            onClick={() => setCommandPaletteOpen(true)}
                            className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-primary/40 hover:bg-white dark:hover:bg-slate-800 transition-all shadow-inner shadow-black/[0.02]"
                        >
                            <span className="flex items-center gap-2 truncate">
                                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">Search patients, doctors, tokens…</span>
                            </span>
                            <kbd className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-white dark:bg-slate-700 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 shrink-0">
                                {isMac ? '⌘K' : 'Ctrl K'}
                            </kbd>
                        </button>
                    </div>

                    {/* Right Action Stack */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {/* Mobile Search Icon Button */}
                        <button
                            type="button"
                            onClick={() => setCommandPaletteOpen(true)}
                            className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            aria-label="Open search command palette"
                        >
                            <Search className="w-5 h-5" />
                        </button>

                        {/* ONE primary "Issue token" button (hidden when already on /bookings) */}
                        {(can('tokens.issue') || isClinicAdmin || isReceptionist) && !currentPath.startsWith('/bookings') && (
                            <Link
                                href="/bookings"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold bg-primary hover:bg-primary-600 text-white shadow-sm shadow-primary/25 transition-all hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0 cursor-pointer"
                                title="Issue a channeling token for a patient"
                            >
                                <Ticket className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Issue token</span>
                            </Link>
                        )}

                        {/* Live indicator: today's date + Live Clock (Asia/Colombo) + "X sessions live" pill */}
                        <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200/70 dark:border-white/10 text-xs">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">
                                {formattedDate}
                            </span>
                            <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-white/10">
                                {liveTime}
                            </span>
                            {(liveSessionsCount > 0 || overrunningSessionsCount > 0) && (
                                <Link
                                    href="/sessions/today"
                                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                                        liveSessionsCount > 0
                                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/50'
                                    }`}
                                    title="View active sessions in Today's Queue"
                                >
                                    <span
                                        className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                            liveSessionsCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'
                                        }`}
                                    />
                                    <span>
                                        {liveSessionsCount > 0 && overrunningSessionsCount > 0
                                            ? `${liveSessionsCount} live · ${overrunningSessionsCount} overrunning`
                                            : liveSessionsCount > 0
                                            ? `${liveSessionsCount} live`
                                            : `${overrunningSessionsCount} overrunning`}
                                    </span>
                                </Link>
                            )}
                        </div>

                        {/* Notifications Bell Dropdown */}
                        <NotificationDropdown />

                        {/* Theme Toggle (40px icon button, same size/style as bell) */}
                        <ThemeToggle size="lg" />

                        {/* Divider */}
                        <div className="h-5 w-px bg-slate-200 dark:bg-white/10 mx-0.5 hidden sm:block" />

                        {/* User Menu: User Initials + Name + Role */}
                        <div ref={userMenuRef} className="relative">
                            <button
                                type="button"
                                onClick={() => setUserMenuOpen(!userMenuOpen)}
                                className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20"
                                aria-label="Open user profile menu"
                            >
                                <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-tr from-primary to-secondary text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                                    {user.avatar_url ? (
                                        <img
                                            src={user.avatar_url}
                                            alt={user.name}
                                            className="w-full h-full object-cover"
                                            width={36}
                                            height={36}
                                        />
                                    ) : (
                                        userInitial
                                    )}
                                </div>
                                <div className="hidden md:block text-left max-w-[160px]">
                                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                        {user.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate leading-none">
                                        {roleLabel}
                                    </div>
                                </div>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block shrink-0" />
                            </button>

                            {userMenuOpen && (
                                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                                    {/* User Info Header */}
                                    <div className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-100 dark:border-white/5 mb-1">
                                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-tr from-primary to-secondary text-white font-bold text-xs flex items-center justify-center shrink-0">
                                            {user.avatar_url ? (
                                                <img
                                                    src={user.avatar_url}
                                                    alt={user.name}
                                                    className="w-full h-full object-cover"
                                                    width={36}
                                                    height={36}
                                                />
                                            ) : (
                                                userInitial
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                {user.name}
                                            </div>
                                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                {user.email}
                                            </div>
                                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary">
                                                {roleLabel}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Dropdown Links */}
                                    <Link
                                        href="/profile"
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <User className="w-4 h-4 text-slate-400" />
                                        <span>My Profile</span>
                                    </Link>

                                    {isClinicAdmin && (
                                        <>
                                            <Link
                                                href="/settings"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <Settings className="w-4 h-4 text-slate-400" />
                                                <span>Clinic Settings</span>
                                            </Link>

                                            <Link
                                                href="/settings/billing"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                            >
                                                <CreditCard className="w-4 h-4 text-slate-400" />
                                                <span>Subscription & Billing</span>
                                            </Link>
                                        </>
                                    )}

                                    <a
                                        href="mailto:support@medvisit.lk?subject=Support%20Request%20-%20MedVisit%20Clinic"
                                        onClick={() => setUserMenuOpen(false)}
                                        className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <HelpCircle className="w-4 h-4 text-slate-400" />
                                        <span>Help & Support</span>
                                    </a>

                                    <div className="my-1 border-t border-slate-100 dark:border-white/5" />

                                    <Link
                                        href="/logout"
                                        method="post"
                                        as="button"
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left cursor-pointer"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Log Out</span>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Mobile Off-canvas Drawer with Overlay */}
                {mobileOpen && (
                    <div className="lg:hidden fixed inset-0 z-40 flex">
                        <div
                            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in"
                            onClick={() => setMobileOpen(false)}
                        />
                        <div className="relative w-72 max-w-[80%] bg-white dark:bg-slate-900 h-full p-4 flex flex-col shadow-2xl z-10 overflow-y-auto">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div
                                        className={`w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shrink-0 ${
                                            tenant?.logo_url
                                                ? 'bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 p-0.5 shadow-sm'
                                                : 'bg-gradient-to-tr from-primary to-secondary text-white font-bold text-xs'
                                        }`}
                                    >
                                        {tenant?.logo_url ? (
                                            <img
                                                src={tenant.logo_url}
                                                alt={tenant?.name || 'Clinic'}
                                                className="w-full h-full object-contain"
                                                width={36}
                                                height={36}
                                            />
                                        ) : tenant?.name ? (
                                            tenant.name.charAt(0).toUpperCase()
                                        ) : (
                                            'M'
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                                            {tenant?.name || 'Clinic Workspace'}
                                        </div>
                                        <a
                                            href={publicBookingUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[11px] text-primary flex items-center gap-1"
                                        >
                                            <span>View public site</span>
                                            <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setMobileOpen(false)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                                    aria-label="Close menu"
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
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                                                            <span className="truncate">{item.name}</span>
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
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-left"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span>Log Out</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Scrollable Viewport: Content area scrolls smoothly while Top Bar & Sidebar remain fixed */}
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden flex flex-col">
                    {/* Standardized Page Content Body: max-w-[1440px], px-4 mobile / px-6 sm / px-8 lg */}
                    <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 min-w-0">
                        <BannerStack />
                        {children}
                    </main>

                    {/* Slim App Footer for Logged-In Clinic Workspaces */}
                    <footer className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-4 border-t border-slate-200/60 dark:border-white/5 text-[11px] text-slate-400 dark:text-slate-500 flex flex-wrap items-center justify-between gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                            <a
                                href="https://medvisit.lk"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-slate-600 dark:hover:text-slate-300 hover:underline transition-colors"
                            >
                                Powered by MedVisit
                            </a>
                        </div>
                        <div className="flex items-center gap-4">
                            <a href="https://medvisit.lk/terms" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                Terms
                            </a>
                            <a href="https://medvisit.lk/privacy-policy" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                Privacy
                            </a>
                            <a href="https://medvisit.lk/refund-policy" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                Refunds
                            </a>
                            <a href="mailto:support@medvisit.lk" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                                Support
                            </a>
                        </div>
                    </footer>
                </div>
            </div>
            </div>

            {/* Global Command Palette Modal */}
            <CommandPaletteModal
                isOpen={commandPaletteOpen}
                onClose={() => setCommandPaletteOpen(false)}
            />

            {/* Clinic Support Chat Widget */}
            <SupportChatWidget />
        </div>
    );
}
