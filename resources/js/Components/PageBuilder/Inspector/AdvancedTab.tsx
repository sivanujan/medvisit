import React from 'react';
import type { InspectorTabName, InspectorTabProps } from '../types';
import { getComponentClasses } from './componentHelpers';

interface AdvancedTabProps extends InspectorTabProps {
    inspectorTab: InspectorTabName;
}

export default function AdvancedTab({ selectedComponent, inspectorTab, setIsDirty }: AdvancedTabProps) {
    return (
        <div className={inspectorTab === 'advanced' ? 'space-y-3' : 'hidden'}>
            {selectedComponent ? (
                <>
                    <div key={`id-edit-${selectedComponent?.cid || 'id'}`}>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            Element ID (#)
                        </label>
                        <input
                            type="text"
                            defaultValue={typeof selectedComponent?.getId === 'function' ? selectedComponent.getId() || '' : ''}
                            onChange={(e) => {
                                try {
                                    selectedComponent?.setId?.(e.target.value);
                                    setIsDirty(true);
                                } catch (err) {
                                    console.warn('Error setting id', err);
                                }
                            }}
                            className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-2.5 py-1.5 focus:border-teal-500"
                        />
                    </div>

                    <div key={`class-edit-${selectedComponent?.cid || 'class'}`}>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            CSS Classes
                        </label>
                        <input
                            type="text"
                            defaultValue={getComponentClasses(selectedComponent)}
                            onChange={(e) => {
                                try {
                                    selectedComponent?.setClass?.(e.target.value.split(' ').filter(Boolean));
                                    setIsDirty(true);
                                } catch (err) {
                                    console.warn('Error setting classes', err);
                                }
                            }}
                            className="w-full text-xs rounded-xl bg-slate-900 border border-white/10 text-white px-2.5 py-1.5 focus:border-teal-500"
                        />
                    </div>
                </>
            ) : null}
        </div>
    );
}
