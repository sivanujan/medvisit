import React, { useState, useEffect, useRef } from 'react';
import { Head } from '@inertiajs/react';
import { Volume2, VolumeX, Clock, Stethoscope, Users, Building, Activity } from 'lucide-react';

interface TvData {
    clinic: {
        name: string;
        subdomain: string;
        phone: string;
    };
    primarySession: {
        id: number;
        doctor_name: string;
        doctor_specialty: string;
        room_number: string;
        status: string;
    } | null;
    nowServing: {
        id: number;
        token_number: number;
        patient_name: string;
        status: string;
        called_at: number | null;
        room_number: string;
        doctor_name: string;
        doctor_specialty: string;
    } | null;
    nextInLine: Array<{
        token_number: number;
        patient_name: string;
        status: string;
        estimated_time: string;
    }>;
    waitingCount: number;
    completedCount: number;
    roomsOverview: Array<{
        id: number;
        doctor_name: string;
        room_number: string;
        current_token_number: number | string;
        status: string;
    }>;
    currentTime: string;
    currentDate: string;
}

interface Props {
    tvData: TvData;
}

export default function QueueTv({ tvData: initialTvData }: Props) {
    const [tvData, setTvData] = useState<TvData>(initialTvData);
    const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
    const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
    const lastCalledTokenRef = useRef<number | null>(initialTvData.nowServing?.token_number ?? null);
    const lastCalledAtRef = useRef<number | null>(initialTvData.nowServing?.called_at ?? null);

    // Audio Chime synthesizer using Web Audio API
    const playHospitalChime = () => {
        try {
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioCtx) return;
            const ctx = new AudioCtx();

            const now = ctx.currentTime;

            // Note 1: C5 (523.25 Hz)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, now);
            gain1.gain.setValueAtTime(0.3, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc1.connect(gain1);
            gain1.connect(ctx.destination);
            osc1.start(now);
            osc1.stop(now + 0.6);

            // Note 2: E5 (659.25 Hz) after 0.25s
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(659.25, now + 0.25);
            gain2.gain.setValueAtTime(0.35, now + 0.25);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
            osc2.connect(gain2);
            gain2.connect(ctx.destination);
            osc2.start(now + 0.25);
            osc2.stop(now + 1.2);
        } catch (e) {
            console.warn('Audio chime playback error:', e);
        }
    };

    // Live clock updater
    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTimeStr(
                now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
            );
        };
        updateClock();
        const clockInterval = setInterval(updateClock, 1000);
        return () => clearInterval(clockInterval);
    }, []);

    // 5-second polling synchronization
    useEffect(() => {
        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch('/queue/tv/data');
                if (res.ok) {
                    const data: TvData = await res.json();
                    setTvData(data);

                    // Check if a new token was called or recalled
                    const newServing = data.nowServing;
                    if (newServing) {
                        const tokenChanged = newServing.token_number !== lastCalledTokenRef.current;
                        const recalled = newServing.called_at && newServing.called_at !== lastCalledAtRef.current;

                        if (tokenChanged || recalled) {
                            lastCalledTokenRef.current = newServing.token_number;
                            lastCalledAtRef.current = newServing.called_at;
                            if (audioEnabled) {
                                playHospitalChime();
                            }
                        }
                    }
                }
            } catch (err) {
                console.error('TV polling error:', err);
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }, [audioEnabled]);

    const toggleAudio = () => {
        if (!audioEnabled) {
            playHospitalChime();
            setAudioEnabled(true);
        } else {
            setAudioEnabled(false);
        }
    };

    const nowServing = tvData.nowServing;
    const nextInLine = tvData.nextInLine || [];

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-cyan-500 selection:text-white p-6 sm:p-10 font-sans antialiased">
            <Head title={`Live Queue Display - ${tvData.clinic.name}`} />

            {/* TOP HEADER BAR */}
            <header className="flex items-center justify-between pb-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-2xl shadow-lg shadow-cyan-500/20">
                        {tvData.clinic.name.charAt(0)}
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
                            {tvData.clinic.name}
                        </h1>
                        <p className="text-xs font-semibold text-cyan-400 tracking-wider uppercase">
                            Channeling & Consultation Waiting Lounge
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    {/* Audio chime toggle */}
                    <button
                        type="button"
                        onClick={toggleAudio}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                            audioEnabled
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10'
                        }`}
                        title="Toggle chime audio on patient call"
                    >
                        {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
                        <span>{audioEnabled ? 'Chime Active' : 'Enable Chime'}</span>
                    </button>

                    {/* Clock & Date */}
                    <div className="text-right">
                        <div className="text-3xl sm:text-4xl font-black tracking-tight text-white font-mono">
                            {currentTimeStr || tvData.currentTime}
                        </div>
                        <div className="text-xs font-medium text-slate-400 mt-0.5">
                            {tvData.currentDate}
                        </div>
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT STAGE */}
            <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-8">
                {/* HERO: NOW SERVING (8 COLS) */}
                <div className="lg:col-span-8 flex flex-col justify-center">
                    <div className="relative rounded-3xl p-8 sm:p-12 border-2 border-cyan-500/40 bg-gradient-to-b from-slate-900/90 to-slate-950/95 backdrop-blur-2xl shadow-2xl shadow-cyan-950/50 overflow-hidden">
                        {/* Glow accent */}
                        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

                        {/* Banner */}
                        <div className="flex items-center justify-between pb-6 border-b border-white/10">
                            <span className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-sm font-extrabold tracking-widest uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                <span className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                                Now Serving
                            </span>

                            <span className="text-sm font-bold text-slate-400">
                                {nowServing?.room_number || tvData.primarySession?.room_number || 'Consultation Room'}
                            </span>
                        </div>

                        {nowServing ? (
                            <div className="py-8 text-center sm:text-left sm:flex items-center justify-between gap-8">
                                <div>
                                    <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">
                                        Token Number
                                    </span>
                                    <div className="text-8xl sm:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-white drop-shadow-lg">
                                        #{nowServing.token_number}
                                    </div>
                                    <h2 className="text-3xl sm:text-4xl font-extrabold text-white mt-3">
                                        {nowServing.patient_name}
                                    </h2>
                                </div>

                                <div className="mt-6 sm:mt-0 p-6 rounded-2xl bg-white/[0.03] border border-white/10 sm:max-w-xs w-full text-right sm:text-right">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 block">
                                        Proceed To
                                    </span>
                                    <span className="text-2xl font-black text-white block mt-1">
                                        {nowServing.room_number}
                                    </span>
                                    <div className="mt-4 pt-3 border-t border-white/10">
                                        <span className="text-sm font-bold text-slate-200 block">
                                            {nowServing.doctor_name}
                                        </span>
                                        <span className="text-xs text-slate-400 block mt-0.5">
                                            {nowServing.doctor_specialty}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <Activity className="w-16 h-16 mx-auto text-slate-600 mb-4 animate-pulse" />
                                <h2 className="text-3xl font-extrabold text-slate-300">
                                    Waiting for next patient
                                </h2>
                                <p className="text-sm text-slate-500 mt-2">
                                    Please hold on while the doctor prepares for the upcoming consultation.
                                </p>
                            </div>
                        )}

                        {/* Room & Doctor Footer */}
                        <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                            <span>Status: {nowServing ? 'Consultation in Progress' : 'In Preparation'}</span>
                            <span>{tvData.waitingCount} patient(s) waiting in lounge</span>
                        </div>
                    </div>
                </div>

                {/* SIDE: NEXT IN LINE & CLINIC ROOMS (4 COLS) */}
                <div className="lg:col-span-4 flex flex-col justify-between gap-6">
                    {/* NEXT IN LINE */}
                    <div className="rounded-3xl p-6 border border-white/10 bg-white/[0.03] backdrop-blur-xl">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 text-cyan-400" />
                            Next in Line
                        </h3>

                        {nextInLine.length === 0 ? (
                            <p className="text-xs text-slate-500 py-6 text-center italic">
                                No upcoming patients queued.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {nextInLine.map((item, idx) => (
                                    <div
                                        key={idx}
                                        className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-300 font-black text-lg flex items-center justify-center border border-cyan-500/20">
                                                #{item.token_number}
                                            </span>
                                            <div>
                                                <span className="text-sm font-bold text-white block">
                                                    {item.patient_name}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    Est. {item.estimated_time || 'Soon'}
                                                </span>
                                            </div>
                                        </div>

                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-slate-300 border border-white/10">
                                            Position {idx + 1}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* MULTI-ROOM OVERVIEW */}
                    {tvData.roomsOverview.length > 1 && (
                        <div className="rounded-3xl p-6 border border-white/10 bg-white/[0.03] backdrop-blur-xl">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                                <Building className="w-4 h-4 text-cyan-400" />
                                Simultaneous Clinic Suites
                            </h3>

                            <div className="space-y-2">
                                {tvData.roomsOverview.map((r) => (
                                    <div
                                        key={r.id}
                                        className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                                    >
                                        <div>
                                            <span className="font-bold text-white block">{r.doctor_name}</span>
                                            <span className="text-slate-400 text-[11px]">{r.room_number}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] uppercase text-slate-500 font-bold block">
                                                Serving
                                            </span>
                                            <span className="text-sm font-black text-cyan-400">
                                                #{r.current_token_number}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* FOOTER TICKER */}
            <footer className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-4">
                    <span>
                        For questions or urgent assistance, please speak with the reception desk.
                    </span>
                    {tvData.clinic.phone && <span>Tel: {tvData.clinic.phone}</span>}
                </div>

                <div className="text-slate-500 flex items-center gap-2">
                    <span>Powered by MedVisit Sri Lanka</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </div>
            </footer>
        </div>
    );
}
