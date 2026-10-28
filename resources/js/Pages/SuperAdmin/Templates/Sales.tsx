import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import { GlassCard } from '@/Components/UI/GlassCard';
import {
    ArrowLeft,
    Download,
    DollarSign,
    CheckCircle2,
    Sparkles,
    Shield,
    Filter,
    Calendar,
    Building2,
} from 'lucide-react';

interface PurchaseItem {
    id: number;
    tenant_id: string;
    template_id: number;
    source: 'purchase' | 'plan_included' | 'admin_grant';
    price_cents: number;
    status: 'pending' | 'paid' | 'refunded' | 'revoked';
    purchased_at: string | null;
    first_published_at: string | null;
    refunded_at: string | null;
    revoked_at: string | null;
    revoked_reason: string | null;
    template?: {
        name: string;
        slug: string;
    };
    tenant?: {
        name: string;
        subdomain: string;
    };
    invoice?: {
        invoice_number: string;
        receipt_number: string;
    };
}

interface Props {
    purchases: {
        data: PurchaseItem[];
        current_page: number;
        last_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    metrics: {
        total_revenue_cents: number;
        total_revenue_formatted: string;
        paid_count: number;
        plan_included_count: number;
    };
    templates: Array<{ id: number; name: string; slug: string }>;
    filters: {
        template_id?: string;
        status?: string;
        source?: string;
    };
}

export default function TemplateSales({ purchases, metrics, templates, filters }: Props) {
    const handleFilterChange = (key: string, value: string) => {
        router.get(
            '/super-admin/template-sales',
            { ...filters, [key]: value || undefined },
            { preserveState: true }
        );
    };

    return (
        <PlatformLayout>
            <Head title="Template Sales & Entitlements — Super Admin" />

            <div className="space-y-8 max-w-7xl mx-auto py-6">
                <PageHeader
                    title="Website Template Sales & Entitlements"
                    subtitle="Track revenue, paid purchases, plan-included claims, and refund audit history."
                    action={
                        <div className="flex items-center gap-3">
                            <Link
                                href="/super-admin/templates"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold hover:bg-slate-50 transition"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Catalog Management</span>
                            </Link>

                            <a
                                href="/super-admin/template-sales/export"
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition shadow-sm"
                            >
                                <Download className="w-4 h-4" />
                                <span>Export CSV</span>
                            </a>
                        </div>
                    }
                />

                {/* Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between text-slate-500 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                            <DollarSign className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {metrics.total_revenue_formatted}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Direct template one-time purchases</p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between text-slate-500 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Paid Sales</span>
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {metrics.paid_count}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Paid one-time transactions</p>
                    </GlassCard>

                    <GlassCard className="p-5">
                        <div className="flex items-center justify-between text-slate-500 mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider">Plan-Included Claims</span>
                            <Sparkles className="w-4 h-4 text-amber-500" />
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white">
                            {metrics.plan_included_count}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">Active Advanced plan allocations</p>
                    </GlassCard>
                </div>

                {/* Filter Toolbar */}
                <GlassCard className="p-4">
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500 font-bold">
                            <Filter className="w-3.5 h-3.5" />
                            <span>Filters:</span>
                        </div>

                        <select
                            value={filters.template_id || ''}
                            onChange={(e) => handleFilterChange('template_id', e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        >
                            <option value="">All Templates</option>
                            {templates.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.name}
                                </option>
                            ))}
                        </select>

                        <select
                            value={filters.status || ''}
                            onChange={(e) => handleFilterChange('status', e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        >
                            <option value="">All Statuses</option>
                            <option value="paid">Paid / Active</option>
                            <option value="pending">Pending</option>
                            <option value="refunded">Refunded</option>
                            <option value="revoked">Revoked</option>
                        </select>

                        <select
                            value={filters.source || ''}
                            onChange={(e) => handleFilterChange('source', e.target.value)}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        >
                            <option value="">All Sources</option>
                            <option value="purchase">Direct Purchase</option>
                            <option value="plan_included">Plan Included</option>
                            <option value="admin_grant">Admin Grant</option>
                        </select>
                    </div>
                </GlassCard>

                {/* Sales Transactions Table */}
                <GlassCard className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 uppercase tracking-wider font-bold border-b border-slate-200 dark:border-slate-800">
                                <tr>
                                    <th className="py-3 px-4">ID</th>
                                    <th className="py-3 px-4">Clinic</th>
                                    <th className="py-3 px-4">Template</th>
                                    <th className="py-3 px-4">Source</th>
                                    <th className="py-3 px-4">Amount</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">First Published</th>
                                    <th className="py-3 px-4">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/70 dark:divide-slate-800">
                                {purchases.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-8 text-center text-slate-400">
                                            No template transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    purchases.data.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                                            <td className="py-3 px-4 font-mono font-bold text-slate-400">
                                                #{p.id}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-slate-900 dark:text-white">
                                                    {p.tenant?.name || p.tenant_id}
                                                </div>
                                                <div className="font-mono text-[11px] text-slate-400">
                                                    {p.tenant?.subdomain}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-slate-800 dark:text-slate-200">
                                                {p.template?.name || `Template #${p.template_id}`}
                                            </td>
                                            <td className="py-3 px-4">
                                                {p.source === 'plan_included' ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 text-[10px] font-bold uppercase">
                                                        Plan Included
                                                    </span>
                                                ) : p.source === 'admin_grant' ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 text-[10px] font-bold uppercase">
                                                        Admin Grant
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase">
                                                        Purchase
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                                                {p.price_cents > 0
                                                    ? `Rs. ${(p.price_cents / 100).toLocaleString()}`
                                                    : 'Rs. 0'}
                                            </td>
                                            <td className="py-3 px-4">
                                                {p.status === 'paid' ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase">
                                                        Active
                                                    </span>
                                                ) : p.status === 'refunded' ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase">
                                                        Refunded
                                                    </span>
                                                ) : p.status === 'revoked' ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 text-[10px] font-bold uppercase">
                                                        Revoked
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                                                        {p.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                                                {p.first_published_at ? (
                                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                                        Published ({new Date(p.first_published_at).toLocaleDateString()})
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400 italic">Never published</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-slate-500">
                                                {p.purchased_at
                                                    ? new Date(p.purchased_at).toLocaleDateString()
                                                    : '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {purchases.links && purchases.links.length > 3 && (
                        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-center gap-1">
                            {purchases.links.map((link, idx) => (
                                <Link
                                    key={idx}
                                    href={link.url || '#'}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
                                        link.active
                                            ? 'bg-primary text-white'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                    } ${!link.url ? 'opacity-40 pointer-events-none' : ''}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ))}
                        </div>
                    )}
                </GlassCard>
            </div>
        </PlatformLayout>
    );
}
