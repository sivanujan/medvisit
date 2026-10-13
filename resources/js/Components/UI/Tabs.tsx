import React, { ComponentType, ReactNode } from 'react';

export interface TabItem {
    id: string;
    label: string;
    count?: number;
    icon?: ComponentType<{ className?: string }>;
}

export interface TabsProps {
    tabs: TabItem[];
    activeTab: string;
    onChange: (id: string) => void;
    className?: string;
}

export function Tabs({
    tabs = [],
    activeTab,
    onChange,
    className = '',
}: TabsProps) {
    return (
        <div
            className={`inline-flex items-center gap-1 p-1 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-100/80 dark:bg-slate-900/60 backdrop-blur-md ${className}`}
        >
            {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;

                return (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => onChange(tab.id)}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                            isActive
                                ? 'bg-white dark:bg-slate-800 text-primary dark:text-white shadow-xs border border-slate-200/50 dark:border-white/10'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                    >
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        <span>{tab.label}</span>
                        {tab.count !== undefined && (
                            <span
                                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    isActive
                                        ? 'bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300'
                                        : 'bg-slate-200/70 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                                }`}
                            >
                                {tab.count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

export default Tabs;
