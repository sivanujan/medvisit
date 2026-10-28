import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import {
    Users,
    Shield,
    Key,
    UserPlus,
    X,
    CheckCircle2,
    AlertCircle,
    Smartphone,
    Download,
    Copy,
    LogOut,
    Laptop,
    Check,
    History,
    Lock,
    Trash2,
} from 'lucide-react';

interface SuperAdminItem {
    id: number;
    name: string;
    email: string;
    is_active: boolean;
    two_factor_enabled: boolean;
    last_login_at?: string | null;
    last_login_ip?: string | null;
    created_at: string;
}

interface InvitationItem {
    id: string;
    email: string;
    invited_by: string;
    expires_at: string;
    is_expired: boolean;
}

interface SessionItem {
    id: string;
    ip_address: string;
    is_current: boolean;
    browser: string;
    platform: string;
    last_active: string;
}

interface LoginEvent {
    id: string;
    action: string;
    ip_address?: string | null;
    user_agent?: string | null;
    created_at: string;
}

interface Props {
    superAdmins: SuperAdminItem[];
    invitations: InvitationItem[];
    sessions: SessionItem[];
    loginHistory: LoginEvent[];
    my2fa: {
        enabled: boolean;
        confirmed_at?: string | null;
        has_recovery_codes: boolean;
    };
}

export default function AdminsIndex({
    superAdmins = [],
    invitations = [],
    sessions = [],
    loginHistory = [],
    my2fa,
}: Props) {
    const { auth } = usePage<any>().props;
    const currentUserId = auth?.user?.id;

    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');

    // 2FA Setup Modal
    const [setup2faOpen, setSetup2faOpen] = useState(false);
    const [setupSecret, setSetupSecret] = useState('');
    const [setupQrUrl, setSetupQrUrl] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [setupLoading, setSetupLoading] = useState(false);
    const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
    const [setupError, setSetupError] = useState<string | null>(null);

    // Disable 2FA Modal
    const [disable2faOpen, setDisable2faOpen] = useState(false);
    const [disablePassword, setDisablePassword] = useState('');
    const [disableCode, setDisableCode] = useState('');
    const [disableError, setDisableError] = useState<string | null>(null);

    // Regenerate Codes Modal
    const [regenOpen, setRegenOpen] = useState(false);
    const [regenPassword, setRegenPassword] = useState('');
    const [regenCodes, setRegenCodes] = useState<string[] | null>(null);

    const [copiedKey, setCopiedKey] = useState(false);
    const [copiedCodes, setCopiedCodes] = useState(false);

    const handleOpen2faSetup = async () => {
        setSetupLoading(true);
        setSetupError(null);
        setRecoveryCodes(null);
        setVerificationCode('');
        try {
            const res = await fetch('/super-admin/admins/2fa/setup');
            const data = await res.json();
            setSetupSecret(data.secret);
            setSetupQrUrl(data.qr_code_url);
            setSetup2faOpen(true);
        } catch {
            alert('Failed initializing 2FA setup.');
        } finally {
            setSetupLoading(false);
        }
    };

    const handleConfirm2fa = async (e: React.FormEvent) => {
        e.preventDefault();
        setSetupError(null);
        try {
            const res = await fetch('/super-admin/admins/2fa/confirm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ code: verificationCode }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setRecoveryCodes(data.recovery_codes);
                router.reload({ only: ['my2fa', 'superAdmins'] });
            } else {
                setSetupError(data.message || 'Verification failed.');
            }
        } catch {
            setSetupError('Network error confirming 2FA.');
        }
    };

    const handleDisable2fa = async (e: React.FormEvent) => {
        e.preventDefault();
        setDisableError(null);
        try {
            const res = await fetch('/super-admin/admins/2fa/disable', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ password: disablePassword, code: disableCode }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setDisable2faOpen(false);
                router.reload({ only: ['my2fa', 'superAdmins'] });
            } else {
                setDisableError(data.message || 'Disable 2FA failed.');
            }
        } catch {
            setDisableError('Error disabling 2FA.');
        }
    };

    const handleRegenerateCodes = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/super-admin/admins/2fa/recovery-codes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ password: regenPassword }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setRegenCodes(data.recovery_codes);
            } else {
                alert(data.message || 'Password verification failed.');
            }
        } catch {
            alert('Failed regenerating recovery codes.');
        }
    };

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        router.post('/super-admin/admins/invite', { email: inviteEmail }, {
            onSuccess: () => {
                setInviteOpen(false);
                setInviteEmail('');
            },
        });
    };

    return (
        <PlatformLayout>
            <Head title="Super Admins & 2FA — MedVisit Platform" />

            <div className="space-y-6">
                {/* Header with Invite Button */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <Users className="w-6 h-6 text-indigo-500" />
                            Platform Administrators & 2FA
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Manage super admin team access, TOTP two-factor security, recovery codes, and active browser sessions.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setInviteOpen(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                    >
                        <UserPlus className="w-4 h-4" />
                        Invite Super Admin
                    </button>
                </div>

                {/* 2FA Status Card for Current User */}
                <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                        <div className={`p-3 rounded-2xl ${my2fa.enabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'} shrink-0`}>
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your Two-Factor Authentication (TOTP)</h3>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    my2fa.enabled
                                        ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                }`}>
                                    {my2fa.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
                                {my2fa.enabled
                                    ? `2FA is active and safeguarding your administrator credentials with an authenticator app (Google Authenticator, 1Password, Authy).`
                                    : 'Add an extra layer of protection to your super admin account using standard RFC 6238 time-based one-time passwords.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {my2fa.enabled ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => { setRegenPassword(''); setRegenCodes(null); setRegenOpen(true); }}
                                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                    Recovery Codes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setDisablePassword(''); setDisableCode(''); setDisableError(null); setDisable2faOpen(true); }}
                                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-semibold hover:bg-rose-500/20"
                                >
                                    Disable 2FA
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={handleOpen2faSetup}
                                disabled={setupLoading}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5"
                            >
                                <Smartphone className="w-3.5 h-3.5" />
                                {setupLoading ? 'Loading...' : 'Set Up 2FA'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Super Admins Table */}
                <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                    <div className="p-4 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Super Administrators</h3>
                        <span className="text-xs text-slate-400">{superAdmins.length} users with platform ownership role</span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">Admin Name & Email</th>
                                    <th className="py-3 px-4">2FA Status</th>
                                    <th className="py-3 px-4">Account Status</th>
                                    <th className="py-3 px-4">Last Login</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {superAdmins.map((admin) => (
                                    <tr key={admin.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                                <span>{admin.name}</span>
                                                {admin.id === currentUserId && (
                                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-600">You</span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-500 font-mono">{admin.email}</div>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                                                admin.two_factor_enabled ? 'text-emerald-600' : 'text-slate-400'
                                            }`}>
                                                <Shield className="w-3.5 h-3.5" />
                                                {admin.two_factor_enabled ? '2FA Enabled' : 'None'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                admin.is_active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                                            }`}>
                                                {admin.is_active ? 'Active' : 'Deactivated'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-xs text-slate-500">
                                            {admin.last_login_at || 'Never'}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            {admin.id !== currentUserId && (
                                                admin.is_active ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => router.post(`/super-admin/admins/${admin.id}/deactivate`)}
                                                        className="text-xs text-rose-600 hover:underline font-semibold"
                                                    >
                                                        Deactivate
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => router.post(`/super-admin/admins/${admin.id}/reactivate`)}
                                                        className="text-xs text-emerald-600 hover:underline font-semibold"
                                                    >
                                                        Reactivate
                                                    </button>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pending Invitations Table */}
                {invitations.length > 0 && (
                    <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        <div className="p-4 border-b border-slate-200/80 dark:border-white/10">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pending Admin Invitations (48h Signed Link)</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs sm:text-sm">
                                <thead className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                    <tr>
                                        <th className="py-2.5 px-3">Invited Email</th>
                                        <th className="py-2.5 px-3">Invited By</th>
                                        <th className="py-2.5 px-3">Expires At</th>
                                        <th className="py-2.5 px-3 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                    {invitations.map((inv) => (
                                        <tr key={inv.id}>
                                            <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200 font-mono">
                                                {inv.email}
                                            </td>
                                            <td className="py-2.5 px-3 text-slate-500">{inv.invited_by}</td>
                                            <td className="py-2.5 px-3 text-xs text-slate-400">{inv.expires_at}</td>
                                            <td className="py-2.5 px-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => router.delete(`/super-admin/admins/invitations/${inv.id}`)}
                                                    className="text-xs text-rose-500 hover:underline font-semibold"
                                                >
                                                    Revoke
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Active Sessions & Login History Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Active Browser Sessions */}
                    <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
                            <div className="flex items-center gap-2">
                                <Laptop className="w-4 h-4 text-indigo-500" />
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Browser Sessions</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => router.post('/super-admin/admins/sessions/logout-others')}
                                className="text-xs text-rose-600 hover:underline font-semibold"
                            >
                                Log out other sessions
                            </button>
                        </div>

                        <div className="space-y-2.5 text-xs">
                            {sessions.map((s) => (
                                <div key={s.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                            <span>{s.browser} on {s.platform}</span>
                                            {s.is_current && (
                                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600">This Device</span>
                                            )}
                                        </div>
                                        <div className="text-slate-400 font-mono mt-0.5">IP: {s.ip_address} · {s.last_active}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Login History */}
                    <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 pb-3">
                            <History className="w-4 h-4 text-indigo-500" />
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Login Telemetry (Last 50)</h3>
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-2 text-xs">
                            {loginHistory.map((lh) => (
                                <div key={lh.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                                    <div>
                                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{lh.action}</span>
                                        <span className="text-slate-400 font-mono ml-2">({lh.ip_address})</span>
                                    </div>
                                    <span className="text-slate-400 text-[11px]">{lh.created_at}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Invite Admin Modal */}
            {inviteOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Invite Super Administrator</h3>
                            <button type="button" onClick={() => setInviteOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleInvite} className="space-y-4 mt-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Colleague Email Address *
                                </label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="admin@medvisit.lk"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                    required
                                />
                                <span className="text-[11px] text-slate-400 mt-1 block">
                                    A temporary signed invitation link with 48 hours validity will be generated.
                                </span>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setInviteOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20"
                                >
                                    Send Invitation Link
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2FA Setup Modal with QR Code and 10 Recovery Codes */}
            {setup2faOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Set Up Two-Factor Authentication</h3>
                            <button type="button" onClick={() => setSetup2faOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {!recoveryCodes ? (
                            <div className="space-y-4 mt-4">
                                <p className="text-xs text-slate-600 dark:text-slate-300">
                                    Scan this QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, or 1Password), or manually enter the key below.
                                </p>

                                <div className="flex justify-center p-4 bg-white rounded-2xl border border-slate-200 w-fit mx-auto shadow-sm">
                                    <img src={setupQrUrl} alt="2FA QR Code" className="w-48 h-48" />
                                </div>

                                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-center">
                                    <span className="text-[11px] text-slate-400 block mb-1">Manual Entry Key:</span>
                                    <code className="font-mono text-sm font-bold text-indigo-600 dark:text-indigo-400 tracking-widest select-all">
                                        {setupSecret}
                                    </code>
                                </div>

                                <form onSubmit={handleConfirm2fa} className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                            Enter 6-Digit Code From Authenticator App:
                                        </label>
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={verificationCode}
                                            onChange={(e) => setVerificationCode(e.target.value)}
                                            placeholder="123456"
                                            className="w-full text-center tracking-widest font-mono text-xl py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800"
                                            required
                                        />
                                    </div>

                                    {setupError && (
                                        <div className="text-xs text-rose-500 font-medium text-center">
                                            {setupError}
                                        </div>
                                    )}

                                    <div className="flex justify-end gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setSetup2faOpen(false)}
                                            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-600/20"
                                        >
                                            Confirm & Enable 2FA
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="space-y-4 mt-4">
                                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-semibold flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                                    Two-Factor Authentication is now enabled on your account!
                                </div>

                                <p className="text-xs text-slate-600 dark:text-slate-300">
                                    <strong>Save your one-time recovery codes:</strong> If you lose your phone or authenticator access, each code can be used once to log in. Store them in a secure password manager.
                                </p>

                                <div className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs grid grid-cols-2 gap-2 select-all">
                                    {recoveryCodes.map((c, i) => (
                                        <div key={i}>{c}</div>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            navigator.clipboard.writeText(recoveryCodes.join('\n'));
                                            setCopiedCodes(true);
                                            setTimeout(() => setCopiedCodes(false), 2000);
                                        }}
                                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold flex items-center gap-1.5"
                                    >
                                        {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                        {copiedCodes ? 'Copied' : 'Copy Codes'}
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setSetup2faOpen(false)}
                                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs"
                                    >
                                        Done & Close
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Disable 2FA Modal */}
            {disable2faOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Disable 2FA</h3>
                            <button type="button" onClick={() => setDisable2faOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleDisable2fa} className="space-y-4 mt-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Current Password *
                                </label>
                                <input
                                    type="password"
                                    value={disablePassword}
                                    onChange={(e) => setDisablePassword(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    6-Digit Authenticator Code *
                                </label>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={disableCode}
                                    onChange={(e) => setDisableCode(e.target.value)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm font-mono text-center"
                                    required
                                />
                            </div>

                            {disableError && (
                                <div className="text-xs text-rose-500 font-medium">
                                    {disableError}
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setDisable2faOpen(false)}
                                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-sm"
                                >
                                    Confirm & Disable
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Recovery Codes Modal */}
            {regenOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
                    <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">Emergency Recovery Codes</h3>
                            <button type="button" onClick={() => setRegenOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {!regenCodes ? (
                            <form onSubmit={handleRegenerateCodes} className="space-y-4 mt-4">
                                <p className="text-xs text-slate-600 dark:text-slate-300">
                                    Confirm your password to view or regenerate 10 new one-time recovery codes.
                                </p>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Account Password *
                                    </label>
                                    <input
                                        type="password"
                                        value={regenPassword}
                                        onChange={(e) => setRegenPassword(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-sm"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setRegenOpen(false)}
                                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-semibold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-sm"
                                    >
                                        Regenerate Codes
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="space-y-4 mt-4">
                                <p className="text-xs text-slate-600 dark:text-slate-300">
                                    New recovery codes generated. Any prior recovery codes are now invalid:
                                </p>
                                <div className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs grid grid-cols-2 gap-2 select-all">
                                    {regenCodes.map((c, i) => (
                                        <div key={i}>{c}</div>
                                    ))}
                                </div>
                                <div className="flex justify-end pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setRegenOpen(false)}
                                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-xs"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </PlatformLayout>
    );
}
