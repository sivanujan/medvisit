import React, { useEffect } from 'react';
import type { InspectorTabName, InspectorTabProps } from '../types';
import DeviceToggle from '../controls/DeviceToggle';
import BackgroundGroup from './style/BackgroundGroup';
import BorderGroup from './style/BorderGroup';
import ColorGroup from './style/ColorGroup';
import LayoutGroup, { isLayoutContainer } from './style/LayoutGroup';
import ShadowGroup from './style/ShadowGroup';
import SizeGroup from './style/SizeGroup';
import TypographyGroup from './style/TypographyGroup';

interface StyleTabProps extends InspectorTabProps {
    inspectorTab: InspectorTabName;
    onOpenMedia: (currentValue: string, onPick?: (url: string) => void) => void;
}

export default function StyleTab({ editor, selectedComponent, inspectorTab, onOpenMedia }: StyleTabProps) {
    // Hover is a per-selection editing mode: always start from Normal when the selection changes or goes away.
    useEffect(() => {
        editor?.Selectors?.setState?.('');
    }, [editor, selectedComponent]);

    const selectionKey = selectedComponent?.getId?.() ?? 'none';

    return (
        <div
            style={
                inspectorTab === 'style'
                    ? { display: 'block' }
                    : { height: 0, opacity: 0, overflow: 'hidden', position: 'absolute', pointerEvents: 'none' }
            }
            className="space-y-3"
        >
            {editor && selectedComponent ? (
                <>
                    <DeviceToggle editor={editor} variant="group" />
                    <TypographyGroup editor={editor} />
                    <ColorGroup editor={editor} />
                    <BackgroundGroup key={selectionKey} editor={editor} onOpenMedia={onOpenMedia} />
                    <BorderGroup editor={editor} />
                    <ShadowGroup editor={editor} />
                    <SizeGroup editor={editor} />
                    {isLayoutContainer(selectedComponent) && <LayoutGroup editor={editor} />}
                </>
            ) : (
                <p className="text-[11px] text-slate-400">Select an element to style it.</p>
            )}

            {/* GrapesJS needs these mounted; the React controls above replace the native UI. */}
            <div id="builder-selectors-container" className="hidden" />
            <div id="builder-styles-container" className="hidden" />
        </div>
    );
}
