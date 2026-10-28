import React, { useState } from 'react';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowLeft,
    Monitor,
    Tablet,
    Smartphone,
    Sparkles,
    Check,
    ArrowRight,
    Lock,
    ExternalLink,
} from 'lucide-react';

interface Props {
    template: {
        id: number;
        slug: string;
        name: string;
        tagline: string;
        description: string;
        tier: string;
        price_formatted: string;
        tags: string[];
        definition?: any;
    };
    demoClinic: {
        name: string;
        subdomain: string;
        phone: string;
        address: string;
    };
}

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

export default function DemoPreview({ template, demoClinic }: Props) {
    const [device, setDevice] = useState<DeviceMode>('desktop');

    const themeTokens = template.definition?.theme_tokens ?? {
        theme: 'medvisit-teal',
        font: 'Poppins',
        brand_color: '#0E9E8F',
        hero_style: 'gradient',
        mode: 'light',
    };

    const deviceWidthClass =
        device === 'mobile'
            ? 'max-w-[390px] my-6 rounded-3xl shadow-2xl border-8 border-slate-900 overflow-hidden'
            : device === 'tablet'
            ? 'max-w-[768px] my-6 rounded-2xl shadow-2xl border-4 border-slate-800 overflow-hidden'
            : 'w-full';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-text">
            <Head>
                <title>{`Demo Preview: ${template.name} — MedVisit`}</title>
                <meta name="robots" content="noindex, nofollow" />
            </Head>

            {/* Top Toolbar */}
            <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-md">
                <div className="flex items-center gap-3">
                    <Link
                        href="/templates"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                    >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>All Templates</span>
                    </Link>

                    <div className="h-4 w-px bg-slate-700 hidden sm:block" />

                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
                                {template.name}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                                <Sparkles className="w-3 h-3 text-amber-400" />
                                <span>{template.price_formatted}</span>
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-400 hidden md:block">
                            Interactive demo simulation with sample clinic channeling schedule
                        </p>
                    </div>
                </div>

                {/* Device Viewport Buttons */}
                <div className="inline-flex items-center p-1 rounded-xl bg-slate-800/80 border border-slate-700/80">
                    <button
                        type="button"
                        onClick={() => setDevice('desktop')}
                        title="Desktop View (100%)"
                        className={`p-1.5 rounded-lg text-xs font-medium transition ${
                            device === 'desktop' ? 'bg-primary text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Monitor className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setDevice('tablet')}
                        title="Tablet View (768px)"
                        className={`p-1.5 rounded-lg text-xs font-medium transition ${
                            device === 'tablet' ? 'bg-primary text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Tablet className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setDevice('mobile')}
                        title="Mobile View (390px)"
                        className={`p-1.5 rounded-lg text-xs font-medium transition ${
                            device === 'mobile' ? 'bg-primary text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        <Smartphone className="w-4 h-4" />
                    </button>
                </div>

                {/* Right: Register / Get Template CTA */}
                <div className="flex items-center gap-2">
                    <a
                        href="/register"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary hover:from-primary-600 hover:to-secondary-600 text-white text-xs font-bold shadow-md shadow-primary/25 transition active:scale-95"
                    >
                        <span>Start Free Trial & Use This Template</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                </div>
            </header>

            {/* Faded Watermark / Info Banner */}
            <div className="bg-gradient-to-r from-primary-950/80 via-slate-900/90 to-primary-950/80 border-b border-primary/20 text-center py-2 px-4 text-xs text-primary-200 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <span>
                    <strong>Interactive Demo:</strong> Showing <strong>{template.name}</strong>. Create a MedVisit clinic account to preview this template live with your real doctors and token queue.
                </span>
            </div>

            {/* Simulated Live Website Canvas */}
            <main className="flex-1 flex justify-center items-start overflow-x-hidden bg-slate-950 p-0 sm:p-4">
                <div className={`transition-all duration-300 bg-white text-slate-900 ${deviceWidthClass}`}>
                    {/* Simulated Header */}
                    <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div
                                className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold"
                                style={{ backgroundColor: themeTokens.brand_color || '#0E9E8F' }}
                            >
                                M
                            </div>
                            <span className="font-bold text-sm sm:text-base text-slate-900">
                                {demoClinic.name}
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500 hidden sm:inline">{demoClinic.phone}</span>
                            <span className="px-3 py-1 rounded-xl bg-primary text-white text-xs font-bold">
                                Book Token
                            </span>
                        </div>
                    </div>

                    {/* Simulated Hero */}
                    <div className="py-16 sm:py-24 px-6 sm:px-12 text-center bg-gradient-to-b from-slate-50 to-white">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4 border border-emerald-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>OPD Channeling & Live Token Queue</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 max-w-2xl mx-auto tracking-tight">
                            Compassionate care, verified medical specialists
                        </h1>
                        <p className="mt-4 text-sm sm:text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
                            Serving the community with dedicated consultation suites, digital token tracking, and streamlined doctor channeling.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                            <button
                                type="button"
                                className="px-6 py-3 rounded-2xl bg-primary text-white font-bold text-xs sm:text-sm shadow-md"
                            >
                                View Doctors & Schedule
                            </button>
                            <button
                                type="button"
                                className="px-5 py-3 rounded-2xl border border-slate-300 text-slate-700 font-bold text-xs sm:text-sm"
                            >
                                Contact Clinic
                            </button>
                        </div>
                    </div>

                    {/* Simulated Doctors Grid */}
                    <div className="p-6 sm:p-12 border-t border-slate-100 bg-white">
                        <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">
                            Our Consulting Specialists
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {[
                                { name: 'Dr. Nirmal Perera', spec: 'Consultant Physician & Cardiologist', fee: 'Rs. 2,500' },
                                { name: 'Dr. Dilrukshi Silva', spec: 'Consultant Paediatrician', fee: 'Rs. 2,000' },
                                { name: 'Dr. Aruni Fernando', spec: 'General Family Physician', fee: 'Rs. 1,500' },
                            ].map((doc, idx) => (
                                <div key={idx} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50">
                                    <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold mb-3">
                                        Dr
                                    </div>
                                    <h3 className="font-bold text-sm text-slate-900">{doc.name}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">{doc.spec}</p>
                                    <div className="mt-4 pt-3 border-t border-slate-200/80 flex items-center justify-between text-xs">
                                        <span className="font-bold text-primary">{doc.fee}</span>
                                        <span className="text-slate-500 font-medium">Available Today</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Simulated Footer */}
                    <div className="p-8 border-t border-slate-200 bg-slate-900 text-white text-center text-xs space-y-2">
                        <p className="font-bold">{demoClinic.name}</p>
                        <p className="text-slate-400">{demoClinic.address} · {demoClinic.phone}</p>
                        <p className="text-slate-500 pt-4">Powered by MedVisit Sri Lanka</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
