import React, { useState, useMemo } from 'react';
import { Head, router, useForm, Link } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { PageHeader } from '@/Components/UI/PageHeader';
import GlassCard from '@/Components/UI/GlassCard';
import GlassModal from '@/Components/UI/GlassModal';
import StatusBadge from '@/Components/UI/StatusBadge';
import EmptyState from '@/Components/UI/EmptyState';
import {
    UserCheck,
    Search,
    Plus,
    Download,
    Kanban,
    List,
    Phone,
    Mail,
    MapPin,
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
    Building2,
    ArrowRight,
    ExternalLink,
    Filter,
    MessageSquare,
    Sparkles,
    Trash2,
    Edit3,
    TrendingUp,
    Send,
    RotateCcw,
} from 'lucide-react';

interface TenantSummary {
    id: string;
    name: string;
    subdomain: string;
    status: string;
    plan?: string;
}

interface LeadItem {
    id: number;
    clinic_name: string;
    contact_name: string;
    phone: string;
    email?: string | null;
    city?: string | null;
    source: string;
    source_label: string;
    stage: string;
    stage_label: string;
    notes?: string | null;
    lost_reason?: string | null;
    next_follow_up_at?: string | null;
    demo_scheduled_at?: string | null;
    is_overdue: boolean;
    is_due_today: boolean;
    converted_tenant_id?: string | null;
    tenant?: TenantSummary | null;
    created_at?: string;
    created_date?: string;
    roles_tried?: string[];
    sessions_count?: number;
    role?: string | null;
}

interface LeadsProps {
    leads: Record<string, LeadItem[]> | { data: LeadItem[]; links: any[] };
    viewMode: 'kanban' | 'list';
    metrics: {
        total_leads: number;
        new_this_month: number;
        demos_booked: number;
        paying_customers: number;
        follow_ups_due: number;
        conversion_rate: number;
    };
    stages: Record<string, string>;
    sources: Record<string, string>;
    existingClinics: TenantSummary[];
    filters: {
        search: string;
        stage: string;
        source: string;
        follow_up: string;
        view: string;
    };
}

const STAGE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
    new: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500' },
    contacted: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-500/30', dot: 'bg-purple-500' },
    demo_booked: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
    demo_done: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-500/30', dot: 'bg-indigo-500' },
    trial: { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-500/30', dot: 'bg-teal-500' },
    paying: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
    lost: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/30', dot: 'bg-rose-500' },
};

export default function LeadsIndex({
    leads,
    viewMode = 'kanban',
    metrics,
    stages,
    sources,
    existingClinics,
    filters,
}: LeadsProps) {
    const [search, setSearch] = useState(filters.search || '');
    const [selectedStage, setSelectedStage] = useState(filters.stage || 'all');
    const [selectedSource, setSelectedSource] = useState(filters.source || 'all');
    const [selectedFollowUp, setSelectedFollowUp] = useState(filters.follow_up || 'all');
    const [activeView, setActiveView] = useState<'kanban' | 'list'>(viewMode);

    // Modals
    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [convertModalOpen, setConvertModalOpen] = useState(false);
    const [activeLead, setActiveLead] = useState<LeadItem | null>(null);

    // Create Lead Form
    const createForm = useForm({
        clinic_name: '',
        contact_name: '',
        phone: '',
        email: '',
        city: '',
        source: 'cold_call',
        stage: 'new',
        notes: '',
        next_follow_up_at: '',
    });

    // Edit Lead Form
    const editForm = useForm({
        clinic_name: '',
        contact_name: '',
        phone: '',
        email: '',
        city: '',
        source: 'website_form',
        stage: 'new',
        notes: '',
        next_follow_up_at: '',
        lost_reason: '',
    });

    // Convert to Clinic Form
    const convertForm = useForm({
        action_type: 'create_new' as 'create_new' | 'link_existing',
        subdomain: '',
        clinic_name: '',
        phone: '',
        plan: 'standard',
        tenant_id: '',
    });

    const handleFilterChange = (params: Record<string, string>) => {
        router.get(
            '/super-admin/leads',
            {
                search,
                stage: selectedStage,
                source: selectedSource,
                follow_up: selectedFollowUp,
                view: activeView,
                ...params,
            },
            { preserveState: true, replace: true }
        );
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleFilterChange({ search });
    };

    const handleViewSwitch = (mode: 'kanban' | 'list') => {
        setActiveView(mode);
        handleFilterChange({ view: mode });
    };

    const handleStageQuickChange = (leadId: number, newStage: string) => {
        router.patch(`/super-admin/leads/${leadId}/stage`, { stage: newStage }, { preserveScroll: true });
    };

    const openEditModal = (lead: LeadItem) => {
        setActiveLead(lead);
        editForm.setData({
            clinic_name: lead.clinic_name,
            contact_name: lead.contact_name,
            phone: lead.phone,
            email: lead.email || '',
            city: lead.city || '',
            source: lead.source,
            stage: lead.stage,
            notes: lead.notes || '',
            next_follow_up_at: lead.next_follow_up_at ? lead.next_follow_up_at.substring(0, 10) : '',
            lost_reason: lead.lost_reason || '',
        });
        setEditModalOpen(true);
    };

    const openConvertModal = (lead: LeadItem) => {
        setActiveLead(lead);
        const cleanSubdomain = lead.clinic_name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .substring(0, 30);

        convertForm.setData({
            action_type: 'create_new',
            subdomain: cleanSubdomain,
            clinic_name: lead.clinic_name,
            phone: lead.phone,
            plan: 'standard',
            tenant_id: existingClinics.length > 0 ? existingClinics[0].id : '',
        });
        setConvertModalOpen(true);
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/super-admin/leads', {
            onSuccess: () => {
                setCreateModalOpen(false);
                createForm.reset();
            },
        });
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeLead) return;
        editForm.put(`/super-admin/leads/${activeLead.id}`, {
            onSuccess: () => {
                setEditModalOpen(false);
                setActiveLead(null);
            },
        });
    };

    const handleConvertSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeLead) return;
        convertForm.post(`/super-admin/leads/${activeLead.id}/convert`, {
            onSuccess: () => {
                setConvertModalOpen(false);
                setActiveLead(null);
            },
        });
    };

    const handleDeleteLead = (lead: LeadItem) => {
        if (!confirm(`Are you sure you want to archive lead '${lead.clinic_name}'?`)) return;
        router.delete(`/super-admin/leads/${lead.id}`, { preserveScroll: true });
    };

    const [isResettingDemo, setIsResettingDemo] = useState(false);

    const handleResetDemo = () => {
        if (!confirm('Are you sure you want to reset the public sandbox demo? This will reseed Jaffna Demo Medical Centre with clean demo data immediately.')) return;
        setIsResettingDemo(true);
        router.post('/super-admin/leads/reset-demo', {}, {
            preserveScroll: true,
            onFinish: () => setIsResettingDemo(false),
        });
    };

    // Clean phone number for WhatsApp wa.me link
    const getWhatsAppLink = (phone: string) => {
        const cleaned = phone.replace(/[^0-9]/g, '');
        return `https://wa.me/${cleaned}`;
    };

    return (
        <PlatformLayout>
            <Head title="Leads & Demos CRM - MedVisit Platform" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                {/* Header */}
                <PageHeader
                    title="Leads & Demos CRM"
                    subtitle="Track inbound demo requests, sales outreach, trial progression, and clinic conversions."
                    action={
                        <div className="flex items-center gap-2.5">
                            {/* Reset Sandbox Button */}
                            <button
                                type="button"
                                onClick={handleResetDemo}
                                disabled={isResettingDemo}
                                title="Reset Jaffna Demo Medical Centre to fresh state"
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold text-xs transition disabled:opacity-50 shadow-sm"
                            >
                                <RotateCcw className={`w-3.5 h-3.5 ${isResettingDemo ? 'animate-spin' : ''}`} />
                                <span className="hidden md:inline">Reset Sandbox</span>
                            </button>

                            {/* View Mode Toggle */}
                            <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => handleViewSwitch('kanban')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        activeView === 'kanban'
                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                    }`}
                                >
                                    <Kanban className="w-3.5 h-3.5" />
                                    <span>Kanban</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleViewSwitch('list')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        activeView === 'list'
                                            ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                    }`}
                                >
                                    <List className="w-3.5 h-3.5" />
                                    <span>List</span>
                                </button>
                            </div>

                            {/* Export CSV */}
                            <a
                                href={`/super-admin/leads?export=csv&search=${encodeURIComponent(search)}&stage=${selectedStage}&source=${selectedSource}&follow_up=${selectedFollowUp}`}
                                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition"
                            >
                                <Download className="w-4 h-4 text-slate-500" />
                                <span className="hidden sm:inline">Export CSV</span>
                            </a>

                            {/* Add Lead Button */}
                            <button
                                type="button"
                                onClick={() => setCreateModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition hover:scale-[1.01]"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add Lead</span>
                            </button>
                        </div>
                    }
                />

                {/* Metrics Banner */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                    <GlassCard className="p-4">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Leads</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.total_leads}</div>
                    </GlassCard>
                    <GlassCard className="p-4 border-l-4 border-blue-500">
                        <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase">New This Month</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.new_this_month}</div>
                    </GlassCard>
                    <GlassCard className="p-4 border-l-4 border-amber-500">
                        <div className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase">Demos Booked</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.demos_booked}</div>
                    </GlassCard>
                    <GlassCard className="p-4 border-l-4 border-emerald-500">
                        <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase">Paying Clinics</div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.paying_customers}</div>
                    </GlassCard>
                    <GlassCard className={`p-4 border-l-4 ${metrics.follow_ups_due > 0 ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20' : 'border-slate-300'}`}>
                        <div className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase flex items-center gap-1">
                            {metrics.follow_ups_due > 0 && <AlertCircle className="w-3 h-3 text-rose-500" />}
                            <span>Due Follow-ups</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.follow_ups_due}</div>
                    </GlassCard>
                    <GlassCard className="p-4">
                        <div className="text-[11px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                            <TrendingUp className="w-3 h-3 text-indigo-500" />
                            <span>Conversion</span>
                        </div>
                        <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.conversion_rate}%</div>
                    </GlassCard>
                </div>

                {/* Filter Controls */}
                <GlassCard className="p-4">
                    <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                        {/* Search Input */}
                        <div className="lg:col-span-2 relative">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search clinic name, contact person, phone, city..."
                                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 dark:text-white"
                            />
                        </div>

                        {/* Stage Filter */}
                        <div>
                            <select
                                value={selectedStage}
                                onChange={(e) => {
                                    setSelectedStage(e.target.value);
                                    handleFilterChange({ stage: e.target.value });
                                }}
                                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 text-slate-900 dark:text-white"
                            >
                                <option value="all">All Stages</option>
                                {Object.entries(stages).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Source Filter */}
                        <div>
                            <select
                                value={selectedSource}
                                onChange={(e) => {
                                    setSelectedSource(e.target.value);
                                    handleFilterChange({ source: e.target.value });
                                }}
                                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 text-slate-900 dark:text-white"
                            >
                                <option value="all">All Sources</option>
                                {Object.entries(sources).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Follow up Filter */}
                        <div>
                            <select
                                value={selectedFollowUp}
                                onChange={(e) => {
                                    setSelectedFollowUp(e.target.value);
                                    handleFilterChange({ follow_up: e.target.value });
                                }}
                                className="w-full py-2 px-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/60 text-slate-900 dark:text-white"
                            >
                                <option value="all">All Follow-ups</option>
                                <option value="due_today">Due Today</option>
                                <option value="overdue">Overdue</option>
                                <option value="upcoming">Upcoming</option>
                            </select>
                        </div>
                    </form>
                </GlassCard>

                {/* View Render: Kanban or List */}
                {activeView === 'kanban' ? (
                    /* KANBAN BOARD */
                    <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
                        {Object.entries(stages).map(([stageKey, stageLabel]) => {
                            const stageColor = STAGE_COLORS[stageKey] || STAGE_COLORS.new;
                            const columnLeads: LeadItem[] = (leads as Record<string, LeadItem[]>)[stageKey] || [];

                            return (
                                <div
                                    key={stageKey}
                                    className="w-80 shrink-0 flex flex-col bg-slate-100/70 dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 min-h-[500px]"
                                >
                                    {/* Column Header */}
                                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2.5 h-2.5 rounded-full ${stageColor.dot}`} />
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                {stageLabel}
                                            </span>
                                        </div>
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${stageColor.bg} ${stageColor.text}`}>
                                            {columnLeads.length}
                                        </span>
                                    </div>

                                    {/* Column Lead Cards */}
                                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[calc(100vh-320px)] pr-1">
                                        {columnLeads.length === 0 ? (
                                            <div className="py-8 text-center text-slate-400 text-xs italic">
                                                No leads in this stage
                                            </div>
                                        ) : (
                                            columnLeads.map((lead) => (
                                                <div
                                                    key={lead.id}
                                                    className="p-3.5 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all space-y-3 group"
                                                >
                                                    {/* Card Header */}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div>
                                                            <div className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                                                                {lead.clinic_name}
                                                            </div>
                                                            <div className="text-xs text-slate-500 font-medium mt-0.5">
                                                                {lead.contact_name}
                                                            </div>
                                                        </div>

                                                        {/* Stage Quick Mover */}
                                                        <select
                                                            value={lead.stage}
                                                            onChange={(e) => handleStageQuickChange(lead.id, e.target.value)}
                                                            className="text-[10px] font-bold py-1 px-2 rounded-lg bg-slate-100 dark:bg-slate-700 border-none text-slate-600 dark:text-slate-300 cursor-pointer"
                                                        >
                                                            {Object.entries(stages).map(([k, label]) => (
                                                                <option key={k} value={k}>{label}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Contact Links & Location */}
                                                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <a
                                                                href={`tel:${lead.phone}`}
                                                                className="flex items-center gap-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 truncate font-mono text-[11px]"
                                                            >
                                                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                                                <span>{lead.phone}</span>
                                                            </a>
                                                            <a
                                                                href={getWhatsAppLink(lead.phone)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] flex items-center gap-1 hover:bg-emerald-500/25"
                                                                title="Open WhatsApp chat"
                                                            >
                                                                <MessageSquare className="w-2.5 h-2.5" />
                                                                <span>WA</span>
                                                            </a>
                                                        </div>

                                                        {lead.city && (
                                                            <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                                                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                                                <span>{lead.city}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Follow-up / Source Badges */}
                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                        {lead.source === 'public_demo_sandbox' ? (
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                                                                <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                                                                Sandbox Demo
                                                            </span>
                                                        ) : lead.source === 'guided_demo_request' ? (
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-500/30 flex items-center gap-1">
                                                                <Calendar className="w-2.5 h-2.5 text-teal-500" />
                                                                Guided Demo
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-500">
                                                                {lead.source_label}
                                                            </span>
                                                        )}

                                                        {lead.roles_tried && lead.roles_tried.length > 0 && (
                                                            <span
                                                                className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 capitalize"
                                                                title={`Roles explored: ${lead.roles_tried.join(', ')} (${lead.sessions_count || 1} logins)`}
                                                            >
                                                                {lead.roles_tried.map(r => r.replace('_', ' ')).join(', ')} ({lead.sessions_count || 1}x)
                                                            </span>
                                                        )}

                                                        {lead.next_follow_up_at && (
                                                            <span
                                                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 ${
                                                                    lead.is_overdue
                                                                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                                                        : lead.is_due_today
                                                                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                                                                        : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'
                                                                }`}
                                                            >
                                                                <Clock className="w-2.5 h-2.5" />
                                                                <span>
                                                                    {lead.is_due_today ? 'Due Today' : lead.is_overdue ? `Overdue (${lead.next_follow_up_at})` : lead.next_follow_up_at}
                                                                </span>
                                                            </span>
                                                        )}

                                                        {lead.tenant && (
                                                            <Link
                                                                href={`/super-admin/clinics/${lead.tenant.id}`}
                                                                className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-500/15 text-teal-700 dark:text-teal-300 flex items-center gap-1 hover:underline"
                                                            >
                                                                <Building2 className="w-2.5 h-2.5" />
                                                                <span>Clinic: {lead.tenant.subdomain}</span>
                                                            </Link>
                                                        )}
                                                    </div>

                                                    {/* Notes Snippet */}
                                                    {lead.notes && (
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 italic bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                                                            "{lead.notes}"
                                                        </p>
                                                    )}

                                                    {/* Card Footer Actions */}
                                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditModal(lead)}
                                                                className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                                                                title="Edit notes & details"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteLead(lead)}
                                                                className="p-1 text-slate-400 hover:text-rose-600"
                                                                title="Archive lead"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>

                                                        {!lead.converted_tenant_id && (
                                                            <button
                                                                type="button"
                                                                onClick={() => openConvertModal(lead)}
                                                                className="text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-700 flex items-center gap-1 hover:underline"
                                                            >
                                                                <span>Convert</span>
                                                                <ArrowRight className="w-3 h-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    /* LIST VIEW TABLE */
                    <GlassCard className="overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        <th className="py-3 px-4">Clinic & Contact</th>
                                        <th className="py-3 px-4">Phone / City</th>
                                        <th className="py-3 px-4">Stage</th>
                                        <th className="py-3 px-4">Source</th>
                                        <th className="py-3 px-4">Follow-up</th>
                                        <th className="py-3 px-4">Linked Clinic</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                    {((leads as any).data || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="py-12 text-center text-slate-500">
                                                No leads found matching current filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        ((leads as any).data || []).map((lead: LeadItem) => {
                                            const stageColor = STAGE_COLORS[lead.stage] || STAGE_COLORS.new;
                                            return (
                                                <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                                                    <td className="py-3.5 px-4">
                                                        <div className="font-bold text-slate-900 dark:text-white">
                                                            {lead.clinic_name}
                                                        </div>
                                                        <div className="text-slate-500 text-[11px]">
                                                            {lead.contact_name} {lead.email && `· ${lead.email}`}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-[11px]">
                                                        <div>{lead.phone}</div>
                                                        <div className="text-slate-400 font-sans text-[10px]">{lead.city || '—'}</div>
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${stageColor.bg} ${stageColor.text}`}>
                                                            {lead.stage_label}
                                                        </span>
                                                    </td>
                                                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                                                        {lead.source === 'public_demo_sandbox' ? (
                                                            <div className="space-y-1">
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30">
                                                                    <Sparkles className="w-2.5 h-2.5 text-indigo-500" />
                                                                    Sandbox Demo
                                                                </span>
                                                                {lead.roles_tried && lead.roles_tried.length > 0 && (
                                                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                                                                        {lead.roles_tried.map(r => r.replace('_', ' ')).join(', ')} ({lead.sessions_count || 1}x)
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            lead.source_label
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        {lead.next_follow_up_at ? (
                                                            <span
                                                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                                                    lead.is_overdue
                                                                        ? 'bg-rose-500/15 text-rose-600'
                                                                        : lead.is_due_today
                                                                        ? 'bg-amber-500/15 text-amber-600'
                                                                        : 'text-slate-600 dark:text-slate-400'
                                                                }`}
                                                            >
                                                                {lead.is_due_today ? 'Due Today' : lead.next_follow_up_at}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-400 text-[11px]">—</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4">
                                                        {lead.tenant ? (
                                                            <Link
                                                                href={`/super-admin/clinics/${lead.tenant.id}`}
                                                                className="text-teal-600 dark:text-teal-400 font-bold hover:underline flex items-center gap-1"
                                                            >
                                                                <span>{lead.tenant.subdomain}</span>
                                                                <ExternalLink className="w-3 h-3" />
                                                            </Link>
                                                        ) : (
                                                            <span className="text-slate-400 text-[11px]">Not linked</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {!lead.converted_tenant_id && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openConvertModal(lead)}
                                                                    className="px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold hover:bg-teal-500/20 text-[11px]"
                                                                >
                                                                    Convert
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => openEditModal(lead)}
                                                                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteLead(lead)}
                                                                className="p-1.5 text-slate-400 hover:text-rose-600"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </GlassCard>
                )}
            </div>

            {/* CREATE LEAD MODAL */}
            <GlassModal
                isOpen={createModalOpen}
                onClose={() => setCreateModalOpen(false)}
                title="Add Prospective Clinic Lead"
            >
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Clinic Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={createForm.data.clinic_name}
                                onChange={(e) => createForm.setData('clinic_name', e.target.value)}
                                placeholder="e.g. Royal Medicare Family Clinic"
                                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Contact Person *
                            </label>
                            <input
                                type="text"
                                required
                                value={createForm.data.contact_name}
                                onChange={(e) => createForm.setData('contact_name', e.target.value)}
                                placeholder="e.g. Dr. K. Perera"
                                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Phone Number (+94) *
                            </label>
                            <input
                                type="text"
                                required
                                value={createForm.data.phone}
                                onChange={(e) => createForm.setData('phone', e.target.value)}
                                placeholder="077 123 4567"
                                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Email Address
                            </label>
                            <input
                                type="email"
                                value={createForm.data.email}
                                onChange={(e) => createForm.setData('email', e.target.value)}
                                placeholder="doctor@clinic.lk"
                                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                City / Town
                            </label>
                            <input
                                type="text"
                                value={createForm.data.city}
                                onChange={(e) => createForm.setData('city', e.target.value)}
                                placeholder="e.g. Kandy, Colombo 03, Jaffna"
                                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Lead Source
                            </label>
                            <select
                                value={createForm.data.source}
                                onChange={(e) => createForm.setData('source', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                            >
                                {Object.entries(sources).map(([k, label]) => (
                                    <option key={k} value={k}>{label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Initial Stage
                            </label>
                            <select
                                value={createForm.data.stage}
                                onChange={(e) => createForm.setData('stage', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                            >
                                {Object.entries(stages).map(([k, label]) => (
                                    <option key={k} value={k}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Next Follow-up Date
                            </label>
                            <input
                                type="date"
                                value={createForm.data.next_follow_up_at}
                                onChange={(e) => createForm.setData('next_follow_up_at', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Notes / Conversation Summary
                        </label>
                        <textarea
                            rows={3}
                            value={createForm.data.notes}
                            onChange={(e) => createForm.setData('notes', e.target.value)}
                            placeholder="Current EMR used, number of doctors, pain points, features requested..."
                            className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setCreateModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createForm.processing}
                            className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md disabled:opacity-50"
                        >
                            Save Lead
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* EDIT LEAD MODAL */}
            <GlassModal
                isOpen={editModalOpen}
                onClose={() => setEditModalOpen(false)}
                title={`Edit Lead: ${activeLead?.clinic_name}`}
            >
                <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Clinic Name
                            </label>
                            <input
                                type="text"
                                required
                                value={editForm.data.clinic_name}
                                onChange={(e) => editForm.setData('clinic_name', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Contact Person
                            </label>
                            <input
                                type="text"
                                required
                                value={editForm.data.contact_name}
                                onChange={(e) => editForm.setData('contact_name', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Stage
                            </label>
                            <select
                                value={editForm.data.stage}
                                onChange={(e) => editForm.setData('stage', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                            >
                                {Object.entries(stages).map(([k, label]) => (
                                    <option key={k} value={k}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                Next Follow-up Date
                            </label>
                            <input
                                type="date"
                                value={editForm.data.next_follow_up_at}
                                onChange={(e) => editForm.setData('next_follow_up_at', e.target.value)}
                                className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                            />
                        </div>
                    </div>

                    {editForm.data.stage === 'lost' && (
                        <div>
                            <label className="block text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">
                                Reason for Loss / Disqualification
                            </label>
                            <input
                                type="text"
                                value={editForm.data.lost_reason}
                                onChange={(e) => editForm.setData('lost_reason', e.target.value)}
                                placeholder="e.g. Budget constraints, opted for another software, unresponsive..."
                                className="w-full text-xs rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/20 px-3 py-2 text-slate-900 dark:text-white"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                            Notes / Call History
                        </label>
                        <textarea
                            rows={4}
                            value={editForm.data.notes}
                            onChange={(e) => editForm.setData('notes', e.target.value)}
                            className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white font-mono"
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setEditModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={editForm.processing}
                            className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md disabled:opacity-50"
                        >
                            Update Lead
                        </button>
                    </div>
                </form>
            </GlassModal>

            {/* CONVERT TO CLINIC MODAL */}
            <GlassModal
                isOpen={convertModalOpen}
                onClose={() => setConvertModalOpen(false)}
                title={`Convert Lead to Active Clinic: ${activeLead?.clinic_name}`}
            >
                <form onSubmit={handleConvertSubmit} className="space-y-4">
                    {/* Action Type Selector */}
                    <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => convertForm.setData('action_type', 'create_new')}
                            className={`py-2 text-xs font-bold rounded-lg transition ${
                                convertForm.data.action_type === 'create_new'
                                    ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            Create Brand New Clinic
                        </button>
                        <button
                            type="button"
                            onClick={() => convertForm.setData('action_type', 'link_existing')}
                            className={`py-2 text-xs font-bold rounded-lg transition ${
                                convertForm.data.action_type === 'link_existing'
                                    ? 'bg-white dark:bg-slate-700 text-teal-600 dark:text-teal-400 shadow-sm'
                                    : 'text-slate-600 dark:text-slate-400'
                            }`}
                        >
                            Link to Existing Clinic
                        </button>
                    </div>

                    {convertForm.data.action_type === 'create_new' ? (
                        <div className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Clinic Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={convertForm.data.clinic_name}
                                    onChange={(e) => convertForm.setData('clinic_name', e.target.value)}
                                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Subdomain *
                                </label>
                                <div className="flex items-center">
                                    <input
                                        type="text"
                                        required
                                        value={convertForm.data.subdomain}
                                        onChange={(e) => convertForm.setData('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9\-]/g, ''))}
                                        className="w-full text-xs rounded-l-xl border border-r-0 border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white font-mono"
                                    />
                                    <span className="px-3 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-r-xl text-slate-500">
                                        .medvisit.lk
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={convertForm.data.phone}
                                        onChange={(e) => convertForm.setData('phone', e.target.value)}
                                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                        Initial Plan
                                    </label>
                                    <select
                                        value={convertForm.data.plan}
                                        onChange={(e) => convertForm.setData('plan', e.target.value)}
                                        className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                                    >
                                        <option value="standard">Standard (Growth)</option>
                                        <option value="pro">Pro</option>
                                        <option value="enterprise">Enterprise</option>
                                    </select>
                                </div>
                            </div>

                            <p className="text-[11px] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 p-2.5 rounded-xl border border-teal-200 dark:border-teal-800">
                                ✨ This will automatically provision a new clinic tenant with a 30-day trial and mark this lead as 'Trial Active'.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                                    Select Existing Clinic Workspace
                                </label>
                                <select
                                    value={convertForm.data.tenant_id}
                                    onChange={(e) => convertForm.setData('tenant_id', e.target.value)}
                                    className="w-full text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-900 px-3 py-2 text-slate-900 dark:text-white"
                                >
                                    <option value="">-- Choose Clinic --</option>
                                    {existingClinics.map((clinic) => (
                                        <option key={clinic.id} value={clinic.id}>
                                            {clinic.name} ({clinic.subdomain}.medvisit.lk) — {clinic.status}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <p className="text-[11px] text-slate-500">
                                Connects this lead record to the selected clinic tenant for customer history tracking.
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={() => setConvertModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 rounded-xl"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={convertForm.processing || (convertForm.data.action_type === 'link_existing' && !convertForm.data.tenant_id)}
                            className="px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl shadow-md disabled:opacity-50"
                        >
                            Confirm Conversion
                        </button>
                    </div>
                </form>
            </GlassModal>
        </PlatformLayout>
    );
}
