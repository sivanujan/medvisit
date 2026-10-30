import React, { ReactNode, useState, useEffect, useRef, useMemo } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard,
    Building2,
    CreditCard,
    Layers,
    UserCheck,
    Pill,
    Megaphone,
    Mail,
    MessageSquare,
    Activity,
    Shield,
    Sliders,
    Users,
    Search,
    Menu,
    X,
    ChevronDown,
    ChevronRight,
    LogOut,
    ExternalLink,
    Sparkles,
    Bell,
    CheckCircle2,
    AlertCircle,
    Headphones,
    RotateCcw,
    AlertTriangle,
    Tag,
    Globe,
} from 'lucide-react';
import { MedVisitIcon } from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
import { getAvatarInitial } from '@/Utils/name';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

export interface PlatformLayoutProps {
    header?: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    children: ReactNode;
}

const PLATFORM_BREADCRUMBS: Record<string, { group: string; page: string }> = {
    '/super-admin': { group: 'Overview', page: 'Platform Dashboard' },
    '/super-admin/dashboard': { group: 'Overview', page: 'Platform Dashboard' },
    '/super-admin/clinics': { group: 'Business', page: 'Clinics & Tenants' },
    '/super-admin/subscriptions': { group: 'Business', page: 'Subscriptions & Invoices' },
    '/super-admin/refunds': { group: 'Business', page: 'Refund Requests' },
    '/super-admin/incidents': { group: 'Business', page: 'Platform Incidents' },
    '/super-admin/plans': { group: 'Business', page: 'Subscription Plans' },
    '/super-admin/promotions': { group: 'Business', page: 'Promotions & Invites' },
    '/super-admin/leads': { group: 'Business', page: 'Leads & Demos CRM' },
    '/super-admin/medicines': { group: 'Content', page: 'Global Medicine Catalog' },
    '/super-admin/announcements': { group: 'Content', page: 'Broadcast Announcements' },
    '/super-admin/email-previews': { group: 'Content', page: 'Email Templates' },
    '/super-admin/messaging': { group: 'Usage & Health', page: 'Messaging & OTP Usage' },
    '/super-admin/otp-usage': { group: 'Usage & Health', page: 'Messaging & OTP Usage' },
    '/super-admin/system-health': { group: 'Usage & Health', page: 'System Health & Queue' },
    '/super-admin/audit-logs': { group: 'Admin', page: 'Platform Audit Log' },
    '/super-admin/reserved-subdomains': { group: 'Admin', page: 'Reserved Subdomains' },
    '/super-admin/settings': { group: 'Admin', page: 'Platform Settings' },
    '/super-admin/admins': { group: 'Admin', page: 'Admin Users & 2FA' },
    '/super-admin/support': { group: 'Support', page: 'Support Inbox' },
};

export default function PlatformLayout({
    breadcrumbs: customBreadcrumbs,
    children,
}: PlatformLayoutProps) {
    const { auth, pendingMedicineReviewsCount = 0, waitingSupportCount = 0, pendingRefundsCount = 0 } = usePage<{
        auth: {
            user: {
                id: number;
                name: string;
                email: string;
                avatar_url?: string | null;
            };
        };
        pendingMedicineReviewsCount?: number;
        waitingSupportCount?: number;
        pendingRefundsCount?: number;
    }>().props;

    const user = auth?.user;
    const [collapsed, setCollapsed] = useState<boolean>(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const userMenuRef = useRef<HTMLDivElement>(null);

    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

    const isItemActive = (href: string) => {
        if (href === '/super-admin' || href === '/super-admin/dashboard') {
            return currentPath === '/super-admin' || currentPath === '/super-admin/dashboard';
        }
        return currentPath.startsWith(href);
    };

    const activeBreadcrumb = useMemo(() => {
        if (customBreadcrumbs && customBreadcrumbs.length > 0) return null;
        for (const [key, val] of Object.entries(PLATFORM_BREADCRUMBS)) {
            if (key === currentPath || (key !== '/super-admin' && currentPath.startsWith(key))) {
                return val;
            }
        }
        return { group: 'Platform', page: 'Console' };
    }, [currentPath, customBreadcrumbs]);

    // Keyboard shortcut for search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setSearchOpen((prev) => !prev);
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

    const navGroups = [
        {
            title: 'OVERVIEW',
            items: [
                {
                    name: 'Dashboard',
                    href: '/super-admin',
                    icon: LayoutDashboard,
                    badge: undefined,
                },
            ],
        },
        {
            title: 'BUSINESS',
            items: [
                {
                    name: 'Clinics (Tenants)',
                    href: '/super-admin/clinics',
                    icon: Building2,
                    badge: undefined,
                },
                {
                    name: 'Subscriptions & Invoices',
                    href: '/super-admin/subscriptions',
                    icon: CreditCard,
                    badge: undefined,
                },
                {
                    name: 'Refund Requests',
                    href: '/super-admin/refunds',
                    icon: RotateCcw,
                    badge: pendingRefundsCount > 0 ? `${pendingRefundsCount}` : undefined,
                },
                {
                    name: 'Platform Incidents',
                    href: '/super-admin/incidents',
                    icon: AlertTriangle,
                    badge: undefined,
                },
                {
                    name: 'Subscription Plans',
                    href: '/super-admin/plans',
                    icon: Layers,
                    badge: undefined,
                },
                {
                    name: 'Promotions & Invites',
                    href: '/super-admin/promotions',
                    icon: Tag,
                    badge: undefined,
                },
                {
                    name: 'Leads & Demos CRM',
                    href: '/super-admin/leads',
                    icon: UserCheck,
                    badge: undefined,
                },
            ],
        },
        {
            title: 'CONTENT',
            items: [
                {
                    name: 'Medicine Catalog',
                    href: '/super-admin/medicines',
                    icon: Pill,
                    badge: pendingMedicineReviewsCount > 0 ? `${pendingMedicineReviewsCount}` : undefined,
                },
                {
                    name: 'Announcements',
                    href: '/super-admin/announcements',
                    icon: Megaphone,
                    badge: undefined,
                },
                {
                    name: 'Email Templates',
                    href: '/super-admin/email-previews',
                    icon: Mail,
                    badge: undefined,
                },
            ],
        },
        {
            title: 'USAGE & HEALTH',
            items: [
                {
                    name: 'Messaging & OTP Usage',
                    href: '/super-admin/messaging',
                    icon: MessageSquare,
                    badge: undefined,
                },
                {
                    name: 'System Health & Queue',
                    href: '/super-admin/system-health',
                    icon: Activity,
                    badge: undefined,
                },
            ],
        },
        {
            title: 'SUPPORT',
            items: [
                {
                    name: 'Support Inbox',
                    href: '/super-admin/support',
                    icon: Headphones,
                    badge: waitingSupportCount > 0 ? `${waitingSupportCount}` : undefined,
                    badgeColor: 'coral',
                },
            ],
        },
        {
            title: 'ADMINISTRATION',
            items: [
                {
                    name: 'Platform Audit Log',
                    href: '/super-admin/audit-logs',
                    icon: Shield,
                    badge: undefined,
                },
                {
                    name: 'Reserved Subdomains',
                    href: '/super-admin/reserved-subdomains',
                    icon: Globe,
                    badge: undefined,
                },
                {
                    name: 'Platform Settings',
                    href: '/super-admin/settings',
                    icon: Sliders,
                    badge: undefined,
                },
                {
                    name: 'Admin Users & 2FA',
                    href: '/super-admin/admins',
                    icon: Users,
                    badge: undefined,
                },
            ],
        },
    ];

    const userInitial = user ? getAvatarInitial(user.name) : 'SA';

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col relative selection:bg-indigo-500/20 selection:text-indigo-600">
            {/* Ambient Background Glows */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-3xl" />
                <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-cyan-500/10 dark:bg-cyan-500/15 blur-3xl" />
                <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-purple-500/5 dark:bg-purple-500/10 blur-3xl" />
            </div>

            <div className="flex flex-1 relative min-h-0">
                {/* Desktop Sidebar */}
                <aside
                    className={`hidden lg:flex flex-col border-r border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-slate-900/70 backdrop-blur-2xl shrink-0 z-30 sticky top-0 h-screen transition-all duration-300 ease-in-out ${
                        collapsed ? 'w-20' : 'w-64'
                    }`}
                >
                    {/* Platform Brand Header */}
                    <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 shrink-0">
                        <Link href="/super-admin" className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center p-1.5 shadow-md shadow-indigo-500/20 shrink-0">
                                <MedVisitIcon className="w-full h-full text-white" />
                            </div>
                            {!collapsed && (
                                <div className="truncate">
                                    <div className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <span>MedVisit</span>
                                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                                            Platform
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-medium">Owner Console</div>
                                </div>
                            )}
                        </Link>
                    </div>

                    {/* Navigation Items */}
                    <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                        {navGroups.map((group) => (
                            <div key={group.title} className="space-y-1">
                                {!collapsed && (
                                    <div className="px-3 pb-1 text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                                        {group.title}
                                    </div>
                                )}
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const active = isItemActive(item.href);
                                        const Icon = item.icon;
                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all group relative ${
                                                    active
                                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25 dark:shadow-indigo-900/40'
                                                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                                                } ${collapsed ? 'justify-center' : ''}`}
                                                title={collapsed ? item.name : undefined}
                                            >
                                                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400'}`} />
                                                {!collapsed && (
                                                    <span className="truncate flex-1">{item.name}</span>
                                                )}
                                                {!collapsed && item.badge && (
                                                    <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full text-white ${
                                                        (item as any).badgeColor === 'coral' ? 'bg-[#FF7A59]' : 'bg-amber-500'
                                                    }`}>
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Sidebar Footer */}
                    <div className="p-3 border-t border-slate-200/80 dark:border-white/10 shrink-0">
                        <Link
                            href="/logout"
                            method="post"
                            as="button"
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition cursor-pointer"
                        >
                            <LogOut className="w-4 h-4 shrink-0" />
                            {!collapsed && <span>Sign Out</span>}
                        </Link>
                    </div>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Top Bar */}
                    <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl flex items-center justify-between sticky top-0 z-20">
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Mobile Menu Button */}
                            <button
                                type="button"
                                onClick={() => setMobileOpen(true)}
                                className="lg:hidden p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <Menu className="w-5 h-5" />
                            </button>

                            {/* Breadcrumbs */}
                            <div className="hidden sm:flex items-center gap-2 text-xs">
                                {customBreadcrumbs ? (
                                    customBreadcrumbs.map((crumb, idx) => (
                                        <React.Fragment key={idx}>
                                            {idx > 0 && <span className="text-slate-400">/</span>}
                                            {crumb.href ? (
                                                <Link href={crumb.href} className="text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium">
                                                    {crumb.label}
                                                </Link>
                                            ) : (
                                                <span className="font-bold text-slate-900 dark:text-white">{crumb.label}</span>
                                            )}
                                        </React.Fragment>
                                    ))
                                ) : activeBreadcrumb ? (
                                    <>
                                        <span className="text-slate-400 font-medium">{activeBreadcrumb.group}</span>
                                        <span className="text-slate-400">/</span>
                                        <span className="font-bold text-slate-900 dark:text-white">{activeBreadcrumb.page}</span>
                                    </>
                                ) : (
                                    <span className="font-bold text-slate-900 dark:text-white">Platform Console</span>
                                )}
                            </div>
                        </div>

                        {/* Top Bar Right Actions */}
                        <div className="flex items-center gap-3">
                            {/* Search Button */}
                            <button
                                type="button"
                                onClick={() => setSearchOpen(true)}
                                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400 transition"
                            >
                                <Search className="w-3.5 h-3.5" />
                                <span>Search clinics, invoices...</span>
                                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-[10px] font-mono">
                                    ⌘K
                                </kbd>
                            </button>

                            {/* Theme Toggle */}
                            <ThemeToggle />

                            {/* Super Admin User Profile Dropdown */}
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    type="button"
                                    onClick={() => setUserMenuOpen((prev) => !prev)}
                                    className="flex items-center gap-2.5 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                                        {userInitial}
                                    </div>
                                    <div className="hidden md:block text-left">
                                        <div className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</div>
                                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">Platform Super Admin</div>
                                    </div>
                                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/10 shadow-xl py-2 z-50">
                                        <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5">
                                            <div className="text-xs font-bold text-slate-900 dark:text-white">{user?.name}</div>
                                            <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
                                        </div>
                                        <Link
                                            href="/profile"
                                            className="block px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        >
                                            Account Security & 2FA
                                        </Link>
                                        <Link
                                            href="/super-admin/settings"
                                            className="block px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        >
                                            Platform Settings
                                        </Link>
                                        <div className="my-1 border-t border-slate-100 dark:border-white/5" />
                                        <Link
                                            href="/logout"
                                            method="post"
                                            as="button"
                                            className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                                        >
                                            <LogOut className="w-3.5 h-3.5" />
                                            <span>Sign Out</span>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Standardized Page Content Body */}
                    <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        {children}
                    </main>
                </div>
            </div>

            {/* Mobile Sheet Navigation */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
                    <div className="fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 p-4 flex flex-col z-10 shadow-2xl">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/10">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center p-1 text-white">
                                    <MedVisitIcon className="w-full h-full text-white" />
                                </div>
                                <span className="font-bold text-sm">MedVisit Platform</span>
                            </div>
                            <button type="button" onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto py-4 space-y-4">
                            {navGroups.map((g) => (
                                <div key={g.title} className="space-y-1">
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">{g.title}</div>
                                    {g.items.map((i) => {
                                        const active = isItemActive(i.href);
                                        const Icon = i.icon;
                                        return (
                                            <Link
                                                key={i.href}
                                                href={i.href}
                                                onClick={() => setMobileOpen(false)}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
                                                    active ? 'bg-indigo-600 text-white' : 'text-slate-600 dark:text-slate-300'
                                                }`}
                                            >
                                                <Icon className="w-4 h-4 shrink-0" />
                                                <span>{i.name}</span>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
