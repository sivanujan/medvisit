import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    Search,
    MessageSquare,
    Clock,
    User,
    Building2,
    Sparkles,
    Send,
    Check,
    CheckCheck,
    CheckCircle2,
    X,
    ExternalLink,
    AlertCircle,
    Settings,
    BookOpen,
    Plus,
    Trash2,
    Edit2,
    ChevronRight,
    Bot,
    Phone,
    Mail,
    Globe,
    Calendar,
    DollarSign,
    ShieldCheck,
    Loader2,
} from 'lucide-react';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { getEcho } from '@/echo';
import type {
    SupportConversationItem,
    SupportMessageItem,
    SupportCannedReplyItem,
    ConversationContext,
    ConversationStatus,
} from '@/types/support';

interface PageProps {
    conversations: SupportConversationItem[];
    activeConversation?: SupportConversationItem | null;
    activeMessages: SupportMessageItem[];
    activeContext?: ConversationContext | null;
    cannedReplies: SupportCannedReplyItem[];
    counts: {
        waiting: number;
        ai: number;
        mine: number;
        closed: number;
        all: number;
    };
    filters: {
        filter: string;
        search: string;
        selectedPublicId?: string | null;
    };
    supportSettings: {
        business_hours_days: string[];
        business_hours_start: string;
        business_hours_end: string;
        timezone: string;
        offline_message: string;
        response_time_text: string;
    };
    reverb?: {
        key: string;
        host: string;
        port: number;
        scheme: string;
    };
}

/**
 * Safely auto-link URLs in plain text messages
 */
function renderMessageContent(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
        if (part.match(urlRegex)) {
            return (
                <a
                    key={i}
                    href={part}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-sky-500 hover:text-sky-600 dark:text-sky-400 break-all"
                >
                    {part}
                </a>
            );
        }
        return <span key={i}>{part}</span>;
    });
}

function formatElapsed(seconds?: number | null): string {
    if (seconds == null || seconds < 0) return '';
    if (seconds < 60) return `${Math.floor(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h ${mins % 60}m`;
}

export default function SupportInbox({
    conversations,
    activeConversation,
    activeMessages: initialMessages,
    activeContext,
    cannedReplies: initialCannedReplies,
    counts,
    filters,
    supportSettings,
    reverb,
}: PageProps) {
    const { auth } = usePage<any>().props;
    const currentAdmin = auth?.user;

    const [filter, setFilter] = useState(filters.filter || 'waiting');
    const [search, setSearch] = useState(filters.search || '');
    const [messages, setMessages] = useState<SupportMessageItem[]>(initialMessages || []);
    const [activeConv, setActiveConv] = useState<SupportConversationItem | null>(activeConversation || null);
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isClientTyping, setIsClientTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Canned replies slash picker
    const [cannedReplies, setCannedReplies] = useState<SupportCannedReplyItem[]>(initialCannedReplies || []);
    const [showCannedPicker, setShowCannedPicker] = useState(false);
    const [cannedQuery, setCannedQuery] = useState('');
    const [cannedModalOpen, setCannedModalOpen] = useState(false);
    const [editingCanned, setEditingCanned] = useState<SupportCannedReplyItem | null>(null);
    const [cannedForm, setCannedForm] = useState({ title: '', body: '' });

    // Settings Modal
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [settingsForm, setSettingsForm] = useState({ ...supportSettings });
    const [isSavingSettings, setIsSavingSettings] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMessages(initialMessages || []);
        setActiveConv(activeConversation || null);
    }, [initialMessages, activeConversation]);

    // Scroll to bottom when messages update
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    // Connect to Echo for the Support Inbox global channel & active conversation channel
    useEffect(() => {
        const echo = getEcho({
            key: reverb?.key,
            host: reverb?.host,
            port: reverb?.port,
            scheme: reverb?.scheme,
        });

        if (!echo) return;

        // 1. Inbox channel for new conversations / updates
        const inboxChannel = echo.private('support.inbox');
        inboxChannel.listen('.SupportMessageSent', (event: any) => {
            // Refresh conversation list without full reload
            router.reload({ only: ['conversations', 'counts'] });
        });

        // 2. Active conversation channel
        let convChannel: any = null;
        if (activeConv?.public_id) {
            convChannel = echo.private(`support.conversation.${activeConv.public_id}`);

            convChannel.listen('.SupportMessageSent', (event: any) => {
                if (event.message) {
                    setMessages((prev) => {
                        if (prev.some((m) => m.id === event.message.id)) return prev;
                        return [...prev, event.message];
                    });
                }
                if (event.conversation) {
                    setActiveConv(event.conversation);
                }
            });

            convChannel.listen('.SupportStatusChanged', (event: any) => {
                if (event.conversation) {
                    setActiveConv(event.conversation);
                    router.reload({ only: ['conversations', 'counts'] });
                }
            });

            convChannel.listen('.SupportTyping', (event: any) => {
                if (event.sender_type === 'visitor' || event.sender_type === 'user') {
                    setIsClientTyping(true);
                    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                        setIsClientTyping(false);
                    }, 3000);
                }
            });
        }

        // 5-second polling fallback if active
        const pollInterval = setInterval(() => {
            if (activeConv?.public_id) {
                axios
                    .get(`/support/conversations/${activeConv.public_id}`)
                    .then((res) => {
                        if (res.data.messages) setMessages(res.data.messages);
                        if (res.data.conversation) setActiveConv(res.data.conversation);
                    })
                    .catch(() => {});
            }
        }, 5000);

        return () => {
            clearInterval(pollInterval);
            inboxChannel.stopListening('.SupportMessageSent');
            if (convChannel) {
                convChannel.stopListening('.SupportMessageSent');
                convChannel.stopListening('.SupportStatusChanged');
                convChannel.stopListening('.SupportTyping');
            }
        };
    }, [activeConv?.public_id]);

    // Handle filter & search navigation
    const applyFilters = (newFilter: string, newSearch: string) => {
        router.get(
            '/super-admin/support',
            {
                filter: newFilter,
                search: newSearch,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    const handleSelectConversation = (conv: SupportConversationItem) => {
        router.get(
            '/super-admin/support',
            {
                filter,
                search,
                conversation: conv.public_id,
            },
            {
                preserveState: true,
                preserveScroll: true,
            }
        );
    };

    // Actions
    const handleTakeOver = () => {
        if (!activeConv?.public_id) return;
        router.post(
            `/super-admin/support/conversations/${activeConv.public_id}/take-over`,
            {},
            { preserveScroll: true }
        );
    };

    const handleReturnToAi = () => {
        if (!activeConv?.public_id) return;
        router.post(
            `/super-admin/support/conversations/${activeConv.public_id}/return-ai`,
            {},
            { preserveScroll: true }
        );
    };

    const handleClose = () => {
        if (!activeConv?.public_id) return;
        router.post(
            `/super-admin/support/conversations/${activeConv.public_id}/close`,
            {},
            { preserveScroll: true }
        );
    };

    // Sending Reply
    const handleSendReply = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!replyText.trim() || !activeConv?.public_id || isSending) return;

        const body = replyText.trim();
        setReplyText('');
        setShowCannedPicker(false);
        setIsSending(true);

        try {
            await axios.post(`/super-admin/support/conversations/${activeConv.public_id}/reply`, {
                message: body,
            });
            // Emit typing stopped
        } catch (e) {
            console.error('Failed to send reply', e);
            setReplyText(body);
        } finally {
            setIsSending(false);
        }
    };

    const handleReplyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setReplyText(text);

        // Slash command detection for canned replies
        if (text.startsWith('/')) {
            setShowCannedPicker(true);
            setCannedQuery(text.slice(1).toLowerCase());
        } else {
            setShowCannedPicker(false);
        }

        // Send admin typing broadcast
        if (activeConv?.public_id) {
            axios.post(`/support/conversations/${activeConv.public_id}/typing`).catch(() => {});
        }
    };

    const insertCannedReply = (reply: SupportCannedReplyItem) => {
        setReplyText(reply.body);
        setShowCannedPicker(false);
    };

    // Save Settings
    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingSettings(true);
        try {
            await axios.post('/super-admin/support/settings', settingsForm);
            setSettingsModalOpen(false);
            router.reload();
        } catch (e) {
            alert('Failed to save support settings.');
        } finally {
            setIsSavingSettings(false);
        }
    };

    // Canned Replies CRUD
    const handleSaveCannedReply = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCanned) {
                const res = await axios.put(`/super-admin/support/canned-replies/${editingCanned.id}`, cannedForm);
                setCannedReplies((prev) => prev.map((c) => (c.id === editingCanned.id ? res.data.reply : c)));
            } else {
                const res = await axios.post('/super-admin/support/canned-replies', cannedForm);
                setCannedReplies((prev) => [...prev, res.data.reply]);
            }
            setEditingCanned(null);
            setCannedForm({ title: '', body: '' });
        } catch (e) {
            alert('Failed to save canned reply.');
        }
    };

    const handleDeleteCannedReply = async (id: number) => {
        if (!confirm('Are you sure you want to delete this canned reply?')) return;
        try {
            await axios.delete(`/super-admin/support/canned-replies/${id}`);
            setCannedReplies((prev) => prev.filter((c) => c.id !== id));
        } catch (e) {
            alert('Failed to delete canned reply.');
        }
    };

    const filteredCannedReplies = cannedReplies.filter(
        (c) => c.title.toLowerCase().includes(cannedQuery) || c.body.toLowerCase().includes(cannedQuery)
    );

    return (
        <PlatformLayout>
            <Head title="Support Inbox - MedVisit Console" />

            {/* Container taking full available height */}
            <div className="h-[calc(100vh-5rem)] flex flex-col -m-4 sm:-m-6 lg:-m-8">
                {/* Top Control Bar */}
                <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E6FD9] to-[#0E9E8F] flex items-center justify-center text-white shadow-sm">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                                Support Inbox
                            </h1>
                            <p className="text-xs text-slate-500">
                                Live visitor enquiries & clinic support chat
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCannedModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
                        >
                            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                            <span>Canned Replies</span>
                        </button>

                        <button
                            onClick={() => setSettingsModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-xs transition"
                        >
                            <Settings className="w-3.5 h-3.5 text-slate-500" />
                            <span>Hours & Messages</span>
                        </button>
                    </div>
                </div>

                {/* 3-Column Workspace */}
                <div className="flex-1 flex overflow-hidden">
                    {/* COLUMN 1: Filter & Conversation List */}
                    <div className="w-80 md:w-96 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
                        {/* Filter Tabs */}
                        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
                            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400">
                                <button
                                    onClick={() => {
                                        setFilter('waiting');
                                        applyFilters('waiting', search);
                                    }}
                                    className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                                        filter === 'waiting'
                                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                                            : 'hover:text-slate-900'
                                    }`}
                                >
                                    <span>Waiting</span>
                                    {counts.waiting > 0 && (
                                        <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-[#FF7A59] text-white font-bold animate-pulse">
                                            {counts.waiting}
                                        </span>
                                    )}
                                </button>

                                <button
                                    onClick={() => {
                                        setFilter('mine');
                                        applyFilters('mine', search);
                                    }}
                                    className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                                        filter === 'mine'
                                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                                            : 'hover:text-slate-900'
                                    }`}
                                >
                                    <span>Mine</span>
                                    {counts.mine > 0 && (
                                        <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-primary text-white font-bold">
                                            {counts.mine}
                                        </span>
                                    )}
                                </button>

                                <button
                                    onClick={() => {
                                        setFilter('ai');
                                        applyFilters('ai', search);
                                    }}
                                    className={`py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition ${
                                        filter === 'ai'
                                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                                            : 'hover:text-slate-900'
                                    }`}
                                >
                                    <span>AI</span>
                                    <span className="text-[10px] opacity-75">{counts.ai}</span>
                                </button>
                            </div>

                            <div className="flex gap-2 text-xs text-slate-500 px-1">
                                <button
                                    onClick={() => {
                                        setFilter('closed');
                                        applyFilters('closed', search);
                                    }}
                                    className={`hover:underline ${filter === 'closed' ? 'font-bold text-slate-900 dark:text-white' : ''}`}
                                >
                                    Closed ({counts.closed})
                                </button>
                                <span>&bull;</span>
                                <button
                                    onClick={() => {
                                        setFilter('all');
                                        applyFilters('all', search);
                                    }}
                                    className={`hover:underline ${filter === 'all' ? 'font-bold text-slate-900 dark:text-white' : ''}`}
                                >
                                    All ({counts.all})
                                </button>
                            </div>

                            {/* Search Box */}
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        applyFilters(filter, e.target.value);
                                    }}
                                    placeholder="Search by name, email, clinic..."
                                    className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                            {conversations.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    No conversations found in this view.
                                </div>
                            ) : (
                                conversations.map((conv) => {
                                    const isSelected = activeConv?.public_id === conv.public_id;
                                    const isWaiting = conv.status === 'waiting_human';

                                    return (
                                        <div
                                            key={conv.public_id}
                                            onClick={() => handleSelectConversation(conv)}
                                            className={`p-3.5 cursor-pointer transition flex items-start gap-3 relative ${
                                                isSelected
                                                    ? 'bg-primary-50/70 dark:bg-primary-950/30 border-l-4 border-[#1E6FD9]'
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                            }`}
                                        >
                                            <div className="relative shrink-0">
                                                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-200">
                                                    {(conv.visitor_name || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <span
                                                    className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                                                        conv.status === 'waiting_human'
                                                            ? 'bg-[#FF7A59]'
                                                            : conv.status === 'human_active'
                                                            ? 'bg-emerald-500'
                                                            : conv.status === 'ai'
                                                            ? 'bg-teal-500'
                                                            : 'bg-slate-400'
                                                    }`}
                                                />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <span className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                                        {conv.visitor_name || 'Guest Visitor'}
                                                    </span>
                                                    {conv.waiting_seconds != null && isWaiting ? (
                                                        <span className="text-[10px] font-bold text-[#FF7A59] bg-[#FF7A59]/10 px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            {formatElapsed(conv.waiting_seconds)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 shrink-0">
                                                            {conv.last_message_at
                                                                ? new Date(conv.last_message_at).toLocaleTimeString([], {
                                                                      hour: '2-digit',
                                                                      minute: '2-digit',
                                                                  })
                                                                : ''}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                                                    {conv.clinic_name ? (
                                                        <span className="text-primary font-medium truncate">
                                                            {conv.clinic_name}
                                                        </span>
                                                    ) : (
                                                        <span className="text-slate-400">Website</span>
                                                    )}
                                                    {conv.assigned_admin_name && (
                                                        <>
                                                            <span>&bull;</span>
                                                            <span className="truncate">
                                                                {conv.assigned_admin_name}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                <p className="text-xs text-slate-600 dark:text-slate-400 truncate mt-1">
                                                    {conv.last_message?.body || 'No messages yet'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* COLUMN 2: Active Chat Conversation */}
                    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden">
                        {activeConv ? (
                            <>
                                {/* Active Header */}
                                <div className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                                                {activeConv.visitor_name || 'Guest Visitor'}
                                            </h2>
                                            <span
                                                className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                                                    activeConv.status === 'waiting_human'
                                                        ? 'bg-[#FF7A59]/15 text-[#FF7A59]'
                                                        : activeConv.status === 'human_active'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                                        : activeConv.status === 'ai'
                                                        ? 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300'
                                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                }`}
                                            >
                                                {activeConv.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {activeConv.visitor_email || 'No email'} &bull; Channel:{' '}
                                            {activeConv.channel}
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2">
                                        {activeConv.status !== 'human_active' && (
                                            <button
                                                onClick={handleTakeOver}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1E6FD9] hover:bg-[#165bb3] text-white shadow-xs transition"
                                            >
                                                Take Over
                                            </button>
                                        )}

                                        {activeConv.status === 'human_active' && (
                                            <button
                                                onClick={handleReturnToAi}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-teal-300 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition flex items-center gap-1"
                                            >
                                                <Bot className="w-3.5 h-3.5" />
                                                <span>Return to AI</span>
                                            </button>
                                        )}

                                        {activeConv.status !== 'closed' && (
                                            <button
                                                onClick={handleClose}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                            >
                                                Close Ticket
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Messages Stream */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                                    {messages.map((m) => {
                                        const isAdmin = m.sender_type === 'admin';
                                        const isAi = m.sender_type === 'ai';
                                        const isVisitor = m.sender_type === 'visitor' || m.sender_type === 'user';

                                        return (
                                            <div
                                                key={m.id}
                                                className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                                            >
                                                <div className="flex items-center gap-2 mb-1 px-1 text-[11px] text-slate-400">
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                        {m.sender_name || (isAdmin ? 'You (Support)' : 'Visitor')}
                                                    </span>
                                                    <span>
                                                        {new Date(m.created_at).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                </div>

                                                <div
                                                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-xs ${
                                                        isAdmin
                                                            ? 'bg-[#1E6FD9] text-white rounded-tr-xs'
                                                            : isAi
                                                            ? 'bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                                                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-tl-xs'
                                                    }`}
                                                >
                                                    {renderMessageContent(m.body)}
                                                </div>

                                                {isAdmin && (
                                                    <div className="flex items-center gap-1 mt-0.5 px-1 text-[10px] text-slate-400">
                                                        {m.read_at ? (
                                                            <span className="flex items-center gap-0.5 text-teal-600 dark:text-teal-400">
                                                                <CheckCheck className="w-3.5 h-3.5" /> Read
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center gap-0.5">
                                                                <Check className="w-3.5 h-3.5" /> Sent
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    {isClientTyping && (
                                        <div className="flex items-center gap-2 text-xs text-slate-400 italic py-1">
                                            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
                                            <span>User is typing...</span>
                                        </div>
                                    )}

                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Reply Composer with Canned Replies Picker */}
                                <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 relative">
                                    {/* Canned Picker Dropdown */}
                                    {showCannedPicker && (
                                        <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-2 max-h-56 overflow-y-auto z-20">
                                            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
                                                Canned Replies (type to filter)
                                            </div>
                                            {filteredCannedReplies.length === 0 ? (
                                                <div className="p-2 text-xs text-slate-400">No matching replies</div>
                                            ) : (
                                                filteredCannedReplies.map((c) => (
                                                    <button
                                                        key={c.id}
                                                        type="button"
                                                        onClick={() => insertCannedReply(c)}
                                                        className="w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-primary-50 dark:hover:bg-slate-700/60 transition group"
                                                    >
                                                        <div className="font-semibold text-slate-900 dark:text-white group-hover:text-primary">
                                                            {c.title}
                                                        </div>
                                                        <div className="text-slate-500 dark:text-slate-400 truncate text-[11px]">
                                                            {c.body}
                                                        </div>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    <form onSubmit={handleSendReply} className="space-y-2">
                                        <div className="relative">
                                            <textarea
                                                value={replyText}
                                                onChange={handleReplyChange}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendReply();
                                                    }
                                                }}
                                                placeholder="Type your reply here... (Press '/' for canned responses, Enter to send)"
                                                rows={3}
                                                className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCannedPicker(!showCannedPicker)}
                                                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
                                                >
                                                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                                                    <span>Insert Canned (/)</span>
                                                </button>
                                            </div>

                                            <button
                                                type="submit"
                                                disabled={!replyText.trim() || isSending}
                                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] text-white text-xs font-semibold shadow hover:opacity-95 transition disabled:opacity-40 flex items-center gap-1.5"
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                                <span>Send Reply</span>
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                <MessageSquare className="w-12 h-12 stroke-[1.2] mb-3 text-slate-300 dark:text-slate-700" />
                                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    No Conversation Selected
                                </h3>
                                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                    Select a ticket from the left panel to review messages and reply.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* COLUMN 3: Context Panel */}
                    <div className="w-72 lg:w-80 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 overflow-y-auto shrink-0 space-y-6">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                User Context
                            </h3>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {activeContext?.type === 'clinic' ? 'Clinic Account' : 'Website Lead'}
                            </span>
                        </div>

                        {activeContext?.type === 'clinic' ? (
                            /* Clinic User Context */
                            <div className="space-y-4 text-xs">
                                <div>
                                    <div className="text-slate-400 text-[11px] font-medium">Clinic Name</div>
                                    <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5 flex items-center justify-between">
                                        <span>{activeContext.clinic_name}</span>
                                        <a
                                            href={activeContext.subdomain_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:underline flex items-center gap-0.5 text-xs font-normal"
                                        >
                                            <span>Visit</span>
                                            <ExternalLink className="w-3 h-3" />
                                        </a>
                                    </div>
                                    <div className="text-slate-500 font-mono text-[11px]">
                                        {activeContext.subdomain}.medvisit.lk
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                        <div className="text-slate-400 text-[10px]">Plan</div>
                                        <div className="font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                                            {activeContext.plan}
                                        </div>
                                    </div>

                                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                                        <div className="text-slate-400 text-[10px]">Status</div>
                                        <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 uppercase tracking-wide">
                                            {activeContext.status}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                        <span className="flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-slate-400" /> Member Since
                                        </span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {activeContext.created_date}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                        <span className="flex items-center gap-1.5">
                                            <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Last Payment
                                        </span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {activeContext.last_payment_date}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                                        <span>Payment Amount</span>
                                        <span className="font-medium text-slate-900 dark:text-white">
                                            {activeContext.last_payment_amount}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <div className="text-[11px] font-semibold text-slate-400">Staff User</div>
                                    <div className="font-semibold text-slate-900 dark:text-white">
                                        {activeContext.user_name} ({activeContext.user_role})
                                    </div>
                                    <div className="text-slate-500">{activeContext.user_email}</div>
                                    <div className="text-slate-500">{activeContext.user_phone}</div>
                                </div>

                                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                                    <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>
                                        HIPAA & PHI isolation active. Patient medical records are strictly separated.
                                    </span>
                                </div>
                            </div>
                        ) : activeContext?.type === 'guest' ? (
                            /* Guest Context */
                            <div className="space-y-4 text-xs">
                                <div>
                                    <div className="text-slate-400 text-[11px] font-medium">Visitor Name</div>
                                    <div className="font-bold text-sm text-slate-900 dark:text-white mt-0.5">
                                        {activeContext.visitor_name}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{activeContext.visitor_email}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                                        <span>{activeContext.visitor_phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Colombo Time: {activeContext.colombo_time}</span>
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                                    <div className="text-[11px] font-medium text-slate-400">Referral Page</div>
                                    <div className="text-slate-600 dark:text-slate-300 font-mono text-[11px] break-all">
                                        {activeContext.started_page}
                                    </div>
                                </div>

                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                                    <div className="text-[11px] font-medium text-slate-400">Browser / Client</div>
                                    <div className="text-slate-500 text-[11px] truncate">
                                        {activeContext.user_agent}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-xs text-slate-400">No context available</div>
                        )}

                        {/* Customer Rating if available */}
                        {activeConv?.rating && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl space-y-1">
                                <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 flex items-center justify-between">
                                    <span>Customer Rating</span>
                                    <span>{activeConv.rating} / 5</span>
                                </div>
                                <div className="text-xs text-slate-600 dark:text-slate-300 italic">
                                    "{activeConv.rating_comment || 'No comment provided'}"
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* MODAL 1: Canned Replies Management */}
            {cannedModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Manage Canned Replies
                            </h3>
                            <button
                                onClick={() => {
                                    setCannedModalOpen(false);
                                    setEditingCanned(null);
                                }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Create / Edit Form */}
                        <form onSubmit={handleSaveCannedReply} className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                                {editingCanned ? 'Edit Canned Reply' : 'Add New Canned Reply'}
                            </div>
                            <input
                                type="text"
                                required
                                value={cannedForm.title}
                                onChange={(e) => setCannedForm({ ...cannedForm, title: e.target.value })}
                                placeholder="Shortcut Title (e.g. Greeting, Pricing Inquiry)"
                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                            <textarea
                                required
                                rows={3}
                                value={cannedForm.body}
                                onChange={(e) => setCannedForm({ ...cannedForm, body: e.target.value })}
                                placeholder="Reply body text..."
                                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                            />
                            <div className="flex justify-end gap-2">
                                {editingCanned && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingCanned(null);
                                            setCannedForm({ title: '', body: '' });
                                        }}
                                        className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    type="submit"
                                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary-600 shadow-xs"
                                >
                                    {editingCanned ? 'Update Reply' : 'Add Reply'}
                                </button>
                            </div>
                        </form>

                        {/* Existing list */}
                        <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                            {cannedReplies.map((c) => (
                                <div key={c.id} className="py-2.5 flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                                            {c.title}
                                        </div>
                                        <div className="text-xs text-slate-500 truncate mt-0.5">
                                            {c.body}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => {
                                                setEditingCanned(c);
                                                setCannedForm({ title: c.title, body: c.body });
                                            }}
                                            className="p-1 text-slate-400 hover:text-slate-600"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCannedReply(c.id)}
                                            className="p-1 text-rose-400 hover:text-rose-600"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: Business Hours & Settings */}
            {settingsModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
                    <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                Support Hours & Automation
                            </h3>
                            <button
                                onClick={() => setSettingsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                                        Daily Start Time
                                    </label>
                                    <input
                                        type="time"
                                        value={settingsForm.business_hours_start}
                                        onChange={(e) =>
                                            setSettingsForm({ ...settingsForm, business_hours_start: e.target.value })
                                        }
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                                        Daily End Time
                                    </label>
                                    <input
                                        type="time"
                                        value={settingsForm.business_hours_end}
                                        onChange={(e) =>
                                            setSettingsForm({ ...settingsForm, business_hours_end: e.target.value })
                                        }
                                        className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                                    Response Time Text (Shown to users)
                                </label>
                                <input
                                    type="text"
                                    value={settingsForm.response_time_text}
                                    onChange={(e) =>
                                        setSettingsForm({ ...settingsForm, response_time_text: e.target.value })
                                    }
                                    placeholder="e.g. Usually replies in a few minutes"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                                    Offline Banner Message
                                </label>
                                <textarea
                                    rows={2}
                                    value={settingsForm.offline_message}
                                    onChange={(e) =>
                                        setSettingsForm({ ...settingsForm, offline_message: e.target.value })
                                    }
                                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setSettingsModalOpen(false)}
                                    className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingSettings}
                                    className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-600 shadow-xs flex items-center gap-1.5"
                                >
                                    {isSavingSettings && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Save Settings</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PlatformLayout>
    );
}
