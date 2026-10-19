// Tells change listeners when the builder is loading content programmatically (initial load,
// revision restore) so those GrapesJS events are not mistaken for user edits.
export type LoadGuard = {
    isLoading(): boolean;
    run<T>(fn: () => T): T;
    release(): void;
};

export function createLoadGuard(initiallyLoading: boolean): LoadGuard {
    let initial = initiallyLoading;
    let depth = 0;
    return {
        isLoading: () => initial || depth > 0,
        run<T>(fn: () => T): T {
            depth++;
            try {
                return fn();
            } finally {
                depth--;
            }
        },
        release() {
            initial = false;
        },
    };
}

// Component properties GrapesJS changes for editor UI only (selection, layer tree, hover, handles).
const EDITOR_ONLY_KEYS = ['status', 'open', 'hovered', 'toolbar'];

export function isEditorOnlyChange(changedKeys: string[]): boolean {
    return changedKeys.length > 0 && changedKeys.every((k) => EDITOR_ONLY_KEYS.includes(k));
}
