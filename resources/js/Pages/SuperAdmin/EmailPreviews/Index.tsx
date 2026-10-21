import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import {
    Mail,
    Monitor,
    Smartphone,
    Sun,
    Moon,
    FileText,
    Code,
    Send,
    ExternalLink,
    CheckCircle2,
    Building2,
    Shield,
    Sparkles,
    Search,
    RefreshCw,
    AlertCircle,
} from 'lucide-react';

interface TemplateItem {
    key: string;
    name: string;
    category: string;
    description: string;
    brand_mode: 'platform' | 'clinic';
}

interface Props {
    templates: TemplateItem[];
    categories: Record<string, TemplateItem[]>;
    selectedKey: string;
    selectedTemplate: TemplateItem;
    currentUserEmail: string;
    mailConfig: {
        mailer: string;
        logo_url: string | null;
        has_logo_env: boolean;
    };
}

export default function EmailPreviewsIndex({
    templates,
    categories,
    selectedKey: initialSelectedKey,
    selectedTemplate: initialTemplate,
    currentUserEmail,
    mailConfig,
}: Props) {
    const [selectedKey, setSelectedKey] = useState<string>(initialSelectedKey);
    const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
    const [colorMode, setColorMode] = useState<'light' | 'dark'>('light');
    const [formatMode, setFormatMode] = useState<'html' | 'text'>('html');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [recipientEmail, setRecipientEmail] = useState<string>(currentUserEmail);
    const [isSending, setIsSending] = useState<boolean>(false);
    const [sendSuccess, setSendSuccess] = useState<string | null>(null);

    const currentTemplate = templates.find((t) => t.key === selectedKey) || initialTemplate;

    const previewUrl = `/super-admin/email-previews/render?template=${selectedKey}&mode=${formatMode}&dark=${colorMode === 'dark' ? '1' : '0'}`;

    const filteredTemplates = templates.filter(
        (t) =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSendTest = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSending(true);
        setSendSuccess(null);

        router.post(
            '/super-admin/email-previews/send-test',
            {
                template: selectedKey,
                recipient_email: recipientEmail,
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setIsSending(false);
                    setSendSuccess(`Test email sent to ${recipientEmail}`);
                    setTimeout(() => setSendSuccess(null), 5000);
                },
                onError: () => {
                    setIsSending(false);
                },
            }
        );
    };

    return (
        <PlatformLayout>
            <Head title="Email Templates & Previews — MedVisit Platform" />

            <div className="space-y-6">
                {/* Header with Title & Stats */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                Professional SaaS Email System
                            </h1>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300">
                                {templates.length} Templates
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Live responsive renderer, device simulator, Gmail & Outlook verification, and direct test dispatcher.
                        </p>
                    </div>

                    {/* Logo & Mailer Status Chip */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>Driver: <strong>{mailConfig.mailer.toUpperCase()}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {mailConfig.has_logo_env ? (
                                <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Logo: Hosted PNG</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                                    <span>Logo: Text Wordmark Fallback</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Split Layout: Left Sidebar List / Right Live Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    {/* Left: Template Selector (4 cols) */}
                    <div className="lg:col-span-4 space-y-4">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search 24+ email templates..."
                                className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all shadow-sm"
                            />
                        </div>

                        {/* Templates List */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-700/60 max-h-[calc(100vh-220px)] overflow-y-auto">
                            {filteredTemplates.length === 0 ? (
                                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                                    No templates matching "{searchQuery}"
                                </div>
                            ) : (
                                filteredTemplates.map((template) => {
                                    const isSelected = template.key === selectedKey;
                                    return (
                                        <button
                                            key={template.key}
                                            onClick={() => setSelectedKey(template.key)}
                                            className={`w-full text-left p-3.5 transition-all flex items-start gap-3 ${
                                                isSelected
                                                    ? 'bg-primary-50/80 dark:bg-primary-950/40 border-l-4 border-primary-600'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/40'
                                            }`}
                                        >
                                            <div
                                                className={`mt-0.5 p-2 rounded-lg shrink-0 ${
                                                    template.brand_mode === 'clinic'
                                                        ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                                                        : 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                                                }`}
                                            >
                                                {template.brand_mode === 'clinic' ? (
                                                    <Building2 className="w-4 h-4" />
                                                ) : (
                                                    <Mail className="w-4 h-4" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                        {template.category}
                                                    </span>
                                                    <span
                                                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                                            template.brand_mode === 'clinic'
                                                                ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                                                                : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                                        }`}
                                                    >
                                                        {template.brand_mode === 'clinic' ? 'Clinic Brand' : 'Platform'}
                                                    </span>
                                                </div>
                                                <div
                                                    className={`text-sm font-semibold truncate ${
                                                        isSelected
                                                            ? 'text-primary-900 dark:text-primary-200'
                                                            : 'text-slate-800 dark:text-slate-200'
                                                    }`}
                                                >
                                                    {template.name}
                                                </div>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                                                    {template.description}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right: Controls & Interactive Preview (8 cols) */}
                    <div className="lg:col-span-8 space-y-4">
                        {/* Control Toolbar */}
                        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
                            {/* Selected Info */}
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                        {currentTemplate.name}
                                    </h2>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                            currentTemplate.brand_mode === 'clinic'
                                                ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                                                : 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300'
                                        }`}
                                    >
                                        {currentTemplate.brand_mode === 'clinic'
                                            ? 'Patient-Facing (Clinic Branding)'
                                            : 'MedVisit Platform Brand'}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {currentTemplate.description}
                                </p>
                            </div>

                            {/* Toggles */}
                            <div className="flex items-center gap-2 flex-wrap">
                                {/* HTML vs Plain Text Toggle */}
                                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-900">
                                    <button
                                        onClick={() => setFormatMode('html')}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                                            formatMode === 'html'
                                                ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <Code className="w-3.5 h-3.5" />
                                        HTML
                                    </button>
                                    <button
                                        onClick={() => setFormatMode('text')}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                                            formatMode === 'text'
                                                ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        Plain Text
                                    </button>
                                </div>

                                {/* Width Toggle (Desktop 600px vs Mobile 375px) */}
                                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-900">
                                    <button
                                        onClick={() => setViewMode('desktop')}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                                            viewMode === 'desktop'
                                                ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                        title="Desktop 600px Preview"
                                    >
                                        <Monitor className="w-3.5 h-3.5" />
                                        Desktop (600px)
                                    </button>
                                    <button
                                        onClick={() => setViewMode('mobile')}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                                            viewMode === 'mobile'
                                                ? 'bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 shadow-sm'
                                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                        }`}
                                        title="Mobile 375px Preview"
                                    >
                                        <Smartphone className="w-3.5 h-3.5" />
                                        Mobile (375px)
                                    </button>
                                </div>

                                {/* Light vs Dark Mode Simulation */}
                                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-900">
                                    <button
                                        onClick={() => setColorMode('light')}
                                        className={`p-1 rounded-md transition-all ${
                                            colorMode === 'light'
                                                ? 'bg-white dark:bg-slate-800 text-amber-500 shadow-sm'
                                                : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                        title="Simulate Light Mode"
                                    >
                                        <Sun className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => setColorMode('dark')}
                                        className={`p-1 rounded-md transition-all ${
                                            colorMode === 'dark'
                                                ? 'bg-white dark:bg-slate-800 text-indigo-400 shadow-sm'
                                                : 'text-slate-400 hover:text-slate-600'
                                        }`}
                                        title="Simulate Inverted Dark Mode"
                                    >
                                        <Moon className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* External Tab */}
                                <a
                                    href={previewUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                                    title="Open raw preview in new tab"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>

                        {/* "Send Test to Me" Bar */}
                        <form
                            onSubmit={handleSendTest}
                            className="bg-primary-50/70 dark:bg-primary-950/30 rounded-xl border border-primary-200 dark:border-primary-800/60 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3"
                        >
                            <div className="flex items-center gap-2.5 text-xs text-primary-950 dark:text-primary-200 font-medium">
                                <Send className="w-4 h-4 text-primary-600 dark:text-primary-400 shrink-0" />
                                <span>Send sample email with realistic mock data:</span>
                            </div>

                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <input
                                    type="email"
                                    required
                                    value={recipientEmail}
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                    placeholder="your-email@example.com"
                                    className="px-3 py-1.5 text-xs rounded-lg border border-primary-300 dark:border-primary-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 w-full sm:w-60"
                                />
                                <button
                                    type="submit"
                                    disabled={isSending}
                                    className="px-3.5 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium text-xs shadow-sm transition-all flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
                                >
                                    {isSending ? (
                                        <>
                                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-3.5 h-3.5" />
                                            Send Test
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        {sendSuccess && (
                            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>{sendSuccess}</span>
                            </div>
                        )}

                        {/* Interactive Preview Canvas */}
                        <div
                            className={`rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-inner flex justify-center transition-colors ${
                                colorMode === 'dark' ? 'bg-slate-950' : 'bg-slate-100/90'
                            }`}
                        >
                            <div
                                style={{
                                    width: viewMode === 'desktop' ? '640px' : '390px',
                                    maxWidth: '100%',
                                    transition: 'width 0.25s ease',
                                }}
                                className="bg-white rounded-xl shadow-xl overflow-hidden border border-slate-300 dark:border-slate-800"
                            >
                                {/* Browser Mock Window Top */}
                                <div className="bg-slate-200 dark:bg-slate-800 px-4 py-2 border-b border-slate-300 dark:border-slate-700 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                                        {formatMode === 'text' ? 'plain_text_preview.txt' : `${selectedKey}.eml`}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                        {viewMode === 'desktop' ? '600px' : '375px'}
                                    </div>
                                </div>

                                {/* Iframe Content */}
                                <iframe
                                    key={`${selectedKey}-${formatMode}-${colorMode}`}
                                    src={previewUrl}
                                    title={currentTemplate.name}
                                    className="w-full h-[680px] border-0 bg-transparent block"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PlatformLayout>
    );
}
