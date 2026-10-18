import React from 'react';
import { Search, X } from 'lucide-react';
import type { TabBaseProps } from '../types';

interface WidgetsTabProps extends TabBaseProps {
    isActive: boolean;
    searchQuery: string;
    setSearchQuery: (value: string) => void;
}

export default function WidgetsTab({ isActive, searchQuery, setSearchQuery }: WidgetsTabProps) {
    return (
        <div className={`flex-1 flex flex-col overflow-hidden ${isActive ? '' : 'hidden'}`}>
            {/* Search box */}
            <div className="p-3 border-b border-white/10 bg-slate-900/30">
                <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search widgets & sections..."
                        className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* GrapesJS Blocks Container - Always mounted */}
            <div
                id="builder-blocks-container"
                className="flex-1 overflow-y-auto p-3 space-y-4 text-xs"
            />
        </div>
    );
}
