import React, { useState, useEffect, useRef } from 'react';
import { router } from '@inertiajs/react';
import { Bell, Clock, Ticket, Check, ExternalLink } from 'lucide-react';

interface NotificationItem {
    id: string;
    title: string;
    message: string;
    time: string;
    url: string;
    type: 'session' | 'token';
    tone: 'emerald' | 'primary' | 'blue';
}

export default function NotificationDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const fetchNotifications = async () => {
        try {
            const res = await fetch('/api/notifications');
            if (res.ok) {
                const data = await res.json();
                setNotifications(data.notifications || []);
                setUnreadCount(data.unread_count || 0);
            }
        } catch {
            // Ignore offline/network
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 15000); // 15s poll
        return () => clearInterval(interval);
    }, []);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleItemClick = (item: NotificationItem) => {
        setIsOpen(false);
        router.visit(item.url);
    };

    return (
        <div ref={dropdownRef} className="relative">
            <button
                type="button"
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (!isOpen) {
                        setUnreadCount(0); // Mark seen on open
                    }
                }}
                className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                aria-label="Queue Notifications"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-900 animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white">Live Queue Updates</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                                Live
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setNotifications([]);
                                setUnreadCount(0);
                            }}
                            className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 font-medium"
                        >
                            <Check className="w-3 h-3" />
                            Clear
                        </button>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-xs">
                                <Clock className="w-6 h-6 mx-auto mb-2 opacity-40 text-slate-400" />
                                No active queue alerts right now.
                            </div>
                        ) : (
                            notifications.map((item) => (
                                <div
                                    key={item.id}
                                    onClick={() => handleItemClick(item)}
                                    className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors flex items-start gap-3"
                                >
                                    <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                                        item.tone === 'emerald'
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                            : item.tone === 'primary'
                                            ? 'bg-primary/10 text-primary'
                                            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                    }`}>
                                        {item.type === 'session' ? <Clock className="w-4 h-4" /> : <Ticket className="w-4 h-4" />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-1">
                                            <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                                                {item.title}
                                            </p>
                                            <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">
                                            {item.message}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-2 border-t border-slate-200/70 dark:border-white/10 bg-slate-50/50 dark:bg-slate-800/40 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                router.visit('/sessions/today');
                            }}
                            className="w-full py-1.5 text-xs font-semibold text-primary hover:underline flex items-center justify-center gap-1"
                        >
                            View Full Queue Display
                            <ExternalLink className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
