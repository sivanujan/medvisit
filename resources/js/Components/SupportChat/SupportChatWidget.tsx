import React, { useEffect, useRef, useState, useCallback } from 'react';
import { usePage } from '@inertiajs/react';
import axios from 'axios';
import {
    MessageSquare,
    X,
    Send,
    Loader2,
    Star,
    Sparkles,
    Check,
    CheckCheck,
    Clock,
    User as UserIcon,
    AlertCircle,
    Minus,
} from 'lucide-react';
import { getEcho } from '@/echo';
import type {
    SupportMessageItem,
    SupportConversationItem,
    SupportStatusResponse,
} from '@/types/support';

declare global {
    interface Window {
        turnstile?: {
            render: (
                container: string | HTMLElement,
                options: {
                    sitekey: string;
                    callback?: (token: string) => void;
                    'error-callback'?: () => void;
                    theme?: 'light' | 'dark' | 'auto';
                }
            ) => string;
            reset: (widgetId?: string) => void;
        };
    }
}

/**
 * Safely format message body with auto-linked URLs
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
                    className="underline text-sky-200 hover:text-white dark:text-sky-400 break-all"
                >
                    {part}
                </a>
            );
        }
        return <span key={i}>{part}</span>;
    });
}

export default function SupportChatWidget() {
    const { props, url } = usePage<any>();
    const user = props.auth?.user;
    const tenant = props.tenant;
    const turnstileSiteKey =
        props.turnstileSiteKey ||
        import.meta.env.VITE_TURNSTILE_SITE_KEY ||
        '1x00000000000000000000AA';

    // Disallow widget on super-admin pages, central auth pages, tenant login, and checkout
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : url;
    const isExcluded =
        currentPath.startsWith('/super-admin') ||
        currentPath.startsWith('/admin') ||
        currentPath === '/login' ||
        currentPath === '/register' ||
        currentPath.startsWith('/forgot-password') ||
        currentPath.startsWith('/reset-password') ||
        currentPath.includes('/checkout');

    if (isExcluded) {
        return null;
    }

    const [isOpen, setIsOpen] = useState(false);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const [statusData, setStatusData] = useState<SupportStatusResponse | null>(null);

    // Active conversation state
    const [conversation, setConversation] = useState<SupportConversationItem | null>(null);
    const [messages, setMessages] = useState<SupportMessageItem[]>([]);
    const [visitorToken, setVisitorToken] = useState<string>(() => {
        return (typeof localStorage !== 'undefined' && localStorage.getItem('medvisit_support_token')) || '';
    });

    // Form inputs for new chat
    const [guestName, setGuestName] = useState(user?.name || '');
    const [guestEmail, setGuestEmail] = useState(user?.email || '');
    const [guestPhone, setGuestPhone] = useState('');
    const [initialMessage, setInitialMessage] = useState('');
    const [turnstileToken, setTurnstileToken] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Active chat inputs
    const [replyText, setReplyText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isOtherTyping, setIsOtherTyping] = useState(false);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Post-chat rating state
    const [showRatingModal, setShowRatingModal] = useState(false);
    const [ratingStars, setRatingStars] = useState(5);
    const [ratingComment, setRatingComment] = useState('');
    const [ratingSubmitted, setRatingSubmitted] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const turnstileContainerRef = useRef<HTMLDivElement>(null);
    const turnstileWidgetIdRef = useRef<string | null>(null);

    // Auto-scroll to bottom of messages
    const scrollToBottom = useCallback(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, []);

    useEffect(() => {
        if (isOpen && conversation) {
            scrollToBottom();
        }
    }, [messages, isOpen, conversation, scrollToBottom]);

    // Fetch initial status and existing active conversation
    const fetchStatus = useCallback(async () => {
        try {
            const savedPublicId = localStorage.getItem('medvisit_support_conv_id');
            const res = await axios.get('/support/status', {
                params: { conversation_id: savedPublicId },
            });
            setStatusData(res.data);

            if (res.data.active_conversation?.public_id) {
                loadConversation(res.data.active_conversation.public_id);
            }
        } catch (e) {
            console.warn('[SupportChat] Could not load support status:', e);
        } finally {
            setIsLoadingStatus(false);
        }
    }, [visitorToken]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    // Load active conversation details & messages
    const loadConversation = async (publicId: string) => {
        try {
            const res = await axios.get(`/support/conversations/${publicId}`, {
                params: { visitor_token: visitorToken },
                headers: visitorToken ? { 'X-Visitor-Token': visitorToken } : {},
            });
            setConversation(res.data.conversation);
            setMessages(res.data.messages || []);
            localStorage.setItem('medvisit_support_conv_id', publicId);
        } catch (e: any) {
            if (e.response?.status === 403 || e.response?.status === 404) {
                localStorage.removeItem('medvisit_support_conv_id');
                setConversation(null);
                setMessages([]);
            }
        }
    };

    // Load Turnstile Script for guest verification
    useEffect(() => {
        if (isOpen && !conversation && !user && !window.turnstile) {
            const script = document.createElement('script');
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);

            script.onload = () => {
                renderTurnstile();
            };
        } else if (isOpen && !conversation && !user && window.turnstile) {
            renderTurnstile();
        }
    }, [isOpen, conversation, user]);

    const renderTurnstile = () => {
        if (!window.turnstile || !turnstileContainerRef.current) return;
        if (turnstileWidgetIdRef.current) return; // already rendered

        try {
            const id = window.turnstile.render(turnstileContainerRef.current, {
                sitekey: turnstileSiteKey,
                callback: (token: string) => {
                    setTurnstileToken(token);
                    setErrorMessage(null);
                },
                'error-callback': () => {
                    // In test environment, fallback gracefully
                    setTurnstileToken('test-token');
                },
                theme: 'auto',
            });
            turnstileWidgetIdRef.current = id;
        } catch (e) {
            console.warn('[Turnstile] render error:', e);
        }
    };

    // Setup Echo real-time listener for current conversation
    useEffect(() => {
        if (!conversation?.public_id) return;

        const echo = getEcho({
            visitorToken: visitorToken,
            key: props.reverb?.key,
            host: props.reverb?.host,
            port: props.reverb?.port,
            scheme: props.reverb?.scheme,
        });

        if (!echo) return;

        const channel = echo.private(`support.conversation.${conversation.public_id}`);

        channel.listen('.SupportMessageSent', (event: any) => {
            if (event.message) {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === event.message.id)) return prev;
                    return [...prev, event.message];
                });
            }
            if (event.conversation) {
                setConversation(event.conversation);
            }
        });

        channel.listen('.SupportStatusChanged', (event: any) => {
            if (event.conversation) {
                setConversation(event.conversation);
                if (event.conversation.status === 'closed') {
                    setShowRatingModal(true);
                }
            }
        });

        channel.listen('.SupportTyping', (event: any) => {
            if (event.sender_type === 'admin' || event.sender_type === 'ai') {
                setIsOtherTyping(true);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = setTimeout(() => {
                    setIsOtherTyping(false);
                }, 3000);
            }
        });

        channel.listen('.SupportConversationRead', (event: any) => {
            if (event.reader_type === 'admin') {
                setMessages((prev) =>
                    prev.map((m) =>
                        m.sender_type === 'user' || m.sender_type === 'visitor'
                            ? { ...m, read_at: m.read_at || new Date().toISOString() }
                            : m
                    )
                );
            }
        });

        // 5-second polling fallback
        const pollInterval = setInterval(() => {
            if (conversation?.public_id && isOpen) {
                axios
                    .get(`/support/conversations/${conversation.public_id}`, {
                        params: { visitor_token: visitorToken },
                    })
                    .then((res) => {
                        if (res.data.messages) {
                            setMessages(res.data.messages);
                        }
                        if (res.data.conversation) {
                            setConversation(res.data.conversation);
                            if (res.data.conversation.status === 'closed' && !conversation.closed_at) {
                                setShowRatingModal(true);
                            }
                        }
                    })
                    .catch(() => {});
            }
        }, 5000);

        return () => {
            clearInterval(pollInterval);
            channel.stopListening('.SupportMessageSent');
            channel.stopListening('.SupportStatusChanged');
            channel.stopListening('.SupportTyping');
            channel.stopListening('.SupportConversationRead');
        };
    }, [conversation?.public_id, visitorToken, isOpen]);

    // Handle starting new chat
    const handleStartChat = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        if (!user) {
            if (!guestName.trim() || !guestEmail.trim()) {
                setErrorMessage('Please provide your name and email.');
                return;
            }
        }

        if (!initialMessage.trim()) {
            setErrorMessage('Please enter your question or message.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload: any = {
                message: initialMessage.trim(),
            };

            if (!user) {
                payload.name = guestName.trim();
                payload.email = guestEmail.trim();
                payload.phone = guestPhone.trim() || null;
                payload.turnstile_token = turnstileToken || 'test-token';
            }

            const res = await axios.post('/support/conversations', payload);

            if (res.data.visitor_token) {
                setVisitorToken(res.data.visitor_token);
                localStorage.setItem('medvisit_support_token', res.data.visitor_token);
            }

            setConversation(res.data.conversation);
            setMessages(res.data.messages || []);
            localStorage.setItem('medvisit_support_conv_id', res.data.conversation.public_id);
            setInitialMessage('');
        } catch (err: any) {
            const msg =
                err.response?.data?.error ||
                err.response?.data?.message ||
                'Could not start conversation. Please try again.';
            setErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle sending a reply in active chat
    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!replyText.trim() || !conversation?.public_id || isSending) return;

        const body = replyText.trim();
        setReplyText('');
        setIsSending(true);
        setErrorMessage(null);

        try {
            const res = await axios.post(
                `/support/conversations/${conversation.public_id}/messages`,
                {
                    message: body,
                    visitor_token: visitorToken,
                },
                {
                    headers: visitorToken ? { 'X-Visitor-Token': visitorToken } : {},
                }
            );

            if (res.data.message) {
                setMessages((prev) => {
                    if (prev.some((m) => m.id === res.data.message.id)) return prev;
                    return [...prev, res.data.message];
                });
            }
            if (res.data.conversation) {
                setConversation(res.data.conversation);
            }
        } catch (err: any) {
            const msg =
                err.response?.data?.error ||
                err.response?.data?.message ||
                'Failed to send message. Please retry.';
            setErrorMessage(msg);
            setReplyText(body); // restore unsent text
        } finally {
            setIsSending(false);
        }
    };

    // Send typing broadcast
    const handleTyping = () => {
        if (!conversation?.public_id) return;
        axios
            .post(`/support/conversations/${conversation.public_id}/typing`, {
                visitor_token: visitorToken,
            })
            .catch(() => {});
    };

    // Close conversation and show rating
    const handleCloseConversation = async () => {
        if (!conversation?.public_id) return;
        try {
            await axios.post(`/support/conversations/${conversation.public_id}/close`, {
                visitor_token: visitorToken,
            });
            setShowRatingModal(true);
        } catch (e) {
            console.warn('Could not close conversation', e);
        }
    };

    // Submit rating feedback
    const handleSubmitRating = async () => {
        if (!conversation?.public_id) return;
        try {
            await axios.post(`/support/conversations/${conversation.public_id}/close`, {
                visitor_token: visitorToken,
                rating: ratingStars,
                rating_comment: ratingComment.trim() || null,
            });
            setRatingSubmitted(true);
            setTimeout(() => {
                setShowRatingModal(false);
                setConversation(null);
                setMessages([]);
                localStorage.removeItem('medvisit_support_conv_id');
                setRatingSubmitted(false);
            }, 2000);
        } catch (e) {
            setShowRatingModal(false);
            setConversation(null);
            setMessages([]);
            localStorage.removeItem('medvisit_support_conv_id');
        }
    };

    const isOnline = statusData?.is_online ?? true;

    return (
        <aside aria-label="Live Support" className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 font-sans pointer-events-auto">
            {/* Minimized Launcher Button: compact icon bubble, expands label on hover only */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="group relative flex items-center justify-center h-12 w-12 hover:w-auto hover:px-4 rounded-full bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] text-white shadow-lg shadow-[#1E6FD9]/25 hover:shadow-xl hover:shadow-[#1E6FD9]/35 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-4 focus:ring-teal-400/30 overflow-hidden cursor-pointer"
                    aria-label="Open MedVisit Support Chat"
                >
                    <div className="relative shrink-0 flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-white group-hover:scale-105 transition-transform" />
                        <span
                            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                                isOnline ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                        />
                    </div>
                    <div className="max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 group-hover:ml-2.5 transition-all duration-300 overflow-hidden whitespace-nowrap text-left hidden sm:block">
                        <div className="text-xs font-bold leading-tight">Need help?</div>
                        <div className="text-[10px] text-teal-100 font-medium">
                            {isOnline ? 'Online' : 'Leave a message'}
                        </div>
                    </div>
                </button>
            )}

            {/* Chat Box (Desktop Floating Window / Mobile Fullscreen) */}
            {isOpen && (
                <div
                    className="fixed sm:static inset-0 sm:inset-auto sm:w-[410px] sm:h-[620px] w-full h-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-none sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                    role="dialog"
                    aria-label="Support Chat"
                >
                    {/* Header */}
                    <div className="px-5 py-4 bg-gradient-to-r from-[#1E6FD9] via-[#167abf] to-[#0E9E8F] text-white flex items-center justify-between shadow-md">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center font-bold text-white shadow-sm">
                                <Sparkles className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                                    MedVisit Support
                                </h3>
                                <div className="flex items-center gap-1.5 text-xs text-teal-100">
                                    <span
                                        className={`w-2 h-2 rounded-full ${
                                            isOnline ? 'bg-emerald-300 animate-pulse' : 'bg-amber-300'
                                        }`}
                                    />
                                    <span>
                                        {isOnline
                                            ? statusData?.response_time_text || 'Active now'
                                            : 'Outside Business Hours'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            {conversation && !conversation.closed_at && (
                                <button
                                    onClick={handleCloseConversation}
                                    title="End conversation"
                                    className="px-2.5 py-1 text-xs rounded-lg bg-white/15 hover:bg-white/25 text-white transition-colors"
                                >
                                    End Chat
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition-colors"
                                aria-label="Close Chat"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Offline Alert notice if not online */}
                    {!isOnline && (
                        <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                            <Clock className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                            <span>
                                {statusData?.offline_message ||
                                    'We are currently offline. Leave your message and we will respond promptly!'}
                            </span>
                        </div>
                    )}

                    {/* Body Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/60 dark:bg-slate-950/40">
                        {isLoadingStatus ? (
                            <div className="h-full flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-[#1E6FD9] animate-spin" />
                            </div>
                        ) : !conversation ? (
                            /* Pre-chat Form */
                            <form onSubmit={handleStartChat} className="space-y-3.5 py-2">
                                <div className="text-center pb-1">
                                    <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                                        How can we help today?
                                    </h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        Ask our team anything about MedVisit queues, pricing, or setup.
                                    </p>
                                </div>

                                {errorMessage && (
                                    <div className="p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 shrink-0" />
                                        <span>{errorMessage}</span>
                                    </div>
                                )}

                                {!user && (
                                    <>
                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Your Name *
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={guestName}
                                                onChange={(e) => setGuestName(e.target.value)}
                                                placeholder="e.g. Dr. Silva or Nimal Perera"
                                                className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Email Address *
                                            </label>
                                            <input
                                                type="email"
                                                required
                                                value={guestEmail}
                                                onChange={(e) => setGuestEmail(e.target.value)}
                                                placeholder="name@example.com"
                                                className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Phone Number <span className="text-slate-400">(Optional)</span>
                                            </label>
                                            <input
                                                type="tel"
                                                value={guestPhone}
                                                onChange={(e) => setGuestPhone(e.target.value)}
                                                placeholder="077 123 4567"
                                                className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9]"
                                            />
                                        </div>
                                    </>
                                )}

                                {user && (
                                    <div className="p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/40 rounded-lg text-xs text-teal-800 dark:text-teal-300">
                                        Signed in as <strong>{user.name}</strong> ({tenant?.name || 'Clinic Staff'})
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                        Message *
                                    </label>
                                    <textarea
                                        required
                                        rows={3}
                                        value={initialMessage}
                                        onChange={(e) => setInitialMessage(e.target.value)}
                                        placeholder="Describe what you need assistance with..."
                                        className="w-full text-sm px-3.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9] resize-none"
                                    />
                                </div>

                                {!user && (
                                    <div className="pt-1 flex flex-col items-center">
                                        <div ref={turnstileContainerRef} id="cf-turnstile-container" />
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-2.5 px-4 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] hover:opacity-95 shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Starting chat...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            <span>Start Chat</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        ) : (
                            /* Active Message Thread */
                            <div className="space-y-3">
                                {messages.map((m) => {
                                    const isMe = m.sender_type === 'visitor' || m.sender_type === 'user';
                                    const isAi = m.sender_type === 'ai';
                                    const isAdmin = m.sender_type === 'admin';

                                    return (
                                        <div
                                            key={m.id}
                                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                        >
                                            <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px] text-slate-400">
                                                {!isMe && (
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                        {isAi ? 'MedVisit Assistant' : m.sender_name || 'Support Agent'}
                                                    </span>
                                                )}
                                                <span>
                                                    {new Date(m.created_at).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                    })}
                                                </span>
                                            </div>

                                            <div
                                                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                                    isMe
                                                        ? 'bg-[#1E6FD9] text-white rounded-tr-xs'
                                                        : isAi
                                                        ? 'bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800/60 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                                                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                                                }`}
                                            >
                                                {renderMessageContent(m.body)}
                                            </div>

                                            {isMe && (
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

                                {isOtherTyping && (
                                    <div className="flex items-center gap-2 text-xs text-slate-400 italic py-1">
                                        <div className="flex gap-1 items-center px-3 py-2 bg-slate-200/60 dark:bg-slate-800 rounded-full">
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                                            <span
                                                className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                                                style={{ animationDelay: '150ms' }}
                                            />
                                            <span
                                                className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                                                style={{ animationDelay: '300ms' }}
                                            />
                                        </div>
                                        <span>Support is typing...</span>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Active Chat Input Footer */}
                    {conversation && !conversation.closed_at && (
                        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                            {errorMessage && (
                                <div className="mb-2 p-2 text-xs rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-300">
                                    {errorMessage}
                                </div>
                            )}
                            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                                <textarea
                                    value={replyText}
                                    onChange={(e) => {
                                        setReplyText(e.target.value);
                                        handleTyping();
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                    placeholder="Type your message..."
                                    rows={1}
                                    className="flex-1 text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1E6FD9] resize-none max-h-24"
                                />
                                <button
                                    type="submit"
                                    disabled={!replyText.trim() || isSending}
                                    className="p-2.5 rounded-xl bg-gradient-to-r from-[#1E6FD9] to-[#0E9E8F] text-white shadow hover:opacity-95 transition-opacity disabled:opacity-40"
                                    aria-label="Send message"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Conversation Closed / Rating View */}
                    {(conversation?.closed_at || showRatingModal) && (
                        <div className="p-5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center space-y-3">
                            {ratingSubmitted ? (
                                <div className="py-4 space-y-2">
                                    <div className="w-10 h-10 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                        <Check className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                                        Thank you for your feedback!
                                    </h4>
                                    <p className="text-xs text-slate-500">Your rating helps us improve.</p>
                                </div>
                            ) : (
                                <>
                                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                        This chat has ended. How was your experience?
                                    </h4>
                                    <div className="flex justify-center gap-2 py-1">
                                        {[1, 2, 3, 4, 5].map((star) => (
                                            <button
                                                key={star}
                                                type="button"
                                                onClick={() => setRatingStars(star)}
                                                className="p-1 hover:scale-125 transition-transform"
                                                aria-label={`Rate ${star} stars`}
                                            >
                                                <Star
                                                    className={`w-6 h-6 ${
                                                        star <= ratingStars
                                                            ? 'fill-amber-400 text-amber-400'
                                                            : 'text-slate-300 dark:text-slate-600'
                                                    }`}
                                                />
                                            </button>
                                        ))}
                                    </div>
                                    <textarea
                                        rows={2}
                                        value={ratingComment}
                                        onChange={(e) => setRatingComment(e.target.value)}
                                        placeholder="Any comments? (Optional)"
                                        className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleSubmitRating}
                                            className="flex-1 py-2 rounded-lg text-xs font-medium text-white bg-[#1E6FD9] hover:bg-[#165bb3]"
                                        >
                                            Submit Rating
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowRatingModal(false);
                                                setConversation(null);
                                                setMessages([]);
                                                localStorage.removeItem('medvisit_support_conv_id');
                                            }}
                                            className="px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                                        >
                                            New Chat
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
}
