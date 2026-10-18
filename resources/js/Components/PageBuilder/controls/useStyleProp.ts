import { useCallback, useEffect, useReducer } from 'react';
import type { Editor, DeviceName } from '../types';
import { resolveResponsive, type Device } from '../lib/responsive';

export type StyleProp = {
    value: string;
    inheritedFrom: Device | null;
    set(v: string): void;
    reset(): void;
};

const DEVICES: Device[] = ['desktop', 'tablet', 'mobile'];
const FALLBACK_MEDIA: Record<Device, string | null> = {
    desktop: null,
    tablet: '992px',
    mobile: '480px',
};

const CHANGE_EVENTS =
    'component:styleUpdate component:selected component:deselected device:change device:select selector:state undo redo update';

export const toDeviceName = (d: Device): DeviceName => (d.charAt(0).toUpperCase() + d.slice(1)) as DeviceName;
export const toDevice = (name: string | undefined): Device => {
    const d = (name || 'Desktop').toLowerCase();
    return d === 'tablet' || d === 'mobile' ? d : 'desktop';
};

// Re-renders the calling component whenever selection, device, state or styles change.
export function useEditorTick(editor: Editor | null): void {
    const [, bump] = useReducer((n: number) => n + 1, 0);
    useEffect(() => {
        if (!editor) return;
        editor.on(CHANGE_EVENTS, bump);
        return () => editor.off(CHANGE_EVENTS, bump);
    }, [editor]);
}

export function useDevice(editor: Editor | null): Device {
    useEditorTick(editor);
    return toDevice(editor?.getDevice?.());
}

export function useStyleState(editor: Editor | null): string {
    useEditorTick(editor);
    return editor?.Selectors?.getState?.() || '';
}

function mediaOpts(editor: Editor, device: Device) {
    const dev = editor.Devices?.get?.(toDeviceName(device));
    const width: string | null = dev?.get?.('widthMedia') || FALLBACK_MEDIA[device];
    if (device === 'desktop' || !width) return undefined;
    return { atRuleType: 'media', atRuleParams: `(max-width: ${width})` };
}

function readPerDevice(editor: Editor, id: string, prop: string, state: string) {
    const selector = `#${id}${state ? `:${state}` : ''}`;
    const values: Partial<Record<Device, string>> = {};
    for (const device of DEVICES) {
        const opts = mediaOpts(editor, device);
        if (device !== 'desktop' && !opts) continue;
        const rule = editor.Css.getRule(selector, opts);
        const v = rule?.getStyle?.()?.[prop];
        if (v !== undefined && v !== '') values[device] = String(v);
    }
    return values;
}

export function useStyleProp(editor: Editor, prop: string): StyleProp {
    useEditorTick(editor);

    const selected = editor?.getSelected?.();
    const device = toDevice(editor?.getDevice?.());
    const state: string = editor?.Selectors?.getState?.() || '';

    let value = '';
    let inheritedFrom: Device | null = null;
    if (selected) {
        const values = readPerDevice(editor, selected.getId(), prop, state);
        const resolved = resolveResponsive(values, device);
        value = resolved.value ?? '';
        inheritedFrom = resolved.inheritedFrom;
    }

    const write = useCallback(
        (v: string) => {
            if (!editor?.getSelected?.()) return;
            editor.StyleManager.addStyleTargets({ [prop]: v });
        },
        [editor, prop],
    );

    return {
        value,
        inheritedFrom,
        set: write,
        // Removes the property from the current device/state rule only.
        reset: () => write(''),
    };
}
