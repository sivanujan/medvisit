import React, { ReactNode, useState } from 'react';
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
    Sparkles,
    User,
    ChevronDown,
    Layers,
    Shield,
    Stethoscope,
} from 'lucide-react';
import ApplicationLogo from '@/Components/ApplicationLogo';
import ThemeToggle from '@/Components/Common/ThemeToggle';
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
    const { auth } = usePage<{
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
    }>().props;

    const user = auth.user;
    const { isSuperAdmin, isClinicAdmin, isDoctor, isReceptionist } = usePermission();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const userInitial = getAvatarInitial(user.name);
    const firstName = getFirstName(user.name);

    const roleLabel = isSuperAdmin
        ? 'Super Admin'
        : isClinicAdmin
        ? 'Clinic Admin'
        : isDoctor
        ? 'Doctor'
        : isReceptionist
        ? 'Receptionist'
        : 'Staff';

    const navigation = [
        {
            name: 'Dashboard',
            href: route('dashboard'),
            active: route().current('dashboard'),
            icon: LayoutDashboard,
        },
        {
            name: 'Component Library',
            href: '/dev/components',
            active: window.location.pathname === '/dev/components',
            icon: Layers,
            badge: 'Dev',
        },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex relative selection:bg-primary-100 selection:text-primary-800">
            {/* Ambient Background Glow (Calm Healthcare Palette) */}
            <div aria-hidden="true" className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary-500/10 dark:bg-primary-500/15 blur-3xl" />
                <div className="absolute top-1/3 -right-32 w-[30rem] h-[30rem] rounded-full bg-secondary-500/10 dark:bg-secondary-500/15 blur-3xl" />
                <div className="absolute -bottom-32 left-1/3 w-96 h-96 rounded-full bg-accent-500/5 dark:bg-accent-500/10 blur-3xl" />
            </div>

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-2xl shrink-0 z-30 sticky top-0 h-screen">
                {/* Brand Header */}
                <div className="h-18 px-6 flex items-center border-b border-slate-200/70 dark:border-white/10">
                    <Link href="/" className="flex items-center gap-2 group">
                        <ApplicationLogo className="h-8 w-auto transition-transform group-hover:scale-105" />
                    </Link>
                </div>

                {/* Tenant / Scope Card */}
                <div className="p-4">
                    <div className="px-3.5 py-2.5 rounded-2xl bg-slate-100/80 dark:bg-white/[0.05] border border-slate-200/60 dark:border-white/10 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary-100 dark:bg-primary-900/50 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                            {user.tenant_id ? user.tenant_id.charAt(0).toUpperCase() : <Shield className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold truncate text-slate-800 dark:text-slate-200">
                                {user.tenant_id ? `Clinic: ${user.tenant_id}` : 'MedVisit Central'}
                            </p>
                            <span className="inline-block text-[10px] font-semibold text-primary uppercase tracking-wider">
                                {roleLabel}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                                    item.active
                                        ? 'bg-primary text-white shadow-sm shadow-primary/20'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-white/[0.05]'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <Icon className="w-4 h-4 shrink-0" />
                                    <span>{item.name}</span>
                                </div>
                                {item.badge && (
                                    <span
                                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                            item.active
                                                ? 'bg-white/20 text-white'
                                                : 'bg-primary-100 dark:bg-primary-950/60 text-primary dark:text-primary-300'
                                        }`}
                                    >
                                        {item.badge}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Sidebar Footer User Card */}
                <div className="p-4 border-t border-slate-200/70 dark:border-white/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {userInitial}
                            </div>
                            <div className="min-w-0">
                                <p className="text-xs font-bold truncate text-slate-900 dark:text-white leading-tight">
                                    {firstName}
                                </p>
                                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                            </div>
                        </div>
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Sign out"
                        >
                            <LogOut className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Mobile Drawer Backdrop & Panel */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 z-50 flex">
                    <div
                        className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
                        onClick={() => setMobileOpen(false)}
                    />
                    <div className="relative w-64 max-w-xs bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-white/10 flex flex-col z-10 p-4">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
                            <ApplicationLogo className="h-7 w-auto" />
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <nav className="flex-1 py-4 space-y-1">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                                            item.active
                                                ? 'bg-primary text-white'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.05]'
                                        }`}
                                    >
                                        <Icon className="w-4 h-4 shrink-0" />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                        <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                            <ThemeToggle size="sm" />
                            <Link
                                href={route('logout')}
                                method="post"
                                as="button"
                                className="text-xs font-bold text-rose-600 flex items-center gap-1.5"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Sign out</span>
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                {/* Top Glass Bar */}
                <header className="h-18 px-4 sm:px-8 border-b border-slate-200/70 dark:border-white/10 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => setMobileOpen(true)}
                            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10"
                            aria-label="Open sidebar menu"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        {header ? (
                            <div>{header}</div>
                        ) : (
                            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                                Overview
                            </h2>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Theme Toggle Button */}
                        <ThemeToggle size="md" />

                        {/* User Profile Dropdown Menu */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setUserMenuOpen((p) => !p)}
                                className="flex items-center gap-2 p-1.5 sm:px-3 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-all text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-xs"
                                aria-expanded={userMenuOpen}
                            >
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-primary to-secondary text-white font-bold text-[10px] flex items-center justify-center">
                                    {userInitial}
                                </div>
                                <span className="hidden sm:inline-block max-w-[120px] truncate">{firstName}</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            </button>

                            {userMenuOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-20"
                                        onClick={() => setUserMenuOpen(false)}
                                    />
                                    <div className="absolute right-0 mt-2 w-48 rounded-2xl p-1.5 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 shadow-xl backdrop-blur-xl z-30 space-y-0.5">
                                        <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 mb-1">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                                {user.name}
                                            </p>
                                            <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                                        </div>
                                        <Link
                                            href={route('profile.edit')}
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                                        >
                                            <User className="w-3.5 h-3.5" />
                                            <span>Profile Settings</span>
                                        </Link>
                                        <Link
                                            href={route('logout')}
                                            method="post"
                                            as="button"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-left"
                                        >
                                            <LogOut className="w-3.5 h-3.5" />
                                            <span>Sign out</span>
                                        </Link>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Unverified Email Warning Banner */}
                {user && !user.email_verified_at && (
                    <div className="bg-gradient-to-r from-amber-500/15 via-amber-600/10 to-transparent border-b border-amber-500/25 px-4 sm:px-8 py-3 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                            <span>
                                <strong>Admin Email Verification Pending:</strong> Please verify your email address (<strong>{user.email}</strong>). Staff invitations and external integrations are disabled until verified. Check your inbox or local mail logs.
                            </span>
                        </div>
                        <Link
                            href={route('verification.notice')}
                            className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-100 font-bold text-xs transition-colors shrink-0"
                        >
                            Verify Email
                        </Link>
                    </div>
                )}

                {/* Main Content Area */}
                <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
