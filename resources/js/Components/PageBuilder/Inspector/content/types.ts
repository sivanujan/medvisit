import type { Component, Editor } from '../../types';

export interface ContentPanelProps {
    editor: Editor;
    component: Component;
    setIsDirty: (dirty: boolean) => void;
    onOpenMedia: (currentValue: string, onPick?: (url: string) => void) => void;
    // Switches the inspector to the Style tab (e.g. Container "Layout settings").
    onOpenStyle?: () => void;
}
