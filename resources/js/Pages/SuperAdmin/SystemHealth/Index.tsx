import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import {
    Activity,
    Layers,
    Clock,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    RotateCcw,
    Trash2,
    Play,
    Server,
    Database,
    Cpu,
    HardDrive,
    Webhook,
    Terminal,
    Sparkles,
} from 'lucide-react';

interface FailedJobItem {
    id: number;
    uuid: string;
    connection: string;
    queue: string;
    name: string;
    full_name: string;
    clinic?: string | null;
    error: string;
    failed_at: string;
}

interface HeartbeatItem {
    command: string;
    last_started_at?: string | null;
    last_finished_at?: string | null;
    duration_ms: number;
    status: string;
    is_overdue: boolean;
}

interface Props {
    queue: {
        pending_total: number;
        pending_by_queue: Array<{ queue: string; count: number }>;
        failed_jobs: FailedJobItem[];
    };
    scheduler: {
        is_running: boolean;
        heartbeats: HeartbeatItem[];
        last_ping?: string | null;
    };
    webhooks: {
        payments_lk: { last_received?: string | null; last_success?: string | null; failures_24h: number; total_24h: number };
        whatsapp: { last_received?: string | null; last_success?: string | null; failures_24h: number; total_24h: number };
    };
    environment: {
        app_env: string;
        app_debug: boolean;
        php_version: string;
        laravel_version: string;
        git_commit: string;
        db_connection: string;
        db_size: string;
        cache_driver: string;
        queue_driver: string;
        mail_driver: string;
        storage_disks: Record<string, string>;
    };
}

export default function SystemHealthIndex({
    queue,
    scheduler,
    webhooks,
    environment,
}: Props) {
    const [runningCommand, setRunningCommand] = useState<string | null>(null);
    const [commandOutput, setCommandOutput] = useState<string | null>(null);

    const handleRunCommand = async (cmd: string) => {
        if (!confirm(`Are you sure you want to execute [${cmd}] right now?`)) return;

        setRunningCommand(cmd);
        setCommandOutput(null);

        try {
            const res = await fetch('/super-admin/system-health/run-command', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content || '',
                },
                body: JSON.stringify({ command: cmd }),
            });
            const data = await res.json();
            setCommandOutput(data.output || 'Command executed.');
        } catch {
            setCommandOutput('Error triggering command execution.');
        } finally {
            setRunningCommand(null);
        }
    };

    return (
        <PlatformLayout>
            <Head title="System Health & Queues — MedVisit Platform" />

            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
                            <Activity className="w-6 h-6 text-emerald-500" />
                            System Health & Queue Engine
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Live telemetry of asynchronous jobs, cron scheduler heartbeats, webhook gateways, and host resources.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                            scheduler.is_running
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 animate-pulse'
                        }`}>
                            <span className={`w-2 h-2 rounded-full ${scheduler.is_running ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {scheduler.is_running ? 'Cron Engine Active' : 'Scheduler Stalled'}
                        </span>
                    </div>
                </div>

                {/* Overdue Scheduler Warning Banner */}
                {!scheduler.is_running && (
                    <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-900 dark:text-rose-200 flex items-start sm:items-center justify-between gap-3 text-xs sm:text-sm">
                        <div className="flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                            <div>
                                <span className="font-bold">Scheduler not running:</span> No heartbeat ping detected in the last 10 minutes.
                                Subscription expirations and queued reminders will not trigger automatically.
                                Run <code className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono font-bold">php artisan schedule:work</code> locally.
                            </div>
                        </div>
                    </div>
                )}

                {/* Debug Mode Warning in Production */}
                {environment.app_env === 'production' && environment.app_debug && (
                    <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center gap-3 text-xs sm:text-sm">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div>
                            <strong>Security Warning:</strong> <code className="font-mono">APP_DEBUG=true</code> is currently enabled in production.
                            Detailed stack traces and secrets could be exposed on unhandled exceptions.
                        </div>
                    </div>
                )}

                {/* Safe Command Execution Console */}
                <div className="p-4 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                            <Terminal className="w-4 h-4 text-indigo-500" />
                            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Run Safe Maintenance Commands</h3>
                        </div>
                        <span className="text-[11px] text-slate-400">All command runs are logged in platform audit trail</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            type="button"
                            onClick={() => handleRunCommand('subscriptions:check-expirations')}
                            disabled={runningCommand !== null}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors"
                        >
                            <Play className="w-3.5 h-3.5 text-emerald-500" />
                            subscriptions:check-expirations
                        </button>

                        <button
                            type="button"
                            onClick={() => handleRunCommand('subscriptions:send-reminders')}
                            disabled={runningCommand !== null}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors"
                        >
                            <Play className="w-3.5 h-3.5 text-blue-500" />
                            subscriptions:send-reminders
                        </button>

                        <button
                            type="button"
                            onClick={() => handleRunCommand('announcements:process-scheduled')}
                            disabled={runningCommand !== null}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 transition-colors"
                        >
                            <Play className="w-3.5 h-3.5 text-indigo-500" />
                            announcements:process-scheduled
                        </button>
                    </div>

                    {commandOutput && (
                        <div className="mt-3 p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto max-h-40">
                            <pre className="whitespace-pre-wrap">{commandOutput}</pre>
                        </div>
                    )}
                </div>

                {/* Queue Engine Section */}
                <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 pb-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-indigo-500" />
                                <h2 className="text-base font-bold text-slate-900 dark:text-white">Async Queue Telemetry</h2>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Driver: <code className="font-mono">{environment.queue_driver}</code> · {queue.pending_total} jobs pending execution
                            </p>
                        </div>

                        {queue.failed_jobs.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => router.post('/super-admin/system-health/failed-jobs/retry-all')}
                                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center gap-1"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    Retry All Failed ({queue.failed_jobs.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => router.post('/super-admin/system-health/failed-jobs/flush-all')}
                                    className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 font-semibold text-xs transition-colors flex items-center gap-1"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Flush All
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Failed Jobs Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="py-2.5 px-3">Job Name</th>
                                    <th className="py-2.5 px-3">Queue</th>
                                    <th className="py-2.5 px-3">Clinic</th>
                                    <th className="py-2.5 px-3">Error Snippet</th>
                                    <th className="py-2.5 px-3">Failed At</th>
                                    <th className="py-2.5 px-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {queue.failed_jobs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-6 text-center text-slate-400">
                                            No failed jobs recorded. Queue worker is operating cleanly.
                                        </td>
                                    </tr>
                                ) : (
                                    queue.failed_jobs.map((job) => (
                                        <tr key={job.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                            <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white" title={job.full_name}>
                                                {job.name}
                                            </td>
                                            <td className="py-3 px-3 font-mono text-xs text-slate-500">
                                                {job.queue}
                                            </td>
                                            <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                                                {job.clinic || 'Central'}
                                            </td>
                                            <td className="py-3 px-3 text-xs text-rose-600 dark:text-rose-400 max-w-sm truncate" title={job.error}>
                                                {job.error}
                                            </td>
                                            <td className="py-3 px-3 text-xs text-slate-400">
                                                {job.failed_at}
                                            </td>
                                            <td className="py-3 px-3 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => router.post(`/super-admin/system-health/failed-jobs/${job.id}/retry`)}
                                                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600"
                                                        title="Retry Job"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => router.delete(`/super-admin/system-health/failed-jobs/${job.id}`)}
                                                        className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-rose-500"
                                                        title="Delete Job"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Scheduler Heartbeat Table */}
                <div className="rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs p-5 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 pb-4">
                        <Clock className="w-5 h-5 text-blue-500" />
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">Scheduler Heartbeat Registry</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Automated background commands monitored for stalls and overdue execution windows.
                            </p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs sm:text-sm">
                            <thead className="border-b border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                <tr>
                                    <th className="py-2.5 px-3">Command Signature</th>
                                    <th className="py-2.5 px-3">Last Finished</th>
                                    <th className="py-2.5 px-3">Duration</th>
                                    <th className="py-2.5 px-3">Status</th>
                                    <th className="py-2.5 px-3 text-right">Liveness</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {scheduler.heartbeats.map((hb) => (
                                    <tr key={hb.command} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                                        <td className="py-3 px-3 font-mono font-semibold text-slate-900 dark:text-white">
                                            {hb.command}
                                        </td>
                                        <td className="py-3 px-3 text-xs text-slate-500">
                                            {hb.last_finished_at || 'Never'}
                                        </td>
                                        <td className="py-3 px-3 font-mono text-xs">
                                            {hb.duration_ms} ms
                                        </td>
                                        <td className="py-3 px-3">
                                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> OK
                                            </span>
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            {hb.is_overdue ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                                                    Overdue
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                    Healthy
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Webhook Health & Host Environment Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Webhook Gateways */}
                    <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 pb-3">
                            <Webhook className="w-4 h-4 text-purple-500" />
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Inbound Webhook Gateways</h3>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white">Payments.lk Hosted Checkout</div>
                                    <div className="text-slate-400 mt-0.5">
                                        Last success: {webhooks.payments_lk.last_success || 'No events'}
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    webhooks.payments_lk.failures_24h > 0
                                        ? 'bg-rose-500/10 text-rose-600'
                                        : 'bg-emerald-500/10 text-emerald-600'
                                }`}>
                                    {webhooks.payments_lk.failures_24h} failures (24h)
                                </span>
                            </div>

                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-slate-900 dark:text-white">WhatsApp Cloud API Webhooks</div>
                                    <div className="text-slate-400 mt-0.5">
                                        Last event: {webhooks.whatsapp.last_received || 'No events'}
                                    </div>
                                </div>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                                    Active
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Host Environment */}
                    <div className="p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 shadow-xs space-y-3">
                        <div className="flex items-center gap-2 border-b border-slate-200/80 dark:border-white/10 pb-3">
                            <Server className="w-4 h-4 text-cyan-500" />
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Host Environment Telemetry</h3>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                <span className="text-slate-400 block text-[10px]">PHP / Laravel</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    PHP {environment.php_version} / v{environment.laravel_version}
                                </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                <span className="text-slate-400 block text-[10px]">App Environment</span>
                                <span className="font-mono font-bold uppercase text-slate-800 dark:text-slate-200">
                                    {environment.app_env}
                                </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                <span className="text-slate-400 block text-[10px]">Database Size</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {environment.db_size} ({environment.db_connection})
                                </span>
                            </div>
                            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40">
                                <span className="text-slate-400 block text-[10px]">Git Release</span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                                    {environment.git_commit}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PlatformLayout>
    );
}
