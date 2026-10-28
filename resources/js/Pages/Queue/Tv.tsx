import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import {
    Volume2,
    VolumeX,
    Clock,
    Stethoscope,
    Users,
    Building2,
    Activity,
    CheckCircle2,
    Calendar,
    Phone,
    Radio,
    Sparkles,
    Shield,
    Wifi,
    WifiOff,
    Maximize2,
    AlertCircle,
    ArrowRight,
    RefreshCw,
    Pause,
    Tv,
} from 'lucide-react';
import axios from 'axios';

interface SessionCardData {
    id: number;
    doctor_id: number;
    doctor_name: string;
    doctor_specialty: string;
    doctor_photo_url: string | null;
    doctor_color: string;
    room_number: string;
    status: 'scheduled' | 'in_progress' | 'paused' | 'completed' | string;
    status_message: string | null;
    start_time: string;
    end_time: string;
    current_token_number: number | null;
    current_token_display?: string | null;
    doctor_token_code?: string;
    now_serving: {
        id: number;
        token_number: number;
        token_display?: string;
        doctor_token_code?: string;
        patient_name: string | null;
        status: string;
        called_at: number | null;
        room_number: string;
        doctor_name: string;
        doctor_specialty: string;
        doctor_color: string;
    } | null;
    next_in_line: Array<{
        id: number;
        token_number: number;
        token_display?: string;
        doctor_token_code?: string;
        patient_name: string | null;
        status: string;
        estimated_time: string;
    }>;
    waiting_count: number;
    waiting_text: string;
    completed_count: number;
    estimated_wait_minutes: number;
}

interface TvData {
    layoutMode: 'hero' | 'grid' | 'board' | 'idle';
    liveSessions: SessionCardData[];
    upcomingSessions: SessionCardData[];
    endedSessions: SessionCardData[];
    allSessions: SessionCardData[];
    primarySession: SessionCardData | null;
    nowServing: SessionCardData['now_serving'];
    nextInLine: SessionCardData['next_in_line'];
    waitingCount: number;
    waitingText: string;
    completedCount: number;
    settings: {
        name_display_mode: 'token_only' | 'initial_last' | 'first_only' | 'full_name';
        languages: ('en' | 'ta' | 'si')[];
        chime_enabled: boolean;
        voice_language: 'off' | 'en' | 'ta' | 'si';
        ticker_text: string;
        theme: 'dark' | 'light';
        reduced_motion: boolean;
    };
    currentTime: string;
    currentDate: string;
    timestamp: number;
}

interface ClinicInfo {
    name: string;
    subdomain: string;
    logo_url?: string;
    phone?: string;
    address?: string;
    opening_hours?: string;
}

interface Props {
    isPaired: boolean;
    isStaff?: boolean;
    deviceName?: string | null;
    tvData: TvData | null;
    clinic: ClinicInfo;
    prefillCode?: string;
}

export default function QueueTv({
    isPaired: initialIsPaired,
    isStaff = false,
    deviceName = null,
    tvData: initialTvData,
    clinic,
    prefillCode = '',
}: Props) {
    const [isPaired, setIsPaired] = useState<boolean>(initialIsPaired);
    const [tvData, setTvData] = useState<TvData | null>(initialTvData);

    // Kiosk Splash State (sound unlock, wakeLock, fullscreen)
    const [kioskStarted, setKioskStarted] = useState<boolean>(isStaff || false);

    // Pairing Screen State
    const [pairingCode, setPairingCode] = useState<string>(prefillCode);
    const [pairingLoading, setPairingLoading] = useState<boolean>(false);
    const [pairingError, setPairingError] = useState<string | null>(null);

    // Calling Overlay & Audio
    const [callingOverlay, setCallingOverlay] = useState<{
        token_number: number;
        token_display?: string;
        doctor_token_code?: string;
        room_number: string;
        doctor_name: string;
        patient_name?: string | null;
        doctor_color?: string;
    } | null>(null);
    const [recentlyCalledSessionId, setRecentlyCalledSessionId] = useState<number | null>(null);

    // Track last seen token to trigger call animations
    const lastCalledTokenKeyRef = useRef<string | null>(null);

    // Connection Status
    const [connectionStatus, setConnectionStatus] = useState<'live' | 'reconnecting' | 'offline'>('live');
    const [lastUpdatedSecondsAgo, setLastUpdatedSecondsAgo] = useState<number>(0);
    const lastSuccessfulUpdateRef = useRef<number>(Date.now());

    // Auto-rotation for 5+ sessions
    const [boardPageIndex, setBoardPageIndex] = useState<number>(0);

    // Live Clock
    const [clockStr, setClockStr] = useState<string>('');

    // Idle mouse cursor hiding (3s)
    const [cursorVisible, setCursorVisible] = useState<boolean>(true);
    const cursorTimeoutRef = useRef<any>(null);

    // Dynamic settings shortcuts
    const settings = tvData?.settings || {
        name_display_mode: 'token_only',
        languages: ['en', 'ta', 'si'],
        chime_enabled: true,
        voice_language: 'off',
        ticker_text: 'Please keep your token slip ready. Keep the waiting area quiet and comfortable for all patients.',
        theme: 'dark',
        reduced_motion: false,
    };

    const isDark = settings.theme === 'dark';
    const showEn = settings.languages.includes('en');
    const showTa = settings.languages.includes('ta');
    const showSi = settings.languages.includes('si');

    // 1. Live Clock in Asia/Colombo
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setClockStr(
                now.toLocaleTimeString('en-US', {
                    timeZone: 'Asia/Colombo',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                })
            );
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    // 2. Cursor Auto-Hide after 3s idle
    useEffect(() => {
        const handleMouseMove = () => {
            setCursorVisible(true);
            if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
            cursorTimeoutRef.current = setTimeout(() => {
                setCursorVisible(false);
            }, 3000);
        };

        window.addEventListener('mousemove', handleMouseMove);
        cursorTimeoutRef.current = setTimeout(() => setCursorVisible(false), 3000);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
        };
    }, []);

    // 3. Daily 3:00 AM Auto-Reload (Clears memory leaks on 24/7 TV boxes)
    useEffect(() => {
        const now = new Date();
        const nextReload = new Date();
        nextReload.setHours(3, 0, 0, 0);
        if (now.getTime() >= nextReload.getTime()) {
            nextReload.setDate(nextReload.getDate() + 1);
        }
        const msUntilReload = nextReload.getTime() - now.getTime();
        const timer = setTimeout(() => {
            window.location.reload();
        }, msUntilReload);

        return () => clearTimeout(timer);
    }, []);

    // 4. Last updated seconds counter
    useEffect(() => {
        const timer = setInterval(() => {
            const secs = Math.floor((Date.now() - lastSuccessfulUpdateRef.current) / 1000);
            setLastUpdatedSecondsAgo(secs);
            if (secs > 20) {
                setConnectionStatus('offline');
            } else if (secs > 8) {
                setConnectionStatus('reconnecting');
            } else {
                setConnectionStatus('live');
            }
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // 5. Synthesize Soft Hospital Chime
    const playChime = () => {
        if (!settings.chime_enabled) return;
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();
            const now = ctx.currentTime;

            // Tone 1: C5 (523.25 Hz)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, now);
            gain1.gain.setValueAtTime(0.28, now);
            gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.7);

            // Tone 2: G5 (783.99 Hz) after 0.22s
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(783.99, now + 0.22);
            gain2.gain.setValueAtTime(0.32, now + 0.22);
            gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.22);
            osc2.stop(now + 1.4);
        } catch (e) {
            console.warn('Audio chime playback failed:', e);
        }
    };

    // 6. Web Speech Synthesis Announcement
    const playSpeechAnnouncement = (tokenNum: number | string, roomStr: string) => {
        if (!settings.voice_language || settings.voice_language === 'off') return;
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        try {
            window.speechSynthesis.cancel();
            const cleanTokenVoice = typeof tokenNum === 'string' ? tokenNum.replace('-', ' ') : tokenNum;
            let text = `Token ${cleanTokenVoice}, please proceed to ${roomStr}`;
            let langCode = 'en-US';

            if (settings.voice_language === 'ta') {
                text = `டோக்கன் எண் ${cleanTokenVoice}, ${roomStr}`;
                langCode = 'ta-LK';
            } else if (settings.voice_language === 'si') {
                text = `ටෝකන් අංක ${cleanTokenVoice}, ${roomStr}`;
                langCode = 'si-LK';
            }

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = langCode;
            utterance.rate = 0.95;
            utterance.pitch = 1.0;

            const voices = window.speechSynthesis.getVoices();
            const matchVoice = voices.find((v) => v.lang.startsWith(settings.voice_language) || v.lang.startsWith(langCode));
            if (matchVoice) {
                utterance.voice = matchVoice;
            }

            // Delay speech slightly so chime plays first
            setTimeout(() => {
                window.speechSynthesis.speak(utterance);
            }, 600);
        } catch (err) {
            console.warn('Speech synthesis skipped:', err);
        }
    };

    // 7. Trigger Calling Overlay
    const triggerCallingAnimation = (
        tokenNumber: number,
        roomNumber: string,
        doctorName: string,
        patientName?: string | null,
        doctorColor?: string,
        sessionId?: number,
        tokenDisplay?: string,
        doctorTokenCode?: string
    ) => {
        setCallingOverlay({
            token_number: tokenNumber,
            token_display: tokenDisplay,
            doctor_token_code: doctorTokenCode,
            room_number: roomNumber,
            doctor_name: doctorName,
            patient_name: patientName,
            doctor_color: doctorColor || '#1E6FD9',
        });

        if (sessionId) {
            setRecentlyCalledSessionId(sessionId);
            setTimeout(() => setRecentlyCalledSessionId(null), 10000);
        }

        playChime();
        playSpeechAnnouncement(tokenDisplay || tokenNumber, roomNumber);

        // Hide overlay after 5 seconds
        setTimeout(() => {
            setCallingOverlay(null);
        }, 5000);
    };

    // Allow external dispatch (e.g. from tests or browser automation)
    useEffect(() => {
        const handleCallingEvent = (e: any) => {
            if (e?.detail) {
                triggerCallingAnimation(
                    e.detail.tokenNumber || 1,
                    e.detail.roomNumber || 'Room 2',
                    e.detail.doctorName || 'Dr. Sivanujan Thanarasan',
                    e.detail.patientName || 'Kavitha S.',
                    e.detail.doctorColor || '#1E6FD9',
                    e.detail.sessionId,
                    e.detail.tokenDisplay || 'SV-01',
                    e.detail.doctorTokenCode || 'SV'
                );
            }
        };
        window.addEventListener('trigger-tv-calling-animation', handleCallingEvent);
        return () => window.removeEventListener('trigger-tv-calling-animation', handleCallingEvent);
    }, []);

    // 8. Polling & Sync Mechanism
    const refreshData = async () => {
        if (!isPaired && !isStaff) return;
        try {
            const res = await axios.get('/queue/tv/data');
            if (res.data) {
                const newData: TvData = res.data;
                setTvData(newData);
                lastSuccessfulUpdateRef.current = Date.now();
                setConnectionStatus('live');

                // Inspect each active session to see if any token changed
                const live = newData.liveSessions || [];
                for (const sess of live) {
                    if (sess.now_serving) {
                        const key = `${sess.id}_${sess.now_serving.token_number}_${sess.now_serving.called_at}`;
                        if (lastCalledTokenKeyRef.current !== null && lastCalledTokenKeyRef.current !== key) {
                            // Token changed or recalled
                            triggerCallingAnimation(
                                sess.now_serving.token_number,
                                sess.now_serving.room_number,
                                sess.now_serving.doctor_name,
                                sess.now_serving.patient_name,
                                sess.now_serving.doctor_color,
                                sess.id,
                                sess.now_serving.token_display,
                                sess.doctor_token_code
                            );
                        }
                        lastCalledTokenKeyRef.current = key;
                        break;
                    }
                }
            }
        } catch (err: any) {
            if (err.response?.status === 401) {
                // Device token revoked! Drop immediately back to pairing screen
                setIsPaired(false);
                setTvData(null);
            } else {
                setConnectionStatus('reconnecting');
            }
        }
    };

    // BroadcastChannel sync & Polling interval
    useEffect(() => {
        if (!isPaired && !isStaff) return;

        let channel: BroadcastChannel | null = null;
        try {
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                channel = new BroadcastChannel('medvisit_queue_sync');
                // Heartbeat to let Today.tsx know TV is connected
                const sendHeartbeat = () => {
                    channel?.postMessage({ type: 'TV_HEARTBEAT', timestamp: Date.now() });
                };
                sendHeartbeat();
                const hbInterval = setInterval(sendHeartbeat, 3000);

                channel.onmessage = (event) => {
                    if (event.data?.type === 'CALL_TOKEN' || event.data?.type === 'QUEUE_UPDATED') {
                        refreshData();
                    }
                };

                return () => {
                    clearInterval(hbInterval);
                    channel?.close();
                };
            }
        } catch (e) {
            console.warn('BroadcastChannel initialization:', e);
        }
    }, [isPaired, isStaff]);

    useEffect(() => {
        if (!isPaired && !isStaff) return;

        const pollTimer = setInterval(() => {
            refreshData();
        }, 5000);

        return () => clearInterval(pollTimer);
    }, [isPaired, isStaff]);

    // 9. Auto-rotation for 5+ sessions (every 10s)
    useEffect(() => {
        if (!tvData || tvData.layoutMode !== 'board') return;
        const totalSessions = tvData.liveSessions?.length || 0;
        if (totalSessions <= 5) return;

        const pagesCount = Math.ceil(totalSessions / 5);
        const rotationTimer = setInterval(() => {
            setBoardPageIndex((prev) => (prev + 1) % pagesCount);
        }, 10000);

        return () => clearInterval(rotationTimer);
    }, [tvData?.layoutMode, tvData?.liveSessions]);

    // 10. Start Kiosk Display handler (enables wakeLock, sound, fullscreen)
    const handleStartDisplay = async () => {
        setKioskStarted(true);

        // Screen Wake Lock API
        try {
            if ('wakeLock' in navigator) {
                await (navigator as any).wakeLock.request('screen');
            }
        } catch (err) {
            console.warn('Wake Lock request:', err);
        }

        // Fullscreen
        try {
            if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            }
        } catch (err) {
            console.warn('Fullscreen request:', err);
        }

        // Play initial test chime
        playChime();
    };

    // 11. TV Pairing Form submission
    const handlePairSubmit = async (codeToSubmit?: string) => {
        const targetCode = (codeToSubmit || pairingCode).trim();
        if (targetCode.length !== 6) {
            setPairingError('Please enter all 6 digits of the pairing code.');
            return;
        }

        setPairingLoading(true);
        setPairingError(null);

        try {
            const res = await axios.post('/queue/tv/pair', {
                code: targetCode,
                device_name: 'Waiting Room TV',
            });

            if (res.data?.success) {
                setIsPaired(true);
                // Fetch live data immediately
                const dataRes = await axios.get('/queue/tv/data');
                setTvData(dataRes.data);
            }
        } catch (err: any) {
            setPairingError(err.response?.data?.message || 'Invalid or expired pairing code. Please generate a new code.');
        } finally {
            setPairingLoading(false);
        }
    };

    // Auto-submit prefilled code
    useEffect(() => {
        if (!isPaired && prefillCode && prefillCode.length === 6) {
            handlePairSubmit(prefillCode);
        }
    }, [prefillCode]);

    // ==========================================
    // RENDER: UNPAIRED TV PAIRING SCREEN
    // ==========================================
    if (!isPaired && !isStaff) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between p-6 sm:p-12 select-none font-sans">
                <Head title={`Waiting Room TV Pairing · ${clinic.name}`} />

                {/* Top Clinic Branding */}
                <div className="flex items-center gap-4">
                    {clinic.logo_url ? (
                        <img
                            src={clinic.logo_url}
                            alt={clinic.name}
                            className="w-14 h-14 rounded-2xl object-contain bg-white/5 p-1 border border-white/10 shadow-lg"
                        />
                    ) : (
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#1E6FD9] to-[#0E9E8F] flex items-center justify-center text-white font-black text-2xl shadow-lg">
                            {clinic.name.charAt(0)}
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                            {clinic.name}
                        </h1>
                        <p className="text-xs font-semibold text-[#38BDF8] tracking-widest uppercase">
                            Waiting-Room TV Display Setup
                        </p>
                    </div>
                </div>

                {/* Center Pairing Card */}
                <div className="w-full max-w-xl p-8 sm:p-10 rounded-3xl bg-slate-900/90 border border-white/10 shadow-2xl backdrop-blur-xl space-y-6 my-auto">
                    <div className="text-center space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-[#1E6FD9]/20 text-[#38BDF8] flex items-center justify-center mx-auto mb-2 border border-[#1E6FD9]/30">
                            <Tv className="w-6 h-6" />
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                            Connect this TV
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400">
                            In your clinic app, open <span className="text-white font-semibold">Today &gt; Open TV display</span> or <span className="text-white font-semibold">Settings &gt; Operations &gt; TV display</span> to generate a 6-digit code.
                        </p>
                    </div>

                    {/* 6-Digit Display */}
                    <div className="flex items-center justify-center gap-2 sm:gap-3 py-2">
                        {[0, 1, 2, 3, 4, 5].map((idx) => {
                            const digit = pairingCode[idx];
                            const isCurrent = idx === pairingCode.length;
                            return (
                                <div
                                    key={idx}
                                    className={`w-12 h-16 sm:w-16 sm:h-20 rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-mono font-black border transition-all ${
                                        digit
                                            ? 'bg-slate-800 text-[#38BDF8] border-[#38BDF8]/60 shadow-lg shadow-[#38BDF8]/10'
                                            : isCurrent
                                            ? 'bg-slate-800/80 border-[#1E6FD9] ring-2 ring-[#1E6FD9]/30'
                                            : 'bg-slate-900/60 border-white/10 text-slate-600'
                                    }`}
                                >
                                    {digit || '•'}
                                </div>
                            );
                        })}
                    </div>

                    {pairingError && (
                        <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-center gap-2.5">
                            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                            <span>{pairingError}</span>
                        </div>
                    )}

                    {/* Numeric Keypad for TV Remote */}
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 max-w-sm mx-auto">
                        {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((item) => {
                            const isClear = item === 'C';
                            const isBackspace = item === '⌫';
                            return (
                                <button
                                    key={item}
                                    type="button"
                                    disabled={pairingLoading}
                                    onClick={() => {
                                        if (isClear) setPairingCode('');
                                        else if (isBackspace) setPairingCode((prev) => prev.slice(0, -1));
                                        else if (pairingCode.length < 6) {
                                            const nextCode = pairingCode + item;
                                            setPairingCode(nextCode);
                                            if (nextCode.length === 6) {
                                                handlePairSubmit(nextCode);
                                            }
                                        }
                                    }}
                                    className={`h-12 sm:h-14 rounded-2xl font-mono text-xl sm:text-2xl font-bold flex items-center justify-center transition-all active:scale-95 ${
                                        isClear || isBackspace
                                            ? 'bg-slate-800/60 hover:bg-slate-800 text-slate-400 border border-white/5'
                                            : 'bg-slate-800 hover:bg-slate-700/80 text-white border border-white/10 shadow-sm'
                                    }`}
                                >
                                    {item}
                                </button>
                            );
                        })}
                    </div>

                    {pairingLoading && (
                        <div className="flex items-center justify-center gap-2 text-xs text-[#38BDF8] font-semibold animate-pulse">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Authorizing device and encrypting token...</span>
                        </div>
                    )}
                </div>

                {/* Bottom Security Info */}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Shield className="w-4 h-4 text-[#0E9E8F]" />
                    <span>Protected by signed device tokens · Zero patient names exposed</span>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: PAIRED KIOSK START SCREEN (AUTOPLAY RULE)
    // ==========================================
    if (!kioskStarted) {
        return (
            <div
                onClick={handleStartDisplay}
                className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-8 select-none cursor-pointer"
            >
                <Head title={`Waiting Room TV · ${clinic.name}`} />
                <div className="max-w-md text-center space-y-6 animate-fade-in">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#1E6FD9] to-[#0E9E8F] flex items-center justify-center mx-auto shadow-2xl text-white">
                        <Tv className="w-10 h-10 animate-pulse" />
                    </div>

                    <div className="space-y-2">
                        <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">
                            {clinic.name}
                        </h2>
                        <p className="text-sm text-slate-400">
                            Waiting Room Queue Display Ready
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleStartDisplay}
                        className="w-full inline-flex items-center justify-center gap-3 px-6 py-4 rounded-2xl bg-[#0E9E8F] hover:bg-[#0c8a7d] text-white font-bold text-base shadow-xl hover:scale-[1.02] transition-all"
                    >
                        <Maximize2 className="w-5 h-5" />
                        <span>Start Display</span>
                    </button>

                    <p className="text-xs text-slate-500">
                        Enables chime sound, fullscreen & keeps screen awake (Wake Lock).
                    </p>
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER: LIVE 10-FOOT WAITING ROOM TV DISPLAY
    // ==========================================
    const liveSessions = tvData?.liveSessions || [];
    const upcomingSessions = tvData?.upcomingSessions || [];
    const layoutMode = tvData?.layoutMode || 'idle';
    const primarySession = tvData?.primarySession || liveSessions[0] || null;

    return (
        <div
            className={`min-h-screen w-screen overflow-hidden flex flex-col justify-between selection:bg-transparent ${
                cursorVisible ? '' : 'cursor-none'
            } ${
                isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'
            }`}
            style={{
                fontFamily: `'Poppins', 'Noto Sans Tamil', 'Noto Sans Sinhala', sans-serif`,
                height: '100vh',
                maxHeight: '100vh',
            }}
        >
            <Head title={`Waiting Room Live TV · ${clinic.name}`} />

            {/* ============================================================== */}
            {/* FULL-SCREEN 5-SECOND CALLING ANIMATION OVERLAY */}
            {/* ============================================================== */}
            {callingOverlay && (
                <div
                    className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-8 sm:p-16 select-none ${
                        isDark ? 'bg-slate-950/98' : 'bg-slate-900/98'
                    } text-white animate-fade-in`}
                    style={{
                        backdropFilter: 'blur(20px)',
                    }}
                >
                    {/* Glowing background halo */}
                    <div
                        className="absolute w-[40vw] h-[40vw] rounded-full blur-[100px] pointer-events-none opacity-30"
                        style={{ backgroundColor: callingOverlay.doctor_color || '#1E6FD9' }}
                    />

                    {/* Call Card with optional 3D flip animation */}
                    <div
                        className={`relative z-10 max-w-4xl w-full text-center space-y-6 p-8 sm:p-14 rounded-3xl border border-white/20 shadow-2xl bg-slate-900/90 ${
                            settings.reduced_motion ? '' : 'animate-flip'
                        }`}
                        style={{
                            borderColor: callingOverlay.doctor_color || '#1E6FD9',
                        }}
                    >
                        {/* Trilingual Subtitle: Now Serving */}
                        <div className="flex items-center justify-center gap-2 text-sm sm:text-base font-extrabold uppercase tracking-widest text-[#38BDF8]">
                            {showEn && <span>Now Serving</span>}
                            {showTa && (
                                <>
                                    <span className="opacity-40">·</span>
                                    <span>இப்போது</span>
                                </>
                            )}
                            {showSi && (
                                <>
                                    <span className="opacity-40">·</span>
                                    <span>දැන්</span>
                                </>
                            )}
                        </div>

                        {/* Huge Token Number */}
                        <div className="py-2">
                            <div className="text-[14vw] sm:text-[11vw] font-mono font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-300 drop-shadow-2xl leading-none">
                                #{callingOverlay.token_display || callingOverlay.token_number}
                            </div>

                            {callingOverlay.patient_name && (
                                <div className="text-2xl sm:text-4xl font-extrabold text-white/90 mt-2 truncate">
                                    {callingOverlay.patient_name}
                                </div>
                            )}
                        </div>

                        {/* Proceed to Room & Doctor */}
                        <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
                            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/10 border border-white/10">
                                <span className="text-xl sm:text-2xl font-black text-[#0E9E8F]">
                                    {callingOverlay.room_number}
                                </span>
                            </div>

                            <div className="text-center sm:text-left flex items-center gap-3">
                                {callingOverlay.doctor_token_code && (
                                    <span
                                        className="px-2.5 py-1 rounded-xl text-sm font-mono font-black text-white shrink-0"
                                        style={{ backgroundColor: callingOverlay.doctor_color || '#1E6FD9' }}
                                    >
                                        {callingOverlay.doctor_token_code}
                                    </span>
                                )}
                                <div className="text-lg sm:text-xl font-bold text-white">
                                    {callingOverlay.doctor_name}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* TOP BAR: BRANDING, CLOCK, CONNECTION, AUDIO */}
            {/* ============================================================== */}
            <header
                className={`flex items-center justify-between px-6 sm:px-10 py-3.5 sm:py-4 border-b shrink-0 ${
                    isDark ? 'border-white/10 bg-slate-950/80' : 'border-slate-300 bg-white/80'
                } backdrop-blur-md`}
                style={{ height: '9vh' }}
            >
                {/* Left: Clinic Identity */}
                <div className="flex items-center gap-3.5 truncate">
                    {clinic.logo_url ? (
                        <img
                            src={clinic.logo_url}
                            alt={clinic.name}
                            className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl object-contain bg-white/5 p-0.5 border border-white/10 shrink-0"
                        />
                    ) : (
                        <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-tr from-[#1E6FD9] to-[#0E9E8F] flex items-center justify-center text-white font-black text-lg sm:text-xl shadow-sm shrink-0">
                            {clinic.name.charAt(0)}
                        </div>
                    )}
                    <div className="truncate">
                        <h1 className="text-lg sm:text-2xl font-black tracking-tight uppercase truncate">
                            {clinic.name}
                        </h1>
                        <div className="flex items-center gap-2 text-[11px] sm:text-xs text-slate-400 font-medium truncate">
                            {showEn && <span>Waiting Room Queue</span>}
                            {showTa && (
                                <>
                                    <span className="opacity-30">·</span>
                                    <span>வரிசை</span>
                                </>
                            )}
                            {showSi && (
                                <>
                                    <span className="opacity-30">·</span>
                                    <span>පෝලිම</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Live Clock, Connection Status & Sound */}
                <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                    {/* Audio Status */}
                    <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold ${
                            settings.chime_enabled
                                ? isDark
                                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : isDark
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-slate-200 text-slate-500'
                        }`}
                        title={settings.chime_enabled ? 'Chime sound active' : 'Chime muted'}
                    >
                        {settings.chime_enabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{settings.chime_enabled ? 'Chime on' : 'Muted'}</span>
                    </div>

                    {/* Connection Status Dot */}
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                        {connectionStatus === 'live' && (
                            <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span className="hidden md:inline">Live</span>
                            </span>
                        )}
                        {connectionStatus === 'reconnecting' && (
                            <span className="flex items-center gap-1.5 text-amber-500 font-semibold">
                                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                                <span className="hidden md:inline">Reconnecting</span>
                            </span>
                        )}
                        {connectionStatus === 'offline' && (
                            <span className="flex items-center gap-1.5 text-red-500 font-semibold">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                                <span className="text-[11px] text-slate-400">Updated {lastUpdatedSecondsAgo}s ago</span>
                            </span>
                        )}
                    </div>

                    {/* Large Live Clock (Asia/Colombo) */}
                    <div className="text-right">
                        <div
                            className="font-mono font-black text-2xl sm:text-3xl tracking-tight leading-none"
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                        >
                            {clockStr || tvData?.currentTime || '--:--:--'}
                        </div>
                        <div className="text-[11px] sm:text-xs text-slate-400 font-medium mt-0.5">
                            {tvData?.currentDate}
                        </div>
                    </div>
                </div>
            </header>

            {/* ============================================================== */}
            {/* MAIN CONTENT AREA: ADAPTIVE TO LIVE SESSIONS COUNT */}
            {/* ============================================================== */}
            <main
                className="flex-1 w-full px-6 sm:px-10 py-4 flex flex-col justify-center overflow-hidden"
                style={{ height: '83vh' }}
            >
                {/* ---------------------------------------------------------- */}
                {/* 1. HERO LAYOUT: EXACTLY 1 LIVE SESSION TODAY */}
                {/* ---------------------------------------------------------- */}
                {layoutMode === 'hero' && primarySession && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 h-full items-stretch">
                        {/* Huge Now Serving Box (8 cols) */}
                        <div
                            className={`lg:col-span-8 rounded-3xl p-6 sm:p-10 border-2 flex flex-col justify-between relative overflow-hidden transition-all shadow-2xl ${
                                recentlyCalledSessionId === primarySession.id
                                    ? 'ring-4 ring-[#0E9E8F] border-[#0E9E8F]'
                                    : ''
                            } ${
                                isDark
                                    ? 'bg-slate-900/90 border-slate-700/80 shadow-slate-950/80'
                                    : 'bg-white border-slate-200 shadow-slate-200'
                            }`}
                            style={{
                                borderLeftWidth: '12px',
                                borderLeftColor: primarySession.doctor_color || '#1E6FD9',
                            }}
                        >
                            {/* Card Header */}
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="w-3 h-3 rounded-full bg-[#0E9E8F] animate-ping" />
                                        <span className="text-xs sm:text-sm font-extrabold tracking-widest uppercase text-[#0E9E8F]">
                                            Now Serving
                                        </span>
                                    </div>
                                    <div className="text-[11px] text-slate-400 font-medium">
                                        {showTa && <span>இப்போது</span>}
                                        {showTa && showSi && <span className="mx-1">·</span>}
                                        {showSi && <span>දැන්</span>}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <div className="px-4 py-1.5 rounded-xl text-sm sm:text-base font-black bg-[#1E6FD9]/15 text-[#38BDF8] border border-[#1E6FD9]/30">
                                        {primarySession.room_number}
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                        {showTa && <span>அறை</span>}
                                        {showTa && showSi && <span className="mx-1">·</span>}
                                        {showSi && <span>කාමරය</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Middle: Token Display or Paused/Delayed state */}
                            {primarySession.status === 'paused' ? (
                                <div className="py-12 text-center space-y-3 my-auto">
                                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                                        <Pause className="w-8 h-8" />
                                    </div>
                                    <h2 className="text-3xl sm:text-5xl font-black text-amber-400">
                                        Short Break
                                    </h2>
                                    <p className="text-base text-slate-400">
                                        Consultation will resume shortly. Please wait in the lounge.
                                    </p>
                                </div>
                            ) : primarySession.now_serving ? (
                                <div className="py-2 my-auto flex flex-col sm:flex-row items-center justify-between gap-6">
                                    <div>
                                        <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">
                                            Token Number / டோக்கன் / ටෝකන්
                                        </span>
                                        <div
                                            className="font-mono font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#38BDF8] via-teal-300 to-white leading-none drop-shadow-md"
                                            style={{
                                                fontSize: 'clamp(4rem, 12vw, 10rem)',
                                            }}
                                        >
                                            #{primarySession.now_serving.token_display || primarySession.now_serving.token_number}
                                        </div>

                                        {primarySession.now_serving.patient_name && (
                                            <h3 className="text-2xl sm:text-4xl font-extrabold text-white mt-2 truncate">
                                                {primarySession.now_serving.patient_name}
                                            </h3>
                                        )}
                                    </div>

                                    {/* Doctor Info Block */}
                                    <div className="p-5 sm:p-6 rounded-2xl bg-white/[0.04] border border-white/10 sm:max-w-xs w-full text-right">
                                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#38BDF8] block">
                                            Doctor in Attendance
                                        </span>
                                        <span className="text-lg sm:text-xl font-black text-white block mt-1">
                                            {primarySession.doctor_name}
                                        </span>
                                        <span className="text-xs text-slate-400 block mt-0.5">
                                            {primarySession.doctor_specialty}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 text-center space-y-2 my-auto">
                                    <Activity className="w-14 h-14 mx-auto text-slate-600 animate-pulse" />
                                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-300">
                                        {primarySession.status_message || 'Preparing for Next Patient'}
                                    </h2>
                                    <p className="text-xs sm:text-sm text-slate-500">
                                        {primarySession.doctor_name} · {primarySession.room_number}
                                    </p>
                                </div>
                            )}

                            {/* Footer: Waiting Count & Estimated Wait */}
                            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs sm:text-sm text-slate-400">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4 text-[#0E9E8F]" />
                                    <span className="font-semibold text-white">
                                        {primarySession.waiting_text}
                                    </span>
                                </div>

                                {primarySession.estimated_wait_minutes > 0 && (
                                    <div className="flex items-center gap-1.5 text-slate-400">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span>Est. wait ~{primarySession.estimated_wait_minutes} mins</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Side Column: Next in Line Chips (4 cols) */}
                        <div
                            className={`lg:col-span-4 rounded-3xl p-6 border flex flex-col justify-between ${
                                isDark ? 'bg-slate-900/60 border-white/10' : 'bg-white border-slate-200'
                            }`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                                    <div>
                                        <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                            <Clock className="w-4 h-4 text-[#38BDF8]" />
                                            <span>Next in Line</span>
                                        </h3>
                                        <div className="text-[10px] text-slate-500 mt-0.5">
                                            {showTa && <span>அடுத்து</span>}
                                            {showTa && showSi && <span className="mx-1">·</span>}
                                            {showSi && <span>ඊළඟට</span>}
                                        </div>
                                    </div>

                                    <span className="text-xs font-bold text-slate-400">
                                        {primarySession.next_in_line?.length || 0} queued
                                    </span>
                                </div>

                                {primarySession.next_in_line && primarySession.next_in_line.length > 0 ? (
                                    <div className="space-y-3">
                                        {primarySession.next_in_line.map((item, idx) => (
                                            <div
                                                key={item.id || idx}
                                                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                                                    isDark
                                                        ? 'bg-slate-800/40 border-white/5'
                                                        : 'bg-slate-50 border-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="px-3 h-12 rounded-xl bg-[#1E6FD9]/15 text-[#38BDF8] font-mono font-black text-lg sm:text-xl flex items-center justify-center border border-[#1E6FD9]/30">
                                                        #{item.token_display || item.token_number}
                                                    </span>
                                                    <div>
                                                        {item.patient_name && (
                                                            <span className="text-sm font-bold text-white block">
                                                                {item.patient_name}
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-slate-400">
                                                            Position {idx + 1}
                                                        </span>
                                                    </div>
                                                </div>

                                                {item.estimated_time && (
                                                    <span className="text-[11px] font-mono text-slate-400">
                                                        {item.estimated_time}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-slate-500 text-xs italic">
                                        No more patients waiting in queue.
                                    </div>
                                )}
                            </div>

                            {/* Completed summary badge */}
                            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                                <span>Completed today:</span>
                                <span className="font-bold text-white">
                                    {primarySession.completed_count} consultation(s)
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* 2. GRID LAYOUT: 2 TO 4 LIVE SESSIONS TODAY */}
                {/* ---------------------------------------------------------- */}
                {layoutMode === 'grid' && (
                    <div
                        className={`grid gap-5 h-full items-stretch ${
                            liveSessions.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2'
                        }`}
                    >
                        {liveSessions.map((session) => (
                            <div
                                key={session.id}
                                className={`rounded-3xl p-6 border-2 flex flex-col justify-between relative overflow-hidden transition-all shadow-xl ${
                                    recentlyCalledSessionId === session.id
                                        ? 'ring-4 ring-[#0E9E8F] border-[#0E9E8F]'
                                        : ''
                                } ${
                                    isDark
                                        ? 'bg-slate-900/90 border-slate-700/80 shadow-slate-950/60'
                                        : 'bg-white border-slate-200'
                                }`}
                                style={{
                                    borderTopWidth: '8px',
                                    borderTopColor: session.doctor_color || '#1E6FD9',
                                }}
                            >
                                {/* Header: Doctor & Room */}
                                <div className="flex items-start justify-between pb-3 border-b border-white/10">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        {session.doctor_token_code && (
                                            <span
                                                className="px-2 py-0.5 rounded-lg text-xs font-mono font-black text-white shrink-0"
                                                style={{ backgroundColor: session.doctor_color || '#1E6FD9' }}
                                                title="Doctor token prefix"
                                            >
                                                {session.doctor_token_code}
                                            </span>
                                        )}
                                        <div className="min-w-0">
                                            <h3 className="text-lg sm:text-xl font-black text-white truncate">
                                                {session.doctor_name}
                                            </h3>
                                            <p className="text-xs text-slate-400 truncate">
                                                {session.doctor_specialty}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <span className="px-3 py-1 rounded-xl text-xs sm:text-sm font-black bg-[#1E6FD9]/15 text-[#38BDF8] border border-[#1E6FD9]/30">
                                            {session.room_number}
                                        </span>
                                    </div>
                                </div>

                                {/* Current Token Number or Paused */}
                                <div className="py-4 my-auto flex items-center justify-between gap-4">
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                            Now Serving
                                        </div>
                                        {session.status === 'paused' ? (
                                            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
                                                Short Break
                                            </div>
                                        ) : session.now_serving ? (
                                            <div>
                                                <div
                                                    className="font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300 drop-shadow-md leading-none"
                                                    style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}
                                                >
                                                    #{session.now_serving.token_display || session.now_serving.token_number}
                                                </div>
                                                {session.now_serving.patient_name && (
                                                    <div className="text-sm font-bold text-white mt-1 truncate">
                                                        {session.now_serving.patient_name}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-xl sm:text-2xl font-bold text-slate-400 mt-2">
                                                {session.status_message || 'In Preparation'}
                                            </div>
                                        )}
                                    </div>

                                    {/* Next 3 Tokens */}
                                    <div className="text-right space-y-1.5">
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                            Next in line
                                        </div>
                                        <div className="flex items-center gap-1.5 justify-end">
                                            {session.next_in_line && session.next_in_line.length > 0 ? (
                                                session.next_in_line.slice(0, 3).map((t) => (
                                                    <span
                                                        key={t.id}
                                                        className="px-2.5 py-1 rounded-xl bg-white/10 font-mono font-bold text-xs sm:text-sm text-[#38BDF8]"
                                                    >
                                                        #{t.token_display || t.token_number}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-slate-500 italic">No queue</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Footer: Plural Waiting text */}
                                <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                                    <span className="font-medium text-white">{session.waiting_text}</span>
                                    <span>Status: {session.status === 'paused' ? 'Paused' : 'Active'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* 3. BOARD LAYOUT: 5+ SESSIONS (WITH 10S PAGINATION ROTATION) */}
                {/* ---------------------------------------------------------- */}
                {layoutMode === 'board' && (
                    <div
                        className={`rounded-3xl p-6 border h-full flex flex-col justify-between ${
                            isDark ? 'bg-slate-900/80 border-white/10' : 'bg-white border-slate-200'
                        }`}
                    >
                        <div className="overflow-hidden">
                            {/* Board Header */}
                            <div className="grid grid-cols-12 gap-4 pb-3 border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
                                <div className="col-span-4">Doctor & Specialty</div>
                                <div className="col-span-2 text-center">Room</div>
                                <div className="col-span-3 text-center">Now Serving</div>
                                <div className="col-span-3 text-right">Next Tokens / Waiting</div>
                            </div>

                            {/* Board Rows (Paginated 5 per page) */}
                            <div className="divide-y divide-white/5 space-y-2 mt-2">
                                {liveSessions
                                    .slice(boardPageIndex * 5, boardPageIndex * 5 + 5)
                                    .map((session) => (
                                        <div
                                            key={session.id}
                                            className={`grid grid-cols-12 gap-4 items-center py-3.5 px-3 rounded-2xl transition-all ${
                                                recentlyCalledSessionId === session.id
                                                    ? 'bg-[#0E9E8F]/20 ring-2 ring-[#0E9E8F]'
                                                    : 'hover:bg-white/[0.02]'
                                            }`}
                                        >
                                            <div className="col-span-4 flex items-center gap-2.5">
                                                {session.doctor_token_code ? (
                                                    <span
                                                        className="px-2 py-0.5 rounded-lg text-xs font-mono font-black text-white shrink-0"
                                                        style={{ backgroundColor: session.doctor_color || '#1E6FD9' }}
                                                    >
                                                        {session.doctor_token_code}
                                                    </span>
                                                ) : (
                                                    <span
                                                        className="w-2.5 h-8 rounded-full shrink-0"
                                                        style={{ backgroundColor: session.doctor_color || '#1E6FD9' }}
                                                    />
                                                )}
                                                <div className="truncate">
                                                    <span className="font-extrabold text-base sm:text-lg text-white block truncate">
                                                        {session.doctor_name}
                                                    </span>
                                                    <span className="text-xs text-slate-400 truncate">
                                                        {session.doctor_specialty}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="col-span-2 text-center">
                                                <span className="px-3 py-1 rounded-xl text-xs sm:text-sm font-bold bg-[#1E6FD9]/15 text-[#38BDF8]">
                                                    {session.room_number}
                                                </span>
                                            </div>

                                            <div className="col-span-3 text-center">
                                                {session.status === 'paused' ? (
                                                    <span className="text-sm font-bold text-amber-400">
                                                        Short Break
                                                    </span>
                                                ) : session.now_serving ? (
                                                    <span className="font-mono font-black text-xl sm:text-2xl text-emerald-400">
                                                        #{session.now_serving.token_display || session.now_serving.token_number}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-medium">
                                                        {session.status_message || 'Standby'}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="col-span-3 text-right">
                                                <div className="flex items-center gap-1.5 justify-end">
                                                    {session.next_in_line && session.next_in_line.length > 0 ? (
                                                        session.next_in_line.slice(0, 3).map((t) => (
                                                            <span
                                                                key={t.id}
                                                                className="px-2 py-0.5 rounded-lg bg-white/10 font-mono text-xs font-bold text-slate-300"
                                                            >
                                                                #{t.token_display || t.token_number}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-slate-500">—</span>
                                                    )}
                                                </div>
                                                <span className="text-[11px] text-slate-400 mt-1 block">
                                                    {session.waiting_text}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Pagination Indicator */}
                        {Math.ceil(liveSessions.length / 5) > 1 && (
                            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                                <span>Auto-rotating page every 10 seconds</span>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.ceil(liveSessions.length / 5) }).map((_, pIdx) => (
                                        <span
                                            key={pIdx}
                                            className={`w-2 h-2 rounded-full ${
                                                pIdx === boardPageIndex ? 'bg-[#38BDF8] w-4' : 'bg-slate-700'
                                            } transition-all`}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ---------------------------------------------------------- */}
                {/* 4. IDLE LAYOUT: NO ACTIVE SESSIONS RIGHT NOW */}
                {/* ---------------------------------------------------------- */}
                {layoutMode === 'idle' && (
                    <div
                        className={`rounded-3xl p-8 sm:p-14 border h-full flex flex-col justify-between text-center relative overflow-hidden ${
                            isDark
                                ? 'bg-gradient-to-b from-slate-900/90 to-slate-950 border-white/10'
                                : 'bg-white border-slate-200'
                        }`}
                    >
                        <div className="max-w-2xl mx-auto space-y-4 my-auto">
                            {clinic.logo_url ? (
                                <img
                                    src={clinic.logo_url}
                                    alt={clinic.name}
                                    className="w-20 h-20 rounded-3xl object-contain mx-auto p-2 bg-white/5 border border-white/10 shadow-lg"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-[#1E6FD9] to-[#0E9E8F] flex items-center justify-center text-white font-black text-3xl mx-auto shadow-xl">
                                    {clinic.name.charAt(0)}
                                </div>
                            )}

                            <div>
                                <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight uppercase">
                                    Welcome to {clinic.name}
                                </h2>
                                <p className="text-sm sm:text-base text-slate-400 mt-1">
                                    Consultations are currently between sessions. Next doctor will start shortly.
                                </p>
                            </div>

                            {/* Upcoming Sessions Today */}
                            {upcomingSessions.length > 0 && (
                                <div className="pt-6 space-y-2 text-left max-w-lg mx-auto">
                                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                                        Upcoming Today:
                                    </div>
                                    <div className="space-y-2">
                                        {upcomingSessions.slice(0, 3).map((s) => (
                                            <div
                                                key={s.id}
                                                className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs sm:text-sm"
                                            >
                                                <div>
                                                    <span className="font-bold text-white block">
                                                        {s.doctor_name}
                                                    </span>
                                                    <span className="text-slate-400 text-xs">
                                                        {s.doctor_specialty} · {s.room_number}
                                                    </span>
                                                </div>
                                                <span className="px-3 py-1 rounded-xl bg-cyan-500/10 text-[#38BDF8] font-bold text-xs">
                                                    Starts {s.start_time || 'Later today'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Opening hours & contact */}
                        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                            <span>Opening hours: {clinic.opening_hours || '8:00 AM – 8:00 PM'}</span>
                            {clinic.phone && <span>Tel: {clinic.phone}</span>}
                        </div>
                    </div>
                )}
            </main>

            {/* ============================================================== */}
            {/* FOOTER TICKER: SCROLLING CLINIC MESSAGE + PHONE + BRAND */}
            {/* ============================================================== */}
            <footer
                className={`flex items-center justify-between px-6 sm:px-10 border-t shrink-0 ${
                    isDark ? 'border-white/10 bg-slate-950/90' : 'border-slate-300 bg-white'
                }`}
                style={{ height: '8vh' }}
            >
                {/* Scrolling Ticker Message */}
                <div className="flex-1 overflow-hidden mr-6">
                    <div className="flex items-center gap-3">
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#0E9E8F]/20 text-[#0E9E8F] text-[10px] sm:text-xs font-black uppercase tracking-wider shrink-0">
                            Notice
                        </span>
                        <div className="overflow-hidden whitespace-nowrap text-xs sm:text-sm font-medium text-slate-300">
                            <span className="inline-block animate-marquee">
                                {settings.ticker_text || 'Please keep your token slip ready. Keep the waiting area quiet and comfortable for all patients.'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Clinic Phone & MedVisit Brand */}
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-400 shrink-0">
                    {clinic.phone && (
                        <div className="flex items-center gap-1.5 text-white">
                            <Phone className="w-3.5 h-3.5 text-[#0E9E8F]" />
                            <span>{clinic.phone}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 opacity-80">
                        <span>Powered by MedVisit</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                </div>
            </footer>
        </div>
    );
}
